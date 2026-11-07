/**
 * COLIN Transactional Email - Webhooks & Delivery Tracking Integration Test Suite
 * Phase 4A.2.5.3: Transactional Email Integration
 * 
 * Verifies Gate E20, E21, E22, E23, E24.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { Express } from 'express';
import { createApp } from '../../server/app';
import { getAppPrismaClient } from '../../server/database';
import { initializeDatabaseConnections } from '../../server/database/lifecycle';
import {
  SendGridWebhookHandler,
  PostmarkWebhookHandler,
  emailOutboxService,
  getEmailConfig,
  EmailEventType,
  EmailOutboxStatus,
  EmailDeliveryEventType,
} from '../../server/email';

describe('COLIN Transactional Email - Webhooks & Delivery Events Suite', () => {
  let app: Express;
  const prisma = getAppPrismaClient();

  beforeAll(async () => {
    await initializeDatabaseConnections();
    app = createApp();
  });

  beforeEach(async () => {
    // emailDeliveryEvent is append-only audit infrastructure
    await prisma.emailOutbox.deleteMany({});
    await prisma.emailSuppression.deleteMany({});
  });

  // Gate E20: SendGrid webhook signature verification
  it('[Gate E20] cryptographically verifies SendGrid ECDSA signatures and rejects tampered payloads', () => {
    // Generate valid EC P-256 key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const timestamp = String(Math.floor(Date.now() / 1000));
    const rawBody = JSON.stringify([{ email: 'test@colin.in', event: 'delivered', sg_event_id: 'sg_1' }]);

    // Sign payload (timestamp + rawBody)
    const signer = crypto.createSign('sha256');
    signer.update(Buffer.concat([Buffer.from(timestamp, 'utf8'), Buffer.from(rawBody, 'utf8')]));
    const validSignature = signer.sign(privateKey).toString('base64');

    // 1. Valid signature passes
    const isValid = SendGridWebhookHandler.verifySignature({
      rawBody,
      signature: validSignature,
      timestamp,
      publicKey,
    });
    expect(isValid).toBe(true);

    // 2. Tampered signature fails
    const isTamperedValid = SendGridWebhookHandler.verifySignature({
      rawBody: rawBody + 'tampered',
      signature: validSignature,
      timestamp,
      publicKey,
    });
    expect(isTamperedValid).toBe(false);

    // 3. Invalid signature string fails
    const isBadSigValid = SendGridWebhookHandler.verifySignature({
      rawBody,
      signature: Buffer.from('invalid_sig').toString('base64'),
      timestamp,
      publicKey,
    });
    expect(isBadSigValid).toBe(false);
  });

  // Gate E21: Postmark webhook authentication
  it('[Gate E21] verifies Postmark HTTP Basic Authentication using timing-safe credential comparison', async () => {
    const config = getEmailConfig();
    const validCredentials = Buffer.from(
      `${config.webhookBasicAuthUser}:${config.webhookBasicAuthPassword}`
    ).toString('base64');
    const validAuthHeader = `Basic ${validCredentials}`;

    // 1. Direct handler method
    expect(PostmarkWebhookHandler.verifyBasicAuth(validAuthHeader)).toBe(true);
    expect(PostmarkWebhookHandler.verifyBasicAuth('Basic ' + Buffer.from('wrong:creds').toString('base64'))).toBe(false);
    expect(PostmarkWebhookHandler.verifyBasicAuth('Bearer token')).toBe(false);
    expect(PostmarkWebhookHandler.verifyBasicAuth(undefined)).toBe(false);

    // 2. HTTP Endpoint test
    const unauthRes = await request(app)
      .post('/api/v1/webhooks/email/postmark')
      .send({ RecordType: 'Delivery', MessageID: 'pm_123' });
    expect(unauthRes.status).toBe(401);

    const authRes = await request(app)
      .post('/api/v1/webhooks/email/postmark')
      .set('Authorization', validAuthHeader)
      .send({ RecordType: 'Delivery', MessageID: 'pm_auth_ok_1', Recipient: 'test@colin.in' });
    expect(authRes.status).toBe(200);
    expect(authRes.body.success).toBe(true);
  });

  // Gate E22: Duplicate webhook events are idempotent
  it('[Gate E22] processes duplicate webhook events idempotently without creating duplicate records', async () => {
    const handler = new SendGridWebhookHandler();
    const eventId = `sg_dup_${Date.now()}`;
    const events = [
      {
        email: 'idemp@colin.in',
        timestamp: Math.floor(Date.now() / 1000),
        event: 'delivered',
        sg_event_id: eventId,
        sg_message_id: 'sg_msg_100',
      },
    ];

    // First delivery
    const res1 = await handler.handleEvents(events);
    expect(res1.processed).toBe(1);
    expect(res1.skippedDuplicates).toBe(0);

    // Duplicate delivery
    const res2 = await handler.handleEvents(events);
    expect(res2.processed).toBe(0);
    expect(res2.skippedDuplicates).toBe(1);

    const eventCount = await prisma.emailDeliveryEvent.count({ where: { providerEventId: eventId } });
    expect(eventCount).toBe(1);
  });

  // Gate E23: Delivered event updates delivery state
  it('[Gate E23] updates EmailOutbox status to DELIVERED upon receiving provider delivered webhook', async () => {
    // Create an accepted outbox record
    const msgId = `pm_msg_deliv_${Date.now()}`;
    const outbox = await prisma.emailOutbox.create({
      data: {
        eventType: EmailEventType.VERIFICATION_EMAIL,
        recipient: 'delivered@colin.in',
        subject: 'Verification',
        templateAlias: 'verification',
        templateDataJson: {},
        status: EmailOutboxStatus.ACCEPTED,
        provider: 'postmark',
        providerMessageId: msgId,
      },
    });

    const handler = new PostmarkWebhookHandler();
    await handler.handleEvent({
      RecordType: 'Delivery',
      MessageID: msgId,
      Recipient: 'delivered@colin.in',
      DeliveredAt: new Date().toISOString(),
      ID: `pm_deliv_evt_${Date.now()}`,
    });

    // Outbox should now be DELIVERED
    const updated = await prisma.emailOutbox.findUnique({ where: { id: outbox.id } });
    expect(updated!.status).toBe(EmailOutboxStatus.DELIVERED);

    // Delivery event should be recorded
    const event = await prisma.emailDeliveryEvent.findFirst({ where: { providerMessageId: msgId } });
    expect(event).toBeDefined();
    expect(event!.eventType).toBe(EmailDeliveryEventType.DELIVERED);
  });

  // Gate E24: Bounce event updates delivery state and adds to suppression
  it('[Gate E24] marks EmailOutbox BOUNCED and adds hard-bounced address to suppression list', async () => {
    const bounceEmail = 'invalid_bounced@colin.in';
    const msgId = `sg_bounce_msg_${Date.now()}`;

    const outbox = await prisma.emailOutbox.create({
      data: {
        eventType: EmailEventType.PASSWORD_RESET,
        recipient: bounceEmail,
        subject: 'Password Reset',
        templateAlias: 'password_reset',
        templateDataJson: {},
        status: EmailOutboxStatus.ACCEPTED,
        provider: 'sendgrid',
        providerMessageId: msgId,
      },
    });

    const handler = new SendGridWebhookHandler();
    await handler.handleEvents([
      {
        email: bounceEmail,
        timestamp: Math.floor(Date.now() / 1000),
        event: 'bounce',
        sg_event_id: `sg_bounce_evt_${Date.now()}`,
        sg_message_id: msgId,
        reason: '550 User unknown',
      },
    ]);

    // Outbox must be BOUNCED
    const updated = await prisma.emailOutbox.findUnique({ where: { id: outbox.id } });
    expect(updated!.status).toBe(EmailOutboxStatus.BOUNCED);

    // Recipient must be in suppression list
    const isSuppressed = await emailOutboxService.isRecipientSuppressed(bounceEmail);
    expect(isSuppressed).toBe(true);
  });

  // Immutability & Append-Only Verification
  it('[Immutability Enforcement] strictly enforces append-only immutability on email_delivery_events prohibiting UPDATE and DELETE', async () => {
    const evtId = `immutability_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const event = await prisma.emailDeliveryEvent.create({
      data: {
        provider: 'sendgrid',
        providerEventId: evtId,
        eventType: EmailDeliveryEventType.DELIVERED,
        eventTimestamp: new Date(),
        recipient: 'audit@colin.test',
      },
    });
    expect(event.id).toBeDefined();

    // 1. UPDATE must fail at database level
    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE email_delivery_events SET recipient = 'tampered@evil.test' WHERE id = '${event.id}'::uuid;`
      )
    ).rejects.toThrow(/(?:permission denied for table email_delivery_events|Audit Log Immutability Violation)/);

    // 2. DELETE must fail at database level
    await expect(
      prisma.$executeRawUnsafe(
        `DELETE FROM email_delivery_events WHERE id = '${event.id}'::uuid;`
      )
    ).rejects.toThrow(/(?:permission denied for table email_delivery_events|Audit Log Immutability Violation)/);

    // 3. Record remains unmodified
    const persisted = await prisma.emailDeliveryEvent.findUnique({ where: { id: event.id } });
    expect(persisted).toBeDefined();
    expect(persisted!.recipient).toBe('audit@colin.test');
  });
});
