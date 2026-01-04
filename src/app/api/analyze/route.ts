import { NextRequest, NextResponse } from "next/server";
import { createJob } from "@/lib/job-store";
import { runAnalysis } from "@/lib/analysis-runner";
import { FileEntry, FrameworkDetectionResult } from "@/lib/code-cleaner";

export interface AnalyzeRequest {
  files: FileEntry[];
  framework: FrameworkDetectionResult;
}

export interface AnalyzeResponse {
  success: boolean;
  jobId?: string;
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<AnalyzeResponse>> {
  try {
    const body = (await request.json()) as AnalyzeRequest;
    const { files, framework } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided for analysis" },
        { status: 400 }
      );
    }

    if (!framework) {
      return NextResponse.json(
        { success: false, error: "Framework information is required" },
        { status: 400 }
      );
    }

    // Create the job
    const job = createJob(framework, files.length);

    // Start analysis in background (don't await)
    // The analysis will run and update the job store
    runAnalysis(job.id, files, framework).catch((error) => {
      console.error(`Analysis job ${job.id} failed:`, error);
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
    });
  } catch (error) {
    console.error("Error starting analysis:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to start analysis",
      },
      { status: 500 }
    );
  }
}
