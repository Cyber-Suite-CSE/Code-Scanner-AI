"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LogEntry,
  ProgressData,
  AnalysisResult,
  JobStatus,
  StatusCard,
  LogsCard,
  ErrorCard,
  CancelledCard,
  ResultsCard,
  SecurityReportsSection,
} from "@/components/task";

export default function TaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [status, setStatus] = useState<JobStatus>("pending");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState<ProgressData>({
    current: 0,
    total: 100,
    stage: "Initializing",
  });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Connect to SSE stream
  useEffect(() => {
    if (!taskId) return;

    const eventSource = new EventSource(`/api/analyze/${taskId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "log":
            setLogs((prev) => [...prev, data.data]);
            break;
          case "progress":
            setProgress(data.data);
            break;
          case "status":
            setStatus(data.data);
            break;
          case "result":
            setResult(data.data);
            break;
          case "error":
            setError(data.data);
            break;
        }
      } catch (e) {
        console.error("Failed to parse SSE event:", e);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [taskId]);

  const handleCancelJob = async () => {
    if (isCancelling) return;

    setIsCancelling(true);
    try {
      const response = await fetch(`/api/analyze/${taskId}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Failed to cancel job:", data.error);
      }
    } catch (error) {
      console.error("Failed to cancel job:", error);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-4 font-sans dark:bg-black">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Analysis Task
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Task ID:{" "}
              <code className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-800">
                {taskId}
              </code>
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/")}>
            ← Back to Home
          </Button>
        </div>

        {/* Status Card */}
        <StatusCard
          status={status}
          progress={progress}
          connected={connected}
          isCancelling={isCancelling}
          onCancel={handleCancelJob}
        />

        {/* Logs Card */}
        <LogsCard logs={logs} isCompleted={status === "completed" || status === "failed" || status === "cancelled"} />

        {/* Error Card */}
        {error && <ErrorCard error={error} />}

        {/* Cancelled Card */}
        {status === "cancelled" && <CancelledCard />}

        {/* Results Card */}
        {result && <ResultsCard result={result} />}

        {/* Detailed Security Reports */}
        {result && <SecurityReportsSection result={result} />}

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => router.push("/")}>
            Start New Analysis
          </Button>
        </div>
      </div>
    </div>
  );
}
