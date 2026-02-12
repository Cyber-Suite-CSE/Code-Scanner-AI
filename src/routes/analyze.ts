import { Router, Request, Response } from "express";
import { createJob } from "../lib/job-store";
import { runAnalysis } from "../lib/analysis-runner";
import { FileEntry, FrameworkDetectionResult } from "../lib/code-cleaner/types";

const router = Router();

// POST /api/analyze
router.post("/", async (req: Request, res: Response) => {
  try {
    const { files, framework } = req.body as { 
      files: FileEntry[], 
      framework: FrameworkDetectionResult 
    };

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "No files provided for analysis" });
    }

    if (!framework) {
      return res.status(400).json({ error: "Framework detection result is required" });
    }

    // Create a new job
    const jobId = Math.random().toString(36).substring(2, 12);
    const job = createJob(jobId, framework, files.length);

    // Start analysis in the background
    // We don't await this because we want to return the job ID immediately
    runAnalysis(jobId, files, framework).catch(err => {
      console.error(`Background analysis failed for job ${jobId}:`, err);
    });

    return res.status(202).json({ 
      success: true,
      jobId, 
      message: "Analysis started",
      status: "pending" 
    });

  } catch (error) {
    console.error("Error in /analyze:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
