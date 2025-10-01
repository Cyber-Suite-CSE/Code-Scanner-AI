import { BaseAgent } from '../core/BaseAgent.js';
import path from 'path';
import fs from 'fs-extra';

export class SentinelAgent extends BaseAgent {
  constructor(toolRegistry, aiService, options = {}) {
    super('Sentinel', toolRegistry, aiService, options);
    
    // Language detection patterns - more precise
    this.languagePatterns = {
      javascript: {
        fileExtensions: ['.js', '.mjs', '.jsx'],
        configFiles: ['package.json', '.npmrc', 'yarn.lock', 'package-lock.json'],
        indicators: ['require(', 'import ', 'module.exports', 'exports.', 'console.log']
      },
      typescript: {
        fileExtensions: ['.ts', '.tsx'],
        configFiles: ['tsconfig.json', 'tslint.json'],
        indicators: ['interface ', 'type ', ': string', ': number', 'export type']
      },
      python: {
        fileExtensions: ['.py', '.pyw', '.pyx'],
        configFiles: ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile'],
        indicators: ['import ', 'from ', 'def ', 'class ', 'if __name__']
      },
      java: {
        fileExtensions: ['.java'],
        configFiles: ['pom.xml', 'build.gradle', 'gradle.properties'],
        indicators: ['public class', 'import java', 'public static void main']
      },
      php: {
        fileExtensions: ['.php', '.phtml'],
        configFiles: ['composer.json', 'composer.lock'],
        indicators: ['<?php', 'namespace ', 'use ', 'class ', 'function ']
      },
      go: {
        fileExtensions: ['.go'],
        configFiles: ['go.mod', 'go.sum'],
        indicators: ['package ', 'import ', 'func ', 'type ', 'var ']
      },
      rust: {
        fileExtensions: ['.rs'],
        configFiles: ['Cargo.toml', 'Cargo.lock'],
        indicators: ['fn ', 'let ', 'struct ', 'impl ', 'use ']
      },
      csharp: {
        fileExtensions: ['.cs'],
        configFiles: ['*.csproj', '*.sln', 'packages.config'],
        indicators: ['using ', 'namespace ', 'public class', 'static void Main']
      }
    };

    // Framework detection patterns - more specific
    this.frameworkPatterns = {
      javascript: {
        express: {
          packageIndicators: ['express'],
          codeIndicators: ['express()', 'app.get(', 'app.post(', 'app.listen(']
        },
        react: {
          packageIndicators: ['react', 'react-dom'],
          codeIndicators: ['React.', 'useState', 'useEffect', 'JSX.Element']
        },
        vue: {
          packageIndicators: ['vue'],
          codeIndicators: ['Vue.', 'createApp', 'defineComponent']
        },
        angular: {
          packageIndicators: ['@angular/core'],
          codeIndicators: ['@Component', '@Injectable', 'NgModule']
        },
        nextjs: {
          packageIndicators: ['next'],
          codeIndicators: ['getServerSideProps', 'getStaticProps', 'useRouter']
        },
        nestjs: {
          packageIndicators: ['@nestjs/core'],
          codeIndicators: ['@Controller', '@Injectable', '@Module']
        }
      },
      python: {
        django: {
          packageIndicators: ['Django', 'django'],
          codeIndicators: ['from django', 'models.Model', 'HttpResponse']
        },
        flask: {
          packageIndicators: ['Flask', 'flask'],
          codeIndicators: ['from flask', 'Flask(__name__)', '@app.route']
        },
        fastapi: {
          packageIndicators: ['fastapi'],
          codeIndicators: ['from fastapi', 'FastAPI()', '@app.get']
        },
        tornado: {
          packageIndicators: ['tornado'],
          codeIndicators: ['tornado.web', 'RequestHandler']
        }
      },
      java: {
        spring: {
          packageIndicators: ['spring-boot', 'spring-core'],
          codeIndicators: ['@SpringBootApplication', '@RestController', '@Autowired']
        },
        struts: {
          packageIndicators: ['struts2-core'],
          codeIndicators: ['extends ActionSupport', 'struts.xml']
        }
      },
      php: {
        laravel: {
          packageIndicators: ['laravel/framework'],
          codeIndicators: ['Illuminate\\', 'Artisan::', 'Route::']
        },
        symfony: {
          packageIndicators: ['symfony/symfony'],
          codeIndicators: ['Symfony\\', 'use Symfony']
        }
      }
    };

    // Database patterns
    this.databasePatterns = {
      mysql: ['mysql', 'mysql2', 'pymysql', 'MySQLdb'],
      postgresql: ['pg', 'psycopg2', 'postgresql'],
      sqlite: ['sqlite3', 'better-sqlite3'],
      mongodb: ['mongodb', 'mongoose', 'pymongo'],
      redis: ['redis', 'ioredis']
    };
  }

