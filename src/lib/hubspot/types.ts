// src/lib/hubspot/types.ts
export type HubspotAction = 'COMPANY_READER' | 'CONTACT_READER' | 'CONTACT_UPDATER' | 'DEAL_READER' | 'ENGAGEMENT_READER' | 'EMAIL_SENDER' | 'COMPANY_UPDATER';

export interface HubspotConfig {
  action: HubspotAction;
  // For COMPANY_READER
  properties?: string[];
  limit?: number;
  useList?: boolean;
  
  // For filtering (future expansion)
  filterType?: 'all' | 'recent' | 'filter';
  filterProperty?: string;
  filterValue?: string;
  filterOperator?: string;
}

export interface HubspotNode {
  id: string;
  type: 'hubspot';
  position: { x: number; y: number };
  data: {
    config: HubspotConfig;
    isConfigured: boolean;
  };
}

// Interfaces for HubSpot API responses
export interface HubspotCompany {
  id: string;
  properties: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface HubspotCompaniesResponse {
  results: HubspotCompany[];
  paging?: {
    next?: {
      after: string;
      link: string;
    }
  };
  total?: number;
}

export interface HubspotContact {
    id: string;
    properties: Record<string, any>;
    createdAt: string;
    updatedAt: string;
    archived: boolean;
  }
  
  export interface HubspotContactsResponse {
    results: HubspotContact[];
    paging?: {
      next?: {
        after: string;
        link: string;
      }
    };
    total?: number;
  }
