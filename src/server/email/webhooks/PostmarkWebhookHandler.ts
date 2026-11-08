/**
 * COLIN Transactional Email - Postmark Webhook Handler
 * Phase 4A.2.5.3: Transactional Email Integration
 * 
 * Enforces Gate E21 (HTTP Basic Auth constant-time comparison), Gate E22 (Idempotency),
 * Gate E23 (Delivered event mapping), and Gate E24 (Bounce suppression).
 */

import crypto from 'crypto';
import { getAppPrismaClient } from '../../database';
import { EmailDeliveryEventType, EmailOutboxStatus } from '@prisma/client';
import { getEmailConfig } from '../email.config';
import { emailOutboxService } from '../outbox/EmailOutboxService';

export interface PostmarkWebhookPayload {
  RecordType?: string;
  MessageID?: string;
  Recipient?: string;
  Email?: string;
  DeliveredAt?: string;
  BouncedAt?: string;
  Type?: string;
  TypeCode?: number;
  Name?: string;
  Description?: string;
  Details?: string;
  ID?: number | string;
  Tag?: string;
  Metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export class PostmarkWebhookHandler {
  /**
   * Verifies Postmark HTTP Basic Authentication header using timing-safe comparison.
   * Header format: "Basic base64(username:password)"
   */
  public static verifyBasicAuth(authHeader?: string): boolean {
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return false;
    }

    try {
      const config = getEmailConfig();
      const expectedUser = config.webhookBasicAuthUser;
      const expectedPass = config.webhookBasicAuthPassword;

      const base64Credentials = authHeader.substring(6).trim();
      const decoded = Buffer.from(base64Credentials, 'base64').toString('utf8');
      const colonIndex = decoded.indexOf(':');
      if (colonIndex === -1) {
        return false;
      }

      const providedUser = decoded.substring(0, colonIndex);
      const providedPass = decoded.substring(colonIndex + 1);

      const userBufferA = Buffer.from(providedUser);
      const userBufferB = Buffer.from(expectedUser);
      const passBufferA = Buffer.from(providedPass);
      const passBufferB = Buffer.from(expectedPass);

      if (userBufferA.length !== userBufferB.length || passBufferA.length !== passBufferB.length) {
        return false;
      }

      const isUserMatch = crypto.timingSafeEqual(userBufferA, userBufferB);
      const isPassMatch = crypto.timingSafeEqual(passBufferA, passBufferB);

      return isUserMatch && isPassMatch;
    } catch {
      return false;
    }
  }

  /**
   * Processes a Postmark webhook event payload idempotently.
   */
  public async handleEvent(payload: PostmarkWebhookPayload): Promise<{ processed: boolean; isDuplicate: boolean }> {
    const prisma = getAppPrismaClient();

    const recordType = payload.RecordType || (payload.Type ? 'Bounce' : 'Delivery');
    const messageId = payload.MessageID;
    const recipient = payload.Recipient || payload.Email;
    const eventId = payload.ID ? String(payload.ID) : `${messageId || 'msg'}_${recordType}`;

    // 1. Idempotency Check (Gate E22)
    const existing = await prisma.emailDeliveryEvent.findUnique({
      where: { providerEventId: eventId },
    });
    if (existing) {
      return { processed: false, isDuplicate: true };
    }

    // Determine event classification
    let deliveryType: EmailDeliveryEventType = EmailDeliveryEventType.ACCEPTED;
    let newOutboxStatus: EmailOutboxStatus | null = null;
    let timestamp = new Date();

    if (recordType === 'Delivery') {
      deliveryType = EmailDeliveryEventType.DELIVERED;
      newOutboxStatus = EmailOutboxStatus.DELIVERED;
      if (payload.DeliveredAt) {
        timestamp = new Date(payload.DeliveredAt);
      }
    } else if (recordType === 'Bounce') {
      deliveryType = EmailDeliveryEventType.BOUNCED;
      newOutboxStatus = EmailOutboxStatus.BOUNCED;
      if (payload.BouncedAt) {
        timestamp = new Date(payload.BouncedAt);
      }

      // Hard bounces get added to suppression table immediately (Gate E24, E25)
      const isHardBounce = payload.Type === 'HardBounce' || payload.TypeCode === 1;
      if (isHardBounce && recipient) {
        await emailOutboxService.addSuppression(
          recipient,
          payload.Description || payload.Details || 'Postmark Hard Bounce',
          'webhook',
          'postmark',
          { type: payload.Type, typeCode: payload.TypeCode }
        );
      }
    } else if (recordType === 'SpamComplaint') {
      deliveryType = EmailDeliveryEventType.SPAM_COMPLAINT;
      if (recipient) {
        await emailOutboxService.addSuppression(
          recipient,
          'Postmark Spam Complaint',
          'webhook',
          'postmark'
        );
      }
    }

    // Locate matching outbox record
    let matchedOutboxId: string | null = null;
    if (messageId) {
      const outbox = await prisma.emailOutbox.findFirst({
        where: { providerMessageId: messageId },
        select: { id: true },
      });
      if (outbox) {
        matchedOutboxId = outbox.id;
        if (newOutboxStatus) {
          await prisma.emailOutbox.update({
            where: { id: matchedOutboxId },
            data: { status: newOutboxStatus },
          });
        }
      }
    }

    // Worker crash recovery reconciliation: match via metadata (outboxId or idempotencyKey)
    if (!matchedOutboxId && payload.Metadata) {
      const metaOutboxId = payload.Metadata.outboxId as string | undefined;
      const metaIdempotency = payload.Metadata.idempotencyKey as string | undefined;
      if (metaOutboxId || metaIdempotency) {
        const outbox = await prisma.emailOutbox.findFirst({
          where: {
            OR: [
              ...(metaOutboxId ? [{ id: metaOutboxId }] : []),
              ...(metaIdempotency ? [{ idempotencyKey: metaIdempotency }] : []),
            ],
          },
          select: { id: true, providerMessageId: true },
        });
        if (outbox) {
          matchedOutboxId = outbox.id;
          const updateData: { status?: EmailOutboxStatus; providerMessageId?: string } = {};
          if (newOutboxStatus) {
            updateData.status = newOutboxStatus;
          }
          if (!outbox.providerMessageId && messageId) {
            updateData.providerMessageId = messageId;
          }
          if (Object.keys(updateData).length > 0) {
            await prisma.emailOutbox.update({
              where: { id: matchedOutboxId },
              data: updateData,
            });
          }
        }
      }
    }

    // Record immutable delivery event
    await prisma.emailDeliveryEvent.create({
      data: {
        emailOutboxId: matchedOutboxId,
        provider: 'postmark',
        providerEventId: eventId,
        providerMessageId: messageId || null,
        eventType: deliveryType,
        eventTimestamp: timestamp,
        recipient: recipient || null,
        metadataJson: payload as unknown as any,
      },
    });

    return { processed: true, isDuplicate: false };
  }
}
