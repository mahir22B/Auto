// src/app/api/auth/refresh/route.ts

import { SERVICES } from "@/lib/services";

// Define token endpoints for each service type
const TOKEN_ENDPOINTS = {
  google: 'https://oauth2.googleapis.com/token',
  hubspot: 'https://api.hubapi.com/oauth/v1/token',
  slack: 'https://slack.com/api/oauth.v2.access',
  airtable: 'https://airtable.com/oauth2/v1/token'
};

// Service-specific token refresh handlers
const refreshHandlers = {
  // Google refresh handler
  google: async (refresh_token: string): Promise<Response> => {
    const response = await fetch(TOKEN_ENDPOINTS.google, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    
    return response;
  },
  
  // HubSpot refresh handler
  hubspot: async (refresh_token: string): Promise<Response> => {
    const response = await fetch(TOKEN_ENDPOINTS.hubspot, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.HUBSPOT_CLIENT_ID!,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
        refresh_token: refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    
    return response;
  },
  
  // Airtable refresh handler
  airtable: async (refresh_token: string): Promise<Response> => {
    const response = await fetch(TOKEN_ENDPOINTS.airtable, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.AIRTABLE_CLIENT_ID!,
        client_secret: process.env.AIRTABLE_CLIENT_SECRET!,
        refresh_token: refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    
    return response;
  },
  
  // Placeholder for Slack - implement if needed
  slack: async (refresh_token: string): Promise<Response> => {
    throw new Error('Slack token refresh not implemented yet');
  }
};

// Determine service type from service ID
const getServiceType = (service: string): 'google' | 'hubspot' | 'slack' | 'airtable' => {
  if (service === 'hubspot') {
    return 'hubspot';
  } else if (service === 'slack') {
    return 'slack';
  } else if (service === 'airtable') {
    return 'airtable';
  }
  // Default to Google for all Google services (gmail, gdrive, sheets, etc.)
  return 'google';
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { service, refresh_token } = body;

    if (!SERVICES[service]) {
      return Response.json({ error: 'Invalid service' }, { status: 400 });
    }

    if (!refresh_token) {
      return Response.json({ error: 'Refresh token required' }, { status: 400 });
    }
    
    // Determine which service type we're dealing with
    const serviceType = getServiceType(service);
    
    // Get the appropriate refresh handler
    const refreshHandler = refreshHandlers[serviceType];
    
    if (!refreshHandler) {
      return Response.json({ error: `Token refresh not supported for ${service}` }, { status: 400 });
    }
    
    console.log(`Refreshing ${serviceType} token for service: ${service}`);
    
    try {
      // Call the service-specific handler
      const response = await refreshHandler(refresh_token);
      
      if (!response.ok) {
        const error = await response.json();
        return Response.json(
          { error: error.error_description || `Token refresh failed: ${response.status}` }, 
          { status: response.status }
        );
      }
      
      const data = await response.json();
      return Response.json(data);
    } catch (error) {
      console.error(`Error refreshing ${serviceType} token:`, error);
      return Response.json(
        { error: error instanceof Error ? error.message : 'Token refresh failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}