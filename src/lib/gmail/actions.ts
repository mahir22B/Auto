import { GmailAction } from './types';

export const GMAIL_ACTIONS = {
  READ_UNREAD: {
    id: 'READ_UNREAD',
    name: 'Read Unread Emails',
    description: 'Fetch unread emails from Gmail',
    configFields: [
      {
        name: 'maxResults',
        label: 'Maximum Results',
        type: 'number',
        required: true
      },
      {
        name: 'labelId',
        label: 'Label ID',
        type: 'string',
        required: false
      }
    ]
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
        required: true
      },
      {
        name: 'subject',
        label: 'Subject',
        type: 'string',
        required: true
      },
      {
        name: 'body',
        label: 'Body',
        type: 'text',
        required: true
      }
    ]
  }
} as const;