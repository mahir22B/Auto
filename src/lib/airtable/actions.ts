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
            
            return bases.map((base: any) => ({
              value: base.id,
              label: base.name
            }));
          } catch (error) {
            console.error('Error loading Airtable bases:', error);
            return [];
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
        visibilityCondition: (config) => !!config.baseId,
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
            
            return tables.map((table: any) => ({
              value: table.id,
              label: table.name
            }));
          } catch (error) {
            console.error('Error loading Airtable tables:', error);
            return [];
          }
        }
      },
      {
        name: 'viewId',
        label: 'View',
        type: 'select',
        required: false,
        options: [], // Will be populated dynamically
        placeholder: 'Select a view (optional)',
        refreshable: true,
        dependencies: ['baseId', 'tableId'],
        visibilityCondition: (config) => !!config.baseId && !!config.tableId,
        loadOptions: async (context: any) => {
          console.log('Loading Airtable views...');
          if (!context.authState?.tokens?.access_token || !context.config.baseId || !context.config.tableId) {
            console.error('Missing required configuration');
            return [];
          }
          
          try {
            const airtableExecutor = new AirtableExecutor();
            const views = await airtableExecutor.getAirtableViews(
              context.authState.tokens,
              context.config.baseId,
              context.config.tableId
            );
            
            return views.map((view: any) => ({
              value: view.id,
              label: view.name
            }));
          } catch (error) {
            console.error('Error loading Airtable views:', error);
            return [];
          }
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
        visibilityCondition: (config) => !!config.baseId && !!config.tableId,
        loadOptions: async (context: any) => {
          console.log('Loading Airtable fields...');
          if (!context.authState?.tokens?.access_token || !context.config.baseId || !context.config.tableId) {
            console.error('Missing required configuration');
            return [];
          }
          
          try {
            const airtableExecutor = new AirtableExecutor();
            const fields = await airtableExecutor.getAirtableFields(
              context.authState.tokens,
              context.config.baseId,
              context.config.tableId
            );
            
            return fields.map((field: any) => ({
              value: field.id,
              label: field.name
            }));
          } catch (error) {
            console.error('Error loading Airtable fields:', error);
            return [];
          }
        }
      },
      {
        name: 'maxRecords',
        label: 'Maximum Records',
        type: 'number',
        required: false,
        placeholder: 'Number of records to retrieve (optional)'
      },
      {
        name: 'filterFormula',
        label: 'Filter Formula',
        type: 'text',
        required: false,
        placeholder: 'Airtable formula to filter records (optional)'
      }
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
      
      // Create output ports for each selected field
      const outputs = config.selectedFields.map((fieldId: string) => {
        // Try to find the field name in the options if available
        const fieldName = fieldId;
        
        return {
          id: `output_${fieldId}`,
          label: fieldName, 
          type: 'array',
          isActive: true,
          isListType: true
        };
      });
      
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