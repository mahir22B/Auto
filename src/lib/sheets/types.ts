export type SheetsAction = 'READ_SHEET' | 'WRITE_SHEET' | 'UPDATE_SHEET';

export interface SheetMetadata {
  columns: string[];
}

export interface SheetsConfig {
  action: SheetsAction;
  spreadsheetId?: string;
  range?: string;
  values?: string;
  // New fields for READ_SHEET
  fileDetails?: {
    id: string;
    name: string;
    mimeType: string;
    url?: string;
  };
  availableColumns?: string[];
  selectedColumns?: string[];
}

// Result type for sheet data
export interface SheetData {
  [columnName: string]: any[];
}