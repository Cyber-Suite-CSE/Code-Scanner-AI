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
  Bug
} from 'lucide-react';
import { Scan, ScanReport } from '@/types';
import SecurityChart from './SecurityChart';
import ReportViewer from './ReportViewer';

interface ScanResultsProps {
  scan: Scan;
  onScanUpdate: (scan: Scan) => void;
}

export default function ScanResults({ scan, onScanUpdate }: ScanResultsProps) {
  const [report, setReport] = useState<ScanReport | null>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    let ws: WebSocket;
    let pollInterval: NodeJS.Timeout;

    // Connect to WebSocket for real-time updates
    const connectWebSocket = () => {
      try {
        ws = new WebSocket('ws://localhost:5000');
        
        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'subscribe', scanId: scan.id }));
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'scanUpdate' && data.scanId === scan.id) {
            const updatedScan = {
              ...data.data,
              startTime: new Date(data.data.startTime),
              endTime: data.data.endTime ? new Date(data.data.endTime) : undefined,
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
          const response = await fetch(`http://localhost:5000/api/scan/${scan.id}`);
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
        const response = await fetch(`http://localhost:5000/api/scan/${scanId}/report`);
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
  }, [scan.id, scan.status, report, onScanUpdate]);

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
            href={`http://localhost:5000/reports/${scan.reportFile}`}
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
