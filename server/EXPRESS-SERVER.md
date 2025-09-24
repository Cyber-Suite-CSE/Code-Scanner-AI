# Express.js Server for Code Security Scanner

This Express.js server provides REST API endpoints and WebSocket support for the Code Security Scanner client application.

## Features

- **File Upload**: Accept ZIP file uploads for code scanning
- **Real-time Updates**: WebSocket support for live scan progress updates
- **RESTful API**: Complete CRUD operations for scans and reports
- **Mock Data Generation**: Realistic security scan reports with various severity levels
- **CORS Support**: Configured for cross-origin requests from the client
- **Error Handling**: Comprehensive error handling and validation

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
# Production mode
npm run server

# Development mode with auto-reload
npm run server:dev
```

The server will start on `http://localhost:5000` with WebSocket support on `ws://localhost:5000`.

## API Endpoints

### POST /api/scan
Start a new security scan by uploading a ZIP file.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: ZIP file in `codebase` field
- Max file size: 100MB

**Response:**
```json
{
  "success": true,
  "scanId": "uuid-string",
  "message": "Scan started successfully"
}
```

### GET /api/scan/:id
Get the current status of a scan.

**Response:**
```json
{
  "success": true,
  "scan": {
    "id": "uuid-string",
    "filename": "example.zip",
    "status": "scanning",
    "progress": 45,
    "startTime": "2024-01-01T12:00:00.000Z",
    "currentStep": "Running security checks...",
    "summary": {
      "filesScanned": 25,
      "issuesFound": 8,
      "riskLevel": "Medium"
    }
  }
}
```

### DELETE /api/scan/:id
Delete a scan and its associated report.

**Response:**
```json
{
  "success": true,
  "message": "Scan deleted successfully"
}
```

### GET /api/scan/:id/report
Get the detailed security report for a completed scan.

**Response:**
```json
{
  "success": true,
  "report": {
    "executionSummary": { ... },
    "securityAnalysis": { ... },
    "techStackAnalysis": { ... },
    "actionPlan": { ... }
  }
}
```

### GET /api/scans
Get all scans (sorted by most recent first).

**Response:**
```json
{
  "success": true,
  "scans": [...]
}
```

### GET /reports/:filename
Download a report file as JSON.

**Response:** JSON file download

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "activeScans": 2,
  "activeConnections": 1
}
```

## WebSocket Support

The server provides real-time updates via WebSocket connections.

### Connection
Connect to: `ws://localhost:5000`

### Subscribe to Scan Updates
Send a subscription message:
```json
{
  "type": "subscribe",
  "scanId": "uuid-string"
}
```

### Receive Updates
The server will send updates in this format:
```json
{
  "type": "scanUpdate",
  "scanId": "uuid-string",
  "data": {
    "status": "scanning",
    "progress": 65,
    "currentStep": "Analyzing code structure...",
    ...
  }
}
```

## Scan Lifecycle

1. **Upload**: Client uploads ZIP file via POST /api/scan
2. **Started**: Scan status is set to "started"
3. **Scanning**: Status changes to "scanning" with progress updates
4. **Progress**: Real-time updates sent via WebSocket
5. **Completed**: Final report generated and status set to "completed"
6. **Report**: Detailed report available via GET /api/scan/:id/report

## Mock Data

The server generates realistic mock security reports including:

- **Security Issues**: Various severity levels (Critical, High, Medium, Low)
- **Technology Stack**: Detected frameworks and libraries
- **Action Plan**: Immediate, short-term, and long-term recommendations
- **Execution Summary**: File counts, issue counts, scan timing

## Error Handling

- **400 Bad Request**: Invalid file type or missing file
- **404 Not Found**: Scan or report not found
- **500 Internal Server Error**: Server-side errors
- **File Size Limit**: 100MB maximum file size

## CORS Configuration

The server is configured to accept requests from:
- `http://localhost:3000` (default Next.js client)

## File Storage

- **Uploads**: Stored in `./uploads/` directory
- **Reports**: Stored in memory (Map-based storage)
- **Cleanup**: Files are cleaned up when scans are deleted

## Development

The server includes comprehensive logging and error handling. Use the development mode for auto-reload during development:

```bash
npm run server:dev
```

## Client Integration

This server is designed to work seamlessly with the React/Next.js client components:
- `FileUpload`: Uses POST /api/scan
- `ScanResults`: Uses WebSocket and GET /api/scan/:id/report
- `ScanHistory`: Uses DELETE /api/scan/:id
- `ReportViewer`: Displays report data
- `SecurityChart`: Visualizes report statistics
