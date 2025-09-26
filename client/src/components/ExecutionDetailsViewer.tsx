'use client';

import { ScanReport } from '@/types';
import { 
  Clock, 
  Activity, 
  CheckCircle, 
  FileText, 
  Zap,
  Calendar,
  Timer,
  Cpu,
  MemoryStick,
  BarChart3,
  Search,
  Shield,
  Eye,
  Hammer
} from 'lucide-react';

interface ExecutionDetailsViewerProps {
  report: ScanReport;
}

export default function ExecutionDetailsViewer({ report }: ExecutionDetailsViewerProps) {
  const getAgentIcon = (agentName: string) => {
    switch (agentName.toLowerCase()) {
      case 'sentinel':
        return <Search className="w-4 h-4 text-indigo-400" />;
      case 'guardian':
        return <Shield className="w-4 h-4 text-indigo-400" />;
      case 'inspector':
        return <Eye className="w-4 h-4 text-indigo-400" />;
      case 'forge':
        return <Hammer className="w-4 h-4 text-indigo-400" />;
      default:
        return <Activity className="w-4 h-4 text-indigo-400" />;
    }
  };

  const getAgentDescription = (agentName: string) => {
    switch (agentName.toLowerCase()) {
      case 'sentinel':
        return 'File structure and technology stack analysis';
      case 'guardian':
        return 'Security rules and pattern generation';
      case 'inspector':
        return 'Code vulnerability scanning and detection';
      case 'forge':
        return 'Comprehensive security report generation';
      default:
        return 'Agent processing and analysis';
    }
  };

  const formatDuration = (milliseconds: number) => {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }
    const seconds = Math.round(milliseconds / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString()
      };
    } catch (error) {
      return { date: 'Unknown', time: 'Unknown' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Metadata Section */}
      {report.metadata && (
        <div className="bg-slate-700/50 rounded-lg p-4">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Scan Metadata
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-600/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-green-400" />
                <span className="text-slate-300 text-sm">Generated At</span>
              </div>
              <div className="text-white text-sm">
                <div>{formatDateTime(report.metadata.generatedAt).date}</div>
                <div className="text-slate-400 text-xs">{formatDateTime(report.metadata.generatedAt).time}</div>
              </div>
            </div>
            
            <div className="bg-slate-600/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Timer className="w-4 h-4 text-blue-400" />
                <span className="text-slate-300 text-sm">Scan Duration</span>
              </div>
              <div className="text-white text-sm">
                {Math.abs(report.metadata.scanDuration) > 1000 ? 
                  formatDuration(Math.abs(report.metadata.scanDuration)) : 
                  'N/A'
                }
              </div>
            </div>
            
            <div className="bg-slate-600/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-slate-300 text-sm">Version</span>
              </div>
              <div className="text-white text-sm">{report.metadata.version}</div>
            </div>
            
            <div className="bg-slate-600/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-orange-400" />
                <span className="text-slate-300 text-sm">Workflow</span>
              </div>
              <div className="text-white text-sm capitalize">{report.metadata.workflow}</div>
            </div>
          </div>
        </div>
      )}

      {/* Execution Summary */}
      <div className="bg-slate-700/50 rounded-lg p-4">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-green-400" />
          Execution Summary
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-600/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300 text-sm">Files Scanned</span>
            </div>
            <div className="text-2xl font-bold text-white">{report.executionSummary.totalFiles}</div>
          </div>
          
          <div className="bg-slate-600/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-red-400" />
              <span className="text-slate-300 text-sm">Issues Found</span>
            </div>
            <div className="text-2xl font-bold text-white">{report.executionSummary.issuesFound}</div>
          </div>
          
          <div className="bg-slate-600/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-slate-300 text-sm">Suggestions</span>
            </div>
            <div className="text-2xl font-bold text-white">{report.executionSummary.suggestionsGenerated}</div>
          </div>
          
          <div className="bg-slate-600/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-green-400" />
              <span className="text-slate-300 text-sm">Execution Time</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatDuration(report.executionSummary.executionTime)}
            </div>
          </div>
        </div>

        {/* Steps Executed */}
        {report.executionSummary.stepsExecuted && (
          <div className="mb-6">
            <h4 className="text-white font-medium mb-3">Workflow Steps</h4>
            <div className="flex flex-wrap gap-2">
              {report.executionSummary.stepsExecuted.map((step, index) => (
                <div key={step} className="flex items-center gap-2 bg-slate-600/50 rounded-lg px-3 py-2">
                  <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                    <span className="text-green-400 text-xs font-bold">{index + 1}</span>
                  </div>
                  <span className="text-slate-300 text-sm capitalize">{step}</span>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agent Execution Times */}
        {report.executionSummary.agentExecutionTimes && (
          <div>
            <h4 className="text-white font-medium mb-3">Agent Performance</h4>
            <div className="space-y-3">
              {Object.entries(report.executionSummary.agentExecutionTimes).map(([agent, time]) => (
                <div key={agent} className="bg-slate-600/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/20 rounded">
                        {getAgentIcon(agent)}
                      </div>
                      <div>
                        <h5 className="text-white font-medium capitalize">{agent} Agent</h5>
                        <p className="text-slate-400 text-sm">{getAgentDescription(agent)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">{formatDuration(time!)}</div>
                      <div className="text-slate-400 text-xs">execution time</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Agent Execution Details */}
      {report.appendix?.agentExecutionDetails && (
        <div className="bg-slate-700/50 rounded-lg p-4">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Detailed Agent Execution
          </h3>
          <div className="space-y-4">
            {Object.entries(report.appendix.agentExecutionDetails).map(([agentName, details]) => (
              <div key={agentName} className="bg-slate-600/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-500/20 rounded">
                    {getAgentIcon(agentName)}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium capitalize">{agentName} Agent</h4>
                    <p className="text-slate-400 text-sm">{getAgentDescription(agentName)}</p>
                  </div>
                  <div className="text-right">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      details.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      details.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {details.status}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-700/50 rounded p-3">
                    <div className="text-slate-400 text-xs mb-1">Executions</div>
                    <div className="text-white font-medium">{details.executionCount}</div>
                  </div>
                  
                  <div className="bg-slate-700/50 rounded p-3">
                    <div className="text-slate-400 text-xs mb-1">Results</div>
                    <div className="text-white font-medium">{details.resultsCount}</div>
                  </div>
                  
                  <div className="bg-slate-700/50 rounded p-3">
                    <div className="text-slate-400 text-xs mb-1">Last Execution</div>
                    <div className="text-white font-medium text-xs">
                      {formatDateTime(details.lastExecution).time}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workflow Metrics */}
      {report.appendix?.workflowMetrics && (
        <div className="bg-slate-700/50 rounded-lg p-4">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-400" />
            Workflow Performance Metrics
          </h3>
          
          {/* Overall metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-600/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Timer className="w-4 h-4 text-green-400" />
                <span className="text-slate-300 text-sm">Total Execution</span>
              </div>
              <div className="text-2xl font-bold text-green-400">
                {formatDuration(report.appendix.workflowMetrics.totalExecutionTime)}
              </div>
            </div>
            
            {report.appendix.workflowMetrics.resourceUsage && (
              <>
                <div className="bg-slate-600/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MemoryStick className="w-4 h-4 text-blue-400" />
                    <span className="text-slate-300 text-sm">Memory Usage</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-400">
                    {Math.round(report.appendix.workflowMetrics.resourceUsage.memory)}MB
                  </div>
                </div>
                
                <div className="bg-slate-600/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    <span className="text-slate-300 text-sm">CPU Usage</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-400">
                    {Math.round(report.appendix.workflowMetrics.resourceUsage.cpu)}%
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Agent performance breakdown */}
          {report.appendix.workflowMetrics.agentPerformance && (
            <div>
              <h4 className="text-white font-medium mb-3">Agent Performance Breakdown</h4>
              <div className="space-y-3">
                {Object.entries(report.appendix.workflowMetrics.agentPerformance).map(([agent, perf]) => (
                  <div key={agent} className="bg-slate-600/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getAgentIcon(agent)}
                        <span className="text-white font-medium capitalize">{agent}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {perf.success ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-red-400" />
                        )}
                        <span className={`text-sm ${perf.success ? 'text-green-400' : 'text-red-400'}`}>
                          {perf.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Execution Time:</span>
                        <span className="text-slate-300 ml-2">{formatDuration(perf.executionTime)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Items Processed:</span>
                        <span className="text-slate-300 ml-2">{perf.itemsProcessed}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tools Used */}
      {report.appendix?.toolsUsed && report.appendix.toolsUsed.length > 0 && (
        <div className="bg-slate-700/50 rounded-lg p-4">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Tools Used
          </h3>
          <div className="flex flex-wrap gap-2">
            {report.appendix.toolsUsed.map((tool, index) => (
              <span key={index} className="px-3 py-1 bg-yellow-500/20 text-yellow-300 text-sm rounded-full">
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Rules Used */}
      {/* <div className="bg-slate-700/50 rounded-lg p-4">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" />
          Security Rules Applied
        </h3>
        <div className="text-center">
          <div className="text-4xl font-bold text-purple-400 mb-2">{report.appendix.rulesUsed}</div>
          <p className="text-slate-400">Total security rules applied during scan</p>
        </div>
      </div> */}
    </div>
  );
}
