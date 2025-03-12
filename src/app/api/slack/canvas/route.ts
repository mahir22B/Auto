// src/app/api/slack/canvas/route.ts

export async function POST(request: Request) {
    try {
      const { operation, token, payload } = await request.json();
      
      if (!token) {
        return Response.json({ error: 'Missing authentication token' }, { status: 401 });
      }
      
      if (!operation) {
        return Response.json({ error: 'Missing operation parameter' }, { status: 400 });
      }
      
      let endpoint;
      switch (operation) {
        case 'create':
          endpoint = 'https://slack.com/api/canvas.create';
          break;
        case 'share':
          endpoint = 'https://slack.com/api/canvas.share';
          break;
        case 'update':
          endpoint = 'https://slack.com/api/canvas.update';
          break;
        default:
          return Response.json({ error: 'Invalid operation' }, { status: 400 });
      }
      
      console.log(`Processing Slack canvas ${operation} operation`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Slack API error: ${response.status}`, errorText);
        return Response.json({ 
          ok: false, 
          error: `Slack API error: ${response.status}`,
          details: errorText
        }, { status: response.status });
      }
      
      const data = await response.json();
      console.log(`Slack canvas ${operation} response:`, data.ok ? 'Success' : `Failed: ${data.error}`);
      
      return Response.json(data);
    } catch (error) {
      console.error('Slack canvas API error:', error);
      return Response.json(
        { 
          ok: false, 
          error: 'Canvas operation failed', 
          details: error instanceof Error ? error.message : String(error) 
        },
        { status: 500 }
      );
    }
  }