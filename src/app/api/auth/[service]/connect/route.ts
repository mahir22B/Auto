// src/app/api/auth/[service]/connect/route.ts

import { OAuthProvider } from '@/lib/auth/OAuthProvider';
import { SERVICES } from '@/lib/services';

export async function GET(
  request: Request,
  context: { params: { service: string } }
) {
  const { service } = context.params;
  console.log(`Auth connect route for service: ${service}`);

  if (!SERVICES[service]) {
    console.error(`Invalid service requested: ${service}`);
    return Response.json({ error: 'Invalid service' }, { status: 400 });
  }

  if (!process.env.NEXTAUTH_URL) {
    console.error('NEXTAUTH_URL environment variable is not set');
    throw new Error('NEXTAUTH_URL environment variable is not set');
  }

  console.log(`Initializing OAuthProvider for ${service}`);
  const auth = new OAuthProvider();
  
  // Use the correct client credentials based on service
  const clientId = service === 'slack' 
    ? process.env.SLACK_CLIENT_ID!
    : process.env.GOOGLE_CLIENT_ID!;
    
  const clientSecret = service === 'slack'
    ? process.env.SLACK_CLIENT_SECRET!
    : process.env.GOOGLE_CLIENT_SECRET!;
  
  console.log(`Using client ID for ${service}: ${clientId ? 'exists' : 'missing'}`);
  
  await auth.initialize({
    clientId,
    clientSecret,
    baseUrl: process.env.NEXTAUTH_URL,
    serviceId: service,
  });

  try {
    const url = await auth.getAuthUrl();
    console.log(`Generated OAuth URL for ${service}: ${url}`);
    return Response.json({ url });
  } catch (error) {
    console.error(`Error generating auth URL for ${service}:`, error);
    return Response.json(
      { error: 'Failed to generate authorization URL', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}