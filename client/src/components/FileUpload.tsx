'use client';

import { useState, useCallback } from 'react';
import { Upload, FileArchive, AlertCircle, Github, Link } from 'lucide-react';
import { Scan } from '@/types';

interface FileUploadProps {
  onScanStart: (scan: Scan) => void;
}

type UploadMethod = 'zip' | 'github';

export default function FileUpload({ onScanStart }: FileUploadProps) {
  const [activeTab, setActiveTab] = useState<UploadMethod>('zip');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // GitHub specific state
  const [githubToken, setGithubToken] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [isValidatingAccess, setIsValidatingAccess] = useState(false);

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

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/scan`, {
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

  const handleGithubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!githubToken.trim() || !repoUrl.trim()) {
      setError('Please provide both GitHub token and repository URL');
      return;
    }

    setIsValidatingAccess(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/scan/github`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: githubToken,
          repoUrl: repoUrl,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const scan: Scan = {
          id: result.scanId,
          filename: result.repoName || 'GitHub Repository',
          status: 'started',
          progress: 0,
          startTime: new Date(),
        };
        onScanStart(scan);
        
        // Clear form on success
        setGithubToken('');
        setRepoUrl('');
      } else {
        setError(result.message || 'Failed to access repository. Please check your token and repository permissions.');
      }
    } catch (error) {
      console.error('GitHub scan error:', error);
      setError('Failed to connect to server. Please make sure the server is running.');
    } finally {
      setIsValidatingAccess(false);
    }
  };

  const parseRepoUrl = (url: string) => {
    try {
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace('.git', '')
        };
      }
    } catch (error) {
      console.error('Error parsing repo URL:', error);
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex bg-slate-700/50 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('zip')}
          className={`
            flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
            ${activeTab === 'zip' 
              ? 'bg-purple-600 text-white shadow-md' 
              : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
            }
          `}
        >
          <FileArchive className="w-4 h-4" />
          Zip Upload
        </button>
        <button
          onClick={() => setActiveTab('github')}
          className={`
            flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
            ${activeTab === 'github' 
              ? 'bg-purple-600 text-white shadow-md' 
              : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
            }
          `}
        >
          <Github className="w-4 h-4" />
          GitHub Access
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'zip' ? (
        /* ZIP Upload Section */
        <div className="space-y-4">
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

          {/* ZIP Instructions */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">📋 ZIP Upload Instructions</h3>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>• Compress your codebase into a ZIP file</li>
              <li>• Ensure all source code files are included</li>
              <li>• The scanner supports multiple programming languages</li>
              <li>• Scan results will appear in real-time below</li>
            </ul>
          </div>
        </div>
      ) : (
        /* GitHub Access Section */
        <div className="space-y-4">
          <form onSubmit={handleGithubSubmit} className="space-y-4">
            <div className="bg-slate-700/30 rounded-lg p-6 border border-slate-600">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                  <Github className="w-5 h-5 text-slate-300" />
                </div>
                <div>
                  <h3 className="text-white font-medium">GitHub Repository Access</h3>
                  <p className="text-slate-400 text-sm">Connect your GitHub repository for scanning</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* GitHub Token Input */}
                <div>
                  <label htmlFor="github-token" className="block text-sm font-medium text-slate-300 mb-2">
                    Fine-grained Personal Access Token
                  </label>
                  <input
                    id="github-token"
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="github_pat_11A..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    disabled={isValidatingAccess}
                  />
                </div>

                {/* Repository URL Input */}
                <div>
                  <label htmlFor="repo-url" className="block text-sm font-medium text-slate-300 mb-2">
                    Repository URL
                  </label>
                  <div className="relative">
                    <input
                      id="repo-url"
                      type="url"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/username/repository"
                      className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      disabled={isValidatingAccess}
                    />
                    <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isValidatingAccess || !githubToken.trim() || !repoUrl.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  {isValidatingAccess ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      Validating Access...
                    </>
                  ) : (
                    <>
                      <Github className="w-4 h-4" />
                      Start Scan
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* GitHub Instructions */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">� GitHub Setup Instructions</h3>
            <div className="text-slate-300 text-sm space-y-2">
              <p className="font-medium">1. Create a Fine-grained Personal Access Token:</p>
              <ul className="ml-4 space-y-1">
                <li>• Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens</li>
                <li>• Click "Generate new token"</li>
                <li>• Select specific repositories you want to scan</li>
              </ul>
              <p className="font-medium mt-3">2. Set Required Permissions:</p>
              <ul className="ml-4 space-y-1">
                <li>• Repository permissions → Contents: <span className="text-green-400 font-medium">Read</span></li>
                <li>• Set expiration (recommended: 30-90 days)</li>
              </ul>
              <p className="font-medium mt-3">3. Copy the token and repository URL here</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-400 font-medium">Error</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
