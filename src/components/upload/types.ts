export interface FileEntry {
  path: string;
  content: string;
  size: number;
}

export interface FrameworkInfo {
  framework: string;
  confidence: "high" | "medium" | "low";
  indicators: string[];
}

export interface ApiResponse {
  success: boolean;
  message: string;
  files?: FileEntry[];
  totalFiles?: number;
  repoName?: string;
  framework?: FrameworkInfo;
  stats?: {
    totalFilesProcessed: number;
    filesIncluded: number;
    filesIgnored: number;
  };
  error?: string;
}
