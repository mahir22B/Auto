// src/lib/auth/types.ts

export interface AuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
  }
  
  export interface TokenData {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    tokenType: string;
  }
  
  export interface AuthState {
    isConnected: boolean;
    userEmail?: string;
    error?: string;
  }
  
  export interface AuthProvider {
    // Provider identification
    readonly id: string;
    readonly name: string;
    
    // Core authentication methods
    initialize(config: AuthConfig): Promise<void>;
    getAuthUrl(): Promise<string>;
    handleCallback(code: string): Promise<TokenData>;
    refreshToken(refreshToken: string): Promise<TokenData>;
    revokeAccess(token: string): Promise<void>;
    
    // Status and utility methods
    checkConnection(token: TokenData): Promise<AuthState>;
    getRequiredScopes(): string[];
  }
  
  // Provider Registry type
  export interface ProviderRegistry {
    [key: string]: AuthProvider;
  }