import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { WebSocketServer } from 'ws';
import http from 'http';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import { WorkflowOrchestrator } from './src/core/WorkflowOrchestrator.js';
import { AIServiceFactory } from './src/services/AIServiceFactory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Storage configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'), false);
    }
  }
});

// In-memory storage for scans and reports
const scans = new Map();
const reports = new Map();
const wsClients = new Map();

// Initialize the Code Security Scanner
class CodeSecurityScanner {
  constructor() {
    this.orchestrator = null;
    this.config = {
      configPath: './config',
      outputPath: './output',
      tempPath: './temp'
    };
  }

  async initialize() {
    try {
      console.log('🔒 Initializing Code Security Scanner...');
      
      // Initialize orchestrator
      this.orchestrator = new WorkflowOrchestrator(this.config);
      
      // Set up event listeners for WebSocket broadcasting
      this.setupEventListeners();
      
      // Initialize with detailed error logging
      console.log('🔧 Initializing orchestrator components...');
      await this.orchestrator.initialize();
      
      // Verify initialization
      const health = await this.orchestrator.healthCheck();
      if (health.status !== 'healthy') {
        console.error('❌ Scanner health check failed after initialization:', health);
        return false;
      }
      
      console.log('✅ Scanner initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Scanner initialization failed:', error.message);
      console.error('Stack trace:', error.stack);
      
      // Clean up on failure
      if (this.orchestrator) {
        try {
          await this.orchestrator.cleanup();
        } catch (cleanupError) {
          console.error('❌ Cleanup failed:', cleanupError.message);
        }
        this.orchestrator = null;
      }
      
      return false;
    }
  }

  setupEventListeners() {
    this.orchestrator.on('workflow-status', (event) => {
      console.log(`📊 Workflow Status: ${event.status}`);
      if (event.step) {
        console.log(`   Step: ${event.step}`);
      }
      // Broadcast to all connected WebSocket clients
      this.broadcastToAllClients({
        type: 'workflowStatus',
        status: event.status,
        step: event.step
      });
    });

    this.orchestrator.on('workflow-progress', (event) => {
      console.log(`📈 Progress: ${event.progress}% - ${event.currentStep}`);
      
      // Update all active scans with progress information
      scans.forEach((scan, scanId) => {
        if (scan.status === 'scanning') {
          scan.progress = event.progress;
          scan.currentStep = event.currentStep;
          scans.set(scanId, scan);
          broadcastScanUpdate(scanId, scan);
        }
      });
      
      // Broadcast progress updates to all connected WebSocket clients
      this.broadcastToAllClients({
        type: 'workflowProgress',
        progress: event.progress,
        currentStep: event.currentStep,
        currentStepId: event.currentStepId,
        stepProgress: event.stepProgress,
        stepIndex: event.stepIndex,
        totalSteps: event.totalSteps,
        isComplete: event.isComplete,
        timestamp: event.timestamp
      });
    });

    this.orchestrator.on('workflow-step-start', (event) => {
      console.log(`🚀 Starting: ${event.step}`);
      this.broadcastToAllClients({
        type: 'stepStart',
        step: event.step
      });
    });

    this.orchestrator.on('workflow-step-complete', (event) => {
      console.log(`✅ Completed: ${event.step} (${event.duration}ms)`);
      this.broadcastToAllClients({
        type: 'stepComplete',
        step: event.step,
        duration: event.duration
      });
    });

    this.orchestrator.on('workflow-step-error', (event) => {
      console.error(`❌ Failed: ${event.step} - ${event.error}`);
      this.broadcastToAllClients({
        type: 'stepError',
        step: event.step,
        error: event.error
      });
    });

    this.orchestrator.on('agent-status', (event) => {
      console.log(`🤖 Agent ${event.agent}: ${event.status}`);
      this.broadcastToAllClients({
        type: 'agentStatus',
        agent: event.agent,
        status: event.status
      });
    });

    this.orchestrator.on('workflow-error', (event) => {
      console.error(`💥 Workflow Error: ${event.error}`);
      this.broadcastToAllClients({
        type: 'workflowError',
        error: event.error
      });
    });
  }

  broadcastToAllClients(data) {
    wsClients.forEach((client, scanId) => {
      if (client && client.readyState === client.OPEN) {
        client.send(JSON.stringify({
          type: 'scanUpdate',
          scanId,
          data: {
            ...data,
            timestamp: new Date().toISOString()
          }
        }));
      }
    });
  }

