import { GDriveAction } from './types';
import { ActionConfig } from '../services';

export const GDRIVE_ACTIONS: Record<string, ActionConfig> = {
  READ_FILE: {
    id: 'READ_FILE',
    name: 'Read File',
    description: 'Read content from a Google Drive file',
    configFields: [
      {
        name: 'fileId',
        label: 'Select File',
        type: 'google-picker',
        required: true,
        pickerOptions: {
          viewTypes: ['ALL_DRIVE_ITEMS'],
          serviceType: 'gdrive',
          title: 'Select a file to read'
        }
      }
    ],
    ports: {
      inputs: [
        // { id: 'fileId', label: 'File ID', type: 'string' }
      ],
      outputs: [
        { id: 'fileName', label: 'File Name', type: 'string' },
        { id: 'content', label: 'File Contents', type: 'string' }
      ]
    }
  },

  READ_FOLDER: {
    id: 'READ_FOLDER',
    name: 'Read Folder',
    description: 'List files in a Google Drive folder',
    configFields: [
      {
        name: 'folderId',
        label: 'Folder ID',
        type: 'string',
        required: true,
      }
    ],
    ports: {
      inputs: [
        { id: 'folderId', label: 'Folder ID', type: 'string' }
      ],
      outputs: [
        { id: 'files', label: 'Files', type: 'array' },
        { id: 'count', label: 'File Count', type: 'number' }
      ]
    }
  },
  WRITE_FILE: {
    id: 'WRITE_FILE',
    name: 'Write File',
    description: 'Create or update a file in Google Drive',
    configFields: [
      {
        name: 'folderId',
        label: 'Folder ID',
        type: 'string',
        required: true,
      },
      {
        name: 'fileName',
        label: 'File Name',
        type: 'string',
        required: true,
      },
      {
        name: 'content',
        label: 'Content',
        type: 'text',
        required: true,
      }
    ],
    ports: {
      inputs: [
        { id: 'folderId', label: 'Folder ID', type: 'string' },
        { id: 'fileName', label: 'File Name', type: 'string' },
        { id: 'content', label: 'Content', type: 'string' }
      ],
      outputs: [
        { id: 'fileId', label: 'File ID', type: 'string' },
        { id: 'status', label: 'Status', type: 'boolean' }
      ]
    }
  }
} as const;