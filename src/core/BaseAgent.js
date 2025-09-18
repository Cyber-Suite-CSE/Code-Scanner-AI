import { EventEmitter } from 'events';

export class BaseAgent extends EventEmitter {
  constructor(name, toolRegistry, anthropicService = null, options = {}) {
    super();
    this.name = name;
    this.toolRegistry = toolRegistry;
    this.anthropicService = anthropicService;
    this.options = options;
    this.status = 'idle';
    this.results = new Map();
    this.context = new Map();
    this.executionHistory = [];
  }

  async initialize() {
    this.emit('status-change', { agent: this.name, status: 'initializing' });
    console.log(`Initializing agent: ${this.name}`);

    // Subclasses should override this method
    await this.onInitialize();

    this.status = 'ready';
    this.emit('status-change', { agent: this.name, status: 'ready' });
    console.log(`Agent ${this.name} initialized and ready`);
  }

  async onInitialize() {
    // Override in subclasses
  }

  async execute(input = {}) {
    try {
      this.status = 'running';
      this.emit('status-change', { agent: this.name, status: 'running' });
      this.emit('execution-start', { agent: this.name, input });

      console.log(`Agent ${this.name} starting execution`);

      const result = await this.onExecute(input);

      this.executionHistory.push({
        timestamp: new Date().toISOString(),
        input,
        result,
        duration: Date.now() - this.startTime
      });

      this.status = 'completed';
      this.emit('status-change', { agent: this.name, status: 'completed' });
      this.emit('execution-complete', { agent: this.name, result });

      console.log(`Agent ${this.name} completed execution`);
      return result;

    } catch (error) {
      this.status = 'error';
      this.emit('status-change', { agent: this.name, status: 'error' });
      this.emit('execution-error', { agent: this.name, error });

      console.error(`Agent ${this.name} execution failed:`, error.message);
      throw error;
    }
  }

  async onExecute(input) {
    throw new Error(`Agent ${this.name} must implement onExecute method`);
  }

  async useTool(toolId, method, params = {}) {
    try {
      console.log(`Agent ${this.name} using tool: ${toolId}.${method}`);

      const tool = await this.toolRegistry.instantiateTool(toolId, null);
      const result = await tool.execute(method, params);

      this.emit('tool-used', {
        agent: this.name,
        toolId,
        method,
        params,
        result
      });

      return result;
    } catch (error) {
      console.error(`Tool execution failed in ${this.name}:`, error.message);
      throw new Error(`Failed to use tool ${toolId}.${method}: ${error.message}`);
    }
  }

  async analyzeWithAI(code, prompt, context = {}) {
    if (!this.anthropicService) {
      throw new Error('Anthropic service not available for AI analysis');
    }

    try {
      console.log(`Agent ${this.name} performing AI analysis`);

      const analysisContext = {
        agent: this.name,
        ...context
      };

      const result = await this.anthropicService.analyzeCode(code, prompt, analysisContext);

      this.emit('ai-analysis-used', {
        agent: this.name,
        prompt: prompt.substring(0, 100),
        tokens: result.usage?.output_tokens
      });

      return result;
    } catch (error) {
      console.error(`AI analysis failed in ${this.name}:`, error.message);
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  setContext(key, value) {
    this.context.set(key, value);
    this.emit('context-updated', { agent: this.name, key, value });
  }

  getContext(key) {
    return this.context.get(key);
  }

  getAllContext() {
    return Object.fromEntries(this.context);
  }

  storeResult(key, value) {
    this.results.set(key, {
      value,
      timestamp: new Date().toISOString()
    });
  }

  getResult(key) {
    const result = this.results.get(key);
    return result ? result.value : null;
  }

  getAllResults() {
    const results = {};
    for (const [key, data] of this.results) {
      results[key] = data.value;
    }
    return results;
  }

  getStatus() {
    return {
      name: this.name,
      status: this.status,
      contextKeys: Array.from(this.context.keys()),
      resultKeys: Array.from(this.results.keys()),
      executionCount: this.executionHistory.length,
      lastExecution: this.executionHistory.length > 0
        ? this.executionHistory[this.executionHistory.length - 1].timestamp
        : null
    };
  }

  getExecutionHistory() {
    return this.executionHistory.slice(); // Return copy
  }

  async validateInput(input) {
    // Override in subclasses for input validation
    return true;
  }

  async cleanup() {
    this.status = 'cleanup';
    this.emit('status-change', { agent: this.name, status: 'cleanup' });

    // Override in subclasses for cleanup logic
    await this.onCleanup();

    this.removeAllListeners();
    console.log(`Agent ${this.name} cleaned up`);
  }

  async onCleanup() {
    // Override in subclasses
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      agent: this.name,
      level,
      message
    };

    console.log(`[${timestamp}] [${this.name}] [${level.toUpperCase()}] ${message}`);

    this.emit('log', logEntry);
  }

  async parallel(tasks) {
    this.log(`Executing ${tasks.length} tasks in parallel`);

    try {
      const results = await Promise.allSettled(
        tasks.map(async (task, index) => {
          try {
            return await task();
          } catch (error) {
            throw new Error(`Parallel task ${index} failed: ${error.message}`);
          }
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);

      if (failed.length > 0) {
        this.log(`${failed.length} parallel tasks failed`, 'warn');
        failed.forEach(error => this.log(error.message, 'error'));
      }

      return { successful, failed, total: tasks.length };
    } catch (error) {
      this.log(`Parallel execution failed: ${error.message}`, 'error');
      throw error;
    }
  }
}