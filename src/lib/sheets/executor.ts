import { AbstractExecutor } from '../executors/AbstractExecutor';
import { ExecutorContext, ExecutionResult } from '../executors/types';

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

  async execute(context: ExecutorContext, config: any): Promise<ExecutionResult> {
    try {
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
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to read sheet data',
          details: error
        }
      };
    }
  }
}