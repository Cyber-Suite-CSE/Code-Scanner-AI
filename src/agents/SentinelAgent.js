import { BaseAgent } from '../core/BaseAgent.js';
import path from 'path';
import fs from 'fs-extra';

export class SentinelAgent extends BaseAgent {
  constructor(toolRegistry, anthropicService, options = {}) {
    super('Sentinel', toolRegistry, anthropicService, options);
    this.techStackPatterns = {
      javascript: {
        files: ['package.json', '*.js', '*.mjs', '*.jsx'],
        frameworks: {
          react: ['react', 'jsx', 'tsx'],
          vue: ['vue'],
          angular: ['@angular', 'angular'],
          express: ['express'],
          next: ['next'],
          nuxt: ['nuxt']
        }
      },
      typescript: {
        files: ['tsconfig.json', '*.ts', '*.tsx'],
        frameworks: {
          angular: ['@angular'],
          nest: ['@nestjs']
        }
      },
      python: {
        files: ['requirements.txt', 'setup.py', 'pyproject.toml', '*.py'],
        frameworks: {
          django: ['django'],
          flask: ['flask'],
          fastapi: ['fastapi'],
          pyramid: ['pyramid']
        }
      },
      java: {
        files: ['pom.xml', 'build.gradle', '*.java'],
        frameworks: {
          spring: ['spring'],
          struts: ['struts'],
          hibernate: ['hibernate']
        }
      },
      csharp: {
        files: ['*.csproj', '*.sln', '*.cs'],
        frameworks: {
          dotnet: ['.net', 'dotnet'],
          aspnet: ['asp.net']
        }
      },
      php: {
        files: ['composer.json', '*.php'],
        frameworks: {
          laravel: ['laravel'],
          symfony: ['symfony'],
          codeigniter: ['codeigniter']
        }
      },
      go: {
        files: ['go.mod', 'go.sum', '*.go'],
        frameworks: {
          gin: ['gin'],
          echo: ['echo'],
          fiber: ['fiber']
        }
      },
      rust: {
        files: ['Cargo.toml', '*.rs'],
        frameworks: {
          actix: ['actix'],
          rocket: ['rocket'],
          warp: ['warp']
        }
      }
    };
  }

  async onInitialize() {
    this.log('Initializing Sentinel Agent for tech stack identification');
    this.setContext('patterns', this.techStackPatterns);
  }

  async onExecute(input) {
    const { codebasePath } = input;

    if (!codebasePath) {
      throw new Error('Codebase path is required for Sentinel Agent');
    }

    this.log('Starting AI-powered tech stack identification');

    // First, gather basic file structure and samples
    const fileAnalysis = await this.gatherCodeSamples(codebasePath);

    // Use AI to analyze the tech stack
    const aiAnalysis = await this.performAITechStackAnalysis(fileAnalysis);

    // Combine with traditional pattern-based analysis
    const traditionalAnalysis = await this.parallel([
      () => this.analyzeFileStructure(codebasePath),
      () => this.identifyLanguages(codebasePath),
      () => this.detectFrameworks(codebasePath),
      () => this.findEntryPoints(codebasePath)
    ]);

    // Merge AI and traditional analysis
    const techStacks = this.mergeAnalysisResults(aiAnalysis, traditionalAnalysis.successful);
    const goals = await this.generateAIGoals(techStacks, aiAnalysis);
    const entryPoints = this.extractEntryPoints(traditionalAnalysis.successful);

    const result = {
      techStacks,
      goals,
      entryPoints,
      aiAnalysis: aiAnalysis.summary,
      analysisDetails: {
        totalFiles: fileAnalysis.totalFiles,
        scannedDirectories: fileAnalysis.directories,
        detectedPatterns: fileAnalysis.patterns
      }
    };

    this.storeResult('techStacks', techStacks);
    this.storeResult('goals', goals);
    this.storeResult('entryPoints', entryPoints);
    this.storeResult('aiAnalysis', aiAnalysis);

    this.log(`AI-powered analysis completed: ${techStacks.length} tech stacks, ${goals.length} goals`);

    return result;
  }

