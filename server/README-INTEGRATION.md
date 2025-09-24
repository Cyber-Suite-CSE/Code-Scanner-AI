# Code Security Scanner - Server Integration

This document describes the integration of the main.js implementation with the Express server.

## Overview

The server has been updated to use the real Code Security Scanner implementation instead of mock data. It now integrates:

- **WorkflowOrchestrator**: Manages the complete scanning workflow
- **AI Agents**: Sentinel, Guardian, Inspector, and Forge agents
- **Anthropic AI**: Real AI-powered code analysis
- **WebSocket Events**: Real-time progress updates from the scanning workflow

## Setup

### 1. Environment Configuration

First, set up your environment:

```bash
npm run setup-env
```

This will create a `.env` file with the following variables:

```env
# Anthropic API Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# AI Model Configuration
AI_MODEL=claude-3-5-sonnet-20241022
AI_MAX_TOKENS=4096
AI_TEMPERATURE=0.1

# Server Configuration
PORT=8000
NODE_ENV=development
```

### 2. Add Your Anthropic API Key

Edit the `.env` file and replace `your_anthropic_api_key_here` with your actual Anthropic API key.

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Server

For production:
```bash
npm run server
```

For development (with auto-restart):
```bash
npm run server:dev
```

## How It Works

### Scanning Process

1. **File Upload**: Client uploads a ZIP file to `/api/scan`
2. **Initialization**: Server creates a scan record and initializes the WorkflowOrchestrator
3. **Real-time Updates**: The orchestrator emits events that are broadcast to WebSocket clients
4. **AI Analysis**: The four agents work in sequence:
   - **Sentinel Agent**: Analyzes file structure and identifies technology stacks
   - **Guardian Agent**: Generates security rules based on the tech stack
   - **Inspector Agent**: Analyzes code for vulnerabilities using the rules
   - **Forge Agent**: Creates the final report with recommendations
5. **Completion**: Results are stored and made available via the API

### WebSocket Events

The server broadcasts the following events to connected clients:

- `workflowStatus`: Overall workflow status changes
- `stepStart`: When a new step begins
- `stepComplete`: When a step completes successfully
- `stepError`: When a step fails
- `agentStatus`: Agent-specific status updates
- `workflowError`: Critical workflow errors

### API Endpoints

- `POST /api/scan` - Start a new security scan
- `GET /api/scan/:id` - Get scan status and progress
- `DELETE /api/scan/:id` - Delete a scan and its results
- `GET /api/scan/:id/report` - Get the detailed security report
- `GET /api/scans` - Get all scans (sorted by date)
- `GET /reports/:filename` - Download report file
- `GET /health` - Health check (includes scanner status)

### Health Check

The `/health` endpoint now includes detailed scanner health information:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "activeScans": 2,
  "activeConnections": 5,
  "scanner": {
    "status": "healthy",
    "components": {
      "anthropicService": { "status": "healthy" },
      "toolRegistry": { "status": "healthy" },
      "vulnerabilityClassifier": { "status": "healthy" },
      "agents": {
        "sentinel": { "status": "healthy" },
        "guardian": { "status": "healthy" },
        "inspector": { "status": "healthy" },
        "forge": { "status": "healthy" }
      }
    }
  }
}
```

## Error Handling

The server includes comprehensive error handling:

- **Initialization Failures**: If the scanner fails to initialize, the server runs in "limited mode"
- **Scan Failures**: Failed scans are marked with error status and details
- **API Errors**: All endpoints include proper error responses
- **Graceful Shutdown**: The server handles SIGINT/SIGTERM signals and cleans up resources

## Development

### Testing Individual Components

You can test individual parts of the scanner using the CLI:

```bash
# Test complete pipeline
node src/main.js test-pipeline sample-vulnerable-code.zip

# Test individual agents
node src/main.js test-sentinel sample-vulnerable-code.zip
node src/main.js test-guardian sample-vulnerable-code.zip
node src/main.js test-inspector sample-vulnerable-code.zip

# Check scanner health
node src/main.js health

# View configuration
node src/main.js config
```

### Debugging

Enable debug mode by setting `NODE_ENV=development` in your `.env` file. This will provide more detailed logging.

## Configuration Files

The scanner uses configuration files in the `config/` directory:

- `mcp-tools.json`: MCP tool definitions and categories
- `vulnerabilities.json`: Vulnerability categories and severity definitions

These files are automatically loaded when the scanner initializes.

## Troubleshooting

### Common Issues

1. **"Anthropic API key is required"**
   - Make sure you've set `ANTHROPIC_API_KEY` in your `.env` file
   - Verify the API key is valid

2. **Scanner initialization failed**
   - Check that all dependencies are installed
   - Verify the `config/` directory exists with required JSON files
   - Check file permissions

3. **WebSocket connection issues**
   - Ensure the client is connecting to the correct WebSocket URL
   - Check that the server is running and accessible

4. **Scan failures**
   - Check the uploaded file is a valid ZIP
   - Verify the ZIP contains code files
   - Check server logs for detailed error messages

### Logs

The server provides detailed logging for:
- Scanner initialization
- Scan progress and completion
- WebSocket connections
- API requests and responses
- Error conditions

Monitor the console output or configure logging to files as needed.
