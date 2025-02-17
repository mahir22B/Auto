import { GoogleAuthProvider } from '@/lib/google/auth/GoogleAuthProvider';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const service = searchParams.get('service') || '';

  const auth = new GoogleAuthProvider();
  await auth.initialize({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: `${process.env.NEXTAUTH_URL}/api/auth/google/callback`,
    serviceId: service,
  });

  const url = await auth.getAuthUrl();
  return Response.json({ url });
}