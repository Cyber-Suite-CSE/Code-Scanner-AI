import fs from 'fs-extra';
import path from 'path';
import yauzl from 'yauzl';
import { promisify } from 'util';

export class ZipHandler {
  constructor(options = {}) {
    this.options = {
      maxFileSize: options.maxFileSize || 100 * 1024 * 1024, // 100MB
      maxTotalSize: options.maxTotalSize || 500 * 1024 * 1024, // 500MB
      allowedExtensions: options.allowedExtensions || [
        '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cs', '.php',
        '.go', '.rs', '.rb', '.cpp', '.c', '.h', '.json', '.xml',
        '.yml', '.yaml', '.properties', '.config', '.env'
      ],
      excludeDirectories: options.excludeDirectories || [
        'node_modules', '.git', 'dist', 'build', '__pycache__',
        '.vscode', '.idea', 'target', 'bin', 'obj'
      ],
      tempDir: options.tempDir || './temp',
      ...options
    };

    this.extractedFiles = [];
    this.totalExtractedSize = 0;
    this.extractionPath = null;
  }

  async extractZip(zipPath, extractTo = null) {
    try {
      console.log(`Starting zip extraction: ${zipPath}`);

      // Validate zip file
      await this.validateZipFile(zipPath);

      // Set extraction path
      this.extractionPath = extractTo || path.join(
        this.options.tempDir,
        `extracted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      );

      // Ensure extraction directory exists
      await fs.ensureDir(this.extractionPath);

      // Extract zip file
      await this.performExtraction(zipPath, this.extractionPath);

      console.log(`Zip extraction completed: ${this.extractedFiles.length} files extracted`);

      return {
        extractionPath: this.extractionPath,
        extractedFiles: this.extractedFiles,
        totalFiles: this.extractedFiles.length,
        totalSize: this.totalExtractedSize,
        metadata: await this.generateExtractionMetadata()
      };

    } catch (error) {
      console.error(`Zip extraction failed: ${error.message}`);

      // Cleanup on error
      if (this.extractionPath) {
        await this.cleanup();
      }

      throw new Error(`Failed to extract zip file: ${error.message}`);
    }
  }

  async validateZipFile(zipPath) {
    // Check if file exists
    if (!await fs.pathExists(zipPath)) {
      throw new Error('Zip file does not exist');
    }

    // Check file size
    const stats = await fs.stat(zipPath);
    if (stats.size > this.options.maxFileSize) {
      throw new Error(`Zip file too large: ${stats.size} bytes (max: ${this.options.maxFileSize})`);
    }

    // Verify it's a valid zip file
    try {
      await new Promise((resolve, reject) => {
        yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
          if (err) {
            reject(new Error(`Invalid zip file: ${err.message}`));
            return;
          }

          zipfile.close();
          resolve();
        });
      });
    } catch (error) {
      throw new Error(`Zip file validation failed: ${error.message}`);
    }

    console.log(`Zip file validated: ${zipPath} (${stats.size} bytes)`);
  }

  async performExtraction(zipPath, extractionPath) {
    return new Promise((resolve, reject) => {
      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err);
          return;
        }

        let filesProcessed = 0;
        let totalEntries = 0;

        const handleEntry = async (entry) => {
          totalEntries++;

          try {
            // Skip directories
            if (/\/$/.test(entry.fileName)) {
              zipfile.readEntry();
              return;
            }

            // Check if file should be extracted
            if (!this.shouldExtractFile(entry.fileName)) {
              console.log(`Skipping file: ${entry.fileName}`);
              zipfile.readEntry();
              return;
            }

            // Check total size limit
            if (this.totalExtractedSize + entry.uncompressedSize > this.options.maxTotalSize) {
              reject(new Error(`Total extraction size limit exceeded: ${this.options.maxTotalSize} bytes`));
              return;
            }

            // Extract file
            await this.extractSingleFile(zipfile, entry, extractionPath);

            filesProcessed++;
            this.totalExtractedSize += entry.uncompressedSize;

            zipfile.readEntry();

          } catch (extractError) {
            reject(extractError);
          }
        };

        zipfile.on('entry', handleEntry);

        zipfile.on('end', () => {
          console.log(`Extraction completed: ${filesProcessed}/${totalEntries} files processed`);
          resolve();
        });

        zipfile.on('error', reject);

        // Start reading entries
        zipfile.readEntry();
      });
    });
  }

  async extractSingleFile(zipfile, entry, basePath) {
    return new Promise((resolve, reject) => {
      const filePath = path.join(basePath, entry.fileName);
      const fileDir = path.dirname(filePath);

      // Ensure directory exists
      fs.ensureDir(fileDir)
        .then(() => {
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              reject(err);
              return;
            }

            // Create write stream
            const writeStream = fs.createWriteStream(filePath);

            // Handle stream events
            writeStream.on('error', reject);
            writeStream.on('close', () => {
              this.extractedFiles.push({
                originalPath: entry.fileName,
                extractedPath: filePath,
                size: entry.uncompressedSize,
                compressed: entry.compressedSize,
                extractedAt: new Date().toISOString()
              });

              console.log(`Extracted: ${entry.fileName} (${entry.uncompressedSize} bytes)`);
              resolve();
            });

            // Pipe data
            readStream.pipe(writeStream);
          });
        })
        .catch(reject);
    });
  }

  shouldExtractFile(fileName) {
    // Check if file is in excluded directory
    const normalizedPath = fileName.toLowerCase();

    for (const excludeDir of this.options.excludeDirectories) {
      if (normalizedPath.includes(excludeDir.toLowerCase())) {
        return false;
      }
    }

    // Check file extension
    const fileExt = path.extname(fileName).toLowerCase();

    // Allow files without extension (might be config files)
    if (!fileExt) {
      const baseName = path.basename(fileName).toLowerCase();
      const allowedNoExtFiles = [
        'dockerfile', 'makefile', 'readme', 'license',
        'gitignore', 'gitattributes', 'editorconfig'
      ];

      return allowedNoExtFiles.some(allowed => baseName.includes(allowed));
    }

    // Check against allowed extensions
    return this.options.allowedExtensions.includes(fileExt);
  }

  async generateExtractionMetadata() {
    const filesByExtension = {};
    const filesByDirectory = {};

    this.extractedFiles.forEach(file => {
      // Group by extension
      const ext = path.extname(file.originalPath) || 'no-extension';
      if (!filesByExtension[ext]) {
        filesByExtension[ext] = [];
      }
      filesByExtension[ext].push(file);

      // Group by directory
      const dir = path.dirname(file.originalPath);
      if (!filesByDirectory[dir]) {
        filesByDirectory[dir] = [];
      }
      filesByDirectory[dir].push(file);
    });

    return {
      extractionTimestamp: new Date().toISOString(),
      extractionPath: this.extractionPath,
      totalFiles: this.extractedFiles.length,
      totalSize: this.totalExtractedSize,
      filesByExtension: Object.keys(filesByExtension).map(ext => ({
        extension: ext,
        count: filesByExtension[ext].length,
        totalSize: filesByExtension[ext].reduce((sum, f) => sum + f.size, 0)
      })),
      directoryStructure: Object.keys(filesByDirectory).map(dir => ({
        directory: dir,
        fileCount: filesByDirectory[dir].length
      })),
      largestFiles: this.extractedFiles
        .sort((a, b) => b.size - a.size)
        .slice(0, 10)
        .map(f => ({
          path: f.originalPath,
          size: f.size
        }))
    };
  }

  async validateExtractedFiles() {
    console.log('Validating extracted files...');

    const validationResults = {
      totalFiles: this.extractedFiles.length,
      validFiles: 0,
      invalidFiles: 0,
      errors: []
    };

    for (const file of this.extractedFiles) {
      try {
        // Check if file exists and is readable
        const stats = await fs.stat(file.extractedPath);

        if (stats.isFile() && stats.size > 0) {
          validationResults.validFiles++;
        } else {
          validationResults.invalidFiles++;
          validationResults.errors.push({
            file: file.originalPath,
            error: 'File is empty or not a regular file'
          });
        }

        // Basic content validation for text files
        if (this.isTextFile(file.extractedPath)) {
          try {
            await fs.readFile(file.extractedPath, 'utf-8');
          } catch (readError) {
            validationResults.errors.push({
              file: file.originalPath,
              error: `Failed to read as text: ${readError.message}`
            });
          }
        }

      } catch (error) {
        validationResults.invalidFiles++;
        validationResults.errors.push({
          file: file.originalPath,
          error: error.message
        });
      }
    }

    console.log(`File validation completed: ${validationResults.validFiles} valid, ${validationResults.invalidFiles} invalid`);

    return validationResults;
  }

  isTextFile(filePath) {
    const textExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cs', '.php',
      '.go', '.rs', '.rb', '.cpp', '.c', '.h', '.json', '.xml',
      '.yml', '.yaml', '.properties', '.config', '.env', '.txt',
      '.md', '.rst', '.css', '.scss', '.less', '.html', '.htm'
    ];

    const ext = path.extname(filePath).toLowerCase();
    return textExtensions.includes(ext);
  }

  async getCodebaseStructure() {
    if (!this.extractionPath) {
      throw new Error('No codebase extracted yet');
    }

    try {
      const structure = await this.analyzeDirectory(this.extractionPath);

      return {
        rootPath: this.extractionPath,
        structure,
        summary: {
          totalDirectories: this.countDirectories(structure),
          totalFiles: this.extractedFiles.length,
          mainLanguages: this.detectMainLanguages(),
          entryPointCandidates: this.findEntryPointCandidates()
        }
      };

    } catch (error) {
      throw new Error(`Failed to analyze codebase structure: ${error.message}`);
    }
  }

  async analyzeDirectory(dirPath, relativePath = '') {
    const items = await fs.readdir(dirPath);
    const structure = {
      name: path.basename(dirPath),
      path: relativePath,
      type: 'directory',
      children: []
    };

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const itemRelativePath = path.join(relativePath, item);

      try {
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          const subStructure = await this.analyzeDirectory(itemPath, itemRelativePath);
          structure.children.push(subStructure);
        } else {
          structure.children.push({
            name: item,
            path: itemRelativePath,
            type: 'file',
            size: stats.size,
            extension: path.extname(item)
          });
        }
      } catch (error) {
        console.warn(`Failed to analyze item ${itemPath}: ${error.message}`);
      }
    }

    return structure;
  }

  countDirectories(structure) {
    let count = 1; // Count current directory

    structure.children.forEach(child => {
      if (child.type === 'directory') {
        count += this.countDirectories(child);
      }
    });

    return count;
  }

  detectMainLanguages() {
    const languageCount = {};

    this.extractedFiles.forEach(file => {
      const ext = path.extname(file.originalPath).toLowerCase();
      const language = this.getLanguageFromExtension(ext);

      if (language) {
        languageCount[language] = (languageCount[language] || 0) + 1;
      }
    });

    return Object.entries(languageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([language, count]) => ({ language, count }));
  }

  getLanguageFromExtension(ext) {
    const languageMap = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.py': 'Python',
      '.java': 'Java',
      '.cs': 'C#',
      '.php': 'PHP',
      '.go': 'Go',
      '.rs': 'Rust',
      '.rb': 'Ruby',
      '.cpp': 'C++',
      '.c': 'C',
      '.h': 'C/C++'
    };

    return languageMap[ext] || null;
  }

  findEntryPointCandidates() {
    const entryPoints = [];
    const entryPointPatterns = [
      /^(index|main|app|server|start)\.(js|ts|py|java|cs|go|rs)$/i,
      /^package\.json$/i,
      /^requirements\.txt$/i,
      /^pom\.xml$/i,
      /^Cargo\.toml$/i,
      /^go\.mod$/i,
      /^Dockerfile$/i
    ];

    this.extractedFiles.forEach(file => {
      const fileName = path.basename(file.originalPath);

      entryPointPatterns.forEach(pattern => {
        if (pattern.test(fileName)) {
          entryPoints.push({
            file: file.originalPath,
            type: this.getEntryPointType(fileName),
            path: file.extractedPath
          });
        }
      });
    });

    return entryPoints;
  }

  getEntryPointType(fileName) {
    if (fileName.match(/^(index|main|app|server)/i)) return 'application';
    if (fileName === 'package.json') return 'npm-config';
    if (fileName === 'requirements.txt') return 'python-deps';
    if (fileName === 'pom.xml') return 'maven-config';
    if (fileName === 'Cargo.toml') return 'rust-config';
    if (fileName === 'go.mod') return 'go-config';
    if (fileName === 'Dockerfile') return 'container-config';
    return 'unknown';
  }

  async cleanup() {
    if (this.extractionPath && await fs.pathExists(this.extractionPath)) {
      try {
        await fs.remove(this.extractionPath);
        console.log(`Cleanup completed: ${this.extractionPath}`);
      } catch (error) {
        console.error(`Cleanup failed: ${error.message}`);
      }
    }

    // Reset state
    this.extractedFiles = [];
    this.totalExtractedSize = 0;
    this.extractionPath = null;
  }

  getExtractionInfo() {
    return {
      extractionPath: this.extractionPath,
      totalFiles: this.extractedFiles.length,
      totalSize: this.totalExtractedSize,
      extractedFiles: this.extractedFiles,
      isExtracted: this.extractionPath !== null
    };
  }

  async createBackup(backupPath) {
    if (!this.extractionPath) {
      throw new Error('No extraction to backup');
    }

    try {
      await fs.copy(this.extractionPath, backupPath);
      console.log(`Backup created: ${backupPath}`);

      return {
        backupPath,
        timestamp: new Date().toISOString(),
        originalPath: this.extractionPath,
        fileCount: this.extractedFiles.length
      };

    } catch (error) {
      throw new Error(`Backup failed: ${error.message}`);
    }
  }
}