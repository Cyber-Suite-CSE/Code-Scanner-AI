import { AnthropicService } from './AnthropicService.js';
import { OpenAIService } from './OpenAIService.js';
import dotenv from 'dotenv';

dotenv.config();

export class AIServiceFactory {
  /**
   * Creates an AI service instance based on environment configuration
   * @param {Object} options - Configuration options
   * @returns {AnthropicService|OpenAIService} AI service instance
   */
  static createAIService(options = {}) {
    // Get AI provider from environment variable, default to 'anthropic'
    const aiProvider = options.provider || process.env.AI_PROVIDER || 'anthropic';
    
    // Get model from environment or use provider default
    const model = options.model || process.env.AI_MODEL || this.getDefaultModel(aiProvider);
    
    console.log(`Initializing AI service with provider: ${aiProvider}, model: ${model}`);
    
    // Merge environment configuration with options
    const serviceOptions = {
      model,
      maxTokens: options.maxTokens || parseInt(process.env.AI_MAX_TOKENS) || 4096,
      temperature: options.temperature || parseFloat(process.env.AI_TEMPERATURE) || 0.1,
      ...options
    };
    
    switch (aiProvider.toLowerCase()) {
      case 'openai':
      case 'chatgpt':
        return new OpenAIService(serviceOptions);
      
      case 'anthropic':
      case 'claude':
        return new AnthropicService(serviceOptions);
      
      default:
        console.warn(`Unknown AI provider: ${aiProvider}. Falling back to Anthropic.`);
        return new AnthropicService(serviceOptions);
    }
  }

  /**
   * Gets the list of supported AI providers
   * @returns {Array<string>} Array of supported provider names
   */
  static getSupportedProviders() {
    return ['anthropic', 'claude', 'openai', 'chatgpt'];
  }

  /**
   * Validates if the required environment variables are set for the specified provider
   * @param {string} provider - The AI provider name
   * @returns {Object} Validation result with success flag and error message
   */
  static validateProviderConfig(provider = null) {
    const aiProvider = provider || process.env.AI_PROVIDER || 'anthropic';
    
    switch (aiProvider.toLowerCase()) {
      case 'openai':
      case 'chatgpt':
        if (!process.env.OPENAI_API_KEY) {
          return {
            success: false,
            error: 'OPENAI_API_KEY environment variable is required for OpenAI provider'
          };
        }
        return { success: true };
      
      case 'anthropic':
      case 'claude':
        if (!process.env.ANTHROPIC_API_KEY) {
          return {
            success: false,
            error: 'ANTHROPIC_API_KEY environment variable is required for Anthropic provider'
          };
        }
        return { success: true };
      
      default:
        return {
          success: false,
          error: `Unsupported AI provider: ${aiProvider}. Supported providers: ${this.getSupportedProviders().join(', ')}`
        };
    }
  }

  /**
   * Gets the default model for the specified provider
   * @param {string} provider - The AI provider name
   * @returns {string} Default model name
   */
  static getDefaultModel(provider = null) {
    const aiProvider = provider || process.env.AI_PROVIDER || 'anthropic';
    
    // First check if AI_MODEL is explicitly set in environment
    if (process.env.AI_MODEL) {
      return process.env.AI_MODEL;
    }
    
    // Otherwise use provider-specific defaults
    switch (aiProvider.toLowerCase()) {
      case 'openai':
      case 'chatgpt':
        return 'gpt-4-turbo-preview';
      
      case 'anthropic':
      case 'claude':
        return 'claude-3-5-sonnet-20241022';
      
      default:
        return 'claude-3-5-sonnet-20241022';
    }
  }

  /**
   * Gets configuration information for the current provider
   * @returns {Object} Configuration information
   */
  static getProviderInfo() {
    const aiProvider = process.env.AI_PROVIDER || 'anthropic';
    const model = process.env.AI_MODEL || this.getDefaultModel(aiProvider);
    const validation = this.validateProviderConfig();
    
    return {
      provider: aiProvider,
      model: model,
      defaultModel: this.getDefaultModel(aiProvider),
      maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 4096,
      temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.1,
      isConfigured: validation.success,
      error: validation.error || null,
      supportedProviders: this.getSupportedProviders()
    };
  }

  /**
   * Gets the current AI configuration from environment variables
   * @returns {Object} Current configuration
   */
  static getCurrentConfig() {
    const aiProvider = process.env.AI_PROVIDER || 'anthropic';
    const model = process.env.AI_MODEL || this.getDefaultModel(aiProvider);
    
    return {
      provider: aiProvider,
      model: model,
      maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 4096,
      temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.1,
      apiKeyConfigured: this.validateProviderConfig().success
    };
  }
}
