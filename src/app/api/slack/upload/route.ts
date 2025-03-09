// src/app/api/slack/upload/route.ts

export async function POST(request: Request) {
    try {
      const formData = await request.formData();
      const token = formData.get('token') as string;
      
      if (!token) {
        return Response.json({ ok: false, error: 'Missing token' }, { status: 400 });
      }
      
      // Remove the token from the form data before forwarding
      formData.delete('token');
      
      console.log('Proxying file upload to Slack');
      
      // Log the form data keys for debugging
      console.log('FormData keys:', Array.from(formData.keys()));
      
      // Forward the request to Slack
      const response = await fetch('https://slack.com/api/files.upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
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
      console.log('Slack file upload response:', data.ok ? 'Success' : 'Failed');
      
      return Response.json(data);
    } catch (error) {
      console.error('Slack upload proxy error:', error);
      return Response.json(
        { ok: false, error: 'Upload proxy request failed', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  }