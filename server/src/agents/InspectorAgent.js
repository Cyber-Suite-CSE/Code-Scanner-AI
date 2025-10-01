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
    
    // Enhanced context analysis patterns
    this.contextPatterns = {
      validation: [
        /validate|check|verify|assert|test|confirm/i,
        /instanceof|typeof|isNaN|isFinite/i,
        /length\s*[><=]/i,
        /match|test|exec/i
      ],
      sanitization: [
        /sanitize|escape|encode|filter|clean/i,
        /htmlspecialchars|htmlentities/i,
        /encodeURI|encodeURIComponent/i,
        /replace|strip|trim/i
      ],
      parameterization: [
        /prepare|prepared|param|placeholder/i,
        /\$\d+|\?|\:[\w]+/i,
        /bind|execute.*\[/i,
        /query.*params/i
      ],
      errorHandling: [
        /try|catch|except|finally/i,
        /error|exception|throw/i,
        /on.*error|onerror/i
      ],
      authentication: [
        /auth|login|session|token|jwt/i,
        /password|credential|secret/i,
        /verify|authenticate|authorize/i
      ],
      encryption: [
        /encrypt|decrypt|hash|crypto/i,
        /bcrypt|scrypt|pbkdf2/i,
        /aes|rsa|sha/i
      ]
    };

    // Language-specific analysis enhancers
    this.languageAnalyzers = {
      javascript: {
        riskyFunctions: ['eval', 'setTimeout', 'setInterval', 'Function', 'innerHTML', 'outerHTML'],
        secureAlternatives: {
          'eval': 'JSON.parse() or Function constructor with validation',
          'innerHTML': 'textContent or createElement',
          'setTimeout': 'setTimeout with function reference'
        }
      },
      python: {
        riskyFunctions: ['eval', 'exec', 'compile', 'pickle.loads', 'yaml.load'],
        secureAlternatives: {
          'eval': 'ast.literal_eval() for safe evaluation',
          'pickle.loads': 'json.loads() for data serialization',
          'yaml.load': 'yaml.safe_load() for YAML parsing'
        }
      }
    };

    this.maxFileSizeForScan = 2 * 1024 * 1024; // 2MB
    this.maxLinesForDeepAnalysis = 1000;
  }

  async onInitialize() {
    this.log('Initializing Inspector Agent for code analysis');
    this.setContext('scanStartTime', Date.now());
  }

  async onExecute(input) {
    const { codebasePath, ruleSet, entryPoints } = input;

    if (!codebasePath || !ruleSet || !Array.isArray(ruleSet)) {
      throw new Error('Inspector Agent requires codebase path and valid rule set');
    }

    this.log(`Starting security scan with ${ruleSet.length} rules`);

    try {
      // Organize rules by language and category for efficient scanning
      this.log('Organizing security rules by language and category...');
      await this.addProcessingDelay(800);
      const organizedRules = this.organizeRules(ruleSet);
      
      // Get files to scan with language detection
      this.log('Scanning codebase and detecting file languages...');
      await this.addProcessingDelay(1200);
      const filesToScan = await this.getFilesToScanWithLanguages(codebasePath);
      
      // Execute targeted scanning based on organized rules
      this.log('Performing deep security analysis across multiple dimensions...');
      await this.addProcessingDelay(1500);
      const scanTasks = [
        () => this.performTargetedScan(filesToScan, organizedRules),
        () => this.analyzeEntryPointsEnhanced(codebasePath, entryPoints, organizedRules),
        () => this.performCrossFileAnalysis(codebasePath, organizedRules)
      ];

      const results = await this.parallel(scanTasks);
      
      // Enhanced issue consolidation and analysis
      this.log('Consolidating and analyzing discovered security issues...');
      await this.addProcessingDelay(1000);
      const consolidatedIssues = this.consolidateIssuesEnhanced(results.successful);
      
      this.log('Categorizing issues by severity and impact...');
      await this.addProcessingDelay(600);
      const categorizedIssues = this.categorizeIssuesBySeverity(consolidatedIssues);
      
      this.log('Generating comprehensive security analysis report...');
      await this.addProcessingDelay(900);
      const report = this.generateEnhancedSecurityReport(consolidatedIssues, categorizedIssues, organizedRules);

      const result = {
        issues: consolidatedIssues,
        categorizedIssues,
        report,
        statistics: {
          totalIssues: consolidatedIssues.length,
          criticalIssues: categorizedIssues.critical?.length || 0,
          highIssues: categorizedIssues.high?.length || 0,
          mediumIssues: categorizedIssues.medium?.length || 0,
          lowIssues: categorizedIssues.low?.length || 0,
          filesScanned: this.scanResults.size,
          rulesApplied: ruleSet.length,
          scanDuration: Date.now() - this.getContext('scanStartTime'),
          ruleEffectiveness: this.calculateRuleEffectiveness(consolidatedIssues, ruleSet)
        }
      };

      this.storeResult('issues', consolidatedIssues);
      this.storeResult('report', report);
      this.storeResult('statistics', result.statistics);

      this.log(`Security scan completed: ${consolidatedIssues.length} issues found`);

      return result;

    } catch (error) {
      this.log(`Inspector execution failed: ${error.message}`, 'error');
      throw error;
    }
  }

  organizeRules(ruleSet) {
    const organized = {
      byLanguage: {},
      byCategory: {},
      byFramework: {},
      byDatabase: {},
      universal: []
    };

    for (const rule of ruleSet) {
      // Organize by language
      if (rule.language) {
        if (!organized.byLanguage[rule.language]) {
          organized.byLanguage[rule.language] = [];
        }
        organized.byLanguage[rule.language].push(rule);
      }

      // Organize by category
      if (rule.category) {
        if (!organized.byCategory[rule.category]) {
          organized.byCategory[rule.category] = [];
        }
        organized.byCategory[rule.category].push(rule);
      }

      // Organize by framework
      if (rule.framework) {
        if (!organized.byFramework[rule.framework]) {
          organized.byFramework[rule.framework] = [];
        }
        organized.byFramework[rule.framework].push(rule);
      }

      // Organize by database
      if (rule.database) {
        if (!organized.byDatabase[rule.database]) {
          organized.byDatabase[rule.database] = [];
        }
        organized.byDatabase[rule.database].push(rule);
      }

      // Universal rules (no specific language/framework)
      if (!rule.language && !rule.framework && !rule.database) {
        organized.universal.push(rule);
      }
    }

    this.log(`Organized ${ruleSet.length} rules: ${Object.keys(organized.byLanguage).length} languages, ${Object.keys(organized.byCategory).length} categories`);
    
    return organized;
  }

  async getFilesToScanWithLanguages(codebasePath) {
    try {
      const result = await this.useTool('regex-search', 'searchFiles', {
        directory: codebasePath,
        pattern: '*',
        excludeDirectories: ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'target', 'vendor'],
        fileExtensions: [
          '.js', '.jsx', '.mjs', '.ts', '.tsx',
          '.py', '.pyw', '.pyx',
          '.java', '.class',
          '.cs', '.vb',
          '.php', '.phtml',
          '.go', '.mod',
          '.rs', '.toml',
          '.rb', '.rake',
          '.cpp', '.c', '.h', '.hpp',
          '.json', '.xml', '.yml', '.yaml',
          '.sql', '.config'
        ]
      });

      let files = [];
      if (result?.result?.results) {
        files = result.result.results.map(r => r.file);
      } else if (result?.result && Array.isArray(result.result)) {
        files = result.result;
      }

      // Enhance files with language detection
      const enhancedFiles = files.map(filePath => ({
        path: filePath,
        language: this.detectLanguageFromFile(filePath),
        extension: path.extname(filePath).toLowerCase(),
        priority: this.calculateFilePriority(filePath)
      }));

      // Sort by priority (critical files first)
      enhancedFiles.sort((a, b) => b.priority - a.priority);

      this.log(`Found ${enhancedFiles.length} files to scan across ${new Set(enhancedFiles.map(f => f.language)).size} languages`);
      
      return enhancedFiles;

    } catch (error) {
      this.log(`Failed to get files to scan: ${error.message}`, 'warn');
      return [];
    }
  }

  detectLanguageFromFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath).toLowerCase();

    const languageMap = {
      '.js': 'javascript',
      '.jsx': 'javascript', 
      '.mjs': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.pyw': 'python',
      '.pyx': 'python',
      '.java': 'java',
      '.cs': 'csharp',
      '.php': 'php',
      '.phtml': 'php',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c'
    };

    // Special file name patterns
    if (fileName.includes('docker')) return 'docker';
    if (fileName.includes('package.json')) return 'javascript';
    if (fileName.includes('requirements.txt')) return 'python';
    if (fileName.includes('cargo.toml')) return 'rust';
    if (fileName.includes('go.mod')) return 'go';

    return languageMap[ext] || 'unknown';
  }

  calculateFilePriority(filePath) {
    const fileName = path.basename(filePath).toLowerCase();
    let priority = 1;

    // High priority files
    if (fileName.includes('auth') || fileName.includes('login')) priority += 5;
    if (fileName.includes('admin') || fileName.includes('root')) priority += 4;
    if (fileName.includes('config') || fileName.includes('setting')) priority += 3;
    if (fileName.includes('api') || fileName.includes('service')) priority += 3;
    if (fileName.includes('main') || fileName.includes('index')) priority += 2;
    if (fileName.includes('server') || fileName.includes('app')) priority += 2;

    // Entry point indicators
    if (fileName === 'main.js' || fileName === 'app.js' || fileName === 'server.js') priority += 3;
    if (fileName === 'main.py' || fileName === 'app.py') priority += 3;

    return priority;
  }

  async performTargetedScan(filesToScan, organizedRules) {
    this.log('Starting targeted security scan');

    const issues = [];
    const scannedFiles = [];

    for (const fileInfo of filesToScan) {
      try {
        // Get applicable rules for this file
        const applicableRules = this.getApplicableRules(fileInfo, organizedRules);
        
        if (applicableRules.length === 0) {
          continue; // Skip files with no applicable rules
        }

        const fileIssues = await this.scanFileWithTargetedRules(fileInfo, applicableRules);
        issues.push(...fileIssues);
        scannedFiles.push(fileInfo.path);

        if (fileIssues.length > 0) {
          this.log(`Found ${fileIssues.length} issues in ${path.basename(fileInfo.path)}`);
        }

      } catch (error) {
        this.log(`Error scanning file ${fileInfo.path}: ${error.message}`, 'warn');
      }
    }

    return { type: 'targeted-scan', issues, scannedFiles };
  }

  getApplicableRules(fileInfo, organizedRules) {
    const applicableRules = [];

    // Add language-specific rules
    if (fileInfo.language && organizedRules.byLanguage[fileInfo.language]) {
      applicableRules.push(...organizedRules.byLanguage[fileInfo.language]);
    }

    // Add universal rules
    applicableRules.push(...organizedRules.universal);

    // Add framework-specific rules (detect from file content if needed)
    // This could be enhanced with actual framework detection

    return applicableRules;
  }

  async scanFileWithTargetedRules(fileInfo, rules) {
    const issues = [];

    try {
      // Check file size
      const stats = await fs.stat(fileInfo.path);
      if (stats.size > this.maxFileSizeForScan) {
        this.log(`Skipping large file: ${fileInfo.path} (${stats.size} bytes)`, 'warn');
        return issues;
      }

      // Read and prepare file content
      const content = await fs.readFile(fileInfo.path, 'utf-8');
      const lines = content.split('\n');

      this.scanResults.set(fileInfo.path, {
        size: stats.size,
        lines: lines.length,
        language: fileInfo.language,
        priority: fileInfo.priority,
        scannedAt: new Date().toISOString(),
        rulesApplied: rules.length
      });

      // Apply each applicable rule
      for (const rule of rules) {
        try {
          const ruleIssues = await this.applyRuleToFileEnhanced(
            fileInfo,
            content,
            lines,
            rule
          );

          issues.push(...ruleIssues);
        } catch (error) {
          this.log(`Error applying rule ${rule.type} to ${fileInfo.path}: ${error.message}`, 'warn');
        }
      }

      return issues;

    } catch (error) {
      this.log(`Error scanning file ${fileInfo.path}: ${error.message}`, 'warn');
      return issues;
    }
  }

  async applyRuleToFileEnhanced(fileInfo, content, lines, rule) {
    const issues = [];

    try {
      // Handle different pattern types (RegExp objects vs strings)
      let pattern = rule.pattern;
      if (typeof pattern === 'string') {
        pattern = new RegExp(pattern, 'gi');
      } else if (!(pattern instanceof RegExp)) {
        // Skip invalid patterns
        return issues;
      }

      const matches = [...content.matchAll(pattern)];

      for (const match of matches) {
        const lineNumber = this.getLineNumber(content, match.index);
        const lineContent = lines[lineNumber - 1];
        const contextLines = this.getContextLines(lines, lineNumber, 5);

        // Enhanced context analysis
        const contextAnalysis = await this.performEnhancedContextAnalysis(
          fileInfo,
          lineContent,
          contextLines,
          rule,
          content
        );

        // Calculate dynamic confidence based on context
        const confidence = this.calculateEnhancedConfidence(contextAnalysis, rule, fileInfo);

        // Skip low-confidence issues unless they're critical
        if (confidence < 0.3 && rule.severity !== 'critical') {
          continue;
        }

        // Use AI-adjusted severity if available
        let adjustedSeverity = rule.severity;
        if (contextAnalysis.aiAnalysis && contextAnalysis.aiAnalysis.adjustedSeverity) {
          adjustedSeverity = contextAnalysis.aiAnalysis.adjustedSeverity;
        }

        const issue = {
          id: `${rule.type}_${fileInfo.path}_${lineNumber}_${Date.now()}`,
          ruleId: rule.id,
          type: rule.type,
          name: rule.name,
          description: rule.description,
          severity: adjustedSeverity,
          originalSeverity: rule.severity,
          category: rule.category,
          file: fileInfo.path,
          language: fileInfo.language,
          line: lineNumber,
          column: this.getColumnNumber(content, match.index),
          matchedText: match[0],
          lineContent: lineContent.trim(),
          contextLines,
          mitigation: rule.mitigation,
          confidence,
          cwe: rule.cwe,
          owasp: rule.owasp,
          examples: rule.examples,
          evidence: rule.evidence,
          ...contextAnalysis,
          ruleSource: rule.source,
          detectedAt: new Date().toISOString(),
          // Add AI analysis results
          exploitability: contextAnalysis.aiAnalysis?.exploitability,
          businessImpact: contextAnalysis.aiAnalysis?.businessImpact,
          remediationPriority: contextAnalysis.aiAnalysis?.remediationPriority,
          aiRecommendations: contextAnalysis.aiAnalysis?.recommendations || []
        };

        issues.push(issue);
      }

      return issues;

    } catch (error) {
      this.log(`Error applying rule ${rule.type}: ${error.message}`, 'warn');
      return [];
    }
  }

  async performEnhancedContextAnalysis(fileInfo, lineContent, contextLines, rule, fullContent) {
    const analysis = {
      hasValidation: false,
      hasSanitization: false,
      hasParameterization: false,
      hasErrorHandling: false,
      hasAuthentication: false,
      hasEncryption: false,
      riskFactors: [],
      mitigatingFactors: [],
      codeQualityIndicators: [],
      aiAnalysis: null
    };

    const contextContent = contextLines.join('\n').toLowerCase();
    const surroundingContent = fullContent.toLowerCase();

    // Enhanced pattern matching for security measures
    for (const [category, patterns] of Object.entries(this.contextPatterns)) {
      const hasPattern = patterns.some(pattern => pattern.test(contextContent));
      
      switch (category) {
        case 'validation':
          analysis.hasValidation = hasPattern;
          if (hasPattern) analysis.mitigatingFactors.push('input-validation');
          break;
        case 'sanitization':
          analysis.hasSanitization = hasPattern;
          if (hasPattern) analysis.mitigatingFactors.push('data-sanitization');
          break;
        case 'parameterization':
          analysis.hasParameterization = hasPattern;
          if (hasPattern) analysis.mitigatingFactors.push('parameterized-queries');
          break;
        case 'errorHandling':
          analysis.hasErrorHandling = hasPattern;
          if (hasPattern) analysis.mitigatingFactors.push('error-handling');
          break;
        case 'authentication':
          analysis.hasAuthentication = hasPattern;
          if (hasPattern) analysis.mitigatingFactors.push('authentication');
          break;
        case 'encryption':
          analysis.hasEncryption = hasPattern;
          if (hasPattern) analysis.mitigatingFactors.push('encryption');
          break;
      }
    }

    // Use Anthropic AI for deeper context analysis on high-severity issues
    if (this.anthropicService && (rule.severity === 'critical' || rule.severity === 'high')) {
      try {
        this.log(`🤖 Running AI context analysis for ${rule.severity} severity ${rule.type} in ${path.basename(fileInfo.path)}`, 'info');
        const aiAnalysis = await this.performAIContextAnalysis(fileInfo, lineContent, contextLines, rule, analysis);
        analysis.aiAnalysis = aiAnalysis;
        
        // Enhance analysis with AI insights
        if (aiAnalysis.additionalRiskFactors) {
          analysis.riskFactors.push(...aiAnalysis.additionalRiskFactors);
        }
        if (aiAnalysis.additionalMitigatingFactors) {
          analysis.mitigatingFactors.push(...aiAnalysis.additionalMitigatingFactors);
        }
        this.log(`✅ AI analysis completed - confidence: ${aiAnalysis.confidenceScore}, severity: ${aiAnalysis.adjustedSeverity || rule.severity}`, 'info');
      } catch (error) {
        this.log(`❌ AI context analysis failed: ${error.message}`, 'warn');
      }
    } else if (this.anthropicService) {
      this.log(`ℹ️ Skipping AI analysis for ${rule.severity} severity issue (only critical/high get AI analysis)`, 'info');
    }

    // Identify risk factors
    const riskPatterns = [
      { pattern: /user|input|request|param/i, factor: 'user-input' },
      { pattern: /admin|root|super|elevated/i, factor: 'privileged-operation' },
      { pattern: /database|db|sql|query/i, factor: 'database-operation' },
      { pattern: /file|path|directory|upload/i, factor: 'file-operation' },
      { pattern: /network|http|url|api/i, factor: 'network-operation' },
      { pattern: /password|secret|key|token/i, factor: 'credential-handling' },
      { pattern: /eval|exec|system|shell/i, factor: 'code-execution' },
      { pattern: /cookie|session|auth/i, factor: 'session-management' }
    ];

    riskPatterns.forEach(({ pattern, factor }) => {
      if (pattern.test(contextContent)) {
        analysis.riskFactors.push(factor);
      }
    });

    // Analyze code quality indicators
    const qualityIndicators = [
      { pattern: /\/\*.*\*\/|\/\/|#/i, indicator: 'documented' },
      { pattern: /test|spec|describe|it\(/i, indicator: 'tested' },
      { pattern: /log|debug|trace/i, indicator: 'logged' },
      { pattern: /const|final|readonly/i, indicator: 'immutable' }
    ];

    qualityIndicators.forEach(({ pattern, indicator }) => {
      if (pattern.test(contextContent)) {
        analysis.codeQualityIndicators.push(indicator);
      }
    });

    // Language-specific analysis
    if (fileInfo.language && this.languageAnalyzers[fileInfo.language]) {
      const analyzer = this.languageAnalyzers[fileInfo.language];
      const riskyFunctionUsed = analyzer.riskyFunctions.some(func => 
        contextContent.includes(func.toLowerCase())
      );
      
      if (riskyFunctionUsed) {
        analysis.riskFactors.push('risky-function-usage');
      }
    }

    return analysis;
  }

  async performAIContextAnalysis(fileInfo, lineContent, contextLines, rule, basicAnalysis) {
    const prompt = `
Analyze this security vulnerability context for more accurate assessment:

**File:** ${path.basename(fileInfo.path)}
**Language:** ${fileInfo.language}
**Vulnerability Type:** ${rule.type}
**Severity:** ${rule.severity}
**Rule Description:** ${rule.description}

**Vulnerable Line:**
${lineContent}

**Context (surrounding code):**
\`\`\`${fileInfo.language}
${contextLines.join('\n')}
\`\`\`

**Current Analysis:**
- Has Validation: ${basicAnalysis.hasValidation}
- Has Sanitization: ${basicAnalysis.hasSanitization}
- Has Parameterization: ${basicAnalysis.hasParameterization}
- Has Error Handling: ${basicAnalysis.hasErrorHandling}
- Risk Factors: ${basicAnalysis.riskFactors.join(', ') || 'None detected'}
- Mitigating Factors: ${basicAnalysis.mitigatingFactors.join(', ') || 'None detected'}

Please provide:
1. **Confidence Assessment**: Rate the likelihood this is a true positive vulnerability (0.0-1.0)
2. **Severity Adjustment**: Should the severity be adjusted based on context? (keep/increase/decrease)
3. **Additional Risk Factors**: Any risk factors missed by pattern matching?
4. **Additional Mitigating Factors**: Any security measures missed by pattern matching?
5. **Exploitability**: How easily exploitable is this vulnerability in this context?
6. **Business Impact**: Potential business impact if exploited
7. **Remediation Priority**: Priority level (immediate/high/medium/low)

Provide response in JSON format:
{
  "confidenceScore": 0.0-1.0,
  "severityAdjustment": "keep|increase|decrease",
  "adjustedSeverity": "critical|high|medium|low",
  "additionalRiskFactors": ["factor1", "factor2"],
  "additionalMitigatingFactors": ["factor1", "factor2"],
  "exploitability": "trivial|easy|moderate|difficult",
  "businessImpact": "critical|high|medium|low",
  "remediationPriority": "immediate|high|medium|low",
  "explanation": "Brief explanation of the analysis",
  "recommendations": ["specific recommendation 1", "specific recommendation 2"]
}
`;

    try {
      const result = await this.analyzeWithAI(contextLines.join('\n'), prompt, {
        analysisType: 'vulnerability-context',
        fileType: fileInfo.language,
        vulnerabilityType: rule.type
      });

      // Parse AI response
      const aiResponse = this.parseAIResponse(result.analysis);
      return aiResponse;

    } catch (error) {
      this.log(`AI context analysis error: ${error.message}`, 'warn');
      return {
        confidenceScore: 0.7,
        severityAdjustment: 'keep',
        explanation: 'AI analysis unavailable, using pattern-based analysis'
      };
    }
  }

  parseAIResponse(aiText) {
    try {
      // Extract JSON from AI response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          confidenceScore: parsed.confidenceScore || 0.7,
          severityAdjustment: parsed.severityAdjustment || 'keep',
          adjustedSeverity: parsed.adjustedSeverity,
          additionalRiskFactors: parsed.additionalRiskFactors || [],
          additionalMitigatingFactors: parsed.additionalMitigatingFactors || [],
          exploitability: parsed.exploitability || 'moderate',
          businessImpact: parsed.businessImpact || 'medium',
          remediationPriority: parsed.remediationPriority || 'medium',
          explanation: parsed.explanation || '',
          recommendations: parsed.recommendations || []
        };
      }
    } catch (error) {
      this.log(`Failed to parse AI response: ${error.message}`, 'warn');
    }

    // Fallback response
    return {
      confidenceScore: 0.7,
      severityAdjustment: 'keep',
      explanation: 'Unable to parse AI analysis, using default assessment'
    };
  }

  calculateEnhancedConfidence(contextAnalysis, rule, fileInfo) {
    let confidence = 0.7; // Base confidence

    // Use AI confidence if available
    if (contextAnalysis.aiAnalysis && contextAnalysis.aiAnalysis.confidenceScore) {
      confidence = contextAnalysis.aiAnalysis.confidenceScore;
    } else {
      // Fallback to pattern-based confidence calculation
      
      // Reduce confidence for mitigating factors
      const mitigationReduction = {
        'input-validation': 0.3,
        'data-sanitization': 0.25,
        'parameterized-queries': 0.4,
        'error-handling': 0.1,
        'authentication': 0.2,
        'encryption': 0.15
      };

      contextAnalysis.mitigatingFactors.forEach(factor => {
        confidence -= mitigationReduction[factor] || 0.1;
      });

      // Increase confidence for risk factors
      confidence += contextAnalysis.riskFactors.length * 0.1;

      // Adjust based on file priority
      confidence += (fileInfo.priority - 1) * 0.05;

      // Rule-specific confidence adjustments
      if (rule.source === 'ai-enhanced') confidence += 0.1;
      if (rule.confidence) confidence = (confidence + rule.confidence) / 2;

      // Quality indicators slightly reduce confidence (better code practices)
      confidence -= contextAnalysis.codeQualityIndicators.length * 0.02;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  async analyzeEntryPointsEnhanced(codebasePath, entryPoints, organizedRules) {
    this.log('Analyzing entry points with enhanced detection');

    const issues = [];

    if (!entryPoints || entryPoints.length === 0) {
      return { type: 'entry-point-analysis', issues };
    }

    for (const entryPoint of entryPoints) {
      try {
        // Resolve entry point path
        let filePath;
        if (path.isAbsolute(entryPoint.file)) {
          filePath = entryPoint.file;
        } else {
          filePath = path.join(codebasePath, entryPoint.file);
        }

        // Check if file exists
        if (!await fs.pathExists(filePath)) {
          // Try to find the file in subdirectories
          const fileName = path.basename(entryPoint.file);
          const foundFiles = await this.findFileInDirectory(codebasePath, fileName);
          if (foundFiles.length > 0) {
            filePath = foundFiles[0];
          } else {
            this.log(`Entry point file not found: ${entryPoint.file}`, 'warn');
            continue;
          }
        }

        const fileInfo = {
          path: filePath,
          language: entryPoint.language || this.detectLanguageFromFile(filePath),
          priority: 10 // High priority for entry points
        };

        // Get applicable rules for entry point
        const applicableRules = this.getApplicableRules(fileInfo, organizedRules);

        // Enhanced analysis for entry points
        const entryPointIssues = await this.scanFileWithTargetedRules(fileInfo, applicableRules);

        // Enhance issues with entry point context
        entryPointIssues.forEach(issue => {
          issue.isEntryPoint = true;
          issue.entryPointType = entryPoint.type;
          issue.entryPointConfidence = entryPoint.confidence;
          
          // Increase severity for entry point issues
          issue.severity = this.adjustSeverityForEntryPoint(issue.severity);
          issue.confidence = Math.min(1.0, issue.confidence + 0.2);
        });

        issues.push(...entryPointIssues);

        this.log(`Entry point analysis of ${path.basename(entryPoint.file)}: ${entryPointIssues.length} issues`);

      } catch (error) {
        this.log(`Error analyzing entry point ${entryPoint.file}: ${error.message}`, 'warn');
      }
    }

    return { type: 'entry-point-analysis', issues };
  }

  async findFileInDirectory(directory, fileName) {
    const foundFiles = [];
    
    try {
      const result = await this.useTool('regex-search', 'searchFiles', {
        directory,
        pattern: fileName,
        exactMatch: true
      });

      if (result?.result?.results) {
        foundFiles.push(...result.result.results.map(r => r.file));
      } else if (result?.result && Array.isArray(result.result)) {
        foundFiles.push(...result.result);
      }
    } catch (error) {
      this.log(`Error finding file ${fileName}: ${error.message}`, 'warn');
    }

    return foundFiles;
  }

  async performCrossFileAnalysis(codebasePath, organizedRules) {
    this.log('Performing cross-file analysis');

    const issues = [];

    try {
      // Analyze configuration consistency
      const configIssues = await this.analyzeConfigurationConsistency(codebasePath, organizedRules);
      issues.push(...configIssues);

      // Analyze secret reuse across files
      const secretIssues = await this.analyzeSecretReuse(codebasePath, organizedRules);
      issues.push(...secretIssues);

      // Analyze authentication patterns
      const authIssues = await this.analyzeAuthenticationPatterns(codebasePath, organizedRules);
      issues.push(...authIssues);

      return { type: 'cross-file-analysis', issues };

    } catch (error) {
      this.log(`Cross-file analysis failed: ${error.message}`, 'warn');
      return { type: 'cross-file-analysis', issues: [] };
    }
  }

  async analyzeConfigurationConsistency(codebasePath, organizedRules) {
    const issues = [];
    
    // Look for configuration files
    const configFiles = [
      'package.json', 'requirements.txt', 'web.config', 'app.config',
      'docker-compose.yml', 'Dockerfile', '.env', 'config.json'
    ];

    for (const configFile of configFiles) {
      try {
        const configPath = path.join(codebasePath, configFile);
        
        if (await fs.pathExists(configPath)) {
          const fileInfo = {
            path: configPath,
            language: 'config',
            priority: 8
          };

          const applicableRules = organizedRules.universal.concat(
            organizedRules.byCategory.secrets || [],
            organizedRules.byCategory.configuration || []
          );

          const configIssues = await this.scanFileWithTargetedRules(fileInfo, applicableRules);
          
          configIssues.forEach(issue => {
            issue.isConfiguration = true;
            issue.configType = configFile;
          });

          issues.push(...configIssues);
        }
      } catch (error) {
        this.log(`Error analyzing config file ${configFile}: ${error.message}`, 'warn');
      }
    }

    return issues;
  }

  async analyzeSecretReuse(codebasePath, organizedRules) {
    const issues = [];
    const secretPatterns = new Map();

    // Extract secret-related rules
    const secretRules = organizedRules.byCategory.secrets || [];
    
    for (const rule of secretRules) {
      // This would require more sophisticated analysis
      // For now, we'll skip complex cross-file secret analysis
    }

    return issues;
  }

  async analyzeAuthenticationPatterns(codebasePath, organizedRules) {
    const issues = [];

    // Look for authentication-related files
    const authFiles = await this.findFileInDirectory(codebasePath, '*auth*');
    
    // Analyze authentication consistency across files
    // This would require more sophisticated analysis

    return issues;
  }

  consolidateIssuesEnhanced(results) {
    const allIssues = [];
    const issueSignatures = new Set();

    results.forEach(result => {
      if (result.issues && Array.isArray(result.issues)) {
        result.issues.forEach(issue => {
          // Enhanced deduplication
          const signature = `${issue.type}_${issue.file}_${issue.line}_${issue.matchedText}`;

          if (!issueSignatures.has(signature)) {
            issueSignatures.add(signature);
            allIssues.push(issue);
          } else {
            // Update existing issue with higher confidence if applicable
            const existingIssue = allIssues.find(i => 
              `${i.type}_${i.file}_${i.line}_${i.matchedText}` === signature
            );
            
            if (existingIssue && issue.confidence > existingIssue.confidence) {
              Object.assign(existingIssue, issue);
            }
          }
        });
      }
    });

    // Enhanced sorting by severity, confidence, and entry point status
    return allIssues.sort((a, b) => {
      // Entry points first
      if (a.isEntryPoint !== b.isEntryPoint) {
        return b.isEntryPoint - a.isEntryPoint;
      }

      // Then by severity
      const aSeverityWeight = this.severityWeights[a.severity] || 0;
      const bSeverityWeight = this.severityWeights[b.severity] || 0;

      if (aSeverityWeight !== bSeverityWeight) {
        return bSeverityWeight - aSeverityWeight;
      }

      // Then by confidence
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

  generateEnhancedSecurityReport(issues, categorizedIssues, organizedRules) {
    const totalIssues = issues.length;
    const riskScore = this.calculateRiskScore(categorizedIssues);
    const scanDuration = Date.now() - this.getContext('scanStartTime');

    return {
      summary: {
        totalIssues,
        riskScore,
        riskLevel: this.getRiskLevel(riskScore),
        filesScanned: this.scanResults.size,
        scanDuration,
        averageConfidence: this.calculateAverageConfidence(issues),
        entryPointIssues: issues.filter(i => i.isEntryPoint).length
      },
      breakdown: {
        critical: categorizedIssues.critical?.length || 0,
        high: categorizedIssues.high?.length || 0,
        medium: categorizedIssues.medium?.length || 0,
        low: categorizedIssues.low?.length || 0
      },
      languageBreakdown: this.getLanguageBreakdown(issues),
      categoryBreakdown: this.getCategoryBreakdown(issues),
      topIssues: issues.slice(0, 10),
      entryPointIssues: issues.filter(i => i.isEntryPoint).slice(0, 5),
      recommendedActions: this.generateEnhancedRecommendedActions(categorizedIssues, issues),
      ruleEffectiveness: this.calculateRuleEffectiveness(issues, Object.values(organizedRules).flat()),
      scanMetadata: {
        timestamp: new Date().toISOString(),
        agent: this.name,
        version: '2.0.0',
        rulesApplied: Object.values(organizedRules).flat().length,
        enhancedAnalysis: true
      }
    };
  }

  calculateAverageConfidence(issues) {
    if (issues.length === 0) return 0;
    const totalConfidence = issues.reduce((sum, issue) => sum + (issue.confidence || 0), 0);
    return Math.round((totalConfidence / issues.length) * 100) / 100;
  }

  getLanguageBreakdown(issues) {
    const breakdown = {};
    issues.forEach(issue => {
      const lang = issue.language || 'unknown';
      breakdown[lang] = (breakdown[lang] || 0) + 1;
    });
    return breakdown;
  }

  getCategoryBreakdown(issues) {
    const breakdown = {};
    issues.forEach(issue => {
      const category = issue.category || 'other';
      breakdown[category] = (breakdown[category] || 0) + 1;
    });
    return breakdown;
  }

  calculateRuleEffectiveness(issues, rules) {
    const ruleStats = {};
    
    rules.forEach(rule => {
      ruleStats[rule.id] = {
        applied: 0,
        issuesFound: 0,
        effectiveness: 0
      };
    });

    issues.forEach(issue => {
      if (issue.ruleId && ruleStats[issue.ruleId]) {
        ruleStats[issue.ruleId].issuesFound++;
      }
    });

    // Calculate effectiveness
    Object.keys(ruleStats).forEach(ruleId => {
      const stats = ruleStats[ruleId];
      stats.applied = 1; // Simplified - all rules are considered applied
      stats.effectiveness = stats.issuesFound > 0 ? stats.issuesFound / stats.applied : 0;
    });

    return ruleStats;
  }

  generateEnhancedRecommendedActions(categorizedIssues, allIssues) {
    const actions = [];

    if (categorizedIssues.critical?.length > 0) {
      actions.push({
        priority: 'Immediate',
        action: `Address ${categorizedIssues.critical.length} critical security vulnerabilities`,
        description: 'Critical vulnerabilities pose immediate threat to application security',
        timeframe: '24-48 hours',
        issues: categorizedIssues.critical.slice(0, 3).map(i => ({
          type: i.type,
          file: path.basename(i.file),
          line: i.line
        }))
      });
    }

    if (categorizedIssues.high?.length > 0) {
      actions.push({
        priority: 'High',
        action: `Fix ${categorizedIssues.high.length} high-severity vulnerabilities`,
        description: 'High-severity issues should be addressed in current development cycle',
        timeframe: '1-2 weeks',
        issues: categorizedIssues.high.slice(0, 5).map(i => ({
          type: i.type,
          file: path.basename(i.file),
          line: i.line
        }))
      });
    }

    const entryPointIssues = allIssues.filter(i => i.isEntryPoint);
    if (entryPointIssues.length > 0) {
      actions.push({
        priority: 'High',
        action: `Secure ${entryPointIssues.length} entry point vulnerabilities`,
        description: 'Entry point vulnerabilities are easily exploitable and should be prioritized',
        timeframe: '3-5 days',
        issues: entryPointIssues.slice(0, 3).map(i => ({
          type: i.type,
          file: path.basename(i.file),
          entryPointType: i.entryPointType
        }))
      });
    }

    if (categorizedIssues.medium?.length > 5) {
      actions.push({
        priority: 'Medium',
        action: 'Implement systematic security review process',
        description: 'Multiple medium-severity issues indicate need for comprehensive security practices',
        timeframe: '2-4 weeks'
      });
    }

    return actions;
  }

  // Helper methods (keeping existing implementations)
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

  adjustSeverityForEntryPoint(severity) {
    const severityMap = {
      low: 'medium',
      medium: 'high',
      high: 'critical',
      critical: 'critical'
    };

    return severityMap[severity] || severity;
  }

  calculateRiskScore(categorizedIssues) {
    const weights = this.severityWeights;

    return (
      (categorizedIssues.critical?.length || 0) * weights.critical +
      (categorizedIssues.high?.length || 0) * weights.high +
      (categorizedIssues.medium?.length || 0) * weights.medium +
      (categorizedIssues.low?.length || 0) * weights.low
    );
  }

  getRiskLevel(riskScore) {
    if (riskScore >= 50) return 'Critical';
    if (riskScore >= 30) return 'High';
    if (riskScore >= 15) return 'Medium';
    return 'Low';
  }
}
