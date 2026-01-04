"use client";

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { SecurityChecklist, SecurityReport } from "../types";

interface ChecklistSectionProps {
  checklist: SecurityChecklist;
  report: SecurityReport;
}

export function ChecklistSection({ checklist, report }: ChecklistSectionProps) {
  return (
    <Collapsible className="rounded-lg border border-zinc-200 dark:border-zinc-700">
      <CollapsibleTrigger className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg">
        <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
          📋 Security Checklist
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        <div className="space-y-4 pt-2">
          {checklist.required_controls.length > 0 && (
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Required ({checklist.required_controls.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {checklist.required_controls.map((ctrl, i) => (
                  <Badge
                    key={i}
                    variant={
                      report.implemented.some((ic) => ic.control_id === ctrl.control_id)
                        ? "default"
                        : report.auto_handled.some((ac) => ac.control_id === ctrl.control_id)
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-xs"
                    title={ctrl.description}
                  >
                    {ctrl.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {checklist.recommended_controls.length > 0 && (
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Recommended ({checklist.recommended_controls.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {checklist.recommended_controls.map((ctrl, i) => (
                  <Badge
                    key={i}
                    variant={
                      report.implemented.some((ic) => ic.control_id === ctrl.control_id)
                        ? "default"
                        : report.auto_handled.some((ac) => ac.control_id === ctrl.control_id)
                          ? "secondary"
                          : "outline"
                    }
                    className="text-xs"
                    title={ctrl.description}
                  >
                    {ctrl.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {checklist.references.length > 0 && (
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                References
              </p>
              <div className="flex flex-wrap gap-2">
                {checklist.references.map((ref, i) => (
                  <a
                    key={i}
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {ref.title} ↗
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
