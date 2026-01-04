/**
 * Represents a single file entry extracted from the codebase
 */
export interface FileEntry {
  path: string;
  content: string;
  size: number;
}

/**
 * Supported frameworks for code scanning
 */
export type Framework = 
  | "express"
  | "fastify"
  | "nestjs"
  | "springboot"
  | "flask"
  | "django"
  | "nextjs"
  | "unknown";

/**
 * Result of framework detection
 */
export interface FrameworkDetectionResult {
  framework: Framework;
  confidence: "high" | "medium" | "low";
  indicators: string[];
}

/**
 * Configuration for file filtering based on framework
 */
export interface FrameworkConfig {
  /** File extensions to include */
  extensions: Set<string>;
  /** Files without extensions to include (e.g., Dockerfile) */
  specialFiles: string[];
  /** Directory patterns to ignore */
  ignoreDirs: string[];
  /** File patterns to ignore */
  ignoreFiles: string[];
  /** Files that are important for this framework */
  importantFiles: string[];
}

/**
 * Result of the code cleaning process
 */
export interface CleaningResult {
  files: FileEntry[];
  framework: FrameworkDetectionResult;
  stats: {
    totalFilesProcessed: number;
    filesIncluded: number;
    filesIgnored: number;
  };
}
