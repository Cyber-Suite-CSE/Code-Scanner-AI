import { BaseAgent } from '../core/BaseAgent.js';
import fs from 'fs-extra';
import path from 'path';

export class InspectorAgent extends BaseAgent {
  constructor(toolRegistry, anthropicService, options = {}) {
    super('Inspector', toolRegistry, anthropicService, options);
    this.scanResults = new Map();
    this.severityWeights = {
      critical: 10,
      high: 7,
      medium: 4,
      low: 1
    };
    this.maxFileSizeForScan = 1024 * 1024; // 1MB
  }

  async onInitialize() {
    this.log('Initializing Inspector Agent for code analysis');
    this.setContext('scanStartTime', Date.now());
  }

  async onExecute(input) {
    const { codebasePath, ruleSet, entryPoints } = input;

    if (!codebasePath || !ruleSet) {
      throw new Error('Inspector Agent requires codebase path and rule set');
    }

    this.log(`Starting security scan with ${ruleSet.length} rules`);

    const scanTasks = [
      () => this.scanCodebase(codebasePath, ruleSet),
      () => this.analyzeEntryPoints(codebasePath, entryPoints, ruleSet),
      () => this.performDeepAnalysis(codebasePath, ruleSet)
    ];

    const results = await this.parallel(scanTasks);
    const consolidatedIssues = this.consolidateIssues(results.successful);
    const categorizedIssues = this.categorizeIssuesBySeverity(consolidatedIssues);
    const report = this.generateSecurityReport(consolidatedIssues, categorizedIssues);

    const result = {
      issues: consolidatedIssues,
      categorizedIssues,
      report,
      statistics: {
        totalIssues: consolidatedIssues.length,
        criticalIssues: categorizedIssues.critical.length,
        highIssues: categorizedIssues.high.length,
        mediumIssues: categorizedIssues.medium.length,
        lowIssues: categorizedIssues.low.length,
        filesScanned: this.scanResults.size,
        scanDuration: Date.now() - this.getContext('scanStartTime')
      }
    };

    this.storeResult('issues', consolidatedIssues);
    this.storeResult('report', report);
    this.storeResult('statistics', result.statistics);

    this.log(`Security scan completed: ${consolidatedIssues.length} issues found`);

    return result;
  }

  async scanCodebase(codebasePath, ruleSet) {
    this.log('Starting codebase scan');

    const issues = [];
    const scannedFiles = [];

    try {
      // Get list of all files to scan
      const filesToScan = await this.getFilesToScan(codebasePath);

      this.log(`Found ${filesToScan.length} files to scan`);

      for (const filePath of filesToScan) {
        try {
          const fileIssues = await this.scanFile(filePath, ruleSet);
          issues.push(...fileIssues);
          scannedFiles.push(filePath);

          if (fileIssues.length > 0) {
            this.log(`Found ${fileIssues.length} issues in ${path.basename(filePath)}`);
          }
        } catch (error) {
          this.log(`Error scanning file ${filePath}: ${error.message}`, 'warn');
        }
      }

      return { type: 'codebase-scan', issues, scannedFiles };
    } catch (error) {
      this.log(`Codebase scan failed: ${error.message}`, 'error');
      return { type: 'codebase-scan', issues: [], scannedFiles: [] };
    }
  }

  async analyzeEntryPoints(codebasePath, entryPoints, ruleSet) {
    this.log('Analyzing entry points');

    const issues = [];

    if (!entryPoints || entryPoints.length === 0) {
      return { type: 'entry-point-analysis', issues };
    }

    for (const entryPoint of entryPoints) {
      try {
        const filePath = path.join(codebasePath, entryPoint.file);

        // Enhanced analysis for entry points
        const entryPointIssues = await this.scanFile(filePath, ruleSet, {
          isEntryPoint: true,
          severityMultiplier: 1.5 // Higher severity for entry points
        });

        // Add entry point context to issues
        entryPointIssues.forEach(issue => {
          issue.isEntryPoint = true;
          issue.entryPointType = entryPoint.type;
          issue.adjustedSeverity = this.adjustSeverityForEntryPoint(issue.severity);
        });

        issues.push(...entryPointIssues);

        this.log(`Entry point analysis of ${entryPoint.file}: ${entryPointIssues.length} issues`);
      } catch (error) {
        this.log(`Error analyzing entry point ${entryPoint.file}: ${error.message}`, 'warn');
      }
    }

    return { type: 'entry-point-analysis', issues };
  }

