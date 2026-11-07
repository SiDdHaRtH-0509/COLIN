/**
 * COLIN Transactional Email - SendGrid Provider Adapter
 * Phase 4A.2.5.3: Transactional Email Integration
 * 
 * Production adapter for SendGrid v3 Mail Send API (Gates E01, E03).
 */

import { EmailProvider } from './EmailProvider';
import { EmailMessage, EmailSendResult, EmailProviderName } from '../email.types';
import { EmailConfigurationError } from '../email.errors';

export type SendGridFetchFunction = typeof fetch;

export class SendGridProvider implements EmailProvider {
  public readonly providerName: EmailProviderName = 'sendgrid';
  private readonly apiKey: string;
  private readonly apiEndpoint: string;
  private readonly fetchFn: SendGridFetchFunction;

  constructor(options?: { apiKey?: string; apiEndpoint?: string; fetchFn?: SendGridFetchFunction }) {
    this.apiKey = options?.apiKey || process.env.SENDGRID_API_KEY || '';
    this.apiEndpoint = options?.apiEndpoint || 'https://api.sendgrid.com/v3/mail/send';
    this.fetchFn = options?.fetchFn || globalThis.fetch;
  }

  public validatePrerequisites(): void {
    if (!this.apiKey) {
      throw new EmailConfigurationError(
        'SendGrid provider requires SENDGRID_API_KEY to be configured in environment or constructor.'
      );
    }
  }

  /**
   * Formats internal EmailMessage into official SendGrid v3 API JSON payload.
   */
  public formatSendGridPayload(message: EmailMessage) {
    const toRecipient: { email: string; name?: string } = { email: message.to };
    if (message.toName) {
      toRecipient.name = message.toName;
    }

    const fromSender: { email: string; name?: string } = {
      email: message.from || 'no-reply@colin.in',
    };
    if (message.fromName) {
      fromSender.name = message.fromName;
    }

    const payload: Record<string, unknown> = {
      personalizations: [
        {
          to: [toRecipient],
          subject: message.subject,
        },
      ],
      from: fromSender,
      content: [
        {
          type: 'text/plain',
          value: message.textBody,
        },
        {
          type: 'text/html',
          value: message.htmlBody,
        },
      ],
    };

    if (message.replyTo) {
      payload.reply_to = { email: message.replyTo };
    }

    if (message.idempotencyKey || message.metadata) {
      payload.custom_args = {
        ...(message.metadata || {}),
        ...(message.idempotencyKey ? { idempotencyKey: message.idempotencyKey } : {}),
      };
    }

    return payload;
  }

  public async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    this.validatePrerequisites();

    const payload = this.formatSendGridPayload(message);

    try {
      const response = await this.fetchFn(this.apiEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const messageId = response.headers.get('x-message-id') || `sg_${Date.now()}`;

      if (response.status === 202 || response.status === 200) {
        return {
          success: true,
          provider: this.providerName,
          providerMessageId: messageId,
          statusCode: response.status,
        };
      }

      // Handle SendGrid errors
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {
        errorBody = 'Unable to parse SendGrid error response';
      }

      const isRetryable = response.status === 429 || response.status >= 500;

      return {
        success: false,
        provider: this.providerName,
        statusCode: response.status,
        error: {
          code: `SENDGRID_${response.status}`,
          message: errorBody || `SendGrid returned HTTP ${response.status}`,
          retryable: isRetryable,
        },
      };
    } catch (err: unknown) {
      const messageStr = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        provider: this.providerName,
        statusCode: 500,
        error: {
          code: 'SENDGRID_NETWORK_ERROR',
          message: messageStr,
          retryable: true,
        },
      };
    }
  }
}
