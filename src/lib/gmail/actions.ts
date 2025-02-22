// src/lib/gmail/actions.ts
import { GmailAction } from './types';
import { ActionConfig } from '../services';

const EMAIL_INFORMATION_OPTIONS = [
  'email_bodies',
  'attached_file_names',
  'message_ids',
  'thread_ids',
  'sender_addresses',
  'recipient_addresses',
  'subjects',
  'dates',
  'sender_display_names'
];

const LABEL_OPTIONS = [
  { value: 'INBOX', label: 'Inbox' },
  { value: 'STARRED', label: 'Starred' },
  { value: 'DRAFT', label: 'Drafts' }
];

export const GMAIL_ACTIONS: Record<string, ActionConfig> = {
  READ_UNREAD: {
    id: 'READ_UNREAD',
    name: 'Read Unread Emails',
    description: 'Fetch unread emails from Gmail',
    configFields: [
      {
        name: 'maxResults',
        label: 'Maximum Results',
        type: 'number',
        required: true,
        placeholder: 'Enter number of emails to fetch'
      },
      {
        name: 'label',
        label: 'Label',
        type: 'select',
        required: true,
        options: LABEL_OPTIONS,
        placeholder: 'Select email label'
      },
      {
        name: 'emailInformation',
        label: 'Email Information',
        type: 'multiselect',
        required: true,
        options: EMAIL_INFORMATION_OPTIONS,
        placeholder: 'Select information to retrieve'
      }
    ],
    ports: {
      inputs: [
        { id: 'maxResults', label: 'Max Results', type: 'number' },
        { id: 'label', label: 'Label', type: 'string' }
      ],
      outputs: [
        { id: 'emails', label: 'Emails', type: 'array' },
        { id: 'count', label: 'Count', type: 'number' }
      ]
    }
  },
  SEND_EMAIL: {
    id: 'SEND_EMAIL',
    name: 'Send Email',
    description: 'Send a new email',
    configFields: [
      {
        name: 'to',
        label: 'To',
        type: 'string',
        required: true,
        placeholder: 'Enter recipient email address'
      },
      {
        name: 'subject',
        label: 'Subject',
        type: 'string',
        required: true,
        placeholder: 'Enter email subject line'
      },
      {
        name: 'body',
        label: 'Body',
        type: 'text',
        required: true,
        placeholder: 'Type your email message here...'
      }
    ],
    ports: {
      inputs: [
        { id: 'to', label: 'To', type: 'string' },
        { id: 'subject', label: 'Subject', type: 'string' },
        { id: 'body', label: 'Body', type: 'string' }
      ],
      outputs: [
        { id: 'status', label: 'Status', type: 'boolean' },
        { id: 'messageId', label: 'Message ID', type: 'string' }
      ]
    }
  }
} as const;