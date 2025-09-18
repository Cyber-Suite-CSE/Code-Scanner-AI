import { BaseAgent } from '../core/BaseAgent.js';
import fs from 'fs-extra';

export class ForgeAgent extends BaseAgent {
  constructor(toolRegistry, anthropicService, options = {}) {
    super('Forge', toolRegistry, anthropicService, options);
    this.suggestionTemplates = new Map();
    this.educationalContent = new Map();
    this.codePatterns = {
      javascript: {
        'sql-injection': {
          vulnerable: 'query = "SELECT * FROM users WHERE id = " + userId;',
          secure: 'query = "SELECT * FROM users WHERE id = ?"; db.query(query, [userId]);',
          explanation: 'Use parameterized queries to prevent SQL injection'
        },
        'xss-prevention': {
          vulnerable: 'element.innerHTML = userInput;',
          secure: 'element.textContent = userInput;',
          explanation: 'Use textContent instead of innerHTML for user input'
        }
      },
      python: {
        'sql-injection': {
          vulnerable: 'cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")',
          secure: 'cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))',
          explanation: 'Use parameterized queries instead of string formatting'
        },
        'command-injection': {
          vulnerable: 'os.system(f"ls {user_dir}")',
          secure: 'subprocess.run(["ls", user_dir], check=True)',
          explanation: 'Use subprocess with argument lists instead of shell commands'
        }
      }
    };
  }

  async onInitialize() {
    this.log('Initializing Forge Agent for secure code suggestions');
    await this.loadSuggestionTemplates();
  }

  async onExecute(input) {
    const { issues, techStacks } = input;

    if (!issues || !Array.isArray(issues)) {
      throw new Error('Forge Agent requires security issues from Inspector Agent');
    }

    this.log(`Generating secure code suggestions for ${issues.length} issues`);

    const suggestionTasks = [
      () => this.generateCodeSuggestions(issues, techStacks),
      () => this.createConfigurationFixes(issues),
      () => this.generateEducationalContent(issues),
      () => this.provideBestPractices(issues, techStacks)
    ];

    const results = await this.parallel(suggestionTasks);
    const suggestions = this.consolidateSuggestions(results.successful);
    const educationalMaterial = this.generateEducationalMaterial(issues, suggestions);

    const result = {
      suggestions,
      educationalMaterial,
      statistics: {
        totalSuggestions: suggestions.length,
        issuesWithSuggestions: suggestions.filter(s => s.codeSuggestion).length,
        configurationFixes: suggestions.filter(s => s.configurationType).length,
        educationalTopics: educationalMaterial.topics.length
      },
      summary: this.generateSummary(suggestions, issues)
    };

    this.storeResult('suggestions', suggestions);
    this.storeResult('educationalMaterial', educationalMaterial);

    this.log(`Generated ${suggestions.length} secure code suggestions`);

    return result;
  }

  async loadSuggestionTemplates() {
    try {
      // Load from file if exists, otherwise use defaults
      const templatePath = './config/suggestion-templates.json';

      if (await fs.pathExists(templatePath)) {
        const templates = await fs.readJSON(templatePath);
        this.suggestionTemplates = new Map(Object.entries(templates));
      } else {
        this.initializeDefaultTemplates();
      }

      this.log('Suggestion templates loaded');
    } catch (error) {
      this.log(`Failed to load suggestion templates: ${error.message}`, 'warn');
      this.initializeDefaultTemplates();
    }
  }

  initializeDefaultTemplates() {
    this.suggestionTemplates.set('sql-injection', {
      title: 'Fix SQL Injection Vulnerability',
      priority: 'critical',
      steps: [
        'Replace string concatenation with parameterized queries',
        'Validate and sanitize all user inputs',
        'Implement proper error handling',
        'Use ORM or query builder with built-in protection'
      ]
    });

    this.suggestionTemplates.set('xss-prevention', {
      title: 'Prevent Cross-Site Scripting (XSS)',
      priority: 'high',
      steps: [
        'Encode all user data before rendering',
        'Use safe DOM manipulation methods',
        'Implement Content Security Policy (CSP)',
        'Validate input on both client and server'
      ]
    });
  }

