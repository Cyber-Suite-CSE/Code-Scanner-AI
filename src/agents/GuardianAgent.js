import { BaseAgent } from '../core/BaseAgent.js';
import fs from 'fs-extra';
import path from 'path';

export class GuardianAgent extends BaseAgent {
  constructor(toolRegistry, anthropicService, options = {}) {
    super('Guardian', toolRegistry, anthropicService, options);
    this.vulnerabilityConfig = null;
    
    // Comprehensive rule templates organized by technology
    this.ruleTemplates = {
      javascript: {
        'sql-injection': {
          patterns: [
            /(['"`]).*\+.*\1\s*\+.*(['"`])/g, // String concatenation in SQL
            /query\s*=\s*['"`].*\$\{.*\}.*['"`]/g, // Template literals in SQL
            /execute\s*\(\s*['"`].*\+.*['"`]/g, // Direct concatenation in execute
            /mysql\.query\s*\(\s*['"`].*\+/g // MySQL query concatenation
          ],
          severity: 'critical',
          category: 'injection',
          mitigation: 'Use parameterized queries with placeholders (?, $1, etc.)',
          examples: {
            vulnerable: "query = 'SELECT * FROM users WHERE id = ' + userId",
            secure: "query = 'SELECT * FROM users WHERE id = ?'; db.query(query, [userId])"
          }
        },
        'xss-prevention': {
          patterns: [
            /innerHTML\s*=\s*[^;]*\+/g, // innerHTML with concatenation
            /outerHTML\s*=\s*[^;]*\+/g, // outerHTML with concatenation
            /document\.write\s*\([^)]*\+/g, // document.write with concatenation
            /\$\([^)]*\)\.html\s*\([^)]*\+/g // jQuery html() with concatenation
          ],
          severity: 'high',
          category: 'xss',
          mitigation: 'Use textContent instead of innerHTML, or sanitize HTML content',
          examples: {
            vulnerable: "element.innerHTML = '<div>' + userInput + '</div>'",
            secure: "element.textContent = userInput"
          }
        },
        'command-injection': {
          patterns: [
            /exec\s*\(\s*['"`].*\+/g, // exec with concatenation
            /spawn\s*\(\s*['"`].*\+/g, // spawn with concatenation
            /system\s*\(\s*['"`].*\+/g, // system with concatenation
            /eval\s*\([^)]*\+/g // eval with concatenation
          ],
          severity: 'critical',
          category: 'injection',
          mitigation: 'Use parameterized commands or validate input strictly',
          examples: {
            vulnerable: "exec('ping -c 1 ' + host)",
            secure: "exec('ping', ['-c', '1', host])"
          }
        },
        'hardcoded-secrets': {
          patterns: [
            /password\s*[:=]\s*['"`][^'"`]{8,}['"`]/g, // Hardcoded passwords
            /api_?key\s*[:=]\s*['"`][^'"`]{16,}['"`]/g, // API keys
            /secret\s*[:=]\s*['"`][^'"`]{12,}['"`]/g, // Secrets
            /token\s*[:=]\s*['"`][^'"`]{20,}['"`]/g // Tokens
          ],
          severity: 'critical',
          category: 'secrets',
          mitigation: 'Use environment variables or secure configuration files',
          examples: {
            vulnerable: "const apiKey = 'sk-1234567890abcdef'",
            secure: "const apiKey = process.env.API_KEY"
          }
        }
      },
      python: {
      'sql-injection': {
          patterns: [
            /execute\s*\(\s*['"`].*%.*['"`]\s*%/g, // String formatting in SQL
            /execute\s*\(\s*f['"`].*\{.*\}.*['"`]/g, // f-strings in SQL
            /cursor\.execute\s*\(\s*['"`].*\+/g, // Direct concatenation
            /query\s*=\s*['"`].*\.format\s*\(/g // .format() in SQL
          ],
          severity: 'critical',
          category: 'injection',
          mitigation: 'Use parameterized queries with ? or %s placeholders',
          examples: {
            vulnerable: "cursor.execute(f\"SELECT * FROM users WHERE id = {user_id}\")",
            secure: "cursor.execute(\"SELECT * FROM users WHERE id = %s\", (user_id,))"
          }
        },
        'code-injection': {
          patterns: [
            /eval\s*\([^)]*input/g, // eval with user input
            /exec\s*\([^)]*input/g, // exec with user input
            /compile\s*\([^)]*input/g, // compile with user input
            /subprocess\.[^(]*\([^)]*input/g // subprocess with user input
          ],
          severity: 'critical',
          category: 'injection',
          mitigation: 'Avoid eval/exec with user input, use safe alternatives',
          examples: {
            vulnerable: "eval(user_code)",
            secure: "# Use ast.literal_eval for safe evaluation of literals"
          }
        },
        'deserialization': {
          patterns: [
            /pickle\.loads?\s*\([^)]*input/g, // pickle with user input
            /cPickle\.loads?\s*\([^)]*input/g, // cPickle with user input
            /yaml\.load\s*\([^)]*input/g, // unsafe yaml.load
            /marshal\.loads?\s*\([^)]*input/g // marshal with user input
          ],
          severity: 'high',
          category: 'deserialization',
          mitigation: 'Use safe deserialization methods like json.loads() or yaml.safe_load()',
          examples: {
            vulnerable: "pickle.loads(user_data)",
            secure: "json.loads(user_data)"
          }
        },
        'path-traversal': {
          patterns: [
            /open\s*\([^)]*\+.*input/g, // file open with concatenation
            /os\.path\.join\s*\([^)]*input.*\.\./g, // path join with ..
            /pathlib\.Path\s*\([^)]*input.*\.\./g, // pathlib with ..
            /\/[^\/]*\.\.\/[^\/]*/g // directory traversal patterns
          ],
          severity: 'high',
          category: 'path-traversal',
          mitigation: 'Validate file paths and use os.path.abspath() with restricted directories',
          examples: {
            vulnerable: "open(base_path + user_filename)",
            secure: "safe_path = os.path.join(base_path, os.path.basename(user_filename))"
          }
        }
      },
      express: {
        'route-injection': {
          patterns: [
            /req\.params\.[a-zA-Z_]+(?!\s*[|&])/g, // Unvalidated route params
            /req\.query\.[a-zA-Z_]+(?!\s*[|&])/g, // Unvalidated query params
            /req\.body\.[a-zA-Z_]+(?!\s*[|&])/g, // Unvalidated body params
            /\$\{req\.(params|query|body)\./g // Template literals with req data
          ],
          severity: 'medium',
          category: 'injection',
          mitigation: 'Validate and sanitize all request parameters',
          examples: {
            vulnerable: "const userId = req.params.id; // Direct use",
            secure: "const userId = validator.escape(req.params.id)"
          }
        },
        'cors-misconfiguration': {
          patterns: [
            /cors\s*\(\s*\{\s*origin\s*:\s*['"`]\*['"`]/g, // CORS wildcard
            /Access-Control-Allow-Origin.*\*/g, // Wildcard origin header
            /cors\s*\(\s*\{\s*credentials\s*:\s*true.*origin\s*:\s*['"`]\*['"`]/g // Credentials with wildcard
          ],
          severity: 'medium',
          category: 'cors',
          mitigation: 'Specify exact origins instead of wildcards, especially with credentials',
          examples: {
            vulnerable: "app.use(cors({origin: '*', credentials: true}))",
            secure: "app.use(cors({origin: 'https://trusted-domain.com', credentials: true}))"
          }
        },
        'middleware-bypass': {
          patterns: [
            /app\.(get|post|put|delete)\s*\(\s*['"`][^'"`]*['"`]\s*,\s*(?!.*auth)/g, // Routes without auth
            /router\.(get|post|put|delete)\s*\(\s*['"`][^'"`]*['"`]\s*,\s*(?!.*auth)/g, // Router without auth
            /app\.use\s*\(\s*(?!.*helmet)/g // Missing security middleware
          ],
          severity: 'medium',
          category: 'authentication',
          mitigation: 'Ensure all routes have appropriate authentication and security middleware',
          examples: {
            vulnerable: "app.get('/admin', (req, res) => { /* no auth */ })",
            secure: "app.get('/admin', authenticateToken, (req, res) => { /* protected */ })"
          }
        }
      },
      mysql: {
        'connection-security': {
          patterns: [
            /password\s*:\s*['"`][^'"`]+['"`]/g, // Hardcoded DB passwords
            /createConnection\s*\(\s*\{[^}]*ssl\s*:\s*false/g, // SSL disabled
            /mysql\s*:\/\/[^:]+:[^@]+@/g // Credentials in connection string
          ],
          severity: 'high',
          category: 'credentials',
          mitigation: 'Use environment variables for credentials and enable SSL',
          examples: {
            vulnerable: "mysql.createConnection({password: 'hardcoded123', ssl: false})",
            secure: "mysql.createConnection({password: process.env.DB_PASSWORD, ssl: true})"
          }
        }
      }
    };

    // Framework-specific rule mappings
    this.frameworkRuleMappings = {
      express: ['route-injection', 'cors-misconfiguration', 'middleware-bypass'],
      react: ['xss-prevention'],
      vue: ['xss-prevention'],
      angular: ['xss-prevention'],
      django: ['sql-injection', 'xss-prevention'],
      flask: ['sql-injection', 'xss-prevention'],
      fastapi: ['sql-injection']
    };

    // Database-specific rule mappings
    this.databaseRuleMappings = {
      mysql: ['connection-security'],
      postgresql: ['connection-security'],
      sqlite: ['sql-injection'],
      mongodb: ['injection']
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

    this.log('Starting accurate rule creation based on detected tech stacks');

    try {
      // Generate rules based on actual detected technologies
      const languageRules = await this.createLanguageSpecificRules(techStacks);
      const frameworkRules = await this.createFrameworkSpecificRules(techStacks);
      const databaseRules = await this.createDatabaseSpecificRules(techStacks);
      const goalBasedRules = await this.createGoalBasedRules(goals);

      // Consolidate all rules
      const allRules = [
        ...languageRules,
        ...frameworkRules,
        ...databaseRules,
        ...goalBasedRules
      ];

      const ruleSet = this.deduplicateRules(allRules);

    const result = {
      ruleSet,
      totalRules: ruleSet.length,
      rulesByCategory: this.categorizeRules(ruleSet),
      rulesByLanguage: this.groupRulesByLanguage(ruleSet),
        rulesByFramework: this.groupRulesByFramework(ruleSet),
      metadata: {
        techStacksProcessed: techStacks.length,
        goalsProcessed: goals.length,
          languagesDetected: techStacks.map(ts => ts.language),
          frameworksDetected: techStacks.flatMap(ts => ts.frameworks.map(f => f.name)),
          databasesDetected: techStacks.flatMap(ts => ts.databases.map(db => db.type))
      }
    };

    this.storeResult('ruleSet', ruleSet);
    this.storeResult('rulesByCategory', result.rulesByCategory);
      this.storeResult('metadata', result.metadata);

      this.log(`Generated ${ruleSet.length} accurate security rules for detected technologies`);

    return result;

    } catch (error) {
      this.log(`Error in rule creation: ${error.message}`, 'error');
      throw error;
    }
  }

  async createLanguageSpecificRules(techStacks) {
    this.log('Creating language-specific security rules');

    const rules = [];

    for (const stack of techStacks) {
      const language = stack.language;
      const languageTemplates = this.ruleTemplates[language];

      if (!languageTemplates) {
        this.log(`No rule templates found for ${language}`, 'warn');
        continue;
      }

      // Create rules for each vulnerability type in this language
      for (const [vulnType, template] of Object.entries(languageTemplates)) {
        for (const [index, pattern] of template.patterns.entries()) {
          rules.push({
            id: `${language}_${vulnType}_${index}`,
            type: vulnType,
            name: `${language.toUpperCase()} ${vulnType.replace('-', ' ')} Detection`,
            description: template.examples ? 
              `Detects ${vulnType.replace('-', ' ')} vulnerabilities in ${language} code. ${template.examples.vulnerable ? 'Example: ' + template.examples.vulnerable : ''}` :
              `Detects ${vulnType.replace('-', ' ')} vulnerabilities in ${language} code`,
            pattern: pattern,
            severity: template.severity,
            category: template.category,
            mitigation: template.mitigation,
            examples: template.examples || {},
            language: language,
            source: 'language-specific',
            confidence: stack.confidence,
            evidence: stack.evidence || [],
            cwe: this.getCWEMapping(vulnType),
            owasp: this.getOWASPMapping(vulnType)
          });
        }
      }

      this.log(`Created ${Object.keys(languageTemplates).length} rule types for ${language}`);
    }

    return rules;
  }

  async createFrameworkSpecificRules(techStacks) {
    this.log('Creating framework-specific security rules');

    const rules = [];

    for (const stack of techStacks) {
      for (const framework of stack.frameworks) {
        const frameworkName = framework.name;
        const frameworkTemplates = this.ruleTemplates[frameworkName];

        if (!frameworkTemplates) {
          // Check if framework has mapped rules in language templates
          const mappedRules = this.frameworkRuleMappings[frameworkName];
          if (mappedRules && this.ruleTemplates[stack.language]) {
            for (const ruleType of mappedRules) {
              const template = this.ruleTemplates[stack.language][ruleType];
              if (template) {
                for (const [index, pattern] of template.patterns.entries()) {
                  rules.push({
                    id: `${frameworkName}_${ruleType}_${index}`,
                    type: ruleType,
                    name: `${frameworkName.toUpperCase()} ${ruleType.replace('-', ' ')} Detection`,
                    description: `Framework-specific ${ruleType.replace('-', ' ')} detection for ${frameworkName}`,
                    pattern: pattern,
                    severity: template.severity,
                    category: template.category,
                    mitigation: template.mitigation,
                    language: stack.language,
                    framework: frameworkName,
                    source: 'framework-specific',
                    confidence: framework.confidence,
                    evidence: framework.evidence || [],
                    cwe: this.getCWEMapping(ruleType),
                    owasp: this.getOWASPMapping(ruleType)
                  });
                }
              }
            }
          }
          continue;
        }

        // Create rules for framework-specific templates
        for (const [vulnType, template] of Object.entries(frameworkTemplates)) {
          for (const [index, pattern] of template.patterns.entries()) {
            rules.push({
              id: `${frameworkName}_${vulnType}_${index}`,
              type: vulnType,
              name: `${frameworkName.toUpperCase()} ${vulnType.replace('-', ' ')} Detection`,
              description: template.examples ? 
                `Detects ${vulnType.replace('-', ' ')} in ${frameworkName} applications. ${template.examples.vulnerable ? 'Example: ' + template.examples.vulnerable : ''}` :
                `Detects ${vulnType.replace('-', ' ')} in ${frameworkName} applications`,
              pattern: pattern,
              severity: template.severity,
              category: template.category,
              mitigation: template.mitigation,
              examples: template.examples || {},
              language: stack.language,
              framework: frameworkName,
              source: 'framework-specific',
              confidence: framework.confidence,
              evidence: framework.evidence || [],
              cwe: this.getCWEMapping(vulnType),
              owasp: this.getOWASPMapping(vulnType)
            });
          }
        }

        this.log(`Created framework rules for ${frameworkName}`);
      }
    }

    return rules;
  }

  async createDatabaseSpecificRules(techStacks) {
    this.log('Creating database-specific security rules');

    const rules = [];

    for (const stack of techStacks) {
      for (const database of stack.databases) {
        const dbType = database.type;
        const dbTemplates = this.ruleTemplates[dbType];

        if (!dbTemplates) {
          // Check if database has mapped rules
          const mappedRules = this.databaseRuleMappings[dbType];
          if (mappedRules && this.ruleTemplates[stack.language]) {
            for (const ruleType of mappedRules) {
              const template = this.ruleTemplates[stack.language][ruleType];
              if (template) {
                for (const [index, pattern] of template.patterns.entries()) {
          rules.push({
                    id: `${dbType}_${ruleType}_${index}`,
                    type: ruleType,
                    name: `${dbType.toUpperCase()} ${ruleType.replace('-', ' ')} Detection`,
                    description: `Database-specific ${ruleType.replace('-', ' ')} detection for ${dbType}`,
                    pattern: pattern,
                    severity: template.severity,
                    category: template.category,
                    mitigation: template.mitigation,
            language: stack.language,
                    database: dbType,
                    source: 'database-specific',
                    confidence: database.confidence,
                    evidence: database.evidence || [],
                    cwe: this.getCWEMapping(ruleType),
                    owasp: this.getOWASPMapping(ruleType)
                  });
                }
              }
            }
          }
          continue;
        }

        // Create rules for database-specific templates
        for (const [vulnType, template] of Object.entries(dbTemplates)) {
          for (const [index, pattern] of template.patterns.entries()) {
            rules.push({
              id: `${dbType}_${vulnType}_${index}`,
              type: vulnType,
              name: `${dbType.toUpperCase()} ${vulnType.replace('-', ' ')} Detection`,
              description: template.examples ? 
                `Detects ${vulnType.replace('-', ' ')} in ${dbType} usage. ${template.examples.vulnerable ? 'Example: ' + template.examples.vulnerable : ''}` :
                `Detects ${vulnType.replace('-', ' ')} in ${dbType} usage`,
              pattern: pattern,
              severity: template.severity,
              category: template.category,
              mitigation: template.mitigation,
              examples: template.examples || {},
              database: dbType,
              source: 'database-specific',
              confidence: database.confidence,
              evidence: database.evidence || [],
              cwe: this.getCWEMapping(vulnType),
              owasp: this.getOWASPMapping(vulnType)
            });
          }
        }

        this.log(`Created database rules for ${dbType}`);
      }
    }

    return rules;
  }

  async createGoalBasedRules(goals) {
    this.log('Creating goal-based security rules');
    
    const rules = [];

    for (const goal of goals) {
    if (goal.rules && Array.isArray(goal.rules)) {
        for (const ruleName of goal.rules) {
          // Find the rule template in any language/framework
          let template = null;
          let sourceLanguage = null;

          // Search through all language templates
          for (const [lang, langTemplates] of Object.entries(this.ruleTemplates)) {
            if (langTemplates[ruleName]) {
              template = langTemplates[ruleName];
              sourceLanguage = lang;
              break;
            }
          }

          if (template) {
            for (const [index, pattern] of template.patterns.entries()) {
            rules.push({
                id: `goal_${goal.type}_${ruleName}_${index}`,
              type: ruleName,
                name: `Goal-based ${ruleName.replace('-', ' ')} Detection`,
              description: `Rule created for goal: ${goal.description}`,
                pattern: pattern,
              severity: template.severity,
                category: template.category,
                mitigation: template.mitigation,
                examples: template.examples || {},
                source: 'goal-based',
                goalType: goal.type,
                goalDescription: goal.description,
                priority: goal.priority,
                language: sourceLanguage,
                cwe: this.getCWEMapping(ruleName),
                owasp: this.getOWASPMapping(ruleName)
              });
            }
          }
        }
      }

      this.log(`Created goal-based rules for: ${goal.description}`);
    }

    return rules;
  }

  deduplicateRules(rules) {
    const uniqueRules = [];
    const ruleSignatures = new Set();

    for (const rule of rules) {
      // Create a signature based on pattern and type
      const signature = `${rule.type}_${rule.pattern.toString()}`;
      
      if (!ruleSignatures.has(signature)) {
        ruleSignatures.add(signature);
        uniqueRules.push(rule);
      }
    }

    // Sort by severity and confidence
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };

    return uniqueRules.sort((a, b) => {
      const aSeverity = severityOrder[a.severity] || 0;
      const bSeverity = severityOrder[b.severity] || 0;
      
      if (aSeverity !== bSeverity) {
      return bSeverity - aSeverity;
      }
      
      return (b.confidence || 0) - (a.confidence || 0);
    });
  }

  categorizeRules(rules) {
    const categories = {};

    for (const rule of rules) {
      const category = rule.category || 'other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(rule);
    }

    return categories;
  }

  groupRulesByLanguage(rules) {
    const languages = {};

    for (const rule of rules) {
      if (rule.language) {
        if (!languages[rule.language]) {
          languages[rule.language] = [];
        }
        languages[rule.language].push(rule);
      }
    }

    return languages;
  }

  groupRulesByFramework(rules) {
    const frameworks = {};

    for (const rule of rules) {
      if (rule.framework) {
        if (!frameworks[rule.framework]) {
          frameworks[rule.framework] = [];
        }
        frameworks[rule.framework].push(rule);
      }
    }

    return frameworks;
  }

  getCWEMapping(vulnType) {
    const cweMap = {
      'sql-injection': 'CWE-89',
      'xss-prevention': 'CWE-79',
      'command-injection': 'CWE-78',
      'code-injection': 'CWE-94',
      'hardcoded-secrets': 'CWE-798',
      'deserialization': 'CWE-502',
      'path-traversal': 'CWE-22',
      'route-injection': 'CWE-20',
      'cors-misconfiguration': 'CWE-346',
      'middleware-bypass': 'CWE-285',
      'connection-security': 'CWE-319'
    };

    return cweMap[vulnType] || 'CWE-20';
  }

  getOWASPMapping(vulnType) {
    const owaspMap = {
      'sql-injection': 'A03:2021 – Injection',
      'xss-prevention': 'A03:2021 – Injection',
      'command-injection': 'A03:2021 – Injection',
      'code-injection': 'A03:2021 – Injection',
      'hardcoded-secrets': 'A07:2021 – Identification and Authentication Failures',
      'deserialization': 'A08:2021 – Software and Data Integrity Failures',
      'path-traversal': 'A01:2021 – Broken Access Control',
      'route-injection': 'A03:2021 – Injection',
      'cors-misconfiguration': 'A05:2021 – Security Misconfiguration',
      'middleware-bypass': 'A01:2021 – Broken Access Control',
      'connection-security': 'A02:2021 – Cryptographic Failures'
    };

    return owaspMap[vulnType] || 'A06:2021 – Vulnerable and Outdated Components';
  }
}
