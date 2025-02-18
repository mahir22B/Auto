export type SheetsAction = 'READ_SHEET' | 'WRITE_SHEET' | 'UPDATE_SHEET';

export interface SheetsConfig {
  action: SheetsAction;
  spreadsheetId: string;
  range: string;
  values?: string;
}