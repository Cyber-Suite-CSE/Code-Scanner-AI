"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisResult } from "./types";
import { formatDuration } from "./utils";
import { FindingsChart } from "./FindingsChart";
import { SecurityScore } from "./SecurityScore";

interface ResultsCardProps {
  result: AnalysisResult;
}

export function ResultsCard({ result }: ResultsCardProps) {
  return (
    <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
      <CardHeader>
        <CardTitle className="text-lg text-green-800 dark:text-green-200">
          Analysis Complete
        </CardTitle>
        <CardDescription className="text-green-700 dark:text-green-300">
          {result.summary}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Metrics */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-lg bg-white p-4 dark:bg-zinc-900">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {result.metrics.filesAnalyzed}
            </p>
            <p className="text-sm text-zinc-500">Files Analyzed</p>
          </div>
          <div className="rounded-lg bg-white p-4 dark:bg-zinc-900">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {result.metrics.endpointsFound}
            </p>
            <p className="text-sm text-zinc-500">Endpoints Found</p>
          </div>
          <div className="rounded-lg bg-white p-4 dark:bg-zinc-900">
            <p
              className={`text-2xl font-bold ${
                (result.metrics.vulnerabilitiesFound || 0) > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              {result.metrics.vulnerabilitiesFound || 0}
            </p>
            <p className="text-sm text-zinc-500">Vulnerabilities</p>
          </div>
          <div className="rounded-lg bg-white p-4 dark:bg-zinc-900">
            <p
              className={`text-2xl font-bold ${
                result.metrics.issuesFound > 0
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              {result.metrics.issuesFound}
            </p>
            <p className="text-sm text-zinc-500">Total Issues</p>
          </div>
          <div className="rounded-lg bg-white p-4 dark:bg-zinc-900">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {formatDuration(result.metrics.analysisTime)}
            </p>
            <p className="text-sm text-zinc-500">Analysis Time</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid gap-4 md:grid-cols-2">
          <SecurityScore result={result} />
          <FindingsChart result={result} />
        </div>
      </CardContent>
    </Card>
  );
}
