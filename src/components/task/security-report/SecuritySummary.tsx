"use client";

import { Badge } from "@/components/ui/badge";
import { SecurityReport } from "../types";

interface SecuritySummaryProps {
  summary: SecurityReport["summary"];
}

export function SecuritySummary({ summary }: SecuritySummaryProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
      <h4 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
        📊 Security Summary
      </h4>
      <div className="grid grid-cols-5 gap-2 text-center">
        <div>
          <p className="text-xl font-bold text-green-600">
            {summary.implemented_count}
          </p>
          <p className="text-xs text-zinc-500">Implemented</p>
        </div>
        <div>
          <p className="text-xl font-bold text-orange-600">
            {summary.missing_count}
          </p>
          <p className="text-xs text-zinc-500">Missing</p>
        </div>
        <div>
          <p className="text-xl font-bold text-blue-600">
            {summary.auto_handled_count}
          </p>
          <p className="text-xs text-zinc-500">Auto</p>
        </div>
        <div>
          <p className="text-xl font-bold text-red-600">
            {summary.vulnerabilities_count || 0}
          </p>
          <p className="text-xs text-zinc-500">Vulns</p>
        </div>
        <div>
          <Badge
            variant={
              summary.overall_severity === "critical" ||
              summary.overall_severity === "high"
                ? "destructive"
                : summary.overall_severity === "medium"
                  ? "secondary"
                  : "outline"
            }
            className="text-xs"
          >
            {summary.overall_severity === "none" ? "✓ OK" : summary.overall_severity}
          </Badge>
          <p className="text-xs text-zinc-500 mt-1">Severity</p>
        </div>
      </div>
    </div>
  );
}
