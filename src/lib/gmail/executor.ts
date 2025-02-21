// src/lib/gmail/executor.ts

import { BaseExecutor, ExecutorContext, ExecutionResult } from '../executors/types';
import { ExecutorRegistry } from '../executors/registry';
import { GmailConfig } from './types';

export class GmailExecutor implements BaseExecutor {
  private async makeRequest(
    endpoint: string,
    options: RequestInit,
    context: ExecutorContext
  ) {
    const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${context.tokens.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to execute Gmail action');
    }

    return response.json();
  }

  private async readUnreadEmails(
    context: ExecutorContext,
    config: GmailConfig
  ): Promise<ExecutionResult> {
    try {
      // Build query for unread emails
      const query = ['is:unread'];
      if (config.labelId) {
        query.push(`label:${config.labelId}`);
      }

      // Get message list
      const listResponse = await this.makeRequest('messages', {
        method: 'GET',
      }, context);

      // Get full message details
      const messages = await Promise.all(
        listResponse.messages.slice(0, config.maxResults || 10).map(async (msg: { id: string }) => {
          const messageDetails = await this.makeRequest(`messages/${msg.id}`, {
            method: 'GET',
          }, context);
          return messageDetails;
        })
      );

      return {
        success: true,
        data: {
          messages,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to read unread emails',
          details: error,
        },
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
  
      // Create email in RFC 2822 format
      const email = [
        `To: ${config.to}`,
        `Subject: ${config.subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        config.body
      ].join('\r\n');
  
      // Encode the email in base64
      const encodedEmail = Buffer.from(email).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
  
      const response = await this.makeRequest('messages/send', {
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

// Register the Gmail executor
ExecutorRegistry.register('gmail', GmailExecutor);