"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApiResponse } from "./types";

interface SuccessResultProps {
  result: ApiResponse;
  isStartingAnalysis: boolean;
  onStartAnalysis: () => void;
  onReset: () => void;
}

export function SuccessResult({
  result,
  isStartingAnalysis,
  onStartAnalysis,
  onReset,
}: SuccessResultProps) {
  return (
    <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
      <CardContent>
        <div className="flex items-start gap-3">
          <svg
            className="h-6 w-6 shrink-0 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="font-semibold text-green-800 dark:text-green-200">
              {result.message}
            </h3>
            <p className="mt-1 text-sm text-green-700 dark:text-green-300">
              {result.totalFiles} files ready for analysis
              {result.repoName && ` from ${result.repoName}`}
            </p>

            {/* Framework Detection Info */}
            {result.framework && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                  {result.framework.framework === "unknown"
                    ? "Generic Project"
                    : result.framework.framework.charAt(0).toUpperCase() +
                      result.framework.framework.slice(1)}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    result.framework.confidence === "high"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      : result.framework.confidence === "medium"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  }`}
                >
                  {result.framework.confidence} confidence
                </span>
              </div>
            )}

            {/* Stats */}
            {result.stats && (
              <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                Processed {result.stats.totalFilesProcessed} files, included{" "}
                {result.stats.filesIncluded}, ignored {result.stats.filesIgnored}
              </p>
            )}

            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={onStartAnalysis}
                disabled={isStartingAnalysis}
              >
                {isStartingAnalysis ? (
                  <>
                    <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Starting...
                  </>
                ) : (
                  "Start Analysis"
                )}
              </Button>
              <Button size="sm" variant="outline" onClick={onReset}>
                Upload Another
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
