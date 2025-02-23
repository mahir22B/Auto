// src/lib/executors/index.ts

import { ExecutorRegistry } from './registry';
import { GmailExecutor } from '../gmail/executor';
import { SheetReader } from '../sheets/executor';

// Register all executors
ExecutorRegistry.register('gmail', GmailExecutor);
ExecutorRegistry.register('sheets', SheetReader);


// Export for convenience
export { ExecutorRegistry } from './registry';