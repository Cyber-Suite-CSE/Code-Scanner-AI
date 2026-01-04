import JSZip from "jszip";
import { FileEntry, Framework, CleaningResult, FrameworkConfig } from "./types";
import { getFrameworkConfig } from "./framework-configs";
import { detectFramework } from "./framework-detector";

export * from "./types";
export { detectFramework } from "./framework-detector";
export { getFrameworkConfig, FRAMEWORK_CONFIGS } from "./framework-configs";

/**
 * Options for the code cleaner
 */
export interface CodeCleanerOptions {
  /** Force a specific framework instead of auto-detecting */
  forceFramework?: Framework;
  /** Maximum file size to include (in bytes) */
  maxFileSize?: number;
  /** Strip the first directory from paths (useful for GitHub downloads) */
  stripFirstDirectory?: boolean;
}

const DEFAULT_OPTIONS: Required<CodeCleanerOptions> = {
  forceFramework: "unknown" as Framework,
  maxFileSize: 1024 * 1024, // 1MB
  stripFirstDirectory: false,
};

/**
 * Code cleaner service for extracting and filtering code files
 */
export class CodeCleaner {
  private options: Required<CodeCleanerOptions>;

  constructor(options: CodeCleanerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    // Handle the case where forceFramework might be undefined
    if (!this.options.forceFramework) {
      this.options.forceFramework = "unknown";
    }
  }

  /**
   * Extract and clean files from a ZIP buffer
   */
  async extractFromZip(buffer: ArrayBuffer): Promise<CleaningResult> {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(buffer);

    // First pass: extract all text files to detect framework
    const allFiles: FileEntry[] = [];
    const filePromises: Promise<void>[] = [];

    zipContent.forEach((relativePath, zipEntry) => {
      if (zipEntry.dir) return;

      let cleanPath = relativePath;
      
      // Strip first directory if needed (GitHub format: owner-repo-hash/)
      if (this.options.stripFirstDirectory) {
        const parts = relativePath.split("/");
        if (parts.length > 1) {
          cleanPath = parts.slice(1).join("/");
        }
      }

      if (!cleanPath) return;

      // Quick check: skip obviously ignored directories
      if (this.shouldQuickIgnore(cleanPath)) {
        return;
      }

      const promise = zipEntry.async("string").then((content) => {
        if (content.length > this.options.maxFileSize) {
          return;
        }

        allFiles.push({
          path: cleanPath,
          content,
          size: content.length,
        });
      }).catch(() => {
        // Skip files that can't be read as text (binary files)
      });

      filePromises.push(promise);
    });

    await Promise.all(filePromises);

    // Detect framework or use forced framework
    const frameworkResult = this.options.forceFramework !== "unknown"
      ? { framework: this.options.forceFramework, confidence: "high" as const, indicators: ["Manually specified"] }
      : detectFramework(allFiles);

    // Get framework-specific config
    const config = getFrameworkConfig(frameworkResult.framework);

    // Second pass: filter files based on framework config
    const cleanedFiles = this.filterFiles(allFiles, config);

    // Sort files by path
    cleanedFiles.sort((a, b) => a.path.localeCompare(b.path));

    return {
      files: cleanedFiles,
      framework: frameworkResult,
      stats: {
        totalFilesProcessed: allFiles.length,
        filesIncluded: cleanedFiles.length,
        filesIgnored: allFiles.length - cleanedFiles.length,
      },
    };
  }

  /**
   * Clean files that have already been extracted
   */
  cleanFiles(files: FileEntry[], framework?: Framework): CleaningResult {
    // Detect framework or use provided framework
    const frameworkResult = framework
      ? { framework, confidence: "high" as const, indicators: ["Manually specified"] }
      : detectFramework(files);

    // Get framework-specific config
    const config = getFrameworkConfig(frameworkResult.framework);

    // Filter files based on framework config
    const cleanedFiles = this.filterFiles(files, config);

    // Sort files by path
    cleanedFiles.sort((a, b) => a.path.localeCompare(b.path));

    return {
      files: cleanedFiles,
      framework: frameworkResult,
      stats: {
        totalFilesProcessed: files.length,
        filesIncluded: cleanedFiles.length,
        filesIgnored: files.length - cleanedFiles.length,
      },
    };
  }

  /**
   * Quick check for obviously ignored paths (before reading file content)
   */
  private shouldQuickIgnore(filePath: string): boolean {
    const lowerPath = filePath.toLowerCase();
    
    // Quick ignore common large directories
    const quickIgnoreDirs = [
      "node_modules/",
      ".git/",
      "__pycache__/",
      ".venv/",
      "venv/",
      "dist/",
      "build/",
      "target/",
      ".next/",
      ".gradle/",
    ];

    for (const dir of quickIgnoreDirs) {
      if (lowerPath.includes(dir)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Filter files based on framework configuration
   */
  private filterFiles(files: FileEntry[], config: FrameworkConfig): FileEntry[] {
    return files.filter((file) => {
      const lowerPath = file.path.toLowerCase();
      const fileName = lowerPath.split("/").pop() || "";

      // Check if file should be ignored based on directory patterns
      for (const dir of config.ignoreDirs) {
        const dirPattern = dir.toLowerCase();
        if (
          lowerPath.includes(`/${dirPattern}/`) ||
          lowerPath.startsWith(`${dirPattern}/`) ||
          lowerPath.includes(`/${dirPattern}`)
        ) {
          return false;
        }
      }

      // Check if file matches ignore patterns
      for (const pattern of config.ignoreFiles) {
        const lowerPattern = pattern.toLowerCase();
        
        if (lowerPattern.startsWith("*")) {
          // Wildcard pattern (e.g., *.min.js)
          const suffix = lowerPattern.slice(1);
          if (lowerPath.endsWith(suffix)) {
            return false;
          }
        } else {
          // Exact match
          if (fileName === lowerPattern) {
            return false;
          }
        }
      }

      // Check if file is a special file (no extension check needed)
      if (config.specialFiles.some((sf) => fileName === sf.toLowerCase())) {
        return true;
      }

      // Check file extension
      const lastDotIndex = fileName.lastIndexOf(".");
      if (lastDotIndex === -1) {
        // No extension - only include if it's a special file (already checked above)
        return false;
      }

      const ext = fileName.slice(lastDotIndex);
      return config.extensions.has(ext);
    });
  }
}

/**
 * Create a new CodeCleaner instance with default options
 */
export function createCodeCleaner(options?: CodeCleanerOptions): CodeCleaner {
  return new CodeCleaner(options);
}
