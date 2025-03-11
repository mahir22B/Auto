// src/app/api/slack/upload/route.ts

export async function POST(request: Request) {
    try {
      const formData = await request.formData();
      const token = formData.get('token') as string;
      const channels = formData.get('channels') as string;
      const filename = formData.get('filename') as string;
      const fileBlob = formData.get('file') as Blob;
      const threadTs = formData.get('thread_ts') as string | null;
      const initialComment = formData.get('initial_comment') as string | null;
      
      if (!token) {
        return Response.json({ ok: false, error: 'Missing token' }, { status: 400 });
      }
      
      if (!fileBlob) {
        return Response.json({ ok: false, error: 'Missing file data' }, { status: 400 });
      }
      
      if (!channels) {
        return Response.json({ ok: false, error: 'Missing channel ID' }, { status: 400 });
      }
      
      console.log('Starting Slack file upload process with V2 API...');
      console.log('File information:', {
        filename,
        fileSize: fileBlob.size,
        type: fileBlob.type,
        channelId: channels,
        hasThreadTs: !!threadTs,
        hasInitialComment: !!initialComment
      });
      
      // Step 1: Get an upload URL from Slack
      const requestBody = {
        filename: filename,
        length: fileBlob.size
      };
      
      console.log('Requesting upload URL with:', requestBody);
      
      const getUrlResponse = await fetch('https://slack.com/api/files.getUploadURLExternal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!getUrlResponse.ok) {
        const error = await getUrlResponse.text();
        console.error('HTTP error getting upload URL:', getUrlResponse.status, error);
        return Response.json({ 
          ok: false, 
          error: `HTTP error (${getUrlResponse.status}) getting upload URL: ${error}`
        }, { status: getUrlResponse.status });
      }
      
      const urlData = await getUrlResponse.json();
      console.log('API response from getUploadURLExternal:', urlData);
      
      if (!urlData.ok) {
        console.error('API error getting upload URL:', urlData.error, urlData);
        return Response.json({ 
          ok: false, 
          error: `API error getting upload URL: ${urlData.error}`,
          details: urlData
        }, { status: 400 });
      }
      
      const { upload_url, file_id } = urlData;
      console.log('Successfully got upload URL and file_id:', { upload_url, file_id });
      
      // Step 2: Upload the file content to the provided URL
      console.log('Uploading file content to URL...');
      const uploadResponse = await fetch(upload_url, {
        method: 'POST',
        body: fileBlob
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('File content upload failed:', uploadResponse.status, errorText);
        return Response.json({ 
          ok: false, 
          error: `File content upload failed: ${uploadResponse.status} ${errorText}`
        }, { status: uploadResponse.status });
      }
      
      console.log('File content uploaded successfully, now completing the process...');
      
      // Step 3: Complete the upload process
      const completeUploadBody = {
        files: [{ 
          id: file_id, 
          title: filename 
        }],
        channel_id: channels
      };
      
      if (threadTs) {
        completeUploadBody['thread_ts'] = threadTs;
      }
      
      if (initialComment) {
        completeUploadBody['initial_comment'] = initialComment;
      }
      
      console.log('Completing upload with:', completeUploadBody);
      
      const completeResponse = await fetch('https://slack.com/api/files.completeUploadExternal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(completeUploadBody)
      });
      
      if (!completeResponse.ok) {
        const errorText = await completeResponse.text();
        console.error('HTTP error completing file upload:', completeResponse.status, errorText);
        return Response.json({ 
          ok: false, 
          error: `HTTP error (${completeResponse.status}) completing file upload: ${errorText}`
        }, { status: completeResponse.status });
      }
      
      const completeData = await completeResponse.json();
      console.log('API response from completeUploadExternal:', completeData);
      
      if (!completeData.ok) {
        console.error('API error completing file upload:', completeData.error, completeData);
        return Response.json({ 
          ok: false, 
          error: `API error completing file upload: ${completeData.error}`,
          details: completeData
        }, { status: 400 });
      }
      
      console.log('File upload completed successfully');
      
      // Return the complete data which has the files information
      return Response.json(completeData);
    } catch (error) {
      console.error('Slack upload proxy error:', error);
      return Response.json(
        { ok: false, error: 'Upload proxy request failed', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  }