// src/lib/sheets/executor.ts

import { AbstractExecutor } from '../executors/AbstractExecutor';
import { ExecutorContext, ExecutionResult } from '../executors/types';
import { SheetsConfig } from './types';

export class SheetReader extends AbstractExecutor {
  async getSheetMetadata(spreadsheetId: string, context: ExecutorContext): Promise<{ columns: string[] }> {
    try {
      // Fetch the sheet metadata including the first row (headers)
      const response = await this.makeAuthorizedRequest(
        'sheets',
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=true&ranges=A1:Z1`,
        {
          method: 'GET'
        }
      );

      const data = await response.json();
      
      // Get the first sheet's data
      const sheet = data.sheets[0];
      const gridData = sheet.data[0];

      if (!gridData || !gridData.rowData || gridData.rowData.length === 0) {
        throw new Error('Sheet is empty');
      }

      // Extract column headers from first row
      const headerRow = gridData.rowData[0].values;
      const columns = headerRow
        .map((cell: any) => cell.formattedValue || '')
        .filter(Boolean);

      return { columns };
    } catch (error) {
      console.error('Error fetching sheet metadata:', error);
      throw error;
    }
  }

  async execute(context: ExecutorContext, config: SheetsConfig): Promise<ExecutionResult> {
    try {
      switch (config.action) {
        case 'READ_SHEET':
          return await this.executeReadSheet(context, config);
        case 'WRITE_SHEET':
          return await this.executeWriteSheet(context, config);
        case 'UPDATE_SHEET':
          return await this.executeUpdateSheet(context, config);
        default:
          throw new Error(`Unsupported action: ${config.action}`);
      }
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to execute sheet operation',
          details: error
        }
      };
    }
  }

  private async executeReadSheet(context: ExecutorContext, config: SheetsConfig): Promise<ExecutionResult> {
    const { spreadsheetId, selectedColumns } = config;

    if (!selectedColumns || selectedColumns.length === 0) {
      throw new Error('No columns selected');
    }

    // Get all data from the sheet
    const response = await this.makeAuthorizedRequest(
      'sheets',
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:Z`,
      {
        method: 'GET'
      }
    );

    const data = await response.json();
    const rows = data.values || [];

    if (rows.length < 2) { // Need at least headers + 1 data row
      throw new Error('No data found in sheet');
    }

    // Get header row and find indices of selected columns
    const headers = rows[0];
    const columnIndices = selectedColumns.map(col => headers.indexOf(col));

    // Check if any selected column wasn't found
    if (columnIndices.some(index => index === -1)) {
      throw new Error('Some selected columns were not found in the sheet');
    }

    // Process data for each selected column
    const result: Record<string, any[]> = {};
    selectedColumns.forEach((column, idx) => {
      const columnIndex = columnIndices[idx];
      result[column] = rows.slice(1).map(row => row[columnIndex] || null);
      
      // Add outputs with output_ prefix for handles
      result[`output_${column}`] = rows.slice(1).map(row => row[columnIndex] || null);
    });

    return {
      success: true,
      data: result
    };
  }

  private async executeWriteSheet(context: ExecutorContext, config: SheetsConfig): Promise<ExecutionResult> {
    const spreadsheetId = config.spreadsheetId;
    
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required');
    }
    
    if (!config.selectedColumns || config.selectedColumns.length === 0) {
      throw new Error('No columns selected for writing');
    }
    
    // Gather data for each column from inputs or config
    const columnData: Record<string, any[]> = {};
    
    // Example implementation - for each selected column, check for input data
    for (const column of config.selectedColumns) {
      const inputHandle = `input_${column}`;
      
      // Get data from input if available
      if (context.inputData && context.inputData[inputHandle]) {
        // If input data is an array, use it directly
        if (Array.isArray(context.inputData[inputHandle])) {
          columnData[column] = context.inputData[inputHandle];
        } else {
          // If it's a single value, wrap it in an array
          columnData[column] = [context.inputData[inputHandle]];
        }
      }
      // Otherwise, use placeholder data for now
      else {
        columnData[column] = ["Sample data"];
      }
    }
    
    // Generate sheet link
    const sheetLink = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    
    return {
      success: true,
      data: {
        sheetLink,
        columnData,
        message: 'Write Sheet executed with input data'
      }
    };
  }
  
  private async executeUpdateSheet(context: ExecutorContext, config: SheetsConfig): Promise<ExecutionResult> {
    const spreadsheetId = config.spreadsheetId;
    
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required');
    }
    
    if (!config.selectedColumns || config.selectedColumns.length === 0) {
      throw new Error('No columns selected for updating');
    }
    
    // Get search value from input or config
    const searchValue = this.getInputValueOrConfig(
      context, 
      'input_search_value', 
      config, 
      'searchValue'
    );
    
    if (!searchValue) {
      throw new Error('Search value is required');
    }

    if (!config.searchColumn) {
      throw new Error('Search column is required');
    }
    
    if (!config.updaterMode) {
      throw new Error('Updater mode is required');
    }
    
    // Gather data for each column to update
    const updateData: Record<string, any> = {};
    
    // For each selected column, check for input data
    for (const column of config.selectedColumns) {
      const inputHandle = `input_${column}`;
      
      // Get data from input if available
      if (context.inputData && context.inputData[inputHandle] !== undefined) {
        updateData[column] = context.inputData[inputHandle];
      }
    }
    
    // Generate sheet link
    const sheetLink = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    
    return {
      success: true,
      data: {
        sheetLink,
        searchValue,
        searchColumn: config.searchColumn,
        updateData,
        mode: config.updaterMode,
        message: `Update Sheet executed with ${Object.keys(updateData).length} values to update`
      }
    };
  }
}