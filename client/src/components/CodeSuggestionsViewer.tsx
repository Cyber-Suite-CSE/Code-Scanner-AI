'use client';

import { useState } from 'react';
import { CodeSuggestion } from '@/types';
import { 
  ChevronDown, 
  ChevronRight, 
  Code, 
  Lightbulb, 
  CheckSquare,
  Clock,
  TrendingUp,
  Copy,
  CheckCircle,
  TestTube,
  Shield,
  AlertTriangle,
  BookOpen,
  ExternalLink
} from 'lucide-react';

interface CodeSuggestionsViewerProps {
  suggestions: CodeSuggestion[];
}

export default function CodeSuggestionsViewer({ suggestions }: CodeSuggestionsViewerProps) {
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const toggleSuggestion = (suggestionId: string) => {
    const newExpanded = new Set(expandedSuggestions);
    if (newExpanded.has(suggestionId)) {
      newExpanded.delete(suggestionId);
    } else {
      newExpanded.add(suggestionId);
    }
    setExpandedSuggestions(newExpanded);
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
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

  const getEffortColor = (effort: string) => {
    switch (effort.toLowerCase()) {
      case 'low':
        return 'text-green-400 bg-green-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'high':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getFilteredSuggestions = () => {
    if (selectedSeverity === 'all') {
      return suggestions;
    }
    return suggestions.filter(suggestion => suggestion.severity === selectedSeverity);
  };

  const severityCounts = suggestions.reduce((acc, suggestion) => {
    acc[suggestion.severity] = (acc[suggestion.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="text-center py-8">
        <Lightbulb className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-400">No code suggestions available</p>
        <p className="text-slate-500 text-sm mt-1">
          Suggestions will appear here when vulnerabilities are detected
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with statistics */}
      <div className="bg-slate-600/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Lightbulb className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-medium">Code Suggestions</h3>
          </div>
          <span className="text-slate-300 text-sm">{suggestions.length} total suggestions</span>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {suggestions.reduce((sum, s) => sum + s.riskReduction.percentage, 0)}%
            </div>
            <p className="text-slate-400 text-sm">Total Risk Reduction</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {suggestions.reduce((sum, s) => sum + s.estimatedEffort.hours, 0)}h
            </div>
            <p className="text-slate-400 text-sm">Total Effort</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {new Set(suggestions.map(s => s.language)).size}
            </div>
            <p className="text-slate-400 text-sm">Languages</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">
              {new Set(suggestions.map(s => s.framework)).size}
            </div>
            <p className="text-slate-400 text-sm">Frameworks</p>
          </div>
        </div>
      </div>

      {/* Severity Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedSeverity('all')}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            selectedSeverity === 'all' 
              ? 'bg-purple-600 text-white' 
              : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
          }`}
        >
          All ({suggestions.length})
        </button>
        {Object.entries(severityCounts).map(([severity, count]) => (
          <button
            key={severity}
            onClick={() => setSelectedSeverity(severity)}
            className={`px-3 py-1 rounded-full text-sm transition-colors capitalize ${
              selectedSeverity === severity 
                ? getSeverityColor(severity).replace('text-', 'bg-').replace('-400', '-600') + ' text-white'
                : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
            }`}
          >
            {severity} ({count})
          </button>
        ))}
      </div>

      {/* Suggestions List */}
      <div className="space-y-4">
        {getFilteredSuggestions().map((suggestion) => (
          <div key={suggestion.id} className="bg-slate-700/50 rounded-lg border border-slate-600">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => toggleSuggestion(suggestion.id)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {expandedSuggestions.has(suggestion.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <h4 className="text-white font-medium">{suggestion.title}</h4>
                    {suggestion.aiEnhanced && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                        AI Enhanced
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 text-sm mb-2">{suggestion.description}</p>
                  <p className="text-slate-400 text-sm">
                    {suggestion.file} (Line {suggestion.line})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium border capitalize ${getSeverityColor(suggestion.severity)}`}>
                    {suggestion.severity}
                  </span>
                  <span className="px-2 py-1 bg-slate-600 text-slate-300 text-xs rounded">
                    {suggestion.language}
                  </span>
                </div>
              </div>

              {/* Quick info - always visible */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-slate-300 text-sm">
                    {suggestion.riskReduction.percentage}% risk reduction
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-300 text-sm">
                    {suggestion.estimatedEffort.hours}h effort
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span className="text-slate-300 text-sm">
                    {suggestion.owaspCategory.split(' – ')[0]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  <span className="text-slate-300 text-sm">
                    {suggestion.relatedCWE}
                  </span>
                </div>
              </div>

              {/* Expanded content */}
              {expandedSuggestions.has(suggestion.id) && (
                <div className="space-y-4 border-t border-slate-600 pt-4">
                  {/* Code Examples */}
                  <div>
                    <h5 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Code Examples
                    </h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Vulnerable Code */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-red-400 text-sm font-medium">❌ Vulnerable</span>
                          <button
                            onClick={() => copyToClipboard(suggestion.codeExample.vulnerable, `vulnerable-${suggestion.id}`)}
                            className="text-slate-400 hover:text-white transition-colors"
                          >
                            {copiedCode === `vulnerable-${suggestion.id}` ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <pre className="bg-red-900/20 border border-red-500/30 rounded p-3 text-sm text-slate-200 overflow-x-auto">
                          <code>{suggestion.codeExample.vulnerable}</code>
                        </pre>
                      </div>

                      {/* Secure Code */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-green-400 text-sm font-medium">✅ Secure</span>
                          <button
                            onClick={() => copyToClipboard(suggestion.codeExample.secure, `secure-${suggestion.id}`)}
                            className="text-slate-400 hover:text-white transition-colors"
                          >
                            {copiedCode === `secure-${suggestion.id}` ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <pre className="bg-green-900/20 border border-green-500/30 rounded p-3 text-sm text-slate-200 overflow-x-auto">
                          <code>{suggestion.codeExample.secure}</code>
                        </pre>
                      </div>
                    </div>

                    <div className="mt-3 p-3 bg-blue-500/20 border border-blue-500/30 rounded">
                      <p className="text-blue-300 text-sm">
                        <strong>Explanation:</strong> {suggestion.codeExample.explanation}
                      </p>
                    </div>
                  </div>

                  {/* Implementation Steps */}
                  <div>
                    <h5 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                      <CheckSquare className="w-4 h-4" />
                      Implementation Steps
                    </h5>
                    <ol className="space-y-2 list-decimal list-inside text-slate-300 text-sm">
                      {suggestion.implementationSteps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Testing Guidance */}
                  <div>
                    <h5 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                      <TestTube className="w-4 h-4" />
                      Testing Guidance
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(suggestion.testingGuidance).map(([testType, guidance]) => (
                        <div key={testType} className="bg-slate-600/50 rounded p-3">
                          <h6 className="text-white text-xs font-medium mb-1 capitalize">
                            {testType.replace(/([A-Z])/g, ' $1')}
                          </h6>
                          <p className="text-slate-300 text-xs">{guidance}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Effort and Risk Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-600/50 rounded p-3">
                      <h6 className="text-white text-sm font-medium mb-2">Effort Estimation</h6>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs ${getEffortColor(suggestion.estimatedEffort.effort)}`}>
                          {suggestion.estimatedEffort.effort} effort
                        </span>
                        <span className="text-slate-300 text-sm">
                          {suggestion.estimatedEffort.hours} hours
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs">{suggestion.estimatedEffort.description}</p>
                    </div>
                    
                    <div className="bg-slate-600/50 rounded p-3">
                      <h6 className="text-white text-sm font-medium mb-2">Risk Reduction</h6>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-16 bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${suggestion.riskReduction.percentage}%` }}
                          />
                        </div>
                        <span className="text-green-400 text-sm font-medium">
                          {suggestion.riskReduction.percentage}%
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs">{suggestion.riskReduction.description}</p>
                    </div>
                  </div>

                  {/* AI Insights */}
                  {suggestion.aiInsights && suggestion.aiInsights.length > 0 && (
                    <div>
                      <h5 className="text-white text-sm font-medium mb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        AI Insights
                      </h5>
                      <div className="space-y-2">
                        {suggestion.aiInsights.map((insight, index) => (
                          <div key={index} className="bg-purple-500/20 border border-purple-500/30 rounded p-3">
                            <p className="text-purple-300 text-sm">{insight}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contextual Recommendations */}
                  {suggestion.contextualRecommendations && suggestion.contextualRecommendations.length > 0 && (
                    <div>
                      <h5 className="text-white text-sm font-medium mb-2">Contextual Recommendations</h5>
                      <ul className="space-y-1 text-slate-300 text-sm">
                        {suggestion.contextualRecommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-400 mt-1">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Alternative Approaches */}
                  {suggestion.alternativeApproaches && suggestion.alternativeApproaches.length > 0 && (
                    <div>
                      <h5 className="text-white text-sm font-medium mb-2">Alternative Approaches</h5>
                      <ul className="space-y-1 text-slate-300 text-sm">
                        {suggestion.alternativeApproaches.map((approach, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-green-400 mt-1">•</span>
                            {approach}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
