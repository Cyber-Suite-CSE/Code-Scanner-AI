import { generateText, DEFAULT_MODEL } from "../generate-text";
import { promises as fs } from "fs";
import path from "path";
import { FrameworkDetectionResult } from "../code-cleaner/types";
import { extractFirstJson } from "../utils";

// ============================================================================
// Configuration & Constants
// ============================================================================

/** Output directory for debug JSON files */
export const GUARDIAN_OUTPUT_DIR = path.join(process.cwd(), "output", "guardian-agent");

/** Maximum retries for parsing agent response */
export const GUARDIAN_MAX_RETRIES = 3;

/** System prompt for the Guardian Agent */
export const GUARDIAN_SYSTEM_PROMPT = `You are the Guardian Agent, an expert security analyst specializing in API security.

You will receive a FlowProfile describing an API endpoint. Your task is to produce a focused Security Checklist for that specific flow.

## Your Process:

### Step 1: Understand the Endpoint
- What does this endpoint do? (flow_name, purpose, entry_point)
- What data does it accept? (input_types)
- What data does it return? (output_types)
- How sensitive is it? (sensitivity_level)

### Step 2: Consult Security Knowledge
Reference these sources when determining controls:
- OWASP Top 10 & API Security Top 10
- Framework-specific security documentation
- Industry best practices (authentication, authorization, encryption)
- Common vulnerability patterns (CWE)

### Step 3: Identify Security Layers
Based on the endpoint's functionality, consider which security layers apply:
- **Authentication**: JWT validation, session tokens, API keys
- **Access Control**: Role-based access, resource ownership checks
- **Input Validation**: Type checking, sanitization, size limits
- **Rate Limiting**: Request throttling, abuse prevention
- **CSRF Protection**: Token validation for state-changing operations
- **Data Encryption**: TLS, field-level encryption, secure storage
- **Output Encoding**: XSS prevention, content-type headers
- **Error Handling**: No sensitive data in errors, proper status codes
- **Logging/Monitoring**: Audit trails, anomaly detection

### Step 4: Classify Controls
For each control, determine:
- **Mandatory**: Must be implemented (security vulnerability if missing)
- **Recommended**: Should be implemented (significant risk reduction)
- **Context-Dependent**: Depends on deployment context or requirements

### Step 5: Assign Importance
- **critical**: Data breach risk, must fix immediately
- **high**: Important for production, implement before go-live
- **medium**: Good practice, plan for implementation
- **low**: Nice-to-have, defense-in-depth

## IMPORTANT CONSTRAINTS:
- Maximum 10 controls total (required + recommended combined)
- Only include controls RELEVANT to this specific endpoint
- Don't suggest file upload security for non-file endpoints
- Don't suggest payment security for non-payment endpoints
- Focus on actionable, specific recommendations

## Response Format:

\`\`\`json
{
  "status": "completed",
  "result": {
    "flow_name": "User Authentication",
    "required_controls": [
      {
        "control_id": "AUTH-001",
        "name": "Password Hashing",
        "description": "Use bcrypt/argon2 with cost factor >= 12",
        "category": "authentication",
        "importance": "critical",
        "owasp_mapping": ["A02:2021", "A07:2021"]
      }
    ],
    "recommended_controls": [
      {
        "control_id": "AUTH-002",
        "name": "Rate Limiting",
        "description": "Limit to 5 attempts per minute per IP",
        "category": "rate_limiting",
        "importance": "high",
        "owasp_mapping": ["A07:2021"]
      }
    ],
    "references": [
      {
        "title": "OWASP Authentication Cheat Sheet",
        "url": "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html"
      }
    ]
  }
}
\`\`\`

## Categories:
authentication, authorization, input_validation, output_encoding, cryptography, session_management, error_handling, logging_monitoring, rate_limiting, data_protection, injection_prevention, access_control

## Sensitivity Guidelines:
- **critical/high**: Include all mandatory + most recommended controls (up to 10)
- **medium**: Include mandatory + high-importance recommended (up to 7)
- **low**: Include only mandatory controls (up to 4)`;

// ============================================================================
// Types
// ============================================================================

/** Input flow profile for Guardian Agent (subset of EndpointProfile without mark_down) */
export interface FlowProfile {
  flow_name: string;
  purpose: string;
  entry_point: string;
  input_types: string[];
  output_types: string[];
  sensitivity_level: "low" | "medium" | "high" | "critical";
}

/** Importance level for security controls */
export type SecurityControlImportance = "critical" | "high" | "medium" | "low";

/** Security control definition */
export interface SecurityControl {
  control_id: string;
  name: string;
  description: string;
  category: SecurityControlCategory;
  importance: SecurityControlImportance;
  owasp_mapping: string[];
}

