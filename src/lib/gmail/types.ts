export type GmailAction = 'READ_UNREAD' | 'SEND_EMAIL';

export interface GmailConfig {
  action: GmailAction;
  maxResults?: number;
  labelId?: string;
  to?: string;
  subject?: string;
  body?: string;
}

// Extend the existing FlowNode type
export interface GmailNode {
  id: string;
  type: 'gmail';
  position: { x: number; y: number };
  data: {
    config: GmailConfig;
    isConfigured: boolean;
  };
}