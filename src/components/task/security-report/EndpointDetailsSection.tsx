"use client";

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { EndpointProfile } from "../types";

interface EndpointDetailsSectionProps {
  endpoint: EndpointProfile;
}

export function EndpointDetailsSection({ endpoint }: EndpointDetailsSectionProps) {
  return (
    <Collapsible defaultOpen className="rounded-lg border border-zinc-200 dark:border-zinc-700">
      <CollapsibleTrigger className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg">
        <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
          📍 Endpoint Details
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        <div className="grid gap-3 sm:grid-cols-2 pt-2">
          <div>
            <p className="text-xs text-zinc-500">Entry Point</p>
            <p className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
              {endpoint.entry_point}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Sensitivity</p>
            <Badge
              variant={
                endpoint.sensitivity_level === "critical" ||
                endpoint.sensitivity_level === "high"
                  ? "destructive"
                  : "secondary"
              }
            >
              {endpoint.sensitivity_level}
            </Badge>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-zinc-500">Purpose</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {endpoint.purpose}
            </p>
          </div>
          {endpoint.input_types.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500">Input Types</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {endpoint.input_types.map((type, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-xs max-w-[150px] block overflow-hidden text-ellipsis whitespace-nowrap text-left cursor-default"
                    title={type}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {endpoint.output_types.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500">Output Types</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {endpoint.output_types.map((type, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-xs max-w-[150px] block overflow-hidden text-ellipsis whitespace-nowrap text-left cursor-default"
                    title={type}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
