// src/lib/hubspot/types.ts
export type HubspotAction = 'COMPANY_READER' | 'CONTACT_READER' | 'CONTACT_UPDATER' | 'DEAL_READER' | 'ENGAGEMENT_READER' | 'EMAIL_SENDER' | 'COMPANY_UPDATER';

export interface HubspotConfig {
  action: HubspotAction;
  // For COMPANY_READER
  properties?: string[];
  limit?: number;
  useList?: boolean;
  
  // For ENGAGEMENT_READER
  companyDomain?: string;
  engagementTypes?: string[];

  companyName?: string;

  
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


// Interfaces for Engagement types
export interface HubspotEmail {
  from: string;
  to: string;
  body: string;
}

export interface HubspotNote {
  content: string;
  createdBy: string;
  createdDate: string;
  associationType: string;
  lastUpdated: string;
}

export interface HubspotMeeting {
  title: string;
  startTime: string;
  endTime: string;
  description: string;
  attendees: string[];
  status: string;
  location: string;
}

export interface HubspotOtherCommunication {
  type: string;
  timestamp: string;
  duration: string;
  participants: string[];
  outcome: string;
  notes: string;
}

export interface HubspotEngagement {
  id: string;
  type: 'EMAIL' | 'NOTE' | 'MEETING' | 'CALL' | 'TASK';
  properties: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface HubspotEngagementsResponse {
  results: HubspotEngagement[];
  paging?: {
    next?: {
      after: string;
      link: string;
    }
  };
  total?: number;
}

export interface HubspotEngagementReaderResult {
  emails: HubspotEmail[];
  notes: HubspotNote[];
  meetings: HubspotMeeting[];
  otherCommunications: HubspotOtherCommunication[];
  companyName?: string;
  companyDomain?: string;
  companyId?: string;
}

export interface HubspotCompanyUpdateResult {
    companyId: string;
    companyName: string;
    propertiesUpdated: string[];
    success: boolean;
    errors?: any;
  }