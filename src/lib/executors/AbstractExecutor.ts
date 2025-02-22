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

  // This is the method from the BaseExecutor interface
  abstract execute(context: ExecutorContext, config: any): Promise<ExecutionResult>;
}