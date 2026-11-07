/**
 * COLIN Transactional Email - Postmark Provider Adapter
 * Phase 4A.2.5.3: Transactional Email Integration
 * 
 * Production adapter for Postmark Server API (Gates E01, E04).
 */

import { EmailProvider } from './EmailProvider';
import { EmailMessage, EmailSendResult, EmailProviderName } from '../email.types';
import { EmailConfigurationError } from '../email.errors';

export type PostmarkFetchFunction = typeof fetch;

export class PostmarkProvider implements EmailProvider {
  public readonly providerName: EmailProviderName = 'postmark';
  private readonly serverToken: string;
  private readonly apiEndpoint: string;
  private readonly fetchFn: PostmarkFetchFunction;

  constructor(options?: { serverToken?: string; apiEndpoint?: string; fetchFn?: PostmarkFetchFunction }) {
    this.serverToken = options?.serverToken || process.env.POSTMARK_SERVER_TOKEN || '';
    this.apiEndpoint = options?.apiEndpoint || 'https://api.postmarkapp.com/email';
    this.fetchFn = options?.fetchFn || globalThis.fetch;
  }

  public validatePrerequisites(): void {
    if (!this.serverToken) {
      throw new EmailConfigurationError(
        'Postmark provider requires POSTMARK_SERVER_TOKEN to be configured in environment or constructor.'
      );
    }
  }

  /**
   * Formats internal EmailMessage into official Postmark API JSON payload.
   */
  public formatPostmarkPayload(message: EmailMessage) {
    const fromAddress = message.from || 'no-reply@colin.in';
    const fromName = message.fromName || 'COLIN — Campus Living Verified';
    const formattedFrom = `"${fromName.replace(/"/g, '')}" <${fromAddress}>`;

    const payload: Record<string, unknown> = {
      From: formattedFrom,
      To: message.toName ? `"${message.toName.replace(/"/g, '')}" <${message.to}>` : message.to,
      Subject: message.subject,
      HtmlBody: message.htmlBody,
      TextBody: message.textBody,
    };

    if (message.replyTo) {
      payload.ReplyTo = message.replyTo;
    }

    if (message.tags && message.tags.length > 0) {
      payload.Tag = message.tags[0];
    } else if (message.templateAlias) {
      payload.Tag = message.templateAlias;
    }

    if (message.idempotencyKey || message.metadata) {
      payload.Metadata = {
        ...(message.metadata || {}),
        ...(message.idempotencyKey ? { idempotencyKey: message.idempotencyKey } : {}),
      };
    }

    return payload;
  }

  public async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    this.validatePrerequisites();

    const payload = this.formatPostmarkPayload(message);

    try {
      const response = await this.fetchFn(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': this.serverToken,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let responseJson: Record<string, any> = {};
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        responseJson = { Message: responseText };
      }

      if (response.status === 200 && responseJson.ErrorCode === 0) {
        return {
          success: true,
          provider: this.providerName,
          providerMessageId: responseJson.MessageID || `pm_${Date.now()}`,
          statusCode: 200,
        };
      }

      const isRetryable = response.status === 429 || response.status >= 500;
      const errorCode = responseJson.ErrorCode ? `POSTMARK_${responseJson.ErrorCode}` : `POSTMARK_${response.status}`;
      const errorMessage = responseJson.Message || `Postmark API error (HTTP ${response.status})`;

      return {
        success: false,
        provider: this.providerName,
        statusCode: response.status,
        error: {
          code: errorCode,
          message: errorMessage,
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
          code: 'POSTMARK_NETWORK_ERROR',
          message: messageStr,
          retryable: true,
        },
      };
    }
  }
}
