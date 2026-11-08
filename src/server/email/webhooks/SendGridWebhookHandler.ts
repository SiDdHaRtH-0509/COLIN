/**
 * COLIN Transactional Email - SendGrid Webhook Handler
 * Phase 4A.2.5.3: Transactional Email Integration
 * 
 * Enforces Gate E20 (ECDSA signature verification), Gate E22 (Idempotency),
 * Gate E23 (Delivered event mapping), and Gate E24 (Bounce suppression).
 */

import crypto from 'crypto';
import { getAppPrismaClient } from '../../database';
import { EmailDeliveryEventType, EmailOutboxStatus } from '@prisma/client';
import { EmailWebhookVerificationError } from '../email.errors';
import { emailOutboxService } from '../outbox/EmailOutboxService';

export interface SendGridEventPayload {
  email: string;
  timestamp: number;
  event: string;
  sg_event_id: string;
  sg_message_id?: string;
  response?: string;
  reason?: string;
  status?: string;
  [key: string]: unknown;
}

export class SendGridWebhookHandler {
  /**
   * Cryptographically verifies SendGrid Event Webhook ECDSA signature.
   * SendGrid signs (timestamp + rawBody) using ECDSA P-256 with SHA-256.
   */
  public static verifySignature(params: {
    rawBody: string | Buffer;
    signature: string;
    timestamp: string;
    publicKey?: string;
  }): boolean {
    const key = params.publicKey || process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;
    if (!key) {
      // In test/dev environment where key is not configured, check for bypass or test flag
      if (process.env.NODE_ENV === 'test' && !params.publicKey) {
        return true;
      }
      throw new EmailWebhookVerificationError(
        'SendGrid webhook verification key is not configured (SENDGRID_WEBHOOK_VERIFICATION_KEY).'
      );
    }

    try {
      const payload = Buffer.concat([
        Buffer.from(params.timestamp, 'utf8'),
        Buffer.isBuffer(params.rawBody) ? params.rawBody : Buffer.from(params.rawBody, 'utf8'),
      ]);

      // Format public key into PEM format if base64 DER string
      let formattedKey = key;
      if (!key.includes('BEGIN PUBLIC KEY')) {
        formattedKey = `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`;
      }

      const verifier = crypto.createVerify('sha256');
      verifier.update(payload);
      return verifier.verify(formattedKey, Buffer.from(params.signature, 'base64'));
    } catch {
      return false;
    }
  }

  /**
   * Processes an array of SendGrid delivery events idempotently.
   */
  public async handleEvents(events: SendGridEventPayload[]): Promise<{ processed: number; skippedDuplicates: number }> {
    const prisma = getAppPrismaClient();
    let processed = 0;
    let skippedDuplicates = 0;

    for (const ev of events) {
      if (!ev.sg_event_id) {
        continue;
      }

      // 1. Idempotency check: providerEventId uniqueness (Gate E22)
      const existing = await prisma.emailDeliveryEvent.findUnique({
        where: { providerEventId: ev.sg_event_id },
      });
      if (existing) {
        skippedDuplicates++;
        continue;
      }

      // Map event type
      let deliveryType: EmailDeliveryEventType = EmailDeliveryEventType.ACCEPTED;
      let newOutboxStatus: EmailOutboxStatus | null = null;

      switch (ev.event?.toLowerCase()) {
        case 'delivered':
          deliveryType = EmailDeliveryEventType.DELIVERED;
          newOutboxStatus = EmailOutboxStatus.DELIVERED;
          break;

        case 'bounce':
        case 'dropped':
          deliveryType = EmailDeliveryEventType.BOUNCED;
          newOutboxStatus = EmailOutboxStatus.BOUNCED;
          // Add to suppression list (Gate E24, E25)
          await emailOutboxService.addSuppression(
            ev.email,
            ev.reason || 'SendGrid hard bounce event',
            'webhook',
            'sendgrid',
            { event: ev.event, status: ev.status, response: ev.response }
          );
          break;

        case 'spamreport':
          deliveryType = EmailDeliveryEventType.SPAM_COMPLAINT;
          await emailOutboxService.addSuppression(
            ev.email,
            'SendGrid spam complaint',
            'webhook',
            'sendgrid',
            { event: ev.event }
          );
          break;

        case 'deferred':
          deliveryType = EmailDeliveryEventType.DEFERRED;
          newOutboxStatus = EmailOutboxStatus.DEFERRED;
          break;

        default:
          deliveryType = EmailDeliveryEventType.ACCEPTED;
          break;
      }

      // Clean message ID (SendGrid appends filter parameters after period)
      const cleanMessageId = ev.sg_message_id ? ev.sg_message_id.split('.')[0] : null;

      // Locate matching outbox record
      let matchedOutboxId: string | null = null;
      if (cleanMessageId) {
        const outboxRecord = await prisma.emailOutbox.findFirst({
          where: {
            OR: [
              { providerMessageId: cleanMessageId },
              { providerMessageId: ev.sg_message_id },
            ],
          },
          select: { id: true },
        });
        if (outboxRecord) {
          matchedOutboxId = outboxRecord.id;
          if (newOutboxStatus) {
            await prisma.emailOutbox.update({
              where: { id: matchedOutboxId },
              data: { status: newOutboxStatus },
            });
          }
        }
      }

      // Worker crash recovery reconciliation: match via custom arguments (outboxId or idempotencyKey)
      if (!matchedOutboxId) {
        const rawEv = ev as Record<string, any>;
        const fallbackOutboxId = (rawEv.outboxId || rawEv.custom_args?.outboxId) as string | undefined;
        const fallbackIdempotency = (rawEv.idempotencyKey || rawEv.custom_args?.idempotencyKey) as string | undefined;
        if (fallbackOutboxId || fallbackIdempotency) {
          const outboxRecord = await prisma.emailOutbox.findFirst({
            where: {
              OR: [
                ...(fallbackOutboxId ? [{ id: fallbackOutboxId }] : []),
                ...(fallbackIdempotency ? [{ idempotencyKey: fallbackIdempotency }] : []),
              ],
            },
            select: { id: true, providerMessageId: true },
          });
          if (outboxRecord) {
            matchedOutboxId = outboxRecord.id;
            const updateData: { status?: EmailOutboxStatus; providerMessageId?: string } = {};
            if (newOutboxStatus) {
              updateData.status = newOutboxStatus;
            }
            if (!outboxRecord.providerMessageId && cleanMessageId) {
              updateData.providerMessageId = cleanMessageId;
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
          provider: 'sendgrid',
          providerEventId: ev.sg_event_id,
          providerMessageId: ev.sg_message_id || null,
          eventType: deliveryType,
          eventTimestamp: new Date(ev.timestamp ? ev.timestamp * 1000 : Date.now()),
          recipient: ev.email,
          metadataJson: ev as unknown as any,
        },
      });

      processed++;
    }

    return { processed, skippedDuplicates };
  }
}
