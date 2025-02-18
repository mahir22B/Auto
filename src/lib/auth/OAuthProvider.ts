import { SERVICES } from "../services";

const AUTH_ENDPOINTS = {
    google: {
      auth: 'https://accounts.google.com/o/oauth2/v2/auth',
      token: 'https://oauth2.googleapis.com/token'
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
      // Always use /google/ in the actual redirect URL for Google OAuth
      return `${this.config.baseUrl.replace(/\/$/, '')}/api/auth/google/callback`;
    }
  
    async getAuthUrl(): Promise<string> {
      if (!this.config) throw new Error('Not initialized');
      
      const service = SERVICES[this.config.serviceId];
      if (!service) throw new Error('Invalid service');
      
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        redirect_uri: this.getRedirectUri(),
        response_type: 'code',
        scope: service.authScopes.join(' '),
        access_type: 'offline',
        prompt: 'consent',
        // Store the actual service in state parameter
        state: this.config.serviceId
      });
  
      return `${AUTH_ENDPOINTS.google.auth}?${params.toString()}`;
    }
  
    async handleCallback(code: string) {
      if (!this.config) throw new Error('Not initialized');
  
      const response = await fetch(AUTH_ENDPOINTS.google.token, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.getRedirectUri(),
          grant_type: 'authorization_code',
        }),
      });
  
      return response.json();
    }
  }