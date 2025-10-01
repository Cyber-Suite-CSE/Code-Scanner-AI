import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { WebSocketServer } from 'ws';
import http from 'http';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowOrchestrator } from './src/core/WorkflowOrchestrator.js';

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
      const result = await this.orchestrator.executeScan(zipPath);
      
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
    
    res.json({
      status: scannerHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      activeScans: scans.size,
      activeConnections: wsClients.size,
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
