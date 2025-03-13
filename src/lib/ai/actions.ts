// src/lib/ai/actions.ts
import { ActionConfig } from '../services';

// Define AI models once to reuse across actions
const AI_MODELS = [
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
  
  // Perplexity Models
  { value: 'perplexity_header', label: 'Perplexity', isHeader: true },
  { value: 'perplexity/sonar-reasoning-pro', label: 'Perplexity Sonar Reasoning Pro' },
  { value: 'perplexity/sonar-reasoning', label: 'Perplexity Sonar Reasoning' },
  { value: 'perplexity/sonar-pro', label: 'Perplexity Sonar Pro' },
  { value: 'perplexity/sonar', label: 'Perplexity Sonar' },
];

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
        options: AI_MODELS,
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
  },
  
  SUMMARIZE: {
    id: 'SUMMARIZE',
    name: 'Summarize Text',
    description: 'Generate a concise summary of text using AI',
    configFields: [
      // {
      //   name: 'text',
      //   label: 'Text to Summarize',
      //   type: 'text',
      //   required: true,
      //   placeholder: 'Enter or connect the text you want to summarize'
      // },
      // {
      //   name: 'length',
      //   label: 'Summary Length',
      //   type: 'select',
      //   required: true,
      //   options: [
      //     { value: 'short', label: 'Short (1-2 paragraphs)' },
      //     { value: 'medium', label: 'Medium (3-4 paragraphs)' },
      //     { value: 'long', label: 'Long (5+ paragraphs)' }
      //   ],
      //   placeholder: 'Select summary length'
      // },
      // {
      //   name: 'style',
      //   label: 'Summary Style',
      //   type: 'select',
      //   required: true,
      //   options: [
      //     { value: 'concise', label: 'Concise (Key points only)' },
      //     { value: 'comprehensive', label: 'Comprehensive (Detailed overview)' },
      //     { value: 'bullets', label: 'Bullet Points (List format)' }
      //   ],
      //   placeholder: 'Select summary style'
      // },
      {
        name: 'model',
        label: 'AI Model',
        type: 'select',
        required: true,
        options: AI_MODELS,
        placeholder: 'Select an AI model'
      },
    ],
    ports: {
      inputs: [
        { id: 'input_text', label: 'Text', type: 'string', isActive: true, isListType: false }
      ],
      outputs: [
        { id: 'output_summary', label: 'Summary', type: 'string', isActive: true, isListType: false }
      ]
    }
  },
  
  EXTRACT_INFORMATION: {
    id: 'EXTRACT_INFORMATION',
    name: 'Extract Information',
    description: 'Extract structured data from unstructured text',
    configFields: [
      // {
      //   name: 'extractList',
      //   label: 'Extract List?',
      //   type: 'boolean',
      //   required: false,
      //   placeholder: 'Extract multiple items?'
      // },
      {
        name: 'dataFields',
        label: 'Data Fields',
        type: 'dataFields', // Custom field type that will be handled in the UI
        required: true,
        placeholder: 'Define data to extract'
      },
      {
        name: 'additionalContext',
        label: 'Additional Context',
        type: 'text',
        required: false,
        placeholder: 'Additional context to guide extraction'
      },
      {
        name: 'model',
        label: 'AI Model',
        type: 'select',
        required: true,
        options: AI_MODELS,
        placeholder: 'Select an AI model'
      },
    ],
    ports: {
      inputs: [
        { id: 'input_text', label: 'Text', type: 'string', isActive: true, isListType: false }
      ],
      outputs: [
        // { id: 'output_data', label: 'Extracted Data', type: 'object', isActive: true, isListType: false }
        // Dynamic outputs will be added based on defined fields
      ]
    },
    // Add a function to generate dynamic ports based on the configured data fields
    getDynamicPorts: (config: any) => {
      if (!config || !config.dataFields || !Array.isArray(config.dataFields)) {
        return {
          inputs: [
            { id: 'input_text', label: 'Text', type: 'string', isActive: true, isListType: false }
          ],
          outputs: []
        };
      }
      
      
      // Create dynamic output ports based on the defined data fields
      const outputs = [];
      
      config.dataFields.forEach((field: any) => {
        // Only add a port if the field has a non-empty name
        if (field.name && field.name.trim() !== '') {
          outputs.push({
            id: `output_${field.name}`,
            label: field.name,
            type: field.type || 'string',
            isActive: true,
            isListType: config.extractList === true
          });
        }
      });
      
      return {
        inputs: [
          { id: 'input_text', label: 'Text', type: 'string', isActive: true, isListType: false }
        ],
        outputs
      };
    }
  }
};