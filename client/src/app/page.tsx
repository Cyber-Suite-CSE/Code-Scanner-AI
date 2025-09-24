'use client';

import { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import ScanResults from '@/components/ScanResults';
import ScanHistory from '@/components/ScanHistory';
import { Scan } from '@/types';

export default function Home() {
  const [currentScan, setCurrentScan] = useState<Scan | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);

  const handleScanStart = (scan: Scan) => {
    setCurrentScan(scan);
    setScans(prev => [scan, ...prev]);
  };

  const handleScanUpdate = (updatedScan: Scan) => {
    setCurrentScan(updatedScan);
    setScans(prev => prev.map(scan => 
      scan.id === updatedScan.id ? updatedScan : scan
    ));
  };

  const handleScanSelect = (scan: Scan) => {
    setCurrentScan(scan);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                🔒 Code Security Scanner
              </h1>
              <p className="text-slate-300 mt-2">
                AI-powered security analysis for your codebase
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                ✓ Server Online
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Upload and Current Scan */}
          <div className="lg:col-span-2 space-y-8">
            {/* File Upload */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">
                Upload Codebase
              </h2>
              <FileUpload onScanStart={handleScanStart} />
            </div>

            {/* Current Scan Results */}
            {currentScan && (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
                <h2 className="text-xl font-semibold text-white mb-6">
                  Scan Results
                </h2>
                <ScanResults 
                  scan={currentScan} 
                  onScanUpdate={handleScanUpdate}
                />
              </div>
            )}
          </div>

          {/* Right Column - Scan History */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-6">
              Scan History
            </h2>
            <ScanHistory 
              scans={scans} 
              currentScan={currentScan}
              onScanSelect={handleScanSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}