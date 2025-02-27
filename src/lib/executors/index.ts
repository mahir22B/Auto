// src/lib/executors/index.ts

import { ExecutorRegistry } from './registry';
import { GmailExecutor } from '../gmail/executor';
import { SheetReader } from '../sheets/executor';
import { GDriveExecutor } from '../gdrive/executor';

// Register all executors
ExecutorRegistry.register('gmail', GmailExecutor);
ExecutorRegistry.register('sheets', SheetReader);
ExecutorRegistry.register('gdrive', GDriveExecutor);



// Export for convenience
export { ExecutorRegistry } from './registry';