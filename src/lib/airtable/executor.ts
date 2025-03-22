// src/lib/airtable/executor.ts
import { ExecutorContext, ExecutionResult } from "../executors/types";
import { AbstractExecutor } from "../executors/AbstractExecutor";
import { 
  AirtableConfig, 
  AirtableBase, 
  AirtableTable, 
  AirtableView,
  AirtableField, 
  AirtableRecordsResponse
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

  // Get user's accessible bases
  async getAirtableBases(tokens: any): Promise<AirtableBase[]> {
    try {
      const response = await this.makeAirtableRequest('meta/bases', { method: 'GET' }, tokens);
      return response.bases || [];
    } catch (error) {
      console.error('Error fetching Airtable bases:', error);
      return [];
    }
  }

  // Get tables in a base
  async getAirtableTables(tokens: any, baseId: string): Promise<AirtableTable[]> {
    try {
      const response = await this.makeAirtableRequest(`meta/bases/${baseId}/tables`, { method: 'GET' }, tokens);
      return response.tables || [];
    } catch (error) {
      console.error(`Error fetching tables for base ${baseId}:`, error);
      return [];
    }
  }

  // Get views in a table
  async getAirtableViews(tokens: any, baseId: string, tableId: string): Promise<AirtableView[]> {
    try {
      const response = await this.makeAirtableRequest(
        `meta/bases/${baseId}/tables/${tableId}/views`, 
        { method: 'GET' }, 
        tokens
      );
      return response.views || [];
    } catch (error) {
      console.error(`Error fetching views for table ${tableId}:`, error);
      return [];
    }
  }

  // Get fields in a table
  async getAirtableFields(tokens: any, baseId: string, tableId: string): Promise<AirtableField[]> {
    try {
      const tables = await this.getAirtableTables(tokens, baseId);
      const table = tables.find(t => t.id === tableId);
      return table?.fields || [];
    } catch (error) {
      console.error(`Error fetching fields for table ${tableId}:`, error);
      return [];
    }
  }

  private async executeReadRecords(
    context: ExecutorContext,
    config: AirtableConfig
  ): Promise<ExecutionResult> {
    try {
      const { baseId, tableId, viewId, selectedFields, maxRecords, filterFormula } = config;
      
      if (!baseId) {
        throw new Error("Base ID is required");
      }
      
      if (!tableId) {
        throw new Error("Table ID is required");
      }
      
      if (!selectedFields || !Array.isArray(selectedFields) || selectedFields.length === 0) {
        throw new Error("At least one field must be selected");
      }
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (viewId) {
        queryParams.append('view', viewId);
      }
      
      if (maxRecords) {
        queryParams.append('maxRecords', maxRecords.toString());
      }
      
      if (filterFormula) {
        queryParams.append('filterByFormula', filterFormula);
      }
      
      // Get field information for mapping IDs to names
      const fields = await this.getAirtableFields(context.tokens, baseId, tableId);
      const fieldMap = new Map<string, string>();
      fields.forEach(field => {
        fieldMap.set(field.id, field.name);
      });
      
      // Fetch records
      const endpoint = `v0/${baseId}/${tableId}?${queryParams.toString()}`;
      const response = await this.makeAirtableRequest(endpoint, { method: 'GET' }, context.tokens);
      
      if (!response.records) {
        throw new Error("No records found in the response");
      }
      
      // Extract data for selected fields
      const fieldData: Record<string, any[]> = {};
      const records = response.records;
      
      // Initialize arrays for each selected field
      selectedFields.forEach(fieldId => {
        fieldData[`output_${fieldId}`] = [];
      });
      
      // Populate field data from records
      records.forEach(record => {
        selectedFields.forEach(fieldId => {
          const fieldName = fieldMap.get(fieldId) || fieldId;
          fieldData[`output_${fieldId}`].push(record.fields[fieldName] || null);
        });
      });
      
      // Add type information for output fields
      const outputTypes: Record<string, string> = {};
      selectedFields.forEach(fieldId => {
        outputTypes[`output_${fieldId}`] = 'array';
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