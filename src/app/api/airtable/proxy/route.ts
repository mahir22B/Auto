// src/app/api/airtable/proxy/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { endpoint, method, headers, body } = await request.json();
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }
    
    // Build the full Airtable API URL with version
    const baseUrl = 'https://api.airtable.com';
    
    // Check if the endpoint already includes the API version
    const url = endpoint.startsWith('v') 
      ? `${baseUrl}/${endpoint}` 
      : `${baseUrl}/v0/${endpoint}`; // Use v0 as the default API version
    
    console.log(`[Airtable Proxy] Making request to: ${url}`);
    
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
    
    console.log(`[Airtable Proxy] Request options:`, {
      method: requestOptions.method,
      headers: Object.keys(requestOptions.headers),
      hasBody: !!requestOptions.body
    });
    
    const response = await fetch(url, requestOptions);
    
    // Check if the response is OK
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Airtable Proxy] Error ${response.status}:`, errorText);
      
      let parsedError = errorText;
      try {
        // Try to parse the error as JSON for better debugging
        parsedError = JSON.parse(errorText);
      } catch (e) {
        // If it's not valid JSON, keep the original text
      }
      
      return NextResponse.json({ 
        error: `Airtable API error: ${response.status}`,
        details: parsedError
      }, { status: response.status });
    }
    
    // Return the response from Airtable
    const data = await response.json();
    
    console.log(`[Airtable Proxy] Success:`, {
      responseType: typeof data,
      hasRecords: !!data.records,
      recordCount: data.records?.length
    });
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Airtable Proxy] Request failed:', error);
    return NextResponse.json(
      { error: 'Proxy request failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}