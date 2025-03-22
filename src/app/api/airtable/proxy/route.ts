// src/app/api/airtable/proxy/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { endpoint, method, headers, body } = await request.json();
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }
    
    // Build the full Airtable API URL
    const baseUrl = 'https://api.airtable.com';
    const url = `${baseUrl}/${endpoint}`;
    console.log(`Proxying Airtable API request to: ${url}`);
    
    const requestOptions: RequestInit = {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (body) {
      requestOptions.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, requestOptions);
    
    // Check if the response is OK
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable API returned an error:', response.status, errorText);
      return NextResponse.json({ 
        error: `Airtable API error: ${response.status}`,
        details: errorText
      }, { status: response.status });
    }
    
    // Return the response from Airtable
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Airtable proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}