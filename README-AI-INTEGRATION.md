# AI-Powered Code Security Scanner

## 🤖 Real AI Integration with Anthropic Claude

This enhanced version of the Code Security Scanner uses **real AI analysis** with the Anthropic API and **actual MCP (Model Context Protocol) tools** for dynamic security analysis.

## ⚡ Key AI Features

### 1. Dynamic Tech Stack Identification
- **AI-Powered Analysis**: Uses Claude to analyze code samples and identify technologies
- **Confidence Scoring**: AI provides confidence scores for each detected technology
- **Smart Framework Detection**: Identifies not just languages but specific frameworks and libraries
- **Security Risk Assessment**: AI evaluates security implications of detected tech stacks

### 2. Intelligent Rule Generation
- **Dynamic Rule Creation**: AI generates security rules based on detected technologies
- **Documentation Integration**: Real-time retrieval of security best practices
- **Contextual Rules**: Rules tailored to specific frameworks and languages
- **Advanced Pattern Recognition**: AI creates sophisticated vulnerability detection patterns

### 3. AI-Enhanced Vulnerability Detection
- **Context-Aware Analysis**: AI considers code context to reduce false positives
- **Dynamic Severity Assessment**: AI evaluates actual risk based on usage patterns
- **Multi-Factor Analysis**: Combines static analysis with AI reasoning

### 4. Intelligent Code Suggestions
- **Real-Time Code Generation**: AI creates secure alternatives to vulnerable code
- **Contextual Fixes**: Suggestions consider the specific codebase and framework
- **Educational Explanations**: AI provides detailed explanations of why code is vulnerable

## 🔧 Setup for AI Integration

### 1. Get Anthropic API Key
```bash
# Get your API key from: https://console.anthropic.com/
export ANTHROPIC_API_KEY="your-api-key-here"
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your settings
ANTHROPIC_API_KEY=your_anthropic_api_key_here
AI_MODEL=claude-3-5-sonnet-20241022
AI_MAX_TOKENS=4096
AI_TEMPERATURE=0.1
```

### 3. Install Dependencies
```bash
npm install
# Includes: @anthropic-ai/sdk, @modelcontextprotocol/sdk, puppeteer
```

## 🚀 Real MCP Tools Integration

### Built-in MCP Tools
The scanner includes several built-in MCP tools that work without external servers:

1. **Playwright Tool** - Web automation and search
2. **Regex Search Tool** - Advanced file pattern matching
3. **Function Definition Tool** - Code analysis and function extraction
4. **Web Search Tool** - Documentation retrieval

### External MCP Servers (Optional)
Configure external MCP servers in `config/mcp-tools.json`:

```json
{
  "mcpServers": {
    "custom-server": {
      "type": "websocket",
      "url": "ws://localhost:8001",
      "description": "Custom MCP server"
    }
  }
}
```

## 📊 AI Analysis Workflow

### Sentinel Agent (Tech Stack ID)
```
1. Gather code samples (config files, source files)
2. AI Analysis: "What technologies are used here?"
3. Merge with traditional pattern analysis
4. Generate security goals based on tech stack
5. Result: Confident tech stack identification
```

### Guardian Agent (Rule Creation)
```
1. AI Analysis: "Generate security rules for [detected tech]"
2. Fetch documentation using MCP tools
3. Web search for latest security practices
4. AI Synthesis: Create comprehensive rule set
5. Result: Dynamic, up-to-date security rules
```

### Inspector Agent (Vulnerability Detection)
```
1. Apply AI-generated rules to code
2. AI Context Analysis: "Is this really vulnerable?"
3. Dynamic severity assessment
4. Risk factor evaluation
5. Result: High-confidence vulnerability detection
```

### Forge Agent (Code Suggestions)
```
1. AI Analysis: "How to fix this vulnerability?"
2. Generate secure alternatives
3. Provide implementation guidance
4. Create educational content
5. Result: Actionable, context-aware fixes
```

## 🎯 Usage Examples

### Basic AI-Powered Scan
```bash
# The AI will analyze your codebase dynamically
npm start scan my-project.zip

# Output includes:
# - AI-detected technologies with confidence scores
# - Dynamically generated security rules
# - Context-aware vulnerability analysis
# - AI-generated secure code suggestions
```

