// src/lib/executors/index.ts

import { ExecutorRegistry } from './registry';
import { GmailExecutor } from '../gmail/executor';
import { SheetReader } from '../sheets/executor';
import { GDriveExecutor } from '../gdrive/executor';
import { GDocsExecutor } from '../gdocs/executor';
import { SlackExecutor } from '../slack/executor';
import { AIExecutor } from '../ai/executor'; 
import { HubspotExecutor } from '../hubspot/executor';




// Register all executors
ExecutorRegistry.register('gmail', GmailExecutor);
ExecutorRegistry.register('sheets', SheetReader);
ExecutorRegistry.register('gdrive', GDriveExecutor);
ExecutorRegistry.register('gdocs', GDocsExecutor);
ExecutorRegistry.register('slack', SlackExecutor);
ExecutorRegistry.register('ai', AIExecutor);
ExecutorRegistry.register('hubspot', HubspotExecutor);





// Export for convenience
export { ExecutorRegistry } from './registry';