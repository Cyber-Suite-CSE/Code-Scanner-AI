export interface Scan {
  id: string;
  filename: string;
  filePath?: string;
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
  workflowEvents?: WorkflowEvent[];
}

export interface WorkflowEvent {
  type: 'workflowStatus' | 'stepStart' | 'stepComplete' | 'stepError' | 'agentStatus' | 'workflowError';
  timestamp: string;
  status?: string;
  step?: string;
  duration?: number;
  agent?: string;
  error?: string;
}

export interface ScanReport {
  executionSummary: {
    totalFiles: number;
    issuesFound: number;
    suggestionsGenerated: number;
    executionTime: number;
    scanStartTime?: string;
    scanEndTime?: string;
    agentExecutionTimes?: {
      sentinel?: number;
      guardian?: number;
      inspector?: number;
      forge?: number;
    };
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
      details?: {
        vulnerabilityPatterns?: string[];
        securityHotspots?: string[];
        complianceIssues?: string[];
      };
    };
    vulnerabilityPatterns?: VulnerabilityPattern[];
    complianceMapping?: ComplianceMapping;
  };
  techStackAnalysis: {
    identifiedStacks: TechStack[];
    goals?: Array<any>;
    entryPoints?: Array<any>;
    securityRecommendations?: TechStackRecommendation[];
    dependencyAnalysis?: DependencyAnalysis;
  };
  actionPlan: {
    immediate: ActionItem[];
    shortTerm: ActionItem[];
    longTerm: ActionItem[];
    preventive?: ActionItem[];
  };
  appendix: {
    rulesUsed: number;
    agentReports?: {
      sentinel?: any;
      guardian?: any;
      inspector?: any;
      forge?: any;
    };
    workflowMetrics?: WorkflowMetrics;
  };
  insights?: SecurityInsights;
}

export interface SecurityIssue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  file: string;
  line?: number;
  column?: number;
  recommendation: string;
  cweId?: string;
  cvssScore?: number;
  codeSnippet?: string;
  context?: {
    before?: string[];
    after?: string[];
  };
  remediation?: {
    effort: 'low' | 'medium' | 'high';
    complexity: 'simple' | 'moderate' | 'complex';
    steps: string[];
    references?: string[];
  };
  compliance?: {
    owasp?: string[];
    nist?: string[];
    iso27001?: string[];
  };
}

export interface TechStack {
  name?: string;
  language?: string;
  version?: string;
  category?: string;
  confidence?: number;
  frameworks?: Array<string | { name: string; version?: string }>;
  databases?: Array<string | { type: string; version?: string }>;
}

export interface ActionItem {
  priority: string;
  action: string;
  description: string;
  impact: string;
  estimatedTime?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  resources?: string[];
}

export interface VulnerabilityPattern {
  pattern: string;
  frequency: number;
  severity: string;
  affectedFiles: string[];
  description: string;
}

export interface ComplianceMapping {
  owasp: {
    category: string;
    items: string[];
  }[];
  cwe: {
    id: string;
    name: string;
    count: number;
  }[];
  nist: string[];
  iso27001: string[];
}

export interface TechStackRecommendation {
  technology: string;
  recommendation: string;
  severity: string;
  reason: string;
  resources: string[];
}

export interface DependencyAnalysis {
  totalDependencies: number;
  outdatedDependencies: number;
  vulnerableDependencies: number;
  dependencies: {
    name: string;
    version: string;
    latestVersion?: string;
    vulnerabilities?: {
      severity: string;
      description: string;
    }[];
  }[];
}

export interface WorkflowMetrics {
  totalExecutionTime: number;
  agentPerformance: {
    [agentName: string]: {
      executionTime: number;
      success: boolean;
      itemsProcessed: number;
    };
  };
  resourceUsage: {
    memory: number;
    cpu: number;
  };
}

export interface SecurityInsights {
  topVulnerabilityTypes: {
    type: string;
    count: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }[];
  securityScore: {
    overall: number;
    categories: {
      [category: string]: number;
    };
  };
  riskFactors: {
    factor: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
  }[];
  recommendations: {
    category: string;
    priority: number;
    description: string;
    impact: string;
  }[];
  benchmarking: {
    industryAverage: number;
    yourScore: number;
    ranking: string;
  };
}
