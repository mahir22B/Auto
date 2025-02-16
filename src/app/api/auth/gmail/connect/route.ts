// src/app/api/auth/gmail/connect/route.ts
import { NextResponse } from 'next/server';
import { authRegistry } from '@/lib/auth/registry';
import { GmailAuthProvider } from '@/lib/auth/providers/gmail/provider';

// Register Gmail provider if not already registered
const gmailProvider = new GmailAuthProvider();
authRegistry.registerProvider(gmailProvider);

export async function GET() {
  try {
    await gmailProvider.initialize({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`,
      scopes: gmailProvider.getRequiredScopes(),
    });

    const authUrl = await gmailProvider.getAuthUrl();
    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error('Auth initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize authentication' },
      { status: 500 }
    );
  }
}