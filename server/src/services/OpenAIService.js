import OpenAI from 'openai';
import { EventEmitter } from 'events';
import dotenv from 'dotenv';
import { AILogger } from './AILogger.js';

dotenv.config();

export class OpenAIService extends EventEmitter {
  constructor(options = {}) {
    super();

    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    this.model = options.model || process.env.AI_MODEL || 'gpt-4-turbo-preview';
    this.maxTokens = options.maxTokens || parseInt(process.env.AI_MAX_TOKENS) || 4096;
    this.temperature = options.temperature || parseFloat(process.env.AI_TEMPERATURE) || 0.1;
    this.aiLogger = options.aiLogger || null;

    if (!this.apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    }

    this.client = new OpenAI({
      apiKey: this.apiKey
    });

    this.requestCount = 0;
    this.totalTokens = 0;
    this.errors = [];
  }

  async analyzeCode(code, prompt, context = {}) {
    const requestStartTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      this.emit('analysis-start', { prompt: prompt.substring(0, 100) });

      const systemPrompt = this.buildSystemPrompt(context);
      const userPrompt = this.buildUserPrompt(code, prompt, context);
      const fullPrompt = `System: ${systemPrompt}\n\nUser: ${userPrompt}`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        max_completion_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      const requestEndTime = Date.now();
      const duration = requestEndTime - requestStartTime;

      this.requestCount++;
      this.totalTokens += response.usage?.prompt_tokens + response.usage?.completion_tokens || 0;

      const result = {
        analysis: response.choices[0].message.content,
        usage: {
          input_tokens: response.usage?.prompt_tokens || 0,
          output_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0
        },
        model: this.model,
        timestamp: new Date().toISOString()
      };

      // Log AI interaction
      if (this.aiLogger) {
        await this.aiLogger.logAIInteraction({
          sessionId: context.sessionId || 'unknown',
          agent: context.agent || 'openai-service',
          task: context.task || 'code-analysis',
          purpose: this.inferPurpose(context.task),
          provider: 'openai',
          model: this.model,
          requestId,
          systemPrompt,
          userPrompt,
          fullPrompt,
          response: response.choices[0].message.content,
          usage: result.usage,
          temperature: this.temperature,
          maxTokens: this.maxTokens,
          requestTime: requestStartTime,
          responseTime: requestEndTime,
          duration,
          finishReason: response.choices[0].finish_reason,
          context
        });
      }

      this.emit('analysis-complete', {
        tokens: response.usage?.completion_tokens,
        prompt: prompt.substring(0, 100)
      });

      return result;

    } catch (error) {
      const requestEndTime = Date.now();
      const duration = requestEndTime - requestStartTime;

      this.errors.push({
        error: error.message,
        timestamp: new Date().toISOString(),
        prompt: prompt.substring(0, 100)
      });

      // Log error interaction
      if (this.aiLogger) {
        await this.aiLogger.logAIInteraction({
          sessionId: context.sessionId || 'unknown',
          agent: context.agent || 'openai-service',
          task: context.task || 'code-analysis',
          purpose: this.inferPurpose(context.task),
          provider: 'openai',
          model: this.model,
          requestId,
          systemPrompt: this.buildSystemPrompt(context),
          userPrompt: this.buildUserPrompt(code, prompt, context),
          fullPrompt: `System: ${this.buildSystemPrompt(context)}\n\nUser: ${this.buildUserPrompt(code, prompt, context)}`,
          response: '',
          usage: {},
          temperature: this.temperature,
          maxTokens: this.maxTokens,
          requestTime: requestStartTime,
          responseTime: requestEndTime,
          duration,
          error: {
            message: error.message,
            code: error.code,
            type: error.type || 'api_error'
          },
          context
        });
      }

      this.emit('analysis-error', { error: error.message });
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  async identifyTechStack(files, codeSnippets) {
    const prompt = `
Analyze the provided files and code snippets to identify:
1. Primary programming languages used
2. Frameworks and libraries detected
3. Application architecture patterns
4. Entry points and main components
5. Configuration files and their purposes

Provide a structured response with confidence scores for each identification.
Focus on security-relevant technologies and frameworks.
`;

    const context = {
      task: 'tech-stack-identification',
      fileCount: files.length,
      languages: this.detectLanguagesFromFiles(files)
    };

    return await this.analyzeCode(codeSnippets, prompt, context);
  }

  async generateSecurityRules(techStacks, existingRules = []) {
    const prompt = `
Based on the identified technology stack, generate comprehensive security rules:

Technology Stack: ${JSON.stringify(techStacks, null, 2)}

For each technology, create security rules that include:
1. Common vulnerability patterns specific to the technology
2. Regex patterns to detect these vulnerabilities
3. Severity levels (critical, high, medium, low)
4. Specific mitigation strategies
5. Context clues that might reduce false positives

Existing rules to avoid duplication: ${JSON.stringify(existingRules.map(r => r.type))}

Return a structured JSON array of security rules.
`;

    const context = {
      task: 'security-rule-generation',
      techStackCount: techStacks.length,
      existingRuleCount: existingRules.length
    };

    return await this.analyzeCode('', prompt, context);
  }

  async analyzeVulnerability(codeSnippet, context, rules) {
    const prompt = `
Analyze this code snippet for security vulnerabilities:

Code Context:
- File: ${context.file}
- Line: ${context.line}
- Function/Method: ${context.function || 'N/A'}
- Framework: ${context.framework || 'N/A'}

Surrounding Context:
${context.surroundingCode || 'N/A'}

Security Rules to Apply:
${JSON.stringify(rules.slice(0, 10), null, 2)}

Provide analysis including:
1. Identified vulnerabilities with confidence scores
2. Risk assessment and severity
3. Attack scenarios
4. Impact analysis
5. False positive likelihood
6. Contextual security measures already present

Return structured JSON with vulnerability details.
`;

    return await this.analyzeCode(codeSnippet, prompt, {
      task: 'vulnerability-analysis',
      file: context.file,
      ruleCount: rules.length
    });
  }

  async generateSecureCode(vulnerability, codeContext) {
    const prompt = `
Generate secure code alternatives for this vulnerability:

Vulnerability Details:
${JSON.stringify(vulnerability, null, 2)}

Original Code:
${codeContext.originalCode}

File Context:
- Language: ${codeContext.language}
- Framework: ${codeContext.framework}
- File: ${codeContext.file}

Provide:
1. Secure code replacement with explanation
2. Step-by-step implementation guide
3. Testing recommendations
4. Additional security considerations
5. Educational explanation of why the original code is vulnerable
6. Best practices for preventing similar issues

Return structured response with secure code examples.
`;

    return await this.analyzeCode(codeContext.originalCode, prompt, {
      task: 'secure-code-generation',
      vulnerability: vulnerability.type,
      language: codeContext.language
    });
  }

  async classifyVulnerability(issue, codeContext) {
    const prompt = `
Classify and score this security issue:

Issue Details:
${JSON.stringify(issue, null, 2)}

Code Context:
${JSON.stringify(codeContext, null, 2)}

Provide comprehensive classification:
1. OWASP category mapping
2. CWE (Common Weakness Enumeration) classification
3. Risk score calculation (0-10)
4. Business impact assessment
5. Exploitability analysis
6. Remediation effort estimation
7. Priority recommendation

Consider factors like:
- Entry point proximity
- Data sensitivity
- Authentication requirements
- Network exposure
- Framework security features

Return structured JSON classification.
`;

    return await this.analyzeCode(issue.matchedText, prompt, {
      task: 'vulnerability-classification',
      issueType: issue.type,
      severity: issue.severity
    });
  }

  async generateDocumentationSummary(documentationText, technology) {
    const prompt = `
Summarize security-relevant information from this documentation:

Technology: ${technology}

Documentation:
${documentationText}

Extract and summarize:
1. Security best practices
2. Common vulnerability patterns
3. Recommended security configurations
4. Known security issues and fixes
5. Framework-specific security features
6. Authentication/authorization patterns
7. Input validation recommendations

Provide concise, actionable security guidance.
`;

    return await this.analyzeCode('', prompt, {
      task: 'documentation-analysis',
      technology,
      docLength: documentationText.length
    });
  }

  buildSystemPrompt(context) {
    return `You are an expert security analyst specializing in code security assessment.

Your role is to:
- Identify security vulnerabilities with high accuracy
- Provide actionable security recommendations
- Generate secure code alternatives
- Explain security concepts clearly
- Consider real-world attack scenarios

Context: ${JSON.stringify(context)}

Guidelines:
- Be precise and avoid false positives
- Consider the specific technology stack and frameworks
- Provide practical, implementable solutions
- Include confidence scores for your assessments
- Focus on the most critical security issues first
- Consider both technical and business impact`;
  }

  buildUserPrompt(code, mainPrompt, context) {
    let prompt = mainPrompt;

    if (code && code.trim()) {
      prompt += `\n\nCode to analyze:\n\`\`\`\n${code}\n\`\`\``;
    }

    if (context.additionalInfo) {
      prompt += `\n\nAdditional Information:\n${context.additionalInfo}`;
    }

    return prompt;
  }

  detectLanguagesFromFiles(files) {
    const extensions = files.map(file => {
      const parts = file.split('.');
      return parts.length > 1 ? parts.pop().toLowerCase() : '';
    });

    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cs': 'csharp',
      'php': 'php',
      'go': 'go',
      'rs': 'rust',
      'rb': 'ruby',
      'cpp': 'cpp',
      'c': 'c'
    };

    const detectedLanguages = [...new Set(
      extensions
        .map(ext => languageMap[ext])
        .filter(lang => lang)
    )];

    return detectedLanguages;
  }

