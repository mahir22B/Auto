import { ActionConfig } from '../services';

export const SHEETS_ACTIONS: Record<string, ActionConfig> = {
  READ_SHEET: {
    id: 'READ_SHEET',
    name: 'Google Sheets Reader',
    description: 'Get data from Google Sheets',
    configFields: [
      {
        name: 'spreadsheetId',
        label: 'Select Spreadsheet',
        type: 'google-picker',
        required: true,
        pickerOptions: {
          serviceType: 'sheets',
          title: 'Select a spreadsheet',
          mimeTypes: ['application/vnd.google-apps.spreadsheet']
        }
      },
      // {
      //   name: 'range',
      //   label: 'Range (e.g., Sheet1!A1:D10)',
      //   type: 'string',
      //   required: true,
      // }
    ],
    ports: {
      inputs: [
        // { id: 'spreadsheetId', label: 'Spreadsheet ID', type: 'string' },
        // { id: 'range', label: 'Range', type: 'string' }
      ],
      outputs: [
        { id: 'data', label: 'Sheet Data', type: 'array' },
        { id: 'rowCount', label: 'Row Count', type: 'number' }
      ]
    }
  },
  WRITE_SHEET: {
    id: 'WRITE_SHEET',
    name: 'Google Sheets Writer',
    description: 'Add data to Google Sheets',
    configFields: [
      {
        name: 'spreadsheetId',
        label: 'Select Spreadsheet',
        type: 'google-picker',
        required: true,
        pickerOptions: {
          serviceType: 'sheets',
          title: 'Select a spreadsheet',
          mimeTypes: ['application/vnd.google-apps.spreadsheet']
        }
      },
      {
        name: 'range',
        label: 'Range (e.g., Sheet1!A:D)',
        type: 'string',
        required: true,
      },
      {
        name: 'values',
        label: 'Values (JSON array)',
        type: 'text',
        required: true,
      }
    ],
    ports: {
      inputs: [
        { id: 'spreadsheetId', label: 'Spreadsheet ID', type: 'string' },
        { id: 'range', label: 'Range', type: 'string' },
        { id: 'values', label: 'Values', type: 'array' }
      ],
      outputs: [
        { id: 'updatedRows', label: 'Updated Rows', type: 'number' },
        { id: 'status', label: 'Status', type: 'boolean' }
      ]
    }
  },
  UPDATE_SHEET: {
    id: 'UPDATE_SHEET',
    name: 'Google Sheets Updater',
    description: 'Edit Google Sheets row',
    configFields: [
      {
        name: 'spreadsheetId',
        label: 'Select Spreadsheet',
        type: 'google-picker',
        required: true,
        pickerOptions: {
          serviceType: 'sheets',
          title: 'Select a spreadsheet',
          mimeTypes: ['application/vnd.google-apps.spreadsheet']
        }
      },
      {
        name: 'range',
        label: 'Range to Update',
        type: 'string',
        required: true,
      },
      {
        name: 'values',
        label: 'Values (JSON array)',
        type: 'text',
        required: true,
      }
    ],
    ports: {
      inputs: [
        { id: 'spreadsheetId', label: 'Spreadsheet ID', type: 'string' },
        { id: 'range', label: 'Range', type: 'string' },
        { id: 'values', label: 'Values', type: 'array' }
      ],
      outputs: [
        { id: 'updatedCells', label: 'Updated Cells', type: 'number' },
        { id: 'status', label: 'Status', type: 'boolean' }
      ]
    }
  }
} as const;