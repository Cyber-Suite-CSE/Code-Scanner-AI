'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  FileText, 
  TrendingUp,
  Shield,
  Bug,
  Activity,
  Zap,
  Eye,
  Hammer,
  Search
} from 'lucide-react';
import { Scan, ScanReport, WorkflowEvent } from '@/types';
import SecurityChart from './SecurityChart';
import ReportViewer from './ReportViewer';

interface ScanResultsProps {
  scan: Scan;
  onScanUpdate: (scan: Scan) => void;
}

export default function ScanResults({ scan, onScanUpdate }: ScanResultsProps) {
  const [report, setReport] = useState<ScanReport | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [workflowEvents, setWorkflowEvents] = useState<WorkflowEvent[]>([]);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [agentProgress, setAgentProgress] = useState<{[key: string]: { status: string; duration?: number }}>({});

  useEffect(() => {
    let ws: WebSocket;
    let pollInterval: NodeJS.Timeout;

    // Connect to WebSocket for real-time updates
    const connectWebSocket = () => {
      try {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'subscribe', scanId: scan.id }));
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'scanUpdate' && data.scanId === scan.id) {
            // Handle workflow events
            if (data.data.type) {
              const workflowEvent: WorkflowEvent = {
                type: data.data.type,
                timestamp: data.data.timestamp || new Date().toISOString(),
                status: data.data.status,
                step: data.data.step,
                duration: data.data.duration,
                agent: data.data.agent,
                error: data.data.error
              };

              setWorkflowEvents(prev => [...prev, workflowEvent]);

              // Track agent progress
              if (workflowEvent.type === 'agentStatus' && workflowEvent.agent) {
                setActiveAgent(workflowEvent.agent);
                setAgentProgress(prev => ({
                  ...prev,
                  [workflowEvent.agent!]: {
                    status: workflowEvent.status || 'running',
                    duration: workflowEvent.duration
                  }
                }));
              }

              if (workflowEvent.type === 'stepComplete' && workflowEvent.agent) {
                setAgentProgress(prev => ({
                  ...prev,
                  [workflowEvent.agent!]: {
                    status: 'completed',
                    duration: workflowEvent.duration
                  }
                }));
              }
            }

            const updatedScan = {
              ...data.data,
              startTime: new Date(data.data.startTime || scan.startTime),
              endTime: data.data.endTime ? new Date(data.data.endTime) : undefined,
              workflowEvents: workflowEvents
            };
            onScanUpdate(updatedScan);

            // Fetch report if scan is completed
            if (updatedScan.status === 'completed' && updatedScan.reportFile) {
              fetchReport(scan.id);
            }
          }
        };

        ws.onerror = () => {
          // Fallback to polling if WebSocket fails
          startPolling();
        };

      } catch (error) {
        // Fallback to polling if WebSocket connection fails
        startPolling();
      }
    };

    // Fallback polling mechanism
    const startPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          const response = await fetch(`${apiUrl}/api/scan/${scan.id}`);
          const result = await response.json();
          
          if (result.success) {
            const updatedScan = {
              ...result.scan,
              startTime: new Date(result.scan.startTime),
              endTime: result.scan.endTime ? new Date(result.scan.endTime) : undefined,
            };
            onScanUpdate(updatedScan);

            // Fetch report if scan is completed
            if (updatedScan.status === 'completed' && updatedScan.reportFile && !report) {
              fetchReport(scan.id);
            }

            // Stop polling if scan is finished
            if (updatedScan.status === 'completed' || updatedScan.status === 'failed') {
              clearInterval(pollInterval);
            }
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 2000);
    };

    const fetchReport = async (scanId: string) => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/scan/${scanId}/report`);
        const result = await response.json();
        
        if (result.success) {
          setReport(result.report);
        }
      } catch (error) {
        console.error('Failed to fetch report:', error);
      }
    };

    // Start real-time updates
    if (scan.status === 'started' || scan.status === 'scanning') {
      connectWebSocket();
    } else if (scan.status === 'completed' && scan.reportFile && !report) {
      fetchReport(scan.id);
    }

    return () => {
      if (ws) {
        ws.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [scan.id, scan.status, report, onScanUpdate, workflowEvents]);

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

  const getAgentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-500/20';
      case 'running':
        return 'text-blue-400 bg-blue-500/20';
      case 'error':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getStatusIcon = () => {
    switch (scan.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'scanning':
      case 'started':
        return <Clock className="w-5 h-5 text-blue-400 animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (scan.status) {
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'scanning':
      case 'started':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'critical':
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

  return (
    <div className="space-y-6">
      {/* Scan Status */}
      <div className="bg-slate-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="font-medium text-white">{scan.filename}</h3>
              <p className={`text-sm capitalize ${getStatusColor()}`}>
                {scan.status}
                {scan.currentStep && ` - ${scan.currentStep}`}
              </p>
            </div>
          </div>
          <div className="text-right text-sm text-slate-400">
            <p>Started: {scan.startTime.toLocaleTimeString()}</p>
            {scan.endTime && (
              <p>Completed: {scan.endTime.toLocaleTimeString()}</p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Progress</span>
            <span>{scan.progress}%</span>
          </div>
          <div className="w-full bg-slate-600 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${scan.progress}%` }}
            />
          </div>
        </div>

        {/* Error Message */}
        {scan.error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-300 text-sm">{scan.error}</p>
          </div>
        )}
      </div>

      {/* Agent Workflow Progress */}
      {(scan.status === 'scanning' || scan.status === 'started') && (
        <div className="bg-slate-700/50 rounded-lg p-4">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            AI Agent Workflow
          </h3>
          <div className="space-y-3">
            {['sentinel', 'guardian', 'inspector', 'forge'].map((agent) => {
              const progress = agentProgress[agent];
              const isActive = activeAgent === agent;
              const isCompleted = progress?.status === 'completed';
              const hasError = progress?.status === 'error';
              
              return (
                <div key={agent} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  isActive ? 'bg-blue-500/20 border border-blue-500/50' : 
                  isCompleted ? 'bg-green-500/20 border border-green-500/50' :
                  hasError ? 'bg-red-500/20 border border-red-500/50' :
                  'bg-slate-600/50'
                }`}>
                  <div className={`p-2 rounded ${
                    isActive ? 'bg-blue-500/30' :
                    isCompleted ? 'bg-green-500/30' :
                    hasError ? 'bg-red-500/30' :
                    'bg-slate-500/30'
                  }`}>
                    {getAgentIcon(agent)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium capitalize">{agent} Agent</h4>
                      {isActive && <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />}
                      {isCompleted && <CheckCircle className="w-4 h-4 text-green-400" />}
                      {hasError && <XCircle className="w-4 h-4 text-red-400" />}
                    </div>
                    <p className="text-slate-300 text-sm">{getAgentDescription(agent)}</p>
                    {progress?.duration && (
                      <p className="text-slate-400 text-xs mt-1">
                        Completed in {Math.round(progress.duration / 1000)}s
                      </p>
                    )}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium border ${
                    isCompleted ? getAgentStatusColor('completed') :
                    isActive ? getAgentStatusColor('running') :
                    hasError ? getAgentStatusColor('error') :
                    getAgentStatusColor('pending')
                  }`}>
                    {isCompleted ? 'Completed' :
                     isActive ? 'Running' :
                     hasError ? 'Error' :
                     'Pending'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Workflow Steps */}
      {workflowEvents.length > 0 && (
        <div className="bg-slate-700/50 rounded-lg p-4">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Workflow Step Details
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {workflowEvents.map((event, index) => {
              const timestamp = new Date(event.timestamp).toLocaleTimeString();
              
              return (
                <div key={index} className={`p-3 rounded-lg border ${
                  event.type === 'workflowError' || event.type === 'stepError' ? 'bg-red-500/10 border-red-500/30' :
                  event.type === 'stepComplete' ? 'bg-green-500/10 border-green-500/30' :
                  event.type === 'stepStart' || event.type === 'agentStatus' ? 'bg-blue-500/10 border-blue-500/30' :
                  'bg-slate-600/30 border-slate-500/30'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {event.type === 'stepStart' && <Clock className="w-4 h-4 text-blue-400" />}
                        {event.type === 'stepComplete' && <CheckCircle className="w-4 h-4 text-green-400" />}
                        {event.type === 'stepError' && <XCircle className="w-4 h-4 text-red-400" />}
                        {event.type === 'agentStatus' && getAgentIcon(event.agent || 'unknown')}
                        {event.type === 'workflowStatus' && <Activity className="w-4 h-4 text-purple-400" />}
                        {event.type === 'workflowError' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                        
                        <span className="text-white font-medium capitalize">
                          {event.type.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </span>
                        
                        {event.agent && (
                          <span className="px-2 py-1 bg-slate-600 text-slate-300 text-xs rounded capitalize">
                            {event.agent}
                          </span>
                        )}
                      </div>
                      
                      {event.step && (
                        <p className="text-slate-300 text-sm">{event.step}</p>
                      )}
                      
                      {event.status && (
                        <p className="text-slate-400 text-sm">Status: {event.status}</p>
                      )}
                      
                      {event.error && (
                        <p className="text-red-300 text-sm mt-1">Error: {event.error}</p>
                      )}
                      
                      {event.duration && (
                        <p className="text-slate-500 text-xs mt-1">
                          Duration: {Math.round(event.duration / 1000)}s
                        </p>
                      )}
                    </div>
                    
                    <span className="text-slate-500 text-xs">{timestamp}</span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {workflowEvents.length === 0 && (
            <div className="text-center py-4">
              <p className="text-slate-400">No workflow events recorded yet</p>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      {scan.summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 p-2 rounded">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{scan.summary.filesScanned}</p>
                <p className="text-slate-400 text-sm">Files Scanned</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-500/20 p-2 rounded">
                <Bug className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{scan.summary.issuesFound}</p>
                <p className="text-slate-400 text-sm">Issues Found</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500/20 p-2 rounded">
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${getRiskLevelColor(scan.summary.riskLevel).split(' ')[0]}`}>
                  {scan.summary.riskLevel}
                </p>
                <p className="text-slate-400 text-sm">Risk Level</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Chart */}
      {report && (
        <div className="bg-slate-700/50 rounded-lg p-4">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Security Analysis
          </h3>
          <SecurityChart report={report} />
        </div>
      )}

      {/* Report Actions */}
      {scan.status === 'completed' && scan.reportFile && (
        <div className="flex gap-4">
          <button
            onClick={() => setShowReport(!showReport)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {showReport ? 'Hide Report' : 'View Detailed Report'}
          </button>
          
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/reports/${scan.reportFile}`}
            download
            className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Download Report
          </a>
        </div>
      )}

      {/* Detailed Report */}
      {showReport && report && (
        <ReportViewer report={report} />
      )}
    </div>
  );
}
