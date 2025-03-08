import { ActionConfig } from '../services';

export const SLACK_ACTIONS: Record<string, ActionConfig> = {
  SEND_MESSAGE: {
    id: 'SEND_MESSAGE',
    name: 'Send Message',
    description: 'Send a message to a Slack channel or thread',
    configFields: [
// In src/lib/slack/actions.ts
{
  name: 'channelId',
  label: 'Channel',
  type: 'select',
  required: true,
  options: [], // Will be populated dynamically
  placeholder: 'Select a channel',
loadOptions: async (context: any) => {
  console.log('Loading Slack channels...');
  if (!context.authState?.tokens?.access_token) {
    console.error('No access token available');
    return [];
  }
  
  try {
    const response = await fetch('/api/slack/channels', {
      headers: {
        'Authorization': `Bearer ${context.authState.tokens.access_token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error loading channels:', errorData);
      return [];
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error loading channels:', error);
    return [];
  }
}
},
      {
        name: 'message',
        label: 'Message',
        type: 'text',
        required: true,
        placeholder: 'Type your message here...'
      },
      {
        name: 'attachmentSource',
        label: 'Attachment Source',
        type: 'select',
        required: false,
        options: [
          { value: 'local', label: 'Upload from Computer' },
          { value: 'port', label: 'Receive from Connection' }
        ],
        placeholder: 'Select attachment source'
      },
      {
        name: 'localAttachments',
        label: 'Attachments',
        type: 'file',
        required: false,
        dependencies: ['attachmentSource'],
        visibilityCondition: (config) => config.attachmentSource === 'local'
      }
    ],
    ports: {
      inputs: [
        { id: 'input_message', label: 'Message', type: 'string', isActive: true, isListType: false },
        { id: 'input_threadId', label: 'Thread ID', type: 'string', isActive: false, isListType: false },
        { id: 'input_attachments', label: 'Attachments', type: 'string', isActive: false, isListType: true }
      ],
      outputs: [
        { id: 'output_threadId', label: 'Thread ID', type: 'string', isActive: true, isListType: false }
      ]
    },
    getDynamicPorts: (config: any) => {
      // Enable the attachment input port only when using port as source
      return {
        inputs: [
          { id: 'input_message', label: 'Message', type: 'string', isActive: true, isListType: false },
          { id: 'input_threadId', label: 'Thread ID', type: 'string', isActive: true, isListType: false },
          { id: 'input_attachments', label: 'Attachments', type: 'string', isActive: config.attachmentSource === 'port', isListType: true }
        ],
        outputs: [
          { id: 'output_threadId', label: 'Thread ID', type: 'string', isActive: true, isListType: false }
        ]
      };
    }
  }
};