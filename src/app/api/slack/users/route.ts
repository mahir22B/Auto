// src/app/api/slack/users/route.ts
export async function GET(request: Request) {
    try {
      // Get the Authorization header
      const authHeader = request.headers.get('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('Missing or invalid Authorization header');
        return Response.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
      }
      
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      console.log('Attempting to fetch Slack users with token');
      
      // Make a request to the Slack users.list API
      const response = await fetch('https://slack.com/api/users.list', {
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
      
      // Filter out bots and inactive users, and format the response
      const users = data.members
        ?.filter((user: any) => {
          return !user.is_bot && // Not a bot
                 !user.deleted && // Not deleted
                 !user.is_restricted && // Not a guest account
                 !user.is_ultra_restricted; // Not a single-channel guest
        })
        .map((user: any) => ({
          value: user.id,
          label: `${user.profile?.real_name || user.name} - ${user.id}`
        })) || [];
      
      return Response.json(users);
    } catch (error) {
      console.error('Error fetching Slack users:', error);
      return Response.json(
        { error: 'Failed to fetch users' }, 
        { status: 500 }
      );
    }
  }