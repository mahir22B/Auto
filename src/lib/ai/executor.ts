// src/lib/ai/executor.ts
import { ExecutorContext, ExecutionResult } from "../executors/types";
import { AbstractExecutor } from "../executors/AbstractExecutor";
import { AIConfig, OpenRouterResponse } from "./types";

export class AIExecutor extends AbstractExecutor {
  async execute(context: ExecutorContext, config: AIConfig): Promise<ExecutionResult> {
    try {
      switch (config.action) {
        case "ASK_AI":
          return this.executeAskAI(context, config);
        default:
          return {
            success: false,
            error: {
              message: `Unsupported AI action: ${config.action}`
            }
          };
      }
    } catch (error) {
      console.error("AI executor error:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "An error occurred during execution",
          details: error
        }
      };
    }
  }
  
  private async executeAskAI(context: ExecutorContext, config: AIConfig): Promise<ExecutionResult> {
    try {
      // Get inputs from connected nodes or config
      const prompt = this.getInputValueOrConfig(context, 'input_prompt', config, 'prompt');
      const contextData = this.getInputValueOrConfig(context, 'input_context', config, 'context');
      
      if (!prompt) {
        return {
          success: false,
          error: { message: "Prompt is required" }
        };
      }
      
      if (!config.model) {
        return {
          success: false,
          error: { message: "AI model selection is required" }
        };
      }
      
      // Prepare messages for the AI
      const messages = [];
      
      if (config.systemPrompt) {
        messages.push({ role: "system", content: config.systemPrompt });
      }
      
      if (contextData) {
        messages.push({ role: "user", content: `Context information:\n${contextData}` });
      }
      
      messages.push({ role: "user", content: prompt });
      
      // Call our backend proxy instead of requiring user API keys
      const response = await fetch('/api/ai/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: config.temperature || 0.7,
          max_tokens: config.maxTokens || undefined,
          stream: false
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
      }
      
      const data = await response.json() as OpenRouterResponse;
      
      // Extract the AI's response and token usage
      const aiResponse = data.choices[0].message.content;
      const tokensUsed = data.usage?.total_tokens || 0;
      
      return {
        success: true,
        data: {
          output_response: aiResponse,
          output_tokens: tokensUsed,
          model: data.model, // Include the actual model used
          _output_types: {
            output_response: 'string',
            output_tokens: 'number'
          }
        }
      };
    } catch (error) {
      console.error("Error executing Ask AI action:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to get AI response",
          details: error
        }
      };
    }
  }
}