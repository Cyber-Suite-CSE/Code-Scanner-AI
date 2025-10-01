import fs from 'fs-extra';
import path from 'path';
import { EventEmitter } from 'events';

export class AILogger extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      outputPath: options.outputPath || './output',
      logFileName: options.logFileName || 'ai-interactions',
      maxLogSize: options.maxLogSize || 10 * 1024 * 1024, // 10MB
      maxLogFiles: options.maxLogFiles || 5,
      includeTimestamps: options.includeTimestamps !== false,
      includeMetadata: options.includeMetadata !== false,
      ...options
    };
    
    this.currentLogFile = null;
    this.logBuffer = [];
    this.bufferSize = 0;
    this.maxBufferSize = 1024 * 1024; // 1MB buffer
    this.flushInterval = 5000; // 5 seconds
    this.isFlushing = false;
    
    this.initialize();
  }

  async initialize() {
    try {
      // Ensure output directory exists
      await fs.ensureDir(this.options.outputPath);
      
      // Initialize log file
      await this.initializeLogFile();
      
      // Start periodic flush
      this.startPeriodicFlush();
      
      console.log('AI Logger initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI Logger:', error.message);
      throw error;
    }
  }

  async initializeLogFile() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${this.options.logFileName}-${timestamp}.jsonl`;
    this.currentLogFile = path.join(this.options.outputPath, fileName);
    
    // Create initial log entry
    const initialEntry = {
      type: 'log_initialization',
      timestamp: new Date().toISOString(),
      message: 'AI Logger initialized',
      metadata: {
        outputPath: this.options.outputPath,
        maxLogSize: this.options.maxLogSize,
        maxLogFiles: this.options.maxLogFiles
      }
    };
    
    await this.writeLogEntry(initialEntry);
  }

  startPeriodicFlush() {
    setInterval(async () => {
      if (this.logBuffer.length > 0 && !this.isFlushing) {
        await this.flushBuffer();
      }
    }, this.flushInterval);
  }

  async logAIInteraction(interaction) {
    try {
      const logEntry = this.formatLogEntry(interaction);
      
      // Add to buffer
      this.logBuffer.push(logEntry);
      this.bufferSize += JSON.stringify(logEntry).length;
      
      // Flush if buffer is full
      if (this.bufferSize >= this.maxBufferSize) {
        await this.flushBuffer();
      }
      
      this.emit('ai-interaction-logged', interaction);
      
    } catch (error) {
      console.error('Failed to log AI interaction:', error.message);
      this.emit('log-error', { error: error.message, interaction });
    }
  }

  formatLogEntry(interaction) {
    const baseEntry = {
      type: 'ai_interaction',
      timestamp: new Date().toISOString(),
      sessionId: interaction.sessionId || 'unknown',
      agent: interaction.agent || 'unknown',
      task: interaction.task || 'unknown'
    };

    if (this.options.includeMetadata) {
      baseEntry.metadata = {
        provider: interaction.provider,
        model: interaction.model,
        requestId: interaction.requestId || this.generateRequestId(),
        duration: interaction.duration,
        tokenUsage: interaction.tokenUsage,
        temperature: interaction.temperature,
        maxTokens: interaction.maxTokens
      };
    }

    // Add purpose and context
    baseEntry.purpose = interaction.purpose || this.inferPurpose(interaction.task);
    
    // Format prompt section
    baseEntry.prompt = {
      system: interaction.systemPrompt || '',
      user: interaction.userPrompt || '',
      full: interaction.fullPrompt || '',
      context: interaction.context || {}
    };

    // Format response section
    baseEntry.response = {
      content: interaction.response || '',
      usage: interaction.usage || {},
      model: interaction.model || 'unknown',
      finishReason: interaction.finishReason || 'unknown'
    };

    // Add error information if present
    if (interaction.error) {
      baseEntry.error = {
        message: interaction.error.message || interaction.error,
        code: interaction.error.code,
        type: interaction.error.type || 'unknown'
      };
    }

    // Add performance metrics
    baseEntry.performance = {
      requestTime: interaction.requestTime,
      responseTime: interaction.responseTime,
      totalDuration: interaction.duration,
      tokensPerSecond: this.calculateTokensPerSecond(interaction)
    };

    return baseEntry;
  }

  inferPurpose(task) {
    const purposeMap = {
      'tech-stack-identification': 'Identify and analyze the technology stack used in the codebase',
      'security-rule-generation': 'Generate security rules based on identified technologies',
      'vulnerability-analysis': 'Analyze code snippets for security vulnerabilities',
      'secure-code-generation': 'Generate secure code alternatives for identified vulnerabilities',
      'vulnerability-classification': 'Classify and score security issues',
      'documentation-analysis': 'Analyze documentation for security-relevant information',
      'code-analysis': 'Perform general code analysis',
      'unknown': 'Unknown AI analysis task'
    };
    
    return purposeMap[task] || purposeMap['unknown'];
  }

  calculateTokensPerSecond(interaction) {
    if (!interaction.duration || !interaction.usage?.output_tokens) {
      return 0;
    }
    
    const durationInSeconds = interaction.duration / 1000;
    return Math.round(interaction.usage.output_tokens / durationInSeconds);
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async writeLogEntry(entry) {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(this.currentLogFile, logLine);
    } catch (error) {
      console.error('Failed to write log entry:', error.message);
      throw error;
    }
  }

  async flushBuffer() {
    if (this.isFlushing || this.logBuffer.length === 0) {
      return;
    }

    this.isFlushing = true;

    try {
      // Check if we need to rotate log file
      await this.checkAndRotateLogFile();

      // Write all buffered entries
      const logLines = this.logBuffer.map(entry => JSON.stringify(entry) + '\n');
      await fs.appendFile(this.currentLogFile, logLines.join(''));

      // Clear buffer
      this.logBuffer = [];
      this.bufferSize = 0;

      this.emit('buffer-flushed', { entriesWritten: logLines.length });
    } catch (error) {
      console.error('Failed to flush log buffer:', error.message);
      this.emit('flush-error', { error: error.message });
    } finally {
      this.isFlushing = false;
    }
  }

  async checkAndRotateLogFile() {
    try {
      const stats = await fs.stat(this.currentLogFile);
      
      if (stats.size >= this.options.maxLogSize) {
        await this.rotateLogFile();
      }
    } catch (error) {
      // File doesn't exist or can't be accessed, create new one
      await this.initializeLogFile();
    }
  }

  async rotateLogFile() {
    try {
      // Flush current buffer before rotating
      if (this.logBuffer.length > 0) {
        const logLines = this.logBuffer.map(entry => JSON.stringify(entry) + '\n');
        await fs.appendFile(this.currentLogFile, logLines.join(''));
        this.logBuffer = [];
        this.bufferSize = 0;
      }

      // Create new log file
      await this.initializeLogFile();
      
      // Clean up old log files
      await this.cleanupOldLogFiles();
      
      this.emit('log-rotated', { newLogFile: this.currentLogFile });
    } catch (error) {
      console.error('Failed to rotate log file:', error.message);
      throw error;
    }
  }

  async cleanupOldLogFiles() {
    try {
      const files = await fs.readdir(this.options.outputPath);
      const logFiles = files
        .filter(file => file.startsWith(this.options.logFileName) && file.endsWith('.jsonl'))
        .map(file => ({
          name: file,
          path: path.join(this.options.outputPath, file),
          mtime: fs.stat(path.join(this.options.outputPath, file)).then(stats => stats.mtime)
        }));

      // Sort by modification time (newest first)
      const sortedFiles = await Promise.all(
        logFiles.map(async file => ({
          ...file,
          mtime: await file.mtime
        }))
      );
      
      sortedFiles.sort((a, b) => b.mtime - a.mtime);

      // Remove excess files
      if (sortedFiles.length > this.options.maxLogFiles) {
        const filesToRemove = sortedFiles.slice(this.options.maxLogFiles);
        
        for (const file of filesToRemove) {
          try {
            await fs.unlink(file.path);
            console.log(`Removed old log file: ${file.name}`);
          } catch (error) {
            console.warn(`Failed to remove old log file ${file.name}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old log files:', error.message);
    }
  }

  async getLogStats() {
    try {
      const files = await fs.readdir(this.options.outputPath);
      const logFiles = files.filter(file => 
        file.startsWith(this.options.logFileName) && file.endsWith('.jsonl')
      );

      let totalSize = 0;
      let totalEntries = 0;

      for (const file of logFiles) {
        const filePath = path.join(this.options.outputPath, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;

        // Count entries in file
        const content = await fs.readFile(filePath, 'utf8');
        const entries = content.trim().split('\n').filter(line => line.trim());
        totalEntries += entries.length;
      }

      return {
        totalFiles: logFiles.length,
        totalSize,
        totalEntries,
        currentLogFile: this.currentLogFile,
        bufferSize: this.bufferSize,
        bufferedEntries: this.logBuffer.length
      };
    } catch (error) {
      console.error('Failed to get log stats:', error.message);
      return {
        totalFiles: 0,
        totalSize: 0,
        totalEntries: 0,
        currentLogFile: this.currentLogFile,
        bufferSize: this.bufferSize,
        bufferedEntries: this.logBuffer.length,
        error: error.message
      };
    }
  }

  async searchLogs(query, options = {}) {
    try {
      const {
        startDate,
        endDate,
        agent,
        task,
        provider,
        limit = 100
      } = options;

      const files = await fs.readdir(this.options.outputPath);
      const logFiles = files
        .filter(file => file.startsWith(this.options.logFileName) && file.endsWith('.jsonl'))
        .sort()
        .reverse(); // Start with newest files

      const results = [];

      for (const file of logFiles) {
        if (results.length >= limit) break;

        const filePath = path.join(this.options.outputPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.trim().split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (results.length >= limit) break;

          try {
            const entry = JSON.parse(line);
            
            // Apply filters
            if (startDate && new Date(entry.timestamp) < new Date(startDate)) continue;
            if (endDate && new Date(entry.timestamp) > new Date(endDate)) continue;
            if (agent && entry.agent !== agent) continue;
            if (task && entry.task !== task) continue;
            if (provider && entry.metadata?.provider !== provider) continue;

            // Search in content
            const searchText = JSON.stringify(entry).toLowerCase();
            if (query && !searchText.includes(query.toLowerCase())) continue;

            results.push(entry);
          } catch (parseError) {
            console.warn(`Failed to parse log entry: ${parseError.message}`);
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to search logs:', error.message);
      return [];
    }
  }

  async exportLogs(format = 'json', options = {}) {
    try {
      const logs = await this.searchLogs('', options);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      if (format === 'json') {
        const exportFile = path.join(this.options.outputPath, `ai-logs-export-${timestamp}.json`);
        await fs.writeJSON(exportFile, logs, { spaces: 2 });
        return exportFile;
      } else if (format === 'csv') {
        const exportFile = path.join(this.options.outputPath, `ai-logs-export-${timestamp}.csv`);
        const csv = this.convertToCSV(logs);
        await fs.writeFile(exportFile, csv);
        return exportFile;
      } else {
        throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('Failed to export logs:', error.message);
      throw error;
    }
  }

  convertToCSV(logs) {
    if (logs.length === 0) return '';

    const headers = [
      'timestamp',
      'agent',
      'task',
      'purpose',
      'provider',
      'model',
      'duration',
      'input_tokens',
      'output_tokens',
      'total_tokens',
      'tokens_per_second',
      'error'
    ];

    const rows = logs.map(log => [
      log.timestamp,
      log.agent,
      log.task,
      log.purpose,
      log.metadata?.provider || '',
      log.metadata?.model || '',
      log.performance?.totalDuration || '',
      log.metadata?.tokenUsage?.input_tokens || '',
      log.metadata?.tokenUsage?.output_tokens || '',
      log.metadata?.tokenUsage?.total_tokens || '',
      log.performance?.tokensPerSecond || '',
      log.error?.message || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csvContent;
  }

  async cleanup() {
    try {
      // Flush any remaining buffer
      if (this.logBuffer.length > 0) {
        await this.flushBuffer();
      }
      
      console.log('AI Logger cleanup completed');
    } catch (error) {
      console.error('AI Logger cleanup failed:', error.message);
    }
  }
}
