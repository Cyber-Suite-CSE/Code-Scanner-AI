"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogEntry } from "./types";
import { formatTime, getLogColor } from "./utils";

interface LogsCardProps {
  logs: LogEntry[];
  isCompleted?: boolean;
}

export function LogsCard({ logs, isCompleted = false }: LogsCardProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Collapse logs when task completes
  useEffect(() => {
    if (isCompleted) {
      setIsCollapsed(true);
    }
  }, [isCompleted]);

  // Auto-scroll logs only when not collapsed
  useEffect(() => {
    if (!isCollapsed) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isCollapsed]);

  return (
    <Card className="mb-6">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5 text-zinc-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-zinc-500" />
            )}
            <CardTitle className="text-lg">Logs</CardTitle>
            {isCollapsed && logs.length > 0 && (
              <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                {logs.length} entries
              </span>
            )}
          </div>
          {!isCollapsed && (
            <CardDescription>Real-time analysis output</CardDescription>
          )}
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent>
          <div className="h-80 overflow-y-auto rounded-lg bg-zinc-900 p-4 font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-zinc-500">Waiting for logs...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="flex gap-3">
                  <span className="shrink-0 text-zinc-500">
                    [{formatTime(log.timestamp)}]
                  </span>
                  <span className={getLogColor(log.level)}>{log.message}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
