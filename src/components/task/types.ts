export interface LogEntry {
  timestamp: number;
  level: "info" | "warn" | "error" | "success";
  message: string;
}

export interface ProgressData {
  current: number;
  total: number;
  stage: string;
}

export interface EndpointProfile {
  flow_name: string;
  purpose: string;
  entry_point: string;
  input_types: string[];
  output_types: string[];
  sensitivity_level: "low" | "medium" | "high" | "critical";
  mark_down: string;
}

export interface SecurityControl {
  control_id: string;
  name: string;
  description: string;
  category: string;
  importance: "critical" | "high" | "medium" | "low";
  owasp_mapping: string[];
}

export interface SecurityChecklist {
  flow_name: string;
  required_controls: SecurityControl[];
  recommended_controls: SecurityControl[];
  references: { title: string; url: string }[];
}

export interface CodeLocation {
  file: string;
  code_snippet: string;
}

export interface ImplementedControl {
  control_id: string;
  control_name: string;
  evidence: string;
  location: CodeLocation;
}

export interface MissingControl {
  control_id: string;
  control_name: string;
  reason: string;
  severity: "critical" | "high" | "medium" | "low";
  recommendation: string;
}

export interface AutoHandledControl {
  control_id: string;
  control_name: string;
  handled_by: string;
  explanation: string;
}

export interface Vulnerability {
  id: string;
  title: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  location: CodeLocation;
  recommendation: string;
}

export interface SecurityReport {
  flow_name: string;
  implemented: ImplementedControl[];
  missing: MissingControl[];
  auto_handled: AutoHandledControl[];
  vulnerabilities: Vulnerability[];
  summary: {
    total_controls: number;
    implemented_count: number;
    missing_count: number;
    auto_handled_count: number;
    vulnerabilities_count: number;
    overall_severity: "critical" | "high" | "medium" | "low" | "none";
  };
}

export interface AnalysisResult {
  summary: string;
  findings: Array<{
    type: string;
    severity: "info" | "warning" | "critical";
    message: string;
    file?: string;
  }>;
  endpointProfiles: EndpointProfile[];
  securityChecklists: SecurityChecklist[];
  securityReports: SecurityReport[];
  metrics: {
    filesAnalyzed: number;
    endpointsFound: number;
    securityChecklistsGenerated: number;
    securityReportsGenerated: number;
    issuesFound: number;
    vulnerabilitiesFound: number;
    analysisTime: number;
  };
}

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
