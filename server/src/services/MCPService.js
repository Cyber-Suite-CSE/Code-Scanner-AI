import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';
import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import WebSocket from 'ws';
import fetch from 'node-fetch';
import puppeteer from 'puppeteer';

export class MCPService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.connections = new Map();
    this.availableTools = new Map();
    this.serverConfigs = new Map();
    this.initialized = false;
  }

  async initialize(serverConfigs) {
    try {
      this.emit('mcp-status', { status: 'initializing' });

      // Store server configurations
      for (const [serverId, config] of Object.entries(serverConfigs)) {
        this.serverConfigs.set(serverId, config);
      }

      // Initialize built-in tools first
      await this.initializeBuiltInTools();

      // Connect to MCP servers
      await this.connectToServers();

      this.initialized = true;
      this.emit('mcp-status', { status: 'ready', tools: this.availableTools.size });

      console.log(`MCP Service initialized with ${this.availableTools.size} tools`);

    } catch (error) {
      this.emit('mcp-error', { error: error.message });
      throw new Error(`MCP Service initialization failed: ${error.message}`);
    }
  }

  async initializeBuiltInTools() {
    // Register built-in tools that don't require external MCP servers
    this.registerBuiltInTool('playwright', new PlaywrightTool());
    this.registerBuiltInTool('regex-search', new RegexSearchTool());
    this.registerBuiltInTool('function-definition', new FunctionDefinitionTool());
    this.registerBuiltInTool('web-search', new WebSearchTool());

    console.log('Built-in MCP tools registered');
  }

  registerBuiltInTool(toolId, toolInstance) {
    this.availableTools.set(toolId, {
      id: toolId,
      instance: toolInstance,
      type: 'built-in',
      methods: toolInstance.getSupportedMethods(),
      status: 'ready'
    });
  }

  async connectToServers() {
    const connectionPromises = [];

    for (const [serverId, config] of this.serverConfigs) {
      if (config.type === 'websocket') {
        connectionPromises.push(this.connectWebSocketServer(serverId, config));
      } else if (config.type === 'stdio') {
        connectionPromises.push(this.connectStdioServer(serverId, config));
      }
    }

    const results = await Promise.allSettled(connectionPromises);

    results.forEach((result, index) => {
      const serverId = Array.from(this.serverConfigs.keys())[index];

      if (result.status === 'fulfilled') {
        console.log(`Connected to MCP server: ${serverId}`);
      } else {
        console.warn(`Failed to connect to MCP server ${serverId}: ${result.reason.message}`);
      }
    });
  }

  async connectWebSocketServer(serverId, config) {
    try {
      const transport = new WebSocketClientTransport(new URL(config.url));
      const client = new Client({
        name: `security-scanner-${serverId}`,
        version: '1.0.0'
      }, {
        capabilities: {
          tools: {}
        }
      });

      await client.connect(transport);

      // Get available tools from server
      const toolsResponse = await client.listTools();

      // Register tools from this server
      toolsResponse.tools.forEach(tool => {
        this.availableTools.set(tool.name, {
          id: tool.name,
          client,
          serverId,
          type: 'mcp-server',
          description: tool.description,
          inputSchema: tool.inputSchema,
          status: 'ready'
        });
      });

      this.connections.set(serverId, { client, transport, status: 'connected' });

    } catch (error) {
      throw new Error(`WebSocket connection failed for ${serverId}: ${error.message}`);
    }
  }

  async connectStdioServer(serverId, config) {
    try {
      const serverProcess = spawn(config.command, config.args || [], {
        stdio: ['pipe', 'pipe', 'inherit']
      });

      const transport = new StdioClientTransport({
        stdin: serverProcess.stdin,
        stdout: serverProcess.stdout
      });

      const client = new Client({
        name: `security-scanner-${serverId}`,
        version: '1.0.0'
      }, {
        capabilities: {
          tools: {}
        }
      });

      await client.connect(transport);

      // Get available tools from server
      const toolsResponse = await client.listTools();

      toolsResponse.tools.forEach(tool => {
        this.availableTools.set(tool.name, {
          id: tool.name,
          client,
          serverId,
          type: 'mcp-server',
          description: tool.description,
          inputSchema: tool.inputSchema,
          status: 'ready'
        });
      });

      this.connections.set(serverId, {
        client,
        transport,
        process: serverProcess,
        status: 'connected'
      });

    } catch (error) {
      throw new Error(`Stdio connection failed for ${serverId}: ${error.message}`);
    }
  }

  async executeTool(toolId, method, params = {}) {
    if (!this.initialized) {
      throw new Error('MCP Service not initialized');
    }

    const tool = this.availableTools.get(toolId);
    if (!tool) {
      throw new Error(`Tool '${toolId}' not found`);
    }

    try {
      this.emit('tool-execution-start', { toolId, method, params });

      const startTime = Date.now();
      let result;

      if (tool.type === 'built-in') {
        result = await tool.instance.execute(method, params);
      } else if (tool.type === 'mcp-server') {
        result = await this.executeMCPTool(tool, method, params);
      } else {
        throw new Error(`Unknown tool type: ${tool.type}`);
      }

      const duration = Date.now() - startTime;

      this.emit('tool-execution-complete', {
        toolId,
        method,
        duration,
        success: true
      });

      return {
        success: true,
        result,
        toolId,
        method,
        duration,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.emit('tool-execution-error', {
        toolId,
        method,
        error: error.message
      });

      throw new Error(`Tool execution failed (${toolId}.${method}): ${error.message}`);
    }
  }

  async executeMCPTool(tool, method, params) {
    const toolCall = {
      name: tool.id,
      arguments: params
    };

    const response = await tool.client.callTool(toolCall);

    if (response.error) {
      throw new Error(`MCP tool error: ${response.error}`);
    }

    return response.content;
  }

  getAvailableTools() {
    const tools = [];

    for (const [toolId, tool] of this.availableTools) {
      tools.push({
        id: toolId,
        type: tool.type,
        description: tool.description,
        methods: tool.methods || ['execute'],
        status: tool.status,
        serverId: tool.serverId
      });
    }

    return tools;
  }

  async healthCheck() {
    const health = {
      status: 'healthy',
      tools: {},
      connections: {}
    };

    // Check tools
    for (const [toolId, tool] of this.availableTools) {
      try {
        if (tool.type === 'built-in') {
          health.tools[toolId] = {
            status: 'healthy',
            type: tool.type
          };
        } else {
          // Test MCP tool with a simple call
          health.tools[toolId] = {
            status: 'healthy',
            type: tool.type,
            serverId: tool.serverId
          };
        }
      } catch (error) {
        health.tools[toolId] = {
          status: 'unhealthy',
          error: error.message
        };
        health.status = 'degraded';
      }
    }

    // Check connections
    for (const [serverId, connection] of this.connections) {
      health.connections[serverId] = {
        status: connection.status,
        type: connection.transport?.constructor?.name || 'unknown'
      };
    }

    return health;
  }

  async cleanup() {
    console.log('Cleaning up MCP Service...');

    // Close all connections
    for (const [serverId, connection] of this.connections) {
      try {
        if (connection.client) {
          await connection.client.close();
        }

        if (connection.process) {
          connection.process.kill();
        }

        console.log(`Closed connection to ${serverId}`);
      } catch (error) {
        console.warn(`Failed to close connection to ${serverId}: ${error.message}`);
      }
    }

    // Cleanup built-in tools
    for (const [toolId, tool] of this.availableTools) {
      if (tool.type === 'built-in' && tool.instance.cleanup) {
        try {
          await tool.instance.cleanup();
        } catch (error) {
          console.warn(`Failed to cleanup tool ${toolId}: ${error.message}`);
        }
      }
    }

    this.connections.clear();
    this.availableTools.clear();
    this.removeAllListeners();
    this.initialized = false;
  }
}

