# Code Security Scanner

An AI-based code security scanner with extensible agent workflow that analyzes codebases from zip files and provides secure code suggestions.

## Overview

The Code Security Scanner implements a linear agentic workflow with four main agents:

1. **Sentinel Agent**: Identifies tech stacks, languages, frameworks, and entry points
2. **Guardian Agent**: Creates dynamic security rules based on identified technologies
3. **Inspector Agent**: Analyzes code against security rules and identifies vulnerabilities
4. **Forge Agent**: Generates secure code suggestions and educational content

## Features

- ✅ **Extensible Architecture**: Easy to add new MCP tools, agents, and vulnerability types
- ✅ **Multi-Language Support**: JavaScript, TypeScript, Python, Java, C#, PHP, Go, Rust
- ✅ **Framework Awareness**: React, Express, Django, Spring, Laravel, and more
- ✅ **Dynamic Rule Creation**: Rules generated based on detected tech stacks
- ✅ **Comprehensive Analysis**: Code analysis with context-aware vulnerability detection
- ✅ **Secure Code Suggestions**: AI-generated secure alternatives with explanations
- ✅ **Educational Content**: Learn about vulnerabilities and prevention strategies
- ✅ **Risk Classification**: Advanced vulnerability classification and risk scoring
- ✅ **Detailed Reporting**: Comprehensive reports with actionable insights

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd code-security-scanner
```

2. Install dependencies:
```bash
npm install
```

3. Initialize the scanner:
```bash
npm run init
```

## Usage

### Scanning a Codebase

```bash
# Scan a zip file containing your codebase
npm start scan path/to/your/codebase.zip

# With custom options
npm start scan codebase.zip --output ./reports --timeout 600000
```

### Health Check

```bash
# Check system health
npm start health
```

### Configuration

```bash
# View current configuration
npm start config

# Initialize/reset configuration
npm start init --force
```

## Architecture

### Core Components

- **WorkflowOrchestrator**: Manages the entire scanning workflow
- **ToolRegistry**: Manages MCP tools and their configurations
- **VulnerabilityClassifier**: Classifies and scores security issues
- **ZipHandler**: Extracts and processes codebase zip files

### Agent Workflow

```
Zip Input → Sentinel → Guardian → Inspector → Forge → Report
           (Tech ID)  (Rules)    (Analysis)  (Suggestions)
```

### MCP Tools

The system uses MCP (Model Context Protocol) tools for various operations:

- **Playwright**: Web search and documentation retrieval
- **Function Definition**: Code analysis and function extraction
- **Regex Search**: Pattern matching across files
- **Context7**: Dynamic documentation retrieval

## Configuration

### MCP Tools (`config/mcp-tools.json`)

Define available tools and their configurations:

```json
{
  "tools": {
    "playwright": {
      "name": "playwright",
      "description": "Google search and website text extraction",
      "type": "web",
      "methods": ["search", "extractText"]
    }
  }
}
```

### Vulnerabilities (`config/vulnerabilities.json`)

Define vulnerability categories and rules:

```json
{
  "categories": {
    "injection": {
      "name": "Injection Vulnerabilities",
      "rules": [
        {
          "id": "sql-injection",
          "severity": "critical",
          "languages": ["javascript", "python", "java"]
        }
      ]
    }
  }
}
```

## Extending the Scanner

### Adding New MCP Tools

1. Update `config/mcp-tools.json`:
```json
{
  "tools": {
    "my-new-tool": {
      "name": "my-new-tool",
      "description": "Description of the tool",
      "type": "category",
      "methods": ["method1", "method2"]
    }
  }
}
```

2. Implement tool usage in agents:
```javascript
const result = await this.useTool('my-new-tool', 'method1', params);
```

### Adding New Vulnerability Types

1. Update `config/vulnerabilities.json`:
```json
{
  "categories": {
    "my-category": {
      "name": "My Vulnerability Category",
      "rules": [
        {
          "id": "my-vulnerability",
          "name": "My Vulnerability Type",
          "severity": "high"
        }
      ]
    }
  }
}
```

2. Add detection patterns in agents:
```javascript
// In GuardianAgent or InspectorAgent
const patterns = {
  'my-vulnerability': {
    pattern: /vulnerable-pattern/gi,
    severity: 'high',
    mitigation: 'How to fix this vulnerability'
  }
};
```

### Adding New Agents

1. Create agent class extending `BaseAgent`:
```javascript
import { BaseAgent } from '../core/BaseAgent.js';

