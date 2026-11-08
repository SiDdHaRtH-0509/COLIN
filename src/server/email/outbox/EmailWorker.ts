/**
 * COLIN Transactional Email - Database Worker & Concurrency Controller
 * Phase 4A.2.5.3: Transactional Email Integration
 * 
 * Enforces Gate E10 (Safe claim), Gate E11 (Concurrent worker isolation via FOR UPDATE SKIP LOCKED),
 * Gate E12 (Stale record recovery), Gate E13 (Exponential backoff), and Gate E14 (Max retries FAILED).
 */

import { EmailOutbox, EmailOutboxStatus } from '@prisma/client';
import { getAppPrismaClient } from '../../database';
import { EmailProvider } from '../providers/EmailProvider';
import { createEmailProvider } from '../email.factory';
import { EmailRetryPolicy } from './EmailRetryPolicy';
import { decryptActionToken } from '../email.crypto';
import {
  renderVerificationEmail,
  renderPasswordResetEmail,
  renderPasswordChangedEmail,
  renderAccountSecurityEmail,
  RenderedTemplate,
} from '../email.templates';
import { EmailMessage } from '../email.types';
import { getEmailConfig } from '../email.config';

export interface EmailWorkerOptions {
  provider?: EmailProvider;
  retryPolicy?: EmailRetryPolicy;
  staleTimeoutMinutes?: number;
}

export class EmailWorker {
  private readonly provider: EmailProvider;
  private readonly retryPolicy: EmailRetryPolicy;
  private readonly staleTimeoutMinutes: number;

  constructor(options?: EmailWorkerOptions) {
    this.provider = options?.provider || createEmailProvider();
    this.retryPolicy = options?.retryPolicy || new EmailRetryPolicy();
    this.staleTimeoutMinutes = options?.staleTimeoutMinutes || 10;
  }

  /**
   * Atomically claims a batch of pending or recoverable outbox records.
   * Utilizes PostgreSQL "FOR UPDATE SKIP LOCKED" to guarantee zero contention
   * between concurrent workers (Gates E10, E11, E12).
   */
  public async claimBatch(batchSize = 20): Promise<EmailOutbox[]> {
    const prisma = getAppPrismaClient();

    // CTE guarantees exact batch materialization and atomic row-level locking with SKIP LOCKED
    const claimedRows = await prisma.$queryRaw<{ id: string }[]>`
      WITH batch AS (
        SELECT id FROM email_outbox
        WHERE (status IN ('PENDING'::"EmailOutboxStatus", 'DEFERRED'::"EmailOutboxStatus") AND next_attempt_at <= NOW())
           OR (status = 'PROCESSING'::"EmailOutboxStatus" AND last_attempt_at < NOW() - (${this.staleTimeoutMinutes} * INTERVAL '1 minute'))
        ORDER BY next_attempt_at ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE email_outbox o
      SET 
        status = 'PROCESSING'::"EmailOutboxStatus",
        last_attempt_at = NOW(),
        attempts = attempts + 1,
        updated_at = NOW()
      FROM batch
      WHERE o.id = batch.id
      RETURNING o.id;
    `;

    if (!claimedRows || claimedRows.length === 0) {
      return [];
    }

    const ids = claimedRows.map((r) => r.id);
    return prisma.emailOutbox.findMany({
      where: { id: { in: ids } },
    });
  }

  /**
   * Renders the corresponding email template given outbox record and decrypted variables.
   */
  private renderEmail(record: EmailOutbox): RenderedTemplate {
    const config = getEmailConfig();
    const data = (record.templateDataJson as Record<string, unknown>) || {};
    const baseUrl = config.publicBaseUrl.replace(/\/$/, '');

    // Decrypt action token if present
    let rawToken: string | null = null;
    if (typeof data.encryptedToken === 'string') {
      rawToken = decryptActionToken(data.encryptedToken);
    }

    switch (record.templateAlias) {
      case 'verification': {
        const verificationUrl = rawToken
          ? `${baseUrl}/verify-email?token=${encodeURIComponent(rawToken)}`
          : (data.verificationUrl as string) || `${baseUrl}/verify-email`;

        return renderVerificationEmail({
          firstName: (data.firstName as string) || 'Student',
          verificationUrl,
          expirationHours: (data.expirationHours as number) || 24,
        });
      }

      case 'password_reset': {
        const resetUrl = rawToken
          ? `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`
          : (data.resetUrl as string) || `${baseUrl}/reset-password`;

        return renderPasswordResetEmail({
          firstName: (data.firstName as string) || 'User',
          resetUrl,
          expirationMinutes: (data.expirationMinutes as number) || 60,
        });
      }

      case 'password_changed': {
        return renderPasswordChangedEmail({
          firstName: (data.firstName as string) || 'User',
          changedAt: data.changedAtIso ? new Date(data.changedAtIso as string) : new Date(),
          ipAddress: data.ipAddress as string,
          securityGuidanceUrl: `${baseUrl}/support`,
        });
      }

      case 'account_security': {
        return renderAccountSecurityEmail({
          firstName: (data.firstName as string) || 'User',
          eventDescription: (data.eventDescription as string) || 'Security Event Detected',
          timestamp: data.timestampIso ? new Date(data.timestampIso as string) : new Date(),
          ipAddress: data.ipAddress as string,
          actionRequired: data.actionRequired as string,
        });
      }

      default: {
        return {
          subject: record.subject,
          htmlBody: `<p>${String(data.content || record.subject)}</p>`,
          textBody: String(data.content || record.subject),
        };
      }
    }
  }