  async performDeepAnalysis(codebasePath, ruleSet) {
    this.log('Performing deep analysis');

    const issues = [];

    try {
      // Cross-file analysis
      const crossFileIssues = await this.performCrossFileAnalysis(codebasePath, ruleSet);
      issues.push(...crossFileIssues);

      // Configuration analysis
      const configIssues = await this.analyzeConfigurationFiles(codebasePath, ruleSet);
      issues.push(...configIssues);

      // Dependency analysis
      const dependencyIssues = await this.analyzeDependencies(codebasePath);
      issues.push(...dependencyIssues);

      return { type: 'deep-analysis', issues };
    } catch (error) {
      this.log(`Deep analysis failed: ${error.message}`, 'warn');
      return { type: 'deep-analysis', issues: [] };
    }
  }

  async getFilesToScan(codebasePath) {
    try {
      const result = await this.useTool('regex-search', 'searchFiles', {
        directory: codebasePath,
        pattern: '*',
        excludeDirectories: ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__'],
        fileExtensions: [
          '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cs',
          '.php', '.go', '.rs', '.rb', '.cpp', '.c', '.h'
        ]
      });

      // Handle the new result structure
      if (result && result.result && result.result.results) {
        return result.result.results.map(r => r.file);
      } else if (result && result.result) {
        return Array.isArray(result.result) ? result.result : [];
      }

      return [];
    } catch (error) {
      this.log(`Failed to get files to scan: ${error.message}`, 'warn');
      return [];
    }
  }

  async scanFile(filePath, ruleSet, options = {}) {
    const issues = [];

    try {
      // Check file size
      const stats = await fs.stat(filePath);
      if (stats.size > this.maxFileSizeForScan) {
        this.log(`Skipping large file: ${filePath} (${stats.size} bytes)`, 'warn');
        return issues;
      }

      // Read file content
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      this.scanResults.set(filePath, {
        size: stats.size,
        lines: lines.length,
        scannedAt: new Date().toISOString()
      });

      // Apply each rule to the file
      for (const rule of ruleSet) {
        try {
          const ruleIssues = await this.applyRuleToFile(
            filePath,
            content,
            lines,
            rule,
            options
          );

          issues.push(...ruleIssues);
        } catch (error) {
          this.log(`Error applying rule ${rule.type} to ${filePath}: ${error.message}`, 'warn');
        }
      }

      return issues;
    } catch (error) {
      this.log(`Error scanning file ${filePath}: ${error.message}`, 'warn');
      return issues;
    }
  }

  async applyRuleToFile(filePath, content, lines, rule, options = {}) {
    const issues = [];

    try {
      const matches = [...content.matchAll(rule.pattern)];

      for (const match of matches) {
        const lineNumber = this.getLineNumber(content, match.index);
        const lineContent = lines[lineNumber - 1];
        const contextLines = this.getContextLines(lines, lineNumber, 3);

        // Perform additional context checks
        const contextAnalysis = await this.analyzeContext(
          filePath,
          lineContent,
          contextLines,
          rule
        );

        const severity = options.severityMultiplier
          ? this.adjustSeverity(rule.severity, options.severityMultiplier)
          : rule.severity;

        const issue = {
          id: `${rule.type}_${filePath}_${lineNumber}_${Date.now()}`,
          ruleId: rule.id,
          type: rule.type,
          name: rule.name,
          description: rule.description,
          severity,
          category: rule.category,
          file: filePath,
          line: lineNumber,
          column: this.getColumnNumber(content, match.index),
          matchedText: match[0],
          lineContent: lineContent.trim(),
          contextLines,
          mitigation: rule.mitigation,
          confidence: this.calculateConfidence(contextAnalysis, rule),
          ...contextAnalysis,
          ...options
        };

        issues.push(issue);
      }

      return issues;
    } catch (error) {
      this.log(`Error applying rule ${rule.type}: ${error.message}`, 'warn');
      return [];
    }
  }

  async analyzeContext(filePath, lineContent, contextLines, rule) {
    const analysis = {
      hasValidation: false,
      hasSanitization: false,
      hasParameterization: false,
      hasErrorHandling: false,
      riskFactors: []
    };

    const contextContent = contextLines.join('\n').toLowerCase();

    // Check for security measures
    const validationPatterns = ['validate', 'check', 'verify', 'assert'];
    const sanitizationPatterns = ['sanitize', 'escape', 'encode', 'filter'];
    const parameterizationPatterns = ['prepare', 'param', 'placeholder', '\\?'];
    const errorHandlingPatterns = ['try', 'catch', 'except', 'error'];

    analysis.hasValidation = validationPatterns.some(p => contextContent.includes(p));
    analysis.hasSanitization = sanitizationPatterns.some(p => contextContent.includes(p));
    analysis.hasParameterization = parameterizationPatterns.some(p => contextContent.includes(p));
    analysis.hasErrorHandling = errorHandlingPatterns.some(p => contextContent.includes(p));

    // Identify risk factors
    const riskPatterns = [
      { pattern: 'user', factor: 'user-input' },
      { pattern: 'request', factor: 'external-input' },
      { pattern: 'url', factor: 'url-parameter' },
      { pattern: 'file', factor: 'file-operation' },
      { pattern: 'database', factor: 'database-operation' },
      { pattern: 'admin', factor: 'privileged-operation' }
    ];

    riskPatterns.forEach(({ pattern, factor }) => {
      if (contextContent.includes(pattern)) {
        analysis.riskFactors.push(factor);
      }
    });

    return analysis;
  }

