// src/app/api/slack/channels/route.ts
export async function GET(request: Request) {
  try {
    // Get the Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return Response.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    console.log('Attempting to fetch Slack channels with token');
    
    const response = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel,mpim,im&exclude_archived=true&limit=100', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!data.ok) {
      console.error('Slack API error:', data.error);
      return Response.json({ error: data.error }, { status: 400 });
    }
    
    // Filter for channels the app is a member of
    const channels = data.channels?.filter(channel => channel.is_member)
      .map((channel) => ({
        value: channel.id,
        label: channel.is_im ? `@${channel.user}` : `#${channel.name || channel.id}`
      })) || [];
    
    return Response.json(channels);
  } catch (error) {
    console.error('Error fetching Slack channels:', error);
    return Response.json(
      { error: 'Failed to fetch channels' }, 
      { status: 500 }
    );
  }
}