import { GDriveAction } from './types';

export const GDRIVE_ACTIONS = {
  READ_FILE: {
    id: 'READ_FILE',
    name: 'Read File',
    description: 'Read content from a Google Drive file',
    configFields: [
      {
        name: 'fileId',
        label: 'File ID',
        type: 'string',
        required: true,
      }
    ]
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
    ]
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
    ]
  }
} as const;