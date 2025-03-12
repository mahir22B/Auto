// src/lib/ai/types.ts
export type AIAction = 'ASK_AI' | 'SUMMARIZE'; // Adding SUMMARIZE for future expansion

export interface AIConfig {
  action: AIAction;
  // For ASK_AI action
  model?: string;
  systemPrompt?: string;
  prompt?: string;
  context?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AINode {
  id: string;
  type: 'ai';
  position: { x: number; y: number };
  data: {
    config: AIConfig;
    isConfigured: boolean;
  };
}

// Types for OpenRouter API responses
export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterChoice {
  message: OpenRouterMessage;
  finish_reason: string;
  index: number;
}

export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenRouterResponse {
  id: string;
  choices: OpenRouterChoice[];
  created: number;
  model: string;
  object: string;
  usage: OpenRouterUsage;
}