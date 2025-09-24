import { EventEmitter } from 'events';
import { ToolRegistry } from './ToolRegistry.js';
import { VulnerabilityClassifier } from './VulnerabilityClassifier.js';
import { ZipHandler } from './ZipHandler.js';
import { AnthropicService } from '../services/AnthropicService.js';
import { SentinelAgent } from '../agents/SentinelAgent.js';
import { GuardianAgent } from '../agents/GuardianAgent.js';
import { InspectorAgent } from '../agents/InspectorAgent.js';
import { ForgeAgent } from '../agents/ForgeAgent.js';
import fs from 'fs-extra';
import path from 'path';

export class WorkflowOrchestrator extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      configPath: './config',
      outputPath: './output',
      tempPath: './temp',
      parallel: true,
      maxRetries: 3,
      timeout: 300000, // 5 minutes
      ...options
    };

    this.toolRegistry = null;
    this.vulnerabilityClassifier = null;
    this.zipHandler = null;
    this.anthropicService = null;
    this.agents = new Map();

    this.workflowState = {
      status: 'idle',
      currentStep: null,
      startTime: null,
      endTime: null,
      results: new Map(),
      errors: [],
      metrics: {
        totalFiles: 0,
        issuesFound: 0,
        suggestionsGenerated: 0,
        executionTime: 0
      }
    };
  }

  async initialize() {
    try {
      this.emit('workflow-status', { status: 'initializing' });
      console.log('Initializing Workflow Orchestrator...');

      // Ensure directories exist
      await fs.ensureDir(this.options.outputPath);
      await fs.ensureDir(this.options.tempPath);

      // Initialize core components
      await this.initializeComponents();

      // Initialize agents
      await this.initializeAgents();

      this.workflowState.status = 'ready';
      this.emit('workflow-status', { status: 'ready' });

      console.log('Workflow Orchestrator initialized successfully');
    } catch (error) {
      this.workflowState.status = 'error';
      this.workflowState.errors.push({
        stage: 'initialization',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      this.emit('workflow-error', { stage: 'initialization', error });
      throw new Error(`Workflow initialization failed: ${error.message}`);
    }
  }

  async initializeComponents() {
    // Initialize Anthropic Service
    this.anthropicService = new AnthropicService(this.options.ai || {});

    // Test Anthropic connection
    const connectionTest = await this.anthropicService.testConnection();
    if (!connectionTest.success) {
      throw new Error(`Anthropic API connection failed: ${connectionTest.error}`);
    }
    console.log('Anthropic API connection verified');

    // Initialize Tool Registry
    this.toolRegistry = new ToolRegistry(
      path.join(this.options.configPath, 'mcp-tools.json')
    );
    await this.toolRegistry.initialize();

    // Initialize Vulnerability Classifier
    this.vulnerabilityClassifier = new VulnerabilityClassifier(
      path.join(this.options.configPath, 'vulnerabilities.json')
    );
    await this.vulnerabilityClassifier.initialize();

    // Initialize Zip Handler
    this.zipHandler = new ZipHandler({
      tempDir: this.options.tempPath
    });

    console.log('Core components initialized');
  }

  async initializeAgents() {
    const agentConfigs = [
      { name: 'sentinel', class: SentinelAgent },
      { name: 'guardian', class: GuardianAgent },
      { name: 'inspector', class: InspectorAgent },
      { name: 'forge', class: ForgeAgent }
    ];

    for (const { name, class: AgentClass } of agentConfigs) {
      try {
        const agent = new AgentClass(
          this.toolRegistry,
          this.anthropicService,
          this.options
        );

        // Set up event listeners
        this.setupAgentEventListeners(agent, name);

        // Initialize agent
        await agent.initialize();

        this.agents.set(name, agent);

        console.log(`Agent ${name} initialized`);
      } catch (error) {
        throw new Error(`Failed to initialize ${name} agent: ${error.message}`);
      }
    }
  }

  setupAgentEventListeners(agent, name) {
    agent.on('status-change', (event) => {
      this.emit('agent-status', { agent: name, ...event });
    });

    agent.on('execution-start', (event) => {
      this.emit('agent-execution-start', { agent: name, ...event });
    });

    agent.on('execution-complete', (event) => {
      this.emit('agent-execution-complete', { agent: name, ...event });
    });

    agent.on('execution-error', (event) => {
      this.emit('agent-execution-error', { agent: name, ...event });
    });

    agent.on('tool-used', (event) => {
      this.emit('tool-used', { agent: name, ...event });
    });

    agent.on('log', (event) => {
      this.emit('agent-log', { agent: name, ...event });
    });
  }

  async executeScan(zipFilePath) {
    try {
      this.workflowState.status = 'running';
      this.workflowState.startTime = Date.now();
      this.workflowState.currentStep = 'starting';

      this.emit('workflow-status', {
        status: 'running',
        step: 'starting'
      });

      console.log(`Starting security scan for: ${zipFilePath}`);

      // Execute workflow steps
      const results = await this.executeWorkflowSteps(zipFilePath);

      // Generate final report
      const report = await this.generateFinalReport(results);

      // Save results
      const outputFile = await this.saveResults(report);

      this.workflowState.status = 'completed';
      this.workflowState.endTime = Date.now();
      this.workflowState.metrics.executionTime = this.workflowState.endTime - this.workflowState.startTime;

      this.emit('workflow-status', {
        status: 'completed',
        outputFile,
        metrics: this.workflowState.metrics
      });

      console.log(`Security scan completed in ${this.workflowState.metrics.executionTime}ms`);

      return {
        success: true,
        report,
        outputFile,
        metrics: this.workflowState.metrics
      };

    } catch (error) {
      return await this.handleWorkflowError(error);
    } finally {
      await this.cleanup();
    }
  }

  async executeWorkflowSteps(zipFilePath) {
    const results = {};

    // Step 1: Extract and analyze codebase
    results.extraction = await this.executeStep('extraction', async () => {
      this.workflowState.currentStep = 'extraction';

      const extractionResult = await this.zipHandler.extractZip(zipFilePath);
      this.workflowState.metrics.totalFiles = extractionResult.totalFiles;

      return extractionResult;
    });

    // Step 2: Sentinel Agent - Identify tech stacks
    results.sentinel = await this.executeStep('sentinel', async () => {
      this.workflowState.currentStep = 'tech-stack-identification';

      const sentinelAgent = this.agents.get('sentinel');
      return await sentinelAgent.execute({
        codebasePath: results.extraction.extractionPath
      });
    });

    // Step 3: Guardian Agent - Create rules
    results.guardian = await this.executeStep('guardian', async () => {
      this.workflowState.currentStep = 'rule-creation';

      const guardianAgent = this.agents.get('guardian');
      return await guardianAgent.execute({
        techStacks: results.sentinel.techStacks,
        goals: results.sentinel.goals
      });
    });

    // Step 4: Inspector Agent - Analyze code
    results.inspector = await this.executeStep('inspector', async () => {
      this.workflowState.currentStep = 'security-analysis';

      const inspectorAgent = this.agents.get('inspector');
      const inspectionResult = await inspectorAgent.execute({
        codebasePath: results.extraction.extractionPath,
        ruleSet: results.guardian.ruleSet,
        entryPoints: results.sentinel.entryPoints
      });

      this.workflowState.metrics.issuesFound = inspectionResult.issues.length;
      return inspectionResult;
    });

    // Step 5: Classify vulnerabilities
    results.classification = await this.executeStep('classification', async () => {
      this.workflowState.currentStep = 'vulnerability-classification';

      return this.vulnerabilityClassifier.classifyMultipleIssues(
        results.inspector.issues
      );
    });

    // Step 6: Forge Agent - Generate suggestions
    results.forge = await this.executeStep('forge', async () => {
      this.workflowState.currentStep = 'suggestion-generation';

      const forgeAgent = this.agents.get('forge');
      const forgeResult = await forgeAgent.execute({
        issues: results.inspector.issues,
        techStacks: results.sentinel.techStacks
      });

      this.workflowState.metrics.suggestionsGenerated = forgeResult.suggestions.length;
      return forgeResult;
    });

    return results;
  }

  async executeStep(stepName, stepFunction) {
    const startTime = Date.now();

    try {
      this.emit('workflow-step-start', { step: stepName });

      console.log(`Executing step: ${stepName}`);

      const result = await Promise.race([
        stepFunction(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Step ${stepName} timed out`)), this.options.timeout)
        )
      ]);

      const duration = Date.now() - startTime;

      this.workflowState.results.set(stepName, {
        result,
        duration,
        success: true,
        timestamp: new Date().toISOString()
      });

      this.emit('workflow-step-complete', {
        step: stepName,
        duration,
        success: true
      });

      console.log(`Step ${stepName} completed in ${duration}ms`);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      this.workflowState.errors.push({
        stage: stepName,
        error: error.message,
        timestamp: new Date().toISOString(),
        duration
      });

      this.emit('workflow-step-error', {
        step: stepName,
        error: error.message,
        duration
      });

      console.error(`Step ${stepName} failed after ${duration}ms: ${error.message}`);

      throw error;
    }
  }

  async generateFinalReport(results) {
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        scanDuration: this.workflowState.endTime - this.workflowState.startTime,
        version: '1.0.0',
        workflow: 'security-scan'
      },
      executionSummary: {
        status: 'completed',
        stepsExecuted: Array.from(this.workflowState.results.keys()),
        totalFiles: this.workflowState.metrics.totalFiles,
        issuesFound: this.workflowState.metrics.issuesFound,
        suggestionsGenerated: this.workflowState.metrics.suggestionsGenerated,
        executionTime: this.workflowState.metrics.executionTime
      },
      techStackAnalysis: {
        identifiedStacks: results.sentinel.techStacks,
        goals: results.sentinel.goals,
        entryPoints: results.sentinel.entryPoints
      },
      securityAnalysis: {
        totalIssues: results.inspector.issues.length,
        issuesByCategory: results.inspector.categorizedIssues,
        riskAssessment: results.inspector.report,
        classification: results.classification.summary
      },
      recommendations: {
        suggestions: results.forge.suggestions,
        educationalMaterial: results.forge.educationalMaterial,
        implementationGuidance: results.forge.statistics
      },
      detailedFindings: {
        vulnerabilities: results.inspector.issues,
        classifications: results.classification.classifications,
        secureCodeSuggestions: results.forge.suggestions.filter(s => s.type === 'code-suggestion')
      },
      actionPlan: this.generateActionPlan(results),
      appendix: {
        rulesUsed: results.guardian.ruleSet.length,
        toolsUsed: this.getToolsUsed(),
        agentExecutionDetails: this.getAgentExecutionDetails()
      }
    };

    return report;
  }

  generateActionPlan(results) {
    const criticalIssues = results.inspector.categorizedIssues.critical || [];
    const highIssues = results.inspector.categorizedIssues.high || [];

    const actionPlan = {
      immediate: [],
      shortTerm: [],
      longTerm: []
    };

    // Immediate actions for critical issues
    if (criticalIssues.length > 0) {
      actionPlan.immediate.push({
        priority: 1,
        action: 'Address Critical Security Vulnerabilities',
        description: `Fix ${criticalIssues.length} critical security issues immediately`,
        timeframe: '1-2 days',
        issues: criticalIssues.slice(0, 5).map(i => ({
          id: i.id,
          type: i.type,
          file: i.file,
          line: i.line
        }))
      });
    }

    // Short-term actions for high-severity issues
    if (highIssues.length > 0) {
      actionPlan.shortTerm.push({
        priority: 2,
        action: 'Fix High-Severity Issues',
        description: `Address ${highIssues.length} high-severity security issues`,
        timeframe: '1-2 weeks',
        issues: highIssues.slice(0, 10).map(i => ({
          id: i.id,
          type: i.type,
          file: i.file,
          line: i.line
        }))
      });
    }

    // Long-term security improvements
    actionPlan.longTerm.push({
      priority: 3,
      action: 'Implement Security Best Practices',
      description: 'Establish ongoing security practices and training',
      timeframe: '1-3 months',
      activities: [
        'Set up automated security scanning',
        'Implement security code review process',
        'Conduct security training for development team',
        'Establish security testing procedures'
      ]
    });

    return actionPlan;
  }

  getToolsUsed() {
    const toolsUsed = [];

    // Get tools from agent execution history
    this.agents.forEach((agent, name) => {
      const history = agent.getExecutionHistory();

      history.forEach(execution => {
        // Extract tool usage from execution data
        // This would be populated by agent tool usage events
      });
    });

    return toolsUsed;
  }

  getAgentExecutionDetails() {
    const details = {};

    this.agents.forEach((agent, name) => {
      const status = agent.getStatus();
      const results = agent.getAllResults();

      details[name] = {
        status: status.status,
        executionCount: status.executionCount,
        lastExecution: status.lastExecution,
        resultsCount: Object.keys(results).length
      };
    });

    return details;
  }

  async saveResults(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(
      this.options.outputPath,
      `security-scan-report-${timestamp}.json`
    );

    try {
      await fs.writeJSON(outputFile, report, { spaces: 2 });

      console.log(`Report saved to: ${outputFile}`);

      // Also save a summary file
      const summaryFile = path.join(
        this.options.outputPath,
        `security-scan-summary-${timestamp}.json`
      );

      const summary = {
        metadata: report.metadata,
        executionSummary: report.executionSummary,
        securitySummary: {
          totalIssues: report.securityAnalysis.totalIssues,
          criticalIssues: report.securityAnalysis.issuesByCategory.critical?.length || 0,
          highIssues: report.securityAnalysis.issuesByCategory.high?.length || 0,
          riskLevel: report.securityAnalysis.riskAssessment.summary.riskLevel
        },
        actionPlan: report.actionPlan
      };

      await fs.writeJSON(summaryFile, summary, { spaces: 2 });

      return outputFile;

    } catch (error) {
      throw new Error(`Failed to save results: ${error.message}`);
    }
  }

  async handleWorkflowError(error) {
    this.workflowState.status = 'error';
    this.workflowState.endTime = Date.now();

    this.workflowState.errors.push({
      stage: 'workflow',
      error: error.message,
      timestamp: new Date().toISOString()
    });

    this.emit('workflow-error', {
      stage: 'workflow',
      error: error.message,
      state: this.workflowState
    });

    console.error(`Workflow execution failed: ${error.message}`);

    // Try to generate partial report if possible
    let partialReport = null;

    try {
      const completedResults = {};

      // Collect completed results
      this.workflowState.results.forEach((stepResult, stepName) => {
        if (stepResult.success) {
          completedResults[stepName] = stepResult.result;
        }
      });

      if (Object.keys(completedResults).length > 0) {
        partialReport = await this.generatePartialReport(completedResults, error);
        const outputFile = await this.saveResults(partialReport);

        return {
          success: false,
          error: error.message,
          partialReport,
          outputFile,
          completedSteps: Object.keys(completedResults)
        };
      }

    } catch (reportError) {
      console.error(`Failed to generate partial report: ${reportError.message}`);
    }

    return {
      success: false,
      error: error.message,
      state: this.workflowState,
      partialReport
    };
  }

  async generatePartialReport(completedResults, error) {
    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        scanDuration: (this.workflowState.endTime || Date.now()) - this.workflowState.startTime,
        version: '1.0.0',
        workflow: 'security-scan-partial',
        error: error.message
      },
      executionSummary: {
        status: 'partial',
        stepsExecuted: Object.keys(completedResults),
        stepsCompleted: Object.keys(completedResults).length,
        totalSteps: 6,
        error: error.message
      },
      completedResults,
      errors: this.workflowState.errors,
      note: 'This is a partial report generated after workflow error'
    };
  }

  async cleanup() {
    try {
      console.log('Starting cleanup...');

      // Cleanup zip handler
      if (this.zipHandler) {
        await this.zipHandler.cleanup();
      }

      // Cleanup agents
      for (const [name, agent] of this.agents) {
        try {
          await agent.cleanup();
          console.log(`Agent ${name} cleaned up`);
        } catch (error) {
          console.warn(`Failed to cleanup agent ${name}: ${error.message}`);
        }
      }

      console.log('Cleanup completed');

    } catch (error) {
      console.error(`Cleanup failed: ${error.message}`);
    }
  }

  getWorkflowState() {
    return {
      ...this.workflowState,
      agentStates: Object.fromEntries(
        Array.from(this.agents.entries()).map(([name, agent]) => [
          name,
          agent.getStatus()
        ])
      )
    };
  }

  async cancelWorkflow() {
    try {
      this.workflowState.status = 'cancelling';

      this.emit('workflow-status', { status: 'cancelling' });

      // Cancel running agents
      for (const [name, agent] of this.agents) {
        // Agents would need to implement cancellation support
        console.log(`Cancelling agent ${name}...`);
      }

      await this.cleanup();

      this.workflowState.status = 'cancelled';
      this.workflowState.endTime = Date.now();

      this.emit('workflow-status', { status: 'cancelled' });

      console.log('Workflow cancelled');

    } catch (error) {
      console.error(`Workflow cancellation failed: ${error.message}`);
      throw error;
    }
  }

  // Test method to execute until Inspector Agent
  async testInspectorOnly(zipFilePath) {
    try {
      this.workflowState.status = 'running';
      this.workflowState.startTime = Date.now();
      this.workflowState.currentStep = 'starting';

      this.emit('workflow-status', {
        status: 'running',
        step: 'starting'
      });

      console.log(`Starting test execution until Inspector Agent for: ${zipFilePath}`);

      // Step 1: Extract and analyze codebase
      const extraction = await this.executeStep('extraction', async () => {
        this.workflowState.currentStep = 'extraction';

        const extractionResult = await this.zipHandler.extractZip(zipFilePath);
        this.workflowState.metrics.totalFiles = extractionResult.totalFiles;

        return extractionResult;
      });

      // Step 2: Sentinel Agent - Identify tech stacks
      const sentinel = await this.executeStep('sentinel', async () => {
        this.workflowState.currentStep = 'tech-stack-identification';

        const sentinelAgent = this.agents.get('sentinel');
        return await sentinelAgent.execute({
          codebasePath: extraction.extractionPath
        });
      });

      // Step 3: Guardian Agent - Create rules
      const guardian = await this.executeStep('guardian', async () => {
        this.workflowState.currentStep = 'rule-creation';

        const guardianAgent = this.agents.get('guardian');
        return await guardianAgent.execute({
          techStacks: sentinel.techStacks,
          goals: sentinel.goals
        });
      });

      // Step 4: Inspector Agent - Analyze code
      const inspector = await this.executeStep('inspector', async () => {
        this.workflowState.currentStep = 'security-analysis';

        const inspectorAgent = this.agents.get('inspector');
        const inspectionResult = await inspectorAgent.execute({
          codebasePath: extraction.extractionPath,
          ruleSet: guardian.ruleSet,
          entryPoints: sentinel.entryPoints
        });

        this.workflowState.metrics.issuesFound = inspectionResult.issues.length;
        return inspectionResult;
      });

      this.workflowState.status = 'completed';
      this.workflowState.endTime = Date.now();
      this.workflowState.metrics.executionTime = this.workflowState.endTime - this.workflowState.startTime;

      this.emit('workflow-status', {
        status: 'completed',
        metrics: this.workflowState.metrics
      });

      console.log(`Test execution completed in ${this.workflowState.metrics.executionTime}ms`);

      return {
        success: true,
        extraction,
        sentinel,
        guardian,
        inspector,
        metrics: this.workflowState.metrics
      };

    } catch (error) {
      console.error(`Test execution failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        state: this.workflowState
      };
    } finally {
      await this.cleanup();
    }
  }

  // Test method to execute until Guardian Agent
  async testGuardianOnly(zipFilePath) {
    try {
      this.workflowState.status = 'running';
      this.workflowState.startTime = Date.now();
      this.workflowState.currentStep = 'starting';

      this.emit('workflow-status', {
        status: 'running',
        step: 'starting'
      });

      console.log(`Starting test execution until Guardian Agent for: ${zipFilePath}`);

      // Step 1: Extract and analyze codebase
      const extraction = await this.executeStep('extraction', async () => {
        this.workflowState.currentStep = 'extraction';

        const extractionResult = await this.zipHandler.extractZip(zipFilePath);
        this.workflowState.metrics.totalFiles = extractionResult.totalFiles;

        return extractionResult;
      });

      // Step 2: Sentinel Agent - Identify tech stacks
      const sentinel = await this.executeStep('sentinel', async () => {
        this.workflowState.currentStep = 'tech-stack-identification';

        const sentinelAgent = this.agents.get('sentinel');
        return await sentinelAgent.execute({
          codebasePath: extraction.extractionPath
        });
      });

      // Step 3: Guardian Agent - Create rules
      const guardian = await this.executeStep('guardian', async () => {
        this.workflowState.currentStep = 'rule-creation';

        const guardianAgent = this.agents.get('guardian');
        return await guardianAgent.execute({
          techStacks: sentinel.techStacks,
          goals: sentinel.goals
        });
      });

      this.workflowState.status = 'completed';
      this.workflowState.endTime = Date.now();
      this.workflowState.metrics.executionTime = this.workflowState.endTime - this.workflowState.startTime;

      this.emit('workflow-status', {
        status: 'completed',
        metrics: this.workflowState.metrics
      });

      console.log(`Test execution completed in ${this.workflowState.metrics.executionTime}ms`);

      return {
        success: true,
        extraction,
        sentinel,
        guardian,
        metrics: this.workflowState.metrics
      };

    } catch (error) {
      console.error(`Test execution failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        state: this.workflowState
      };
    } finally {
      await this.cleanup();
    }
  }

  // Test method to execute only until Sentinel Agent
  async testSentinelOnly(zipFilePath) {
    try {
      this.workflowState.status = 'running';
      this.workflowState.startTime = Date.now();
      this.workflowState.currentStep = 'starting';

      this.emit('workflow-status', {
        status: 'running',
        step: 'starting'
      });

      console.log(`Starting test execution for: ${zipFilePath}`);

      // Step 1: Extract and analyze codebase
      const extraction = await this.executeStep('extraction', async () => {
        this.workflowState.currentStep = 'extraction';

        const extractionResult = await this.zipHandler.extractZip(zipFilePath);
        this.workflowState.metrics.totalFiles = extractionResult.totalFiles;

        return extractionResult;
      });

      // Step 2: Sentinel Agent - Identify tech stacks
      const sentinel = await this.executeStep('sentinel', async () => {
        this.workflowState.currentStep = 'tech-stack-identification';

        const sentinelAgent = this.agents.get('sentinel');
        return await sentinelAgent.execute({
          codebasePath: extraction.extractionPath
        });
      });

      this.workflowState.status = 'completed';
      this.workflowState.endTime = Date.now();
      this.workflowState.metrics.executionTime = this.workflowState.endTime - this.workflowState.startTime;

      this.emit('workflow-status', {
        status: 'completed',
        metrics: this.workflowState.metrics
      });

      console.log(`Test execution completed in ${this.workflowState.metrics.executionTime}ms`);

      return {
        success: true,
        extraction,
        sentinel,
        metrics: this.workflowState.metrics
      };

    } catch (error) {
      console.error(`Test execution failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        state: this.workflowState
      };
    } finally {
      await this.cleanup();
    }
  }

  // Health check method
  async healthCheck() {
    const health = {
      status: 'healthy',
      components: {},
      timestamp: new Date().toISOString()
    };

    try {
      // Check tool registry
      health.components.toolRegistry = {
        status: this.toolRegistry?.initialized ? 'healthy' : 'unhealthy',
        toolCount: this.toolRegistry?.getAllTools()?.length || 0
      };

      // Check vulnerability classifier
      health.components.vulnerabilityClassifier = {
        status: this.vulnerabilityClassifier?.initialized ? 'healthy' : 'unhealthy',
        categoryCount: this.vulnerabilityClassifier?.getVulnerabilityCategories()?.length || 0
      };

      // Check agents
      health.components.agents = {};

      this.agents.forEach((agent, name) => {
        const status = agent.getStatus();
        health.components.agents[name] = {
          status: status.status === 'ready' ? 'healthy' : 'unhealthy',
          lastExecution: status.lastExecution
        };
      });

      // Overall health assessment
      const allHealthy = Object.values(health.components).every(component =>
        component.status === 'healthy' ||
        (typeof component === 'object' && Object.values(component).every(c => c.status === 'healthy'))
      );

      health.status = allHealthy ? 'healthy' : 'degraded';

      return health;

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
      return health;
    }
  }
}