interface TokenData {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

interface RefreshResponse {
  access_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
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
      try {
        const refreshedTokens = await this.refreshToken(service, tokens);
        return refreshedTokens.access_token;
      } catch (error) {
        console.error(`Token refresh failed for ${service}:`, error);
        // If refresh fails, try using the existing token if available
        // This provides a fallback in case the refresh endpoint has temporary issues
        if (tokens.access_token) {
          console.warn(`Using potentially expired token for ${service}`);
          return tokens.access_token;
        }
        throw error;
      }
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
      console.log(`Attempting to refresh token for service: ${service}`);
      
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
        const errorData = await response.json();
        console.error('Token refresh API error:', errorData);
        throw new Error(errorData.error || 'Token refresh failed');
      }

      const refreshedData: RefreshResponse = await response.json();
      
      // Log success
      console.log(`Successfully refreshed token for ${service}`);
      
      // Update token data
      const newTokens: TokenData = {
        ...tokens,
        access_token: refreshedData.access_token,
        // If no expires_in, default to 1 hour (3600 seconds)
        expiry_date: Date.now() + ((refreshedData.expires_in || 3600) * 1000),
      };

      // Save to localStorage
      localStorage.setItem(`${service}_tokens`, JSON.stringify(newTokens));

      return newTokens;
    } catch (error) {
      console.error(`Token refresh failed for ${service}:`, error);
      
      // For debugging - add more context about the tokens
      console.error(`Token details for ${service}: access_token=${!!tokens.access_token}, refresh_token=${!!tokens.refresh_token}, expiry_date=${tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'none'}`);
      
      // Remove invalid tokens if authentication fails completely
      // Commented out to prevent premature token removal during debugging
      // localStorage.removeItem(`${service}_tokens`);
      
      throw error;
    }
  }
}