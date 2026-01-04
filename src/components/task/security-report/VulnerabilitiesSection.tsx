"use client";

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Vulnerability } from "../types";

interface VulnerabilitiesSectionProps {
  vulnerabilities: Vulnerability[];
}

export function VulnerabilitiesSection({ vulnerabilities }: VulnerabilitiesSectionProps) {
  if (!vulnerabilities || vulnerabilities.length === 0) return null;

  return (
    <Collapsible
      defaultOpen
      className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
    >
      <CollapsibleTrigger className="p-3 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg">
        <span className="font-medium text-sm text-red-800 dark:text-red-200">
          🔴 Vulnerabilities ({vulnerabilities.length})
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        <div className="space-y-3 pt-2">
          {vulnerabilities.map((vuln, i) => (
            <div key={i} className="rounded-lg bg-white p-3 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {vuln.id}
                  </Badge>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {vuln.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {vuln.type.replace(/_/g, " ")}
                  </Badge>
                  <Badge
                    variant={
                      vuln.severity === "critical" || vuln.severity === "high"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {vuln.severity}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                {vuln.description}
              </p>
              {vuln.location && (
                <div className="rounded bg-zinc-900 p-3 dark:bg-zinc-950 mb-2">
                  <p className="text-xs text-zinc-400 mb-1 font-mono">
                    📁 {vuln.location.file}
                  </p>
                  <pre className="text-xs text-red-400 overflow-x-auto">
                    <code>{vuln.location.code_snippet}</code>
                  </pre>
                </div>
              )}
              <div className="rounded bg-zinc-100 p-2 dark:bg-zinc-800">
                <p className="text-xs text-zinc-500 mb-1">🛠️ Fix:</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {vuln.recommendation}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
