// src/app/api/auth/google/callback/route.ts
import { GoogleAuthProvider } from '@/lib/google/auth/GoogleAuthProvider';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return Response.json({ error: 'No code provided' }, { status: 400 });
  }

  const auth = new GoogleAuthProvider();
  await auth.initialize({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: `${process.env.NEXTAUTH_URL}/api/auth/google/callback`,
    serviceId: 'gmail',
  });

  try {
    const tokens = await auth.handleCallback(code);
    
    // Create an HTML page that stores tokens and sends a message to the opener
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <script>
            // Store tokens in localStorage
            localStorage.setItem('gmail_tokens', '${JSON.stringify(tokens)}');
            
            // Notify the opener window and close
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ 
                  type: 'gmail_auth_success',
                  tokens: ${JSON.stringify(tokens)}
                }, '*');
              }
            } catch (e) {
              // If postMessage fails, the main window will still check localStorage
              console.error('Error sending message to opener:', e);
            } finally {
              // Close after a short delay to ensure message is sent
              setTimeout(() => window.close(), 1000);
            }
          </script>
          <div style="text-align: center; font-family: sans-serif; padding-top: 2rem;">
            <h3>Authentication Successful!</h3>
            <p>This window will close automatically.</p>
          </div>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Auth callback error:', error);
    return Response.json({ error: 'Authentication failed' }, { status: 500 });
  }
}