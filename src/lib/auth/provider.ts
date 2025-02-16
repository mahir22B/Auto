// src/lib/auth/provider.ts

import { AuthConfig, AuthProvider, TokenData, AuthState } from './types';

export abstract class BaseAuthProvider implements AuthProvider {
  protected config: AuthConfig | null = null;
  
  constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}

  abstract initialize(config: AuthConfig): Promise<void>;
  abstract getAuthUrl(): Promise<string>;
  abstract handleCallback(code: string): Promise<TokenData>;
  abstract refreshToken(refreshToken: string): Promise<TokenData>;
  abstract revokeAccess(token: string): Promise<void>;
  abstract checkConnection(token: TokenData): Promise<AuthState>;
  abstract getRequiredScopes(): string[];

  protected validateConfig(): void {
    if (!this.config) {
      throw new Error(`${this.name} provider not initialized`);
    }
  }

  protected isTokenExpired(expiresAt: number): boolean {
    // Check if token is expired with 5 minute buffer
    return Date.now() >= (expiresAt - 300) * 1000;
  }
}