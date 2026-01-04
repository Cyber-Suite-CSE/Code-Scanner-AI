"use client";

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  SecurityReport,
  EndpointProfile,
  SecurityChecklist,
} from "./types";
import {
  VulnerabilitiesSection,
  MissingControlsSection,
  ImplementedControlsSection,
  AutoHandledSection,
  EndpointDetailsSection,
  SecuritySummary,
  ChecklistSection,
} from "./security-report";

interface SecurityReportCardProps {
  report: SecurityReport;
  endpoint?: EndpointProfile;
  checklist?: SecurityChecklist;
}

export function SecurityReportCard({
  report,
  endpoint,
  checklist,
}: SecurityReportCardProps) {
  const hasVulnerabilities = (report.vulnerabilities?.length || 0) > 0;
  const hasMissing = report.summary.missing_count > 0;
  const isSecure = report.summary.overall_severity === "none";

  return (
    <Collapsible className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <CollapsibleTrigger className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg">
        <div className="flex-1">
          {/* Header Row */}
          <div className="flex items-center gap-3 mb-2">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {report.flow_name}
            </span>
            {hasVulnerabilities && (
              <Badge variant="destructive" className="text-xs">
                {report.vulnerabilities.length} vuln
              </Badge>
            )}
            {hasMissing && (
              <Badge
                variant={
                  report.summary.overall_severity === "critical" ||
                  report.summary.overall_severity === "high"
                    ? "destructive"
                    : "secondary"
                }
                className="text-xs"
              >
                {report.summary.missing_count} missing
              </Badge>
            )}
            {isSecure && (
              <Badge
                variant="outline"
                className="text-xs text-green-600 border-green-600"
              >
                ✓ Secure
              </Badge>
            )}
          </div>

          {/* Overview Row */}
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            {endpoint && (
              <>
                <span className="font-mono text-xs">{endpoint.entry_point}</span>
                <Badge variant="outline" className="text-xs">
                  {endpoint.sensitivity_level}
                </Badge>
              </>
            )}
            <span className="text-xs">
              {report.summary.implemented_count} ✓ | {report.summary.missing_count} ⚠ |{" "}
              {report.summary.auto_handled_count} 🔧
            </span>
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="p-4 space-y-4">
          {/* Endpoint Overview */}
          {endpoint && <EndpointDetailsSection endpoint={endpoint} />}

          {/* Security Summary - Always visible */}
          <SecuritySummary summary={report.summary} />

          {/* Vulnerabilities */}
          <VulnerabilitiesSection vulnerabilities={report.vulnerabilities} />

          {/* Missing Controls */}
          <MissingControlsSection controls={report.missing} />

          {/* Implemented Controls */}
          <ImplementedControlsSection controls={report.implemented} />

          {/* Auto-Handled Controls */}
          <AutoHandledSection controls={report.auto_handled} />

          {/* Security Checklist Reference */}
          {checklist && <ChecklistSection checklist={checklist} report={report} />}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
