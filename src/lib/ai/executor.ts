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
        case "SUMMARIZE":
          return this.executeSummarize(context, config);
        case "EXTRACT_INFORMATION":
          return this.executeExtractInformation(context, config);
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
      const actualModel = data.model; // Get the actual model used

      // Add model verification
      if (actualModel !== config.model) {
        console.warn(`Requested model ${config.model} but got response from ${actualModel}`);
      }
      
      return {
        success: true,
        data: {
          output_response: aiResponse,
          output_tokens: tokensUsed,
          model: actualModel, // Include the actual model used
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
  
  private async executeSummarize(context: ExecutorContext, config: AIConfig): Promise<ExecutionResult> {
    try {
      // Get inputs from connected nodes or config
      const textToSummarize = this.getInputValueOrConfig(context, 'input_text', config, 'text');
      
      if (!textToSummarize) {
        return {
          success: false,
          error: { message: "Text to summarize is required" }
        };
      }
      
      if (!config.model) {
        return {
          success: false,
          error: { message: "AI model selection is required" }
        };
      }
      
      // Create a comprehensive system prompt for summarization
      const systemPrompt = `You are an expert text summarizer. Your task is to create a summary that accurately captures the essential information from the text below.

For this summary:
- Focus on the most important concepts, arguments, and findings
- Maintain the original meaning, structure, and tone
- Include key supporting details while eliminating redundant information
- Preserve the logical flow and relationships between ideas
- Keep the summary proportional to the original text's sections and topics
- Use clear, direct language to efficiently communicate the content

Ensure your summary:
- Accurately represents the original content without distortion
- Contains no information not present in the original text
- Preserves the tone, intent, and meaning of the source material
- Is well-organized and logically structured
- Uses clear, precise language appropriate for the content
- Is immediately useful to someone who hasn't read the original text
- Maintains appropriate context for any quoted material or specific references
- Avoids inserting your own opinions or interpretations

Here is the text to summarize:`;
      
      // Prepare messages for the AI
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: textToSummarize }
      ];
      
      // Make the API request
      const response = await fetch('/api/ai/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: config.temperature || 0.5, // Lower temperature for more focused summary
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
      const summary = data.choices[0].message.content;
      const tokensUsed = data.usage?.total_tokens || 0;
      const actualModel = data.model;
      
      // Add model verification
      if (actualModel !== config.model) {
        console.warn(`Requested model ${config.model} but got response from ${actualModel}`);
      }
      
      return {
        success: true,
        data: {
          output_summary: summary,
          output_tokens: tokensUsed,
          model: actualModel,
          _output_types: {
            output_summary: 'string',
            output_tokens: 'number'
          }
        }
      };
    } catch (error) {
      console.error("Error executing Summarize action:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to generate summary",
          details: error
        }
      };
    }
  }
  
  private async executeExtractInformation(context: ExecutorContext, config: AIConfig): Promise<ExecutionResult> {
    try {
      // Get input text from connected nodes or config
      const inputText = this.getInputValueOrConfig(context, 'input_text', config, 'text');
      
      if (!inputText) {
        return {
          success: false,
          error: { message: "Input text is required for extraction" }
        };
      }
      
      if (!config.model) {
        return {
          success: false,
          error: { message: "AI model selection is required" }
        };
      }
      
      if (!config.dataFields || !Array.isArray(config.dataFields) || config.dataFields.length === 0) {
        return {
          success: false,
          error: { message: "No data fields defined for extraction" }
        };
      }
      
      // Format the system prompt for information extraction
      let systemPrompt = `You are an expert at extracting specific information from text. 
Your task is to extract the following data points from the provided text:

`;
      
      // Add each data field to the system prompt
      config.dataFields.forEach((field: any) => {
        systemPrompt += `- ${field.name} (${field.type}): ${field.description || 'No description provided'}\n`;
      });
      
      // Add instructions based on whether we're extracting a list or single items
      if (config.extractList) {
        systemPrompt += `\nExtract ALL matching instances of each data point as a list, even if there are multiple occurrences.`;
      } else {
        systemPrompt += `\nExtract only the MOST RELEVANT instance of each data point.`;
      }
      
      // Add additional context if provided
      if (config.additionalContext) {
        systemPrompt += `\n\nAdditional context: ${config.additionalContext}`;
      }
      
      // Add output format instructions
      systemPrompt += `
\nReturn the extracted information as a valid JSON object with the following structure:
{
  "results": {`;
      
      // Define the expected structure based on whether it's a list extraction or not
      if (config.extractList) {
        config.dataFields.forEach((field: any, index: number) => {
          systemPrompt += `
    "${field.name}": [
      // Array of extracted values with type ${field.type}
    ]${index < config.dataFields.length - 1 ? ',' : ''}`;
        });
      } else {
        config.dataFields.forEach((field: any, index: number) => {
          systemPrompt += `
    "${field.name}": // Extracted value with type ${field.type}${index < config.dataFields.length - 1 ? ',' : ''}`;
        });
      }
      
      systemPrompt += `
  },
  "metadata": {
    "confidence": {`;
      
      // Add confidence fields for each data point
      config.dataFields.forEach((field: any, index: number) => {
        systemPrompt += `
      "${field.name}": // Confidence score from 0 to 1${index < config.dataFields.length - 1 ? ',' : ''}`;
      });
      
      systemPrompt += `
    }
  }
}

Please provide only the JSON output without any additional text, explanation, or disclaimer.`;

      // Prepare messages for the AI
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: inputText }
      ];
      
      // Make the API request
      const response = await fetch('/api/ai/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: 0.2, // Lower temperature for more deterministic extraction
          max_tokens: config.maxTokens || undefined,
          stream: false
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
      }
      
      const data = await response.json() as OpenRouterResponse;
      
      // Extract the AI's response
      const aiResponse = data.choices[0].message.content;
      const tokensUsed = data.usage?.total_tokens || 0;
      const actualModel = data.model;
      
      // Try to parse the JSON response
      let extractedData: any;
      try {
        // Remove any potential markdown code blocks wrapping
        const jsonText = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
        extractedData = JSON.parse(jsonText);
      } catch (err) {
        return {
          success: false,
          error: {
            message: "Failed to parse AI response as JSON",
            details: {
              aiResponse,
              parsingError: err instanceof Error ? err.message : "Unknown error"
            }
          }
        };
      }
      
      // Format the output
      const result: Record<string, any> = {
        output_data: extractedData,
        model: actualModel,
        tokensUsed: tokensUsed,
        _output_types: {
          output_data: 'object'
        }
      };
      
      // Add individual outputs for each data field
      if (extractedData && extractedData.results) {
        config.dataFields.forEach((field: any) => {
          const outputKey = `output_${field.name}`;
          result[outputKey] = extractedData.results[field.name];
          
          // Add type information
          result._output_types[outputKey] = config.extractList ? 
            `${field.type}_array` : field.type;
        });
      }
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error("Error executing Extract Information action:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to extract information",
          details: error
        }
      };
    }
  }
}