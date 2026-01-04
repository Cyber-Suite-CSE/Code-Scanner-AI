import { generateText as aiGenerateText, LanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";

export const DEFAULT_MODEL = process.env.DEFAULT_MODEL || "gpt-5.1-2025-11-13";

export type ModelProvider = "openai" | "anthropic" | "google";

export interface GenerateTextOptions {
  model: string;
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  abortSignal?: AbortSignal;
}

export interface GenerateTextResult {
  text: string;
}

/**
 * Detect the provider from the model name
 */
export function detectProvider(model: string): ModelProvider {
  if (model.startsWith("claude-")) {
    return "anthropic";
  }
  if (model.startsWith("gemini-") || model.startsWith("models/gemini-")) {
    return "google";
  }
  // Default to OpenAI for gpt-* models and others
  return "openai";
}

/**
 * Get the language model instance based on the model name
 */
export function getLanguageModel(model: string): LanguageModel {
  const provider = detectProvider(model);

  switch (provider) {
    case "anthropic":
      return anthropic(model);
    case "google":
      return google(model);
    case "openai":
    default:
      return openai(model);
  }
}

/**
 * Generate text using the appropriate AI provider based on the model name.
 * 
 * Supports:
 * - OpenAI models
 * - Anthropic models
 * - Google models
 * 
 * @param options - The options for text generation
 * @returns The generated text result
 */
export async function generateText(
  options: GenerateTextOptions
): Promise<GenerateTextResult> {
  const { model, system, messages, abortSignal } = options;

  const languageModel = getLanguageModel(model);

  const result = await aiGenerateText({
    model: languageModel,
    system,
    messages,
    abortSignal,
  });

  return { text: result.text };
}
