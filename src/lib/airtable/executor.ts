// src/lib/airtable/executor.ts
import { ExecutorContext, ExecutionResult } from "../executors/types";
import { AbstractExecutor } from "../executors/AbstractExecutor";
import { 
  AirtableConfig, 
  AirtableBase, 
  AirtableTable, 
  AirtableView,
  AirtableField
} from "./types";
import { TokenManager } from "../auth/TokenManager";

export class AirtableExecutor extends AbstractExecutor {
  private async makeAirtableRequest(
    endpoint: string,
    options: RequestInit = {},
    tokens: any
  ): Promise<any> {
    try {
      // First ensure we have a valid token by explicitly requesting one
      // This will trigger the refresh flow if needed
      const accessToken = tokens.access_token || await TokenManager.getValidToken('airtable');
      
      // Use the API proxy to make requests to Airtable
      const response = await fetch('/api/airtable/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint,
          method: options.method || 'GET',
          headers: {
            ...(options.headers || {}),
            'Authorization': `Bearer ${accessToken}`
          },
          body: options.body ? JSON.parse(options.body as string) : undefined
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error making Airtable request:', error);
      throw error;
    }
  }

  // Get user's accessible bases - using Meta API
  async getAirtableBases(tokens: any): Promise<AirtableBase[]> {
    try {
      // Use the Meta API to get bases
      const response = await this.makeAirtableRequest('meta/bases', { method: 'GET' }, tokens);
      console.log('Airtable bases response:', response);
      return response.bases || [];
    } catch (error) {
      console.error('Error fetching Airtable bases:', error);
      return [];
    }
  }

  // Get tables in a base - using Meta API
  async getAirtableTables(tokens: any, baseId: string): Promise<AirtableTable[]> {
    try {
      // Use the Meta API to get tables for a base
      const response = await this.makeAirtableRequest(`meta/bases/${baseId}/tables`, { method: 'GET' }, tokens);
      console.log('Airtable tables response:', response);
      return response.tables || [];
    } catch (error) {
      console.error(`Error fetching tables for base ${baseId}:`, error);
      return [];
    }
  }

  // Get fields in a table - using Meta API for schema
  async getAirtableFields(tokens: any, baseId: string, tableId: string): Promise<AirtableField[]> {
    try {
      // Use the Meta API to get the base schema
      const response = await this.makeAirtableRequest(`meta/bases/${baseId}/tables`, { method: 'GET' }, tokens);
      console.log('Airtable schema response for fields:', {
        hasTables: !!response.tables,
        tableCount: response.tables?.length
      });
      
      // Find the specific table
      const table = response.tables.find((t: any) => t.id === tableId);
      
      if (!table) {
        console.warn(`Table ${tableId} not found in base ${baseId}`);
        return [];
      }
      
      // Log table info for debugging
      console.log('Found table:', {
        name: table.name,
        id: table.id,
        fieldCount: table.fields?.length
      });
      
      // Extract and return fields
      const fields = table.fields || [];
      
      // Log some field data for debugging
      if (fields.length > 0) {
        console.log('Sample field data:', {
          fieldName: fields[0].name,
          fieldId: fields[0].id,
          fieldType: fields[0].type
        });
      }
      
      console.log(`Found ${fields.length} fields in table ${tableId}`);
      
      return fields;
    } catch (error) {
      console.error(`Error fetching fields for table ${tableId}:`, error);
      
      // If Meta API fails, try to get fields from a record
      try {
        console.log('Trying alternative approach to get fields...');
        
        // Make a request to get one record from the table to infer fields
        const recordsResponse = await this.makeAirtableRequest(
          `${baseId}/${tableId}?maxRecords=1`, 
          { method: 'GET' }, 
          tokens
        );
        
        if (recordsResponse.records && recordsResponse.records.length > 0) {
          const record = recordsResponse.records[0];
          
          // Extract field names from the record
          const fieldNames = Object.keys(record.fields);
          
          // Convert to AirtableField format
          const inferredFields = fieldNames.map(name => ({
            id: name,
            name: name,
            type: typeof record.fields[name]
          }));
          
          console.log(`Inferred ${inferredFields.length} fields from record`);
          return inferredFields;
        }
      } catch (fallbackError) {
        console.error('Alternative field detection also failed:', fallbackError);
      }
      
      return [];
    }
  }

  private async executeReadRecords(
    context: ExecutorContext,
    config: AirtableConfig
  ): Promise<ExecutionResult> {
    try {
      const { baseId, tableId, selectedFields, maxRecords, filterFormula } = config;
      
      if (!baseId) {
        throw new Error("Base ID is required");
      }
      
      if (!tableId) {
        throw new Error("Table ID is required");
      }
      
      if (!selectedFields || !Array.isArray(selectedFields) || selectedFields.length === 0) {
        throw new Error("At least one field must be selected");
      }
      
      // Check for error placeholders
      if (selectedFields.includes('NO_FIELDS_AVAILABLE') || selectedFields.includes('ERROR_LOADING_FIELDS')) {
        throw new Error("Cannot execute with placeholder fields. Please select actual fields from your Airtable.");
      }
      
      // Build the Airtable API request parameters
      let apiParams = '';
      
      // Build the query parameters as shown in the documentation
      const queryParams = new URLSearchParams();
      
      if (maxRecords) {
        queryParams.append('maxRecords', maxRecords.toString());
      } else {
        // Default to 100 records if not specified
        queryParams.append('maxRecords', '100');
      }
      
      // Add fields parameter to only fetch the selected fields
      // Use the field names directly
      selectedFields.forEach(field => {
        // Airtable expects fields[] format
        queryParams.append('fields[]', field);
      });
      
      if (filterFormula) {
        queryParams.append('filterByFormula', filterFormula);
      }
      
      // Construct the complete endpoint
      const endpoint = `${baseId}/${tableId}?${queryParams.toString()}`;
      console.log(`Fetching Airtable records with endpoint: ${endpoint}`);
      
      const response = await this.makeAirtableRequest(endpoint, { method: 'GET' }, context.tokens);
      
      if (!response.records) {
        console.warn('No records found in Airtable response:', response);
        return {
          success: true,
          data: {
            output_records: [],
            recordCount: 0,
            message: 'No records found in the table'
          }
        };
      }
      
      // Process the records to extract the selected fields
      const records = response.records;
      console.log(`Received ${records.length} records from Airtable`);
      
      // Log the first record to see its structure
      if (records.length > 0) {
        console.log('Sample record structure:', JSON.stringify(records[0]));
      }
      
      // Organize the data by field
      const fieldData: Record<string, any[]> = {};
      
      // Initialize arrays for each selected field
      selectedFields.forEach(field => {
        fieldData[`output_${field}`] = [];
      });
      
      // Extract field values from each record
      records.forEach(record => {
        selectedFields.forEach(field => {
          // Get the field value, or null if not present
          const value = record.fields[field] !== undefined ? record.fields[field] : null;
          fieldData[`output_${field}`].push(value);
        });
      });
      
      // Add type information
      const outputTypes: Record<string, string> = {};
      selectedFields.forEach(field => {
        outputTypes[`output_${field}`] = 'array';
      });
      outputTypes.output_records = 'array';
      
      return {
        success: true,
        data: {
          ...fieldData,
          output_records: records,
          recordCount: records.length,
          _output_types: outputTypes
        }
      };
    } catch (error) {
      console.error("Error reading Airtable records:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to read records",
          details: error
        }
      };
    }
  }

  async execute(
    context: ExecutorContext,
    config: AirtableConfig
  ): Promise<ExecutionResult> {
    try {
      console.log("Executing Airtable action:", config.action);
      
      switch (config.action) {
        case 'READ_RECORDS':
          return this.executeReadRecords(context, config);
        default:
          return {
            success: false,
            error: {
              message: `Unsupported Airtable action: ${config.action}`
            }
          };
      }
    } catch (error) {
      console.error("Airtable executor error:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "An error occurred during execution",
          details: error
        }
      };
    }
  }
}