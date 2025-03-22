// src/lib/airtable/actions.ts
import { ActionConfig } from '../services';
import { AirtableExecutor } from './executor';

export const AIRTABLE_ACTIONS: Record<string, ActionConfig> = {
  READ_RECORDS: {
    id: 'READ_RECORDS',
    name: 'Read Records',
    description: 'Fetch records from an Airtable table',
    configFields: [
      {
        name: 'baseId',
        label: 'Base',
        type: 'select',
        required: true,
        options: [], // Will be populated dynamically
        placeholder: 'Select a base',
        refreshable: true,
        loadOptions: async (context: any) => {
          console.log('Loading Airtable bases...');
          if (!context.authState?.tokens?.access_token) {
            console.error('No access token available');
            return [];
          }
          
          try {
            const airtableExecutor = new AirtableExecutor();
            const bases = await airtableExecutor.getAirtableBases(context.authState.tokens);
            
            if (!bases || bases.length === 0) {
              return [{ value: 'NO_BASES', label: 'No bases found - check your Airtable access' }];
            }
            
            return bases.map((base: any) => ({
              value: base.id,
              label: base.name || base.id
            }));
          } catch (error) {
            console.error('Error loading Airtable bases:', error);
            return [{ value: 'ERROR', label: 'Error loading bases' }];
          }
        }
      },
      {
        name: 'tableId',
        label: 'Table',
        type: 'select',
        required: true,
        options: [], // Will be populated dynamically
        placeholder: 'Select a table',
        refreshable: true,
        dependencies: ['baseId'],
        visibilityCondition: (config) => !!config.baseId && config.baseId !== 'NO_BASES' && config.baseId !== 'ERROR',
        loadOptions: async (context: any) => {
          console.log('Loading Airtable tables...');
          if (!context.authState?.tokens?.access_token || !context.config.baseId) {
            console.error('No access token or base ID available');
            return [];
          }
          
          try {
            const airtableExecutor = new AirtableExecutor();
            const tables = await airtableExecutor.getAirtableTables(
              context.authState.tokens,
              context.config.baseId
            );
            
            if (!tables || tables.length === 0) {
              return [{ value: 'NO_TABLES', label: 'No tables found in this base' }];
            }
            
            // Store table data in the config to access fields later
            // This is a critical change - we're saving the full table data
            if (context.updateNodeConfig) {
              const tablesWithFields = tables.map(table => ({
                id: table.id,
                name: table.name,
                fields: table.fields || []
              }));
              
              context.updateNodeConfig({
                ...context.config,
                tableData: tablesWithFields
              });
              
              console.log('Saved table data with fields for later use:', tablesWithFields);
            }
            
            return tables.map((table: any) => ({
              value: table.id,
              label: table.name || table.id
            }));
          } catch (error) {
            console.error('Error loading Airtable tables:', error);
            return [{ value: 'ERROR', label: 'Error loading tables' }];
          }
        },
        onValueSelect: async (value: string, currentConfig: any) => {
          // When a table is selected, also set its fields in the config
          if (currentConfig.tableData) {
            const selectedTable = currentConfig.tableData.find((table: any) => table.id === value);
            if (selectedTable && selectedTable.fields) {
              console.log('Setting fields from cached table data:', selectedTable.fields);
              return {
                ...currentConfig,
                tableId: value,
                tableFields: selectedTable.fields
              };
            }
          }
          return {
            ...currentConfig,
            tableId: value
          };
        }
      },
      {
        name: 'selectedFields',
        label: 'Columns',
        type: 'multiselect',
        required: true,
        options: [], // Will be populated dynamically
        placeholder: 'Select columns to retrieve',
        dependencies: ['baseId', 'tableId'],
        visibilityCondition: (config) => {
          return !!config.baseId && !!config.tableId && 
                 config.baseId !== 'NO_BASES' && config.baseId !== 'ERROR' &&
                 config.tableId !== 'NO_TABLES' && config.tableId !== 'ERROR';
        },
        loadOptions: async (context: any) => {
          console.log('Loading Airtable fields...');
          if (!context.authState?.tokens?.access_token || !context.config.baseId || !context.config.tableId) {
            console.error('Missing required configuration');
            return [];
          }
          
          try {
            // IMPORTANT: Check if we already have the fields from the previous table request
            if (context.config.tableFields && context.config.tableFields.length > 0) {
              console.log('Using cached fields from table selection:', context.config.tableFields);
              // Use the cached fields instead of making another API call
              const fields = context.config.tableFields;
              
              return fields.map((field: any) => ({
                value: field.name,
                label: field.name
              }));
            }
            
            // Fall back to fetching fields directly if not cached
            console.log('No cached fields found, fetching from API...');
            const airtableExecutor = new AirtableExecutor();
            const fields = await airtableExecutor.getAirtableFields(
              context.authState.tokens,
              context.config.baseId,
              context.config.tableId
            );
            
            // If fields is empty, provide some helpful debug info
            if (!fields || fields.length === 0) {
              console.warn('No fields returned from Airtable');
              
              // Return a message for the user
              return [
                { 
                  value: 'NO_FIELDS_AVAILABLE', 
                  label: 'No fields available. Add some records to your Airtable first.' 
                }
              ];
            }
            
            // Map fields to options
            return fields.map((field: any) => ({
              value: field.name,
              label: field.name
            }));
          } catch (error) {
            console.error('Error loading Airtable fields:', error);
            
            // Return a message explaining the error
            return [
              { 
                value: 'ERROR_LOADING_FIELDS', 
                label: 'Error loading fields. Check console for details.' 
              }
            ];
          }
        }
      },
      // {
      //   name: 'maxRecords',
      //   label: 'Maximum Records',
      //   type: 'number',
      //   required: false,
      //   placeholder: 'Number of records to retrieve (default: 100)'
      // },
      // {
      //   name: 'filterFormula',
      //   label: 'Filter Formula',
      //   type: 'text',
      //   required: false,
      //   placeholder: 'Airtable formula to filter records (optional)'
      // }
    ],
    ports: {
      inputs: [],
      outputs: [
        // Will be populated dynamically based on selected fields
      ]
    },
    getDynamicPorts: (config: any) => {
      if (!config.selectedFields || !Array.isArray(config.selectedFields) || config.selectedFields.length === 0) {
        return {
          inputs: [],
          outputs: []
        };
      }
      
      // Filter out error placeholder values
      const validFields = config.selectedFields.filter((field: string) => 
        field !== 'NO_FIELDS_AVAILABLE' && field !== 'ERROR_LOADING_FIELDS'
      );
      
      if (validFields.length === 0) {
        return {
          inputs: [],
          outputs: []
        };
      }
      
      // Create output ports for each selected field
      const outputs = validFields.map((field: string) => ({
        id: `output_${field}`,
        label: field,
        type: 'array',
        isActive: true,
        isListType: true
      }));
      
      // Add a records output port to get the full records array
      outputs.push({
        id: 'output_records',
        label: 'Records',
        type: 'array',
        isActive: true,
        isListType: true
      });
      
      return {
        inputs: [],
        outputs
      };
    }
  }
} as const;