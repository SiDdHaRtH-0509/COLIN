/**
 * COLIN Transactional Email - Outbox Service
 * Phase 4A.2.5.3: Transactional Email Integration
 * 
 * Enforces transactional outbox creation (Gate E07, E08), idempotency deduplication (Gate E09),
 * and suppression filtering (Gate E25).
 */

import { Prisma, EmailOutbox, EmailOutboxStatus } from '@prisma/client';
import { getAppPrismaClient } from '../../database';
import { OutboxEnqueueInput, OutboxMetrics } from '../email.types';

export class EmailOutboxService {
  private getClient(tx?: Prisma.TransactionClient) {
    return tx || getAppPrismaClient();
  }

  /**
   * Enqueues an email into the transactional outbox table.
   * If an existing record with the same idempotencyKey exists, returns it idempotently without re-inserting.
   */
  public async enqueueEmail(input: OutboxEnqueueInput, tx?: Prisma.TransactionClient): Promise<EmailOutbox> {
    const client = this.getClient(tx);
    const normalizedRecipient = input.recipient.toLowerCase().trim();

    // 1. Idempotency Check (Gate E09)
    if (input.idempotencyKey) {
      const existing = await client.emailOutbox.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }

    // 2. Suppression Check (Gate E25)
    const isSuppressed = await this.isRecipientSuppressed(normalizedRecipient, tx);
    const initialStatus: EmailOutboxStatus = isSuppressed
      ? EmailOutboxStatus.SUPPRESSED
      : EmailOutboxStatus.PENDING;

    const scheduledTime = input.scheduledAt || new Date();

    return client.emailOutbox.create({
      data: {
        eventType: input.eventType,
        recipient: normalizedRecipient,
        subject: input.subject,
        templateAlias: input.templateAlias,
        templateDataJson: input.templateData as unknown as Prisma.InputJsonValue,
        status: initialStatus,
        idempotencyKey: input.idempotencyKey || null,
        attempts: 0,
        maxRetries: input.maxRetries ?? 5,
        scheduledAt: scheduledTime,
        nextAttemptAt: isSuppressed ? new Date(Date.now() + 365 * 24 * 3600 * 1000) : scheduledTime,
        lastErrorMessage: isSuppressed ? 'Recipient email address is suppressed due to prior bounce or complaint.' : null,
      },
    });
  }

  /**
   * Checks if an email address is listed in the suppression table.
   */
  public async isRecipientSuppressed(email: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const client = this.getClient(tx);
    const normalized = email.toLowerCase().trim();
    const suppression = await client.emailSuppression.findUnique({
      where: { email: normalized },
    });
    return Boolean(suppression);
  }

  /**
   * Adds an email address to the suppression table (hard bounces, spam complaints).
   */
  public async addSuppression(
    email: string,
    reason: string,
    source = 'webhook',
    provider?: string,
    metadata?: Record<string, unknown>,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = this.getClient(tx);
    const normalized = email.toLowerCase().trim();

    await client.emailSuppression.upsert({
      where: { email: normalized },
      create: {
        email: normalized,
        reason,
        source,
        provider: provider || null,
        metadataJson: metadata ? (metadata as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
      update: {
        reason,
        source,
        provider: provider || null,
        metadataJson: metadata ? (metadata as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  }

  /**
   * Retrieves operational outbox metrics for monitoring and health inspection.
   */
  public async getMetrics(): Promise<OutboxMetrics> {
    const client = getAppPrismaClient();

    const [pending, processing, accepted, delivered, bounced, failed, suppressed, oldestPending] =
      await Promise.all([
        client.emailOutbox.count({ where: { status: EmailOutboxStatus.PENDING } }),
        client.emailOutbox.count({ where: { status: EmailOutboxStatus.PROCESSING } }),
        client.emailOutbox.count({ where: { status: EmailOutboxStatus.ACCEPTED } }),
        client.emailOutbox.count({ where: { status: EmailOutboxStatus.DELIVERED } }),
        client.emailOutbox.count({ where: { status: EmailOutboxStatus.BOUNCED } }),
        client.emailOutbox.count({ where: { status: EmailOutboxStatus.FAILED } }),
        client.emailOutbox.count({ where: { status: EmailOutboxStatus.SUPPRESSED } }),
        client.emailOutbox.findFirst({
          where: { status: EmailOutboxStatus.PENDING },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        }),
      ]);

    const oldestAge = oldestPending ? Math.floor((Date.now() - oldestPending.createdAt.getTime()) / 1000) : null;

    return {
      pendingCount: pending,
      processingCount: processing,
      acceptedCount: accepted,
      deliveredCount: delivered,
      bouncedCount: bounced,
      failedCount: failed,
      suppressedCount: suppressed,
      oldestPendingAgeSeconds: oldestAge,
      lastWorkerRunAt: new Date(),
    };
  }
}

export const emailOutboxService = new EmailOutboxService();
