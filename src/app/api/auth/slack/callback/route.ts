import { OAuthProvider } from '@/lib/auth/OAuthProvider';
import { SERVICES } from '@/lib/services';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // This will have the actual service ID

  if (!code || !state || !SERVICES[state]) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const auth = new OAuthProvider();
  await auth.initialize({
    clientId: process.env.SLACK_CLIENT_ID!,
    clientSecret: process.env.SLACK_CLIENT_SECRET!,
    baseUrl: process.env.NEXTAUTH_URL!,
    serviceId: state,
  });

  try {
    const tokens = await auth.handleCallback(code);
    
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <script>
            const tokens = ${JSON.stringify(tokens)};
            localStorage.setItem('${state}_tokens', JSON.stringify(tokens));
            
            try {
              window.opener.postMessage({ 
                type: '${state}_auth_success',
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
    console.error('Auth callback error:', error);
    return Response.json({ error: 'Authentication failed' }, { status: 500 });
  }
}