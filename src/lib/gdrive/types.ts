export type GDriveAction = 'READ_FILE' | 'READ_FOLDER' | 'WRITE_FILE';

export interface GDriveConfig {
  action: GDriveAction;
  fileId?: string;
  folderId?: string;
  fileName?: string;
  content?: string;
}

export interface FlowNode {
  id: string;
  type: 'gdrive';
  position: { x: number; y: number };
  data: {
    config: GDriveConfig;
    isConfigured: boolean;
  };
}