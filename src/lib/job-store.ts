import { FrameworkDetectionResult } from "./code-cleaner/types";
import { EndpointProfile } from "./agents/sentinel-agent";
import { SecurityChecklist } from "./agents/guardian-agent";
import { SecurityReport } from "./agents/inspector-agent";

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface JobEvent {
  type: "log" | "progress" | "status" | "result" | "error";
  timestamp: number;
  data: unknown;
}

export interface LogEntry {
  timestamp: number;
  message: string;
  level: "info" | "error" | "warning";
}

export interface AnalysisResult {
  summary: string;
  findings: Array<{
    type: string;
    severity: "info" | "warning" | "critical";
    message: string;
    file?: string;
  }>;
  endpointProfiles: EndpointProfile[];
  securityChecklists: SecurityChecklist[];
  securityReports: SecurityReport[];
  metrics: {
    filesAnalyzed: number;
    endpointsFound: number;
    securityChecklistsGenerated: number;
    securityReportsGenerated: number;
    issuesFound: number;
    vulnerabilitiesFound: number;
    analysisTime: number;
  };
}

export interface Job {
  id: string;
  status: JobStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  framework: FrameworkDetectionResult;
  fileCount: number;
  logs: LogEntry[];
  progress: { current: number; total: number; stage: string };
  result?: AnalysisResult;
  error?: string;
  // Subscribers for SSE
  subscribers: Set<(event: JobEvent) => void>;
  // Abort controller for cancellation
  abortController?: AbortController;
}

// In-memory job store (replace with Redis/DB in production)
const jobs = new Map<string, Job>();

export function createJob(
  id: string,
  framework: FrameworkDetectionResult,
  fileCount: number
): Job {
  const job: Job = {
    id,
    status: "pending",
    createdAt: Date.now(),
    framework,
    fileCount,
    logs: [],
    progress: { current: 0, total: 100, stage: "Queued" },
    subscribers: new Set(),
    abortController: new AbortController(),
  };

  jobs.set(id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJobStatus(id: string, status: JobStatus, error?: string) {
  const job = jobs.get(id);
  if (!job) return;

  job.status = status;
  if (status === "running" && !job.startedAt) {
    job.startedAt = Date.now();
  }
  if ((status === "completed" || status === "failed" || status === "cancelled") && !job.completedAt) {
    job.completedAt = Date.now();
    // Clear subscribers to avoid leaks, but maybe wait a bit?
    // In SSE, we want to send the final event first.
  }
  
  if (error) {
    job.error = error;
  }

  emitEvent(job, "status", { status, error });
}

export function updateJobProgress(id: string, current: number, total: number, stage: string) {
  const job = jobs.get(id);
  if (!job) return;

  job.progress = { current, total, stage };
  emitEvent(job, "progress", job.progress);
}

export function addJobLog(id: string, message: string, level: "info" | "error" | "warning" = "info") {
  const job = jobs.get(id);
  if (!job) return;

  const entry: LogEntry = {
    timestamp: Date.now(),
    message,
    level,
  };

  job.logs.push(entry);
  emitEvent(job, "log", entry);
}

export function setJobResult(id: string, result: AnalysisResult) {
  const job = jobs.get(id);
  if (!job) return;

  job.result = result;
  updateJobStatus(id, "completed");
  emitEvent(job, "result", result);
}

export function subscribeToJob(id: string, callback: (event: JobEvent) => void): () => void {
  const job = jobs.get(id);
  if (!job) return () => {};

  job.subscribers.add(callback);
  return () => job.subscribers.delete(callback);
}

function emitEvent(job: Job, type: JobEvent["type"], data: unknown) {
  const event: JobEvent = {
    type,
    timestamp: Date.now(),
    data,
  };

  for (const subscriber of job.subscribers) {
    // subscriber(event);
    // Wrap in try-catch to prevent one subscriber from crashing the loop
    try {
        subscriber(event);
    } catch(e) {
        console.error("Error in job subscriber:", e);
    }
  }
}

export function cancelJob(id: string) {
    const job = jobs.get(id);
    if (!job) return;
    
    if (job.abortController) {
        job.abortController.abort();
    }
    updateJobStatus(id, "cancelled");
}


// Cleanup old jobs periodically
setInterval(() => {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  
  for (const [id, job] of jobs.entries()) {
    if (job.completedAt && (now - job.completedAt > ONE_HOUR)) {
      jobs.delete(id);
    }
  }
}, 60 * 60 * 1000); // Run every hour
