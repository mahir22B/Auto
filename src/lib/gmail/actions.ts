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
        // { id: 'maxResults', label: 'Max Results', type: 'number', isActive: true },
        // { id: 'label', label: 'Label', type: 'string', isActive: true }
      ],
      outputs: [
        // All outputs start inactive and will be activated based on selection
        { id: 'output_email_bodies', label: 'Email Bodies', type: 'array', isActive: false },
        { id: 'output_attached_file_names', label: 'Attachments', type: 'array', isActive: false },
        { id: 'output_message_ids', label: 'Message IDs', type: 'array', isActive: false },
        { id: 'output_thread_ids', label: 'Thread IDs', type: 'array', isActive: false },
        { id: 'output_sender_addresses', label: 'Sender Addresses', type: 'array', isActive: false },
        { id: 'output_recipient_addresses', label: 'Recipient Addresses', type: 'array', isActive: false },
        { id: 'output_subjects', label: 'Subjects', type: 'array', isActive: false },
        { id: 'output_dates', label: 'Dates', type: 'array', isActive: false },
        { id: 'output_sender_display_names', label: 'Sender Names', type: 'array', isActive: false }
      ]
    },
    getDynamicPorts: (config: any) => {
      if (!config.emailInformation) return {
        inputs: [
          // { id: 'maxResults', label: 'Max Results', type: 'number', isActive: true },
          // { id: 'label', label: 'Label', type: 'string', isActive: true }
        ],
        outputs: [] // No active outputs until user selects something
      };
      
      // Update the active state of outputs based on emailInformation selections
      return {
        inputs: [
          // { id: 'maxResults', label: 'Max Results', type: 'number', isActive: true },
          // { id: 'label', label: 'Label', type: 'string', isActive: true }
        ],
        outputs: [
          // Each output corresponds to an email information type
          { id: 'output_email_bodies', label: 'Email Bodies', type: 'array', 
            isActive: config.emailInformation.includes('email_bodies') },
          { id: 'output_attached_file_names', label: 'Attachments', type: 'array', 
            isActive: config.emailInformation.includes('attached_file_names') },
          { id: 'output_message_ids', label: 'Message IDs', type: 'array', 
            isActive: config.emailInformation.includes('message_ids') },
          { id: 'output_thread_ids', label: 'Thread IDs', type: 'array', 
            isActive: config.emailInformation.includes('thread_ids') },
          { id: 'output_sender_addresses', label: 'Sender Addresses', type: 'array', 
            isActive: config.emailInformation.includes('sender_addresses') },
          { id: 'output_recipient_addresses', label: 'Recipient Addresses', type: 'array', 
            isActive: config.emailInformation.includes('recipient_addresses') },
          { id: 'output_subjects', label: 'Subjects', type: 'array', 
            isActive: config.emailInformation.includes('subjects') },
          { id: 'output_dates', label: 'Dates', type: 'array', 
            isActive: config.emailInformation.includes('dates') },
          { id: 'output_sender_display_names', label: 'Sender Names', type: 'array', 
            isActive: config.emailInformation.includes('sender_display_names') }
        ]
      };
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