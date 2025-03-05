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
      inputs: [],
      outputs: [
        { id: 'output_email_bodies', label: 'Email Bodies', type: 'array', isActive: false, isListType: false },
        { id: 'output_attached_file_names', label: 'Attachments', type: 'array', isActive: false, isListType: false },
        { id: 'output_message_ids', label: 'Message IDs', type: 'array', isActive: false, isListType: false },
        { id: 'output_thread_ids', label: 'Thread IDs', type: 'array', isActive: false, isListType: false },
        { id: 'output_sender_addresses', label: 'Sender Addresses', type: 'array', isActive: false, isListType: false },
        { id: 'output_recipient_addresses', label: 'Recipient Addresses', type: 'array', isActive: false, isListType: false },
        { id: 'output_subjects', label: 'Subjects', type: 'array', isActive: false, isListType: false },
        { id: 'output_dates', label: 'Dates', type: 'array', isActive: false, isListType: false },
        { id: 'output_sender_display_names', label: 'Sender Names', type: 'array', isActive: false, isListType: false }
      ]
    },
    getDynamicPorts: (config: any) => {
      if (!config.emailInformation) return {
        inputs: [],
        outputs: []
      };
      
      // Check if maxResults is greater than 1 to determine if outputs should be lists
      const maxResults = parseInt(config.maxResults || "1");
      const isListOutput = maxResults > 1;
      
      // Create the output ports with appropriate isListType based on maxResults
      return {
        inputs: [],
        outputs: [
          { id: 'output_email_bodies', label: 'Email Bodies', type: 'array', 
            isActive: config.emailInformation.includes('email_bodies'),
            isListType: isListOutput },
          { id: 'output_attached_file_names', label: 'Attachments', type: 'array', 
            isActive: config.emailInformation.includes('attached_file_names'),
            isListType: isListOutput },
          { id: 'output_message_ids', label: 'Message IDs', type: 'array', 
            isActive: config.emailInformation.includes('message_ids'),
            isListType: isListOutput },
          { id: 'output_thread_ids', label: 'Thread IDs', type: 'array', 
            isActive: config.emailInformation.includes('thread_ids'),
            isListType: isListOutput },
          { id: 'output_sender_addresses', label: 'Sender Addresses', type: 'array', 
            isActive: config.emailInformation.includes('sender_addresses'),
            isListType: isListOutput },
          { id: 'output_recipient_addresses', label: 'Recipient Addresses', type: 'array', 
            isActive: config.emailInformation.includes('recipient_addresses'),
            isListType: isListOutput },
          { id: 'output_subjects', label: 'Subjects', type: 'array', 
            isActive: config.emailInformation.includes('subjects'),
            isListType: isListOutput },
          { id: 'output_dates', label: 'Dates', type: 'array', 
            isActive: config.emailInformation.includes('dates'),
            isListType: isListOutput },
          { id: 'output_sender_display_names', label: 'Sender Names', type: 'array', 
            isActive: config.emailInformation.includes('sender_display_names'),
            isListType: isListOutput }
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
        { id: 'input_to', label: 'To', type: 'string', isActive: true, isListType: false },
        { id: 'input_subject', label: 'Subject', type: 'string', isActive: true, isListType: false },
        { id: 'input_body', label: 'Body', type: 'string', isActive: true, isListType: false }
      ],
      outputs: [
        { id: 'output_status', label: 'Email Status', type: 'boolean', isActive: true, isListType: false }
      ]
    }
  }
} as const;