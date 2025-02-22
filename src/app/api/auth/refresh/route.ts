// src/app/api/auth/refresh/route.ts

import { SERVICES } from '@/lib/services';

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { service, refresh_token } = body;

    if (!SERVICES[service]) {
      return Response.json({ error: 'Invalid service' }, { status: 400 });
    }

    if (!refresh_token) {
      return Response.json({ error: 'Refresh token required' }, { status: 400 });
    }

    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return Response.json({ error: error.error_description || 'Token refresh failed' }, { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Token refresh error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}