  async generateCodeSuggestions(issues, techStacks) {
    this.log('Generating code suggestions');

    const suggestions = [];

    for (const issue of issues) {
      try {
        const suggestion = await this.createCodeSuggestion(issue, techStacks);

        if (suggestion) {
          suggestions.push(suggestion);
        }
      } catch (error) {
        this.log(`Failed to generate suggestion for issue ${issue.id}: ${error.message}`, 'warn');
      }
    }

    return { type: 'code-suggestions', suggestions };
  }

  async createCodeSuggestion(issue, techStacks) {
    const language = this.detectLanguageFromFile(issue.file);
    const framework = this.detectFrameworkFromTechStacks(techStacks, language);

    const suggestion = {
      issueId: issue.id,
      type: 'code-suggestion',
      language,
      framework,
      severity: issue.severity,
      title: `Fix ${issue.name}`,
      description: await this.generateSuggestionDescription(issue),
      codeSuggestion: await this.generateSecureCodeExample(issue, language),
      rationale: this.generateRationale(issue),
      implementationSteps: this.generateImplementationSteps(issue),
      testingGuidance: this.generateTestingGuidance(issue),
      additionalResources: await this.getAdditionalResources(issue.type),
      riskReduction: this.calculateRiskReduction(issue)
    };

    return suggestion;
  }

  async generateSecureCodeExample(issue, language) {
    const patterns = this.codePatterns[language];

    if (patterns && patterns[issue.type]) {
      const pattern = patterns[issue.type];

      return {
        original: issue.lineContent,
        vulnerable: pattern.vulnerable,
        secure: pattern.secure,
        explanation: pattern.explanation,
        diff: this.generateCodeDiff(issue.lineContent, pattern.secure)
      };
    }

    // Generate generic suggestion based on issue type
    return this.generateGenericCodeSuggestion(issue, language);
  }

  generateGenericCodeSuggestion(issue, language) {
    const suggestions = {
      'hardcoded-secret': {
        secure: this.generateEnvironmentVariableSuggestion(issue.matchedText, language),
        explanation: 'Move sensitive data to environment variables or secure configuration'
      },
      'eval-usage': {
        secure: this.generateSafeAlternativeToEval(issue.matchedText, language),
        explanation: 'Replace eval() with safer alternatives like JSON.parse() or Function constructor'
      },
      'path-traversal': {
        secure: this.generateSafePathHandling(issue.matchedText, language),
        explanation: 'Validate and sanitize file paths to prevent directory traversal'
      }
    };

    const suggestion = suggestions[issue.type];

    if (suggestion) {
      return {
        original: issue.lineContent,
        secure: suggestion.secure,
        explanation: suggestion.explanation,
        diff: this.generateCodeDiff(issue.lineContent, suggestion.secure)
      };
    }

    return null;
  }

  generateEnvironmentVariableSuggestion(matchedText, language) {
    const envVarName = this.extractVariableName(matchedText);

    const suggestions = {
      javascript: `const ${envVarName} = process.env.${envVarName.toUpperCase()};`,
      python: `${envVarName} = os.environ.get('${envVarName.upper()}')`,
      java: `String ${envVarName} = System.getenv("${envVarName.toUpperCase()}");`,
      csharp: `string ${envVarName} = Environment.GetEnvironmentVariable("${envVarName.ToUpper()}");`
    };

    return suggestions[language] || `// Move ${envVarName} to environment variable`;
  }

  generateSafeAlternativeToEval(matchedText, language) {
    if (language === 'javascript') {
      if (matchedText.includes('JSON') || matchedText.includes('{')) {
        return 'JSON.parse(sanitizedInput)';
      }
      return 'new Function("return " + sanitizedInput)()';
    }

    return `// Replace eval with safe parsing for ${language}`;
  }

  generateSafePathHandling(matchedText, language) {
    const suggestions = {
      javascript: 'path.join(baseDir, path.normalize(userPath))',
      python: 'os.path.join(base_dir, os.path.normpath(user_path))',
      java: 'Paths.get(baseDir, userPath).normalize()',
      csharp: 'Path.Combine(baseDir, Path.GetFileName(userPath))'
    };

    return suggestions[language] || '// Implement safe path handling';
  }

