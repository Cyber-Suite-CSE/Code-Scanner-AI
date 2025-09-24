import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { WebSocketServer } from 'ws';
import http from 'http';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

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

// Utility function to simulate scan progress
function simulateScanProgress(scanId) {
  const scan = scans.get(scanId);
  if (!scan) return;

  const steps = [
    'Extracting files...',
    'Analyzing code structure...',
    'Running security checks...',
    'Generating vulnerability report...',
    'Finalizing analysis...'
  ];

  let currentStepIndex = 0;
  let progress = 0;

  const progressInterval = setInterval(() => {
    if (currentStepIndex < steps.length) {
      scan.currentStep = steps[currentStepIndex];
      scan.progress = Math.min(progress, 95);
      scan.lastCompletedStep = currentStepIndex > 0 ? steps[currentStepIndex - 1] : undefined;
      
      // Update scan in storage
      scans.set(scanId, scan);
      
      // Broadcast update
      broadcastScanUpdate(scanId, scan);
      
      progress += Math.random() * 20 + 10; // Random progress increment
      
      if (progress >= 100 || currentStepIndex === steps.length - 1) {
        // Complete the scan
        setTimeout(() => {
          completeScan(scanId);
        }, 2000);
        clearInterval(progressInterval);
      } else if (progress >= (currentStepIndex + 1) * 20) {
        currentStepIndex++;
      }
    }
  }, 1500);
}

// Utility function to complete a scan
function completeScan(scanId) {
  const scan = scans.get(scanId);
  if (!scan) return;

  // Generate mock report
  const mockReport = generateMockReport(scan.filename);
  const reportFile = `report-${scanId}.json`;
  
  // Save report
  reports.set(scanId, mockReport);
  
  // Update scan
  scan.status = 'completed';
  scan.progress = 100;
  scan.endTime = new Date();
  scan.reportFile = reportFile;
  scan.currentStep = 'Completed';
  scan.summary = {
    filesScanned: mockReport.executionSummary.totalFiles,
    issuesFound: mockReport.executionSummary.issuesFound,
    riskLevel: mockReport.securityAnalysis.riskAssessment.summary.riskLevel
  };
  
  scans.set(scanId, scan);
  
  // Broadcast final update
  broadcastScanUpdate(scanId, scan);
}

// Generate mock report data
function generateMockReport(filename) {
  const severityLevels = ['critical', 'high', 'medium', 'low'];
  const issueTypes = [
    'SQL Injection vulnerability',
    'Cross-Site Scripting (XSS)',
    'Authentication bypass',
    'Information disclosure',
    'Insecure direct object references',
    'Security misconfiguration',
    'Sensitive data exposure',
    'Insufficient logging',
    'Broken access control',
    'Using components with known vulnerabilities'
  ];

  const techStacks = [
    { name: 'Node.js', category: 'Runtime', confidence: 0.95, version: '18.x' },
    { name: 'Express', category: 'Framework', confidence: 0.90, version: '4.x' },
    { name: 'React', category: 'Frontend', confidence: 0.88, version: '18.x' },
    { name: 'MongoDB', category: 'Database', confidence: 0.75 },
    { name: 'JWT', category: 'Authentication', confidence: 0.82 }
  ];

  // Generate random issues
  const issuesByCategory = {};
  let totalIssues = 0;

  severityLevels.forEach(severity => {
    const issueCount = Math.floor(Math.random() * 5) + 1;
    const issues = [];
    
    for (let i = 0; i < issueCount; i++) {
      const issueType = issueTypes[Math.floor(Math.random() * issueTypes.length)];
      issues.push({
        id: uuidv4(),
        title: issueType,
        description: `A ${severity} severity ${issueType.toLowerCase()} was detected in your codebase.`,
        severity,
        category: 'Security',
        file: `src/${Math.random() > 0.5 ? 'components' : 'utils'}/${filename.replace('.zip', '')}_${i + 1}.js`,
        line: Math.floor(Math.random() * 100) + 1,
        recommendation: `Implement proper input validation and sanitization to prevent ${issueType.toLowerCase()}.`,
        cweId: `${Math.floor(Math.random() * 900) + 100}`,
        cvssScore: severity === 'critical' ? 9.0 + Math.random() : 
                   severity === 'high' ? 7.0 + Math.random() * 2 :
                   severity === 'medium' ? 4.0 + Math.random() * 3 :
                   1.0 + Math.random() * 3
      });
    }
    
    if (issues.length > 0) {
      issuesByCategory[severity] = issues;
      totalIssues += issues.length;
    }
  });

  // Determine risk level
  const riskLevel = issuesByCategory.critical?.length > 0 ? 'Critical' :
                   issuesByCategory.high?.length > 2 ? 'High' :
                   issuesByCategory.medium?.length > 5 ? 'Medium' : 'Low';

  return {
    executionSummary: {
      totalFiles: Math.floor(Math.random() * 50) + 10,
      issuesFound: totalIssues,
      suggestionsGenerated: totalIssues * 2,
      executionTime: Math.floor(Math.random() * 30000) + 5000
    },
    securityAnalysis: {
      totalIssues,
      issuesByCategory,
      riskAssessment: {
        summary: {
          riskLevel,
          riskScore: riskLevel === 'Critical' ? 9.5 : 
                   riskLevel === 'High' ? 7.8 :
                   riskLevel === 'Medium' ? 5.2 : 2.1
        }
      }
    },
    techStackAnalysis: {
      identifiedStacks: techStacks
    },
    actionPlan: {
      immediate: issuesByCategory.critical ? issuesByCategory.critical.map(issue => ({
        priority: 'Critical',
        action: `Fix ${issue.title}`,
        description: issue.description,
        impact: 'High security risk - immediate attention required'
      })) : [],
      shortTerm: issuesByCategory.high ? issuesByCategory.high.slice(0, 3).map(issue => ({
        priority: 'High',
        action: `Address ${issue.title}`,
        description: issue.description,
        impact: 'Moderate security risk - address within days'
      })) : [],
      longTerm: issuesByCategory.medium ? issuesByCategory.medium.slice(0, 2).map(issue => ({
        priority: 'Medium',
        action: `Review ${issue.title}`,
        description: issue.description,
        impact: 'Low security risk - address in next sprint'
      })) : []
    },
    appendix: {
      rulesUsed: Math.floor(Math.random() * 100) + 50
    }
  };
}

// API Routes

// POST /api/scan - Start a new scan
app.post('/api/scan', upload.single('codebase'), (req, res) => {
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
      status: 'started',
      progress: 0,
      startTime: new Date(),
      currentStep: 'Initializing scan...'
    };

    // Store scan
    scans.set(scanId, scan);

    // Start scan simulation
    setTimeout(() => {
      scan.status = 'scanning';
      scans.set(scanId, scan);
      simulateScanProgress(scanId);
    }, 1000);

    res.json({
      success: true,
      scanId,
      message: 'Scan started successfully'
    });
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
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeScans: scans.size,
    activeConnections: wsClients.size
  });
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
});

export default app;
