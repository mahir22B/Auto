import { ActionConfig } from '../services';
import { SheetReader } from './executor';

// Handler for sheet selection
async function handleSheetSelection(fileDetails: any, currentConfig: any, context: any) {
  try {
    // Initialize sheet reader and get metadata
    const sheetReader = new SheetReader();
    const metadata = await sheetReader.getSheetMetadata(fileDetails.id, context);

    // Return updated configuration
    return {
      ...currentConfig,
      spreadsheetId: fileDetails.id,
      fileDetails,
      availableColumns: metadata.columns,
      selectedColumns: []
    };
  } catch (error) {
    console.error('Error handling sheet selection:', error);
    throw error;
  }
}

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
        },
        onValueSelect: handleSheetSelection
      },
      {
        name: 'selectedColumns',
        label: 'Select Columns',
        type: 'multiselect',
        required: false,
        options: [], // Will be populated dynamically
        placeholder: 'Select columns to read'
      }
    ],
    ports: {
      inputs: [],
      outputs: [] // Will be populated dynamically
    },
    getDynamicPorts: (config: any) => {
      if (!config.selectedColumns?.length) return { inputs: [], outputs: [] };

      // Ensure consistent port generation
      return {
        inputs: [],
        outputs: config.selectedColumns.map((column: string, index: number) => ({
          id: `${column.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          label: column,
          type: 'string',
          index: index // Add index for stable ordering
        }))
      };
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