  async createConfigurationFixes(issues) {
    this.log('Creating configuration fixes');

    const configFixes = [];

    const configIssues = issues.filter(issue => issue.isConfiguration);

    for (const issue of configIssues) {
      try {
        const fix = await this.generateConfigurationFix(issue);

        if (fix) {
          configFixes.push(fix);
        }
      } catch (error) {
        this.log(`Failed to generate config fix for ${issue.id}: ${error.message}`, 'warn');
      }
    }

    return { type: 'configuration-fixes', suggestions: configFixes };
  }

  async generateConfigurationFix(issue) {
    const configurationType = this.detectConfigurationType(issue.file);

    const fix = {
      issueId: issue.id,
      type: 'configuration-fix',
      configurationType,
      title: `Fix ${issue.name} in configuration`,
      description: `Update ${issue.file} to address ${issue.type}`,
      configurationChanges: this.generateConfigChanges(issue, configurationType),
      explanation: this.generateConfigurationExplanation(issue),
      validationSteps: this.generateConfigValidationSteps(configurationType)
    };

    return fix;
  }

  generateConfigChanges(issue, configurationType) {
    const changes = {
      'package.json': {
        'vulnerable-dependency': {
          action: 'update',
          field: 'dependencies',
          change: `Update ${issue.package} to latest secure version`
        }
      },
      'docker': {
        'privilege-escalation': {
          action: 'add',
          field: 'USER',
          change: 'USER non-root-user'
        }
      },
      'web.config': {
        'information-disclosure': {
          action: 'add',
          field: 'httpErrors',
          change: '<httpErrors errorMode="Custom" />'
        }
      }
    };

    return changes[configurationType]?.[issue.type] || {
      action: 'manual',
      change: 'Review and update configuration manually'
    };
  }

  async generateEducationalContent(issues) {
    this.log('Generating educational content');

    const content = [];

    const uniqueIssueTypes = [...new Set(issues.map(issue => issue.type))];

    for (const issueType of uniqueIssueTypes) {
      try {
        const educational = await this.createEducationalContent(issueType, issues);
        content.push(educational);
      } catch (error) {
        this.log(`Failed to generate educational content for ${issueType}: ${error.message}`, 'warn');
      }
    }

    return { type: 'educational-content', content };
  }

  async createEducationalContent(issueType, relatedIssues) {
    const issueCount = relatedIssues.filter(issue => issue.type === issueType).length;

    const content = {
      topic: issueType,
      title: this.getEducationalTitle(issueType),
      occurrences: issueCount,
      severity: this.getHighestSeverity(relatedIssues.filter(i => i.type === issueType)),
      explanation: await this.generateDetailedExplanation(issueType),
      examples: this.getVulnerabilityExamples(issueType),
      prevention: this.getPreventionStrategies(issueType),
      tools: this.getRecommendedTools(issueType),
      references: await this.getExternalReferences(issueType)
    };

    return content;
  }

  async provideBestPractices(issues, techStacks) {
    this.log('Providing security best practices');

    const practices = [];

    // General security practices
    practices.push(...this.getGeneralSecurityPractices());

    // Language-specific practices
    for (const stack of techStacks) {
      practices.push(...this.getLanguageSpecificPractices(stack.language));

      for (const framework of stack.frameworks) {
        practices.push(...this.getFrameworkSpecificPractices(framework.name));
      }
    }

    return { type: 'best-practices', practices };
  }

  getGeneralSecurityPractices() {
    return [
      {
        category: 'Input Validation',
        title: 'Validate All Input',
        description: 'Never trust user input. Validate, sanitize, and encode all data.',
        implementation: 'Implement input validation at application boundaries',
        priority: 'high'
      },
      {
        category: 'Authentication',
        title: 'Strong Authentication',
        description: 'Use multi-factor authentication and strong password policies.',
        implementation: 'Implement MFA and password complexity requirements',
        priority: 'high'
      },
      {
        category: 'Secrets Management',
        title: 'Secure Secrets',
        description: 'Never hardcode secrets. Use secure storage and rotation.',
        implementation: 'Use environment variables and secret management services',
        priority: 'critical'
      }
    ];
  }

