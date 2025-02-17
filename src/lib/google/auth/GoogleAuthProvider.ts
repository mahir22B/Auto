import { GOOGLE_AUTH_ENDPOINTS, GOOGLE_SCOPES } from "./constants";

export class GoogleAuthProvider {
    private config: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      serviceId: string;
    } | null = null;
  
    async initialize(config: typeof this.config) {
      this.config = config;
    }
  
    async getAuthUrl(): Promise<string> {
      if (!this.config) throw new Error('Not initialized');
      
      const scopes = GOOGLE_SCOPES[this.config.serviceId as keyof typeof GOOGLE_SCOPES];
      
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUri,
        response_type: 'code',
        scope: scopes.join(' '),
        access_type: 'offline',
        prompt: 'consent',
      });
  
      return `${GOOGLE_AUTH_ENDPOINTS.auth}?${params.toString()}`;
    }
  
    async handleCallback(code: string) {
      if (!this.config) throw new Error('Not initialized');
  
      const response = await fetch(GOOGLE_AUTH_ENDPOINTS.token, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
          grant_type: 'authorization_code',
        }),
      });
  
      return response.json();
    }
  }