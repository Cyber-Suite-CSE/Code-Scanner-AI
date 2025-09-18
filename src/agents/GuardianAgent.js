import { BaseAgent } from '../core/BaseAgent.js';
import fs from 'fs-extra';

export class GuardianAgent extends BaseAgent {
  constructor(toolRegistry, anthropicService, options = {}) {
    super('Guardian', toolRegistry, anthropicService, options);
    this.vulnerabilityConfig = null;
    this.documentationCache = new Map();
    this.ruleTemplates = {
      'sql-injection': {
        patterns: ['SELECT.*FROM', 'INSERT.*INTO', 'UPDATE.*SET', 'DELETE.*FROM'],
        contextChecks: ['parameterized', 'escaped', 'sanitized'],
        severity: 'critical'
      },
      'xss-prevention': {
        patterns: ['innerHTML', 'outerHTML', 'document.write', 'eval\\('],
        contextChecks: ['sanitized', 'encoded', 'validated'],
        severity: 'high'
      },
      'hardcoded-secrets': {
        patterns: ['password.*=', 'api_key.*=', 'secret.*=', 'token.*='],
        contextChecks: ['environment_variable', 'config_file', 'encrypted'],
        severity: 'critical'
      }
    };
  }

  async onInitialize() {
    this.log('Initializing Guardian Agent for rule creation');

    try {
      this.vulnerabilityConfig = await fs.readJSON('./config/vulnerabilities.json');
      this.setContext('vulnerabilityCategories', this.vulnerabilityConfig.categories);
      this.log('Loaded vulnerability configuration');
    } catch (error) {
      this.log(`Failed to load vulnerability config: ${error.message}`, 'warn');
      this.vulnerabilityConfig = { categories: {} };
    }
  }

  async onExecute(input) {
    const { techStacks, goals } = input;

    if (!techStacks || !goals) {
      throw new Error('Guardian Agent requires tech stacks and goals from Sentinel Agent');
    }

    this.log('Starting dynamic rule creation based on tech stacks');

    const ruleCreationTasks = [
      () => this.createLanguageSpecificRules(techStacks),
      () => this.createFrameworkSpecificRules(techStacks),
      () => this.fetchDocumentationRules(techStacks),
      () => this.generateCustomRules(goals)
    ];

    const results = await this.parallel(ruleCreationTasks);
    const ruleSet = this.consolidateRules(results.successful);

    const result = {
      ruleSet,
      totalRules: ruleSet.length,
      rulesByCategory: this.categorizeRules(ruleSet),
      rulesByLanguage: this.groupRulesByLanguage(ruleSet),
      metadata: {
        techStacksProcessed: techStacks.length,
        goalsProcessed: goals.length,
        documentationSourcesUsed: this.documentationCache.size
      }
    };

    this.storeResult('ruleSet', ruleSet);
    this.storeResult('rulesByCategory', result.rulesByCategory);

    this.log(`Generated ${ruleSet.length} security rules across ${Object.keys(result.rulesByCategory).length} categories`);

    return result;
  }