  async analyzeFileStructure(codebasePath) {
    this.log('Analyzing file structure');

    try {
      const result = await this.useTool('regex-search', 'searchFiles', {
        directory: codebasePath,
        pattern: '*',
        includeDirectories: true,
        maxDepth: 3
      });

      // Handle the new result structure
      let files = [];
      if (result.result && result.result.results) {
        files = result.result.results.map(r => r.file);
      } else if (result.result && Array.isArray(result.result)) {
        files = result.result;
      }

      return {
        type: 'file-structure',
        files: files,
        directories: [] // We'll populate this differently if needed
      };
    } catch (error) {
      this.log(`File structure analysis failed: ${error.message}`, 'warn');
      return { type: 'file-structure', files: [], directories: [] };
    }
  }

  async identifyLanguages(codebasePath) {
    this.log('Identifying programming languages');

    const languageResults = {};

    for (const [language, config] of Object.entries(this.techStackPatterns)) {
      try {
        let found = false;

        for (const filePattern of config.files) {
          const result = await this.useTool('regex-search', 'searchFiles', {
            directory: codebasePath,
            pattern: filePattern,
            fileOnly: true
          });

          // Handle the new result structure
          let files = [];
          if (result.result && result.result.results) {
            files = result.result.results.map(r => r.file);
          } else if (result.result && Array.isArray(result.result)) {
            files = result.result;
          }

          if (files.length > 0) {
            found = true;
            languageResults[language] = {
              confidence: this.calculateLanguageConfidence(files, filePattern),
              files: files,
              pattern: filePattern
            };
            break;
          }
        }

        if (!found) {
          languageResults[language] = { confidence: 0, files: [], pattern: null };
        }
      } catch (error) {
        this.log(`Error detecting ${language}: ${error.message}`, 'warn');
        languageResults[language] = { confidence: 0, files: [], pattern: null };
      }
    }

    return { type: 'languages', results: languageResults };
  }

  async detectFrameworks(codebasePath) {
    this.log('Detecting frameworks');

    const frameworkResults = {};

    for (const [language, config] of Object.entries(this.techStackPatterns)) {
      if (!config.frameworks) continue;

      frameworkResults[language] = {};

      for (const [framework, keywords] of Object.entries(config.frameworks)) {
        try {
          let confidence = 0;

          for (const keyword of keywords) {
            const result = await this.useTool('regex-search', 'searchFiles', {
              directory: codebasePath,
              pattern: keyword,
              searchContent: true
            });

            // Handle the new result structure
            let matchCount = 0;
            if (result.result && result.result.results) {
              matchCount = result.result.results.length;
            } else if (result.result && Array.isArray(result.result)) {
              matchCount = result.result.length;
            }

            if (matchCount > 0) {
              confidence += matchCount * 0.1;
            }
          }

          frameworkResults[language][framework] = {
            confidence: Math.min(confidence, 1.0),
            keywords
          };
        } catch (error) {
          this.log(`Error detecting framework ${framework}: ${error.message}`, 'warn');
          frameworkResults[language][framework] = { confidence: 0, keywords };
        }
      }
    }

    return { type: 'frameworks', results: frameworkResults };
  }

