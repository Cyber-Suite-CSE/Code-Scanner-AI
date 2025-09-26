'use client';

import { useState } from 'react';
import { ScanReport, SecurityIssue } from '@/types';
import { 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  Shield, 
  FileText, 
  Clock,
  Target,
  Zap,
  Code,
  BookOpen,
  TrendingUp,
  Award,
  Lightbulb,
  ExternalLink,
  Copy,
  CheckCircle,
  Activity,
  Search,
  Eye,
  Hammer,
  XCircle,
  BarChart3,
  Settings
} from 'lucide-react';
import CodeSuggestionsViewer from './CodeSuggestionsViewer';
import ExecutionDetailsViewer from './ExecutionDetailsViewer';
import EnhancedSecurityIssueViewer from './EnhancedSecurityIssueViewer';

interface ReportViewerProps {
  report: ScanReport;
}

export default function ReportViewer({ report }: ReportViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'issues']));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const toggleIssue = (issueId: string) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(issueId)) {
      newExpanded.delete(issueId);
    } else {
      newExpanded.add(issueId);
    }
    setExpandedIssues(newExpanded);
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSnippet(id);
      setTimeout(() => setCopiedSnippet(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-400 bg-green-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'hard':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getAgentIcon = (agentName: string) => {
    switch (agentName.toLowerCase()) {
      case 'sentinel':
        return <Search className="w-4 h-4" />;
      case 'guardian':
        return <Shield className="w-4 h-4" />;
      case 'inspector':
        return <Eye className="w-4 h-4" />;
      case 'forge':
        return <Hammer className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getAgentDescription = (agentName: string) => {
    switch (agentName.toLowerCase()) {
      case 'sentinel':
        return 'Analyzing file structure and technology stack';
      case 'guardian':
        return 'Generating security rules and patterns';
      case 'inspector':
        return 'Scanning code for vulnerabilities';
      case 'forge':
        return 'Creating comprehensive security report';
      default:
        return 'Processing...';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'high':
        return 'text-orange-400 bg-orange-500/20 border-orange-500/50';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 'low':
        return 'text-green-400 bg-green-500/20 border-green-500/50';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  const getAllIssues = (): SecurityIssue[] => {
    const allIssues: SecurityIssue[] = [];
    Object.entries(report.securityAnalysis.issuesByCategory).forEach(([severity, issues]) => {
      if (issues) {
        allIssues.push(...issues.map(issue => ({ ...issue, severity: severity as any })));
      }
    });
    return allIssues;
  };

  const getFilteredIssues = (): SecurityIssue[] => {
    const allIssues = getAllIssues();
    if (selectedCategory === 'all') {
      return allIssues;
    }
    return allIssues.filter(issue => issue.severity === selectedCategory);
  };

  const Section = ({ title, id, icon, children }: { 
    title: string; 
    id: string; 
    icon: React.ReactNode; 
    children: React.ReactNode;
  }) => (
    <div className="bg-slate-700/50 rounded-lg border border-slate-600">
      <button
        onClick={() => toggleSection(id)}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-600/50 transition-colors rounded-t-lg"
      >
        {expandedSections.has(id) ? (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-400" />
        )}
        {icon}
        <span className="text-white font-medium">{title}</span>
      </button>
      
      {expandedSections.has(id) && (
        <div className="p-4 pt-0 border-t border-slate-600">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Section 
        title="Executive Summary" 
        id="summary" 
        icon={<FileText className="w-5 h-5 text-blue-400" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-600/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300 text-sm">Files Scanned</span>
            </div>
            <p className="text-2xl font-bold text-white">{report.executionSummary.totalFiles}</p>
          </div>
          
          <div className="bg-slate-600/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-slate-300 text-sm">Issues Found</span>
            </div>
            <p className="text-2xl font-bold text-white">{report.executionSummary.issuesFound}</p>
          </div>
          
          <div className="bg-slate-600/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-slate-300 text-sm">Risk Level</span>
            </div>
            <p className={`text-2xl font-bold ${getSeverityColor(report.securityAnalysis.riskAssessment.summary.riskLevel).split(' ')[0]}`}>
              {report.securityAnalysis.riskAssessment.summary.riskLevel}
            </p>
          </div>
          
          <div className="bg-slate-600/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-green-400" />
              <span className="text-slate-300 text-sm">Scan Time</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {Math.round(report.executionSummary.executionTime / 1000)}s
            </p>
          </div>
        </div>
      </Section>

      {/* Security Issues */}
      <Section 
        title="Security Issues" 
        id="issues" 
        icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
      >
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedCategory === 'all' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
              }`}
            >
              All ({getAllIssues().length})
            </button>
            {Object.entries(report.securityAnalysis.issuesByCategory).map(([severity, issues]) => (
              issues && issues.length > 0 && (
                <button
                  key={severity}
                  onClick={() => setSelectedCategory(severity)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors capitalize ${
                    selectedCategory === severity 
                      ? getSeverityColor(severity).replace('text-', 'bg-').replace('-400', '-600') + ' text-white'
                      : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  }`}
                >
                  {severity} ({issues.length})
                </button>
              )
            ))}
          </div>

          {/* Issues List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {getFilteredIssues().map((issue, index) => (
              <EnhancedSecurityIssueViewer
                key={issue.id || index}
                issue={issue}
                isExpanded={expandedIssues.has(issue.id)}
                onToggle={toggleIssue}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* Tech Stack */}
      <Section 
        title="Technology Stack" 
        id="techstack" 
        icon={<Zap className="w-5 h-5 text-yellow-400" />}
      >
        <div className="space-y-6">
          {/* Display identified stacks */}
          {report.techStackAnalysis?.identifiedStacks && report.techStackAnalysis.identifiedStacks.length > 0 && (
            <div>
              <h4 className="text-white font-medium mb-3">Detected Technologies</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {report.techStackAnalysis.identifiedStacks.map((stack, index) => (
                  <div key={index} className="bg-slate-600/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium">
                        {typeof stack === 'string' ? stack : (stack.name || stack.language || 'Unknown')}
                      </h4>
                      {(stack.confidence !== undefined) && (
                        <span className="text-slate-400 text-sm">
                          {Math.round((stack.confidence || 0) * 100)}%
                        </span>
                      )}
                    </div>
                    {stack.category && (
                      <p className="text-slate-300 text-sm">{stack.category}</p>
                    )}
                    {stack.version && (
                      <p className="text-slate-400 text-xs mt-1">v{stack.version}</p>
                    )}
                    {stack.frameworks && stack.frameworks.length > 0 && (
                      <div className="mt-2">
                        <p className="text-slate-400 text-xs mb-1">Frameworks:</p>
                        <div className="flex flex-wrap gap-1">
                          {stack.frameworks.map((framework, fIndex) => (
                            <span key={fIndex} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                              {typeof framework === 'string' ? framework : framework.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {stack.databases && stack.databases.length > 0 && (
                      <div className="mt-2">
                        <p className="text-slate-400 text-xs mb-1">Databases:</p>
                        <div className="flex flex-wrap gap-1">
                          {stack.databases.map((db, dbIndex) => (
                            <span key={dbIndex} className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded">
                              {typeof db === 'string' ? db : db.type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Display security goals if available */}
          {report.techStackAnalysis?.goals && report.techStackAnalysis.goals.length > 0 && (
            <div>
              <h4 className="text-white font-medium mb-3">Security Goals</h4>
              <div className="space-y-2">
                {report.techStackAnalysis.goals.map((goal, index) => (
                  <div key={index} className="bg-slate-600/50 rounded-lg p-3">
                    <h5 className="text-white font-medium">{goal.category || goal.type || 'Security Goal'}</h5>
                    <p className="text-slate-300 text-sm mt-1">{goal.description || goal.goal || goal}</p>
                    {goal.priority && (
                      <span className={`inline-block px-2 py-1 rounded text-xs mt-2 ${
                        goal.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                        goal.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-green-500/20 text-green-300'
                      }`}>
                        {goal.priority} priority
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Display entry points if available */}
          {report.techStackAnalysis?.entryPoints && report.techStackAnalysis.entryPoints.length > 0 && (
            <div>
              <h4 className="text-white font-medium mb-3">Entry Points</h4>
              <div className="space-y-2">
                {report.techStackAnalysis.entryPoints.map((entry, index) => (
                  <div key={index} className="bg-slate-600/50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-white font-medium">{entry.file || entry.path || entry}</h5>
                      {entry.type && (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">
                          {entry.type}
                        </span>
                      )}
                    </div>
                    {entry.description && (
                      <p className="text-slate-300 text-sm mt-1">{entry.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security recommendations for tech stack */}
          {report.techStackAnalysis?.securityRecommendations && report.techStackAnalysis.securityRecommendations.length > 0 && (
            <div>
              <h4 className="text-white font-medium mb-3">Technology-Specific Recommendations</h4>
              <div className="space-y-2">
                {report.techStackAnalysis.securityRecommendations.map((rec, index) => (
                  <div key={index} className="bg-slate-600/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-white font-medium">{rec.technology}</h5>
                      <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(rec.severity)}`}>
                        {rec.severity}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm mb-2">{rec.recommendation}</p>
                    <p className="text-slate-400 text-xs">{rec.reason}</p>
                    {rec.resources && rec.resources.length > 0 && (
                      <div className="mt-2">
                        <p className="text-slate-400 text-xs mb-1">Resources:</p>
                        <div className="space-y-1">
                          {rec.resources.map((resource, rIndex) => (
                            <a
                              key={rIndex}
                              href={resource}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {resource}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback message if no tech stack data */}
          {(!report.techStackAnalysis?.identifiedStacks || report.techStackAnalysis.identifiedStacks.length === 0) &&
           (!report.techStackAnalysis?.goals || report.techStackAnalysis.goals.length === 0) && (
            <div className="text-center py-8">
              <Zap className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-400">No technology stack information available</p>
              <p className="text-slate-500 text-sm mt-1">
                The scanner may still be analyzing or no technologies were detected
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* Security Insights */}
      {report.insights && (
        <Section 
          title="Security Insights" 
          id="insights" 
          icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
        >
          <div className="space-y-6">
            {/* Security Score */}
            {report.insights.securityScore && (
              <div>
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Security Score
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-600/50 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-white mb-2">
                        {report.insights.securityScore.overall}/100
                      </div>
                      <p className="text-slate-300 text-sm">Overall Security Score</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(report.insights.securityScore.categories).map(([category, score]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-slate-300 text-sm capitalize">{category}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-700 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full"
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span className="text-white text-sm font-medium w-8">{score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Top Vulnerability Types */}
            {report.insights.topVulnerabilityTypes && (
              <div>
                <h4 className="text-white font-medium mb-3">Top Vulnerability Types</h4>
                <div className="space-y-2">
                  {report.insights.topVulnerabilityTypes.map((vuln, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-600/50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-red-500/20 rounded flex items-center justify-center">
                          <span className="text-red-400 text-xs font-bold">{index + 1}</span>
                        </div>
                        <span className="text-white font-medium">{vuln.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300 text-sm">{vuln.count} issues</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          vuln.trend === 'increasing' ? 'bg-red-500/20 text-red-300' :
                          vuln.trend === 'decreasing' ? 'bg-green-500/20 text-green-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {vuln.trend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Factors */}
            {report.insights.riskFactors && (
              <div>
                <h4 className="text-white font-medium mb-3">Key Risk Factors</h4>
                <div className="space-y-2">
                  {report.insights.riskFactors.map((factor, index) => (
                    <div key={index} className="bg-slate-600/50 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          factor.impact === 'high' ? 'bg-red-400' :
                          factor.impact === 'medium' ? 'bg-yellow-400' :
                          'bg-green-400'
                        }`} />
                        <div className="flex-1">
                          <h5 className="text-white font-medium">{factor.factor}</h5>
                          <p className="text-slate-300 text-sm mt-1">{factor.description}</p>
                          <span className={`inline-block px-2 py-1 rounded text-xs mt-2 ${
                            factor.impact === 'high' ? 'bg-red-500/20 text-red-300' :
                            factor.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-green-500/20 text-green-300'
                          }`}>
                            {factor.impact} impact
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Benchmarking */}
            {report.insights.benchmarking && (
              <div>
                <h4 className="text-white font-medium mb-3">Industry Benchmarking</h4>
                <div className="bg-slate-600/50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{report.insights.benchmarking.yourScore}</div>
                      <p className="text-slate-300 text-sm">Your Score</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-300">{report.insights.benchmarking.industryAverage}</div>
                      <p className="text-slate-300 text-sm">Industry Average</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">{report.insights.benchmarking.ranking}</div>
                      <p className="text-slate-300 text-sm">Ranking</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Action Plan */}
      <Section 
        title="Action Plan" 
        id="actionplan" 
        icon={<Target className="w-5 h-5 text-green-400" />}
      >
        <div className="space-y-6">
          {report.actionPlan.immediate.length > 0 && (
            <div>
              <h4 className="text-red-400 font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Immediate Actions
              </h4>
              <div className="space-y-2">
                {report.actionPlan.immediate.map((action, index) => (
                  <div key={index} className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                    <h5 className="text-white font-medium">{action.action}</h5>
                    <p className="text-red-300 text-sm mt-1">{action.description}</p>
                    <p className="text-red-400 text-xs mt-2">Impact: {action.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {report.actionPlan.shortTerm.length > 0 && (
            <div>
              <h4 className="text-yellow-400 font-medium mb-3">Short Term Actions</h4>
              <div className="space-y-2">
                {report.actionPlan.shortTerm.map((action, index) => (
                  <div key={index} className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
                    <h5 className="text-white font-medium">{action.action}</h5>
                    <p className="text-yellow-300 text-sm mt-1">{action.description}</p>
                    <p className="text-yellow-400 text-xs mt-2">Impact: {action.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {report.actionPlan.longTerm.length > 0 && (
            <div>
              <h4 className="text-blue-400 font-medium mb-3">Long Term Actions</h4>
              <div className="space-y-2">
                {report.actionPlan.longTerm.map((action, index) => (
                  <div key={index} className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3">
                    <h5 className="text-white font-medium">{action.action}</h5>
                    <p className="text-blue-300 text-sm mt-1">{action.description}</p>
                    <p className="text-blue-400 text-xs mt-2">Impact: {action.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Agent Execution Details */}
      {report.appendix?.agentReports && (
        <Section 
          title="Agent Execution Details" 
          id="agentdetails" 
          icon={<Activity className="w-5 h-5 text-indigo-400" />}
        >
          <div className="space-y-6">
            {Object.entries(report.appendix.agentReports).map(([agentName, agentData]) => (
              <div key={agentName} className="bg-slate-600/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-500/20 rounded">
                    {agentName === 'sentinel' && <Search className="w-5 h-5 text-indigo-400" />}
                    {agentName === 'guardian' && <Shield className="w-5 h-5 text-indigo-400" />}
                    {agentName === 'inspector' && <Eye className="w-5 h-5 text-indigo-400" />}
                    {agentName === 'forge' && <Hammer className="w-5 h-5 text-indigo-400" />}
                  </div>
                  <div>
                    <h4 className="text-white font-medium capitalize">{agentName} Agent</h4>
                    <p className="text-slate-400 text-sm">{getAgentDescription(agentName)}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {/* Show execution metrics if available */}
                  {report.executionSummary?.agentExecutionTimes?.[agentName as keyof typeof report.executionSummary.agentExecutionTimes] && (
                    <div className="bg-slate-700/50 rounded p-3">
                      <h5 className="text-white text-sm font-medium mb-2">Execution Metrics</h5>
                      <p className="text-slate-300 text-sm">
                        Execution Time: {Math.round(report.executionSummary.agentExecutionTimes[agentName as keyof typeof report.executionSummary.agentExecutionTimes]! / 1000)}s
                      </p>
                    </div>
                  )}
                  
                  {/* Show agent-specific data */}
                  <div className="bg-slate-700/50 rounded p-3">
                    <h5 className="text-white text-sm font-medium mb-2">Agent Output</h5>
                    <div className="space-y-2">
                      {typeof agentData === 'object' && agentData !== null ? (
                        <div className="text-sm">
                          {Object.entries(agentData).map(([key, value]) => (
                            <div key={key} className="flex justify-between py-1">
                              <span className="text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                              <span className="text-slate-300">
                                {Array.isArray(value) ? `${value.length} items` : 
                                 typeof value === 'object' ? 'Object' : 
                                 String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-300 text-sm">
                          {typeof agentData === 'string' ? agentData : JSON.stringify(agentData)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Code Suggestions */}
      {report.codeSuggestions && report.codeSuggestions.suggestions && report.codeSuggestions.suggestions.length > 0 && (
        <Section 
          title="Code Suggestions" 
          id="codesuggestions" 
          icon={<Code className="w-5 h-5 text-blue-400" />}
        >
          <CodeSuggestionsViewer suggestions={report.codeSuggestions.suggestions} />
        </Section>
      )}

      {/* Execution Details */}
      <Section 
        title="Execution Details & Performance" 
        id="executiondetails" 
        icon={<BarChart3 className="w-5 h-5 text-green-400" />}
      >
        <ExecutionDetailsViewer report={report} />
      </Section>
    </div>
  );
}