### Health Check with AI Status
```bash
npm start health

# Shows:
# ✅ Anthropic API: Connected (claude-3-5-sonnet)
# ✅ MCP Tools: 4 tools ready
# ✅ Agents: All initialized with AI
```

### Example AI Output
```json
{
  "aiAnalysis": {
    "languages": [
      {
        "name": "javascript",
        "confidence": 0.95,
        "evidence": ["package.json dependencies", "Express framework usage"],
        "security_considerations": [
          "XSS vulnerabilities in template rendering",
          "SQL injection in database queries",
          "Prototype pollution risks"
        ]
      }
    ],
    "summary": "Node.js web application with Express framework, MySQL database, and potential security vulnerabilities in user input handling"
  },
  "aiGeneratedRules": [
    {
      "type": "express-sql-injection",
      "name": "Express MySQL Injection Detection",
      "pattern": "(mysql|connection)\\.query\\s*\\([^?]*\\+[^)]*\\)",
      "severity": "critical",
      "aiGenerated": true,
      "mitigation": "Use parameterized queries with mysql2 prepared statements"
    }
  ]
}
```

## ⚙️ AI Configuration Options

### Model Selection
```bash
# Use different Claude models
AI_MODEL=claude-3-5-sonnet-20241022  # Most capable
AI_MODEL=claude-3-haiku-20240307     # Fastest
```

### Analysis Depth
```bash
AI_MAX_TOKENS=4096      # Standard analysis
AI_MAX_TOKENS=8192      # Deep analysis
AI_TEMPERATURE=0.1      # Focused/deterministic
AI_TEMPERATURE=0.3      # More creative
```

### Performance Tuning
```bash
SCANNER_TIMEOUT=600000  # 10 minutes for large projects
AI_BATCH_SIZE=5         # Concurrent AI requests
MCP_TIMEOUT=30000       # MCP tool timeout
```

## 📈 Performance & Costs

### Typical Analysis Costs (Anthropic API)
- **Small project** (~50 files): $0.10 - $0.50
- **Medium project** (~200 files): $0.50 - $2.00
- **Large project** (~1000 files): $2.00 - $10.00

### Performance Optimizations
- **Code sampling**: Analyzes representative samples, not every file
- **Intelligent caching**: Caches AI responses for similar code patterns
- **Batch processing**: Groups similar analysis requests
- **Progressive analysis**: Starts with high-confidence findings

## 🛡️ Security & Privacy

### API Security
- API keys stored in environment variables
- No code sent to third parties without explicit consent
- Local processing for sensitive codebases option available

### Data Handling
- Code snippets limited to analysis-relevant portions
- No persistent storage of analyzed code on external servers
- Full audit trail of all AI interactions

## 🔬 Advanced Features

### Custom AI Prompts
Modify agent behavior by customizing AI prompts in the source code:

```javascript
// In SentinelAgent.js
const customPrompt = `
Analyze this codebase for enterprise security concerns:
- Focus on data privacy compliance (GDPR, CCPA)
- Identify cloud security misconfigurations
- Check for secrets management issues
...
`;
```

### MCP Tool Extensions
Add your own MCP tools:

```javascript
// Custom security tool
class CustomSecurityTool {
  async execute(method, params) {
    // Your custom security logic
    return securityAnalysisResult;
  }
}
```

## 🎓 Educational Mode

Enable detailed explanations:

```bash
export EDUCATIONAL_MODE=true
npm start scan project.zip
```

This provides:
- **Why** each vulnerability is dangerous
- **How** attacks would work
- **What** the business impact could be
- **When** to prioritize fixes

## 🤝 Contributing

To contribute AI enhancements:

1. **AI Prompt Engineering**: Improve analysis prompts
2. **MCP Tool Development**: Create new analysis tools
3. **Rule Enhancement**: Add AI-generated security rules
4. **Performance Optimization**: Improve AI request efficiency

## 📚 Documentation

- `src/services/AnthropicService.js` - AI integration
- `src/services/MCPService.js` - MCP tool management
- `config/mcp-tools.json` - Tool configurations
- `.env.example` - Environment setup

---

**🎯 Result**: A truly intelligent security scanner that adapts to your codebase, uses real-time information, and provides contextual, actionable security guidance powered by state-of-the-art AI.**