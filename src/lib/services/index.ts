import { GMAIL_ACTIONS } from '../gmail/actions';
import { GDRIVE_ACTIONS } from '../gdrive/actions';
import { SHEETS_ACTIONS } from '../sheets/actions';

export interface Port {
  id: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
}

export interface ConfigField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: any[];
  dependencies?: string[];
  visibilityCondition?: (config: any) => boolean;
  pickerOptions?: {
    serviceType?: string;
    title?: string;
    viewTypes?: string[];
    selectFolders?: boolean;
    mimeTypes?: string[];
  };
  onValueSelect?: (value: any, config: any, context: any) => Promise<any>;
}

export interface ActionConfig {
  id: string;
  name: string;
  description: string;
  configFields: ConfigField[];
  ports: {
    inputs: Port[];
    outputs: Port[];
  };
  getDynamicPorts?: (config: any) => {
    inputs: Port[];
    outputs: Port[];
  };
}

export interface ServiceConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  actions: Record<string, ActionConfig>;
  authScopes: string[];
}

export const SERVICES: Record<string, ServiceConfig> = {
  gmail: {
    id: 'gmail',
    name: 'Gmail',
    description: 'Email operations',
    icon: '/icons/gmail.svg',
    actions: GMAIL_ACTIONS,
    authScopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify'
    ]
  },
  gdrive: {
    id: 'gdrive',
    name: 'Google Drive',
    description: 'Manage files and folders',
    icon: '/icons/gdrive.svg',
    actions: GDRIVE_ACTIONS,
    authScopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata'
    ]
  },
  sheets: {
    id: 'sheets',
    name: 'Google Sheets',
    description: 'Spreadsheet operations',
    icon: '/icons/gsheets.svg',
    actions: SHEETS_ACTIONS,
    authScopes: [
      'https://www.googleapis.com/auth/spreadsheets',     // For write/update access
      'https://www.googleapis.com/auth/spreadsheets.readonly'  // For read access
    ]
  }
};