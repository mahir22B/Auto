export type SlackAction = 'SEND_MESSAGE' | 'READ_MESSAGES' | 'CANVAS_WRITER';

export type MessageInformationType = 
  | 'Messages'
  | 'Attachment Names'
  | 'Thread IDs'
  | 'Sender Names'
  | 'Thread Links'
  | 'Channel Names'
  | 'Channel IDs';

export type RetrievalMethod = 'count' | 'dateRange';

export interface SlackConfig {
  action: SlackAction;
  
  // For SEND_MESSAGE action
  targetType?: 'channel' | 'user';
  channelId?: string;
  userId?: string;
  message?: string;
  threadId?: string;
  attachmentSource?: 'local' | 'port';
  localAttachments?: File[] | null;
  
  // For READ_MESSAGES action
  retrievalMethod?: RetrievalMethod;
  messageCount?: number;
  startDate?: string;
  endDate?: string;
  messageInformation?: MessageInformationType[];

  // For CANVAS_WRITER action
  canvasTitle?: string;
  canvasContent?: string;
  accessLevel?: 'read' | 'write';
}

export interface SlackNode {
  id: string;
  type: 'slack';
  position: { x: number; y: number };
  data: {
    config: SlackConfig;
    isConfigured: boolean;
  };
}

// For READ_MESSAGES action results
export interface SlackMessage {
  id: string;
  ts: string;  // Timestamp that serves as message ID
  text: string;
  user: string; // User ID
  username?: string; // User display name
  threadTs?: string; // Thread timestamp if part of a thread
  attachments?: SlackAttachment[];
  files?: SlackFile[];
  channel: string; // Channel ID
  channelName?: string; // Channel name
  permalink?: string; // URL to the message
}

export interface SlackAttachment {
  id?: string;
  title?: string;
  fallback?: string;
  text?: string;
  pretext?: string;
}

export interface SlackFile {
  id: string;
  name: string;
  filetype: string;
  size: number;
  url_private?: string;
}

export interface SlackReadMessagesResult {
  messages: SlackMessage[];
  messageTexts?: string[];
  attachmentNames?: string[];
  threadIds?: string[];
  senderNames?: string[];
  threadLinks?: string[];
  channelNames?: string[];
  channelIds?: string[];
}

// Canvas Writer Result
export interface SlackCanvasResult {
  canvasId: string;
  canvasLink: string;
  title: string;
  content: string;
  channelId: string;
}