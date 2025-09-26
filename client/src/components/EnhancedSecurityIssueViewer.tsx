'use client';

import { useState } from 'react';
import { SecurityIssue } from '@/types';
import { 
  ChevronDown, 
  ChevronRight, 
  Code, 
  Shield, 
  AlertTriangle,
  Eye,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  BookOpen,
  Lightbulb,
  TrendingUp,
  Clock,
  Award,
  Brain,
  Target,
  Info,
  Zap
} from 'lucide-react';

interface EnhancedSecurityIssueViewerProps {
  issue: SecurityIssue;
  isExpanded: boolean;
  onToggle: (issueId: string) => void;
}

export default function EnhancedSecurityIssueViewer({ issue, isExpanded, onToggle }: EnhancedSecurityIssueViewerProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(id);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
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

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'immediate':
        return 'text-red-400 bg-red-500/20';
      case 'high':
        return 'text-orange-400 bg-orange-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'low':
        return 'text-green-400 bg-green-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatFileName = (filePath: string) => {
    const parts = filePath.split('/');
    return parts[parts.length - 1] || filePath;
  };

  return (
    <div className="bg-slate-600/50 rounded-lg border border-slate-500">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => onToggle(issue.id)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              <h4 className="text-white font-medium">
                {issue.name || issue.title}
              </h4>
              {issue.ruleSource && (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                  {issue.ruleSource}
                </span>
              )}
            </div>
            <p className="text-slate-300 text-sm mb-2">{issue.description}</p>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>{formatFileName(issue.file)}</span>
              {issue.line && (
                <>
                  <span>•</span>
                  <span>Line {issue.line}{issue.column ? `:${issue.column}` : ''}</span>
                </>
              )}
              {issue.language && (
                <>
                  <span>•</span>
                  <span className="capitalize">{issue.language}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`px-2 py-1 rounded text-xs font-medium border capitalize ${getSeverityColor(issue.severity)}`}>
              {issue.severity}
            </span>
            {issue.confidence !== undefined && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(issue.confidence)} bg-slate-700`}>
                {Math.round(issue.confidence * 100)}%
              </span>
            )}
            {issue.cvssScore && (
              <span className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-300">
                CVSS: {issue.cvssScore.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Always visible quick info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          {issue.matchedText && (
            <div className="bg-slate-700/50 rounded p-2">
              <div className="text-slate-400 text-xs mb-1">Matched Pattern</div>
              <code className="text-slate-200 text-xs font-mono break-all">{issue.matchedText}</code>
            </div>
          )}
          {issue.mitigation && (
            <div className="bg-slate-700/50 rounded p-2">
              <div className="text-slate-400 text-xs mb-1">Quick Fix</div>
              <p className="text-slate-300 text-xs">{issue.mitigation}</p>
            </div>
          )}
          {issue.exploitability && (
            <div className="bg-slate-700/50 rounded p-2">
              <div className="text-slate-400 text-xs mb-1">Exploitability</div>
              <span className={`text-xs font-medium capitalize ${getPriorityColor(issue.exploitability)}`}>
                {issue.exploitability}
              </span>
            </div>
          )}
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="space-y-4 border-t border-slate-500 pt-4">
            {/* Code Context */}
            {(issue.lineContent || issue.contextLines || issue.codeSnippet) && (
              <div>
                <h5 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Code Context
                </h5>
                
                {issue.contextLines && issue.contextLines.length > 0 ? (
                  <div className="bg-slate-800 rounded p-3 overflow-x-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 text-sm">Context around line {issue.line}</span>
                      <button
                        onClick={() => copyToClipboard(issue.contextLines!.join('\n'), `context-${issue.id}`)}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        {copiedText === `context-${issue.id}` ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <pre className="text-sm text-slate-200">
                      <code>
                        {issue.contextLines.map((line, index) => {
                          const lineNumber = (issue.line || 1) - Math.floor(issue.contextLines!.length / 2) + index;
                          const isTargetLine = lineNumber === issue.line;
                          return (
                            <div
                              key={index}
                              className={`${isTargetLine ? 'bg-red-500/20 border-l-2 border-red-500' : ''} px-2 py-1`}
                            >
                              <span className="text-slate-500 mr-3 select-none">{lineNumber.toString().padStart(3)}</span>
                              {line}
                            </div>
                          );
                        })}
                      </code>
                    </pre>
                  </div>
                ) : issue.lineContent ? (
                  <div className="bg-slate-800 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 text-sm">Line {issue.line}</span>
                      <button
                        onClick={() => copyToClipboard(issue.lineContent!, `line-${issue.id}`)}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        {copiedText === `line-${issue.id}` ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <pre className="text-sm text-slate-200 bg-red-500/20 border-l-2 border-red-500 px-3 py-2">
                      <code>{issue.lineContent}</code>
                    </pre>
                  </div>
                ) : issue.codeSnippet ? (
                  <div className="bg-slate-800 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 text-sm">Code Snippet</span>
                      <button
                        onClick={() => copyToClipboard(issue.codeSnippet!, `snippet-${issue.id}`)}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        {copiedText === `snippet-${issue.id}` ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <pre className="text-sm text-slate-200">
                      <code>{issue.codeSnippet}</code>
                    </pre>
                  </div>
                ) : null}
              </div>
            )}

            {/* AI Analysis */}
            {issue.aiAnalysis && (
              <div>
                <h5 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  AI Analysis
                </h5>
                <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">
                        {Math.round(issue.aiAnalysis.confidenceScore * 100)}%
                      </div>
                      <p className="text-purple-300 text-sm">AI Confidence</p>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold capitalize ${getPriorityColor(issue.aiAnalysis.exploitability).split(' ')[0]}`}>
                        {issue.aiAnalysis.exploitability}
                      </div>
                      <p className="text-purple-300 text-sm">Exploitability</p>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold capitalize ${getPriorityColor(issue.aiAnalysis.businessImpact).split(' ')[0]}`}>
                        {issue.aiAnalysis.businessImpact}
                      </div>
                      <p className="text-purple-300 text-sm">Business Impact</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h6 className="text-purple-300 text-sm font-medium mb-2">Analysis Explanation</h6>
                    <p className="text-purple-200 text-sm">{issue.aiAnalysis.explanation}</p>
                  </div>

                  {issue.aiAnalysis.recommendations && issue.aiAnalysis.recommendations.length > 0 && (
                    <div>
                      <h6 className="text-purple-300 text-sm font-medium mb-2">AI Recommendations</h6>
                      <ul className="space-y-1">
                        {issue.aiAnalysis.recommendations.map((rec, index) => (
                          <li key={index} className="text-purple-200 text-sm flex items-start gap-2">
                            <span className="text-purple-400 mt-1">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Security Factors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Risk Factors */}
              {issue.riskFactors && issue.riskFactors.length > 0 && (
                <div>
                  <h5 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Risk Factors
                  </h5>
                  <div className="space-y-2">
                    {issue.riskFactors.map((factor, index) => (
                      <div key={index} className="bg-red-500/20 border border-red-500/30 rounded px-3 py-2">
                        <span className="text-red-300 text-sm">{factor.replace(/[-_]/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mitigating Factors */}
              {issue.mitigatingFactors && issue.mitigatingFactors.length > 0 && (
                <div>
                  <h5 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Mitigating Factors
                  </h5>
                  <div className="space-y-2">
                    {issue.mitigatingFactors.map((factor, index) => (
                      <div key={index} className="bg-green-500/20 border border-green-500/30 rounded px-3 py-2">
                        <span className="text-green-300 text-sm">{factor.replace(/[-_]/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Security Indicators */}
            {(issue.hasValidation !== undefined || issue.hasSanitization !== undefined || 
              issue.hasParameterization !== undefined || issue.hasErrorHandling !== undefined ||
              issue.hasAuthentication !== undefined || issue.hasEncryption !== undefined) && (
              <div>
                <h5 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Security Controls Present
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: 'hasValidation', label: 'Input Validation', value: issue.hasValidation },
                    { key: 'hasSanitization', label: 'Data Sanitization', value: issue.hasSanitization },
                    { key: 'hasParameterization', label: 'Parameterization', value: issue.hasParameterization },
                    { key: 'hasErrorHandling', label: 'Error Handling', value: issue.hasErrorHandling },
                    { key: 'hasAuthentication', label: 'Authentication', value: issue.hasAuthentication },
                    { key: 'hasEncryption', label: 'Encryption', value: issue.hasEncryption }
                  ].map(({ key, label, value }) => (
                    value !== undefined && (
                      <div key={key} className="flex items-center gap-2 bg-slate-700/50 rounded px-3 py-2">
                        {value ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                        <span className={`text-sm ${value ? 'text-green-300' : 'text-red-300'}`}>
                          {label}
                        </span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Code Examples */}
            {issue.examples && (
              <div>
                <h5 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Code Examples
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {issue.examples.vulnerable && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-red-400 text-sm font-medium">❌ Vulnerable</span>
                        <button
                          onClick={() => copyToClipboard(issue.examples!.vulnerable, `vulnerable-${issue.id}`)}
                          className="text-slate-400 hover:text-white transition-colors"
                        >
                          {copiedText === `vulnerable-${issue.id}` ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <pre className="bg-red-900/20 border border-red-500/30 rounded p-3 text-sm text-slate-200 overflow-x-auto">
                        <code>{issue.examples.vulnerable}</code>
                      </pre>
                    </div>
                  )}
                  {issue.examples.secure && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-green-400 text-sm font-medium">✅ Secure</span>
                        <button
                          onClick={() => copyToClipboard(issue.examples.secure, `secure-${issue.id}`)}
                          className="text-slate-400 hover:text-white transition-colors"
                        >
                          {copiedText === `secure-${issue.id}` ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <pre className="bg-green-900/20 border border-green-500/30 rounded p-3 text-sm text-slate-200 overflow-x-auto">
                        <code>{issue.examples.secure}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Compliance & Standards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CWE & OWASP */}
              <div>
                <h5 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Security Standards
                </h5>
                <div className="space-y-2">
                  {issue.cwe && (
                    <div className="bg-slate-700/50 rounded px-3 py-2">
                      <span className="text-orange-400 text-sm font-medium">CWE: </span>
                      <span className="text-slate-300 text-sm">{issue.cwe}</span>
                    </div>
                  )}
                  {issue.owasp && (
                    <div className="bg-slate-700/50 rounded px-3 py-2">
                      <span className="text-blue-400 text-sm font-medium">OWASP: </span>
                      <span className="text-slate-300 text-sm">{issue.owasp}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Detection Info */}
              <div>
                <h5 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Detection Details
                </h5>
                <div className="space-y-2">
                  {issue.detectedAt && (
                    <div className="bg-slate-700/50 rounded px-3 py-2">
                      <span className="text-slate-400 text-sm">Detected: </span>
                      <span className="text-slate-300 text-sm">
                        {new Date(issue.detectedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {issue.ruleId && (
                    <div className="bg-slate-700/50 rounded px-3 py-2">
                      <span className="text-slate-400 text-sm">Rule ID: </span>
                      <span className="text-slate-300 text-sm font-mono">{issue.ruleId}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Remediation Priority */}
            {issue.remediationPriority && (
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h5 className="text-white text-sm font-medium mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Remediation Priority
                </h5>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded text-sm font-medium capitalize ${getPriorityColor(issue.remediationPriority)}`}>
                    {issue.remediationPriority}
                  </span>
                  {issue.businessImpact && (
                    <span className="text-slate-400 text-sm">
                      Business Impact: <span className="capitalize">{issue.businessImpact}</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Evidence */}
            {issue.evidence && issue.evidence.length > 0 && (
              <div>
                <h5 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Supporting Evidence
                </h5>
                <ul className="space-y-1">
                  {issue.evidence.map((evidence, index) => (
                    <li key={index} className="text-slate-300 text-sm flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      {evidence}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Recommendations */}
            {issue.aiRecommendations && issue.aiRecommendations.length > 0 && (
              <div>
                <h5 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  AI-Powered Recommendations
                </h5>
                <div className="space-y-2">
                  {issue.aiRecommendations.map((rec, index) => (
                    <div key={index} className="bg-blue-500/20 border border-blue-500/30 rounded p-3">
                      <p className="text-blue-300 text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
