import { ExecutorContext, ExecutionResult } from "../executors/types";
import { AbstractExecutor } from "../executors/AbstractExecutor";
import { SlackConfig, SlackMessage, SlackReadMessagesResult } from "./types";

interface FileAttachment {
  name: string;
  content: ArrayBuffer | string;
  type: string;
}

export class SlackExecutor extends AbstractExecutor {
  private async makeSlackRequest(endpoint: string, options: RequestInit, context: ExecutorContext) {
    try {
      // Extract the Authorization header
      const authHeader = options.headers ? 
        (options.headers as Record<string, string>)['Authorization'] : 
        `Bearer ${context.tokens.access_token}`;
      
      // Use the proxy instead of direct API call
      const response = await fetch('/api/slack/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint,
          method: options.method || 'GET',
          headers: {
            'Authorization': authHeader
          },
          body: options.body ? JSON.parse(options.body as string) : undefined
        })
      });
      
      return response.json();
    } catch (error) {
      console.error('Error making slack request via proxy:', error);
      throw new Error(`Slack API request failed: ${error.message}`);
    }
  }

  private async uploadFileViaProxy(formData: FormData, context: ExecutorContext) {
    try {
      // Create a new FormData to send to our proxy
      const proxyFormData = new FormData();
      
      // Add token separately
      proxyFormData.append('token', context.tokens.access_token);
      
      // Add all other form data fields
      for (const [key, value] of formData.entries()) {
        proxyFormData.append(key, value);
      }
      
      const response = await fetch('/api/slack/upload', {
        method: 'POST',
        body: proxyFormData
      });
      
      return response.json();
    } catch (error) {
      console.error('Error uploading file via proxy:', error);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  private async getChannels(context: ExecutorContext): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await this.makeSlackRequest(
        "conversations.list?types=public_channel,private_channel",
        { method: "GET" },
        context
      );

      if (!response.ok) {
        throw new Error(response.error || "Failed to fetch channels");
      }

      return response.channels.map((channel: any) => ({
        id: channel.id,
        name: channel.name
      }));
    } catch (error) {
      console.error("Error fetching Slack channels:", error);
      return [];
    }
  }

  private async sendMessageWithAttachments(
    context: ExecutorContext,
    config: SlackConfig,
    attachments: FileAttachment[]
  ): Promise<ExecutionResult> {
    try {
      // Prepare message params
      const message = this.getInputValueOrConfig(context, 'input_message', config, 'message');
      const threadId = this.getInputValueOrConfig(context, 'input_threadId', config, 'threadId');
      
      if (!message && attachments.length === 0) {
        throw new Error("Message or attachments required");
      }

      // Get target ID based on target type (channel or user)
      const targetType = config.targetType || 'channel';
      const targetId = targetType === 'channel' 
                      ? config.channelId 
                      : config.userId;

      if (!targetId) {
        throw new Error(`${targetType === 'channel' ? 'Channel' : 'User'} ID is required`);
      }

      const messageParams: any = {
        channel: targetId, // Slack API uses 'channel' param even for direct messages
        text: message || "Attached file(s)",
      };

      // Add thread_ts if provided
      if (threadId) {
        messageParams.thread_ts = threadId;
      }

      // If no attachments, just send the regular message
      if (attachments.length === 0) {
        const response = await this.makeSlackRequest(
          "chat.postMessage",
          {
            method: "POST",
            body: JSON.stringify(messageParams)
          },
          context
        );

        if (!response.ok) {
          throw new Error(response.error || "Failed to send message");
        }

        return {
          success: true,
          data: {
            output_threadId: response.ts,
            channel: response.channel,
            message: message,
            displayText: `Message sent to ${targetType === 'channel' ? 'channel' : 'user'}`,
            _output_types: {
              output_threadId: 'string'
            }
          }
        };
      }

      // Otherwise, use the new two-step file upload for each attachment via proxy
      const uploadResults = await Promise.all(
        attachments.map(async (file, index) => {
          // Create FormData for file upload
          const formData = new FormData();
          formData.append('channels', targetId); // Note: API expects channel_id but we handle this in the proxy
          formData.append('filename', file.name);
          
          // Convert content to Blob if it's ArrayBuffer
          let fileBlob;
          if (file.content instanceof ArrayBuffer) {
            fileBlob = new Blob([file.content], { type: file.type });
          } else if (typeof file.content === 'string') {
            // If it's base64, convert to Blob
            const base64Content = file.content.replace(/^data:.*?;base64,/, '');
            const binaryContent = atob(base64Content);
            const uint8Array = new Uint8Array(binaryContent.length);
            for (let i = 0; i < binaryContent.length; i++) {
              uint8Array[i] = binaryContent.charCodeAt(i);
            }
            fileBlob = new Blob([uint8Array], { type: file.type });
          } else {
            throw new Error(`Unsupported file content type for ${file.name}`);
          }
          
          formData.append('file', fileBlob);
          
          // Add thread_ts if in a thread
          if (threadId) {
            formData.append('thread_ts', threadId);
          }
          
          // Add initial_comment if this is the first file and we have a message
          if (index === 0 && message) {
            formData.append('initial_comment', message);
          }
          
          // Use proxy for file upload instead of direct API call
          const data = await this.uploadFileViaProxy(formData, context);
          
          if (!data.ok) {
            throw new Error(`Failed to upload file ${file.name}: ${data.error || 'Unknown error'}`);
          }
          
          return data;
        })
      );

      // Return the thread ID from the first upload (or from the last if multiple)
      const lastUpload = uploadResults[uploadResults.length - 1];
      
      // In the V2 API, the files property contains an array of file objects
      const resultThreadId = 
        // Try to get thread TS from various possible locations in the response
        lastUpload.files?.[0]?.shares?.public?.[targetId]?.[0]?.ts ||
        lastUpload.files?.[0]?.ts ||
        lastUpload.files?.[0]?.id ||
        '';

      const fileIds = uploadResults.flatMap(r => {
        if (r.files && r.files.length > 0) {
          return r.files.map((f: any) => f.id);
        }
        return [];
      }).filter(Boolean);
      
      return {
        success: true,
        data: {
          output_threadId: resultThreadId,
          channel: targetId,
          message: message,
          displayText: `Message with ${attachments.length} attachment(s) sent to ${targetType === 'channel' ? 'channel' : 'user'}`,
          fileIds: fileIds,
          _output_types: {
            output_threadId: 'string'
          }
        }
      };
    } catch (error) {
      console.error("Error sending message with attachments:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to send message with attachments",
          details: error
        }
      };
    }
  }

  private async processLocalAttachments(config: SlackConfig): Promise<FileAttachment[]> {
    if (!config.localAttachments || config.localAttachments.length === 0) {
      return [];
    }
    
    const attachments: FileAttachment[] = [];
    
    for (const file of config.localAttachments) {
      // Read the file content
      const content = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
      
      attachments.push({
        name: file.name,
        content,
        type: file.type
      });
    }
    
    return attachments;
  }

  private async processAttachmentsFromPort(context: ExecutorContext): Promise<FileAttachment[]> {
    if (!context.inputData || !context.inputData.input_attachments) {
      return [];
    }
    
    const attachmentData = context.inputData.input_attachments;
    const attachments: FileAttachment[] = [];
    
    if (Array.isArray(attachmentData)) {
      // If it's an array of files or file references
      for (const item of attachmentData) {
        if (typeof item === 'string') {
          // Assume it's a base64 encoded string
          const match = item.match(/^data:(.*?);base64,/);
          const mimeType = match ? match[1] : 'application/octet-stream';
          const filename = `file-${Date.now()}.${mimeType.split('/')[1] || 'bin'}`;
          
          attachments.push({
            name: filename,
            content: item,
            type: mimeType
          });
        } else if (item && typeof item === 'object') {
          // It's a file reference object
          attachments.push({
            name: item.name || `file-${Date.now()}`,
            content: item.content || item.data || item.base64 || '',
            type: item.type || item.mimeType || 'application/octet-stream'
          });
        }
      }
    } else if (typeof attachmentData === 'string') {
      // Single base64 string
      const match = attachmentData.match(/^data:(.*?);base64,/);
      const mimeType = match ? match[1] : 'application/octet-stream';
      const filename = `file-${Date.now()}.${mimeType.split('/')[1] || 'bin'}`;
      
      attachments.push({
        name: filename,
        content: attachmentData,
        type: mimeType
      });
    } else if (attachmentData && typeof attachmentData === 'object') {
      // Single file reference object
      attachments.push({
        name: attachmentData.name || `file-${Date.now()}`,
        content: attachmentData.content || attachmentData.data || attachmentData.base64 || '',
        type: attachmentData.type || attachmentData.mimeType || 'application/octet-stream'
      });
    }
    
    return attachments;
  }

  private async readMessages(
    context: ExecutorContext,
    config: SlackConfig
  ): Promise<ExecutionResult> {
    try {
      const channelId = config.channelId;
      
      if (!channelId) {
        throw new Error("Channel ID is required");
      }
      
      // Set defaults if not specified
      const retrievalMethod = config.retrievalMethod || 'count';
      const messageCount = config.messageCount || 10;
      const messageInformation = config.messageInformation || ['Messages'];
      
      // Build API parameters based on retrieval method
      let apiParams: string;
      
      if (retrievalMethod === 'count') {
        // Get messages by count
        apiParams = `channel=${channelId}&limit=${messageCount}`;
      } else {
        // Get messages by date range
        if (!config.startDate || !config.endDate) {
          throw new Error("Start date and end date are required for date range retrieval");
        }
        
        // Convert dates to unix timestamps
        const startTimestamp = Math.floor(new Date(config.startDate).getTime() / 1000);
        const endTimestamp = Math.floor(new Date(config.endDate).getTime() / 1000) + 86399; // Add seconds to include the entire end date
        
        apiParams = `channel=${channelId}&oldest=${startTimestamp}&latest=${endTimestamp}`;
      }
      
      // Call the Slack API to get messages
      const response = await this.makeSlackRequest(
        `conversations.history?${apiParams}`,
        { method: "GET" },
        context
      );
      
      if (!response.ok) {
        throw new Error(response.error || "Failed to fetch messages");
      }
      
      // Process messages
      const messages = response.messages || [];
      
      if (messages.length === 0) {
        return {
          success: true,
          data: {
            messages: [],
            messageCount: 0,
            displayText: `No messages found in the channel with the specified criteria`
          }
        };
      }
      
      // Get channel metadata for display names
      const channelInfoResponse = await this.makeSlackRequest(
        `conversations.info?channel=${channelId}`,
        { method: "GET" },
        context
      );
      
      const channelName = channelInfoResponse.ok ? channelInfoResponse.channel.name : "unknown-channel";
      
      // Create a map to store user IDs to fetch their details
      const userIds = new Set<string>();
      messages.forEach((msg: any) => {
        if (msg.user) userIds.add(msg.user);
      });
      
      // Fetch user details if needed
      let userMap: Record<string, string> = {};
      if (messageInformation.includes('Sender Names') && userIds.size > 0) {
        // Build a user ID to name mapping
        for (const userId of userIds) {
          try {
            const userInfoResponse = await this.makeSlackRequest(
              `users.info?user=${userId}`,
              { method: "GET" },
              context
            );
            
            if (userInfoResponse.ok) {
              userMap[userId] = userInfoResponse.user.real_name || userInfoResponse.user.name || userId;
            } else {
              userMap[userId] = userId; // Fallback to ID if name can't be fetched
            }
          } catch (error) {
            console.error(`Error fetching user info for ${userId}:`, error);
            userMap[userId] = userId; // Fallback to ID
          }
        }
      }
      
      // Extract requested information
      const result: SlackReadMessagesResult = {
        messages: []
      };
      
      // Transform raw messages to our format
      result.messages = messages.map((msg: any) => ({
        id: msg.client_msg_id || msg.ts,
        ts: msg.ts,
        text: msg.text || '',
        user: msg.user || 'unknown',
        username: userMap[msg.user] || msg.username || '',
        threadTs: msg.thread_ts,
        attachments: msg.attachments || [],
        files: msg.files || [],
        channel: channelId,
        channelName: channelName,
        permalink: msg.permalink || `https://slack.com/archives/${channelId}/p${msg.ts.replace('.', '')}`
      }));
      
      // Extract selected information based on user's configuration
      const extractedData: Record<string, any[]> = {};
      
      if (messageInformation.includes('Messages')) {
        extractedData.messageTexts = result.messages.map(msg => msg.text);
        extractedData.output_messages = result.messages.map(msg => msg.text);
      }
      
      if (messageInformation.includes('Attachment Names')) {
        extractedData.attachmentNames = result.messages.flatMap(msg => 
          msg.files?.map(file => file.name) || []
        );
        extractedData.output_attachment_names = extractedData.attachmentNames;
      }
      
      if (messageInformation.includes('Thread IDs')) {
        extractedData.threadIds = result.messages
          .filter(msg => msg.threadTs)
          .map(msg => msg.threadTs as string);
        extractedData.output_thread_ids = extractedData.threadIds;
      }
      
      if (messageInformation.includes('Sender Names')) {
        extractedData.senderNames = result.messages.map(msg => msg.username);
        extractedData.output_sender_names = extractedData.senderNames;
      }
      
      if (messageInformation.includes('Thread Links')) {
        extractedData.threadLinks = result.messages.map(msg => msg.permalink);
        extractedData.output_thread_links = extractedData.threadLinks;
      }
      
      if (messageInformation.includes('Channel Names')) {
        extractedData.channelNames = result.messages.map(msg => msg.channelName);
        extractedData.output_channel_names = extractedData.channelNames;
      }
      
      if (messageInformation.includes('Channel IDs')) {
        extractedData.channelIds = result.messages.map(msg => msg.channel);
        extractedData.output_channel_ids = extractedData.channelIds;
      }
      
      // Add output types for type checking
      const outputTypes: Record<string, string> = {};
      
      if (extractedData.output_messages) outputTypes.output_messages = 'string_array';
      if (extractedData.output_attachment_names) outputTypes.output_attachment_names = 'string_array';
      if (extractedData.output_thread_ids) outputTypes.output_thread_ids = 'string_array';
      if (extractedData.output_sender_names) outputTypes.output_sender_names = 'string_array';
      if (extractedData.output_thread_links) outputTypes.output_thread_links = 'string_array';
      if (extractedData.output_channel_names) outputTypes.output_channel_names = 'string_array';
      if (extractedData.output_channel_ids) outputTypes.output_channel_ids = 'string_array';
      
      return {
        success: true,
        data: {
          ...result,
          ...extractedData,
          messageCount: messages.length,
          channelName,
          displayText: `Retrieved ${messages.length} messages from ${channelName}`,
          _output_types: outputTypes
        }
      };
    } catch (error) {
      console.error("Error reading Slack messages:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to read messages",
          details: error
        }
      };
    }
  }

  async execute(context: ExecutorContext, config: SlackConfig): Promise<ExecutionResult> {
    try {
      switch (config.action) {
        case 'SEND_MESSAGE': {
          let attachments: FileAttachment[] = [];
          
          // Process attachments based on source
          if (config.attachmentSource === 'local') {
            attachments = await this.processLocalAttachments(config);
          } else if (config.attachmentSource === 'port') {
            attachments = await this.processAttachmentsFromPort(context);
          }
          
          return this.sendMessageWithAttachments(context, config, attachments);
        }
        case 'READ_MESSAGES': {
          return this.readMessages(context, config);
        }
        default:
          return {
            success: false,
            error: {
              message: `Unsupported Slack action: ${config.action}`
            }
          };
      }
    } catch (error) {
      console.error("Slack executor error:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "An error occurred during execution",
          details: error
        }
      };
    }
  }
}