"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { JobStatus, ProgressData } from "./types";
import { getStatusColor } from "./utils";

interface StatusCardProps {
  status: JobStatus;
  progress: ProgressData;
  connected: boolean;
  isCancelling: boolean;
  onCancel: () => void;
}

export function StatusCard({
  status,
  progress,
  connected,
  isCancelling,
  onCancel,
}: StatusCardProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Status</CardTitle>
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${getStatusColor(status)} ${
                status === "running" ? "animate-pulse" : ""
              }`}
            />
            <span className="text-sm font-medium capitalize">{status}</span>
            {connected && status === "running" && (
              <Badge variant="outline" className="ml-2 text-xs">
                Live
              </Badge>
            )}
            {(status === "running" || status === "pending") && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onCancel}
                disabled={isCancelling}
                className="ml-2"
              >
                {isCancelling ? "Cancelling..." : "Terminate"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              {progress.stage}
            </span>
            <span className="font-medium">
              {Math.round((progress.current / progress.total) * 100)}%
            </span>
          </div>
          <Progress value={(progress.current / progress.total) * 100} />
        </div>
      </CardContent>
    </Card>
  );
}