  async findEntryPoints(codebasePath) {
    this.log('Finding entry points');

    const entryPointPatterns = {
      'main.js': 'javascript',
      'index.js': 'javascript',
      'app.js': 'javascript',
      'server.js': 'javascript',
      'main.py': 'python',
      'app.py': 'python',
      'manage.py': 'python',
      'main.java': 'java',
      'Application.java': 'java',
      'Program.cs': 'csharp',
      'main.go': 'go',
      'main.rs': 'rust'
    };

    const entryPoints = [];

    for (const [filename, language] of Object.entries(entryPointPatterns)) {
      try {
        const result = await this.useTool('regex-search', 'searchFiles', {
          directory: codebasePath,
          pattern: filename,
          exactMatch: true
        });

        // Handle the new result structure
        let files = [];
        if (result.result && result.result.results) {
          files = result.result.results.map(r => r.file);
        } else if (result.result && Array.isArray(result.result)) {
          files = result.result;
        }

        if (files.length > 0) {
          entryPoints.push({
            file: files[0],
            language,
            type: 'main-entry',
            confidence: 0.9
          });
        }
      } catch (error) {
        this.log(`Error finding entry point ${filename}: ${error.message}`, 'warn');
      }
    }

    // Look for common server/API entry points
    const serverPatterns = ['server', 'app', 'api', 'service'];

    for (const pattern of serverPatterns) {
      try {
        const result = await this.useTool('regex-search', 'searchFiles', {
          directory: codebasePath,
          pattern: `*${pattern}*`,
          searchContent: false
        });

        // Handle the new result structure
        let files = [];
        if (result.result && result.result.results) {
          files = result.result.results.map(r => r.file);
        } else if (result.result && Array.isArray(result.result)) {
          files = result.result;
        }

        if (files.length > 0) {
          files.forEach(file => {
            const ext = path.extname(file);
            const language = this.getLanguageFromExtension(ext);

            if (language) {
              entryPoints.push({
                file,
                language,
                type: 'server-entry',
                confidence: 0.7
              });
            }
          });
        }
      } catch (error) {
        this.log(`Error finding server entries with pattern ${pattern}: ${error.message}`, 'warn');
      }
    }

    return { type: 'entry-points', points: entryPoints };
  }

  calculateLanguageConfidence(files, pattern) {
    const baseConfidence = 0.3;
    const fileCountBonus = Math.min(files.length * 0.1, 0.6);
    const patternBonus = this.getPatternImportance(pattern);

    return Math.min(baseConfidence + fileCountBonus + patternBonus, 1.0);
  }

  getPatternImportance(pattern) {
    const importantPatterns = {
      'package.json': 0.4,
      'requirements.txt': 0.4,
      'pom.xml': 0.4,
      'Cargo.toml': 0.4,
      'go.mod': 0.4,
      'tsconfig.json': 0.3
    };

    return importantPatterns[pattern] || 0.1;
  }

  getLanguageFromExtension(ext) {
    const extensionMap = {
      '.js': 'javascript',
      '.mjs': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cs': 'csharp',
      '.php': 'php',
      '.go': 'go',
      '.rs': 'rust'
    };

    return extensionMap[ext.toLowerCase()] || null;
  }

  consolidateTechStacks(analysisResults) {
    const techStacks = [];

    const languageResult = analysisResults.find(r => r.type === 'languages');
    const frameworkResult = analysisResults.find(r => r.type === 'frameworks');

    if (!languageResult) return techStacks;

    for (const [language, data] of Object.entries(languageResult.results)) {
      if (data.confidence > 0.5) {
        const stack = {
          language,
          confidence: data.confidence,
          files: data.files,
          frameworks: []
        };

        // Add frameworks
        if (frameworkResult && frameworkResult.results[language]) {
          for (const [framework, fwData] of Object.entries(frameworkResult.results[language])) {
            if (fwData.confidence > 0.3) {
              stack.frameworks.push({
                name: framework,
                confidence: fwData.confidence
              });
            }
          }
        }

        techStacks.push(stack);
      }
    }

    return techStacks.sort((a, b) => b.confidence - a.confidence);
  }