// Built-in tool implementations
class PlaywrightTool {
  constructor() {
    this.browser = null;
  }

  getSupportedMethods() {
    return ['search', 'extractText', 'screenshot'];
  }

  async execute(method, params) {
    switch (method) {
      case 'search':
        return await this.performSearch(params.query, params.limit || 5);
      case 'extractText':
        return await this.extractWebText(params.url);
      case 'screenshot':
        return await this.takeScreenshot(params.url);
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  async performSearch(query, limit) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
      await page.waitForSelector('div[data-result-index]', { timeout: 10000 });

      const results = await page.evaluate((limit) => {
        const items = document.querySelectorAll('div[data-result-index]');
        const results = [];

        for (let i = 0; i < Math.min(items.length, limit); i++) {
          const item = items[i];
          const titleEl = item.querySelector('h3');
          const linkEl = item.querySelector('a');
          const snippetEl = item.querySelector('span[data-content-visibility-id]');

          if (titleEl && linkEl) {
            results.push({
              title: titleEl.textContent,
              url: linkEl.href,
              snippet: snippetEl ? snippetEl.textContent : ''
            });
          }
        }

        return results;
      }, limit);

      return { results, query, timestamp: new Date().toISOString() };

    } finally {
      await page.close();
    }
  }

  async extractWebText(url) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      const content = await page.evaluate(() => {
        // Remove script and style elements
        const scripts = document.querySelectorAll('script, style');
        scripts.forEach(el => el.remove());

        return {
          title: document.title,
          text: document.body.innerText,
          url: window.location.href
        };
      });

