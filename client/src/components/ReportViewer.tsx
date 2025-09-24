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
  Zap
} from 'lucide-react';

interface ReportViewerProps {
  report: ScanReport;
}

export default function ReportViewer({ report }: ReportViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
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
              <div key={index} className="bg-slate-600/50 rounded-lg p-4 border border-slate-500">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{issue.title}</h4>
                    <p className="text-slate-300 text-sm mt-1">{issue.file}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium border capitalize ${getSeverityColor(issue.severity)}`}>
                    {issue.severity}
                  </span>
                </div>
                
                <p className="text-slate-300 text-sm mb-3">{issue.description}</p>
                
                <div className="bg-slate-700 rounded p-3">
                  <h5 className="text-white text-sm font-medium mb-2">💡 Recommendation</h5>
                  <p className="text-slate-300 text-sm">{issue.recommendation}</p>
                </div>
                
                {issue.cweId && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                    <span>CWE-{issue.cweId}</span>
                    {issue.cvssScore && <span>• CVSS: {issue.cvssScore}</span>}
                  </div>
                )}
              </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {report.techStackAnalysis.identifiedStacks.map((stack, index) => (
            <div key={index} className="bg-slate-600/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-medium">{stack.name}</h4>
                <span className="text-slate-400 text-sm">{Math.round(stack.confidence * 100)}%</span>
              </div>
              <p className="text-slate-300 text-sm">{stack.category}</p>
              {stack.version && (
                <p className="text-slate-400 text-xs mt-1">v{stack.version}</p>
              )}
            </div>
          ))}
        </div>
      </Section>

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
    </div>
  );
}
