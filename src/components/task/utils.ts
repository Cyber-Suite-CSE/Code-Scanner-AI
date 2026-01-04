import { JobStatus, LogEntry } from "./types";

export function getStatusColor(status: JobStatus) {
  switch (status) {
    case "pending":
      return "bg-yellow-500";
    case "running":
      return "bg-blue-500";
    case "completed":
      return "bg-green-500";
    case "failed":
      return "bg-red-500";
    case "cancelled":
      return "bg-orange-500";
    default:
      return "bg-zinc-500";
  }
}

export function getLogColor(level: LogEntry["level"]) {
  switch (level) {
    case "info":
      return "text-zinc-600 dark:text-zinc-400";
    case "warn":
      return "text-yellow-600 dark:text-yellow-400";
    case "error":
      return "text-red-600 dark:text-red-400";
    case "success":
      return "text-green-600 dark:text-green-400";
    default:
      return "text-zinc-600 dark:text-zinc-400";
  }
}

export function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString();
}

export function formatDuration(ms: number) {
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = seconds / 60;
  if (minutes < 60) {
    const mins = Math.floor(minutes);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = Math.round(minutes % 60);
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}
