import fs from 'fs-extra';
import path from 'path';
import { MCPService } from '../services/MCPService.js';

export class ToolRegistry {
  constructor(configPath = './config/mcp-tools.json') {
    this.configPath = configPath;
    this.tools = new Map();
    this.toolCategories = new Map();
    this.mcpService = new MCPService();
    this.initialized = false;
  }

  async initialize() {
    try {
      const config = await fs.readJSON(this.configPath);

      // Initialize MCP Service with server configurations
      const serverConfigs = config.mcpServers || {};
      await this.mcpService.initialize(serverConfigs);

      // Load tools
      for (const [toolId, toolConfig] of Object.entries(config.tools)) {
        this.tools.set(toolId, {
          id: toolId,
          ...toolConfig,
          instance: null
        });
      }

      // Load categories
      for (const [category, toolIds] of Object.entries(config.toolCategories)) {
        this.toolCategories.set(category, toolIds);
      }

      this.initialized = true;
      console.log(`Initialized ToolRegistry with ${this.tools.size} tools`);
    } catch (error) {
      throw new Error(`Failed to initialize ToolRegistry: ${error.message}`);
    }
  }

  getTool(toolId) {
    if (!this.initialized) {
      throw new Error('ToolRegistry not initialized. Call initialize() first.');
    }

    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool '${toolId}' not found in registry`);
    }

    return tool;
  }

  getToolsByCategory(category) {
    if (!this.initialized) {
      throw new Error('ToolRegistry not initialized. Call initialize() first.');
    }

    const toolIds = this.toolCategories.get(category);
    if (!toolIds) {
      return [];
    }

    return toolIds.map(id => this.getTool(id));
  }

  getAllTools() {
    if (!this.initialized) {
      throw new Error('ToolRegistry not initialized. Call initialize() first.');
    }

    return Array.from(this.tools.values());
  }

  hasCategory(category) {
    return this.toolCategories.has(category);
  }

  getCategories() {
    return Array.from(this.toolCategories.keys());
  }

  async registerTool(toolId, toolConfig) {
    this.tools.set(toolId, {
      id: toolId,
      ...toolConfig,
      instance: null
    });

    // Update config file
    const config = await fs.readJSON(this.configPath);
    config.tools[toolId] = toolConfig;
    await fs.writeJSON(this.configPath, config, { spaces: 2 });

    console.log(`Registered new tool: ${toolId}`);
  }

  async unregisterTool(toolId) {
    if (!this.tools.has(toolId)) {
      throw new Error(`Tool '${toolId}' not found in registry`);
    }

    this.tools.delete(toolId);

    // Update config file
    const config = await fs.readJSON(this.configPath);
    delete config.tools[toolId];

    // Remove from categories
    for (const [category, toolIds] of Object.entries(config.toolCategories)) {
      const index = toolIds.indexOf(toolId);
      if (index > -1) {
        toolIds.splice(index, 1);
      }
    }

    await fs.writeJSON(this.configPath, config, { spaces: 2 });

    console.log(`Unregistered tool: ${toolId}`);
  }

  async instantiateTool(toolId, mcpClient = null) {
    const tool = this.getTool(toolId);

    if (tool.instance) {
      return tool.instance;
    }

    try {
      // Use real MCP Service for tool execution
      tool.instance = new MCPToolWrapper(toolId, this.mcpService);
      await tool.instance.initialize();

      console.log(`Instantiated tool: ${toolId}`);
      return tool.instance;
    } catch (error) {
      throw new Error(`Failed to instantiate tool '${toolId}': ${error.message}`);
    }
  }

  getToolsInfo() {
    return {
      totalTools: this.tools.size,
      categories: this.getCategories(),
      tools: Array.from(this.tools.values()).map(tool => ({
        id: tool.id,
        name: tool.name,
        type: tool.type,
        description: tool.description,
        methods: tool.methods,
        instantiated: tool.instance !== null
      }))
    };
  }
}

// MCP Tool wrapper for real MCP service integration
class MCPToolWrapper {
  constructor(toolId, mcpService) {
    this.toolId = toolId;
    this.mcpService = mcpService;
    this.initialized = false;
  }

  async initialize() {
    // Verify tool is available in MCP Service
    const availableTools = this.mcpService.getAvailableTools();
    const tool = availableTools.find(t => t.id === this.toolId);

    if (!tool) {
      throw new Error(`Tool '${this.toolId}' not available in MCP Service`);
    }

    this.initialized = true;
    console.log(`Initialized MCP tool wrapper: ${this.toolId}`);
  }

  async execute(method, params = {}) {
    if (!this.initialized) {
      throw new Error(`Tool ${this.toolId} not initialized`);
    }

    try {
      console.log(`Executing ${this.toolId}.${method} with params:`, params);

      const result = await this.mcpService.executeTool(this.toolId, method, params);

      return {
        success: result.success,
        method,
        params,
        result: result.result,
        toolId: this.toolId,
        duration: result.duration,
        timestamp: result.timestamp
      };

    } catch (error) {
      console.error(`MCP tool execution failed: ${error.message}`);
      throw error;
    }
  }

  getInfo() {
    const availableTools = this.mcpService.getAvailableTools();
    const tool = availableTools.find(t => t.id === this.toolId);

    return {
      toolId: this.toolId,
      initialized: this.initialized,
      tool: tool || null,
      mcpServiceReady: this.mcpService.initialized
    };
  }
}