export type GDocsAction = 'READ_DOCUMENT' | 'WRITE_DOCUMENT';

export interface GDocsConfig {
  action: GDocsAction;
  // For READ_DOCUMENT
  documentUrl?: string;
  // For WRITE_DOCUMENT
  title?: string;
  content?: string;
}

export interface GDocsNode {
  id: string;
  type: 'gdocs';
  position: { x: number; y: number };
  data: {
    config: GDocsConfig;
    isConfigured: boolean;
  };
}