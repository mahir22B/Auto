// src/lib/executors/types.ts

export interface InputConnection {
  sourceNode: string;
  sourceHandle: string;
  targetHandle: string;
  data: any;
}

export interface ExecutorContext {
  tokens: {
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
  };
  inputs?: InputConnection[];
  // Direct access to input data by handle ID
  inputData?: Record<string, any>;
}

export interface ExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

export interface BaseExecutor {
  execute(context: ExecutorContext, config: any): Promise<ExecutionResult>;
}