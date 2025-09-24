export interface Scan {
  id: string;
  filename: string;
  status: 'started' | 'scanning' | 'completed' | 'failed';
  progress: number;
  startTime: Date;
  endTime?: Date;
  currentStep?: string;
  lastCompletedStep?: string;
  reportFile?: string;
  summary?: {
    filesScanned: number;
    issuesFound: number;
    riskLevel: string;
  };
  error?: string;
}

export interface ScanReport {
  executionSummary: {
    totalFiles: number;
    issuesFound: number;
    suggestionsGenerated: number;
    executionTime: number;
  };
  securityAnalysis: {
    totalIssues: number;
    issuesByCategory: {
      critical?: SecurityIssue[];
      high?: SecurityIssue[];
      medium?: SecurityIssue[];
      low?: SecurityIssue[];
    };
    riskAssessment: {
      summary: {
        riskLevel: string;
        riskScore: number;
      };
    };
  };
  techStackAnalysis: {
    identifiedStacks: TechStack[];
  };
  actionPlan: {
    immediate: ActionItem[];
    shortTerm: ActionItem[];
    longTerm: ActionItem[];
  };
  appendix: {
    rulesUsed: number;
  };
}

export interface SecurityIssue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  file: string;
  line?: number;
  recommendation: string;
  cweId?: string;
  cvssScore?: number;
}

export interface TechStack {
  name: string;
  version?: string;
  category: string;
  confidence: number;
}

export interface ActionItem {
  priority: string;
  action: string;
  description: string;
  impact: string;
}
