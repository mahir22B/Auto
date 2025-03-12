// src/lib/ai/actions.ts
import { ActionConfig } from '../services';

export const AI_ACTIONS: Record<string, ActionConfig> = {
  ASK_AI: {
    id: 'ASK_AI',
    name: 'Ask AI',
    description: 'Get a response from an AI language model',
    configFields: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'input',
        required: true,
        placeholder: 'Enter your prompt here'
      },
      
      {
        name: 'systemPrompt',
        label: 'Context',
        type: 'text',
        required: false,
        placeholder: 'Additional context for the AI assistant (optional)'
      },
      // {
      //   name: 'temperature',
      //   label: 'Temperature',
      //   type: 'number',
      //   required: false,
      //   placeholder: '0.7'
      // },
      // {
      //   name: 'maxTokens',
      //   label: 'Max Response Length',
      //   type: 'number',
      //   required: false,
      //   placeholder: 'Leave blank for default'
      // }
      {
        name: 'model',
        label: 'AI Model',
        type: 'select',
        required: true,
        options: [
          // OpenAI Models
          { value: 'openai_header', label: 'OpenAI', isHeader: true },
          { value: 'openai/chatgpt-4o-latest', label: 'GPT-4o' },
          { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
          { value: 'openai/o1', label: 'OpenAI o1' },
          { value: 'openai/o3-mini', label: 'OpenAI o3-mini' },
          
          // Anthropic Models
          { value: 'anthropic_header', label: 'Anthropic', isHeader: true },
          { value: 'anthropic/claude-3.7-sonnet', label: 'Claude 3.7 Sonnet' },
          { value: 'anthropic/claude-3.7-sonnet:thinking', label: 'Claude 3.7 Sonnet - Thinking' },
          { value: 'anthropic/claude-3.5-haiku-20241022', label: 'Claude 3.5 Haiku' },
          
          // Google Models
          // { value: 'google_header', label: 'Google', isHeader: true },
          // { value: 'google/gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
          // { value: 'google/gemma-7b', label: 'Gemma 7B' },
          
          // Perplexity Models
          { value: 'perplexity_header', label: 'Perplexity', isHeader: true },
          { value: 'perplexity/sonar-reasoning-pro', label: 'Perplexity Sonar Reasoning Pro' },
          { value: 'perplexity/sonar-reasoning', label: 'Perplexity Sonar Reasoning' },
          { value: 'perplexity/sonar-pro', label: 'Perplexity Sonar Pro' },
          { value: 'perplexity/sonar', label: 'Perplexity Sonar' },
          
          // Meta Models
          // { value: 'meta_header', label: 'Meta', isHeader: true },
          // { value: 'meta/llama-3-70b', label: 'LLaMA 3 70B' },
          // { value: 'meta/llama-3-405b-instruct', label: 'LLaMA 3 405B Instruct' },
          
          // DeepSeek Models
          // { value: 'deepseek_header', label: 'DeepSeek', isHeader: true },
          // { value: 'deepseek/v3', label: 'DeepSeek V3' },
          // { value: 'deepseek/r1', label: 'DeepSeek R1' }
        ],
        placeholder: 'Select an AI model'
      },
    ],
    ports: {
      inputs: [
        { id: 'input_prompt', label: 'Prompt', type: 'string', isActive: true, isListType: false },
        { id: 'input_context', label: 'Context', type: 'string', isActive: true, isListType: false }
      ],
      outputs: [
        { id: 'output_response', label: 'Response', type: 'string', isActive: true, isListType: false },
      ]
    }
  }
};