  async performCrossFileAnalysis(codebasePath, ruleSet) {
    this.log('Performing cross-file analysis');

    const issues = [];

    try {
      // Look for patterns across multiple files
      const crossFilePatterns = [
        {
          type: 'hardcoded-secrets-spread',
          description: 'Same secret appears in multiple files',
          severity: 'critical'
        },
        {
          type: 'inconsistent-auth',
          description: 'Inconsistent authentication patterns',
          severity: 'medium'
        }
      ];

      for (const pattern of crossFilePatterns) {
        const crossFileIssues = await this.detectCrossFilePattern(codebasePath, pattern);
        issues.push(...crossFileIssues);
      }

      return issues;
    } catch (error) {
      this.log(`Cross-file analysis failed: ${error.message}`, 'warn');
      return [];
    }
  }

  async analyzeConfigurationFiles(codebasePath, ruleSet) {
    const configFiles = [
      'package.json',
      'web.config',
      'app.config',
      'settings.py',
      'application.properties',
      'docker-compose.yml',
      'Dockerfile'
    ];

    const issues = [];

    for (const configFile of configFiles) {
      try {
        const configPath = path.join(codebasePath, configFile);

        if (await fs.pathExists(configPath)) {
          const configIssues = await this.scanFile(configPath, ruleSet, {
            isConfiguration: true
          });

          issues.push(...configIssues);
        }
      } catch (error) {
        this.log(`Error analyzing config file ${configFile}: ${error.message}`, 'warn');
      }
    }

    return issues;
  }

