# AI Configuration Guide

The Code Security Scanner now supports configurable AI providers and models through environment variables.

## Supported AI Providers

- **Anthropic/Claude**: `anthropic` or `claude`
- **OpenAI/ChatGPT**: `openai` or `chatgpt`

## Environment Variables

Create a `.env` file in the server directory with the following configuration:

```bash
# AI Configuration
AI_PROVIDER=anthropic                    # or openai
AI_MODEL=claude-3-5-sonnet-20241022     # or your preferred model
AI_MAX_TOKENS=4096
AI_TEMPERATURE=0.1

# API Keys (set the appropriate one based on your provider)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=8000
```

## Supported Models

### Anthropic Models
- `claude-3-5-sonnet-20241022` (recommended)
- `claude-3-haiku-20240307`
- `claude-3-opus-20240229`

### OpenAI Models
- `gpt-4-turbo-preview` (recommended)
- `gpt-4`
- `gpt-3.5-turbo`
- `gpt-4o`
- `gpt-4o-mini`

## Configuration Priority

The system uses the following priority order for configuration:

1. **Explicit options** passed to `AIServiceFactory.createAIService(options)`
2. **Environment variables** (AI_PROVIDER, AI_MODEL, etc.)
3. **Provider-specific defaults**

## Testing Configuration

Run the AI configuration test to verify your setup:

```bash
cd server
node test-ai-config.js
```

This will:
- Display current configuration
- Validate API keys
- Test AI service creation
- Test connection (if API key is valid)

## API Endpoints

The server provides endpoints to check AI configuration:

- `GET /api/ai-config` - Get detailed AI configuration
- `GET /health` - Health check including AI configuration status

## Usage in Code

The WorkflowOrchestrator automatically uses the configured AI service:

```javascript
import { AIServiceFactory } from './src/services/AIServiceFactory.js';

// Create AI service with environment configuration
const aiService = AIServiceFactory.createAIService();

// Or with custom options (overrides environment)
const customAiService = AIServiceFactory.createAIService({
  provider: 'openai',
  model: 'gpt-4',
  temperature: 0.2
});
```

## Configuration Validation

The system validates:
- Provider is supported
- Required API key is present
- Model is specified (uses defaults if not)
- Numeric values are properly parsed

## Troubleshooting

### Common Issues

1. **API Key Not Configured**
   - Error: "API key is required"
   - Solution: Set the appropriate API key environment variable

2. **Invalid Provider**
   - Error: "Unsupported AI provider"
   - Solution: Use one of the supported providers (anthropic, claude, openai, chatgpt)

3. **Connection Failed**
   - Error: "AI service connection failed"
   - Solution: Check API key validity and network connectivity

### Debug Information

Check the server startup logs for AI configuration details:

```
🤖 AI Configuration:
   Provider: anthropic
   Model: claude-3-5-sonnet-20241022
   Max Tokens: 4096
   Temperature: 0.1
   API Key Configured: ✅
```

## Environment File Template

Copy `.env.example` to `.env` and update with your configuration:

```bash
cp .env.example .env
# Edit .env with your API keys and preferences
```
