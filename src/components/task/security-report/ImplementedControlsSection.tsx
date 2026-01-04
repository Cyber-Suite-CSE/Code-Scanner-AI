"use client";

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ImplementedControl } from "../types";

interface ImplementedControlsSectionProps {
  controls: ImplementedControl[];
}

export function ImplementedControlsSection({ controls }: ImplementedControlsSectionProps) {
  if (controls.length === 0) return null;

  return (
    <Collapsible className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
      <CollapsibleTrigger className="p-3 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-lg">
        <span className="font-medium text-sm text-green-800 dark:text-green-200">
          ✅ Implemented Controls ({controls.length})
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        <div className="space-y-3 pt-2">
          {controls.map((control, i) => (
            <div key={i} className="rounded-lg bg-white p-3 dark:bg-zinc-900">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {control.control_id}
                </Badge>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {control.control_name}
                </span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                {control.evidence}
              </p>
              {control.location && (
                <div className="rounded bg-zinc-900 p-3 dark:bg-zinc-950">
                  <p className="text-xs text-zinc-400 mb-1 font-mono">
                    📁 {control.location.file}
                  </p>
                  <pre className="text-xs text-green-400 overflow-x-auto">
                    <code>{control.location.code_snippet}</code>
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