  async scanCodebase(zipPath, scanId) {
    try {
      console.log(`🔍 Starting security scan: ${path.basename(zipPath)}`);
      
      // Check if orchestrator is initialized
      if (!this.orchestrator) {
        throw new Error('Security scanner not initialized');
      }

      // Check orchestrator health before scanning
      const health = await this.orchestrator.healthCheck();
      if (health.status !== 'healthy') {
        throw new Error(`Scanner not ready: ${health.error || 'Health check failed'}`);
      }
      
      // Execute scan
      const result = await this.orchestrator.executeScan(zipPath, scanId);
      
      if (result.success) {
        console.log('🎉 Security scan completed successfully!');
        return result;
      } else {
        console.error('❌ Security scan failed');
        return result;
      }
    } catch (error) {
      console.error(`❌ Scan failed: ${error.message}`);
      throw error;
    }
  }

  async healthCheck() {
    try {
      if (!this.orchestrator) {
        return { status: 'uninitialized' };
      }
      return await this.orchestrator.healthCheck();
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async cleanup() {
    if (this.orchestrator) {
      await this.orchestrator.cleanup();
    }
  }
}

// Initialize the scanner
const scanner = new CodeSecurityScanner();

// GitHub Helper Functions
class GitHubService {
  static async validateRepository(token, repoUrl) {
    try {
      const repoInfo = this.parseGitHubUrl(repoUrl);
      if (!repoInfo) {
        throw new Error('Invalid GitHub repository URL');
      }

      const { owner, repo } = repoInfo;
      
      // Test API access to the repository
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Code-Security-Scanner'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid GitHub token or insufficient permissions');
        } else if (response.status === 404) {
          throw new Error('Repository not found or no access permissions');
        } else {
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
      }

      const repoData = await response.json();
      return {
        valid: true,
        repoInfo: {
          owner,
          repo,
          fullName: repoData.full_name,
          defaultBranch: repoData.default_branch,
          isPrivate: repoData.private,
          size: repoData.size
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  static async downloadRepository(token, repoUrl, downloadPath) {
    try {
      const repoInfo = this.parseGitHubUrl(repoUrl);
      if (!repoInfo) {
        throw new Error('Invalid GitHub repository URL');
      }

      const { owner, repo } = repoInfo;
      
      // Get repository information to determine default branch
      const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Code-Security-Scanner'
        }
      });

      if (!repoResponse.ok) {
        throw new Error(`Failed to get repository info: ${repoResponse.status}`);
      }

      const repoData = await repoResponse.json();
      const defaultBranch = repoData.default_branch;

      // Download repository as ZIP
      const downloadUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${defaultBranch}`;
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Code-Security-Scanner'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download repository: ${response.status} ${response.statusText}`);
      }

      // Ensure download directory exists
      await fs.ensureDir(path.dirname(downloadPath));

      // Save the ZIP file
      const buffer = await response.buffer();
      await fs.writeFile(downloadPath, buffer);

      return {
        success: true,
        filePath: downloadPath,
        repoInfo: {
          owner,
          repo,
          branch: defaultBranch,
          fullName: repoData.full_name
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  static parseGitHubUrl(url) {
    try {
      // Support various GitHub URL formats
      const patterns = [
        /github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?(?:\/.*)?$/,
        /github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?$/
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          return {
            owner: match[1],
            repo: match[2].replace('.git', '')
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error parsing GitHub URL:', error);
      return null;
    }
  }
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'subscribe' && data.scanId) {
        wsClients.set(data.scanId, ws);
        console.log(`Client subscribed to scan: ${data.scanId}`);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    // Remove client from all subscriptions
    for (const [scanId, client] of wsClients.entries()) {
      if (client === ws) {
        wsClients.delete(scanId);
      }
    }
  });
});

// Utility function to broadcast scan updates
function broadcastScanUpdate(scanId, scanData) {
  const client = wsClients.get(scanId);
  if (client && client.readyState === client.OPEN) {
    client.send(JSON.stringify({
      type: 'scanUpdate',
      scanId,
      data: scanData
    }));
  }
}

// Real scan execution function
async function executeScan(scanId, zipFilePath) {
  const scan = scans.get(scanId);
  if (!scan) return;

  try {
    // Update scan status
    scan.status = 'scanning';
    scan.currentStep = 'Initializing scan...';
    scan.progress = 0;
    scans.set(scanId, scan);
    broadcastScanUpdate(scanId, scan);

    // Execute the real scan using the scanner
    const result = await scanner.scanCodebase(zipFilePath, scanId);

    if (result.success) {
      // Update scan with real results
      scan.status = 'completed';
      scan.progress = 100;
      scan.endTime = new Date();
      scan.reportFile = result.outputFile;
      scan.currentStep = 'Completed';
      scan.summary = {
        filesScanned: result.report.executionSummary.totalFiles,
        issuesFound: result.report.executionSummary.issuesFound,
        riskLevel: result.report.securityAnalysis.riskAssessment.summary.riskLevel
      };

      // Store the actual report
      reports.set(scanId, result.report);
      
      scans.set(scanId, scan);
      broadcastScanUpdate(scanId, scan);
      
      console.log(`✅ Scan ${scanId} completed successfully`);
    } else {
      // Handle scan failure
      scan.status = 'failed';
      scan.endTime = new Date();
      scan.currentStep = 'Failed';
      scan.error = result.error || 'Scan failed';
      
      scans.set(scanId, scan);
      broadcastScanUpdate(scanId, scan);
      
      console.error(`❌ Scan ${scanId} failed: ${scan.error}`);
    }

  } catch (error) {
    console.error(`❌ Scan ${scanId} error:`, error);
    
    // Update scan with error
    scan.status = 'failed';
    scan.endTime = new Date();
    scan.currentStep = 'Failed';
    scan.error = error.message;
    
    scans.set(scanId, scan);
    broadcastScanUpdate(scanId, scan);
  }
}

// GitHub repository scan execution function
async function executeGitHubScan(scanId, token, repoUrl, repoInfo) {
  const scan = scans.get(scanId);
  if (!scan) return;

  try {
    // Update scan status to downloading
    scan.status = 'scanning';
    scan.currentStep = 'Downloading repository...';
    scan.progress = 10;
    scans.set(scanId, scan);
    broadcastScanUpdate(scanId, scan);

    // Generate download path
    const uploadDir = path.join(__dirname, 'uploads');
    await fs.ensureDir(uploadDir);
    const downloadPath = path.join(uploadDir, `github-${scanId}-${repoInfo.repo}.zip`);

    // Download repository
    console.log(`📥 Downloading GitHub repository: ${repoInfo.fullName}`);
    const downloadResult = await GitHubService.downloadRepository(token, repoUrl, downloadPath);

    if (!downloadResult.success) {
      throw new Error(`Repository download failed: ${downloadResult.error}`);
    }

    // Update scan with download completion
    scan.filePath = downloadPath;
    scan.currentStep = 'Repository downloaded, starting security scan...';
    scan.progress = 20;
    scans.set(scanId, scan);
    broadcastScanUpdate(scanId, scan);

    console.log(`✅ Repository downloaded successfully: ${downloadPath}`);

    // Execute the real scan using the scanner
    const result = await scanner.scanCodebase(downloadPath, scanId);

    if (result.success) {
      // Update scan with real results
      scan.status = 'completed';
      scan.progress = 100;
      scan.endTime = new Date();
      scan.reportFile = result.outputFile;
      scan.currentStep = 'Completed';
      scan.summary = {
        filesScanned: result.report.executionSummary.totalFiles,
        issuesFound: result.report.executionSummary.issuesFound,
        riskLevel: result.report.securityAnalysis.riskAssessment.summary.riskLevel
      };

      // Store the actual report
      reports.set(scanId, result.report);
      
      scans.set(scanId, scan);
      broadcastScanUpdate(scanId, scan);
      
      console.log(`✅ GitHub scan ${scanId} completed successfully`);
    } else {
      // Handle scan failure
      scan.status = 'failed';
      scan.endTime = new Date();
      scan.currentStep = 'Failed';
      scan.error = result.error || 'Scan failed';
      
      scans.set(scanId, scan);
      broadcastScanUpdate(scanId, scan);
      
      console.error(`❌ GitHub scan ${scanId} failed: ${scan.error}`);
    }

    // Cleanup downloaded file
    try {
      await fs.unlink(downloadPath);
      console.log(`🗑️ Cleaned up downloaded file: ${downloadPath}`);
    } catch (cleanupError) {
      console.warn(`⚠️ Failed to cleanup downloaded file: ${cleanupError.message}`);
    }

  } catch (error) {
    console.error(`❌ GitHub scan ${scanId} error:`, error);
    
    // Update scan with error
    scan.status = 'failed';
    scan.endTime = new Date();
    scan.currentStep = 'Failed';
    scan.error = error.message;
    
    scans.set(scanId, scan);
    broadcastScanUpdate(scanId, scan);

    // Cleanup downloaded file if it exists
    if (scan.filePath) {
      try {
        await fs.unlink(scan.filePath);
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup file after error: ${cleanupError.message}`);
      }
    }
  }
}

// API Routes

// POST /api/scan - Start a new scan
app.post('/api/scan', upload.single('codebase'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded or invalid file type'
      });
    }

    const scanId = uuidv4();
    const scan = {
      id: scanId,
      filename: req.file.originalname,
      filePath: req.file.path,
      status: 'started',
      progress: 0,
      startTime: new Date(),
      currentStep: 'Initializing scan...'
    };

    // Store scan
    scans.set(scanId, scan);

    // Return response immediately
    res.json({
      success: true,
      scanId,
      message: 'Scan started successfully'
    });

    // Start real scan execution asynchronously
    setTimeout(async () => {
      await executeScan(scanId, req.file.path);
    }, 1000);

  } catch (error) {
    console.error('Scan start error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/scan/github - Start a new GitHub repository scan
app.post('/api/scan/github', async (req, res) => {
  try {
    const { token, repoUrl } = req.body;

    if (!token || !repoUrl) {
      return res.status(400).json({
        success: false,
        message: 'GitHub token and repository URL are required'
      });
    }

    // Validate repository access
    console.log(`🔍 Validating GitHub repository access: ${repoUrl}`);
    const validation = await GitHubService.validateRepository(token, repoUrl);
    
    if (!validation.valid) {
      console.error(`❌ Repository validation failed: ${validation.error}`);
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }

    const scanId = uuidv4();
    const repoInfo = validation.repoInfo;
    
    // Create scan entry
    const scan = {
      id: scanId,
      filename: `${repoInfo.fullName} (GitHub)`,
      filePath: null, // Will be set after download
      status: 'started',
      progress: 0,
      startTime: new Date(),
      currentStep: 'Downloading repository...',
      githubRepo: repoInfo
    };

    // Store scan
    scans.set(scanId, scan);

    // Return response immediately
    res.json({
      success: true,
      scanId,
      repoName: repoInfo.fullName,
      message: 'GitHub repository scan started successfully'
    });

    // Download and scan repository asynchronously
    setTimeout(async () => {
      await executeGitHubScan(scanId, token, repoUrl, repoInfo);
    }, 1000);

  } catch (error) {
    console.error('GitHub scan start error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/scan/:id - Get scan status
app.get('/api/scan/:id', (req, res) => {
  try {
    const scanId = req.params.id;
    const scan = scans.get(scanId);

    if (!scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan not found'
      });
    }

    res.json({
      success: true,
      scan
    });
  } catch (error) {
    console.error('Get scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/scan/:id - Delete a scan
app.delete('/api/scan/:id', (req, res) => {
  try {
    const scanId = req.params.id;
    
    if (!scans.has(scanId)) {
      return res.status(404).json({
        success: false,
        message: 'Scan not found'
      });
    }

    // Remove scan and associated report
    scans.delete(scanId);
    reports.delete(scanId);
    wsClients.delete(scanId);

    res.json({
      success: true,
      message: 'Scan deleted successfully'
    });
  } catch (error) {
    console.error('Delete scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/scan/:id/report - Get scan report
app.get('/api/scan/:id/report', (req, res) => {
  try {
    const scanId = req.params.id;
    const report = reports.get(scanId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /reports/:filename - Serve report files for download
app.get('/reports/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const scanId = filename.replace('report-', '').replace('.json', '');
    const report = reports.get(scanId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report file not found'
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(report);
  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/scans - Get all scans (for potential future use)
app.get('/api/scans', (req, res) => {
  try {
    const allScans = Array.from(scans.values()).sort((a, b) => 
      new Date(b.startTime) - new Date(a.startTime)
    );

    res.json({
      success: true,
      scans: allScans
    });
  } catch (error) {
    console.error('Get all scans error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const scannerHealth = await scanner.healthCheck();
    const aiConfig = AIServiceFactory.getCurrentConfig();
    
    res.json({
      status: scannerHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      activeScans: scans.size,
      activeConnections: wsClients.size,
      aiConfiguration: aiConfig,
      scanner: scannerHealth
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      activeScans: scans.size,
      activeConnections: wsClients.size,
      error: error.message
    });
  }
});

// AI configuration endpoint
app.get('/api/ai-config', (req, res) => {
  try {
    const aiConfig = AIServiceFactory.getProviderInfo();
    
    res.json({
      success: true,
      configuration: aiConfig
    });
  } catch (error) {
    console.error('Get AI config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI configuration',
      error: error.message
    });
  }
});

// AI log statistics endpoint
app.get('/api/ai-logs/stats', async (req, res) => {
  try {
    const stats = await scanner.orchestrator.getAILogStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get AI log stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI log statistics',
      error: error.message
    });
  }
});

// Search AI logs endpoint
app.get('/api/ai-logs/search', async (req, res) => {
  try {
    const { query, agent, task, provider, startDate, endDate, limit } = req.query;
    
    const options = {
      agent,
      task,
      provider,
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : 100
    };
    
    const results = await scanner.orchestrator.searchAILogs(query, options);
    
    res.json({
      success: true,
      results,
      count: results.length
    });
  } catch (error) {
    console.error('Search AI logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search AI logs',
      error: error.message
    });
  }
});

// Export AI logs endpoint
app.get('/api/ai-logs/export', async (req, res) => {
  try {
    const { format = 'json', agent, task, provider, startDate, endDate } = req.query;
    
    const options = {
      agent,
      task,
      provider,
      startDate,
      endDate
    };
    
    const exportFile = await scanner.orchestrator.exportAILogs(format, options);
    
    res.json({
      success: true,
      exportFile,
      message: `AI logs exported to ${exportFile}`
    });
  } catch (error) {
    console.error('Export AI logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export AI logs',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 100MB.'
      });
    }
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

const PORT = process.env.PORT || 8000;

// Initialize scanner and start server
async function startServer() {
  try {
    console.log('🚀 Starting Code Security Scanner Server...');
    
    // Display AI configuration
    try {
      const aiConfig = AIServiceFactory.getCurrentConfig();
      console.log('🤖 AI Configuration:');
      console.log(`   Provider: ${aiConfig.provider}`);
      console.log(`   Model: ${aiConfig.model}`);
      console.log(`   Max Tokens: ${aiConfig.maxTokens}`);
      console.log(`   Temperature: ${aiConfig.temperature}`);
      console.log(`   API Key Configured: ${aiConfig.apiKeyConfigured ? '✅' : '❌'}`);
      
      if (!aiConfig.apiKeyConfigured) {
        console.warn('⚠️  AI API key not configured. Please set the appropriate API key in your environment variables.');
      }
    } catch (error) {
      console.error('❌ Failed to load AI configuration:', error.message);
    }
    
    // Initialize the scanner
    const scannerInitialized = await scanner.initialize();
    
    if (!scannerInitialized) {
      console.warn('⚠️  Scanner initialization failed, running in limited mode');
    }
    
    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 Express server running on http://localhost:${PORT}`);
      console.log(`📡 WebSocket server running on ws://localhost:${PORT}`);
      console.log(`📋 Available endpoints:`);
      console.log(`   POST   /api/scan              - Start new scan`);
      console.log(`   GET    /api/scan/:id          - Get scan status`);
      console.log(`   DELETE /api/scan/:id          - Delete scan`);
      console.log(`   GET    /api/scan/:id/report   - Get scan report`);
      console.log(`   GET    /api/scans             - Get all scans`);
      console.log(`   GET    /reports/:filename     - Download report file`);
      console.log(`   GET    /api/ai-config         - Get AI configuration`);
      console.log(`   GET    /api/ai-logs/stats     - Get AI log statistics`);
      console.log(`   GET    /api/ai-logs/search    - Search AI logs`);
      console.log(`   GET    /api/ai-logs/export    - Export AI logs`);
      console.log(`   GET    /health                - Health check`);
      console.log(`🔒 Scanner status: ${scannerInitialized ? 'Ready' : 'Limited mode'}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  try {
    await scanner.cleanup();
    server.close(() => {
      console.log('✅ Server closed successfully');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  try {
    await scanner.cleanup();
    server.close(() => {
      console.log('✅ Server closed successfully');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
});

// Start the server
startServer();

export default app;
