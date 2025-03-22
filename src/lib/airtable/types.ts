// src/lib/airtable/types.ts
export type AirtableAction = 'READ_RECORDS' | 'CREATE_RECORD' | 'UPDATE_RECORD' | 'DELETE_RECORD';

export interface AirtableConfig {
  action: AirtableAction;
  // For READ_RECORDS action
  baseId?: string;
  tableId?: string;
  viewId?: string;
  selectedFields?: string[];
  filterFormula?: string;
  maxRecords?: number;
  sort?: Array<{field: string, direction: 'asc' | 'desc'}>;
  // Additional fields as required for other actions
}

export interface AirtableNode {
  id: string;
  type: 'airtable';
  position: { x: number; y: number };
  data: {
    config: AirtableConfig;
    isConfigured: boolean;
  };
}

// Interfaces for Airtable API responses
export interface AirtableField {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export interface AirtableTable {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: AirtableField[];
}

export interface AirtableView {
  id: string;
  name: string;
  type: string;
}

export interface AirtableBase {
  id: string;
  name: string;
  permissionLevel: string;
}

export interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
  createdTime: string;
}

export interface AirtableRecordsResponse {
  records: AirtableRecord[];
  offset?: string;
}