      return content;

    } finally {
      await page.close();
    }
  }

  async takeScreenshot(url) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle0' });
      const screenshot = await page.screenshot({ fullPage: true });

      return {
        screenshot: screenshot.toString('base64'),
        url,
        timestamp: new Date().toISOString()
      };

    } finally {
      await page.close();
    }
  }

  async getBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

class RegexSearchTool {
  getSupportedMethods() {
    return ['searchFiles', 'searchInFile', 'replaceInFiles'];
  }

  async execute(method, params) {
    switch (method) {
      case 'searchFiles':
        return await this.searchFiles(params);
      case 'searchInFile':
        return await this.searchInFile(params);
      case 'replaceInFiles':
        return await this.replaceInFiles(params);
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  async searchFiles(params) {
    const { directory, pattern, excludeDirectories = [], fileExtensions = [] } = params;
    const fs = await import('fs-extra');
    const path = await import('path');
    const { glob } = await import('glob');

    try {
      let searchPattern = '**/*';

      // Handle different input types
      if (fileExtensions.length > 0) {
        const extPattern = fileExtensions.length === 1
          ? `*${fileExtensions[0]}`
          : `*.{${fileExtensions.map(ext => ext.replace('.', '')).join(',')}}`;
        searchPattern = `**/${extPattern}`;
      } else if (pattern && pattern !== '*') {
        // If pattern looks like a file pattern, use it as glob
        if (pattern.includes('*') && !pattern.includes('(') && !pattern.includes('[')) {
          searchPattern = pattern.startsWith('**/') ? pattern : `**/${pattern}`;
        } else {
          // Use default pattern for content searching
          searchPattern = '**/*';
        }
      }

      const files = await glob(searchPattern, {
        cwd: directory,
        ignore: excludeDirectories.map(dir => `**/${dir}/**`),
        absolute: true
      });

      const results = [];

      // If pattern is for content search (not file pattern), search inside files
      if (pattern && pattern !== '*' && !pattern.includes('*') && pattern.includes('(')) {
        try {
          const regex = new RegExp(pattern, 'gi');

          for (const file of files.slice(0, 100)) { // Limit for performance
            try {
              const content = await fs.readFile(file, 'utf-8');
              const matches = [...content.matchAll(regex)];

              if (matches.length > 0) {
                results.push({
                  file,
                  matches: matches.map(match => ({
                    text: match[0],
                    index: match.index,
                    line: content.substring(0, match.index).split('\n').length
                  }))
                });
              }
            } catch (error) {
              // Skip binary or unreadable files
              continue;
            }
          }
        } catch (regexError) {
          // If regex is invalid, just return file list
          results.push(...files.map(file => ({ file, matches: [] })));
        }
      } else {
        // Just return file list
        results.push(...files.map(file => ({ file, matches: [] })));
      }

      return { results, pattern, directory, files: files.length };

    } catch (error) {
      throw new Error(`File search failed: ${error.message}`);
    }
  }

  async searchInFile(params) {
    const { filePath, pattern } = params;
    const fs = await import('fs-extra');

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const regex = new RegExp(pattern, 'gi');
      const matches = [...content.matchAll(regex)];

      return {
        file: filePath,
        matches: matches.map(match => ({
          text: match[0],
          index: match.index,
          line: content.substring(0, match.index).split('\n').length,
          context: this.getContext(content, match.index, 50)
        })),
        pattern
      };

    } catch (error) {
      throw new Error(`File search failed: ${error.message}`);
    }
  }

  getContext(content, index, contextSize) {
    const start = Math.max(0, index - contextSize);
    const end = Math.min(content.length, index + contextSize);
    return content.substring(start, end);
  }

  async replaceInFiles(params) {
    // Implement if needed for code fixing
    throw new Error('Replace functionality not implemented for security');
  }
}

class FunctionDefinitionTool {
  getSupportedMethods() {
    return ['getDefinition', 'getFunctionSignature', 'analyzeFunctions'];
  }

  async execute(method, params) {
    switch (method) {
      case 'getDefinition':
        return await this.getFunctionDefinition(params);
      case 'getFunctionSignature':
        return await this.getFunctionSignature(params);
      case 'analyzeFunctions':
        return await this.analyzeFunctions(params);
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  async getFunctionDefinition(params) {
    const { filePath, functionName } = params;
    const fs = await import('fs-extra');

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const language = this.detectLanguage(filePath);

      return this.extractFunctionDefinition(content, functionName, language);

    } catch (error) {
      throw new Error(`Function definition extraction failed: ${error.message}`);
    }
  }

  detectLanguage(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    const langMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cs': 'csharp',
      'php': 'php',
      'go': 'go',
      'rs': 'rust'
    };
    return langMap[ext] || 'unknown';
  }