/** Security control categories */
export type SecurityControlCategory =
  | "authentication"
  | "authorization"
  | "input_validation"
  | "output_encoding"
  | "cryptography"
  | "session_management"
  | "error_handling"
  | "logging_monitoring"
  | "rate_limiting"
  | "data_protection"
  | "injection_prevention"
  | "access_control";

/** Reference link for security documentation */
export interface SecurityReference {
  title: string;
  url: string;
}

/** Security checklist output for a single flow */
export interface SecurityChecklist {
  flow_name: string;
  required_controls: SecurityControl[];
  recommended_controls: SecurityControl[];
  references: SecurityReference[];
}

/** Guardian Agent completed response */
export interface GuardianCompletedResponse {
  status: "completed";
  result: SecurityChecklist;
}

/** Guardian Agent error response */
export interface GuardianErrorResponse {
  status: "error";
  message: string;
}

export type GuardianAgentResponse =
  | GuardianCompletedResponse
  | GuardianErrorResponse;

/** Options for Guardian Agent */
export interface GuardianAgentOptions {
  model?: string;
  maxRetries?: number;
  onLog?: (message: string) => void;
  abortSignal?: AbortSignal;
  /** Enable saving debug output to JSON files */
  saveDebugOutput?: boolean;
}

/** Debug output structure saved to JSON */
export interface GuardianDebugOutput {
  timestamp: string;
  model: string;
  framework: FrameworkDetectionResult;
  projectTree: string;
  flowsAnalyzed: FlowProfile[];
  checklistsGenerated: SecurityChecklist[];
  analysisHistory: Array<{
    flow_name: string;
    conversationHistory: Array<{ role: string; content: string }>;
    retries: number;
    success: boolean;
  }>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Save debug output to a JSON file
 */
async function saveGuardianDebugOutput(output: GuardianDebugOutput): Promise<string> {
  try {
    // Ensure output directory exists
    await fs.mkdir(GUARDIAN_OUTPUT_DIR, { recursive: true });
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `guardian-output-${timestamp}.json`;
    const filepath = path.join(GUARDIAN_OUTPUT_DIR, filename);
    
    // Write the output
    await fs.writeFile(filepath, JSON.stringify(output, null, 2), "utf-8");
    
    return filepath;
  } catch (error) {
    console.error("Failed to save debug output:", error);
    throw error;
  }
}

/**
 * Parse the Guardian Agent's JSON response
 */
function parseGuardianResponse(text: string): GuardianAgentResponse {
  // Try to extract JSON from the response
  const jsonMatch = extractFirstJson(text);
  if (!jsonMatch) {
    throw new Error("No JSON found in agent response");
  }

  try {
    const parsed = JSON.parse(jsonMatch);

    // Validate the response structure
    if (!parsed.status) {
      throw new Error("Response missing 'status' field");
    }

    if (parsed.status === "completed") {
      if (!parsed.result) {
        throw new Error("completed response missing 'result'");
      }
      if (!parsed.result.flow_name) {
        throw new Error("result missing 'flow_name'");
      }
      if (!Array.isArray(parsed.result.required_controls)) {
        throw new Error("result missing 'required_controls' array");
      }
      if (!Array.isArray(parsed.result.recommended_controls)) {
        throw new Error("result missing 'recommended_controls' array");
      }
      if (!Array.isArray(parsed.result.references)) {
        throw new Error("result missing 'references' array");
      }
      return parsed as GuardianCompletedResponse;
    }

    if (parsed.status === "error") {
      return parsed as GuardianErrorResponse;
    }

    throw new Error(`Unknown status: ${parsed.status}`);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse JSON: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Build the prompt for analyzing a flow
 */
function buildFlowAnalysisPrompt(
  flow: FlowProfile,
  framework: FrameworkDetectionResult,
  projectTree: string
): string {
  return `## Security Analysis Request

### Framework Context:
- **Framework**: ${framework.framework}
- **Confidence**: ${framework.confidence}
- **Indicators**: ${framework.indicators.join(", ")}

### Project Structure:
\`\`\`
${projectTree}
\`\`\`

### Flow to Analyze:
- **Flow Name**: ${flow.flow_name}
- **Purpose**: ${flow.purpose}
- **Entry Point**: ${flow.entry_point}
- **Sensitivity Level**: ${flow.sensitivity_level}
- **Input Types**: ${flow.input_types.length > 0 ? flow.input_types.join(", ") : "None specified"}
- **Output Types**: ${flow.output_types.length > 0 ? flow.output_types.join(", ") : "None specified"}

---

Based on the flow profile above, generate a comprehensive security checklist. Consider:

1. The sensitivity level (${flow.sensitivity_level}) - adjust required vs recommended controls accordingly
2. The framework (${framework.framework}) - include framework-specific security recommendations
3. Input/output types - identify potential injection points and data protection needs
4. The endpoint purpose - tailor controls to the specific functionality

Respond with the security checklist in the required JSON format.`;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class GuardianAgent {
  private model: string;
  private maxRetries: number;
  private log: (message: string) => void;
  private abortSignal?: AbortSignal;
  private saveDebugOutputEnabled: boolean;
  private analysisHistory: GuardianDebugOutput["analysisHistory"] = [];

  constructor(options: GuardianAgentOptions = {}) {
    this.model = options.model || DEFAULT_MODEL;
    this.maxRetries = options.maxRetries || GUARDIAN_MAX_RETRIES;
    this.log = options.onLog || console.log;
    this.abortSignal = options.abortSignal;
    this.saveDebugOutputEnabled = options.saveDebugOutput ?? true;
  }

  private checkCancellation(): void {
    if (this.abortSignal?.aborted) {
      throw new Error("Analysis cancelled");
    }
  }

  /**
   * Analyze multiple flows and generate security checklists
   */
  async analyzeFlows(
    flows: FlowProfile[],
    framework: FrameworkDetectionResult,
    projectTree: string
  ): Promise<SecurityChecklist[]> {
    const checklists: SecurityChecklist[] = [];
    this.analysisHistory = [];

    this.log("🛡️ Guardian Agent starting security analysis...");
    this.log(`📋 Flows to analyze: ${flows.length}`);
    this.checkCancellation();

    for (let i = 0; i < flows.length; i++) {
      this.checkCancellation();
      const flow = flows[i];
      
      this.log(`\n🔍 [${i + 1}/${flows.length}] Analyzing: ${flow.flow_name}`);
      this.log(`   Entry: ${flow.entry_point} | Sensitivity: ${flow.sensitivity_level}`);

      try {
        const checklist = await this.analyzeFlow(flow, framework, projectTree);
        if (checklist) {
          checklists.push(checklist);
          this.log(`   ✅ Generated ${checklist.required_controls.length} required, ${checklist.recommended_controls.length} recommended controls`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        this.log(`   ❌ Failed to analyze flow: ${errorMsg}`);
      }
    }

    this.log(`\n✅ Guardian Agent complete. Generated ${checklists.length}/${flows.length} checklists.`);

    // Save debug output if enabled
    if (this.saveDebugOutputEnabled) {
      try {
        const debugOutput: GuardianDebugOutput = {
          timestamp: new Date().toISOString(),
          model: this.model,
          framework,
          projectTree,
          flowsAnalyzed: flows,
          checklistsGenerated: checklists,
          analysisHistory: this.analysisHistory,
        };
        const filepath = await saveGuardianDebugOutput(debugOutput);
        this.log(`💾 Debug output saved to: ${filepath}`);
      } catch (error) {
        this.log(`⚠️ Failed to save debug output: ${error}`);
      }
    }

    return checklists;
  }

  /**
   * Analyze a single flow and generate its security checklist
   */
  private async analyzeFlow(
    flow: FlowProfile,
    framework: FrameworkDetectionResult,
    projectTree: string
  ): Promise<SecurityChecklist | null> {
    const conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
    let retries = 0;
    let success = false;

    // Build the analysis prompt
    const prompt = buildFlowAnalysisPrompt(flow, framework, projectTree);
    conversationHistory.push({ role: "user", content: prompt });

    while (retries < this.maxRetries) {
      this.checkCancellation();

      try {
        // Generate response from the agent
        const { text } = await generateText({
          model: this.model,
          system: GUARDIAN_SYSTEM_PROMPT,
          messages: conversationHistory,
          abortSignal: this.abortSignal,
        });

        // Parse the response
        const response = parseGuardianResponse(text);
        
        conversationHistory.push({ role: "assistant", content: JSON.stringify(response) });

        if (response.status === "completed") {
          success = true;
          // Record analysis history
          this.analysisHistory.push({
            flow_name: flow.flow_name,
            conversationHistory: conversationHistory.map(m => ({ role: m.role, content: m.content })),
            retries,
            success: true,
          });
          // Use original flow_name to ensure consistency with Sentinel Agent
          return {
            ...response.result,
            flow_name: flow.flow_name,
          };
        }

        if (response.status === "error") {
          this.log(`   ⚠️ Agent reported error: ${response.message}`);
          retries++;
          conversationHistory.push({
            role: "user",
            content: "Please try again and provide a valid security checklist in the required JSON format.",
          });
        }
      } catch (error) {
        retries++;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        this.log(`   ⚠️ Retry ${retries}/${this.maxRetries}: ${errorMsg}`);
        
        conversationHistory.push({
          role: "user",
          content: `Your response could not be parsed. Error: ${errorMsg}\n\nPlease respond with valid JSON in the exact format specified.`,
        });
      }
    }

    // Record failed analysis
    this.analysisHistory.push({
      flow_name: flow.flow_name,
      conversationHistory: conversationHistory.map(m => ({ role: m.role, content: m.content })),
      retries,
      success: false,
    });

    return null;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGuardianAgent(
  options?: GuardianAgentOptions
): GuardianAgent {
  return new GuardianAgent(options);
}