  async batchAnalyze(analysisRequests) {
    const results = [];
    const batchSize = 5; // Limit concurrent requests

    for (let i = 0; i < analysisRequests.length; i += batchSize) {
      const batch = analysisRequests.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async request => {
          try {
            return await this.analyzeCode(
              request.code,
              request.prompt,
              request.context
            );
          } catch (error) {
            return { error: error.message, request };
          }
        })
      );

      results.push(...batchResults.map(result =>
        result.status === 'fulfilled' ? result.value : result.reason
      ));

      // Rate limiting - wait between batches
      if (i + batchSize < analysisRequests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  getUsageStats() {
    return {
      requestCount: this.requestCount,
      totalTokens: this.totalTokens,
      errorCount: this.errors.length,
      recentErrors: this.errors.slice(-5)
    };
  }

  async testConnection() {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_completion_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Test connection - respond with "OK"'
          }
        ]
      });

      return {
        success: true,
        model: this.model,
        response: response.choices[0].message.content,
        usage: response.usage
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  generateRequestId() {
    return `openai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  inferPurpose(task) {
    const purposeMap = {
      'tech-stack-identification': 'Identify and analyze the technology stack used in the codebase',
      'security-rule-generation': 'Generate security rules based on identified technologies',
      'vulnerability-analysis': 'Analyze code snippets for security vulnerabilities',
      'secure-code-generation': 'Generate secure code alternatives for identified vulnerabilities',
      'vulnerability-classification': 'Classify and score security issues',
      'documentation-analysis': 'Analyze documentation for security-relevant information',
      'code-analysis': 'Perform general code analysis',
      'unknown': 'Unknown AI analysis task'
    };
    
    return purposeMap[task] || purposeMap['unknown'];
  }

  setAILogger(aiLogger) {
    this.aiLogger = aiLogger;
  }

  reset() {
    this.requestCount = 0;
    this.totalTokens = 0;
    this.errors = [];
    this.removeAllListeners();
  }
}
