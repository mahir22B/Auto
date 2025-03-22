import { SERVICES } from "../services";
import { generateCodeVerifierServer, generateCodeChallengeServer } from "./pkce";

// Store code verifiers for PKCE
const codeVerifiers = new Map<string, string>();

// Declare global type augmentation for TypeScript
declare global {
  var airtableCodeVerifiers: Record<string, string>;
}

// Initialize global storage if it doesn't exist
global.airtableCodeVerifiers = global.airtableCodeVerifiers || {};

const AUTH_ENDPOINTS = {
  google: {
    auth: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token'
  },
  slack: {
    auth: 'https://slack.com/oauth/v2/authorize',
    token: 'https://slack.com/api/oauth.v2.access'
  },
  hubspot: {
    auth: 'https://app.hubspot.com/oauth/authorize',
    token: 'https://api.hubapi.com/oauth/v1/token'
  },
  airtable: {
    auth: 'https://airtable.com/oauth2/v1/authorize',
    token: 'https://airtable.com/oauth2/v1/token'
  }
};

export class OAuthProvider {
  private config: {
    clientId: string;
    clientSecret: string;
    baseUrl: string;
    serviceId: string;
  } | null = null;

  async initialize(config: {
    clientId: string;
    clientSecret: string;
    baseUrl: string;
    serviceId: string;
  }) {
    this.config = config;
  }

  private getRedirectUri(): string {
    if (!this.config) throw new Error('Not initialized');
    
    // Use different callback endpoints for different services
    const authProvider = this.getAuthProvider();
    return `${this.config.baseUrl.replace(/\/$/, '')}/api/auth/${authProvider}/callback`;
  }
  
  private getAuthProvider(): string {
    // Map service ID to auth provider (google, slack, hubspot, or airtable)
    // This allows mapping multiple services to the same auth provider
    if (!this.config) throw new Error('Not initialized');
    
    const serviceId = this.config.serviceId;
    if (serviceId === 'slack') {
      return 'slack';
    } else if (serviceId === 'hubspot') {
      return 'hubspot';
    } else if (serviceId === 'airtable') {
      return 'airtable';
    }
    
    // Default to google auth for all other services
    return 'google';
  }

  async getAuthUrl(): Promise<string> {
    if (!this.config) throw new Error('Not initialized');
    
    const service = SERVICES[this.config.serviceId];
    if (!service) throw new Error('Invalid service');
    
    const authProvider = this.getAuthProvider();
    const authEndpoint = AUTH_ENDPOINTS[authProvider].auth;
    
    if (authProvider === 'slack') {
      // Slack-specific auth parameters
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        redirect_uri: this.getRedirectUri(),
        scope: service.authScopes.join(' '),
        state: this.config.serviceId  // Store the actual service in state parameter
      });
      
