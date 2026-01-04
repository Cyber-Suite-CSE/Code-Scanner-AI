import { FileEntry, FrameworkDetectionResult } from "./code-cleaner";
import { EndpointProfile, SecurityChecklist, SecurityReport } from "./agents";

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface JobEvent {
  type: "log" | "progress" | "status" | "result" | "error";
  timestamp: number;
  data: unknown;
}

export interface LogEntry {
  timestamp: number;
  level: "info" | "warn" | "error" | "success";
  message: string;
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

// In-memory job store
const jobs = new Map<string, Job>();

// Generate a unique job ID
export function generateJobId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

// Create a new job
export function createJob(
  framework: FrameworkDetectionResult,
  fileCount: number
): Job {
  const id = generateJobId();
  const job: Job = {
    id,
    status: "pending",
    createdAt: Date.now(),
    framework,
    fileCount,
    logs: [],
    progress: { current: 0, total: 100, stage: "Initializing" },
    subscribers: new Set(),
  };
  jobs.set(id, job);
  return job;
}

// Get a job by ID
export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

// Subscribe to job events
export function subscribeToJob(
  id: string,
  callback: (event: JobEvent) => void
): () => void {
  const job = jobs.get(id);
  if (!job) {
    throw new Error(`Job ${id} not found`);
  }
  
  job.subscribers.add(callback);
  
  // Return unsubscribe function
  return () => {
    job.subscribers.delete(callback);
  };
}

// Emit an event to all subscribers
function emitEvent(job: Job, event: JobEvent): void {
  job.subscribers.forEach((callback) => {
    try {
      callback(event);
    } catch (error) {
      console.error("Error in job subscriber:", error);
    }
  });
}

// Add a log entry
export function addLog(
  id: string,
  level: LogEntry["level"],
  message: string
): void {
  const job = jobs.get(id);
  if (!job) return;

  const log: LogEntry = {
    timestamp: Date.now(),
    level,
    message,
  };
  job.logs.push(log);

  emitEvent(job, {
    type: "log",
    timestamp: Date.now(),
    data: log,
  });
}

// Update progress
export function updateProgress(
  id: string,
  current: number,
  total: number,
  stage: string
): void {
  const job = jobs.get(id);
  if (!job) return;

  job.progress = { current, total, stage };

  emitEvent(job, {
    type: "progress",
    timestamp: Date.now(),
    data: job.progress,
  });
}

// Update job status
export function updateStatus(id: string, status: JobStatus): void {
  const job = jobs.get(id);
  if (!job) return;

  job.status = status;
  
  if (status === "running" && !job.startedAt) {
    job.startedAt = Date.now();
  }
  if (status === "completed" || status === "failed" || status === "cancelled") {
    job.completedAt = Date.now();
  }

  emitEvent(job, {
    type: "status",
    timestamp: Date.now(),
    data: status,
  });
}

// Set abort controller for a job
export function setAbortController(id: string, controller: AbortController): void {
  const job = jobs.get(id);
  if (!job) return;
  job.abortController = controller;
}

// Cancel a running job
export function cancelJob(id: string): boolean {
  const job = jobs.get(id);
  if (!job) return false;
  
  if (job.status !== "running" && job.status !== "pending") {
    return false;
  }

  // Abort the controller if it exists
  if (job.abortController) {
    job.abortController.abort();
  }

  job.status = "cancelled";
  job.completedAt = Date.now();

  addLog(id, "warn", "🛑 Analysis cancelled by user");

  emitEvent(job, {
    type: "status",
    timestamp: Date.now(),
    data: "cancelled",
  });

  return true;
}

// Check if job is cancelled
export function isJobCancelled(id: string): boolean {
  const job = jobs.get(id);
  return job?.status === "cancelled" || job?.abortController?.signal.aborted === true;
}

// Set job result
export function setResult(id: string, result: AnalysisResult): void {
  const job = jobs.get(id);
  if (!job) return;

  job.result = result;

  emitEvent(job, {
    type: "result",
    timestamp: Date.now(),
    data: result,
  });
}

// Set job error
export function setError(id: string, error: string): void {
  const job = jobs.get(id);
  if (!job) return;

  job.error = error;
  job.status = "failed";
  job.completedAt = Date.now();

  emitEvent(job, {
    type: "error",
    timestamp: Date.now(),
    data: error,
  });
}

// Clean up old jobs (call periodically)
export function cleanupOldJobs(maxAgeMs: number = 30 * 60 * 1000): void {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > maxAgeMs && job.subscribers.size === 0) {
      jobs.delete(id);
    }
  }
}

// Get job for serialization (without subscribers)
export function getJobData(id: string): Omit<Job, "subscribers"> | undefined {
  const job = jobs.get(id);
  if (!job) return undefined;

  const { subscribers, ...jobData } = job;
  return jobData;
}
