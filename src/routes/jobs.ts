import { Router, Request, Response } from "express";
import { getJob, cancelJob, JobEvent } from "../lib/job-store";

const router = Router();

// GET /api/jobs/:id
router.get("/:id", (req: Request, res: Response) => {
  const id = req.params.id as string;
  const job = getJob(id);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  // Return job data without internal objects like abortController/subscribers
  const { subscribers, abortController, ...jobData } = job;
  return res.json(jobData);
});

// DELETE /api/jobs/:id
router.delete("/:id", (req: Request, res: Response) => {
    const id = req.params.id as string;
    const job = getJob(id);

    if (!job) {
        return res.status(404).json({ error: "Job not found" });
    }

    cancelJob(id);
    return res.json({ message: "Job cancelled" });
});

// GET /api/jobs/:id/events (SSE)
router.get("/:id/events", (req: Request, res: Response) => {
    const id = req.params.id as string;
    const job = getJob(id);

    if (!job) {
        return res.status(404).json({ error: "Job not found" });
    }

    // Setup SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Send initial status
    res.write(`data: ${JSON.stringify({ type: "status", timestamp: Date.now(), data: { status: job.status, error: job.error } })}\n\n`);

    // Send current progress
    res.write(`data: ${JSON.stringify({ type: "progress", timestamp: Date.now(), data: job.progress })}\n\n`);

    // Send existing logs
    for (const log of job.logs) {
        res.write(`data: ${JSON.stringify({ type: "log", timestamp: log.timestamp, data: log })}\n\n`);
    }

    // Send result if available
    if (job.result) {
        res.write(`data: ${JSON.stringify({ type: "result", timestamp: Date.now(), data: job.result })}\n\n`);
    }

    // Subscribe to events
    const onEvent = (event: JobEvent) => {
        console.log(`[SSE] Sending event to ${id}: ${event.type}`);
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        // Try to flush if method exists (some environments need this)
        if (typeof (res as any).flush === 'function') {
            (res as any).flush();
        }
    };

    job.subscribers.add(onEvent);
    console.log(`[SSE] Client connected to job ${id}`);

    // Keep-alive ping to prevent timeouts
    const pingInterval = setInterval(() => {
        res.write(": ping\n\n");
        if (typeof (res as any).flush === 'function') {
            (res as any).flush();
        }
    }, 15000);

    // Handle connection close
    req.on("close", () => {
        console.log(`[SSE] Client disconnected from job ${id}`);
        clearInterval(pingInterval);
        job.subscribers.delete(onEvent);
        res.end();
    });
});

export default router;