  /**
   * Processes a single claimed outbox record and dispatches via EmailProvider.
   */
  public async processRecord(record: EmailOutbox): Promise<boolean> {
    const prisma = getAppPrismaClient();
    const config = getEmailConfig();

    try {
      const rendered = this.renderEmail(record);

      const message: EmailMessage = {
        to: record.recipient,
        subject: rendered.subject,
        htmlBody: rendered.htmlBody,
        textBody: rendered.textBody,
        from: config.fromAddress,
        fromName: config.fromName,
        replyTo: config.replyTo,
        templateAlias: record.templateAlias,
        idempotencyKey: record.idempotencyKey || undefined,
        metadata: {
          outboxId: record.id,
          ...(record.idempotencyKey ? { idempotencyKey: record.idempotencyKey } : {}),
        },
      };

      const result = await this.provider.sendEmail(message);

      if (result.success) {
        await prisma.emailOutbox.update({
          where: { id: record.id },
          data: {
            status: EmailOutboxStatus.ACCEPTED,
            provider: result.provider,
            providerMessageId: result.providerMessageId,
            sentAt: new Date(),
            lastErrorCode: null,
            lastErrorMessage: null,
          },
        });
        return true;
      }

      // Handle delivery failure (Gates E13, E14)
      const isRetryable = result.error?.retryable ?? true;
      const shouldRetry = this.retryPolicy.shouldRetry(record.attempts, isRetryable);

      if (shouldRetry) {
        const nextAttemptAt = this.retryPolicy.calculateNextAttempt(record.attempts);
        await prisma.emailOutbox.update({
          where: { id: record.id },
          data: {
            status: EmailOutboxStatus.DEFERRED,
            provider: result.provider,
            nextAttemptAt,
            lastErrorCode: result.error?.code || 'DELIVERY_DEFERRED',
            lastErrorMessage: result.error?.message || 'Provider temporarily deferred delivery.',
          },
        });
      } else {
        await prisma.emailOutbox.update({
          where: { id: record.id },
          data: {
            status: EmailOutboxStatus.FAILED,
            provider: result.provider,
            lastErrorCode: result.error?.code || 'DELIVERY_FAILED',
            lastErrorMessage: result.error?.message || 'Delivery exceeded maximum retries or encountered permanent failure.',
          },
        });
      }
      return false;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const shouldRetry = this.retryPolicy.shouldRetry(record.attempts, true);

      await prisma.emailOutbox.update({
        where: { id: record.id },
        data: {
          status: shouldRetry ? EmailOutboxStatus.DEFERRED : EmailOutboxStatus.FAILED,
          nextAttemptAt: shouldRetry ? this.retryPolicy.calculateNextAttempt(record.attempts) : undefined,
          lastErrorCode: 'WORKER_INTERNAL_ERROR',
          lastErrorMessage: errorMsg,
        },
      });
      return false;
    }
  }

  /**
   * Executes a full worker processing pass on eligible outbox records.
   */
  public async runBatch(batchSize = 20): Promise<{ claimed: number; succeeded: number; failed: number }> {
    const records = await this.claimBatch(batchSize);
    let succeeded = 0;
    let failed = 0;

    for (const record of records) {
      const ok = await this.processRecord(record);
      if (ok) {
        succeeded++;
      } else {
        failed++;
      }
    }

    return { claimed: records.length, succeeded, failed };
  }
}
