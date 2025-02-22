import { ExecutorContext, ExecutionResult } from '../executors/types';
import { AbstractExecutor } from '../executors/AbstractExecutor';
import { GmailConfig } from './types';

interface EmailData {
  id: string;
  threadId: string;
  subject?: string;
  body?: string;
  sender?: {
    email: string;
    name?: string;
  };
  recipients?: string[];
  date?: string;
  attachments?: Array<{
    filename: string;
    id: string;
  }>;
}

export class GmailExecutor extends AbstractExecutor {
  private async makeGmailRequest(
    endpoint: string,
    options: RequestInit,
    context: ExecutorContext
  ) {
    const response = await this.makeAuthorizedRequest(
      'gmail',
      `https://www.googleapis.com/gmail/v1/users/me/${endpoint}`,
      options
    );
    return response.json();
  }

  private async readUnreadEmails(
    context: ExecutorContext,
    config: GmailConfig
  ): Promise<ExecutionResult> {
    console.log('Starting to read unread emails with config:', config);
    try {
      // Construct search query
      const queryParts = ['is:unread'];
      if (config.label) {
        queryParts.push(`in:${config.label.toLowerCase()}`);
      }
      const query = queryParts.join(' ');

      // Fetch message list
      console.log('Searching for emails with query:', query);
      const listResponse = await this.makeGmailRequest(
        `messages?q=${encodeURIComponent(query)}&maxResults=${config.maxResults || 10}`,
        { method: 'GET' },
        context
      );
      console.log('Found messages:', listResponse);

      if (!listResponse.messages?.length) {
        return {
          success: true,
          data: {
            messages: [],
            totalCount: 0
          }
        };
      }

      // Fetch detailed message data
      console.log('Starting to fetch detailed message data for', listResponse.messages.length, 'messages');
      const messages: EmailData[] = await Promise.all(
        listResponse.messages.map(async (msg: { id: string }) => {
          const messageDetails = await this.makeGmailRequest(
            `messages/${msg.id}?format=full`,
            { method: 'GET' },
            context
          );

          const emailData: EmailData = {
            id: messageDetails.id,
            threadId: messageDetails.threadId
          };

          // Extract requested information based on config
          if (config.emailInformation) {
            const headers = messageDetails.payload.headers;
            
            if (config.emailInformation.includes('subjects')) {
              emailData.subject = headers.find((h: any) => h.name === 'Subject')?.value;
            }

            if (config.emailInformation.includes('sender_addresses') || 
                config.emailInformation.includes('sender_display_names')) {
              const from = headers.find((h: any) => h.name === 'From')?.value;
              const matches = from?.match(/(?:"?([^"]*)"?\s)?(?:<?(.+@[^>]+)>?)/);
              if (matches) {
                emailData.sender = {
                  name: matches[1],
                  email: matches[2]
                };
              }
            }

            if (config.emailInformation.includes('recipient_addresses')) {
              const to = headers.find((h: any) => h.name === 'To')?.value;
              emailData.recipients = to?.split(',').map((addr: string) => addr.trim());
            }

            if (config.emailInformation.includes('dates')) {
              emailData.date = headers.find((h: any) => h.name === 'Date')?.value;
            }

            if (config.emailInformation.includes('email_bodies')) {
              // Recursively find text/plain or text/html parts
              const findBody = (part: any): string | undefined => {
                if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
                  return Buffer.from(part.body.data, 'base64').toString('utf8');
                }
                if (part.parts) {
                  for (const subPart of part.parts) {
                    const body = findBody(subPart);
                    if (body) return body;
                  }
                }
                return undefined;
              };
              
              emailData.body = findBody(messageDetails.payload);
            }

            if (config.emailInformation.includes('attached_file_names')) {
              emailData.attachments = messageDetails.payload.parts
                ?.filter((part: any) => part.filename && part.body.attachmentId)
                .map((part: any) => ({
                  filename: part.filename,
                  id: part.body.attachmentId
                }));
            }
          }

          console.log('Processed email data:', {
            id: emailData.id,
            subject: emailData.subject,
            sender: emailData.sender
          });
          return emailData;
        })
      );

      const result = {
        success: true,
        data: {
          messages,
          totalCount: listResponse.resultSizeEstimate || messages.length
        }
      };
      console.log('Successfully completed reading emails. Total found:', result.data.totalCount);
      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to read unread emails',
          details: error
        }
      };
    }
  }

  private async sendEmail(
    context: ExecutorContext,
    config: GmailConfig
  ): Promise<ExecutionResult> {
    try {
      if (!config.to || !config.subject || !config.body) {
        throw new Error('Missing required fields for sending email');
      }

      const email = [
        `To: ${config.to}`,
        `Subject: ${config.subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        config.body
      ].join('\r\n');

      const encodedEmail = Buffer.from(email).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.makeGmailRequest('messages/send', {
        method: 'POST',
        body: JSON.stringify({
          raw: encodedEmail,
        }),
      }, context);

      return {
        success: true,
        data: {
          status: 'Email sent successfully',
          messageId: response.id,
          threadId: response.threadId,
          details: {
            to: config.to,
            subject: config.subject,
            timestamp: new Date().toISOString()
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to send email',
          details: error
        },
        data: {
          status: 'Email sending failed',
          attempted: {
            to: config.to,
            subject: config.subject,
            timestamp: new Date().toISOString()
          }
        }
      };
    }
  }

  async execute(
    context: ExecutorContext,
    config: GmailConfig
  ): Promise<ExecutionResult> {
    switch (config.action) {
      case 'READ_UNREAD':
        return this.readUnreadEmails(context, config);
      case 'SEND_EMAIL':
        return this.sendEmail(context, config);
      default:
        return {
          success: false,
          error: {
            message: `Unsupported Gmail action: ${config.action}`,
          },
        };
    }
  }
}