export class MyAgent extends BaseAgent {
  constructor(toolRegistry, options = {}) {
    super('MyAgent', toolRegistry, options);
  }

  async onExecute(input) {
    // Agent logic here
    return result;
  }
}
```

2. Register in `WorkflowOrchestrator.js`:
```javascript
const agentConfigs = [
  // existing agents...
  { name: 'myagent', class: MyAgent }
];
```

## Output

The scanner generates comprehensive reports including:

- **Executive Summary**: High-level overview of findings
- **Tech Stack Analysis**: Identified technologies and frameworks
- **Security Analysis**: Detailed vulnerability findings
- **Recommendations**: Secure code suggestions and fixes
- **Action Plan**: Prioritized remediation steps
- **Educational Material**: Learning resources and best practices

### Sample Report Structure

```json
{
  "metadata": {
    "generatedAt": "2024-01-15T10:30:00Z",
    "scanDuration": 45000,
    "version": "1.0.0"
  },
  "executionSummary": {
    "totalFiles": 150,
    "issuesFound": 23,
    "suggestionsGenerated": 18
  },
  "securityAnalysis": {
    "totalIssues": 23,
    "issuesByCategory": {
      "critical": 3,
      "high": 7,
      "medium": 10,
      "low": 3
    },
    "riskLevel": "High"
  },
  "recommendations": {
    "suggestions": [...],
    "educationalMaterial": {...}
  }
}
```

## Development

### Project Structure

```
src/
├── core/                 # Core system components
│   ├── BaseAgent.js     # Base agent class
│   ├── ToolRegistry.js  # MCP tool management
│   ├── VulnerabilityClassifier.js
│   ├── ZipHandler.js    # Zip file processing
│   └── WorkflowOrchestrator.js
├── agents/              # Security analysis agents
│   ├── SentinelAgent.js # Tech stack identification
│   ├── GuardianAgent.js # Rule creation
│   ├── InspectorAgent.js # Vulnerability analysis
│   └── ForgeAgent.js    # Secure code suggestions
└── main.js              # CLI interface

config/                  # Configuration files
├── mcp-tools.json      # MCP tool definitions
└── vulnerabilities.json # Vulnerability categories

output/                  # Generated reports
temp/                    # Temporary extraction files
```

### Testing

```bash
# Run tests (when implemented)
npm test

# Health check
npm start health

# Test with sample codebase
npm start scan samples/vulnerable-app.zip
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add your changes
4. Test thoroughly
5. Submit a pull request

### Guidelines

- Follow existing code style and patterns
- Add comprehensive error handling
- Document new features and APIs
- Update configuration examples
- Test with various codebase types

## Security Considerations

- The scanner processes untrusted code - run in isolated environments
- Review generated suggestions before applying
- Validate all input files and parameters
- Use least privilege principles for file access
- Regularly update vulnerability definitions

## Troubleshooting

### Common Issues

1. **"Tool not found" errors**: Check MCP tool configuration
2. **Zip extraction failures**: Verify file format and permissions
3. **Agent initialization errors**: Check configuration file syntax
4. **Memory issues with large codebases**: Adjust file size limits

### Debug Mode

Set environment variable for verbose logging:
```bash
DEBUG=* npm start scan codebase.zip
```

## License

MIT License - see LICENSE file for details

## Support

- GitHub Issues: Report bugs and feature requests
- Documentation: Check the docs/ directory
- Examples: See examples/ directory for usage samples

---

**⚠️ Important**: This scanner is designed for defensive security analysis only. Do not use for malicious purposes.