  async onInitialize() {
    this.log('Initializing Sentinel Agent for accurate tech stack identification');
  }

  async onExecute(input) {
    const { codebasePath } = input;

    if (!codebasePath) {
      throw new Error('Codebase path is required for Sentinel Agent');
    }

    this.log('Starting accurate tech stack identification');

    try {
      // Step 1: Scan directory structure and get all files
      this.log('Scanning codebase directory structure...');
      await this.addProcessingDelay(800);
      const fileStructure = await this.scanDirectoryStructure(codebasePath);
      
      // Step 2: Identify languages based on actual file extensions and content
      this.log('Analyzing file types and identifying programming languages...');
      await this.addProcessingDelay(1000);
      const languages = await this.identifyLanguagesAccurately(fileStructure);
      
      // Step 3: Detect frameworks based on dependencies and code patterns
      this.log('Detecting frameworks and technology patterns...');
      await this.addProcessingDelay(1200);
      const frameworks = await this.detectFrameworksAccurately(fileStructure, languages);
      
      // Step 4: Identify databases and external services
      this.log('Identifying databases and external service dependencies...');
      await this.addProcessingDelay(700);
      const databases = await this.identifyDatabases(fileStructure);
      
      // Step 5: Find entry points
      this.log('Mapping application entry points and API endpoints...');
      await this.addProcessingDelay(600);
      const entryPoints = await this.findEntryPoints(fileStructure, languages);
      
      // Step 6: Generate security goals based on actual tech stack
      this.log('Generating tailored security objectives...');
      await this.addProcessingDelay(500);
      const goals = await this.generateSecurityGoals(languages, frameworks, databases);

    const result = {
        techStacks: this.consolidateTechStacks(languages, frameworks, databases),
      goals,
      entryPoints,
      analysisDetails: {
          totalFiles: fileStructure.allFiles.length,
          scannedDirectories: fileStructure.directories,
          detectedLanguages: Object.keys(languages),
          detectedFrameworks: Object.keys(frameworks).filter(lang => Object.keys(frameworks[lang]).length > 0)
        }
      };

      this.storeResult('techStacks', result.techStacks);
      this.storeResult('goals', result.goals);
      this.storeResult('entryPoints', result.entryPoints);

      this.log(`Accurate analysis completed: ${result.techStacks.length} tech stacks, ${result.goals.length} goals`);

    return result;

    } catch (error) {
      this.log(`Error in tech stack identification: ${error.message}`, 'error');
      throw error;
    }
  }

