// src/app/api/auth/hubspot/connect/route.ts
import { OAuthProvider } from '@/lib/auth/OAuthProvider';
import { SERVICES } from '@/lib/services';

export async function GET(
  request: Request
) {
  console.log(`Auth connect route for service: hubspot`);

  if (!SERVICES.hubspot) {
    console.error(`Invalid service requested: hubspot`);
    return Response.json({ error: 'Invalid service' }, { status: 400 });
  }

  if (!process.env.NEXTAUTH_URL) {
    console.error('NEXTAUTH_URL environment variable is not set');
    throw new Error('NEXTAUTH_URL environment variable is not set');
  }

  console.log(`Initializing OAuthProvider for hubspot`);
  const auth = new OAuthProvider();
  
  // Get hubspot-specific client credentials
  const clientId = process.env.HUBSPOT_CLIENT_ID!;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET!;
  
  console.log(`Using client ID for hubspot: ${clientId ? 'exists' : 'missing'}`);
  
  await auth.initialize({
    clientId,
    clientSecret,
    baseUrl: process.env.NEXTAUTH_URL,
    serviceId: 'hubspot',
  });

  try {
    const url = await auth.getAuthUrl();
    console.log(`Generated OAuth URL for hubspot: ${url}`);
    return Response.json({ url });
  } catch (error) {
    console.error(`Error generating auth URL for hubspot:`, error);
    return Response.json(
      { error: 'Failed to generate authorization URL', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}