  getLanguageSpecificPractices(language) {
    const practices = {
      javascript: [
        {
          category: 'XSS Prevention',
          title: 'Safe DOM Manipulation',
          description: 'Use textContent instead of innerHTML for user data',
          implementation: 'Replace innerHTML with textContent for user input'
        }
      ],
      python: [
        {
          category: 'SQL Security',
          title: 'Parameterized Queries',
          description: 'Always use parameterized queries for database operations',
          implementation: 'Use cursor.execute with parameter tuples'
        }
      ]
    };

    return practices[language] || [];
  }

  getFrameworkSpecificPractices(framework) {
    const practices = {
      express: [
        {
          category: 'Middleware Security',
          title: 'Security Middleware',
          description: 'Use helmet.js and other security middleware',
          implementation: 'Install and configure helmet, cors, and rate limiting'
        }
      ],
      react: [
        {
          category: 'State Security',
          title: 'Secure State Management',
          description: 'Avoid storing sensitive data in component state',
          implementation: 'Use secure storage for sensitive information'
        }
      ]
    };

    return practices[framework] || [];
  }

  consolidateSuggestions(results) {
    const allSuggestions = [];

    results.forEach(result => {
      if (result.suggestions && Array.isArray(result.suggestions)) {
        allSuggestions.push(...result.suggestions);
      } else if (result.content && Array.isArray(result.content)) {
        allSuggestions.push(...result.content);
      } else if (result.practices && Array.isArray(result.practices)) {
        allSuggestions.push(...result.practices.map(p => ({
          ...p,
          type: 'best-practice'
        })));
      }
    });

    // Sort by severity and type
    return allSuggestions.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };

      const aSeverity = severityOrder[a.severity] || 0;
      const bSeverity = severityOrder[b.severity] || 0;

      if (aSeverity !== bSeverity) {
        return bSeverity - aSeverity;
      }

