// src/app/api/auth/gmail/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authRegistry } from '@/lib/auth/registry';
import { GmailAuthProvider } from '@/lib/auth/providers/gmail/provider';

// Register Gmail provider if not already registered
const gmailProvider = new GmailAuthProvider();
authRegistry.registerProvider(gmailProvider);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    
    console.log('Received callback with code:', code);
    
    if (!code) {
      console.error('No code received in callback');
      return NextResponse.json(
        { error: 'Authorization code missing' },
        { status: 400 }
      );
    }

    // Initialize the provider with credentials
    await gmailProvider.initialize({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`,
      scopes: gmailProvider.getRequiredScopes(),
    });

    console.log('Provider initialized');

    const tokens = await gmailProvider.handleCallback(code);
    console.log('Tokens received successfully');
    
    return NextResponse.json({ 
      success: true,
      tokens 
    });
  } catch (error) {
    console.error('Callback handling error:', error);
    return NextResponse.json(
      { error: 'Failed to handle callback', details: error },
      { status: 500 }
    );
  }
}