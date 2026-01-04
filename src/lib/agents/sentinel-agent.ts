import { generateText, DEFAULT_MODEL } from "../generate-text";
import { FileEntry } from "../code-cleaner";
import { promises as fs } from "fs";
import path from "path";
import { extractFirstJson } from "../utils";

// ============================================================================
// Configuration & Constants
// ============================================================================

/** Output directory for debug JSON files */
export const SENTINEL_OUTPUT_DIR = path.join(process.cwd(), "output", "sentinel-agent");

/** Maximum depth for tracing a single endpoint (number of LLM calls) */
export const SENTINEL_DEFAULT_MAX_DEPTH = 10;

/** Maximum depth for project tree generation */
export const SENTINEL_PROJECT_TREE_DEPTH = 10;

/** Maximum number of similar files to suggest when file not found */
export const SENTINEL_MAX_SIMILAR_FILES = 5;

/** System prompt for the Sentinel Agent */
export const SENTINEL_SYSTEM_PROMPT = `You are the Sentinel Agent, an expert code analyst specializing in API endpoint security analysis.

Your goal is to systematically trace API an endpoint through a codebase, following the complete request flow from entry point to response, documenting all relevant code paths, dependencies, and security-relevant information.

When a file contains MULTIPLE endpoints, you must analyze them SEPARATELY unless they are CRUD operations for the SAME entity.

**Group together (as one flow):**
- GET /users, POST /users, PUT /users/:id, DELETE /users/:id → These are all CRUD for "User" entity
- GET /products, POST /products, PATCH /products/:id → These are all CRUD for "Product" entity

**Analyze separately (different flows):**
- POST /auth/login and POST /users → Different purposes (auth vs user creation)
- GET /orders and POST /payments → Different entities (orders vs payments)  
- POST /upload and GET /analytics → Completely different features

When you encounter a file with mixed endpoints pick ONE specific endpoint or one CRUD group for same entity

## Your Process:

1. **Pick an endpoint**: When given a project structure, identify API entrypoint/route files and pick an endpoint.

2. **Trace the endpoint**: Follow the code flow by requesting files one at a time:
   - Trace imports and dependencies
   - Follow function calls to their implementations
   - Identify middleware, validators, database calls, and external service interactions
   - Note security-relevant patterns (authentication, authorization, input validation, etc.)
   - **IMPORTANT**: If you discover this endpoint is already in the processed list, STOP and respond with {"status": "not_found"}

3. **Complete the analysis**: When you have traced the complete flow, provide a comprehensive endpoint profile.

**IMPORTANT**:
Before returning {"status": "not_found"}, you MUST verify that you have checked ALL possible entry point files in the project.
Multiple endpoints can be defined in the SAME file.
If you're unsure, request to read a potential entry file again to check for additional endpoints.

## Response Format (Choose only ONE output per response out of these):

You MUST respond with valid JSON in ONE of these formats:

### 1. Pick a file to look for endpoint that hasn't been processed yet:
\`\`\`json
{
  "status": "pick_endpoint",
  "file_to_read_next": "path/to/endpoint/file.ts"
}
\`\`\`

### 2. When tracing an endpoint (need more files):
\`\`\`json
{
  "status": "tracing_endpoint",
  "endpoint_being_traced": "POST /api/users",
  "file_to_read_next": "path/to/next/file.ts",
  "files_to_read_later": ["path/to/other/file.ts", "path/to/another/file.ts"]
}
\`\`\`

### 3. When endpoint tracing is complete:
\`\`\`json
{
  "status": "completed",
  "result": {
    "flow_name": "User Authentication",
    "purpose": "Handles user login and JWT token generation",
    "entry_point": "POST /api/auth/login",
    "input_types": ["email: string", "password: string"],
    "output_types": ["token: string", "user: UserObject"],
    "sensitivity_level": "high",
    "mark_down": "## Endpoint: POST /api/auth/login\\n\\n### Flow Summary\\n..."
  }
}
\`\`\`

### 4. After checking all possible entry points and finding no new endpoints:
\`\`\`json
{
  "status": "not_found"
}
\`\`\`

## Sensitivity Level Guidelines:
- **critical**: Handles authentication, authorization, payment, PII, or secrets
- **high**: Handles user data, sensitive operations, or external integrations
- **medium**: Handles business logic with some data exposure
- **low**: Public data, health checks, static content

## mark_down Content Guidelines:
The mark_down field should include:
1. Complete flow diagram or description
2. All files involved with their purposes
3. Key code blocks (sanitized for security review)
4. Dependencies and package versions used
5. Security observations (auth checks, validation, sanitization)
6. Data flow (input → processing → output)
7. External service calls and database operations

Be thorough but concise. Focus on security-relevant aspects.
Your responses MUST be a valid JSON as specified above.`;

