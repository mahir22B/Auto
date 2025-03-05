// src/lib/gdrive/actions.ts
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
          title: 'Select a file to read',
          selectFolders: false
        }
      }
    ],
    ports: {
      inputs: [],
      outputs: [
        { id: 'output_fileName', label: 'File Name', type: 'string', isActive: true, isListType: false },
        { id: 'output_fileContents', label: 'File Contents', type: 'string', isActive: true, isListType: false }
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
        label: 'Select Folder',
        type: 'google-picker',
        required: true,
        pickerOptions: {
          viewTypes: ['FOLDERS_ONLY'],
          serviceType: 'gdrive',
          title: 'Select a folder to read',
          selectFolders: true
        }
      }
    ],
    ports: {
      inputs: [],
      outputs: [
        { id: 'output_files', label: 'Files', type: 'array', isActive: true, isListType: true }
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
        label: 'Select Destination Folder',
        type: 'google-picker',
        required: true,
        pickerOptions: {
          viewTypes: ['FOLDERS_ONLY'],
          serviceType: 'gdrive',
          title: 'Select destination folder',
          selectFolders: true
        }
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
        { id: 'input_fileName', label: 'File Name', type: 'string', isActive: true, isListType: false },
        { id: 'input_content', label: 'File Content', type: 'string', isActive: true, isListType: false }
      ],
      outputs: [
        { id: 'output_fileUrl', label: 'Drive URL', type: 'string', isActive: true, isListType: false }
      ]
    }
  }
} as const;