  async createLanguageSpecificRules(techStacks) {
    this.log('Creating AI-powered language-specific security rules');

    const rules = [];

    for (const stack of techStacks) {
      try {
        // Get traditional patterns as baseline
        const baselineRules = await this.getLanguageSecurityPatterns(stack.language);

        // Use AI to enhance and expand rules
        const aiEnhancedRules = await this.generateAISecurityRules(stack, baselineRules);

        aiEnhancedRules.forEach(rule => {
          rules.push({
            ...rule,
            source: 'ai-enhanced',
            language: stack.language,
            confidence: stack.confidence,
            id: `${stack.language}_${rule.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          });
        });

        this.log(`Created ${aiEnhancedRules.length} AI-enhanced rules for ${stack.language}`);
      } catch (error) {
        this.log(`Failed to create rules for ${stack.language}: ${error.message}`, 'warn');

        // Fallback to baseline rules
        const fallbackRules = await this.getLanguageSecurityPatterns(stack.language);
        fallbackRules.forEach(rule => {
          rules.push({
            ...rule,
            source: 'fallback',
            language: stack.language,
            confidence: stack.confidence,
            id: `${stack.language}_${rule.type}_${Date.now()}`
          });
        });
      }
    }

    return { type: 'language-rules', rules };
  }

  async generateAISecurityRules(techStack, baselineRules) {
    const prompt = `Generate comprehensive security rules for ${techStack.language} development:

Technology Stack: ${JSON.stringify(techStack, null, 2)}

Baseline Rules: ${JSON.stringify(baselineRules, null, 2)}

Generate 8-12 specific security rules in JSON format:
{
  "rules": [
    {
      "type": "sql-injection-advanced",
      "name": "Advanced SQL Injection Detection",
      "description": "Detects complex SQL injection patterns including second-order attacks",
      "pattern": "(?i)(SELECT|INSERT|UPDATE|DELETE).*({|\\$|CONCAT|UNION)",
      "severity": "critical",
      "category": "injection",
      "mitigation": "Use parameterized queries and input validation",
      "examples": {
        "vulnerable": "query = 'SELECT * FROM users WHERE id = ' + userId",
        "secure": "query = 'SELECT * FROM users WHERE id = ?'; execute(query, [userId])"
      },
      "cwe": "CWE-89",
      "owasp": "A03:2021 – Injection"
    }
  ]
}

Focus on:
- Modern attack vectors
- Framework-specific vulnerabilities
- Language-specific security pitfalls
- Advanced detection patterns
- Practical mitigation strategies`;

    try {
      const aiResult = await this.analyzeWithAI('', prompt, {
        task: 'security-rule-generation',
        language: techStack.language,
        confidence: techStack.confidence
      });

      let aiRules = [];
      try {
        const jsonMatch = aiResult.analysis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          aiRules = parsed.rules || [];
        }
      } catch (parseError) {
        this.log(`Failed to parse AI rules for ${techStack.language}, using baseline`, 'warn');
        return baselineRules;
      }

      // Validate and enhance AI rules
      const validatedRules = aiRules.map(rule => ({
        ...rule,
        pattern: this.validateRegexPattern(rule.pattern),
        confidence: 0.85, // AI-generated rules get high confidence
        aiGenerated: true,
        frameworks: techStack.frameworks || []
      }));

      return validatedRules.length > 0 ? validatedRules : baselineRules;

    } catch (error) {
      this.log(`AI rule generation failed for ${techStack.language}: ${error.message}`, 'warn');
      return baselineRules;
    }
  }

  validateRegexPattern(pattern) {
    try {
      new RegExp(pattern, 'gi');
      return pattern;
    } catch (error) {
      // Return a safe fallback pattern
      return '.*';
    }
  }

  async createFrameworkSpecificRules(techStacks) {
    this.log('Creating framework-specific security rules');

    const rules = [];

    for (const stack of techStacks) {
      for (const framework of stack.frameworks) {
        try {
          const frameworkRules = await this.getFrameworkSecurityPatterns(framework.name, stack.language);

          frameworkRules.forEach(rule => {
            rules.push({
              ...rule,
              source: 'framework-specific',
              language: stack.language,
              framework: framework.name,
              confidence: framework.confidence,
              id: `${framework.name}_${rule.type}_${Date.now()}`
            });
          });

          this.log(`Created ${frameworkRules.length} rules for ${framework.name}`);
        } catch (error) {
          this.log(`Failed to create rules for framework ${framework.name}: ${error.message}`, 'warn');
        }
      }
    }

    return { type: 'framework-rules', rules };
  }

  async fetchDocumentationRules(techStacks) {
    this.log('Fetching documentation-based security rules');

    const rules = [];

    for (const stack of techStacks) {
      try {
        // Fetch security documentation for each technology
        const docs = await this.fetchSecurityDocumentation(stack.language);
        const docRules = this.extractRulesFromDocumentation(docs, stack.language);

        docRules.forEach(rule => {
          rules.push({
            ...rule,
            source: 'documentation',
            language: stack.language,
            id: `doc_${stack.language}_${rule.type}_${Date.now()}`
          });
        });

        this.log(`Extracted ${docRules.length} rules from ${stack.language} documentation`);
      } catch (error) {
        this.log(`Failed to fetch documentation for ${stack.language}: ${error.message}`, 'warn');
      }
    }

    return { type: 'documentation-rules', rules };
  }

  async generateCustomRules(goals) {
    this.log('Generating custom rules based on goals');

    const rules = [];

    for (const goal of goals) {
      try {
        const customRules = this.createRulesForGoal(goal);

        customRules.forEach(rule => {
          rules.push({
            ...rule,
            source: 'goal-based',
            goalType: goal.type,
            priority: goal.priority,
            id: `goal_${goal.type}_${rule.type}_${Date.now()}`
          });
        });

        this.log(`Generated ${customRules.length} custom rules for goal: ${goal.description}`);
      } catch (error) {
        this.log(`Failed to generate custom rules for goal ${goal.type}: ${error.message}`, 'warn');
      }
    }

    return { type: 'custom-rules', rules };
  }

  async getLanguageSecurityPatterns(language) {
    const patterns = {
      javascript: [
        {
          type: 'eval-usage',
          name: 'Dangerous eval() usage',
          description: 'Detects potentially dangerous eval() calls',
          pattern: /eval\s*\(/gi,
          severity: 'high',
          category: 'code-injection',
          mitigation: 'Use safe alternatives like JSON.parse() or Function constructor with validation'
        },
        {
          type: 'prototype-pollution',
          name: 'Prototype pollution vulnerability',
          description: 'Detects potential prototype pollution patterns',
          pattern: /__proto__|constructor\.prototype|Object\.prototype/gi,
          severity: 'medium',
          category: 'injection',
          mitigation: 'Use Object.create(null) or validate object keys before assignment'
        }
      ],
      python: [
        {
          type: 'sql-injection',
          name: 'SQL injection vulnerability',
          description: 'Detects potential SQL injection in Python code',
          pattern: /execute\s*\(\s*['"].*%.*['"].*%/gi,
          severity: 'critical',
          category: 'injection',
          mitigation: 'Use parameterized queries or ORM methods'
        },
        {
          type: 'pickle-deserialization',
          name: 'Unsafe pickle deserialization',
          description: 'Detects unsafe pickle.loads() usage',
          pattern: /pickle\.loads?\s*\(/gi,
          severity: 'high',
          category: 'deserialization',
          mitigation: 'Use JSON or implement custom serialization with validation'
        }
      ],
      java: [
        {
          type: 'sql-injection',
          name: 'SQL injection in Java',
          description: 'Detects concatenated SQL queries',
          pattern: /Statement.*execute.*\+/gi,
          severity: 'critical',
          category: 'injection',
          mitigation: 'Use PreparedStatement with parameter placeholders'
        }
      ]
    };

    return patterns[language] || [];
  }

  async getFrameworkSecurityPatterns(framework, language) {
    const patterns = {
      react: [
        {
          type: 'dangerous-html',
          name: 'Dangerous HTML injection',
          description: 'Detects dangerouslySetInnerHTML usage',
          pattern: /dangerouslySetInnerHTML/gi,
          severity: 'high',
          category: 'xss',
          mitigation: 'Sanitize HTML content or use text content instead'
        }
      ],
      express: [
        {
          type: 'route-injection',
          name: 'Route parameter injection',
          description: 'Detects unsanitized route parameters',
          pattern: /req\.params\.[a-zA-Z_]+(?!\s*\|\|\s*req\.body)/gi,
          severity: 'medium',
          category: 'injection',
          mitigation: 'Validate and sanitize route parameters'
        }
      ],
      django: [
        {
          type: 'template-injection',
          name: 'Django template injection',
          description: 'Detects potential template injection',
          pattern: /\{\{\s*.*\|safe\s*\}\}/gi,
          severity: 'high',
          category: 'injection',
          mitigation: 'Remove |safe filter or ensure content is properly sanitized'
        }
      ]
    };

    return patterns[framework] || [];
  }

  async fetchSecurityDocumentation(technology) {
    if (this.documentationCache.has(technology)) {
      return this.documentationCache.get(technology);
    }

    try {
      this.log(`Fetching security documentation for ${technology}`);

      // Use web-search tool for documentation retrieval
      const docResult = await this.useTool('web-search', 'getDocumentation', {
        technology,
        topic: 'security best practices'
      });

      let docs = docResult.result.documentation || '';

      // If direct documentation retrieval fails, try web search
      if (!docs || docs.length < 100) {
        const searchResult = await this.useTool('playwright', 'search', {
          query: `${technology} security vulnerabilities best practices OWASP`,
          limit: 5
        });

        if (searchResult.result && searchResult.result.results) {
          // Extract content from search results
          const searchContent = searchResult.result.results.map(r =>
            `${r.title}: ${r.snippet}`
          ).join('\n');

          // Use AI to summarize the search results into security documentation
          const aiSummary = await this.analyzeWithAI(searchContent,
            `Summarize security best practices and vulnerabilities for ${technology} based on these search results:

Extract:
1. Common security vulnerabilities
2. Best practices for secure coding
3. Framework-specific security features
4. Known attack vectors
5. Mitigation strategies

Provide a comprehensive but concise summary focused on actionable security guidance.`,
            {
              task: 'documentation-summarization',
              technology
            }
          );

          docs = aiSummary.analysis;
        }
      }

      this.documentationCache.set(technology, docs);
      return docs;

    } catch (error) {
      this.log(`Failed to fetch documentation for ${technology}: ${error.message}`, 'warn');
      return 'Documentation not available - using fallback analysis';
    }
  }

  extractRulesFromDocumentation(docs, language) {
    const rules = [];

    if (!docs || docs === 'Documentation not available') {
      return rules;
    }

    // Extract security patterns from documentation using simple heuristics
    const securityKeywords = [
      'injection', 'xss', 'csrf', 'authentication', 'authorization',
      'encryption', 'sanitize', 'validate', 'escape', 'parameterized'
    ];

    const lines = docs.split('\n');

    lines.forEach((line, index) => {
      securityKeywords.forEach(keyword => {
        if (line.toLowerCase().includes(keyword)) {
          rules.push({
            type: `doc-${keyword}`,
            name: `Documentation-based ${keyword} rule`,
            description: line.trim(),
            pattern: new RegExp(keyword, 'gi'),
            severity: 'medium',
            category: keyword,
            mitigation: 'Follow documentation best practices',
            context: {
              documentationLine: line,
              lineNumber: index + 1
            }
          });
        }
      });
    });

    return rules;
  }

  createRulesForGoal(goal) {
    const rules = [];

    if (goal.rules && Array.isArray(goal.rules)) {
      goal.rules.forEach(ruleName => {
        if (this.ruleTemplates[ruleName]) {
          const template = this.ruleTemplates[ruleName];

          template.patterns.forEach(pattern => {
            rules.push({
              type: ruleName,
              name: `Goal-based ${ruleName} rule`,
              description: `Rule created for goal: ${goal.description}`,
              pattern: new RegExp(pattern, 'gi'),
              severity: template.severity,
              category: ruleName,
              mitigation: `Address ${ruleName} by implementing proper ${template.contextChecks.join(', ')}`,
              goalContext: {
                goalType: goal.type,
                goalDescription: goal.description,
                priority: goal.priority
              }
            });
          });
        }
      });
    }

    return rules;
  }

  consolidateRules(results) {
    const allRules = [];
    const ruleIds = new Set();

    results.forEach(result => {
      if (result.rules && Array.isArray(result.rules)) {
        result.rules.forEach(rule => {
          // Avoid duplicates based on type and pattern
          const ruleSignature = `${rule.type}_${rule.pattern.toString()}`;

          if (!ruleIds.has(ruleSignature)) {
            ruleIds.add(ruleSignature);
            allRules.push(rule);
          }
        });
      }
    });

    // Sort by severity
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };

    return allRules.sort((a, b) => {
      const aSeverity = severityOrder[a.severity] || 0;
      const bSeverity = severityOrder[b.severity] || 0;
      return bSeverity - aSeverity;
    });
  }

  categorizeRules(rules) {
    const categories = {};

    rules.forEach(rule => {
      if (!categories[rule.category]) {
        categories[rule.category] = [];
      }
      categories[rule.category].push(rule);
    });

    return categories;
  }

  groupRulesByLanguage(rules) {
    const languages = {};

    rules.forEach(rule => {
      if (rule.language) {
        if (!languages[rule.language]) {
          languages[rule.language] = [];
        }
        languages[rule.language].push(rule);
      }
    });

    return languages;
  }
}