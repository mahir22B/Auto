import { ExecutorContext, ExecutionResult } from "../executors/types";
import { AbstractExecutor } from "../executors/AbstractExecutor";
import { SlackConfig } from "./types";

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

      if (!config.channelId) {
        throw new Error("Channel ID is required");
      }

      const messageParams: any = {
        channel: config.channelId,
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
            displayText: `Message sent to channel`,
            _output_types: {
              output_threadId: 'string'
            }
          }
        };
      }

      // Otherwise, use files.upload for each attachment via proxy
      const uploadResults = await Promise.all(
        attachments.map(async (file, index) => {
          // Create FormData for file upload
          const formData = new FormData();
          formData.append('channels', config.channelId!);
          formData.append('filename', file.name);
          
          // Convert content to Blob if it's ArrayBuffer
          if (file.content instanceof ArrayBuffer) {
            formData.append('file', new Blob([file.content], { type: file.type }));
          } else if (typeof file.content === 'string') {
            // If it's base64, convert to Blob
            const base64Content = file.content.replace(/^data:.*?;base64,/, '');
            const binaryContent = atob(base64Content);
            const uint8Array = new Uint8Array(binaryContent.length);
            for (let i = 0; i < binaryContent.length; i++) {
              uint8Array[i] = binaryContent.charCodeAt(i);
            }
            formData.append('file', new Blob([uint8Array], { type: file.type }));
          } else {
            throw new Error(`Unsupported file content type for ${file.name}`);
          }
          
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
            throw new Error(`Failed to upload file ${file.name}: ${data.error}`);
          }
          
          return data;
        })
      );

      // Return the thread ID from the first upload (or from the last if multiple)
      const lastUpload = uploadResults[uploadResults.length - 1];
      
      return {
        success: true,
        data: {
          output_threadId: lastUpload.file?.shares?.public?.[config.channelId!]?.[0]?.ts || lastUpload.file?.id,
          channel: config.channelId,
          message: message,
          displayText: `Message with ${attachments.length} attachment(s) sent to channel`,
          fileIds: uploadResults.map(r => r.file?.id).filter(Boolean),
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