export type GmailAction = 'READ_UNREAD' | 'SEND_EMAIL';

export type EmailInformationType = 
  | 'email_bodies'
  | 'attached_file_names'
  | 'message_ids'
  | 'thread_ids'
  | 'sender_addresses'
  | 'recipient_addresses'
  | 'subjects'
  | 'dates'
  | 'sender_display_names';

export interface GmailConfig {
  action: GmailAction;
  // For READ_UNREAD action
  maxResults?: number;
  label?: string;
  emailInformation?: EmailInformationType[];
  // For SEND_EMAIL action
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