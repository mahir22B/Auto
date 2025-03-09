// src/app/api/slack/proxy/route.ts

export async function POST(request: Request) {
  try {
    const { endpoint, method, headers, body } = await request.json();
    
    if (!endpoint) {
      return Response.json({ ok: false, error: 'Missing endpoint' }, { status: 400 });
    }
    
    const url = `https://slack.com/api/${endpoint}`;
    console.log(`Proxying Slack API request to: ${url}`);
    
    const requestOptions: RequestInit = {
      method: method || 'POST',
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
      console.error('Slack API returned an error:', response.status, errorText);
      return Response.json({ 
        ok: false, 
        error: `Slack API error: ${response.status}`,
        details: errorText
      }, { status: 502 });
    }
    
    // Return the response from Slack
    const data = await response.json();
    
    // Log the result (success or failure)
    console.log(`Slack API response for ${endpoint}:`, data.ok ? 'Success' : `Failed: ${data.error}`);
    
    return Response.json(data);
  } catch (error) {
    console.error('Slack proxy error:', error);
    return Response.json(
      { ok: false, error: 'Proxy request failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}