"use client";

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { MissingControl } from "../types";

interface MissingControlsSectionProps {
  controls: MissingControl[];
}

export function MissingControlsSection({ controls }: MissingControlsSectionProps) {
  if (controls.length === 0) return null;

  return (
    <Collapsible
      defaultOpen
      className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950"
    >
      <CollapsibleTrigger className="p-3 hover:bg-orange-100 dark:hover:bg-orange-900/50 rounded-lg">
        <span className="font-medium text-sm text-orange-800 dark:text-orange-200">
          ⚠️ Missing Controls ({controls.length})
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        <div className="space-y-3 pt-2">
          {controls.map((control, i) => (
            <div key={i} className="rounded-lg bg-white p-3 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {control.control_id}
                  </Badge>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {control.control_name}
                  </span>
                </div>
                <Badge
                  variant={
                    control.severity === "critical" || control.severity === "high"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {control.severity}
                </Badge>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                {control.reason}
              </p>
              <div className="rounded bg-zinc-100 p-2 dark:bg-zinc-800">
                <p className="text-xs text-zinc-500 mb-1">💡 Recommendation:</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {control.recommendation}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
