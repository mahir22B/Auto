// src/app/api/auth/airtable/callback/route.ts
import { OAuthProvider } from '@/lib/auth/OAuthProvider';
import { SERVICES } from '@/lib/services';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');
  const state = searchParams.get('state');
  
  console.log('Airtable callback received:', { 
    hasCode: !!code, 
    error, 
    error_description,
    state 
  });

  // If there's an error, show it
  if (error) {
    console.error(`Airtable auth error: ${error}`, error_description);
    return Response.json({ error, error_description }, { status: 400 });
  }
  
  // Verify state (in a production app, verify against stored state)
  if (!state) {
    console.error('Missing state parameter in callback');
    return Response.json({ error: 'Invalid state parameter' }, { status: 400 });
  }
  
  const serviceId = 'airtable';
  if (!SERVICES[serviceId]) {
    return Response.json({ error: 'Invalid service' }, { status: 400 });
  }

  if (!code) {
    console.error('Missing code parameter in callback');
    return Response.json({ error: 'Invalid request - missing code' }, { status: 400 });
  }

  const auth = new OAuthProvider();
  await auth.initialize({
    clientId: process.env.AIRTABLE_CLIENT_ID!,
    clientSecret: process.env.AIRTABLE_CLIENT_SECRET!,
    baseUrl: process.env.NEXTAUTH_URL!,
    serviceId: serviceId,
  });

  try {
    // Pass both code and state to handleCallback for PKCE verification
    const tokens = await auth.handleCallback(code, state);
    console.log('Airtable tokens received:', {
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
            console.log("Storing Airtable tokens:", {
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
    console.error('Airtable auth callback error:', error);
    return Response.json({ error: 'Authentication failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}