  async scanDirectoryStructure(codebasePath) {
    this.log('Scanning directory structure');
    
    const structure = {
      allFiles: [],
      directories: [],
      filesByExtension: {},
      configFiles: [],
      codeFiles: []
    };

    try {
      const scanDir = async (dirPath, relativePath = '') => {
        const items = await fs.readdir(dirPath);
        
        for (const item of items) {
          const fullPath = path.join(dirPath, item);
          const relativeItemPath = path.join(relativePath, item);
          const stat = await fs.stat(fullPath);

          if (stat.isDirectory()) {
            // Skip common ignore directories
            if (!['node_modules', '.git', '__pycache__', '.venv', 'venv', 'target', 'build', 'dist'].includes(item)) {
              structure.directories.push(relativeItemPath);
              await scanDir(fullPath, relativeItemPath);
            }
          } else if (stat.isFile()) {
            const ext = path.extname(item).toLowerCase();
            
            structure.allFiles.push({
              path: fullPath,
              relativePath: relativeItemPath,
              name: item,
              extension: ext,
              size: stat.size
            });

            // Categorize by extension
            if (!structure.filesByExtension[ext]) {
              structure.filesByExtension[ext] = [];
            }
            structure.filesByExtension[ext].push({
              path: fullPath,
              relativePath: relativeItemPath,
              name: item
            });

            // Identify config files
            const configFileNames = [
              'package.json', 'requirements.txt', 'pom.xml', 'build.gradle',
              'Cargo.toml', 'go.mod', 'composer.json', 'tsconfig.json'
            ];
            
            if (configFileNames.includes(item) || item.endsWith('.config.js') || item.endsWith('.json')) {
              structure.configFiles.push({
                path: fullPath,
                relativePath: relativeItemPath,
                name: item,
                type: this.getConfigFileType(item)
              });
            }

            // Identify code files
            const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.php', '.go', '.rs', '.cs'];
            if (codeExtensions.includes(ext)) {
              structure.codeFiles.push({
                path: fullPath,
                relativePath: relativeItemPath,
                name: item,
                extension: ext
              });
            }
          }
        }
      };

      await scanDir(codebasePath);
      
      this.log(`Scanned ${structure.allFiles.length} files in ${structure.directories.length} directories`);
      return structure;

    } catch (error) {
      this.log(`Error scanning directory: ${error.message}`, 'error');
      throw error;
    }
  }

  getConfigFileType(filename) {
    const typeMap = {
      'package.json': 'npm',
      'requirements.txt': 'pip',
      'pom.xml': 'maven',
      'build.gradle': 'gradle',
      'Cargo.toml': 'cargo',
      'go.mod': 'go-modules',
      'composer.json': 'composer',
      'tsconfig.json': 'typescript'
    };
    return typeMap[filename] || 'config';
  }

  async identifyLanguagesAccurately(fileStructure) {
    this.log('Identifying programming languages accurately');
    
    const detectedLanguages = {};

    for (const [language, patterns] of Object.entries(this.languagePatterns)) {
      let confidence = 0;
      let evidence = [];

      // Check for file extensions
      const matchingFiles = patterns.fileExtensions.filter(ext => 
        fileStructure.filesByExtension[ext] && fileStructure.filesByExtension[ext].length > 0
      );

      if (matchingFiles.length > 0) {
        const totalMatchingFiles = matchingFiles.reduce((sum, ext) => 
          sum + fileStructure.filesByExtension[ext].length, 0
        );
        
        confidence += Math.min(0.7, totalMatchingFiles * 0.1);
        evidence.push(`${totalMatchingFiles} ${matchingFiles.join(', ')} files`);
      }

      // Check for config files
      const configMatches = patterns.configFiles.filter(configFile =>
        fileStructure.configFiles.some(file => 
          file.name === configFile || file.name.includes(configFile.replace('*', ''))
        )
      );

      if (configMatches.length > 0) {
        confidence += 0.4;
        evidence.push(`Config files: ${configMatches.join(', ')}`);
      }

      // Check code content for language indicators
      if (confidence > 0 && fileStructure.codeFiles.length > 0) {
        const contentConfidence = await this.checkCodeContent(
          fileStructure.codeFiles.filter(file => 
            patterns.fileExtensions.includes(file.extension)
          ),
          patterns.indicators
        );
        
        confidence += contentConfidence.confidence;
        if (contentConfidence.evidence.length > 0) {
          evidence.push(...contentConfidence.evidence);
        }
      }

      // Only include languages with reasonable confidence
      if (confidence > 0.3) {
        detectedLanguages[language] = {
          confidence: Math.min(confidence, 1.0),
          evidence,
          files: matchingFiles.reduce((files, ext) => {
            return files.concat(fileStructure.filesByExtension[ext] || []);
          }, [])
        };
      }
    }

    this.log(`Detected languages: ${Object.keys(detectedLanguages).join(', ')}`);
    return detectedLanguages;
  }

