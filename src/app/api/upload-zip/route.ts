import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { createCodeCleaner, CleaningResult } from "@/lib/code-cleaner";

export interface UploadResponse {
  success: boolean;
  message: string;
  files?: CleaningResult["files"];
  totalFiles?: number;
  framework?: CleaningResult["framework"];
  stats?: CleaningResult["stats"];
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded", error: "No file provided" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".zip")) {
      return NextResponse.json(
        { success: false, message: "Invalid file type", error: "Please upload a ZIP file" },
        { status: 400 }
      );
    }

    // Max file size: 50MB
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: "File too large", error: "Maximum file size is 50MB" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    
    // Validate ZIP file
    const zip = new JSZip();
    try {
      await zip.loadAsync(arrayBuffer);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid ZIP file", error: "Could not read the ZIP file. Make sure it's a valid ZIP archive." },
        { status: 400 }
      );
    }

    // Use the code cleaner service
    const cleaner = createCodeCleaner({
      stripFirstDirectory: false,
      maxFileSize: 1024 * 1024, // 1MB per file
    });

    const result = await cleaner.extractFromZip(arrayBuffer);

    return NextResponse.json({
      success: true,
      message: `Successfully extracted ${result.files.length} files (${result.framework.framework} detected)`,
      files: result.files,
      totalFiles: result.files.length,
      framework: result.framework,
      stats: result.stats,
    });

  } catch (error) {
    console.error("Error processing ZIP file:", error);
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
