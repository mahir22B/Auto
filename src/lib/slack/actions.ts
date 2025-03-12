// src/lib/slack/actions.ts
import { ActionConfig } from '../services';

export const SLACK_ACTIONS: Record<string, ActionConfig> = {
  SEND_MESSAGE: {
    id: 'SEND_MESSAGE',
    name: 'Send Message',
    description: 'Send a message to a Slack channel or user',
    configFields: [
      {
        name: 'targetType',
        label: 'Send To',
        type: 'select',
        required: true,
        options: [
          { value: 'channel', label: 'Channel' },
          { value: 'user', label: 'User' }
        ],
        placeholder: 'Select target type'
      },
      {
        name: 'channelId',
        label: 'Channel',
        type: 'select',
        required: true,
        options: [], // Will be populated dynamically
        placeholder: 'Select a channel',
        refreshable: true,
        dependencies: ['targetType'],
        visibilityCondition: (config) => config.targetType === 'channel',
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
        name: 'userId',
        label: 'User',
        type: 'select',
        required: true,
        options: [], // Will be populated dynamically
        placeholder: 'Select a user',
        refreshable: true,
        dependencies: ['targetType'],
        visibilityCondition: (config) => config.targetType === 'user',
        loadOptions: async (context: any) => {
          console.log('Loading Slack users...');
          if (!context.authState?.tokens?.access_token) {
            console.error('No access token available');
            return [];
          }
          
          try {
            const response = await fetch('/api/slack/users', {
              headers: {
                'Authorization': `Bearer ${context.authState.tokens.access_token}`
              }
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              console.error('Error loading users:', errorData);
              return [];
            }
            
            return await response.json();
          } catch (error) {
            console.error('Error loading users:', error);
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
      }
    ],
    ports: {
      inputs: [
        { id: 'input_message', label: 'Message', type: 'string', isActive: true, isListType: false },
        { id: 'input_threadId', label: 'Thread ID', type: 'string', isActive: true, isListType: false },
        { id: 'input_attachments', label: 'Attachments', type: 'string', isActive: false, isListType: true }
      ],
      outputs: [
        { id: 'output_threadId', label: 'Posted Thread ID', type: 'string', isActive: true, isListType: false }
      ]
    },
    getDynamicPorts: (config: any) => {
      // Enable the attachment input port only when using port as source
      return {
        inputs: [
          { id: 'input_message', label: 'Message', type: 'string', isActive: true, isListType: false },
          { id: 'input_threadId', label: 'Thread ID', type: 'string', isActive: true, isListType: false },
          { id: 'input_attachments', label: 'Attachments', type: 'string', isActive: false, isListType: true }
        ],
        outputs: [
          { id: 'output_threadId', label: 'Posted Thread ID', type: 'string', isActive: true, isListType: false }
        ]
      };
    }
  },
  
  READ_MESSAGES: {
    id: 'READ_MESSAGES',
    name: 'Read Messages',
    description: 'Fetch messages from a Slack channel with filtering options',
    configFields: [
      {
        name: 'channelId',
        label: 'Channel',
        type: 'select',
        required: true,
        options: [], // Will be populated dynamically
        placeholder: 'Select a channel',
        refreshable: true,
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
        name: 'retrievalMethod',
        label: 'Retrieval Method',
        type: 'select',
        required: true,
        options: [
          { value: 'count', label: 'By MessageCount (Recent Messages)' },
          { value: 'dateRange', label: 'By Date Range' }
        ],
        placeholder: 'Select retrieval method',
        // Default to 'count'
      },
      {
        name: 'messageCount',
        label: 'Message Count',
        type: 'number',
        required: true,
        placeholder: 'Number of messages to retrieve',
        dependencies: ['retrievalMethod'],
        visibilityCondition: (config) => !config.retrievalMethod || config.retrievalMethod === 'count'
      },
      {
        name: 'startDate',
        label: 'Start Date',
        type: 'date', 
        required: true,
        placeholder: 'YYYY-MM-DD',
        dependencies: ['retrievalMethod'],
        visibilityCondition: (config) => config.retrievalMethod === 'dateRange'
      },
      {
        name: 'endDate',
        label: 'End Date',
        type: 'date',
        required: true,
        placeholder: 'YYYY-MM-DD',
        dependencies: ['retrievalMethod'],
        visibilityCondition: (config) => config.retrievalMethod === 'dateRange'
      },
      {
        name: 'messageInformation',
        label: 'Message Information',
        type: 'multiselect',
        required: true,
        options: [
          'Messages',
          'Attachment Names',
          'Thread IDs',
          'Sender Names',
          'Thread Links',
          'Channel Names',
          'Channel IDs'
        ],
        placeholder: 'Select information to retrieve'
      }
    ],
    ports: {
      inputs: [], // No input ports for this node
      outputs: [
        { id: 'output_messages', label: 'Messages', type: 'array', isActive: false, isListType: true },
        { id: 'output_attachment_names', label: 'Attachment Names', type: 'array', isActive: false, isListType: true },
        { id: 'output_thread_ids', label: 'Thread IDs', type: 'array', isActive: false, isListType: true },
        { id: 'output_sender_names', label: 'Sender Names', type: 'array', isActive: false, isListType: true },
        { id: 'output_thread_links', label: 'Thread Links', type: 'array', isActive: false, isListType: true },
        { id: 'output_channel_names', label: 'Channel Names', type: 'array', isActive: false, isListType: true },
        { id: 'output_channel_ids', label: 'Channel IDs', type: 'array', isActive: false, isListType: true }
      ]
    },
    getDynamicPorts: (config: any) => {
      if (!config.messageInformation) {
        return {
          inputs: [],
          outputs: []
        };
      }
      
      // Create the output ports with appropriate isActive based on selected information
      return {
        inputs: [],
        outputs: [
          { 
            id: 'output_messages', 
            label: 'Messages', 
            type: 'array', 
            isActive: config.messageInformation.includes('Messages'),
            isListType: true 
          },
          { 
            id: 'output_attachment_names', 
            label: 'Attachment Names', 
            type: 'array', 
            isActive: config.messageInformation.includes('Attachment Names'),
            isListType: true 
          },
          { 
            id: 'output_thread_ids', 
            label: 'Thread IDs', 
            type: 'array', 
            isActive: config.messageInformation.includes('Thread IDs'),
            isListType: true 
          },
          { 
            id: 'output_sender_names', 
            label: 'Sender Names', 
            type: 'array', 
            isActive: config.messageInformation.includes('Sender Names'),
            isListType: true 
          },
          { 
            id: 'output_thread_links', 
            label: 'Thread Links', 
            type: 'array', 
            isActive: config.messageInformation.includes('Thread Links'),
            isListType: true 
          },
          { 
            id: 'output_channel_names', 
            label: 'Channel Names', 
            type: 'array', 
            isActive: config.messageInformation.includes('Channel Names'),
            isListType: true 
          },
          { 
            id: 'output_channel_ids', 
            label: 'Channel IDs', 
            type: 'array', 
            isActive: config.messageInformation.includes('Channel IDs'),
            isListType: true 
          }
        ]
      };
    }
  },

  CANVAS_WRITER: {
    id: 'CANVAS_WRITER',
    name: 'Slack Canvas Writer',
    description: 'Create a Slack canvas and send it to a specified channel.',
    configFields: [
      {
        name: 'channelId',
        label: 'Channel',
        type: 'select',
        required: true,
        options: [], // Will be populated dynamically
        placeholder: 'Select a channel',
        refreshable: true,
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
        name: 'canvasTitle',
        label: 'Canvas Title',
        type: 'string',
        required: true,
        placeholder: 'Enter canvas title'
      },
      {
        name: 'canvasContent',
        label: 'Canvas Content',
        type: 'text',
        required: true,
        placeholder: '# Heading\nContent in markdown format'
      },
      {
        name: 'accessLevel',
        label: 'Canvas Access Level',
        type: 'select',
        required: true,
        options: [
          { value: 'read', label: 'Read' },
          { value: 'write', label: 'Write' }
        ],
        placeholder: 'Select access level'
      }
    ],
    ports: {
      inputs: [
        { id: 'input_canvasTitle', label: 'Canvas Title', type: 'string', isActive: true, isListType: false },
        { id: 'input_canvasContent', label: 'Canvas Content', type: 'string', isActive: true, isListType: false }
      ],
      outputs: [
        { id: 'output_canvasLink', label: 'Canvas Link', type: 'string', isActive: true, isListType: false }
      ]
    }
  }
};