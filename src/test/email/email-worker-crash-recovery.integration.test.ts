/**
 * COLIN Transactional Email - Worker Crash Recovery & Idempotency Integration Tests
 * Phase 4A.2.5.5 Remediation: Finding 4 Verification
 *
 * Simulates worker crash after provider acceptance before database recording.
 * Verifies:
 * 1. Duplicate-delivery risk and worker crash state.
 * 2. Provider idempotency support (passing idempotencyKey & outboxId in metadata).
 * 3. Provider message-ID persistence.
 * 4. Webhook reconciliation preventing duplicate delivery.
 * 5. Stale worker recovery and at-least-once delivery semantics.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import crypto from 'crypto';
import { getAppPrismaClient } from '../../server/database';
import { initializeDatabaseConnections } from '../../server/database/lifecycle';
import {
  EmailWorker,
  MockEmailProvider,
  SendGridWebhookHandler,
  PostmarkWebhookHandler,
  EmailEventType,
  EmailOutboxStatus,
} from '../../server/email';

describe('COLIN Email Worker Crash Recovery & Idempotency (Finding 4)', () => {
  const prisma = getAppPrismaClient();
  let mockProvider: MockEmailProvider;

  beforeAll(async () => {
    await initializeDatabaseConnections();
  });

  beforeEach(async () => {
    mockProvider = new MockEmailProvider();
    await prisma.emailOutbox.deleteMany({});
  });

  it('handles worker crash after provider acceptance via webhook reconciliation before stale recovery', async () => {
    const idempotencyKey = `idem_crash_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const recipient = 'crash.recovery@colin.test';

    // 1. Create outbox record in PENDING state
    const outbox = await prisma.emailOutbox.create({
      data: {
        recipient,
        subject: 'Worker Crash Test',
        eventType: EmailEventType.VERIFICATION_EMAIL,
        templateAlias: 'verification',
        templateDataJson: { token: 'crash-token-123' },
        status: EmailOutboxStatus.PENDING,
        idempotencyKey,
      },
    });

    // 2. Worker claims the record (status transitions to PROCESSING)
    const worker = new EmailWorker({ provider: mockProvider, staleTimeoutMinutes: 10 });
    const claimed = await worker.claimBatch(10);
    expect(claimed.length).toBe(1);
    expect(claimed[0].id).toBe(outbox.id);

    // 3. Provider sends email, returns message ID
    const providerMsgId = `mock_dispatch_${crypto.randomUUID()}`;
    // Simulate provider sending successfully
    const sendResult = await mockProvider.sendEmail({
      to: recipient,
      subject: outbox.subject,
      htmlBody: '<p>Body</p>',
      textBody: 'Body',
      templateAlias: outbox.templateAlias,
      idempotencyKey,
      metadata: { outboxId: outbox.id, idempotencyKey },
    });
    expect(sendResult.success).toBe(true);

    // 4. SIMULATE WORKER CRASH: Worker dies right here before updating DB outbox record!
    // Verify DB state: outbox is in PROCESSING, providerMessageId is NULL
    const crashedRecord = await prisma.emailOutbox.findUnique({ where: { id: outbox.id } });
    expect(crashedRecord!.status).toBe(EmailOutboxStatus.PROCESSING);
    expect(crashedRecord!.providerMessageId).toBeNull();
    expect(crashedRecord!.attempts).toBe(1);

    // 5. Provider delivery webhook arrives (e.g. SendGrid or Postmark)
    // SendGrid webhook event includes custom argument outboxId
    const sendGridHandler = new SendGridWebhookHandler();
    const webhookEventId = `sg_crash_evt_${Date.now()}`;
    const result = await sendGridHandler.handleEvents([
      {
        email: recipient,
        event: 'delivered',
        sg_event_id: webhookEventId,
        sg_message_id: providerMsgId,
        outboxId: outbox.id,
        idempotencyKey,
      } as any,
    ]);

    expect(result.processed).toBe(1);

    // 6. Verify webhook reconciled the outbox record
    const reconciledOutbox = await prisma.emailOutbox.findUnique({ where: { id: outbox.id } });
    expect(reconciledOutbox!.status).toBe(EmailOutboxStatus.DELIVERED);
    expect(reconciledOutbox!.providerMessageId).toBe(providerMsgId);

    // 7. Verify subsequent worker claimBatch finds NO pending or stale jobs to process
    const nextClaim = await worker.claimBatch(10);
    expect(nextClaim.length).toBe(0); // Zero duplicate sends!
  });

  it('recovers un-reconciled crashed jobs after stale timeout using at-least-once delivery', async () => {
    const idempotencyKey = `idem_stale_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const recipient = 'stale.recovery@colin.test';

    // 1. Create outbox record
    const outbox = await prisma.emailOutbox.create({
      data: {
        recipient,
        subject: 'Stale Recovery Test',
        eventType: EmailEventType.VERIFICATION_EMAIL,
        templateAlias: 'verification',
        templateDataJson: { token: 'stale-token-456' },
        status: EmailOutboxStatus.PENDING,
        idempotencyKey,
      },
    });

    // 2. First worker claims the job
    const worker1 = new EmailWorker({ provider: mockProvider, staleTimeoutMinutes: 10 });
    const claimed1 = await worker1.claimBatch(10);
    expect(claimed1.length).toBe(1);

    // 3. Worker 1 crashes. Provider sent the message, but worker died before DB update.
    // Simulate time passing: last_attempt_at becomes 15 minutes ago
    await prisma.$executeRawUnsafe(
      `UPDATE email_outbox SET last_attempt_at = NOW() - INTERVAL '15 minutes' WHERE id = '${outbox.id}'::uuid;`
    );

    // 4. Stale recovery worker runs
    const recoveryWorker = new EmailWorker({ provider: mockProvider, staleTimeoutMinutes: 10 });
    const recoveredBatch = await recoveryWorker.claimBatch(10);

    expect(recoveredBatch.length).toBe(1);
    expect(recoveredBatch[0].id).toBe(outbox.id);
    expect(recoveredBatch[0].attempts).toBe(2); // Attempts incremented to 2

    // 5. Recovery worker processes record through to completion
    const success = await recoveryWorker.processRecord(recoveredBatch[0]);
    expect(success).toBe(true);

    // 6. Verify database record is now ACCEPTED with provider message ID
    const completedRecord = await prisma.emailOutbox.findUnique({ where: { id: outbox.id } });
    expect(completedRecord!.status).toBe(EmailOutboxStatus.ACCEPTED);
    expect(completedRecord!.providerMessageId).toBeDefined();
    expect(completedRecord!.providerMessageId).toMatch(/^mock_msg_/);
    expect(completedRecord!.attempts).toBe(2);
  });

  it('reconciles crashed Postmark jobs via metadata in Postmark webhook handler', async () => {
    const idempotencyKey = `idem_postmark_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const recipient = 'postmark.crash@colin.test';

    // 1. Create outbox record in PENDING
    const outbox = await prisma.emailOutbox.create({
      data: {
        recipient,
        subject: 'Postmark Crash Test',
        eventType: EmailEventType.PASSWORD_RESET,
        templateAlias: 'password_reset',
        templateDataJson: { token: 'pm-token-789' },
        status: EmailOutboxStatus.PENDING,
        idempotencyKey,
      },
    });

    // 2. Claim job (transitions to PROCESSING)
    const worker = new EmailWorker({ provider: mockProvider, staleTimeoutMinutes: 10 });
    await worker.claimBatch(10);

    // 3. Worker crashed, DB remains in PROCESSING
    const pmMessageId = `pm_msg_${crypto.randomUUID()}`;

    // 4. Postmark Delivery webhook arrives with outboxId in Metadata
    const postmarkHandler = new PostmarkWebhookHandler();
    const webhookRes = await postmarkHandler.handleEvent({
      RecordType: 'Delivery',
      MessageID: pmMessageId,
      Recipient: recipient,
      DeliveredAt: new Date().toISOString(),
      Metadata: {
        outboxId: outbox.id,
        idempotencyKey,
      },
    });

    expect(webhookRes.processed).toBe(true);

    // 5. Verify outbox record reconciled
    const reconciled = await prisma.emailOutbox.findUnique({ where: { id: outbox.id } });
    expect(reconciled!.status).toBe(EmailOutboxStatus.DELIVERED);
    expect(reconciled!.providerMessageId).toBe(pmMessageId);
  });
});
