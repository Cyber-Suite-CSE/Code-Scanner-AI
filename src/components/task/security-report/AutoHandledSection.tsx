"use client";

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { AutoHandledControl } from "../types";

interface AutoHandledSectionProps {
  controls: AutoHandledControl[];
}

export function AutoHandledSection({ controls }: AutoHandledSectionProps) {
  if (controls.length === 0) return null;

  return (
    <Collapsible className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
      <CollapsibleTrigger className="p-3 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg">
        <span className="font-medium text-sm text-blue-800 dark:text-blue-200">
          🔧 Auto-Handled ({controls.length})
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
                <Badge variant="secondary" className="text-xs">
                  {control.handled_by}
                </Badge>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {control.explanation}
              </p>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
