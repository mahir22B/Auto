// src/lib/ai/types.ts
export type AIAction = 'ASK_AI' | 'SUMMARIZE' | 'EXTRACT_INFORMATION' | 'SCORER';

export interface AIConfig {
  action: AIAction;
  // Common fields
  model?: string;
  temperature?: number;
  maxTokens?: number;
  
  // For ASK_AI action
  systemPrompt?: string;
  prompt?: string;
  context?: string;
  
  // For SUMMARIZE action
  text?: string;
  
  // For EXTRACT_INFORMATION action
  extractList?: boolean;
  dataFields?: Array<{
    name: string;
    type: 'text' | 'number' | 'boolean';
    description?: string;
  }>;
  additionalContext?: string;

  // For SCORER action
  item?: string;
  criteria?: string;
  includeJustification?: boolean;
  loopMode?: boolean;
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