  async analyzeDependencies(codebasePath) {
    const issues = [];

    try {
      // Analyze package.json for JavaScript projects
      const packageJsonPath = path.join(codebasePath, 'package.json');

      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJSON(packageJsonPath);
        const depIssues = this.checkDependencyVulnerabilities(packageJson);
        issues.push(...depIssues);
      }

      // Analyze requirements.txt for Python projects
      const requirementsPath = path.join(codebasePath, 'requirements.txt');

      if (await fs.pathExists(requirementsPath)) {
        const requirements = await fs.readFile(requirementsPath, 'utf-8');
        const pythonDepIssues = this.checkPythonDependencies(requirements);
        issues.push(...pythonDepIssues);
      }

      return issues;
    } catch (error) {
      this.log(`Dependency analysis failed: ${error.message}`, 'warn');
      return [];
    }
  }

  checkDependencyVulnerabilities(packageJson) {
    const issues = [];

    // Known vulnerable packages (simplified list)
    const vulnerablePackages = [
      'lodash',
      'moment',
      'debug',
      'request',
      'node-sass'
    ];

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    for (const [pkg, version] of Object.entries(allDeps || {})) {
      if (vulnerablePackages.includes(pkg)) {
        issues.push({
          id: `dep_${pkg}_${Date.now()}`,
          type: 'vulnerable-dependency',
          name: 'Potentially vulnerable dependency',
          description: `Package ${pkg} may have known vulnerabilities`,
          severity: 'medium',
          category: 'dependency',
          file: 'package.json',
          package: pkg,
          version,
          mitigation: `Update ${pkg} to latest secure version`
        });
      }
    }

    return issues;
  }

  checkPythonDependencies(requirements) {
    const issues = [];
    const lines = requirements.split('\n');

    lines.forEach((line, index) => {
      if (line.trim() && !line.startsWith('#')) {
        // Basic check for outdated syntax or patterns
        if (line.includes('==') && !line.includes('>')) {
          issues.push({
            id: `py_dep_${index}_${Date.now()}`,
            type: 'pinned-dependency',
            name: 'Pinned dependency version',
            description: 'Dependency pinned to specific version may miss security updates',
            severity: 'low',
            category: 'dependency',
            file: 'requirements.txt',
            line: index + 1,
            lineContent: line,
            mitigation: 'Consider using version ranges for security updates'
          });
        }
      }
    });

    return issues;
  }

  detectCrossFilePattern(codebasePath, pattern) {
    // Simplified cross-file analysis
    return [];
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  getColumnNumber(content, index) {
    const lines = content.substring(0, index).split('\n');
    return lines[lines.length - 1].length + 1;
  }

  getContextLines(lines, lineNumber, contextSize) {
    const start = Math.max(0, lineNumber - contextSize - 1);
    const end = Math.min(lines.length, lineNumber + contextSize);
    return lines.slice(start, end);
  }

  calculateConfidence(contextAnalysis, rule) {
    let confidence = 0.7; // Base confidence

    if (contextAnalysis.hasValidation) confidence -= 0.2;
    if (contextAnalysis.hasSanitization) confidence -= 0.2;
    if (contextAnalysis.hasParameterization) confidence -= 0.3;
    if (contextAnalysis.hasErrorHandling) confidence -= 0.1;

    // Risk factors increase confidence
    confidence += contextAnalysis.riskFactors.length * 0.1;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  adjustSeverity(severity, multiplier) {
    const severityLevels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = severityLevels.indexOf(severity);

    if (currentIndex === -1) return severity;

    const newIndex = Math.min(
      severityLevels.length - 1,
      Math.round(currentIndex * multiplier)
    );

    return severityLevels[newIndex];
  }

  adjustSeverityForEntryPoint(severity) {
    const severityMap = {
      low: 'medium',
      medium: 'high',
      high: 'critical',
      critical: 'critical'
    };

    return severityMap[severity] || severity;
  }

  consolidateIssues(results) {
    const allIssues = [];
    const issueIds = new Set();

    results.forEach(result => {
      if (result.issues && Array.isArray(result.issues)) {
        result.issues.forEach(issue => {
          // Remove duplicates based on type, file, and line
          const signature = `${issue.type}_${issue.file}_${issue.line}`;

          if (!issueIds.has(signature)) {
            issueIds.add(signature);
            allIssues.push(issue);
          }
        });
      }
    });

    // Sort by severity and confidence
    return allIssues.sort((a, b) => {
      const aSeverityWeight = this.severityWeights[a.severity] || 0;
      const bSeverityWeight = this.severityWeights[b.severity] || 0;

      if (aSeverityWeight !== bSeverityWeight) {
        return bSeverityWeight - aSeverityWeight;
      }

      return (b.confidence || 0) - (a.confidence || 0);
    });
  }

  categorizeIssuesBySeverity(issues) {
    return {
      critical: issues.filter(i => i.severity === 'critical'),
      high: issues.filter(i => i.severity === 'high'),
      medium: issues.filter(i => i.severity === 'medium'),
      low: issues.filter(i => i.severity === 'low')
    };
  }

  generateSecurityReport(issues, categorizedIssues) {
    const totalIssues = issues.length;
    const riskScore = this.calculateRiskScore(categorizedIssues);

    return {
      summary: {
        totalIssues,
        riskScore,
        riskLevel: this.getRiskLevel(riskScore),
        filesScanned: this.scanResults.size,
        scanDuration: Date.now() - this.getContext('scanStartTime')
      },
      breakdown: {
        critical: categorizedIssues.critical.length,
        high: categorizedIssues.high.length,
        medium: categorizedIssues.medium.length,
        low: categorizedIssues.low.length
      },
      topIssues: issues.slice(0, 10),
      recommendedActions: this.generateRecommendedActions(categorizedIssues),
      scanMetadata: {
        timestamp: new Date().toISOString(),
        agent: this.name,
        version: '1.0.0'
      }
    };
  }

  calculateRiskScore(categorizedIssues) {
    const weights = this.severityWeights;

    return (
      categorizedIssues.critical.length * weights.critical +
      categorizedIssues.high.length * weights.high +
      categorizedIssues.medium.length * weights.medium +
      categorizedIssues.low.length * weights.low
    );
  }

  getRiskLevel(riskScore) {
    if (riskScore >= 50) return 'Critical';
    if (riskScore >= 30) return 'High';
    if (riskScore >= 15) return 'Medium';
    return 'Low';
  }

  generateRecommendedActions(categorizedIssues) {
    const actions = [];

    if (categorizedIssues.critical.length > 0) {
      actions.push({
        priority: 'Immediate',
        action: `Address ${categorizedIssues.critical.length} critical security issues`,
        description: 'Critical vulnerabilities pose immediate threat to application security'
      });
    }

    if (categorizedIssues.high.length > 0) {
      actions.push({
        priority: 'High',
        action: `Fix ${categorizedIssues.high.length} high-severity issues`,
        description: 'High-severity issues should be addressed in the current development cycle'
      });
    }

    if (categorizedIssues.medium.length > 5) {
      actions.push({
        priority: 'Medium',
        action: 'Implement security review process',
        description: 'Multiple medium-severity issues indicate need for systematic security review'
      });
    }

    return actions;
  }
}