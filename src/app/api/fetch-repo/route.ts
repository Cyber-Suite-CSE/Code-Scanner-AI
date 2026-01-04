import { NextRequest, NextResponse } from "next/server";
import { createCodeCleaner, CleaningResult } from "@/lib/code-cleaner";

export interface FetchRepoResponse {
  success: boolean;
  message: string;
  files?: CleaningResult["files"];
  totalFiles?: number;
  repoName?: string;
  framework?: CleaningResult["framework"];
  stats?: CleaningResult["stats"];
  error?: string;
}

interface RepoInfo {
  owner: string;
  repo: string;
  branch?: string;
}

function parseGitHubUrl(url: string): RepoInfo | null {
  try {
    // Handle various GitHub URL formats
    // https://github.com/owner/repo
    // https://github.com/owner/repo.git
    // https://github.com/owner/repo/tree/branch
    // git@github.com:owner/repo.git
    
    let cleanUrl = url.trim();
    
    // Handle SSH format
    if (cleanUrl.startsWith("git@github.com:")) {
      cleanUrl = cleanUrl.replace("git@github.com:", "https://github.com/");
    }
    
    // Remove .git suffix
    cleanUrl = cleanUrl.replace(/\.git$/, "");
    
    const urlObj = new URL(cleanUrl);
    
    const allowedHosts = ["github.com", "www.github.com"];
    if (!allowedHosts.includes(urlObj.hostname)) {
      return null;
    }
    
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    
    if (pathParts.length < 2) {
      return null;
    }
    
    const owner = pathParts[0];
    const repo = pathParts[1];
    
    // Check for branch in URL (e.g., /tree/main)
    let branch: string | undefined;
    if (pathParts.length >= 4 && pathParts[2] === "tree") {
      branch = pathParts[3];
    }
    
    return { owner, repo, branch };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<FetchRepoResponse>> {
  try {
    const body = await request.json();
    const { repoUrl, patToken } = body as { repoUrl?: string; patToken?: string };

    if (!repoUrl) {
      return NextResponse.json(
        { success: false, message: "Missing repository URL", error: "Please provide a repository URL" },
        { status: 400 }
      );
    }

    const repoInfo = parseGitHubUrl(repoUrl);
    
    if (!repoInfo) {
      return NextResponse.json(
        { success: false, message: "Invalid GitHub URL", error: "Please provide a valid GitHub repository URL (e.g., https://github.com/owner/repo)" },
        { status: 400 }
      );
    }

    const { owner, repo, branch } = repoInfo;

    // First, get the default branch if not specified
    let targetBranch = branch;
    
    if (!targetBranch) {
      const headers: HeadersInit = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "CodeScannerAI",
      };
      
      if (patToken) {
        headers["Authorization"] = `Bearer ${patToken}`;
      }

      const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers,
      });

      if (repoResponse.status === 404) {
        return NextResponse.json(
          { 
            success: false, 
            message: "Repository not found", 
            error: patToken 
              ? "Repository not found. Check the URL or ensure your token has access to this repository."
              : "Repository not found. If this is a private repository, please provide a Personal Access Token."
          },
          { status: 404 }
        );
      }

      if (repoResponse.status === 401) {
        return NextResponse.json(
          { success: false, message: "Authentication failed", error: "Invalid Personal Access Token. Please check your token and try again." },
          { status: 401 }
        );
      }

      if (repoResponse.status === 403) {
        const remaining = repoResponse.headers.get("x-ratelimit-remaining");
        if (remaining === "0") {
          return NextResponse.json(
            { success: false, message: "Rate limit exceeded", error: "GitHub API rate limit exceeded. Please provide a Personal Access Token for higher limits." },
            { status: 429 }
          );
        }
        return NextResponse.json(
          { success: false, message: "Access forbidden", error: "Access denied. Your token may not have the required permissions." },
          { status: 403 }
        );
      }

      if (!repoResponse.ok) {
        return NextResponse.json(
          { success: false, message: "Failed to fetch repository info", error: `GitHub API error: ${repoResponse.statusText}` },
          { status: repoResponse.status }
        );
      }

      const repoData = await repoResponse.json();
      targetBranch = repoData.default_branch;
    }

    // Download the repository as a ZIP file
    const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${targetBranch}`;
    
    const headers: HeadersInit = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "CodeScannerAI",
    };
    
    if (patToken) {
      headers["Authorization"] = `Bearer ${patToken}`;
    }

    const zipResponse = await fetch(zipUrl, { headers });

    if (!zipResponse.ok) {
      if (zipResponse.status === 404) {
        return NextResponse.json(
          { success: false, message: "Repository or branch not found", error: `Could not find branch '${targetBranch}' in the repository.` },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, message: "Failed to download repository", error: `GitHub API error: ${zipResponse.statusText}` },
        { status: zipResponse.status }
      );
    }

    const arrayBuffer = await zipResponse.arrayBuffer();
    
    // Check size (50MB limit)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (arrayBuffer.byteLength > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: "Repository too large", error: "Repository size exceeds 50MB limit. Please use a smaller repository or upload a ZIP with only the necessary files." },
        { status: 400 }
      );
    }

    // Use the code cleaner service
    // GitHub ZIP files have a prefix folder (owner-repo-hash/), so we strip it
    const cleaner = createCodeCleaner({
      stripFirstDirectory: true,
      maxFileSize: 1024 * 1024, // 1MB per file
    });

    const result = await cleaner.extractFromZip(arrayBuffer);

    return NextResponse.json({
      success: true,
      message: `Successfully fetched ${result.files.length} files from ${owner}/${repo} (${result.framework.framework} detected)`,
      files: result.files,
      totalFiles: result.files.length,
      repoName: `${owner}/${repo}`,
      framework: result.framework,
      stats: result.stats,
    });

  } catch (error) {
    console.error("Error fetching repository:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Server error", 
        error: error instanceof Error ? error.message : "An unexpected error occurred" 
      },
      { status: 500 }
    );
  }
}