  async checkCodeContent(codeFiles, indicators) {
    let confidence = 0;
    let evidence = [];

    // Sample a few files to check content
    const filesToCheck = codeFiles.slice(0, Math.min(5, codeFiles.length));
    
    for (const file of filesToCheck) {
      try {
        const content = await fs.readFile(file.path, 'utf-8');
        const foundIndicators = indicators.filter(indicator => 
          content.includes(indicator)
        );
        
        if (foundIndicators.length > 0) {
          confidence += foundIndicators.length * 0.1;
          evidence.push(`Found ${foundIndicators.length} indicators in ${file.name}`);
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return {
      confidence: Math.min(confidence, 0.3), // Cap content confidence
      evidence
    };
  }

  async detectFrameworksAccurately(fileStructure, detectedLanguages) {
    this.log('Detecting frameworks accurately');

    const detectedFrameworks = {};

    for (const language of Object.keys(detectedLanguages)) {
      if (!this.frameworkPatterns[language]) continue;

      detectedFrameworks[language] = {};

      for (const [framework, patterns] of Object.entries(this.frameworkPatterns[language])) {
          let confidence = 0;
        let evidence = [];

        // Check package/dependency files
        if (patterns.packageIndicators) {
          const packageConfidence = await this.checkPackageDependencies(
            fileStructure.configFiles,
            patterns.packageIndicators,
            language
          );
          
          confidence += packageConfidence.confidence;
          evidence.push(...packageConfidence.evidence);
        }

        // Check code patterns
        if (patterns.codeIndicators && confidence > 0) {
          const codeConfidence = await this.checkCodePatterns(
            fileStructure.codeFiles.filter(file => 
              this.languagePatterns[language].fileExtensions.includes(file.extension)
            ),
            patterns.codeIndicators
          );
          
          confidence += codeConfidence.confidence;
          evidence.push(...codeConfidence.evidence);
        }

        // Only include frameworks with reasonable confidence
        if (confidence > 0.3) {
          detectedFrameworks[language][framework] = {
            confidence: Math.min(confidence, 1.0),
            evidence
          };
        }
      }
    }

    return detectedFrameworks;
  }

  async checkPackageDependencies(configFiles, packageIndicators, language) {
    let confidence = 0;
    let evidence = [];

    for (const configFile of configFiles) {
      try {
        if (configFile.name === 'package.json' && language === 'javascript') {
          const content = await fs.readJSON(configFile.path);
          const allDeps = { ...content.dependencies, ...content.devDependencies };
          
          const foundPackages = packageIndicators.filter(pkg => 
            Object.keys(allDeps).some(dep => dep.includes(pkg))
          );
          
          if (foundPackages.length > 0) {
            confidence += foundPackages.length * 0.4;
            evidence.push(`Found packages: ${foundPackages.join(', ')} in package.json`);
          }
        } else if (configFile.name === 'requirements.txt' && language === 'python') {
          const content = await fs.readFile(configFile.path, 'utf-8');
          const foundPackages = packageIndicators.filter(pkg => 
            content.toLowerCase().includes(pkg.toLowerCase())
          );
          
          if (foundPackages.length > 0) {
            confidence += foundPackages.length * 0.4;
            evidence.push(`Found packages: ${foundPackages.join(', ')} in requirements.txt`);
          }
        }
      } catch (error) {
        // Skip files that can't be parsed
        continue;
      }
    }

    return { confidence, evidence };
  }

  async checkCodePatterns(codeFiles, codeIndicators) {
    let confidence = 0;
    let evidence = [];

    // Sample a few files to check patterns
    const filesToCheck = codeFiles.slice(0, Math.min(3, codeFiles.length));
    
    for (const file of filesToCheck) {
      try {
        const content = await fs.readFile(file.path, 'utf-8');
        const foundPatterns = codeIndicators.filter(pattern => 
          content.includes(pattern)
        );
        
        if (foundPatterns.length > 0) {
          confidence += foundPatterns.length * 0.15;
          evidence.push(`Found ${foundPatterns.length} patterns in ${file.name}`);
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return { confidence, evidence };
  }

  async identifyDatabases(fileStructure) {
    this.log('Identifying database technologies');
    
    const detectedDatabases = {};

    // Check package files for database dependencies
    for (const configFile of fileStructure.configFiles) {
      try {
        let dependencies = [];
        
        if (configFile.name === 'package.json') {
          const content = await fs.readJSON(configFile.path);
          dependencies = Object.keys({ ...content.dependencies, ...content.devDependencies });
        } else if (configFile.name === 'requirements.txt') {
          const content = await fs.readFile(configFile.path, 'utf-8');
          dependencies = content.split('\n').map(line => line.split('==')[0].split('>=')[0].trim());
        }

        // Check against database patterns
        for (const [dbType, patterns] of Object.entries(this.databasePatterns)) {
          const foundPatterns = patterns.filter(pattern => 
            dependencies.some(dep => dep.toLowerCase().includes(pattern.toLowerCase()))
          );
          
          if (foundPatterns.length > 0) {
            detectedDatabases[dbType] = {
              confidence: 0.8,
              evidence: [`Found dependencies: ${foundPatterns.join(', ')}`],
              source: configFile.name
            };
          }
        }
      } catch (error) {
        // Skip files that can't be parsed
        continue;
      }
    }

    return detectedDatabases;
  }

  async findEntryPoints(fileStructure, detectedLanguages) {
    this.log('Finding application entry points');

    const entryPoints = [];

    // Common entry point patterns by language
    const entryPatterns = {
      javascript: ['index.js', 'main.js', 'app.js', 'server.js'],
      python: ['main.py', 'app.py', 'manage.py', '__main__.py'],
      java: ['Main.java', 'Application.java'],
      php: ['index.php', 'app.php'],
      go: ['main.go'],
      rust: ['main.rs'],
      csharp: ['Program.cs', 'Main.cs']
    };

    for (const language of Object.keys(detectedLanguages)) {
      const patterns = entryPatterns[language] || [];
      
      for (const pattern of patterns) {
        const matchingFiles = fileStructure.allFiles.filter(file => 
          file.name.toLowerCase() === pattern.toLowerCase()
        );
        
        for (const file of matchingFiles) {
          entryPoints.push({
            file: file.relativePath,
            language,
            type: 'main-entry',
            confidence: 0.9
          });
        }
      }
    }

    // Check package.json for main entry
    const packageJson = fileStructure.configFiles.find(f => f.name === 'package.json');
    if (packageJson) {
      try {
        const content = await fs.readJSON(packageJson.path);
        if (content.main) {
          entryPoints.push({
            file: content.main,
            language: 'javascript',
            type: 'package-main',
            confidence: 0.95
          });
        }
        
        if (content.scripts && content.scripts.start) {
          const startScript = content.scripts.start;
          const match = startScript.match(/node\s+(\S+)/);
          if (match) {
              entryPoints.push({
              file: match[1],
              language: 'javascript',
              type: 'start-script',
              confidence: 0.8
            });
          }
        }
      } catch (error) {
        // Skip if can't parse
      }
    }

    return entryPoints;
  }

  consolidateTechStacks(languages, frameworks, databases) {
    const techStacks = [];

    for (const [language, langData] of Object.entries(languages)) {
        const stack = {
          language,
        confidence: langData.confidence,
        evidence: langData.evidence,
        files: langData.files.map(f => f.relativePath),
        frameworks: [],
        databases: []
      };

      // Add frameworks for this language
      if (frameworks[language]) {
        for (const [framework, fwData] of Object.entries(frameworks[language])) {
              stack.frameworks.push({
                name: framework,
            confidence: fwData.confidence,
            evidence: fwData.evidence
              });
            }
          }

      // Add relevant databases
      for (const [dbType, dbData] of Object.entries(databases)) {
        stack.databases.push({
          type: dbType,
          confidence: dbData.confidence,
          evidence: dbData.evidence
        });
        }

        techStacks.push(stack);
    }

    return techStacks.sort((a, b) => b.confidence - a.confidence);
  }

  async generateSecurityGoals(languages, frameworks, databases) {
    this.log('Generating security goals based on detected tech stack');
    
    const goals = [];

    // Language-specific security goals
    for (const language of Object.keys(languages)) {
      const languageGoals = this.getLanguageSecurityGoals(language);
      goals.push(...languageGoals);
    }

    // Framework-specific security goals
    for (const [language, langFrameworks] of Object.entries(frameworks)) {
      for (const framework of Object.keys(langFrameworks)) {
        const frameworkGoals = this.getFrameworkSecurityGoals(framework, language);
        goals.push(...frameworkGoals);
      }
    }

    // Database-specific security goals
    for (const dbType of Object.keys(databases)) {
      const dbGoals = this.getDatabaseSecurityGoals(dbType);
      goals.push(...dbGoals);
    }

    // General security goals
    goals.push({
      type: 'general-security',
      target: 'all',
      description: 'Perform comprehensive security analysis across all files',
      priority: 'high',
      rules: ['hardcoded-secrets', 'sensitive-data-exposure', 'authentication-bypass']
    });

    return goals;
  }

  getLanguageSecurityGoals(language) {
    const languageGoals = {
      javascript: [{
        type: 'language-security',
        target: 'javascript',
        description: 'Analyze JavaScript code for XSS, prototype pollution, and injection vulnerabilities',
        priority: 'high',
        rules: ['xss-prevention', 'prototype-pollution', 'eval-usage', 'command-injection']
      }],
      python: [{
        type: 'language-security',
        target: 'python',
        description: 'Scan Python code for SQL injection, command injection, and insecure deserialization',
        priority: 'high',
        rules: ['sql-injection', 'code-injection', 'deserialization', 'path-traversal']
      }],
      java: [{
        type: 'language-security',
        target: 'java',
        description: 'Check Java code for injection attacks and deserialization vulnerabilities',
        priority: 'high',
        rules: ['injection-attacks', 'deserialization', 'path-traversal']
      }],
      php: [{
        type: 'language-security',
        target: 'php',
        description: 'Analyze PHP code for injection vulnerabilities and file inclusion attacks',
        priority: 'high',
        rules: ['sql-injection', 'file-inclusion', 'code-injection']
      }]
    };

    return languageGoals[language] || [];
  }

  getFrameworkSecurityGoals(framework, language) {
    const frameworkGoals = {
      express: [{
        type: 'framework-security',
        target: 'express',
        description: 'Analyze Express.js application for route security and middleware vulnerabilities',
        priority: 'high',
        rules: ['route-security', 'middleware-bypass', 'cors-misconfiguration']
      }],
      flask: [{
        type: 'framework-security',
        target: 'flask',
        description: 'Check Flask application for template injection and session security',
        priority: 'high',
        rules: ['template-injection', 'session-security', 'csrf-protection']
      }],
      django: [{
        type: 'framework-security',
        target: 'django',
        description: 'Analyze Django application for ORM injection and CSRF vulnerabilities',
        priority: 'high',
        rules: ['orm-injection', 'csrf-protection', 'template-injection']
      }]
    };

    return frameworkGoals[framework] || [];
  }

  getDatabaseSecurityGoals(dbType) {
    return [{
      type: 'database-security',
      target: dbType,
      description: `Analyze ${dbType} usage for injection vulnerabilities and connection security`,
        priority: 'high',
      rules: ['sql-injection', 'connection-security', 'credential-exposure']
    }];
  }
}
