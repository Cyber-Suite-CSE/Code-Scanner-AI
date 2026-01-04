"use client";

import { Badge } from "@/components/ui/badge";
import { AnalysisResult } from "./types";
import { SecurityReportCard } from "./SecurityReportCard";

interface SecurityReportsSectionProps {
  result: AnalysisResult;
}

export function SecurityReportsSection({ result }: SecurityReportsSectionProps) {
  if (!result.securityReports || result.securityReports.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Security Analysis Reports
        </h2>
        <Badge variant="outline">{result.securityReports.length} endpoints</Badge>
      </div>

      {result.securityReports.map((report, reportIndex) => {
        // Find matching endpoint and checklist
        const endpoint = result.endpointProfiles?.find(
          (ep) => ep.flow_name === report.flow_name
        );
        const checklist = result.securityChecklists?.find(
          (cl) => cl.flow_name === report.flow_name
        );

        return (
          <SecurityReportCard
            key={reportIndex}
            report={report}
            endpoint={endpoint}
            checklist={checklist}
          />
        );
      })}
    </div>
  );
}