  generateGoals(techStacks) {
    const goals = [];

    techStacks.forEach(stack => {
      // Language-specific goals
      goals.push({
        type: 'language-security',
        target: stack.language,
        description: `Analyze ${stack.language} code for security vulnerabilities`,
        priority: 'high',
        rules: this.getLanguageSecurityRules(stack.language)
      });

      // Framework-specific goals
      stack.frameworks.forEach(framework => {
        goals.push({
          type: 'framework-security',
          target: framework.name,
          description: `Check ${framework.name} specific security patterns`,
          priority: 'medium',
          rules: this.getFrameworkSecurityRules(framework.name)
        });
      });
    });

    // General security goals
    goals.push({
      type: 'general-security',
      target: 'all',
      description: 'Perform general security analysis across all files',
      priority: 'high',
      rules: ['hardcoded-secrets', 'sensitive-data-exposure', 'authentication-bypass']
    });

    return goals;
  }

  getLanguageSecurityRules(language) {
    const languageRules = {
      javascript: ['xss-prevention', 'prototype-pollution', 'eval-usage'],
      python: ['sql-injection', 'code-injection', 'deserialization'],
      java: ['injection-attacks', 'path-traversal', 'deserialization'],
      csharp: ['sql-injection', 'xss-prevention', 'path-traversal'],
      php: ['sql-injection', 'file-inclusion', 'code-injection'],
      go: ['sql-injection', 'path-traversal', 'race-conditions'],
      rust: ['unsafe-code', 'memory-safety', 'integer-overflow']
    };

    return languageRules[language] || ['general-security'];
  }

  getFrameworkSecurityRules(framework) {
    const frameworkRules = {
      react: ['xss-prevention', 'state-injection'],
      express: ['route-security', 'middleware-bypass'],
      django: ['csrf-protection', 'sql-injection'],
      flask: ['template-injection', 'session-security'],
      spring: ['deserialization', 'path-traversal'],
      laravel: ['mass-assignment', 'sql-injection']
    };

    return frameworkRules[framework] || ['framework-general'];
  }

  extractEntryPoints(analysisResults) {
    const entryPointResult = analysisResults.find(r => r.type === 'entry-points');

    if (!entryPointResult) return [];

    return entryPointResult.points
      .filter(point => point.confidence > 0.5)
      .sort((a, b) => b.confidence - a.confidence);
  }

