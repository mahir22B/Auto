// src/lib/auth/registry.ts

import { AuthProvider, ProviderRegistry } from './types';

class AuthProviderRegistry {
  private providers: ProviderRegistry = {};

  registerProvider(provider: AuthProvider): void {
    if (this.providers[provider.id]) {
      throw new Error(`Provider ${provider.id} is already registered`);
    }
    this.providers[provider.id] = provider;
  }

  getProvider(providerId: string): AuthProvider {
    const provider = this.providers[providerId];
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }
    return provider;
  }

  listProviders(): Array<{ id: string; name: string }> {
    return Object.values(this.providers).map(({ id, name }) => ({ id, name }));
  }
}

// Export a singleton instance
export const authRegistry = new AuthProviderRegistry();