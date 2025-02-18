import { OAuthProvider } from '@/lib/auth/OAuthProvider';
import { SERVICES } from '@/lib/services';

export async function GET(
  request: Request,
  { params }: { params: { service: string } }
) {
  const service = params.service;

  if (!SERVICES[service]) {
    return Response.json({ error: 'Invalid service' }, { status: 400 });
  }

  if (!process.env.NEXTAUTH_URL) {
    throw new Error('NEXTAUTH_URL environment variable is not set');
  }

  const auth = new OAuthProvider();
  await auth.initialize({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    baseUrl: process.env.NEXTAUTH_URL,
    serviceId: service,
  });

  const url = await auth.getAuthUrl();
  return Response.json({ url });
}