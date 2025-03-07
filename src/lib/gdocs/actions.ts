import { ActionConfig } from '../services';

export const GDOCS_ACTIONS: Record<string, ActionConfig> = {
    READ_DOCUMENT: {
      id: 'READ_DOCUMENT',
      name: 'Read Google Doc',
      description: 'Read content from a Google Doc',
      configFields: [
        {
          name: 'documentUrl',
          label: 'Google Doc URL',
          type: 'string',
          required: true,
          placeholder: 'Paste Google Doc URL here (e.g., https://docs.google.com/document/d/DOCUMENT_ID/edit)'
        }
      ],
      ports: {
        inputs: [
          { id: 'input_documentUrl', label: 'Document URL', type: 'string', isActive: true, isListType: false }
        ],
        outputs: [
          { id: 'output_title', label: 'Document Title', type: 'string', isActive: true, isListType: false },
          { id: 'output_content', label: 'Document Content', type: 'string', isActive: true, isListType: false }
        ]
      }
    },
    WRITE_DOCUMENT: {
        id: 'WRITE_DOCUMENT',
        name: 'Write Google Doc',
        description: 'Create a new Google Doc with title and content',
        configFields: [
          {
            name: 'title',
            label: 'Document Title',
            type: 'string',
            required: true,
            placeholder: 'Enter document title'
          },
          {
            name: 'content',
            label: 'Document Content',
            type: 'text',
            required: true,
            placeholder: 'Enter document content'
          }
        ],
        ports: {
          inputs: [
            { id: 'input_title', label: 'Title', type: 'string', isActive: true, isListType: false },
            { id: 'input_content', label: 'Content', type: 'string', isActive: true, isListType: false }
          ],
          outputs: [
            { id: 'output_docUrl', label: 'Document URL', type: 'string', isActive: true, isListType: false }
          ]
        }
      }
  } as const;