import { GMAIL_ACTIONS } from "../gmail/actions";
import { GDRIVE_ACTIONS } from "../gdrive/actions";
import { SHEETS_ACTIONS } from "../sheets/actions";
import { GDOCS_ACTIONS } from "../gdocs/actions";
import { SLACK_ACTIONS } from "../slack/actions";
import { AI_ACTIONS } from "../ai/actions"; // Add this import
import { HUBSPOT_ACTIONS } from "../hubspot/actions";



export interface Port {
  id: string;
  label: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  isActive?: boolean;
  isListType?: boolean | ((config: any) => boolean); // Can be a boolean or a function that determines list status
}

// Other interfaces remain the same
export interface ConfigField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: any[];
  dependencies?: string[];
  visibilityCondition?: (config: any) => boolean;
  refreshable?: boolean;
  pickerOptions?: {
    serviceType?: string;
    title?: string;
    viewTypes?: string[];
    selectFolders?: boolean;
    mimeTypes?: string[];
  };
  onValueSelect?: (value: any, config: any, context: any) => Promise<any>;
  loadOptions?: (context: any) => Promise<any[]>;
}

export interface ActionConfig {
  id: string;
  name: string;
  description: string;
  configFields: ConfigField[];
  ports: {
    inputs: Port[];
    outputs: Port[];
  };
  getDynamicPorts?: (config: any) => {
    inputs: Port[];
    outputs: Port[];
  };
  // Add new method to evaluate port types based on config
  getPortListTypes?: (config: any) => Record<string, boolean>;
  refreshable?: boolean;
}

export interface ServiceConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  actions: Record<string, ActionConfig>;
  authScopes: string[];
}

export const SERVICES: Record<string, ServiceConfig> = {
  ai: {
    id: "ai",
    name: "Use AI",
    description: "Leverage AI for your workflows",
    icon: "/icons/ai.svg", 
    actions: AI_ACTIONS,
    authScopes: [], // No OAuth scopes needed for OpenRouter
  },
  slack: {
    id: "slack",
    name: "Slack",
    description: "Send and receive Slack messages",
    icon: "/icons/slack.svg",
    actions: SLACK_ACTIONS,
    authScopes: [
      "chat:write",
      "channels:read",
      "groups:read",
      "files:write",
      "files:read",
      "users:read",
      "im:read",         
      "mpim:read",
      "channels:history",
      "canvases:read",
      "canvases:write",
      "team:read"          
    ],
  },
  gmail: {
    id: "gmail",
    name: "Gmail",
    description: "Email operations",
    icon: "/icons/gmail.svg",
    actions: GMAIL_ACTIONS,
    authScopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.modify",
    ],
  },
  gdrive: {
    id: "gdrive",
    name: "Google Drive",
    description: "Manage files and folders",
    icon: "/icons/gdrive.svg",
    actions: GDRIVE_ACTIONS,
    authScopes: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.metadata",
    ],
  },
  sheets: {
    id: "sheets",
    name: "Google Sheets",
    description: "Spreadsheet operations",
    icon: "/icons/gsheets.svg",
    actions: SHEETS_ACTIONS,
    authScopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/spreadsheets.readonly",
      "https://www.googleapis.com/auth/drive.readonly", 
      "https://www.googleapis.com/auth/drive.file",
    ],
  },
  gdocs: {
    id: "gdocs",
    name: "Google Docs",
    description: "Read and write Google Docs",
    icon: "/icons/gdocs.svg",
    actions: GDOCS_ACTIONS,
    authScopes: [
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/documents.readonly",
      "https://www.googleapis.com/auth/drive", // Full drive access
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.metadata.readonly"
    ],
  },
  hubspot: {
    id: "hubspot",
    name: "HubSpot",
    description: "Manage CRM data in HubSpot",
    icon: "/icons/hubspot.svg",
    actions: HUBSPOT_ACTIONS,
    authScopes: [
      "crm.objects.companies.read",
      "crm.objects.companies.write",
      "crm.objects.contacts.read",
      "crm.objects.contacts.write",
      "crm.objects.deals.read",
      "crm.schemas.companies.read",
      "crm.schemas.contacts.read",
      "crm.schemas.deals.read"
    ],
  },
};
