'use client';

import { Scan } from '@/types';
import { CheckCircle, XCircle, Clock, FileText, Trash2 } from 'lucide-react';

interface ScanHistoryProps {
  scans: Scan[];
  currentScan: Scan | null;
  onScanSelect: (scan: Scan) => void;
}

export default function ScanHistory({ scans, currentScan, onScanSelect }: ScanHistoryProps) {
  const handleDeleteScan = async (scanId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/scan/${scanId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // The parent component should handle removing from the list
        // This is just for the API call
        console.log(`Scan ${scanId} deleted`);
      }
    } catch (error) {
      console.error('Failed to delete scan:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'scanning':
      case 'started':
        return <Clock className="w-4 h-4 text-blue-400 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'critical':
        return 'text-red-400';
      case 'high':
        return 'text-orange-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  if (scans.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">No scans yet</p>
        <p className="text-slate-500 text-sm mt-2">
          Upload a ZIP file to start your first scan
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {scans.map((scan) => (
        <div
          key={scan.id}
          onClick={() => onScanSelect(scan)}
          className={`
            p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:border-purple-500/50
            ${currentScan?.id === scan.id 
              ? 'border-purple-500 bg-purple-500/10' 
              : 'border-slate-600 bg-slate-700/30 hover:bg-slate-700/50'
            }
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(scan.status)}
                <h3 className="text-white font-medium truncate" title={scan.filename}>
                  {scan.filename}
                </h3>
              </div>
              
              <div className="space-y-1 text-sm">
                <p className="text-slate-400">
                  {scan.startTime.toLocaleDateString()} at {scan.startTime.toLocaleTimeString()}
                </p>
                
                {scan.status === 'scanning' || scan.status === 'started' ? (
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-slate-600 rounded-full h-1">
                      <div 
                        className="bg-purple-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${scan.progress}%` }}
                      />
                    </div>
                    <span className="text-slate-400 text-xs">{scan.progress}%</span>
                  </div>
                ) : scan.summary ? (
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-slate-400">
                      {scan.summary.filesScanned} files
                    </span>
                    <span className="text-slate-400">
                      {scan.summary.issuesFound} issues
                    </span>
                    <span className={getRiskLevelColor(scan.summary.riskLevel)}>
                      {scan.summary.riskLevel} risk
                    </span>
                  </div>
                ) : scan.status === 'failed' && scan.error ? (
                  <p className="text-red-400 text-xs">{scan.error}</p>
                ) : null}
              </div>
            </div>

            {/* Delete Button */}
            {scan.status === 'completed' || scan.status === 'failed' ? (
              <button
                onClick={(e) => handleDeleteScan(scan.id, e)}
                className="ml-2 p-1 text-slate-400 hover:text-red-400 transition-colors"
                title="Delete scan"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
