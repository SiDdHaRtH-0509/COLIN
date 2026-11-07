/**
 * COLIN Transactional Email - Mock Email Provider
 * Phase 4A.2.5.3: Transactional Email Integration
 * 
 * In-memory transactional email provider for local development, CI testing,
 * and deterministic unit/integration verification (Gates E01, E02).
 */

import { EmailProvider } from './EmailProvider';
import { EmailMessage, EmailSendResult, EmailProviderName } from '../email.types';
import crypto from 'crypto';

export class MockEmailProvider implements EmailProvider {
  public readonly providerName: EmailProviderName = 'mock';
  private sentMessages: Array<EmailMessage & { providerMessageId: string; sentAt: Date }> = [];
  private simulatedFailure: { code: string; message: string; retryable: boolean; statusCode?: number } | null = null;

  public async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    if (this.simulatedFailure) {
      const failure = this.simulatedFailure;
      return {
        success: false,
        provider: this.providerName,
        statusCode: failure.statusCode || 500,
        error: {
          code: failure.code,
          message: failure.message,
          retryable: failure.retryable,
        },
      };
    }

    const providerMessageId = `mock_msg_${crypto.randomUUID()}`;
    const sentRecord = {
      ...message,
      providerMessageId,
      sentAt: new Date(),
    };
    this.sentMessages.push(sentRecord);

    return {
      success: true,
      provider: this.providerName,
      providerMessageId,
      statusCode: 202,
    };
  }

  public getSentMessages() {
    return [...this.sentMessages];
  }

  public getLastMessage() {
    return this.sentMessages[this.sentMessages.length - 1] || null;
  }

  public findMessagesTo(recipientEmail: string) {
    const target = recipientEmail.toLowerCase().trim();
    return this.sentMessages.filter((m) => m.to.toLowerCase().trim() === target);
  }

  public clear() {
    this.sentMessages = [];
    this.simulatedFailure = null;
  }

  public setSimulatedFailure(code: string, message: string, retryable = true, statusCode = 500) {
    this.simulatedFailure = { code, message, retryable, statusCode };
  }

  public clearSimulatedFailure() {
    this.simulatedFailure = null;
  }
}