      return a.type.localeCompare(b.type);
    });
  }

  generateEducationalMaterial(issues, suggestions) {
    const topics = [...new Set(issues.map(issue => issue.type))];
    const severityDistribution = this.calculateSeverityDistribution(issues);

    return {
      overview: {
        totalIssues: issues.length,
        uniqueVulnerabilityTypes: topics.length,
        severityDistribution
      },
      topics: topics.map(topic => ({
        name: topic,
        description: this.getEducationalTitle(topic),
        issueCount: issues.filter(i => i.type === topic).length,
        relatedSuggestions: suggestions.filter(s => s.issueId &&
          issues.find(i => i.id === s.issueId && i.type === topic))
      })),
      learningPath: this.generateLearningPath(topics),
      resources: this.generateResourcesList(topics)
    };
  }

  generateLearningPath(topics) {
    const criticalTopics = topics.filter(topic =>
      ['sql-injection', 'xss-prevention', 'hardcoded-secret'].includes(topic)
    );

    return [
      {
        level: 'Foundation',
        topics: ['input-validation', 'output-encoding'],
        description: 'Learn fundamental security principles'
      },
      {
        level: 'Critical Vulnerabilities',
        topics: criticalTopics,
        description: 'Address the most dangerous vulnerabilities first'
      },
      {
        level: 'Advanced Security',
        topics: topics.filter(t => !criticalTopics.includes(t)),
        description: 'Implement comprehensive security measures'
      }
    ];
  }

  generateResourcesList(topics) {
    return [
      {
        title: 'OWASP Top 10',
        url: 'https://owasp.org/www-project-top-ten/',
        description: 'Most critical web application security risks'
      },
      {
        title: 'Secure Coding Practices',
        url: 'https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/',
        description: 'Quick reference for secure coding'
      },
      {
        title: 'Security Testing Guide',
        url: 'https://owasp.org/www-project-web-security-testing-guide/',
        description: 'Comprehensive security testing methodology'
      }
    ];
  }

  generateSummary(suggestions, issues) {
    const criticalFixes = suggestions.filter(s => s.severity === 'critical').length;
    const highPriorityFixes = suggestions.filter(s => s.severity === 'high').length;

    return {
      totalSuggestions: suggestions.length,
      criticalFixes,
      highPriorityFixes,
      implementationEffort: this.estimateImplementationEffort(suggestions),
      expectedRiskReduction: this.calculateExpectedRiskReduction(suggestions),
      nextSteps: this.generateNextSteps(criticalFixes, highPriorityFixes)
    };
  }

  // Helper methods
  detectLanguageFromFile(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    const langMap = {
      'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
      'py': 'python', 'java': 'java', 'cs': 'csharp', 'php': 'php',
      'go': 'go', 'rs': 'rust', 'rb': 'ruby'
    };
    return langMap[ext] || 'unknown';
  }

  detectFrameworkFromTechStacks(techStacks, language) {
    const stack = techStacks.find(s => s.language === language);
    return stack && stack.frameworks.length > 0 ? stack.frameworks[0].name : null;
  }

  detectConfigurationType(filePath) {
    if (filePath.includes('package.json')) return 'package.json';
    if (filePath.includes('Dockerfile')) return 'docker';
    if (filePath.includes('web.config')) return 'web.config';
    if (filePath.includes('.env')) return 'environment';
    return 'unknown';
  }

  extractVariableName(text) {
    const match = text.match(/(\w+)\s*=/);
    return match ? match[1] : 'secretValue';
  }

  generateCodeDiff(original, suggested) {
    return {
      original: original.trim(),
      suggested: suggested.trim(),
      changes: [{
        type: 'replacement',
        line: 1,
        old: original.trim(),
        new: suggested.trim()
      }]
    };
  }

  getHighestSeverity(issues) {
    const severityOrder = ['critical', 'high', 'medium', 'low'];
    for (const severity of severityOrder) {
      if (issues.some(issue => issue.severity === severity)) {
        return severity;
      }
    }
    return 'low';
  }

  calculateSeverityDistribution(issues) {
    const distribution = { critical: 0, high: 0, medium: 0, low: 0 };
    issues.forEach(issue => {
      if (distribution.hasOwnProperty(issue.severity)) {
        distribution[issue.severity]++;
      }
    });
    return distribution;
  }

  calculateExpectedRiskReduction(suggestions) {
    const reductionValues = { critical: 0.8, high: 0.6, medium: 0.4, low: 0.2 };
    return suggestions.reduce((total, suggestion) => {
      return total + (reductionValues[suggestion.severity] || 0.1);
    }, 0);
  }

  estimateImplementationEffort(suggestions) {
    const effortValues = {
      'code-suggestion': 2,
      'configuration-fix': 1,
      'best-practice': 3
    };

    const totalHours = suggestions.reduce((total, suggestion) => {
      return total + (effortValues[suggestion.type] || 2);
    }, 0);

    return {
      totalHours,
      estimatedDays: Math.ceil(totalHours / 8),
      effort: totalHours < 8 ? 'Low' : totalHours < 24 ? 'Medium' : 'High'
    };
  }

  generateNextSteps(criticalFixes, highPriorityFixes) {
    const steps = [];

    if (criticalFixes > 0) {
      steps.push({
        priority: 1,
        action: 'Address Critical Security Issues',
        description: `Immediately fix ${criticalFixes} critical vulnerabilities`,
        timeframe: 'This week'
      });
    }

    if (highPriorityFixes > 0) {
      steps.push({
        priority: 2,
        action: 'Fix High Priority Issues',
        description: `Address ${highPriorityFixes} high-severity issues`,
        timeframe: 'Next 2 weeks'
      });
    }

    steps.push({
      priority: 3,
      action: 'Implement Security Review Process',
      description: 'Establish ongoing security review practices',
      timeframe: 'Next month'
    });

    return steps;
  }

  // Educational content generators
  getEducationalTitle(issueType) {
    const titles = {
      'sql-injection': 'Understanding SQL Injection Attacks',
      'xss-prevention': 'Cross-Site Scripting (XSS) Prevention',
      'hardcoded-secret': 'Secure Secrets Management',
      'eval-usage': 'Dangers of Dynamic Code Execution',
      'path-traversal': 'Directory Traversal Attack Prevention'
    };

    return titles[issueType] || `Security Issue: ${issueType}`;
  }

  async generateDetailedExplanation(issueType) {
    // This would ideally use the context7 tool to get detailed explanations
    const explanations = {
      'sql-injection': 'SQL injection occurs when untrusted data is sent to an interpreter as part of a command or query. The attacker\'s hostile data can trick the interpreter into executing unintended commands or accessing data without proper authorization.',
      'xss-prevention': 'Cross-Site Scripting (XSS) attacks occur when an application includes untrusted data in a web page without proper validation or escaping. XSS allows attackers to execute scripts in the victim\'s browser which can hijack user sessions, deface web sites, or redirect the user to malicious sites.',
      'hardcoded-secret': 'Hardcoded secrets in source code pose a significant security risk. Anyone with access to the code repository can potentially access sensitive systems using these credentials.'
    };

    return explanations[issueType] || `Security vulnerability of type: ${issueType}`;
  }

  getVulnerabilityExamples(issueType) {
    return [{
      title: `Example of ${issueType}`,
      vulnerable: 'Vulnerable code pattern...',
      secure: 'Secure implementation...',
      explanation: 'Why this is secure...'
    }];
  }

  getPreventionStrategies(issueType) {
    const strategies = {
      'sql-injection': [
        'Use parameterized queries',
        'Implement input validation',
        'Use stored procedures',
        'Apply principle of least privilege'
      ],
      'xss-prevention': [
        'Encode all output',
        'Validate input',
        'Use Content Security Policy',
        'Sanitize HTML input'
      ]
    };

    return strategies[issueType] || ['Follow secure coding practices'];
  }

  getRecommendedTools(issueType) {
    return [
      'Static Analysis Security Testing (SAST) tools',
      'Dynamic Application Security Testing (DAST) tools',
      'Linting tools with security rules'
    ];
  }

  async getExternalReferences(issueType) {
    return [
      {
        title: `OWASP Guide on ${issueType}`,
        url: `https://owasp.org/`,
        description: 'Comprehensive security guidance'
      }
    ];
  }

  async generateSuggestionDescription(issue) {
    return `Address the ${issue.severity} severity ${issue.type} vulnerability found in ${issue.file} at line ${issue.line}`;
  }

  generateRationale(issue) {
    return `This ${issue.type} vulnerability poses a ${issue.severity} risk to application security. ${issue.description}`;
  }

  generateImplementationSteps(issue) {
    return [
      `Review the vulnerable code in ${issue.file}:${issue.line}`,
      'Apply the suggested secure code pattern',
      'Test the implementation thoroughly',
      'Review similar patterns throughout the codebase'
    ];
  }

  generateTestingGuidance(issue) {
    return {
      unitTests: 'Write unit tests to verify the fix',
      integrationTests: 'Test the fix in integration environment',
      securityTests: 'Perform security testing to validate the fix',
      manualTesting: 'Manually verify the vulnerability is resolved'
    };
  }

  async getAdditionalResources(issueType) {
    return [
      {
        type: 'documentation',
        title: `Secure coding guidelines for ${issueType}`,
        url: '#'
      },
      {
        type: 'tool',
        title: 'Recommended security scanner',
        url: '#'
      }
    ];
  }

  calculateRiskReduction(issue) {
    const reductionMap = {
      critical: 0.9,
      high: 0.7,
      medium: 0.5,
      low: 0.3
    };

    return {
      percentage: (reductionMap[issue.severity] || 0.5) * 100,
      description: `Fixing this issue will significantly reduce security risk`
    };
  }

  generateConfigurationExplanation(issue) {
    return `Configuration change required to address ${issue.type} in ${issue.file}`;
  }

  generateConfigValidationSteps(configurationType) {
    const steps = {
      'package.json': ['Run npm audit', 'Test application functionality'],
      'docker': ['Rebuild container', 'Test container security'],
      'web.config': ['Validate XML syntax', 'Test web application']
    };

    return steps[configurationType] || ['Validate configuration', 'Test application'];
  }
}