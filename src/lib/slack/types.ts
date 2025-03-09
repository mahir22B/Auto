export type SlackAction = 'SEND_MESSAGE';

export interface SlackConfig {
  action: SlackAction;
  channelId?: string;
  message?: string;
  threadId?: string;
  // For file attachments
  attachmentSource?: 'local' | 'port';
  localAttachments?: File[] | null;
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