      return `${authEndpoint}?${params.toString()}`;
    } else if (authProvider === 'hubspot') {
      // HubSpot auth parameters
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        redirect_uri: this.getRedirectUri(),
        scope: service.authScopes.join(' '),
        state: this.config.serviceId,
      });
      
      return `${authEndpoint}?${params.toString()}`;
    } else if (authProvider === 'airtable') {
      // Generate PKCE code verifier and challenge
      const stateKey = `${this.config.serviceId}_${Date.now()}`;
      const codeVerifier = await generateCodeVerifierServer();
      const codeChallenge = await generateCodeChallengeServer(codeVerifier);
      
      // Store in memory Map
      codeVerifiers.set(stateKey, codeVerifier);
      
      // Also store in global variable that persists between requests
      global.airtableCodeVerifiers[stateKey] = codeVerifier;
      
      console.log('Generating Airtable auth URL with PKCE:', {
        clientId: this.config.clientId.substring(0, 5) + '...',
        redirectUri: this.getRedirectUri(),
        scopes: service.authScopes.join(' '),
        stateKey,
        codeVerifier: codeVerifier.substring(0, 10) + '...',
        codeChallenge: codeChallenge.substring(0, 10) + '...',
        storedInMemory: true,
        storedInGlobal: !!global.airtableCodeVerifiers[stateKey]
      });
      
      // Airtable auth parameters with PKCE
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        redirect_uri: this.getRedirectUri(),
        response_type: 'code',
        scope: service.authScopes.join(' '),
        state: stateKey,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });
      
      const fullUrl = `${authEndpoint}?${params.toString()}`;
      console.log('Complete Airtable auth URL:', fullUrl);
      
      return fullUrl;
    } else {
      // Google auth parameters
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        redirect_uri: this.getRedirectUri(),
        response_type: 'code',
        scope: service.authScopes.join(' '),
        access_type: 'offline',
        prompt: 'consent',
        state: this.config.serviceId
      });
      
      return `${authEndpoint}?${params.toString()}`;
    }
  }

  async handleCallback(code: string, state?: string): Promise<any> {
    if (!this.config) throw new Error('Not initialized');
    
    const authProvider = this.getAuthProvider();
    const tokenEndpoint = AUTH_ENDPOINTS[authProvider].token;
    
    console.log(`Handling ${authProvider} callback with code`);
    
    const formData = new URLSearchParams();
    formData.append('code', code);
    formData.append('redirect_uri', this.getRedirectUri());
    
    // Add standard OAuth parameters
    if (authProvider === 'slack') {
      // No grant_type required for Slack
      formData.append('client_id', this.config.clientId);
      formData.append('client_secret', this.config.clientSecret);
    } else if (authProvider === 'hubspot') {
      formData.append('grant_type', 'authorization_code');
      formData.append('client_id', this.config.clientId);
      formData.append('client_secret', this.config.clientSecret);
    } else if (authProvider === 'airtable') {
      formData.append('grant_type', 'authorization_code');
      
      // Add PKCE code verifier - check both memory and global storage
      let codeVerifier = null;
      
      // Try to get from in-memory Map first
      if (state && codeVerifiers.has(state)) {
        codeVerifier = codeVerifiers.get(state)!;
        console.log(`Found code_verifier in memory for state ${state}`);
        
        // Clean up from memory
        codeVerifiers.delete(state);
      } 
      // Then try global variable storage
      else if (state && global.airtableCodeVerifiers && global.airtableCodeVerifiers[state]) {
        codeVerifier = global.airtableCodeVerifiers[state];
        console.log(`Found code_verifier in global for state ${state}`);
        
        // Clean up from global
        delete global.airtableCodeVerifiers[state];
      }
      
      if (codeVerifier) {
        console.log(`Using code_verifier: ${codeVerifier.substring(0, 10)}...`);
        formData.append('code_verifier', codeVerifier);
      } else {
        console.warn(`No code_verifier found for state: ${state}`);
        
        // Log available states for debugging
        console.log('Available in-memory states:', Array.from(codeVerifiers.keys()));
        console.log('Available global states:', Object.keys(global.airtableCodeVerifiers || {}));
      }
      
      // For Airtable, we keep client_id in formData
      formData.append('client_id', this.config.clientId);
    } else {
      formData.append('grant_type', 'authorization_code');
      formData.append('client_id', this.config.clientId);
      formData.append('client_secret', this.config.clientSecret);
    }
    
    console.log(`Making token request to ${tokenEndpoint} with form data:`, formData.toString());
    
    // Set up request headers - default for most providers
    let headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    
    // For Airtable, use Basic Auth header instead of including credentials in body
    if (authProvider === 'airtable') {
      // Create Basic Auth header
      const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
      
      console.log('Using Basic Auth for Airtable token request');
    }
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: headers,
      body: formData.toString(),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Token request failed for ${authProvider}:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText };
      }
      
      throw new Error(`Token request failed: ${errorData.error || response.statusText}`);
    }
    
    const tokenData = await response.json();
    
    // Process token data based on provider
    if (authProvider === 'slack') {
      // Slack tokens are nested in a different structure
      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expiry_date: Date.now() + (tokenData.expires_in || 86400) * 1000,
        team_id: tokenData.team?.id || tokenData.team_id,
        team_name: tokenData.team?.name || tokenData.team_name
      };
    } else if (authProvider === 'hubspot') {
      // HubSpot token response
      console.log('HubSpot token response received:', {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
      });
      
      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expiry_date: Date.now() + (tokenData.expires_in || 86400) * 1000,
        hub_id: tokenData.hub_id,
        hub_domain: tokenData.hub_domain,
        token_type: tokenData.token_type
      };
    } else if (authProvider === 'airtable') {
      // Airtable token response
      console.log('Airtable token response received:', {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
      });
      
      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expiry_date: Date.now() + (tokenData.expires_in || 86400) * 1000,
        workspace_id: tokenData.workspace_id,
        user_id: tokenData.user_id
      };
    }
    
    return tokenData;
  }
}