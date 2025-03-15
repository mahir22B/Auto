import { SERVICES } from "../services";

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
    // Map service ID to auth provider (google, slack, or hubspot)
    // This allows mapping multiple services to the same auth provider
    if (!this.config) throw new Error('Not initialized');
    
    const serviceId = this.config.serviceId;
    if (serviceId === 'slack') {
      return 'slack';
    } else if (serviceId === 'hubspot') {
      return 'hubspot';
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

  async handleCallback(code: string): Promise<any> {
    if (!this.config) throw new Error('Not initialized');
    
    const authProvider = this.getAuthProvider();
    const tokenEndpoint = AUTH_ENDPOINTS[authProvider].token;
    
    console.log(`Handling ${authProvider} callback with code`);
    
    const formData = new URLSearchParams();
    formData.append('code', code);
    formData.append('client_id', this.config.clientId);
    formData.append('client_secret', this.config.clientSecret);
    formData.append('redirect_uri', this.getRedirectUri());
    
    if (authProvider === 'slack') {
      // No grant_type required for Slack
    } else if (authProvider === 'hubspot') {
      formData.append('grant_type', 'authorization_code');
    } else {
      formData.append('grant_type', 'authorization_code');
    }
    
    console.log(`Making token request to ${tokenEndpoint}`);
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Token request failed for ${authProvider}:`, errorData);
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
    }
    
    return tokenData;
  }
}