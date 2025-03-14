// src/lib/sheets/actions.ts
import { ActionConfig } from '../services';
import { SheetReader } from './executor';

export const SHEETS_ACTIONS: Record<string, ActionConfig> = {
  READ_SHEET: {
    id: 'READ_SHEET',
    name: 'Google Sheets Reader',
    description: 'Get data from Google Sheets.\nNote: Your Google Sheet must have headers in the first row',
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
        onValueSelect: async (fileDetails: any, currentConfig: any, context: any) => {
          try {
            const sheetReader = new SheetReader();
            const metadata = await sheetReader.getSheetMetadata(fileDetails.id, context);
            
            // Create static ports for all available columns with list type
            const ports = {
              inputs: [],
              outputs: metadata.columns.map(column => ({
                id: `output_${column}`,
                label: column,
                type: 'string',
                isActive: false,
                isListType: true // All sheet outputs are lists
              }))
            };

            return {
              ...currentConfig,
              spreadsheetId: fileDetails.id,
              fileDetails,
              availableColumns: metadata.columns,
              selectedColumns: [],
              ports
            };
          } catch (error) {
            console.error('Error handling sheet selection:', error);
            throw error;
          }
        }
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
      outputs: [] // Will be populated with all available columns
    },
    getDynamicPorts: (config: any) => {
      if (!config.ports) return { inputs: [], outputs: [] };

      // Update active state based on selected columns
      return {
        inputs: [],
        outputs: config.ports.outputs.map(port => ({
          ...port,
          isActive: config.selectedColumns?.includes(port.label) || false,
          isListType: true // Always lists for sheet reader
        }))
      };
    }
  },
  WRITE_SHEET: {
    id: 'WRITE_SHEET',
    name: 'Google Sheets Writer',
    description: 'Add data to Google Sheets.\nNote: Your Google Sheet must have headers in the first row',
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
        onValueSelect: async (fileDetails: any, currentConfig: any, context: any) => {
          try {
            const sheetReader = new SheetReader();
            const metadata = await sheetReader.getSheetMetadata(fileDetails.id, context);
            
            // Create static ports for all available columns
            const ports = {
              inputs: metadata.columns.map(column => ({
                id: `input_${column}`,
                label: column,
                type: 'string',
                isActive: false,
                isListType: false // Input ports are not lists
              })),
              outputs: [
                { id: 'sheetLink', label: 'Sheet Link', type: 'string', isActive: true, isListType: false }
              ]
            };

            return {
              ...currentConfig,
              spreadsheetId: fileDetails.id,
              fileDetails,
              availableColumns: metadata.columns,
              selectedColumns: [],
              ports
            };
          } catch (error) {
            console.error('Error handling sheet selection:', error);
            throw error;
          }
        }
      },
      {
        name: 'selectedColumns',
        label: 'Select Columns',
        type: 'multiselect',
        required: false,
        options: [], // Will be populated dynamically
        placeholder: 'Select columns to write'
      },
      {
        name: 'sheetName',
        label: 'Sheet Name (Optional)',
        type: 'string',
        required: false,
        placeholder: 'Leave blank for first sheet'
      }
    ],
    ports: {
      inputs: [],
      outputs: [
        { id: 'sheetLink', label: 'Sheet Link', type: 'string', isListType: false }
      ]
    },
    getDynamicPorts: (config: any) => {
      if (!config.ports) return { 
        inputs: [],
        outputs: [
          { id: 'sheetLink', label: 'Sheet Link', type: 'string', isActive: true, isListType: false }
        ]
      };

      // Update active state based on selected columns
      return {
        inputs: config.ports.inputs.map(port => ({
          ...port,
          isActive: config.selectedColumns?.includes(port.label) || false,
          isListType: false
        })),
        outputs: config.ports.outputs
      };
    }
  },
  UPDATE_SHEET: {
    id: 'UPDATE_SHEET',
    name: 'Google Sheets Updater',
    description: 'Edit Google Sheets row.\nNote: Your Google Sheet must have headers in the first row',
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
        onValueSelect: async (fileDetails: any, currentConfig: any, context: any) => {
          try {
            const sheetReader = new SheetReader();
            const metadata = await sheetReader.getSheetMetadata(fileDetails.id, context);
            
            // Create static ports for all available columns
            const ports = {
              inputs: [
                // Always add search value as an input port
                { id: `input_search_value`, label: 'Search Value', type: 'string', isActive: true, isListType: false },
                ...metadata.columns.map(column => ({
                  id: `input_${column}`,
                  label: column,
                  type: 'string',
                  isActive: false,
                  isListType: false
                }))
              ],
              outputs: [
                { id: 'sheetLink', label: 'Sheet Link', type: 'string', isActive: true, isListType: false }
              ]
            };

            return {
              ...currentConfig,
              spreadsheetId: fileDetails.id,
              fileDetails,
              availableColumns: metadata.columns,
              selectedColumns: [],
              ports
            };
          } catch (error) {
            console.error('Error handling sheet selection:', error);
            throw error;
          }
        }
      },
      {
        name: 'selectedColumns',
        label: 'Select Columns',
        type: 'multiselect',
        required: true,
        options: [], // Will be populated dynamically
        placeholder: 'Select columns to update'
      },
      {
        name: 'searchColumn',
        label: 'Search Column',
        type: 'select',
        required: true,
        options: [], // Will be populated from availableColumns
        placeholder: 'Select column to search'
      },
      {
        name: 'searchValue',
        label: 'Search Value',
        type: 'string',
        required: true,
        placeholder: 'Value to search for'
      },
      {
        name: 'updaterMode',
        label: 'Updater Mode',
        type: 'select',
        required: true,
        options: [
          { value: 'single', label: 'Update A Single Row' },
          { value: 'multiple', label: 'Update Multiple Rows' }
        ],
        placeholder: 'Select update mode'
      }
    ],
    ports: {
      inputs: [
        { id: 'input_search_value', label: 'Search Value', type: 'string', isActive: true, isListType: false }
      ],
      outputs: [
        { id: 'sheetLink', label: 'Sheet Link', type: 'string', isListType: false }
      ]
    },
    getDynamicPorts: (config: any) => {
      if (!config.ports) return { 
        inputs: [
          { id: 'input_search_value', label: 'Search Value', type: 'string', isActive: true, isListType: false }
        ],
        outputs: [
          { id: 'sheetLink', label: 'Sheet Link', type: 'string', isActive: true, isListType: false }
        ]
      };

      // Make sure Search Value is always active
      const allInputs = config.ports.inputs.map(port => {
        if (port.id === 'input_search_value') {
          return { ...port, isActive: true };
        }
        return {
          ...port,
          isActive: config.selectedColumns?.includes(port.label) || false
        };
      });

      return {
        inputs: allInputs,
        outputs: config.ports.outputs
      };
    }
  }
} as const;