// ============================================================================
// Types
// ============================================================================

export interface EndpointProfile {
  flow_name: string;
  purpose: string;
  entry_point: string;
  input_types: string[];
  output_types: string[];
  sensitivity_level: "low" | "medium" | "high" | "critical";
  mark_down: string;
}

export interface SentinelPickEndpointResponse {
  status: "pick_endpoint";
  file_to_read_next: string;
}

export interface SentinelTracingEndpointResponse {
  status: "tracing_endpoint";
  endpoint_being_traced: string;
  file_to_read_next: string;
  files_to_read_later: string[];
}

export interface SentinelCompletedResponse {
  status: "completed";
  result: EndpointProfile;
}

export interface SentinelNotFoundResponse {
  status: "not_found";
}

export type SentinelAgentResponse =
  | SentinelPickEndpointResponse
  | SentinelTracingEndpointResponse
  | SentinelCompletedResponse
  | SentinelNotFoundResponse;

export interface SentinelAgentOptions {
  model?: string;
  maxDepth?: number;
  onLog?: (message: string) => void;
  abortSignal?: AbortSignal;
  /** Enable saving debug output to JSON files */
  saveDebugOutput?: boolean;
}

/** Debug output structure saved to JSON */
export interface SentinelDebugOutput {
  timestamp: string;
  model: string;
  maxDepth: number;
  totalFiles: number;
  projectTree: string;
  endpointsFound: EndpointProfile[];
  tracingHistory: Array<{
    endpoint: string;
    conversationHistory: Array<{ role: string; content: string }>;
    filesRead: string[];
  }>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Save debug output to a JSON file
 */
async function saveDebugOutput(output: SentinelDebugOutput): Promise<string> {
  try {
    // Ensure output directory exists
    await fs.mkdir(SENTINEL_OUTPUT_DIR, { recursive: true });
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `sentinel-output-${timestamp}.json`;
    const filepath = path.join(SENTINEL_OUTPUT_DIR, filename);
    
    // Write the output
    await fs.writeFile(filepath, JSON.stringify(output, null, 2), "utf-8");
    
    return filepath;
  } catch (error) {
    console.error("Failed to save debug output:", error);
    throw error;
  }
}

/**
 * Generate a tree structure of the project up to specified depth
 */
export function generateProjectTree(
  files: FileEntry[],
  maxDepth: number = SENTINEL_PROJECT_TREE_DEPTH
): string {
  const tree: Record<string, unknown> = {};

  for (const file of files) {
    const parts = file.path.split("/");
    let current = tree;

    for (let i = 0; i < parts.length && i < maxDepth; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1 || i === maxDepth - 1;

      if (isLast) {
        if (i === parts.length - 1) {
          // It's a file
          current[part] = null;
        } else {
          // It's a truncated directory
          current[part + "/..."] = null;
        }
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }
    }
  }

  // Convert tree to string representation
  function treeToString(node: Record<string, unknown>, prefix: string = ""): string {
    const entries = Object.entries(node);
    let result = "";

    entries.forEach(([key, value], index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? "└── " : "├── ";
      const newPrefix = isLast ? prefix + "    " : prefix + "│   ";

      result += prefix + connector + key + "\n";

      if (value && typeof value === "object") {
        result += treeToString(value as Record<string, unknown>, newPrefix);
      }
    });

    return result;
  }

  return treeToString(tree);
}

/**
 * Find file content by path
 */
function findFileContent(files: FileEntry[], filePath: string): string | null {
  // Normalize path (remove leading ./ or /)
  const normalizedPath = filePath.replace(/^\.?\//, "");

  const file = files.find((f) => {
    const normalizedFilePath = f.path.replace(/^\.?\//, "");
    return normalizedFilePath === normalizedPath || f.path === filePath;
  });

  return file?.content ?? null;
}

/**
 * Parse the agent's JSON response
 */
function parseAgentResponse(text: string): SentinelAgentResponse {
  // Extract only the first complete JSON object
  const jsonString = extractFirstJson(text);

  if (!jsonString) {
    throw new Error("No JSON found in agent response");
  }

  try {
    const parsed = JSON.parse(jsonString);

    // Validate the response structure
    if (!parsed.status) {
      throw new Error("Response missing 'status' field");
    }

    switch (parsed.status) {
      case "pick_endpoint":
        if (!parsed.file_to_read_next) {
          throw new Error("pick_endpoint response missing 'file_to_read_next'");
        }
        return parsed as SentinelPickEndpointResponse;

      case "tracing_endpoint":
        if (!parsed.file_to_read_next) {
          throw new Error("tracing_endpoint response missing 'file_to_read_next'");
        }
        if (!parsed.endpoint_being_traced) {
          throw new Error("tracing_endpoint response missing 'endpoint_being_traced'");
        }
        return {
          ...parsed,
          files_to_read_later: parsed.files_to_read_later || [],
        } as SentinelTracingEndpointResponse;

      case "completed":
        if (!parsed.result) {
          throw new Error("completed response missing 'result'");
        }
        return parsed as SentinelCompletedResponse;

      case "not_found":
        return parsed as SentinelNotFoundResponse;

      default:
        throw new Error(`Unknown status: ${parsed.status}`);
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse JSON: ${error.message}`);
    }
    throw error;
  }
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class SentinelAgent {
  private model: string;
  private maxDepth: number;
  private log: (message: string) => void;
  private abortSignal?: AbortSignal;
  private saveDebugOutput: boolean;
  private tracingHistory: SentinelDebugOutput["tracingHistory"] = [];

  constructor(options: SentinelAgentOptions = {}) {
    this.model = options.model || DEFAULT_MODEL;
    this.maxDepth = options.maxDepth || SENTINEL_DEFAULT_MAX_DEPTH;
    this.log = options.onLog || console.log;
    this.abortSignal = options.abortSignal;
    this.saveDebugOutput = options.saveDebugOutput ?? true; // Enable by default
  }

  private checkCancellation(): void {
    if (this.abortSignal?.aborted) {
      throw new Error("Analysis cancelled");
    }
  }

  /**
   * Run the Sentinel Agent on a codebase
   */
  async analyze(files: FileEntry[]): Promise<EndpointProfile[]> {
    const endpoints: EndpointProfile[] = [];
    const processedEndpoints: string[] = [];
    this.tracingHistory = []; // Reset tracing history

    this.log("🛡️ Sentinel Agent starting analysis...");
    this.checkCancellation();

    // Generate project tree
    const projectTree = generateProjectTree(files, SENTINEL_PROJECT_TREE_DEPTH);
    this.log(`📁 Project structure generated (${files.length} files)`);

    // Main loop - continue until no more endpoints found
    while (true) {
      this.checkCancellation();
      
      const result = await this.findAndTraceEndpoint(
        files,
        projectTree,
        processedEndpoints
      );

      if (result === null) {
        this.log("✅ All endpoints analyzed. Sentinel Agent complete.");
        break;
      }

      endpoints.push(result);
      processedEndpoints.push(result.entry_point);
      this.log(`📋 Endpoint recorded: ${result.entry_point} (${result.sensitivity_level})`);
    }

    // Save debug output if enabled
    if (this.saveDebugOutput) {
      try {
        const debugOutput: SentinelDebugOutput = {
          timestamp: new Date().toISOString(),
          model: this.model,
          maxDepth: this.maxDepth,
          totalFiles: files.length,
          projectTree,
          endpointsFound: endpoints,
          tracingHistory: this.tracingHistory,
        };
        const filepath = await saveDebugOutput(debugOutput);
        this.log(`💾 Debug output saved to: ${filepath}`);
      } catch (error) {
        this.log(`⚠️ Failed to save debug output: ${error}`);
      }
    }

    return endpoints;
  }

  /**
   * Find and trace a single endpoint
   */
  private async findAndTraceEndpoint(
    files: FileEntry[],
    projectTree: string,
    processedEndpoints: string[]
  ): Promise<EndpointProfile | null> {
    let conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
    let filesRead: Map<string, string> = new Map();
    let filesToRead: string[] = [];
    let depth = 0;
    let currentEndpointName = "unknown";

    // Initial prompt to pick an endpoint
    const initialPrompt = this.buildInitialPrompt(projectTree, processedEndpoints);
    conversationHistory.push({ role: "user", content: initialPrompt });

    while (depth < this.maxDepth) {
      depth++;
      this.checkCancellation();

      // Generate response from the agent
      const { text } = await generateText({
        model: this.model,
        system: SENTINEL_SYSTEM_PROMPT,
        messages: conversationHistory,
        abortSignal: this.abortSignal,
      });

      // Parse the response
      let response: SentinelAgentResponse;
      try {
        response = parseAgentResponse(text);
      } catch (error) {
        this.log(`⚠️ Failed to parse agent response: ${error}`);
        // retry the last step by continuing the loop
        // reset depth and conversation to last user message
        depth--;
        conversationHistory = conversationHistory.slice(0, -1);
        continue;
      }

      conversationHistory.push({ role: "assistant", content: JSON.stringify(response) });

      // Handle the response based on status
      switch (response.status) {
        case "not_found":
          this.log("🔍 No more endpoints found");
          // Save tracing history for this attempt
          this.tracingHistory.push({
            endpoint: currentEndpointName,
            conversationHistory: conversationHistory.map(m => ({ role: m.role, content: m.content })),
            filesRead: Array.from(filesRead.keys()),
          });
          return null;

        case "pick_endpoint":
          currentEndpointName = response.file_to_read_next;
          this.log(`🎯 Picking endpoint from: ${response.file_to_read_next}`);
          const pickContent = await this.readFileAndRespond(
            files,
            response.file_to_read_next,
            filesRead,
            conversationHistory
          );
          if (!pickContent) {
            // Save tracing history for failed attempt
            this.tracingHistory.push({
              endpoint: currentEndpointName,
              conversationHistory: conversationHistory.map(m => ({ role: m.role, content: m.content })),
              filesRead: Array.from(filesRead.keys()),
            });
            return null;
          }
          break;

        case "tracing_endpoint":
          currentEndpointName = response.endpoint_being_traced;
          this.log(`🔄 Tracing ${response.endpoint_being_traced}: ${response.file_to_read_next}`);
          // Add files to read later to the queue
          if (response.files_to_read_later?.length) {
            filesToRead.push(...response.files_to_read_later.filter(f => !filesRead.has(f)));
          }
          const traceContent = await this.readFileAndRespond(
            files,
            response.file_to_read_next,
            filesRead,
            conversationHistory
          );
          if (!traceContent) {
            // If file not found, try next from queue or ask agent
            if (filesToRead.length > 0) {
              const nextFile = filesToRead.shift()!;
              await this.readFileAndRespond(files, nextFile, filesRead, conversationHistory);
            }
          }

          // If max depth about to be reached, inform the agent
          if (depth + 1 >= this.maxDepth) {
            conversationHistory.push({
              role: "user",
              content: `⚠️ You have reached the maximum analysis depth of ${this.maxDepth}. Please complete the endpoint analysis in the next response.`,
            });
          }
          break;

        case "completed":
          this.log(`✨ Endpoint analysis complete: ${response.result.entry_point}`);
          // Save tracing history for successful endpoint
          this.tracingHistory.push({
            endpoint: response.result.entry_point,
            conversationHistory: conversationHistory.map(m => ({ role: m.role, content: m.content })),
            filesRead: Array.from(filesRead.keys()),
          });
          return response.result;
      }
    }

    this.log(`⚠️ Max depth (${this.maxDepth}) reached while tracing endpoint`);
    // Save tracing history for max depth reached
    this.tracingHistory.push({
      endpoint: currentEndpointName,
      conversationHistory: conversationHistory.map(m => ({ role: m.role, content: m.content })),
      filesRead: Array.from(filesRead.keys()),
    });
    return null;
  }

  /**
   * Build the initial prompt for the agent
   */
  private buildInitialPrompt(
    projectTree: string,
    processedEndpoints: string[]
  ): string {
    const endpointsList =
      processedEndpoints.length > 0
        ? processedEndpoints.map((e) => `- ${e}`).join("\n")
        : "(none yet)";

    return `## Project Analysis Request

### Project Structure:
\`\`\`
${projectTree}
\`\`\`

### ⚠️ Already Processed Endpoints (DO NOT analyze these again):
${endpointsList}

---

Please analyze this project structure and identify an API endpoint file to trace that hasn't been processed yet. Look for:
- Route handlers (e.g., route.ts, routes/, api/, controllers/)
- API definitions
- HTTP endpoint definitions

Respond with the file you want to read first to start tracing an endpoint.`;
  }

  /**
   * Read a file and add it to the conversation
   */
  private async readFileAndRespond(
    files: FileEntry[],
    filePath: string,
    filesRead: Map<string, string>,
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
  ): Promise<boolean> {
    // Check if already read
    if (filesRead.has(filePath)) {
      conversationHistory.push({
        role: "user",
        content: `You've already read this file. Here it is again:\n\n**File: ${filePath}**\n\`\`\`\n${filesRead.get(filePath)}\n\`\`\`\n\nPlease continue tracing or complete the analysis.`,
      });
      return true;
    }

    // Find the file content
    const content = findFileContent(files, filePath);

    if (!content) {
      conversationHistory.push({
        role: "user",
        content: `File not found: ${filePath}\n\nAvailable files matching pattern:\n${this.findSimilarFiles(files, filePath).join("\n")}\n\nPlease request a valid file path or respond with {"status": "not_found"} if no more endpoints exist.`,
      });
      return false;
    }

    filesRead.set(filePath, content);

    conversationHistory.push({
      role: "user",
      content: `**File: ${filePath}**\n\`\`\`\n${content}\n\`\`\`\n\nContinue tracing this endpoint. Request the next file you need, or complete the analysis if you have enough information.`,
    });

    return true;
  }

  /**
   * Find files with similar names/paths
   */
  private findSimilarFiles(files: FileEntry[], searchPath: string): string[] {
    const searchParts = searchPath.toLowerCase().split("/");
    const searchName = searchParts[searchParts.length - 1];

    return files
      .filter((f) => {
        const lowerPath = f.path.toLowerCase();
        return (
          lowerPath.includes(searchName) ||
          searchParts.some((part) => lowerPath.includes(part))
        );
      })
      .slice(0, SENTINEL_MAX_SIMILAR_FILES)
      .map((f) => `- ${f.path}`);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSentinelAgent(
  options?: SentinelAgentOptions
): SentinelAgent {
  return new SentinelAgent(options);
}
