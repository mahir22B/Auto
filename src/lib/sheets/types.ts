// src/lib/sheets/types.ts
export type SheetsAction = 'READ_SHEET' | 'WRITE_SHEET' | 'UPDATE_SHEET';

export interface SheetMetadata {
  columns: string[];
}

export interface SheetsConfig {
  action: SheetsAction;
  spreadsheetId?: string;
  range?: string;
  values?: string;
  sheetName?: string;
  searchColumn?: string;
  searchValue?: string;
  updaterMode?: 'single' | 'multiple';
  // Fields used for READ_SHEET, WRITE_SHEET, and UPDATE_SHEET
  fileDetails?: {
    id: string;
    name: string;
    mimeType: string;
    url?: string;
  };
  availableColumns?: string[];
  selectedColumns?: string[];
  // Dynamic port configuration
  ports?: {
    inputs: Array<{
      id: string;
      label: string;
      type: string;
      isActive: boolean;
    }>;
    outputs: Array<{
      id: string;
      label: string;
      type: string;
      isActive: boolean;
    }>;
  };
}

// Result type for sheet data
export interface SheetData {
  [columnName: string]: any[];
}

// Write operation result
export interface SheetWriteResult {
  success: boolean;
  updatedRows?: number;
  sheetLink?: string;
  error?: string;
}