  async gatherCodeSamples(codebasePath) {
    this.log('Gathering code samples for AI analysis');

    try {
      // Get file list
      const fileResult = await this.useTool('regex-search', 'searchFiles', {
        directory: codebasePath,
        pattern: '*',
        excludeDirectories: this.options.excludeDirectories || ['node_modules', '.git'],
        fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.json', '.xml', '.yml']
      });

      const files = fileResult.result || [];
      const samples = {
        configFiles: [],
        codeFiles: [],
        packageFiles: [],
        totalFiles: files.length,
        directories: [],
        patterns: []
      };

      // Read key configuration files
      const configPatterns = ['package.json', 'pom.xml', 'requirements.txt', 'Cargo.toml', 'go.mod'];

      for (const file of files) {
        const fileName = path.basename(file.file || file);

        if (configPatterns.some(pattern => fileName.toLowerCase().includes(pattern.toLowerCase()))) {
          try {
            const content = await fs.readFile(file.file || file, 'utf-8');
            samples.configFiles.push({
              file: fileName,
              content: content.substring(0, 2000), // Limit content size
              path: file.file || file
            });
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }

      // Sample some code files
      const codeFiles = files.filter(f => {
        const fileName = f.file || f;
        return fileName.match(/\.(js|jsx|ts|tsx|py|java|cs|php|go|rs)$/i);
      });

      for (let i = 0; i < Math.min(10, codeFiles.length); i++) {
        try {
          const filePath = codeFiles[i].file || codeFiles[i];
          const content = await fs.readFile(filePath, 'utf-8');
          samples.codeFiles.push({
            file: path.basename(filePath),
            content: content.substring(0, 1500), // Limit content size
            path: filePath,
            extension: path.extname(filePath)
          });
        } catch (error) {
          // Skip files that can't be read
        }
      }

      return samples;

    } catch (error) {
      this.log(`Error gathering code samples: ${error.message}`, 'warn');
      return { configFiles: [], codeFiles: [], totalFiles: 0, directories: [], patterns: [] };
    }
  }

  async performAITechStackAnalysis(fileAnalysis) {
    this.log('Performing AI tech stack analysis');

    const codeSnippets = [
      ...fileAnalysis.configFiles.map(f => f.content),
      ...fileAnalysis.codeFiles.map(f => f.content)
    ].join('\n\n---\n\n');

    try {
      const aiResult = await this.analyzeWithAI(codeSnippets,
        `Analyze this codebase and identify:
1. Programming languages used (with confidence scores 0-1)
2. Frameworks and libraries detected
3. Application architecture type (web app, API, desktop, etc.)
4. Development stack (frontend/backend technologies)
5. Key dependencies and their purposes
6. Potential security concerns based on the tech stack

Files analyzed: ${fileAnalysis.configFiles.length} config files, ${fileAnalysis.codeFiles.length} code files

Provide response in JSON format with:
{
  "languages": [{"name": "javascript", "confidence": 0.95, "evidence": ["package.json", "*.js files"]}],
  "frameworks": [{"name": "react", "confidence": 0.8, "evidence": ["react dependency"]}],
  "architecture": {"type": "web-application", "description": "..."},
  "dependencies": [{"name": "express", "purpose": "web server", "security_notes": "..."}],
  "security_considerations": ["potential XSS risks", "SQL injection concerns"],
  "summary": "..."
}`,
        {
          task: 'tech-stack-identification',
          fileCount: fileAnalysis.totalFiles
        }
      );

      // Parse AI response
      let parsedAnalysis;
      try {
        // Extract JSON from AI response
        const jsonMatch = aiResult.analysis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedAnalysis = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: create structured response from text
          parsedAnalysis = this.parseTextAnalysis(aiResult.analysis);
        }
      } catch (parseError) {
        this.log(`Failed to parse AI response, using text analysis: ${parseError.message}`, 'warn');
        parsedAnalysis = this.parseTextAnalysis(aiResult.analysis);
      }

      return {
        ...parsedAnalysis,
        rawAnalysis: aiResult.analysis,
        summary: parsedAnalysis.summary || 'AI analysis completed',
        confidence: 0.9
      };

    } catch (error) {
      this.log(`AI analysis failed: ${error.message}`, 'warn');

      // Fallback to basic analysis
      return {
        languages: [],
        frameworks: [],
        architecture: { type: 'unknown', description: 'AI analysis unavailable' },
        dependencies: [],
        security_considerations: [],
        summary: 'Fallback analysis - AI unavailable',
        confidence: 0.3
      };
    }
  }

  parseTextAnalysis(analysisText) {
    // Simple text parsing fallback
    const languages = [];
    const frameworks = [];

    const commonLanguages = ['javascript', 'typescript', 'python', 'java', 'go', 'rust'];
    const commonFrameworks = ['react', 'vue', 'angular', 'express', 'django', 'spring'];

    commonLanguages.forEach(lang => {
      if (analysisText.toLowerCase().includes(lang)) {
        languages.push({
          name: lang,
          confidence: 0.7,
          evidence: ['text analysis']
        });
      }
    });

    commonFrameworks.forEach(framework => {
      if (analysisText.toLowerCase().includes(framework)) {
        frameworks.push({
          name: framework,
          confidence: 0.6,
          evidence: ['text analysis']
        });
      }
    });

    return {
      languages,
      frameworks,
      architecture: { type: 'web-application', description: 'Inferred from analysis' },
      dependencies: [],
      security_considerations: ['General security review needed'],
      summary: analysisText.substring(0, 200)
    };
  }

  mergeAnalysisResults(aiAnalysis, traditionalAnalysis) {
    const merged = [];

    // Process AI-identified languages
    aiAnalysis.languages?.forEach(aiLang => {
      merged.push({
        language: aiLang.name,
        confidence: aiLang.confidence,
        source: 'ai-analysis',
        evidence: aiLang.evidence,
        frameworks: aiAnalysis.frameworks
          ?.filter(f => f.name.toLowerCase().includes(aiLang.name) ||
                     this.isFrameworkForLanguage(f.name, aiLang.name))
          ?.map(f => ({
            name: f.name,
            confidence: f.confidence
          })) || []
      });
    });

    // Enhance with traditional analysis
    const languageResult = traditionalAnalysis.find(r => r.type === 'languages');
    if (languageResult) {
      Object.entries(languageResult.results).forEach(([language, data]) => {
        if (data.confidence > 0.5) {
          const existing = merged.find(m => m.language === language);
          if (existing) {
            // Boost confidence if both methods agree
            existing.confidence = Math.min(1.0, existing.confidence + 0.2);
            existing.files = data.files;
          } else {
            // Add language not detected by AI
            merged.push({
              language,
              confidence: data.confidence,
              source: 'pattern-analysis',
              files: data.files,
              frameworks: []
            });
          }
        }
      });
    }

    return merged.sort((a, b) => b.confidence - a.confidence);
  }

  isFrameworkForLanguage(framework, language) {
    const associations = {
      'javascript': ['react', 'vue', 'angular', 'express', 'node', 'next'],
      'python': ['django', 'flask', 'fastapi'],
      'java': ['spring', 'struts', 'hibernate'],
      'go': ['gin', 'echo'],
      'rust': ['actix', 'rocket']
    };

    return associations[language]?.includes(framework.toLowerCase()) || false;
  }

  async generateAIGoals(techStacks, aiAnalysis) {
    this.log('Generating AI-powered security goals');

    const securityConsiderations = aiAnalysis.security_considerations || [];
    const prompt = `Based on the identified technology stack and security considerations, generate specific security analysis goals:

Technology Stacks: ${JSON.stringify(techStacks.slice(0, 5), null, 2)}

Security Considerations: ${JSON.stringify(securityConsiderations, null, 2)}

Generate 5-8 specific security goals in JSON format:
{
  "goals": [
    {
      "type": "language-security",
      "target": "javascript",
      "description": "Analyze JavaScript code for XSS and prototype pollution",
      "priority": "high",
      "rules": ["xss-prevention", "prototype-pollution"],
      "rationale": "JavaScript applications are prone to XSS attacks"
    }
  ]
}

Focus on the most critical security concerns for the identified technologies.`;

    try {
      const aiResult = await this.analyzeWithAI('', prompt, {
        task: 'security-goal-generation',
        techStackCount: techStacks.length
      });

      let goals;
      try {
        const jsonMatch = aiResult.analysis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          goals = parsed.goals || [];
        } else {
          goals = this.generateFallbackGoals(techStacks);
        }
      } catch (parseError) {
        goals = this.generateFallbackGoals(techStacks);
      }

      // Add general goals
      goals.push({
        type: 'general-security',
        target: 'all',
        description: 'Perform comprehensive security analysis',
        priority: 'high',
        rules: ['hardcoded-secrets', 'sensitive-data-exposure'],
        rationale: 'Universal security concerns'
      });

      return goals;

    } catch (error) {
      this.log(`AI goal generation failed: ${error.message}`, 'warn');
      return this.generateFallbackGoals(techStacks);
    }
  }

  generateFallbackGoals(techStacks) {
    const goals = [];

    techStacks.forEach(stack => {
      goals.push({
        type: 'language-security',
        target: stack.language,
        description: `Security analysis for ${stack.language}`,
        priority: 'high',
        rules: this.getLanguageSecurityRules(stack.language),
        rationale: `Language-specific security analysis`
      });
    });

    return goals;
  }
}