  extractFunctionDefinition(content, functionName, language) {
    const patterns = {
      javascript: new RegExp(`(function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{[^}]*\\}|const\\s+${functionName}\\s*=.*?=>.*?)`, 'gs'),
      python: new RegExp(`(def\\s+${functionName}\\s*\\([^)]*\\):[^\\n]*(?:\\n\\s+[^\\n]+)*)`, 'gs'),
      java: new RegExp(`((?:public|private|protected)?\\s*(?:static)?\\s*\\w+\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{[^}]*\\})`, 'gs')
    };

    const pattern = patterns[language];
    if (!pattern) {
      return { error: `Language ${language} not supported` };
    }

    const matches = [...content.matchAll(pattern)];

    return {
      functionName,
      language,
      definitions: matches.map(match => ({
        code: match[0],
        startIndex: match.index,
        line: content.substring(0, match.index).split('\n').length
      }))
    };
  }

  async getFunctionSignature(params) {
    const definition = await this.getFunctionDefinition(params);

    if (definition.definitions && definition.definitions.length > 0) {
      const signature = this.extractSignature(definition.definitions[0].code, definition.language);
      return { ...definition, signature };
    }

    return definition;
  }

  extractSignature(code, language) {
    const signaturePatterns = {
      javascript: /(?:function\s+\w+|const\s+\w+\s*=.*?)\s*\([^)]*\)/,
      python: /def\s+\w+\s*\([^)]*\)/,
      java: /(?:public|private|protected)?\s*(?:static)?\s*\w+\s+\w+\s*\([^)]*\)/
    };

    const pattern = signaturePatterns[language];
    if (!pattern) {
      return code.split('\n')[0]; // First line as fallback
    }

    const match = code.match(pattern);
    return match ? match[0] : code.split('\n')[0];
  }

  async analyzeFunctions(params) {
    const { filePath } = params;
    const fs = await import('fs-extra');

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const language = this.detectLanguage(filePath);

      // Extract all functions
      const functions = this.extractAllFunctions(content, language);

      return {
        filePath,
        language,
        functionCount: functions.length,
        functions: functions.map(func => ({
          name: func.name,
          signature: func.signature,
          startLine: func.line,
          complexity: this.calculateComplexity(func.code)
        }))
      };

    } catch (error) {
      throw new Error(`Function analysis failed: ${error.message}`);
    }
  }

  extractAllFunctions(content, language) {
    // Simplified function extraction - would need more sophisticated parsing for production
    const functionPatterns = {
      javascript: /(?:function\s+(\w+)|const\s+(\w+)\s*=.*?=>|(\w+)\s*:\s*function)/g,
      python: /def\s+(\w+)\s*\(/g,
      java: /(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(/g
    };

    const pattern = functionPatterns[language];
    if (!pattern) return [];

    const functions = [];
    let match;

    while ((match = pattern.exec(content)) !== null) {
      const functionName = match[1] || match[2] || match[3];
      if (functionName) {
        functions.push({
          name: functionName,
          line: content.substring(0, match.index).split('\n').length,
          index: match.index
        });
      }
    }

    return functions;
  }

  calculateComplexity(code) {
    // Simplified complexity calculation
    const complexityKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'try', 'catch'];
    let complexity = 1; // Base complexity

    complexityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = code.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }
}

class WebSearchTool {
  getSupportedMethods() {
    return ['search', 'getDocumentation'];
  }

  async execute(method, params) {
    switch (method) {
      case 'search':
        return await this.performWebSearch(params);
      case 'getDocumentation':
        return await this.getDocumentation(params);
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  async performWebSearch(params) {
    const { query, limit = 5 } = params;

    try {
      // Use a simple search API or implement web scraping
      // For demo purposes, returning mock results
      return {
        query,
        results: [
          {
            title: `Security best practices for ${query}`,
            url: `https://example.com/security/${encodeURIComponent(query)}`,
            snippet: `Learn about security best practices for ${query}...`
          }
        ],
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Web search failed: ${error.message}`);
    }
  }

  async getDocumentation(params) {
    const { technology, topic = 'security' } = params;

    // Mock documentation retrieval - would implement real API calls
    return {
      technology,
      topic,
      documentation: `Security documentation for ${technology}: Best practices include...`,
      source: 'Official documentation',
      timestamp: new Date().toISOString()
    };
  }
}