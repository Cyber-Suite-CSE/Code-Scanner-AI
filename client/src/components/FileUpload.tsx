'use client';

import { useState, useCallback } from 'react';
import { Upload, FileArchive, AlertCircle } from 'lucide-react';
import { Scan } from '@/types';

interface FileUploadProps {
  onScanStart: (scan: Scan) => void;
}

export default function FileUpload({ onScanStart }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const zipFile = files.find(file => file.name.endsWith('.zip'));
    
    if (zipFile) {
      uploadFile(zipFile);
    } else {
      setError('Please upload a ZIP file containing your codebase.');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, []);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('codebase', file);

      const response = await fetch('http://localhost:5000/api/scan', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        const scan: Scan = {
          id: result.scanId,
          filename: file.name,
          status: 'started',
          progress: 0,
          startTime: new Date(),
        };
        onScanStart(scan);
      } else {
        setError(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to connect to server. Please make sure the server is running.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragging 
            ? 'border-purple-400 bg-purple-500/10' 
            : 'border-slate-600 hover:border-slate-500'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".zip"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center">
            {isUploading ? (
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
            ) : (
              <FileArchive className="w-8 h-8 text-slate-300" />
            )}
          </div>
          
          <div>
            <p className="text-lg font-medium text-white">
              {isUploading ? 'Uploading...' : 'Drop your ZIP file here'}
            </p>
            <p className="text-slate-400 mt-1">
              or click to browse files
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Upload className="w-4 h-4" />
            <span>Supports ZIP files up to 100MB</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-400 font-medium">Upload Error</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-slate-700/50 rounded-lg p-4">
        <h3 className="text-white font-medium mb-2">📋 Instructions</h3>
        <ul className="text-slate-300 text-sm space-y-1">
          <li>• Compress your codebase into a ZIP file</li>
          <li>• Ensure all source code files are included</li>
          <li>• The scanner supports multiple programming languages</li>
          <li>• Scan results will appear in real-time below</li>
        </ul>
      </div>
    </div>
  );
}
