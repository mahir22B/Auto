// src/app/api/auth/hubspot/callback/route.ts
import { OAuthProvider } from '@/lib/auth/OAuthProvider';
import { SERVICES } from '@/lib/services';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  console.log('HubSpot callback received:', { code: !!code, state });

  if (!code) {
    return Response.json({ error: 'Invalid request - missing code' }, { status: 400 });
  }

  const serviceId = 'hubspot';
  if (!SERVICES[serviceId]) {
    return Response.json({ error: 'Invalid service' }, { status: 400 });
  }

  const auth = new OAuthProvider();
  await auth.initialize({
    clientId: process.env.HUBSPOT_CLIENT_ID!,
    clientSecret: process.env.HUBSPOT_CLIENT_SECRET!,
    baseUrl: process.env.NEXTAUTH_URL!,
    serviceId: serviceId,
  });

  try {
    const tokens = await auth.handleCallback(code);
    console.log('HubSpot tokens received:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      expiryTime: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'none'
    });
    
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <script>
            const tokens = ${JSON.stringify(tokens)};
            console.log("Storing HubSpot tokens:", {
              hasAccessToken: !!tokens.access_token,
              hasRefreshToken: !!tokens.refresh_token,
              expiryDate: tokens.expiry_date 
            });
            localStorage.setItem('${serviceId}_tokens', JSON.stringify(tokens));
            
            try {
              window.opener.postMessage({ 
                type: '${serviceId}_auth_success',
                tokens: tokens
              }, '*');
            } catch (e) {
              console.error('Error sending message:', e);
            }

            setTimeout(() => window.close(), 1000);
          </script>
          <div style="text-align: center; font-family: sans-serif; padding-top: 2rem;">
            <h3>Authentication Successful!</h3>
            <p>This window will close automatically.</p>
          </div>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('HubSpot auth callback error:', error);
    return Response.json({ error: 'Authentication failed' }, { status: 500 });
  }
}