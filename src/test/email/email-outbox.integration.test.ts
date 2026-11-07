/**
 * COLIN Transactional Email - Outbox & Worker Integration Test Suite
 * Phase 4A.2.5.3: Transactional Email Integration
 * 
 * Verifies Gates E07, E08, E09, E10, E11, E12, E13, E14, E18, E19, E25.
 */

import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { getAppPrismaClient } from '../../server/database';
import { initializeDatabaseConnections } from '../../server/database/lifecycle';
import {
  emailOutboxService,
  EmailWorker,
  EmailRetryPolicy,
  MockEmailProvider,
  encryptActionToken,
  sanitizeForLogging,
  EmailEventType,
  EmailOutboxStatus,
} from '../../server/email';

describe('COLIN Email Outbox & Worker Integration Suite', () => {
  const prisma = getAppPrismaClient();
  let mockProvider: MockEmailProvider;

  beforeAll(async () => {
    await initializeDatabaseConnections();
  });

  beforeEach(async () => {
    mockProvider = new MockEmailProvider();
    mockProvider.clear();
    // Clean up test email outbox records
    await prisma.emailDeliveryEvent.deleteMany({});
    await prisma.emailOutbox.deleteMany({});
    await prisma.emailSuppression.deleteMany({});
  });

  // Gate E07: Outbox record creation
  it('[Gate E07] creates pending transactional outbox records with proper scheduling and metadata', async () => {
    const record = await emailOutboxService.enqueueEmail({
      eventType: EmailEventType.VERIFICATION_EMAIL,
      recipient: 'gate07@colin.test',
      subject: 'Verify your COLIN account',
      templateAlias: 'verification',
      templateData: { firstName: 'Rohan', verificationUrl: 'https://colin.in/verify' },
      maxRetries: 5,
    });

    expect(record).toBeDefined();
    expect(record.id).toBeDefined();
    expect(record.status).toBe(EmailOutboxStatus.PENDING);
    expect(record.recipient).toBe('gate07@colin.test');
    expect(record.attempts).toBe(0);
    expect(record.maxRetries).toBe(5);
    expect(record.nextAttemptAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  // Gate E08: Transactional token + outbox creation
  it('[Gate E08] atomically commits verification token and outbox record within a single database transaction', async () => {
    const testEmail = `gate08_${Date.now()}@colin.test`;

    // 1. Successful transaction
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: testEmail,
          passwordHash: 'dummy_hash',
          primaryRole: 'STUDENT',
        },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: crypto.randomBytes(32).toString('hex'),
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      await emailOutboxService.enqueueEmail(
        {
          eventType: EmailEventType.VERIFICATION_EMAIL,
          recipient: user.email,
          subject: 'Verify Email',
          templateAlias: 'verification',
          templateData: { firstName: 'Student' },
        },
        tx
      );
    });

    const user = await prisma.user.findUnique({ where: { email: testEmail } });
    expect(user).toBeDefined();
    const token = await prisma.emailVerificationToken.findFirst({ where: { userId: user!.id } });
    expect(token).toBeDefined();
    const outbox = await prisma.emailOutbox.findFirst({ where: { recipient: testEmail } });
    expect(outbox).toBeDefined();

    // 2. Rollback transaction ensures atomicity
    const rollbackEmail = `gate08_abort_${Date.now()}@colin.test`;
    await expect(
      prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: { email: rollbackEmail, passwordHash: 'hash', primaryRole: 'STUDENT' },
        });

        await emailOutboxService.enqueueEmail(
          {
            eventType: EmailEventType.VERIFICATION_EMAIL,
            recipient: u.email,
            subject: 'Verify Email',
            templateAlias: 'verification',
            templateData: { firstName: 'Student' },
          },
          tx
        );

        throw new Error('Simulated transaction abortion');
      })
    ).rejects.toThrow('Simulated transaction abortion');

    // Both user and outbox must be absent
    const abortedUser = await prisma.user.findUnique({ where: { email: rollbackEmail } });
    expect(abortedUser).toBeNull();
    const abortedOutbox = await prisma.emailOutbox.findFirst({ where: { recipient: rollbackEmail } });
    expect(abortedOutbox).toBeNull();
  });

  // Gate E09: Idempotency prevents duplicate outbox entries
  it('[Gate E09] prevents duplicate outbox records when using the same idempotency key', async () => {
    const key = `idemp_${Date.now()}`;

    const first = await emailOutboxService.enqueueEmail({
      eventType: EmailEventType.PASSWORD_RESET,
      recipient: 'idemp@colin.test',
      subject: 'Reset Password',
      templateAlias: 'password_reset',
      templateData: { firstName: 'Aarav' },
      idempotencyKey: key,
    });

    const duplicate = await emailOutboxService.enqueueEmail({
      eventType: EmailEventType.PASSWORD_RESET,
      recipient: 'idemp@colin.test',
      subject: 'Reset Password',
      templateAlias: 'password_reset',
      templateData: { firstName: 'Aarav' },
      idempotencyKey: key,
    });

    expect(first.id).toBe(duplicate.id);
    const count = await prisma.emailOutbox.count({ where: { idempotencyKey: key } });
    expect(count).toBe(1);
  });

  // Gate E10: Worker safely claims pending messages
  it('[Gate E10] safely claims pending messages and transitions status to PROCESSING', async () => {
    const record = await emailOutboxService.enqueueEmail({
      eventType: EmailEventType.VERIFICATION_EMAIL,
      recipient: 'claim@colin.test',
      subject: 'Test Claim',
      templateAlias: 'verification',
      templateData: { firstName: 'Priya' },
    });

    const worker = new EmailWorker({ provider: mockProvider });
    const claimed = await worker.claimBatch(10);

    expect(claimed.length).toBeGreaterThanOrEqual(1);
    const myClaimed = claimed.find((c) => c.id === record.id);
    expect(myClaimed).toBeDefined();
    expect(myClaimed!.status).toBe(EmailOutboxStatus.PROCESSING);
    expect(myClaimed!.attempts).toBe(1);
    expect(myClaimed!.lastAttemptAt).toBeDefined();
  });

  // Gate E11: Concurrent workers cannot claim the same message
  it('[Gate E11] ensures concurrent worker instances claim disjoint batches via FOR UPDATE SKIP LOCKED', async () => {
    // Create 10 pending outbox records
    for (let i = 0; i < 10; i++) {
      await emailOutboxService.enqueueEmail({
        eventType: EmailEventType.ACCOUNT_SECURITY,
        recipient: `concurrent_${i}@colin.test`,
        subject: `Security Alert ${i}`,
        templateAlias: 'account_security',
        templateData: { firstName: `User${i}`, eventDescription: 'Login test' },
      });
    }

    const workerA = new EmailWorker({ provider: mockProvider });
    const workerB = new EmailWorker({ provider: mockProvider });

    // Execute simultaneous claimBatch calls
    const [batchA, batchB] = await Promise.all([
      workerA.claimBatch(5),
      workerB.claimBatch(5),
    ]);

    expect(batchA.length).toBe(5);
    expect(batchB.length).toBe(5);

    // Verify completely disjoint set of record IDs
    const idsA = new Set(batchA.map((r) => r.id));
    const idsB = new Set(batchB.map((r) => r.id));
    for (const id of idsA) {
      expect(idsB.has(id)).toBe(false);
    }
  });

  // Gate E12: Worker recovers stale processing records
  it('[Gate E12] automatically recovers and reclaims stale PROCESSING records whose last attempt timed out', async () => {
    const staleTime = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago (> 10m threshold)
    const staleRecord = await prisma.emailOutbox.create({
      data: {
        eventType: EmailEventType.VERIFICATION_EMAIL,
        recipient: 'stale@colin.test',
        subject: 'Stale Message',
        templateAlias: 'verification',
        templateDataJson: { firstName: 'StaleUser' },
        status: EmailOutboxStatus.PROCESSING,
        attempts: 1,
        lastAttemptAt: staleTime,
      },
    });

    const worker = new EmailWorker({ provider: mockProvider, staleTimeoutMinutes: 10 });
    const claimed = await worker.claimBatch(10);

    const recovered = claimed.find((r) => r.id === staleRecord.id);
    expect(recovered).toBeDefined();
    expect(recovered!.status).toBe(EmailOutboxStatus.PROCESSING);
    expect(recovered!.attempts).toBe(2);
  });

  // Gate E13: Retry policy and exponential backoff
  it('[Gate E13] calculates exponential backoff with bounded jitter', () => {
    const policy = new EmailRetryPolicy({ baseDelayMs: 30000, maxDelayMs: 3600000 });
    const now = new Date('2026-11-07T12:00:00Z');

    // Attempt 1: 30s + 10-25% jitter (33s - 37.5s)
    const next1 = policy.calculateNextAttempt(1, now);
    const diff1 = next1.getTime() - now.getTime();
    expect(diff1).toBeGreaterThanOrEqual(30000);
    expect(diff1).toBeLessThanOrEqual(40000);

    // Attempt 2: 60s + jitter (66s - 75s)
    const next2 = policy.calculateNextAttempt(2, now);
    const diff2 = next2.getTime() - now.getTime();
    expect(diff2).toBeGreaterThanOrEqual(60000);
    expect(diff2).toBeLessThanOrEqual(80000);

    // Attempt 3: 120s + jitter
    const next3 = policy.calculateNextAttempt(3, now);
    const diff3 = next3.getTime() - now.getTime();
    expect(diff3).toBeGreaterThanOrEqual(120000);
    expect(diff3).toBeLessThanOrEqual(160000);
  });

  // Gate E14: Maximum retries transition to FAILED
  it('[Gate E14] transitions permanently failed outbox records to FAILED when max retries are exceeded', async () => {
    mockProvider.setSimulatedFailure('SMTP_UNAVAILABLE', 'Service down', true);

    const record = await prisma.emailOutbox.create({
      data: {
        eventType: EmailEventType.PASSWORD_RESET,
        recipient: 'fail@colin.test',
        subject: 'Failing Reset',
        templateAlias: 'password_reset',
        templateDataJson: { firstName: 'Kabir' },
        status: EmailOutboxStatus.PENDING,
        attempts: 4, // Max is 5, this next attempt will be #5
        maxRetries: 5,
      },
    });

    const worker = new EmailWorker({ provider: mockProvider });
    const claimed = await worker.claimBatch(10);
    expect(claimed.some((c) => c.id === record.id)).toBe(true);

    const claimedRecord = claimed.find((c) => c.id === record.id)!;
    const ok = await worker.processRecord(claimedRecord);
    expect(ok).toBe(false);

    // Record should now be in FAILED status
    const updated = await prisma.emailOutbox.findUnique({ where: { id: record.id } });
    expect(updated!.status).toBe(EmailOutboxStatus.FAILED);
    expect(updated!.attempts).toBe(5);
    expect(updated!.lastErrorCode).toBe('SMTP_UNAVAILABLE');
  });

  // Gate E18: Raw tokens are never stored in outbox
  it('[Gate E18] guarantees raw security tokens are never stored in outbox table or templateDataJson', async () => {
    const rawResetToken = 'super_secret_raw_token_xyz_1234567890abcdef';
    const encryptedToken = encryptActionToken(rawResetToken);

    const outbox = await emailOutboxService.enqueueEmail({
      eventType: EmailEventType.PASSWORD_RESET,
      recipient: 'tokensec@colin.test',
      subject: 'Password Reset',
      templateAlias: 'password_reset',
      templateData: {
        firstName: 'Anjali',
        encryptedToken,
      },
    });

    const recordInDb = await prisma.emailOutbox.findUnique({ where: { id: outbox.id } });
    const serializedJson = JSON.stringify(recordInDb);

    // Strict assertion: Raw token MUST NOT exist anywhere in database serialized record!
    expect(serializedJson).not.toContain(rawResetToken);
    expect(serializedJson).toContain('encryptedToken');

    // Worker decrypts it only at send-time
    const worker = new EmailWorker({ provider: mockProvider });
    await worker.runBatch(5);

    const sent = mockProvider.getLastMessage();
    expect(sent).toBeDefined();
    expect(sent!.htmlBody).toContain(rawResetToken);
  });

  // Gate E19: Raw tokens never appear in logs
  it('[Gate E19] redacts sensitive tokens, passwords, and authorization credentials from logs', () => {
    const sensitiveLogObject = {
      action: 'EMAIL_DISPATCH',
      rawToken: 'do_not_log_this_raw_token_999',
      password: 'SuperSecretPassword123!',
      passwordHash: '$2b$12$abcdefg...',
      authorization: 'Bearer SG.secret_api_key',
      serverToken: 'pm_token_secret',
      encryptedToken: 'iv:tag:data',
      user: {
        email: 'user@colin.in',
        nestedToken: 'nested_secret_token_val',
      },
    };

    const sanitized: any = sanitizeForLogging(sensitiveLogObject);
    expect(sanitized.rawToken).toBe('[REDACTED]');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.passwordHash).toBe('[REDACTED]');
    expect(sanitized.authorization).toBe('[REDACTED]');
    expect(sanitized.serverToken).toBe('[REDACTED]');
    expect(sanitized.encryptedToken).toBe('[REDACTED]');
    expect(sanitized.user.nestedToken).toBe('[REDACTED]');
    expect(sanitized.user.email).toBe('user@colin.in');
  });

  // Gate E25: Invalid recipients are suppressed
  it('[Gate E25] suppresses delivery attempts to email addresses on the suppression list', async () => {
    const suppressedEmail = 'bounced_user@colin.test';

    // Add to suppression table
    await emailOutboxService.addSuppression(
      suppressedEmail,
      '550 5.1.1 User unknown / hard bounce',
      'test',
      'sendgrid'
    );

    expect(await emailOutboxService.isRecipientSuppressed(suppressedEmail)).toBe(true);

    // Enqueueing email for this recipient immediately transitions to SUPPRESSED
    const record = await emailOutboxService.enqueueEmail({
      eventType: EmailEventType.VERIFICATION_EMAIL,
      recipient: suppressedEmail,
      subject: 'Verify Email',
      templateAlias: 'verification',
      templateData: { firstName: 'BouncedUser' },
    });

    expect(record.status).toBe(EmailOutboxStatus.SUPPRESSED);
    expect(record.lastErrorMessage).toContain('suppressed');

    // Worker will NOT claim SUPPRESSED records
    const worker = new EmailWorker({ provider: mockProvider });
    const claimed = await worker.claimBatch(10);
    expect(claimed.some((c) => c.id === record.id)).toBe(false);
  });
});
