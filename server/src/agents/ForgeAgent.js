import { BaseAgent } from '../core/BaseAgent.js';
import fs from 'fs-extra';
import path from 'path';

export class ForgeAgent extends BaseAgent {
  constructor(toolRegistry, anthropicService, options = {}) {
    super('Forge', toolRegistry, anthropicService, options);
    
    this.suggestionTemplates = new Map();
    this.educationalContent = new Map();
    
    // Secure code patterns organized by language and vulnerability type
    this.secureCodePatterns = {
      javascript: {
        'sql-injection': {
          vulnerable: "const query = 'SELECT * FROM users WHERE id = ' + userId;",
          secure: "const query = 'SELECT * FROM users WHERE id = ?';\ndb.query(query, [userId], callback);",
          explanation: 'Use parameterized queries to prevent SQL injection attacks'
        },
        'xss-prevention': {
          vulnerable: "element.innerHTML = userInput;",
          secure: "element.textContent = userInput;",
          explanation: 'Use textContent instead of innerHTML to prevent XSS attacks'
        },
        'command-injection': {
          vulnerable: "exec('ping -c 1 ' + host);",
          secure: "exec('ping', ['-c', '1', host]);",
          explanation: 'Use argument arrays instead of string concatenation for shell commands'
        },
        'hardcoded-secrets': {
          vulnerable: "const apiKey = 'sk-1234567890abcdef';",
          secure: "const apiKey = process.env.API_KEY;",
          explanation: 'Store sensitive values in environment variables, not source code'
        },
        'eval-usage': {
          vulnerable: "eval(userCode);",
          secure: "JSON.parse(userCode); // or use Function constructor with validation",
          explanation: 'Avoid eval() - use JSON.parse() for data or Function constructor with validation'
        }
      },
      python: {
        'sql-injection': {
          vulnerable: 'cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")',
          secure: 'cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))',
          explanation: 'Use parameterized queries instead of string formatting in SQL'
        },
        'code-injection': {
          vulnerable: 'eval(user_input)',
          secure: 'ast.literal_eval(user_input)  # for safe literal evaluation',
          explanation: 'Use ast.literal_eval() for safe evaluation of Python literals'
        },
        'deserialization': {
          vulnerable: 'pickle.loads(user_data)',
          secure: 'json.loads(user_data)  # use JSON for data serialization',
          explanation: 'Use JSON instead of pickle for data serialization to prevent code execution'
        },
        'path-traversal': {
          vulnerable: 'open(base_path + user_filename)',
          secure: 'safe_path = os.path.join(base_path, os.path.basename(user_filename))\nopen(safe_path)',
          explanation: 'Use os.path.join() and os.path.basename() to prevent directory traversal'
        }
      },
      express: {
        'route-injection': {
          vulnerable: 'const userId = req.params.id; // direct use',
          secure: 'const userId = validator.escape(req.params.id);',
          explanation: 'Validate and sanitize all request parameters before use'
        },
        'cors-misconfiguration': {
          vulnerable: "app.use(cors({origin: '*', credentials: true}));",
          secure: "app.use(cors({origin: 'https://trusted-domain.com', credentials: true}));",
          explanation: 'Specify exact origins instead of wildcards when using credentials'
        },
        'middleware-bypass': {
          vulnerable: "app.get('/admin', (req, res) => { /* no auth */ });",
          secure: "app.get('/admin', authenticateToken, (req, res) => { /* protected */ });",
          explanation: 'Ensure all protected routes have authentication middleware'
        }
      },
      mysql: {
        'connection-security': {
          vulnerable: "mysql.createConnection({password: 'hardcoded123', ssl: false});",
          secure: "mysql.createConnection({password: process.env.DB_PASSWORD, ssl: true});",
          explanation: 'Use environment variables for credentials and enable SSL connections'
        }
      }
    };

    // Vulnerability severity impact for risk calculations
    this.severityImpact = {
      critical: { riskReduction: 0.9, effort: 4, priority: 1 },
      high: { riskReduction: 0.7, effort: 3, priority: 2 },
      medium: { riskReduction: 0.5, effort: 2, priority: 3 },
      low: { riskReduction: 0.3, effort: 1, priority: 4 }
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

    if (!techStacks || !Array.isArray(techStacks)) {
      throw new Error('Forge Agent requires tech stacks from Sentinel Agent');
    }

    this.log(`Generating secure code suggestions for ${issues.length} issues`);

    try {
      // Process issues in batches to avoid overwhelming the system
      this.log('Analyzing security issues for remediation patterns...');
      await this.addProcessingDelay(1200);
      
      const batchSize = 10;
      const suggestions = [];
      const educationalContent = [];
      const bestPractices = [];

      this.log(`Processing ${issues.length} issues in batches for optimal suggestions...`);
      await this.addProcessingDelay(800);

      for (let i = 0; i < issues.length; i += batchSize) {
        const batch = issues.slice(i, i + batchSize);
        
        // Add delay between batches for better user experience
        if (i > 0) {
          this.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(issues.length/batchSize)}...`);
          await this.addProcessingDelay(400);
        }
        
        // Process each batch
        const batchResults = await this.processBatch(batch, techStacks);
        suggestions.push(...batchResults.suggestions);
        educationalContent.push(...batchResults.educational);
        bestPractices.push(...batchResults.practices);
      }

      // Generate comprehensive educational material (enhanced with AI insights)
      this.log('Generating comprehensive educational materials...');
      await this.addProcessingDelay(600);
      const educationalMaterial = this.generateEducationalMaterial(issues, suggestions, techStacks);
      
      // Create implementation plan (enhanced with AI recommendations)
      this.log('Creating detailed implementation roadmap...');
      await this.addProcessingDelay(700);
      const implementationPlan = this.generateImplementationPlan(suggestions, issues);
      
      // Generate AI-enhanced security recommendations if available
      this.log('Generating AI-enhanced security recommendations...');
      await this.addProcessingDelay(900);
      const aiRecommendations = await this.generateAISecurityRecommendations(issues, suggestions, techStacks);

      const result = {
        suggestions,
        educationalMaterial,
        bestPractices,
        implementationPlan,
        aiRecommendations: aiRecommendations || null,
        statistics: {
          totalSuggestions: suggestions.length,
          aiEnhancedSuggestions: suggestions.filter(s => s.aiEnhanced).length,
          criticalFixes: suggestions.filter(s => s.severity === 'critical').length,
          highPriorityFixes: suggestions.filter(s => s.severity === 'high').length,
          estimatedEffort: this.calculateTotalEffort(suggestions),
          expectedRiskReduction: this.calculateTotalRiskReduction(suggestions)
        }
      };

      this.storeResult('suggestions', suggestions);
      this.storeResult('educationalMaterial', educationalMaterial);
      this.storeResult('aiRecommendations', aiRecommendations);
      this.storeResult('statistics', result.statistics);

      const aiEnhancedCount = suggestions.filter(s => s.aiEnhanced).length;
      this.log(`Generated ${suggestions.length} suggestions (${aiEnhancedCount} AI-enhanced) successfully`);
      
      if (aiEnhancedCount > 0) {
        this.log(`🎉 AI Enhancement Summary:`, 'info');
        suggestions.filter(s => s.aiEnhanced).forEach(s => {
          this.log(`  - ${s.title} (${s.severity} severity)`, 'info');
          if (s.aiInsights?.length > 0) {
            this.log(`    💡 AI Insights: ${s.aiInsights.length} insights provided`, 'info');
          }
          if (s.contextualRecommendations?.length > 0) {
            this.log(`    🎯 Contextual Recommendations: ${s.contextualRecommendations.length} recommendations`, 'info');
          }
        });
      }

      this.log(`Generated ${suggestions.length} secure code suggestions successfully`);

      return result;

    } catch (error) {
      this.log(`Error in Forge Agent execution: ${error.message}`, 'error');
      throw error;
    }
  }

  async loadSuggestionTemplates() {
    try {
      const templatePath = './config/suggestion-templates.json';

      if (await fs.pathExists(templatePath)) {
        const templates = await fs.readJSON(templatePath);
        this.suggestionTemplates = new Map(Object.entries(templates));
        this.log('Loaded custom suggestion templates');
      } else {
        this.initializeDefaultTemplates();
        this.log('Using default suggestion templates');
      }

    } catch (error) {
      this.log(`Failed to load suggestion templates: ${error.message}`, 'warn');
      this.initializeDefaultTemplates();
    }
  }

  initializeDefaultTemplates() {
    const defaultTemplates = {
      'sql-injection': {
        title: 'Fix SQL Injection Vulnerability',
        priority: 'critical',
        description: 'Replace dynamic SQL construction with parameterized queries',
        steps: [
          'Replace string concatenation with parameterized queries',
          'Validate and sanitize all user inputs',
          'Implement proper error handling',
          'Use ORM or query builder with built-in protection'
        ]
      },
      'xss-prevention': {
        title: 'Prevent Cross-Site Scripting (XSS)',
        priority: 'high',
        description: 'Encode output and validate input to prevent XSS attacks',
        steps: [
          'Encode all user data before rendering',
          'Use safe DOM manipulation methods',
          'Implement Content Security Policy (CSP)',
          'Validate input on both client and server'
        ]
      },
      'hardcoded-secrets': {
        title: 'Secure Hardcoded Secrets',
        priority: 'critical',
        description: 'Move sensitive data to secure configuration',
        steps: [
          'Move secrets to environment variables',
          'Use secure secret management service',
          'Implement secret rotation',
          'Remove secrets from version control history'
        ]
      }
    };

    this.suggestionTemplates = new Map(Object.entries(defaultTemplates));
  }

  async processBatch(issues, techStacks) {
    const suggestions = [];
    const educational = [];
    const practices = [];

    // Prioritize issues for AI processing (critical and high first)
    const prioritizedIssues = issues.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
    });

    for (const issue of prioritizedIssues) {
      try {
        // Generate code suggestion (now with AI enhancement for critical/high)
        const suggestion = await this.createSecureSuggestion(issue, techStacks);
        if (suggestion) {
          suggestions.push(suggestion);
        }

        // Generate educational content for unique issue types
        const educationalItem = this.createEducationalItem(issue);
        if (educationalItem) {
          educational.push(educationalItem);
        }

        // Generate best practice recommendations
        const practice = this.createBestPractice(issue, techStacks);
        if (practice) {
          practices.push(practice);
        }

      } catch (error) {
        this.log(`Failed to process issue ${issue.id || 'unknown'}: ${error.message}`, 'warn');
        // Continue processing other issues instead of failing completely
        continue;
      }
    }

    return { suggestions, educational, practices };
  }

  async createSecureSuggestion(issue, techStacks) {
    try {
      // Determine the appropriate language/framework context
      const language = this.detectLanguageFromIssue(issue);
      const framework = this.detectFrameworkFromIssue(issue, techStacks);
      
      // Get secure code pattern
      const codePattern = this.getSecureCodePattern(issue.type, language, framework);
      
      // Use AI for enhanced remediation suggestions on critical/high severity issues
      let aiEnhancedSuggestion = null;
      if (this.anthropicService && (issue.severity === 'critical' || issue.severity === 'high')) {
        try {
          this.log(`🤖 Generating AI-enhanced remediation for ${issue.severity} severity ${issue.type} issue`, 'info');
          aiEnhancedSuggestion = await this.generateAIRemediationSuggestion(issue, language, framework, codePattern);
          this.log(`✅ AI enhancement completed for issue ${issue.id}`, 'info');
        } catch (error) {
          this.log(`❌ AI remediation failed for ${issue.id}: ${error.message}`, 'warn');
        }
      } else if (this.anthropicService) {
        this.log(`ℹ️ Skipping AI enhancement for ${issue.severity} severity issue (only critical/high get AI enhancement)`, 'info');
      } else {
        this.log(`⚠️ Anthropic service not available - using template-based suggestions only`, 'warn');
      }
      
      // Create comprehensive suggestion
      const suggestion = {
        id: `suggestion_${issue.id || Date.now()}`,
        issueId: issue.id,
        type: 'code-suggestion',
        language,
        framework,
        severity: issue.severity,
        title: aiEnhancedSuggestion?.title || `Fix ${this.formatIssueType(issue.type)}`,
        description: aiEnhancedSuggestion?.description || this.generateSuggestionDescription(issue),
        
        // Code examples (use AI-enhanced if available)
        codeExample: aiEnhancedSuggestion?.codeExample || (codePattern ? {
          original: issue.lineContent || 'Original vulnerable code',
          vulnerable: codePattern.vulnerable,
          secure: codePattern.secure,
          explanation: codePattern.explanation
        } : null),
        
        // Implementation guidance (use AI-enhanced if available)
        implementationSteps: aiEnhancedSuggestion?.implementationSteps || this.generateImplementationSteps(issue),
        testingGuidance: aiEnhancedSuggestion?.testingGuidance || this.generateTestingGuidance(issue),
        
        // Risk and effort assessment
        riskReduction: this.calculateRiskReduction(issue.severity),
        estimatedEffort: this.estimateImplementationEffort(issue),
        
        // Additional information
        relatedCWE: issue.cwe || 'CWE-20',
        owaspCategory: issue.owasp || 'A06:2021 – Vulnerable and Outdated Components',
        
        // File and location context
        file: issue.file,
        line: issue.line,
        confidence: issue.confidence || 0.8,
        
        // AI enhancement metadata
        aiEnhanced: !!aiEnhancedSuggestion,
        aiInsights: aiEnhancedSuggestion?.insights || [],
        contextualRecommendations: aiEnhancedSuggestion?.contextualRecommendations || [],
        alternativeApproaches: aiEnhancedSuggestion?.alternativeApproaches || []
      };

      return suggestion;

    } catch (error) {
      this.log(`Error creating suggestion for issue ${issue.id}: ${error.message}`, 'warn');
      return null;
    }
  }

  async generateAIRemediationSuggestion(issue, language, framework, codePattern) {
    const contextLines = issue.contextLines || [];
    const vulnerableCode = issue.lineContent || '';
    
    const prompt = `
Generate an enhanced secure coding remediation for this vulnerability:

**Vulnerability Details:**
- Type: ${issue.type}
- Severity: ${issue.severity}
- Language: ${language}
- Framework: ${framework || 'None detected'}
- File: ${path.basename(issue.file || 'unknown')}
- Line: ${issue.line || 'unknown'}
- Description: ${issue.description || 'No description'}
- CWE: ${issue.cwe || 'Not specified'}
- OWASP: ${issue.owasp || 'Not specified'}

**Vulnerable Code:**
\`\`\`${language}
${vulnerableCode}
\`\`\`

**Context (surrounding code):**
\`\`\`${language}
${contextLines.join('\n')}
\`\`\`

**Existing Pattern (if available):**
${codePattern ? `
Vulnerable: ${codePattern.vulnerable}
Secure: ${codePattern.secure}
Explanation: ${codePattern.explanation}
` : 'No existing pattern available'}

**AI Analysis from Inspector:**
${issue.aiAnalysis ? `
- Confidence: ${issue.aiAnalysis.confidenceScore}
- Exploitability: ${issue.aiAnalysis.exploitability}
- Business Impact: ${issue.aiAnalysis.businessImpact}
- Explanation: ${issue.aiAnalysis.explanation}
- Recommendations: ${issue.aiRecommendations?.join(', ') || 'None'}
` : 'No AI analysis available'}

Provide comprehensive remediation guidance in JSON format:
{
  "title": "Specific, actionable title for this fix",
  "description": "Detailed description of the vulnerability and why it needs fixing",
  "codeExample": {
    "original": "The actual vulnerable code from the context",
    "secure": "Secure replacement code tailored to this specific context",
    "explanation": "Why this specific fix works for this context",
    "additionalConsiderations": "Any additional security considerations"
  },
  "implementationSteps": [
    "Step 1: Specific action for this codebase",
    "Step 2: Next specific action",
    "Step 3: Validation step"
  ],
  "testingGuidance": {
    "unitTests": "Specific unit test recommendations",
    "securityTests": "Security-specific testing approach",
    "integrationTests": "Integration testing considerations"
  },
  "insights": [
    "Key insight about this vulnerability in this context",
    "Important consideration for this specific fix"
  ],
  "contextualRecommendations": [
    "Recommendation specific to this codebase/framework",
    "Architecture-level recommendation"
  ],
  "alternativeApproaches": [
    {
      "approach": "Alternative fix approach",
      "pros": "Benefits of this approach",
      "cons": "Drawbacks of this approach",
      "effort": "low|medium|high"
    }
  ],
  "preventionStrategies": [
    "How to prevent this type of vulnerability in the future",
    "Development process improvements"
  ]
}
`;

    try {
      const result = await this.analyzeWithAI(contextLines.join('\n'), prompt, {
        analysisType: 'remediation-suggestion',
        vulnerabilityType: issue.type,
        language: language,
        framework: framework
      });

      return this.parseAIRemediationResponse(result.analysis);

    } catch (error) {
      this.log(`AI remediation generation failed: ${error.message}`, 'warn');
      return null;
    }
  }

  parseAIRemediationResponse(aiText) {
    try {
      // Extract JSON from AI response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        return {
          title: parsed.title || 'AI-Enhanced Security Fix',
          description: parsed.description || 'Enhanced remediation suggestion',
          codeExample: parsed.codeExample || null,
          implementationSteps: parsed.implementationSteps || [],
          testingGuidance: parsed.testingGuidance || {},
          insights: parsed.insights || [],
          contextualRecommendations: parsed.contextualRecommendations || [],
          alternativeApproaches: parsed.alternativeApproaches || [],
          preventionStrategies: parsed.preventionStrategies || []
        };
      }
    } catch (error) {
      this.log(`Failed to parse AI remediation response: ${error.message}`, 'warn');
    }

    return null;
  }

  detectLanguageFromIssue(issue) {
    // Try to get language from issue first
    if (issue.language) {
      return issue.language;
    }

    // Fallback to file extension detection
    if (issue.file) {
      const ext = path.extname(issue.file).toLowerCase();
      const langMap = {
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.mjs': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.py': 'python',
        '.pyw': 'python',
        '.java': 'java',
        '.cs': 'csharp',
        '.php': 'php',
        '.go': 'go',
        '.rs': 'rust',
        '.rb': 'ruby'
      };
      return langMap[ext] || 'unknown';
    }

    return 'unknown';
  }

  detectFrameworkFromIssue(issue, techStacks) {
    const language = this.detectLanguageFromIssue(issue);
    
    // Find the tech stack for this language
    const techStack = techStacks.find(stack => stack.language === language);
    
    if (techStack && techStack.frameworks && techStack.frameworks.length > 0) {
      return techStack.frameworks[0].name;
    }

    return null;
  }

  getSecureCodePattern(issueType, language, framework) {
    // Try framework-specific pattern first
    if (framework && this.secureCodePatterns[framework] && this.secureCodePatterns[framework][issueType]) {
      return this.secureCodePatterns[framework][issueType];
    }

    // Try language-specific pattern
    if (this.secureCodePatterns[language] && this.secureCodePatterns[language][issueType]) {
      return this.secureCodePatterns[language][issueType];
    }

    // Return generic pattern if available
    return this.generateGenericSecurePattern(issueType, language);
  }

  generateGenericSecurePattern(issueType, language) {
    const genericPatterns = {
      'hardcoded-secrets': {
        vulnerable: 'const secret = "hardcoded_value";',
        secure: this.getEnvironmentVariablePattern(language, 'SECRET'),
        explanation: 'Store sensitive values in environment variables or secure configuration'
      },
      'path-traversal': {
        vulnerable: 'const filePath = baseDir + userInput;',
        secure: this.getSafePathPattern(language),
        explanation: 'Validate and sanitize file paths to prevent directory traversal'
      },
      'input-validation': {
        vulnerable: 'const userInput = request.params.input;',
        secure: this.getInputValidationPattern(language),
        explanation: 'Always validate and sanitize user input before processing'
      }
    };

    return genericPatterns[issueType] || null;
  }

  getEnvironmentVariablePattern(language, varName) {
    const patterns = {
      javascript: `const ${varName.toLowerCase()} = process.env.${varName};`,
      python: `${varName.lower()} = os.environ.get('${varName}')`,
      java: `String ${varName.toLowerCase()} = System.getenv("${varName}");`,
      csharp: `string ${varName.toLowerCase()} = Environment.GetEnvironmentVariable("${varName}");`,
      go: `${varName.toLowerCase()} := os.Getenv("${varName}")`,
      php: `$${varName.toLowerCase()} = $_ENV['${varName}'];`
    };

    return patterns[language] || `// Use environment variable for ${varName}`;
  }

  getSafePathPattern(language) {
    const patterns = {
      javascript: 'const safePath = path.join(baseDir, path.basename(userInput));',
      python: 'safe_path = os.path.join(base_dir, os.path.basename(user_input))',
      java: 'Path safePath = Paths.get(baseDir).resolve(Paths.get(userInput).getFileName());',
      csharp: 'string safePath = Path.Combine(baseDir, Path.GetFileName(userInput));',
      go: 'safePath := filepath.Join(baseDir, filepath.Base(userInput))',
      php: '$safePath = $baseDir . DIRECTORY_SEPARATOR . basename($userInput);'
    };

    return patterns[language] || '// Implement safe path handling';
  }

  getInputValidationPattern(language) {
    const patterns = {
      javascript: 'const validInput = validator.escape(validator.trim(userInput));',
      python: 'valid_input = html.escape(user_input.strip())',
      java: 'String validInput = StringEscapeUtils.escapeHtml4(userInput.trim());',
      csharp: 'string validInput = HttpUtility.HtmlEncode(userInput.Trim());',
      go: 'validInput := html.EscapeString(strings.TrimSpace(userInput))',
      php: '$validInput = htmlspecialchars(trim($userInput), ENT_QUOTES, \'UTF-8\');'
    };

    return patterns[language] || '// Validate and sanitize input';
  }

  createEducationalItem(issue) {
    return {
      id: `education_${issue.type}`,
      type: 'educational-content',
      topic: issue.type,
      title: this.formatIssueType(issue.type),
      severity: issue.severity,
      description: this.getEducationalDescription(issue.type),
      prevention: this.getPreventionStrategies(issue.type),
      examples: this.getVulnerabilityExamples(issue.type),
      resources: this.getEducationalResources(issue.type)
    };
  }

  createBestPractice(issue, techStacks) {
    const language = this.detectLanguageFromIssue(issue);
    
    return {
      id: `practice_${issue.type}_${language}`,
      type: 'best-practice',
      category: this.mapIssueToCategory(issue.type),
      language,
      title: this.getBestPracticeTitle(issue.type, language),
      description: this.getBestPracticeDescription(issue.type, language),
      implementation: this.getBestPracticeImplementation(issue.type, language),
      priority: this.mapSeverityToPriority(issue.severity)
    };
  }

  generateEducationalMaterial(issues, suggestions, techStacks) {
    const uniqueIssueTypes = [...new Set(issues.map(issue => issue.type))];
    const severityDistribution = this.calculateSeverityDistribution(issues);
    const languageDistribution = this.calculateLanguageDistribution(issues);

    return {
      overview: {
        totalIssues: issues.length,
        totalSuggestions: suggestions.length,
        uniqueVulnerabilityTypes: uniqueIssueTypes.length,
        severityDistribution,
        languageDistribution,
        riskLevel: this.calculateOverallRiskLevel(severityDistribution)
      },
      topics: uniqueIssueTypes.map(topic => ({
        name: topic,
        displayName: this.formatIssueType(topic),
        issueCount: issues.filter(i => i.type === topic).length,
        severity: this.getHighestSeverity(issues.filter(i => i.type === topic)),
        suggestionsCount: suggestions.filter(s => s.issueId && 
          issues.find(i => i.id === s.issueId && i.type === topic)).length
      })),
      learningPath: this.generateLearningPath(uniqueIssueTypes, severityDistribution),
      resources: this.generateResourcesList()
    };
  }

  generateImplementationPlan(suggestions, issues) {
    const criticalSuggestions = suggestions.filter(s => s.severity === 'critical');
    const highSuggestions = suggestions.filter(s => s.severity === 'high');
    const mediumSuggestions = suggestions.filter(s => s.severity === 'medium');
    const lowSuggestions = suggestions.filter(s => s.severity === 'low');

    const phases = [];

    if (criticalSuggestions.length > 0) {
      phases.push({
        phase: 1,
        name: 'Critical Security Fixes',
        priority: 'immediate',
        timeframe: '1-2 days',
        suggestions: criticalSuggestions.slice(0, 5), // Top 5 critical
        estimatedEffort: this.calculateTotalEffort(criticalSuggestions),
        description: 'Address critical vulnerabilities that pose immediate security risks'
      });
    }

    if (highSuggestions.length > 0) {
      phases.push({
        phase: 2,
        name: 'High Priority Security Issues',
        priority: 'high',
        timeframe: '1-2 weeks',
        suggestions: highSuggestions.slice(0, 10), // Top 10 high priority
        estimatedEffort: this.calculateTotalEffort(highSuggestions),
        description: 'Fix high-severity vulnerabilities in current development cycle'
      });
    }

    if (mediumSuggestions.length > 0) {
      phases.push({
        phase: 3,
        name: 'Medium Priority Improvements',
        priority: 'medium',
        timeframe: '2-4 weeks',
        suggestions: mediumSuggestions.slice(0, 15),
        estimatedEffort: this.calculateTotalEffort(mediumSuggestions),
        description: 'Address medium-severity issues and implement security improvements'
      });
    }

    if (lowSuggestions.length > 0) {
      phases.push({
        phase: 4,
        name: 'Low Priority Enhancements',
        priority: 'low',
        timeframe: '1-2 months',
        suggestions: lowSuggestions,
        estimatedEffort: this.calculateTotalEffort(lowSuggestions),
        description: 'Complete remaining security enhancements and best practices'
      });
    }

    return {
      phases,
      totalEffort: this.calculateTotalEffort(suggestions),
      estimatedDuration: this.estimateProjectDuration(phases),
      nextSteps: this.generateNextSteps(phases)
    };
  }

  // Helper methods for calculations and formatting
  formatIssueType(issueType) {
    if (!issueType || typeof issueType !== 'string') {
      return 'Security Issue';
    }
    
    return issueType
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  generateSuggestionDescription(issue) {
    const issueTypeName = this.formatIssueType(issue.type);
    const fileName = issue.file ? path.basename(issue.file) : 'unknown file';
    const lineInfo = issue.line ? ` at line ${issue.line}` : '';
    
    return `Address the ${issue.severity || 'unknown'} severity ${issueTypeName} vulnerability found in ${fileName}${lineInfo}`;
  }

  generateImplementationSteps(issue) {
    const fileName = issue.file ? path.basename(issue.file) : 'the affected file';
    const lineInfo = issue.line ? `:${issue.line}` : '';
    
    return [
      `Review the vulnerable code in ${fileName}${lineInfo}`,
      'Apply the suggested secure code pattern',
      'Test the implementation thoroughly',
      'Review similar patterns throughout the codebase',
      'Update documentation if necessary'
    ];
  }

  generateTestingGuidance(issue) {
    return {
      unitTests: 'Write unit tests to verify the fix works correctly',
      integrationTests: 'Test the fix in integration environment',
      securityTests: 'Perform security testing to validate vulnerability is resolved',
      manualTesting: 'Manually verify the fix doesn\'t break existing functionality',
      regressionTests: 'Run existing test suite to ensure no regressions'
    };
  }

  calculateRiskReduction(severity) {
    const impact = this.severityImpact[severity] || this.severityImpact.medium;
    return {
      percentage: Math.round(impact.riskReduction * 100),
      description: `Fixing this ${severity || 'medium'} severity issue will reduce security risk by ${Math.round(impact.riskReduction * 100)}%`
    };
  }

  estimateImplementationEffort(issue) {
    const impact = this.severityImpact[issue.severity] || this.severityImpact.medium;
    const baseHours = impact.effort;
    
    // Adjust based on issue complexity
    let complexityMultiplier = 1;
    if (issue.type === 'sql-injection' || issue.type === 'xss-prevention') {
      complexityMultiplier = 1.5; // More complex fixes
    }
    
    const totalHours = Math.ceil(baseHours * complexityMultiplier);
    
    return {
      hours: totalHours,
      effort: totalHours <= 2 ? 'Low' : totalHours <= 6 ? 'Medium' : 'High',
      description: `Estimated ${totalHours} hours to implement this fix`
    };
  }

  calculateTotalEffort(suggestions) {
    const totalHours = suggestions.reduce((sum, suggestion) => {
      return sum + (suggestion.estimatedEffort?.hours || 2);
    }, 0);
    
    return {
      totalHours,
      totalDays: Math.ceil(totalHours / 8),
      effort: totalHours <= 8 ? 'Low' : totalHours <= 24 ? 'Medium' : 'High'
    };
  }

  calculateTotalRiskReduction(suggestions) {
    const totalReduction = suggestions.reduce((sum, suggestion) => {
      return sum + (suggestion.riskReduction?.percentage || 0);
    }, 0);
    
    return Math.min(100, Math.round(totalReduction / suggestions.length));
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

  calculateLanguageDistribution(issues) {
    const distribution = {};
    
    issues.forEach(issue => {
      const language = this.detectLanguageFromIssue(issue);
      distribution[language] = (distribution[language] || 0) + 1;
    });
    
    return distribution;
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

  calculateOverallRiskLevel(severityDistribution) {
    const { critical, high, medium, low } = severityDistribution;
    
    if (critical > 0) return 'Critical';
    if (high > 2) return 'High';
    if (high > 0 || medium > 5) return 'Medium';
    return 'Low';
  }

  generateLearningPath(issueTypes, severityDistribution) {
    const criticalTopics = issueTypes.filter(type =>
      ['sql-injection', 'xss-prevention', 'hardcoded-secrets', 'command-injection'].includes(type)
    );

    const phases = [];

    if (criticalTopics.length > 0) {
      phases.push({
        level: 'Critical Security Fundamentals',
        topics: criticalTopics,
        description: 'Learn to identify and fix the most dangerous vulnerabilities',
        priority: 1
      });
    }

    phases.push({
      level: 'Security Best Practices',
      topics: issueTypes.filter(t => !criticalTopics.includes(t)),
      description: 'Implement comprehensive security measures and best practices',
      priority: 2
    });

    phases.push({
      level: 'Advanced Security',
      topics: ['security-architecture', 'threat-modeling', 'security-testing'],
      description: 'Advanced security concepts and practices',
      priority: 3
    });

    return phases;
  }

  generateResourcesList() {
    return [
      {
        title: 'OWASP Top 10',
        url: 'https://owasp.org/www-project-top-ten/',
        description: 'Most critical web application security risks',
        category: 'general'
      },
      {
        title: 'Secure Coding Practices',
        url: 'https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/',
        description: 'Quick reference for secure coding practices',
        category: 'coding'
      },
      {
        title: 'Security Testing Guide',
        url: 'https://owasp.org/www-project-web-security-testing-guide/',
        description: 'Comprehensive security testing methodology',
        category: 'testing'
      },
      {
        title: 'CWE/SANS Top 25',
        url: 'https://cwe.mitre.org/top25/',
        description: 'Most dangerous software weaknesses',
        category: 'vulnerabilities'
      }
    ];
  }

  estimateProjectDuration(phases) {
    const totalDays = phases.reduce((sum, phase) => {
      return sum + (phase.estimatedEffort?.totalDays || 1);
    }, 0);
    
    return {
      totalDays,
      totalWeeks: Math.ceil(totalDays / 5),
      description: `Estimated ${Math.ceil(totalDays / 5)} weeks to complete all security improvements`
    };
  }

  generateNextSteps(phases) {
    const steps = [];
    
    if (phases.length > 0) {
      const firstPhase = phases[0];
      steps.push({
        step: 1,
        action: `Begin ${firstPhase.name}`,
        description: firstPhase.description,
        timeframe: firstPhase.timeframe,
        priority: 'immediate'
      });
    }

    steps.push({
      step: 2,
      action: 'Set up security review process',
      description: 'Establish regular security code reviews and testing',
      timeframe: 'This week',
      priority: 'high'
    });

    steps.push({
      step: 3,
      action: 'Implement security training',
      description: 'Provide security awareness training for development team',
      timeframe: 'Next 2 weeks',
      priority: 'medium'
    });

    return steps;
  }

  // Educational content helpers
  getEducationalDescription(issueType) {
    const descriptions = {
      'sql-injection': 'SQL injection occurs when untrusted data is sent to an interpreter as part of a command or query, allowing attackers to execute malicious SQL commands.',
      'xss-prevention': 'Cross-Site Scripting (XSS) allows attackers to inject malicious scripts into web pages viewed by other users.',
      'hardcoded-secrets': 'Hardcoded secrets in source code expose sensitive credentials to anyone with access to the code.',
      'command-injection': 'Command injection allows attackers to execute arbitrary commands on the host operating system.',
      'path-traversal': 'Path traversal vulnerabilities allow attackers to access files and directories outside the intended directory.'
    };

    return descriptions[issueType] || `Security vulnerability of type: ${this.formatIssueType(issueType)}`;
  }

  getPreventionStrategies(issueType) {
    const strategies = {
      'sql-injection': [
        'Use parameterized queries or prepared statements',
        'Implement input validation and sanitization',
        'Use stored procedures with proper parameter handling',
        'Apply principle of least privilege for database access'
      ],
      'xss-prevention': [
        'Encode all output data',
        'Validate and sanitize input data',
        'Use Content Security Policy (CSP)',
        'Implement proper session management'
      ],
      'hardcoded-secrets': [
        'Use environment variables for configuration',
        'Implement secure secret management systems',
        'Enable secret rotation and monitoring',
        'Remove secrets from version control history'
      ]
    };

    return strategies[issueType] || ['Follow secure coding best practices'];
  }

  getVulnerabilityExamples(issueType) {
    return [{
      title: `Example of ${this.formatIssueType(issueType)}`,
      description: 'Common vulnerable pattern and secure alternative',
      vulnerable: 'Example vulnerable code...',
      secure: 'Example secure code...',
      explanation: 'Explanation of why the secure version is better...'
    }];
  }

  getEducationalResources(issueType) {
    return [
      {
        title: `OWASP Guide on ${this.formatIssueType(issueType)}`,
        url: 'https://owasp.org/',
        description: 'Comprehensive security guidance from OWASP'
      },
      {
        title: 'Security Code Review Guidelines',
        url: 'https://owasp.org/www-project-code-review-guide/',
        description: 'Guidelines for secure code review practices'
      }
    ];
  }

  mapIssueToCategory(issueType) {
    const categoryMap = {
      'sql-injection': 'Input Validation',
      'xss-prevention': 'Output Encoding',
      'hardcoded-secrets': 'Secrets Management',
      'command-injection': 'Input Validation',
      'path-traversal': 'Access Control'
    };

    return categoryMap[issueType] || 'General Security';
  }

  getBestPracticeTitle(issueType, language) {
    const titles = {
      'sql-injection': `${language.charAt(0).toUpperCase() + language.slice(1)} SQL Security`,
      'xss-prevention': `${language.charAt(0).toUpperCase() + language.slice(1)} XSS Prevention`,
      'hardcoded-secrets': 'Secure Configuration Management'
    };

    return titles[issueType] || `${language.charAt(0).toUpperCase() + language.slice(1)} Security Best Practices`;
  }

  getBestPracticeDescription(issueType, language) {
    return `Implement secure coding practices for ${this.formatIssueType(issueType)} in ${language} applications`;
  }

  getBestPracticeImplementation(issueType, language) {
    return `Follow ${language}-specific security guidelines to prevent ${this.formatIssueType(issueType)} vulnerabilities`;
  }

  mapSeverityToPriority(severity) {
    const priorityMap = {
      critical: 'immediate',
      high: 'high',
      medium: 'medium',
      low: 'low'
    };

    return priorityMap[severity] || 'medium';
  }

  async generateAISecurityRecommendations(issues, suggestions, techStacks) {
    if (!this.anthropicService) {
      return null;
    }

    try {
      const issuesSummary = {
        total: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length
      };

      const languageBreakdown = {};
      issues.forEach(issue => {
        const lang = this.detectLanguageFromIssue(issue);
        languageBreakdown[lang] = (languageBreakdown[lang] || 0) + 1;
      });

      const vulnerabilityTypes = [...new Set(issues.map(i => i.type))];

      const prompt = `
Analyze this codebase security assessment and provide strategic recommendations:

**Security Assessment Summary:**
- Total Issues: ${issuesSummary.total}
- Critical: ${issuesSummary.critical}
- High: ${issuesSummary.high}
- Medium: ${issuesSummary.medium}
- Low: ${issuesSummary.low}

**Languages/Technologies:**
${Object.entries(languageBreakdown).map(([lang, count]) => `- ${lang}: ${count} issues`).join('\n')}

**Vulnerability Types Found:**
${vulnerabilityTypes.map(type => `- ${this.formatIssueType(type)}`).join('\n')}

**Tech Stack Context:**
${techStacks.map(stack => `- ${stack.language}: ${stack.frameworks?.map(f => f.name).join(', ') || 'No frameworks detected'}`).join('\n')}

**AI-Enhanced Suggestions Generated:** ${suggestions.filter(s => s.aiEnhanced).length}/${suggestions.length}

Provide strategic security recommendations in JSON format:
{
  "overallRiskAssessment": {
    "level": "critical|high|medium|low",
    "description": "Overall security posture assessment",
    "keyFindings": ["finding 1", "finding 2"]
  },
  "immediateActions": [
    {
      "action": "Specific immediate action",
      "rationale": "Why this is urgent",
      "timeframe": "hours/days"
    }
  ],
  "architecturalRecommendations": [
    {
      "area": "Security area (e.g., authentication, data validation)",
      "recommendation": "Specific architectural improvement",
      "impact": "Expected security improvement"
    }
  ],
  "processImprovements": [
    {
      "process": "Development process to improve",
      "improvement": "Specific improvement suggestion",
      "benefit": "Security benefit"
    }
  ],
  "toolingRecommendations": [
    {
      "tool": "Security tool or practice",
      "purpose": "What it addresses",
      "priority": "high|medium|low"
    }
  ],
  "trainingNeeds": [
    {
      "topic": "Security training topic",
      "audience": "Who needs this training",
      "urgency": "immediate|high|medium|low"
    }
  ],
  "longTermStrategy": {
    "goals": ["Long-term security goal 1", "Long-term security goal 2"],
    "milestones": ["Milestone 1", "Milestone 2"],
    "timeframe": "Expected timeframe for full implementation"
  }
}
`;

      const result = await this.analyzeWithAI('', prompt, {
        analysisType: 'strategic-security-recommendations',
        issueCount: issues.length,
        languages: Object.keys(languageBreakdown)
      });

      return this.parseAIRecommendationsResponse(result.analysis);

    } catch (error) {
      this.log(`AI security recommendations generation failed: ${error.message}`, 'warn');
      return null;
    }
  }

  parseAIRecommendationsResponse(aiText) {
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          overallRiskAssessment: parsed.overallRiskAssessment || {
            level: 'medium',
            description: 'Security assessment completed',
            keyFindings: []
          },
          immediateActions: parsed.immediateActions || [],
          architecturalRecommendations: parsed.architecturalRecommendations || [],
          processImprovements: parsed.processImprovements || [],
          toolingRecommendations: parsed.toolingRecommendations || [],
          trainingNeeds: parsed.trainingNeeds || [],
          longTermStrategy: parsed.longTermStrategy || {
            goals: [],
            milestones: [],
            timeframe: 'Not specified'
          },
          generatedAt: new Date().toISOString()
        };
      }
    } catch (error) {
      this.log(`Failed to parse AI recommendations response: ${error.message}`, 'warn');
    }

    return null;
  }
}
