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
    serviceId: 'gmail', // This doesn't matter for callback
  });

  const tokens = await auth.handleCallback(code);
  return Response.json({ success: true, tokens });
}