interface TokenData {
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
  }
  
  interface RefreshResponse {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
  }
  
  export class TokenManager {
    private static readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
  
    static async getValidToken(service: string): Promise<string> {
      const tokensStr = localStorage.getItem(`${service}_tokens`);
      if (!tokensStr) {
        throw new Error(`No tokens found for service: ${service}`);
      }
  
      const tokens: TokenData = JSON.parse(tokensStr);
      
      // Check if token needs refresh
      if (this.shouldRefreshToken(tokens)) {
        const refreshedTokens = await this.refreshToken(service, tokens);
        return refreshedTokens.access_token;
      }
  
      return tokens.access_token;
    }
  
    private static shouldRefreshToken(tokens: TokenData): boolean {
      if (!tokens.expiry_date) return true;
      
      const now = Date.now();
      return tokens.expiry_date - now < this.REFRESH_THRESHOLD;
    }
  
    private static async refreshToken(service: string, tokens: TokenData): Promise<TokenData> {
      if (!tokens.refresh_token) {
        throw new Error('No refresh token available');
      }
  
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            service,
            refresh_token: tokens.refresh_token,
          }),
        });
  
        if (!response.ok) {
          throw new Error('Token refresh failed');
        }
  
        const refreshedData: RefreshResponse = await response.json();
        
        // Update token data
        const newTokens: TokenData = {
          ...tokens,
          access_token: refreshedData.access_token,
          expiry_date: Date.now() + (refreshedData.expires_in * 1000),
        };
  
        // Save to localStorage
        localStorage.setItem(`${service}_tokens`, JSON.stringify(newTokens));
  
        return newTokens;
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Remove invalid tokens
        localStorage.removeItem(`${service}_tokens`);
        throw error;
      }
    }
  }