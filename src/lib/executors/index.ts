// src/lib/executors/index.ts

import { ExecutorRegistry } from './registry';
import { GmailExecutor } from '../gmail/executor';

// Register all executors
ExecutorRegistry.register('gmail', GmailExecutor);

// Export for convenience
export { ExecutorRegistry } from './registry';