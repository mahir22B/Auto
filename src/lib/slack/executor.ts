// src/lib/slack/executor.ts

import { ExecutorContext, ExecutionResult } from "../executors/types";
import { AbstractExecutor } from "../executors/AbstractExecutor";
import { SlackConfig, SlackMessage, SlackReadMessagesResult, SlackCanvasResult } from "./types";

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

  private async sendMessage(
    context: ExecutorContext,
    config: SlackConfig
  ): Promise<ExecutionResult> {
    try {
      // Prepare message params
      const message = this.getInputValueOrConfig(context, 'input_message', config, 'message');
      const threadId = this.getInputValueOrConfig(context, 'input_threadId', config, 'threadId');
      
      if (!message) {
        throw new Error("Message is required");
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
        text: message,
      };

      // Add thread_ts if provided
      if (threadId) {
        messageParams.thread_ts = threadId;
      }

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
    } catch (error) {
      console.error("Error sending message:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to send message",
          details: error
        }
      };
    }
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


  private async createCanvas(
    context: ExecutorContext,
    config: SlackConfig
  ): Promise<ExecutionResult> {
    try {
      // Get inputs from ports or config
      const canvasTitle = this.getInputValueOrConfig(context, 'input_canvasTitle', config, 'canvasTitle');
      const canvasContent = this.getInputValueOrConfig(context, 'input_canvasContent', config, 'canvasContent');
      const channelId = config.channelId;
      const accessLevel = config.accessLevel || 'read'; // Default to read if not specified
      console.log("ACCESS", accessLevel)

      if (!channelId) {
        throw new Error("Channel ID is required");
      }
      
      if (!canvasTitle) {
        throw new Error("Canvas title is required");
      }
      
      if (!canvasContent) {
        throw new Error("Canvas content is required");
      }
      
      console.log("Creating Slack canvas with title:", canvasTitle);
      
      // Create the canvas using canvases.create endpoint
      const createPayload = {
        title: canvasTitle,
        document_content: {
          type: "markdown",
          markdown: canvasContent
        }
      };
      
      console.log("Canvas create payload:", createPayload);
      
      const createResponse = await this.makeSlackRequest(
        "canvases.create",
        {
          method: "POST",
          body: JSON.stringify(createPayload)
        },
        context
      );
      
      if (!createResponse.ok) {
        throw new Error(createResponse.error || "Failed to create canvas");
      }
      
      const canvasId = createResponse.canvas_id;
      
      if (!canvasId) {
        throw new Error("Canvas ID missing in response");
      }
      
      console.log("Canvas created successfully with ID:", canvasId);
      
      // Get team information for URL formation
      let teamId = null;
      let workspaceDomain = null;
      
      try {
        console.log("Getting team information");
        const teamInfoResponse = await this.makeSlackRequest(
          "team.info",
          { method: "GET" },
          context
        );
        
        if (teamInfoResponse.ok && teamInfoResponse.team) {
          teamId = teamInfoResponse.team.id;
          workspaceDomain = teamInfoResponse.team.domain;
          console.log(`Got team info: ID=${teamId}, domain=${workspaceDomain}`);
        } else {
          console.log("Could not get team info:", teamInfoResponse.error || "Unknown error");
          
          // Fallbacks
          if (context.tokens.team_id) {
            teamId = context.tokens.team_id;
            console.log("Using team_id from tokens:", teamId);
          }
        }
      } catch (err) {
        console.error("Error getting team info:", err);
      }
      
      // Generate canvas URL
      let canvasUrl;
      if (teamId && workspaceDomain) {
        canvasUrl = `https://${workspaceDomain}.slack.com/docs/${teamId}/${canvasId}`;
      } else if (workspaceDomain) {
        canvasUrl = `https://${workspaceDomain}.slack.com/docs/${canvasId}`;
      } else if (teamId) {
        canvasUrl = `https://slack.com/docs/${teamId}/${canvasId}`;
      } else {
        canvasUrl = `https://slack.com/docs/${canvasId}`;
      }
      
      console.log("Canvas URL:", canvasUrl);
      
      // Share the canvas by posting its URL in a message
      const shareMessagePayload = {
        channel: channelId,
        text: `Canvas created and shared successfully: ${canvasUrl}`,
        blocks: [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": `<${canvasUrl}|${canvasTitle}>`
            }
          }
        ]
      };
      
      const postResponse = await this.makeSlackRequest(
        "chat.postMessage",
        {
          method: "POST",
          body: JSON.stringify(shareMessagePayload)
        },
        context
      );
      
      if (!postResponse.ok) {
        console.warn("Failed to share canvas via message:", postResponse.error);
      } else {
        console.log("Canvas shared via message successfully");
      }
      
      // Set canvas access permissions
      console.log(`Setting canvas access level to: ${accessLevel}`);
      
      const accessPayload = {
        canvas_id: canvasId,
        channel_ids: [channelId],
        access_level: accessLevel // Using the access level from the config
      };
      
      const accessResponse = await this.makeSlackRequest(
        "canvases.access.set",
        {
          method: "POST",
          body: JSON.stringify(accessPayload)
        },
        context
      );
      
      if (!accessResponse.ok) {
        console.warn("Failed to set canvas access permissions:", accessResponse.error);
      } else {
        console.log(`Canvas access level set to ${accessLevel} successfully`);
      }
      
      return {
        success: true,
        data: {
          output_canvasLink: canvasUrl,
          canvasId: canvasId,
          title: canvasTitle,
          content: canvasContent,
          channelId: channelId,
          accessLevel: accessLevel,
          displayText: `${canvasUrl}`,
          _output_types: {
            output_canvasLink: 'string'
          }
        }
      };
    } catch (error) {
      console.error("Error creating Slack canvas:", error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to create canvas",
          details: error
        }
      };
    }
  }
  async execute(context: ExecutorContext, config: SlackConfig): Promise<ExecutionResult> {
    try {
      console.log("Executing Slack action:", config.action);
      
      switch (config.action) {
        case 'SEND_MESSAGE': {
          return this.sendMessage(context, config);
        }
        case 'READ_MESSAGES': {
          return this.readMessages(context, config);
        }
        case 'CANVAS_WRITER': {
          return this.createCanvas(context, config);
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