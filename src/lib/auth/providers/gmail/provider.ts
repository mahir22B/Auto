// src/lib/auth/providers/gmail/provider.ts

import { BaseAuthProvider } from '../../provider';
import { AuthConfig, TokenData, AuthState } from '../../types';
import { GMAIL_CONFIG, GMAIL_SCOPES } from './config';

export class GmailAuthProvider extends BaseAuthProvider {
  constructor() {
    super(GMAIL_CONFIG.id, GMAIL_CONFIG.name);
  }

  async initialize(config: AuthConfig): Promise<void> {
    this.config = config;
  }

  async getAuthUrl(): Promise<string> {
    this.validateConfig();
    
    const params = new URLSearchParams({
      client_id: this.config!.clientId,
      redirect_uri: this.config!.redirectUri,
      response_type: 'code',
      scope: GMAIL_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
    });

    return `${GMAIL_CONFIG.authUrl}?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<TokenData> {
    this.validateConfig();

    const response = await fetch(GMAIL_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: this.config!.clientId,
        client_secret: this.config!.clientSecret,
        redirect_uri: this.config!.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get access token');
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      tokenType: data.token_type,
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenData> {
    this.validateConfig();

    const response = await fetch(GMAIL_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.config!.clientId,
        client_secret: this.config!.clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken, // Keep the existing refresh token
      expiresAt: Date.now() + data.expires_in * 1000,
      tokenType: data.token_type,
    };
  }

  async revokeAccess(token: string): Promise<void> {
    await fetch(GMAIL_CONFIG.revokeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token,
      }),
    });
  }

  async checkConnection(token: TokenData): Promise<AuthState> {
    try {
      // Get user profile to verify connection
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        return { isConnected: false };
      }

      const data = await response.json();
      return {
        isConnected: true,
        userEmail: data.email,
      };
    } catch (error) {
      return {
        isConnected: false,
        error: 'Failed to verify connection',
      };
    }
  }

  getRequiredScopes(): string[] {
    return [...GMAIL_SCOPES];
  }
}