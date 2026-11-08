/**
 * COLIN Transactional Email - Delivery Event Immutability & Audit Integration Tests
 * Phase 4A.2.5.5 Remediation: Finding 3 Verification
 *
 * Verifies append-only immutability of EmailDeliveryEvent records:
 * (A) Ordinary UPDATE operations are rejected by database triggers and permissions.
 * (B) Ordinary DELETE operations are rejected by database triggers and permissions.
 * (C) Parent EmailOutbox deletion cascades cleanly via onDelete: SetNull without deleting audit events.
 * (D) Foreign key behavior does not weaken append-only protections or permit column alterations.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';
import { getAppPrismaClient, getAdminPrismaClient } from '../../server/database';
import { initializeDatabaseConnections } from '../../server/database/lifecycle';
import { EmailDeliveryEventType, EmailEventType, EmailOutboxStatus } from '@prisma/client';

describe('COLIN Email Delivery-Event Immutability & Foreign Key Protection (Finding 3)', () => {
  const prisma = getAppPrismaClient();
  const adminPrisma = getAdminPrismaClient();

  beforeAll(async () => {
    await initializeDatabaseConnections();
  });

  it('(A) strictly rejects ordinary UPDATE operations on delivery events for both app and admin roles', async () => {
    const eventId = `immut_upd_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const event = await prisma.emailDeliveryEvent.create({
      data: {
        provider: 'sendgrid',
        providerEventId: eventId,
        eventType: EmailDeliveryEventType.DELIVERED,
        eventTimestamp: new Date(),
        recipient: 'student.immutability@colin.test',
      },
    });

    expect(event.id).toBeDefined();

    // 1. colin_app_runtime: Attempt to update recipient
    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE email_delivery_events SET recipient = 'malicious@evil.test' WHERE id = '${event.id}'::uuid;`
      )
    ).rejects.toThrow(/(?:permission denied for table email_delivery_events|Audit Log Immutability Violation)/);

    // 2. colin_admin_runtime: Attempt to update recipient
    await expect(
      adminPrisma.$executeRawUnsafe(
        `UPDATE email_delivery_events SET recipient = 'admin_tampered@evil.test' WHERE id = '${event.id}'::uuid;`
      )
    ).rejects.toThrow(/(?:permission denied for table email_delivery_events|Audit Log Immutability Violation)/);

    // 3. Attempt to update event type
    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE email_delivery_events SET event_type = 'BOUNCED'::"EmailDeliveryEventType" WHERE id = '${event.id}'::uuid;`
      )
    ).rejects.toThrow(/(?:permission denied for table email_delivery_events|Audit Log Immutability Violation)/);

    // 4. Attempt to update provider message ID
    await expect(
      adminPrisma.$executeRawUnsafe(
        `UPDATE email_delivery_events SET provider_message_id = 'tampered_id' WHERE id = '${event.id}'::uuid;`
      )
    ).rejects.toThrow(/(?:permission denied for table email_delivery_events|Audit Log Immutability Violation)/);

    // Verify row was completely unmodified
    const persisted = await prisma.emailDeliveryEvent.findUnique({ where: { id: event.id } });
    expect(persisted).toBeDefined();
    expect(persisted!.recipient).toBe('student.immutability@colin.test');
    expect(persisted!.eventType).toBe(EmailDeliveryEventType.DELIVERED);
  });

  it('(B) strictly rejects ordinary DELETE operations on delivery events for both app and admin roles', async () => {
    const eventId = `immut_del_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const event = await prisma.emailDeliveryEvent.create({
      data: {
        provider: 'postmark',
        providerEventId: eventId,
        eventType: EmailDeliveryEventType.ACCEPTED,
        eventTimestamp: new Date(),
        recipient: 'tamper.proof@colin.test',
      },
    });

    expect(event.id).toBeDefined();

    // 1. colin_app_runtime: Attempt direct DELETE query
    await expect(
      prisma.$executeRawUnsafe(
        `DELETE FROM email_delivery_events WHERE id = '${event.id}'::uuid;`
      )
    ).rejects.toThrow(/(?:permission denied for table email_delivery_events|Audit Log Immutability Violation)/);

    // 2. colin_admin_runtime: Attempt direct DELETE query
    await expect(
      adminPrisma.$executeRawUnsafe(
        `DELETE FROM email_delivery_events WHERE id = '${event.id}'::uuid;`
      )
    ).rejects.toThrow(/(?:permission denied for table email_delivery_events|Audit Log Immutability Violation)/);

    // Verify record persists intact
    const persisted = await prisma.emailDeliveryEvent.findUnique({ where: { id: event.id } });
    expect(persisted).toBeDefined();
    expect(persisted!.id).toBe(event.id);
  });

  it('(C) allows parent EmailOutbox deletion with onDelete: SetNull updating email_outbox_id without deleting audit event', async () => {
    // 1. Create a parent EmailOutbox record
    const outbox = await prisma.emailOutbox.create({
      data: {
        recipient: 'cascade.test@colin.test',
        subject: 'Cascade Test Email',
        eventType: EmailEventType.VERIFICATION_EMAIL,
        templateAlias: 'verification',
        templateDataJson: { token: 'sample' },
        status: EmailOutboxStatus.DELIVERED,
      },
    });
    expect(outbox.id).toBeDefined();

    // 2. Create child EmailDeliveryEvent referencing the parent outbox
    const eventId = `immut_cascade_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const event = await prisma.emailDeliveryEvent.create({
      data: {
        emailOutboxId: outbox.id,
        provider: 'sendgrid',
        providerEventId: eventId,
        eventType: EmailDeliveryEventType.DELIVERED,
        eventTimestamp: new Date(),
        recipient: 'cascade.test@colin.test',
      },
    });
    expect(event.emailOutboxId).toBe(outbox.id);

    // 3. Delete the parent EmailOutbox record
    await prisma.emailOutbox.delete({
      where: { id: outbox.id },
    });

    // Verify parent is gone
    const deletedOutbox = await prisma.emailOutbox.findUnique({ where: { id: outbox.id } });
    expect(deletedOutbox).toBeNull();

    // 4. Verify child delivery event was PRESERVED and its emailOutboxId transitioned to NULL
    const preservedEvent = await prisma.emailDeliveryEvent.findUnique({ where: { id: event.id } });
    expect(preservedEvent).toBeDefined();
    expect(preservedEvent!.id).toBe(event.id);
    expect(preservedEvent!.emailOutboxId).toBeNull();
    expect(preservedEvent!.recipient).toBe('cascade.test@colin.test');
    expect(preservedEvent!.eventType).toBe(EmailDeliveryEventType.DELIVERED);
  });

  it('(D) verifies that manual FK nullification and re-linking cannot bypass append-only protections', async () => {
    // 1. Create an outbox record with an active delivery event
    const parentOutbox = await prisma.emailOutbox.create({
      data: {
        recipient: 'manual.test@colin.test',
        subject: 'Manual Nullification Test',
        eventType: EmailEventType.VERIFICATION_EMAIL,
        templateAlias: 'verification',
        templateDataJson: {},
        status: EmailOutboxStatus.ACCEPTED,
      },
    });

    const eventId = `immut_manual_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const linkedEvent = await prisma.emailDeliveryEvent.create({
      data: {
        emailOutboxId: parentOutbox.id,
        provider: 'sendgrid',
        providerEventId: eventId,
        eventType: EmailDeliveryEventType.ACCEPTED,
        eventTimestamp: new Date(),
        recipient: 'manual.test@colin.test',
      },
    });
    expect(linkedEvent.emailOutboxId).toBe(parentOutbox.id);

    // 2. Attempt MANUAL unlinking (setting email_outbox_id = NULL) while parent outbox STILL exists!
    // Must be blocked by the trigger: manual nullification is prohibited while parent exists.
    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE email_delivery_events SET email_outbox_id = NULL WHERE id = '${linkedEvent.id}'::uuid;`
      )
    ).rejects.toThrow(/Audit Log Immutability Violation: Manual unlinking of email_outbox_id is prohibited/);

    // 3. Attempt manual re-linking to a different outbox
    const targetOutbox = await prisma.emailOutbox.create({
      data: {
        recipient: 'target@colin.test',
        subject: 'Target Outbox',
        eventType: EmailEventType.VERIFICATION_EMAIL,
        templateAlias: 'verification',
        templateDataJson: {},
        status: EmailOutboxStatus.PENDING,
      },
    });

    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE email_delivery_events SET email_outbox_id = '${targetOutbox.id}'::uuid WHERE id = '${linkedEvent.id}'::uuid;`
      )
    ).rejects.toThrow(/(?:permission denied for table email_delivery_events|Audit Log Immutability Violation)/);

    // 4. Attempting to delete the event still fails
    await expect(
      prisma.$executeRawUnsafe(
        `DELETE FROM email_delivery_events WHERE id = '${linkedEvent.id}'::uuid;`
      )
    ).rejects.toThrow(/(?:permission denied for table email_delivery_events|Audit Log Immutability Violation)/);

    // Clean up created target outbox
    await prisma.emailOutbox.delete({ where: { id: targetOutbox.id } });
  });
});
