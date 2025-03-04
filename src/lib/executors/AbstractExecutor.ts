// src/lib/executors/AbstractExecutor.ts

import { BaseExecutor, ExecutorContext, ExecutionResult } from './types';
import { TokenManager } from '../auth/TokenManager';

export abstract class AbstractExecutor implements BaseExecutor {
  protected async makeAuthorizedRequest(
    service: string,
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    try {
      const accessToken = await TokenManager.getValidToken(service);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed');
        }
        throw new Error(`Request failed with status ${response.status}`);
      }

      return response;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`API request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get an input value from the execution context or fall back to config
   * @param context Execution context with inputs
   * @param inputHandleId The ID of the input handle to check
   * @param config The node configuration for fallback
   * @param configField The field in the config to use as fallback
   * @returns The input value or config fallback
   */
  protected getInputValueOrConfig(
    context: ExecutorContext, 
    inputHandleId: string, 
    config: any, 
    configField: string
  ): any {
    // First check direct inputData access
    if (context.inputData && context.inputData[inputHandleId] !== undefined) {
      return context.inputData[inputHandleId];
    }

    // Fallback to searching inputs array
    if (context.inputs) {
      for (const input of context.inputs) {
        if (input.targetHandle === inputHandleId && input.data !== undefined) {
          return input.data;
        }
      }
    }

    // If no input was found, return the config value
    return config[configField];
  }

  // This is the method from the BaseExecutor interface
  abstract execute(context: ExecutorContext, config: any): Promise<ExecutionResult>;
}