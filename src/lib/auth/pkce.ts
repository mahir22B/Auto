// src/lib/auth/pkce.ts
// PKCE (Proof Key for Code Exchange) utilities

/**
 * Generates a random string for PKCE code verifier
 * @returns A random string of 43-128 characters
 */
export function generateCodeVerifier(): string {
    const array = new Uint8Array(64);
    crypto.getRandomValues(array);
    return base64UrlEncode(array);
  }
  
  /**
   * Generates a code challenge from a code verifier using SHA-256
   * @param verifier The code verifier
   * @returns A promise that resolves to the code challenge
   */
  export async function generateCodeChallenge(verifier: string): Promise<string> {
    // Convert verifier to UTF-8 ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    
    // Hash the verifier with SHA-256
    const digest = await crypto.subtle.digest('SHA-256', data);
    
    // Convert to Base64URL encoding
    return base64UrlEncode(new Uint8Array(digest));
  }
  
  /**
   * Encodes an ArrayBuffer to Base64URL format
   * @param buffer The ArrayBuffer to encode
   * @returns Base64URL encoded string
   */
  function base64UrlEncode(buffer: Uint8Array): string {
    // First, convert to base64
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    
    // Then convert base64 to base64url by replacing characters
    return base64
      .replace(/\+/g, '-')  // Replace + with -
      .replace(/\//g, '_')  // Replace / with _
      .replace(/=+$/, '');  // Remove trailing =
  }
  
  // For server-side use (Node.js environment)
  export async function generateCodeVerifierServer(): Promise<string> {
    // In Node.js, we need to use the crypto module
    const crypto = require('crypto');
    const verifier = crypto.randomBytes(64).toString('base64url').substring(0, 128);
    return verifier;
  }
  
  export async function generateCodeChallengeServer(verifier: string): Promise<string> {
    const crypto = require('crypto');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
    return challenge;
  }