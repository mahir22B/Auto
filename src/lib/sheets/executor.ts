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
    
    try {
      // Get sheet metadata
      const sheetMetadataResponse = await this.makeAuthorizedRequest(
        'sheets',
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
        { method: 'GET' }
      );
      
      const sheetMetadata = await sheetMetadataResponse.json();
      
      // Determine which sheet to write to
      const targetSheetName = config.sheetName || sheetMetadata.sheets[0].properties.title;
      const targetSheet = sheetMetadata.sheets.find((sheet: any) => 
        sheet.properties.title === targetSheetName
      );
      
      if (!targetSheet) {
        throw new Error(`Sheet "${targetSheetName}" not found in the spreadsheet`);
      }
      
      const sheetId = targetSheet.properties.sheetId;
      
      // Get existing data
      const dataResponse = await this.makeAuthorizedRequest(
        'sheets',
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${targetSheetName}`,
        { method: 'GET' }
      );
      
      const existingData = await dataResponse.json();
      
      if (!existingData.values || existingData.values.length === 0) {
        throw new Error('Sheet is empty or has no data');
      }
      
      const allRows = existingData.values;
      const headers = allRows[0];
      
      // Map column names to their indices
      const columnIndices: { [columnName: string]: number } = {};
      for (const column of config.selectedColumns) {
        const index = headers.indexOf(column);
        if (index !== -1) {
          columnIndices[column] = index;
        } else {
          console.warn(`Column "${column}" not found in sheet headers`);
        }
      }
      
      // Process input data
      const columnData: { [columnName: string]: any[] } = {};
      
      for (const column of config.selectedColumns) {
        const inputHandle = `input_${column}`;
        
        let inputValue = context.inputData && context.inputData[inputHandle] !== undefined 
          ? context.inputData[inputHandle] 
          : null;
        
        // Normalize to array
        if (inputValue === null || inputValue === undefined) {
          columnData[column] = [];
        } else if (Array.isArray(inputValue)) {
          columnData[column] = inputValue;
        } else {
          columnData[column] = [inputValue];
        }
      }
      
      // Find the maximum row count
      const maxRows = Math.max(
        ...Object.values(columnData).map(arr => arr.length),
        0
      );
      
      if (maxRows === 0) {
        return {
          success: true,
          data: {
            sheetLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`,
            message: 'No data to write'
          }
        };
      }
      
      // Smart row detection - find rows that already have data
      const dataRows = allRows.slice(1); // Skip header row
      const nonEmptyRows = dataRows.filter(row => row.some(cell => cell !== '' && cell !== null));
      const nonEmptyRowCount = nonEmptyRows.length;
      
      // Determine if we should update existing rows or append new ones
      const isSingleValueUpdate = maxRows === 1 && Object.values(columnData).every(arr => arr.length <= 1);
      const shouldUpdateExisting = isSingleValueUpdate && nonEmptyRowCount > 0;
      
      // Starting row index (0-based) - start after header (row index 1)
      // If updating existing, use row 1, otherwise start after the last non-empty row
      const startRowIndex = shouldUpdateExisting ? 1 : Math.max(1, nonEmptyRowCount + 1);
      
      // Prepare batch update requests
      const requests = [];
      
      // For each column with data
      for (const column of config.selectedColumns) {
        const columnIndex = columnIndices[column];
        if (columnIndex === undefined) continue; // Skip columns not found in sheet
        
        const values = columnData[column];
        if (!values || values.length === 0) continue; // Skip empty columns
        
        // For each row of data in this column
        for (let i = 0; i < values.length; i++) {
          const rowIndex = startRowIndex + i;
          const value = values[i];
          
          // Create the appropriate value object based on data type
          let userEnteredValue: any = {};
          if (value === null || value === undefined) {
            userEnteredValue.stringValue = "";
          } else if (typeof value === 'number') {
            userEnteredValue.numberValue = value;
          } else if (typeof value === 'boolean') {
            userEnteredValue.boolValue = value;
          } else {
            userEnteredValue.stringValue = String(value);
          }
          
          requests.push({
            updateCells: {
              range: {
                sheetId: sheetId,
                startRowIndex: rowIndex,
                endRowIndex: rowIndex + 1,
                startColumnIndex: columnIndex,
                endColumnIndex: columnIndex + 1
              },
              rows: [
                {
                  values: [
                    { userEnteredValue }
                  ]
                }
              ],
              fields: 'userEnteredValue'
            }
          });
        }
      }
      
      if (requests.length === 0) {
        return {
          success: true,
          data: {
            sheetLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`,
            message: 'No data to write'
          }
        };
      }
      
      // Execute batch update
      const updateResponse = await this.makeAuthorizedRequest(
        'sheets',
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          body: JSON.stringify({
            requests
          })
        }
      );
      
      await updateResponse.json();
      
      return {
        success: true,
        data: {
          sheetLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`,
          output_fileUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`,
          updatedCells: requests.length,
          updatedRows: shouldUpdateExisting ? 1 : maxRows,
          mode: shouldUpdateExisting ? 'updated existing row' : 'appended new rows',
          message: shouldUpdateExisting 
            ? `Updated existing data in row ${startRowIndex + 1}` 
            : `Added ${maxRows} new row(s) of data`
        }
      };
    } catch (error) {
      console.error('Error writing to sheet:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to write to sheet',
          details: error
        }
      };
    }
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
    
    try {
      // First, get the sheet metadata
      const sheetMetadataResponse = await this.makeAuthorizedRequest(
        'sheets',
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
        { method: 'GET' }
      );
      
      const sheetMetadata = await sheetMetadataResponse.json();
      
      // Determine which sheet to use (default to first sheet)
      const targetSheetName = config.sheetName || sheetMetadata.sheets[0].properties.title;
      const targetSheet = sheetMetadata.sheets.find((sheet: any) => 
        sheet.properties.title === targetSheetName
      );
      
      if (!targetSheet) {
        throw new Error(`Sheet "${targetSheetName}" not found in the spreadsheet`);
      }
      
      const sheetId = targetSheet.properties.sheetId;
      
      // Get the sheet data to find rows to update
      const dataResponse = await this.makeAuthorizedRequest(
        'sheets',
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${targetSheetName}`,
        { method: 'GET' }
      );
      
      const sheetData = await dataResponse.json();
      
      if (!sheetData.values || sheetData.values.length <= 1) {
        throw new Error('Sheet has no data or only headers');
      }
      
      const headers = sheetData.values[0];
      const searchColumnIndex = headers.indexOf(config.searchColumn);
      
      if (searchColumnIndex === -1) {
        throw new Error(`Search column "${config.searchColumn}" not found in sheet headers`);
      }
      
      // Find rows to update
      const rowsToUpdate: number[] = [];
      sheetData.values.forEach((row: any[], index: number) => {
        if (index === 0) return; // Skip header row
        
        if (row[searchColumnIndex] === searchValue) {
          rowsToUpdate.push(index);
        }
      });
      
      if (rowsToUpdate.length === 0) {
        return {
          success: false,
          error: {
            message: `No rows found with value "${searchValue}" in column "${config.searchColumn}"`,
          },
          data: {
            sheetLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`,
            message: `No rows matched the search criteria`
          }
        };
      }
      
      // If mode is 'single' but multiple matches found, just update the first one
      if (config.updaterMode === 'single' && rowsToUpdate.length > 1) {
        rowsToUpdate.splice(1); // Keep only the first row
      }
      
      // Gather data for each column to update
      const updateData: Record<string, any> = {};
      
      // For each selected column, check for input data
      for (const column of config.selectedColumns) {
        if (column === config.searchColumn) continue; // Skip the search column
        
        const inputHandle = `input_${column}`;
        
        // Get data from input if available
        if (context.inputData && context.inputData[inputHandle] !== undefined) {
          updateData[column] = context.inputData[inputHandle];
        }
      }
      
      if (Object.keys(updateData).length === 0) {
        throw new Error('No update data provided');
      }
      
      // Prepare batch update request
      const requests = [];
      
      for (const rowIndex of rowsToUpdate) {
        for (const [column, value] of Object.entries(updateData)) {
          const columnIndex = headers.indexOf(column);
          if (columnIndex === -1) continue; // Skip if column not found
          
          requests.push({
            updateCells: {
              range: {
                sheetId,
                startRowIndex: rowIndex,
                endRowIndex: rowIndex + 1,
                startColumnIndex: columnIndex,
                endColumnIndex: columnIndex + 1
              },
              rows: [
                {
                  values: [
                    {
                      userEnteredValue: {
                        // Handle different value types
                        [typeof value === 'number' ? 'numberValue' : 
                          typeof value === 'boolean' ? 'boolValue' : 'stringValue']: value
                      }
                    }
                  ]
                }
              ],
              fields: 'userEnteredValue'
            }
          });
        }
      }
      
      // Execute batch update
      const updateResponse = await this.makeAuthorizedRequest(
        'sheets',
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          body: JSON.stringify({
            requests
          })
        }
      );
      
      const updateResult = await updateResponse.json();
      
      // Generate sheet link
      const sheetLink = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`;
      
      return {
        success: true,
        data: {
          sheetLink,
          updatedRows: rowsToUpdate.length,
          message: `Successfully updated ${rowsToUpdate.length} row(s)`
        }
      };
    } catch (error) {
      console.error('Error updating sheet:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to update sheet',
          details: error
        }
      };
    }
  }
}