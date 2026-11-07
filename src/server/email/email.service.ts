/**
 * COLIN Transactional Email - Central Email Service
 * Phase 4A.2.5.3: Transactional Email Integration
 * 
 * Central API for transactional email dispatch across authentication,
 * security alerts, and marketplace events.
 */

import { Prisma, EmailEventType } from '@prisma/client';
import { emailOutboxService } from './outbox/EmailOutboxService';
import { encryptActionToken } from './email.crypto';
import { OutboxMetrics } from './email.types';

export class EmailService {
  /**
   * Enqueues an email verification dispatch for a newly registered or unverified user.
   * Protects the raw token by storing only an encrypted token inside the outbox table (Gate E18).
   */
  public async sendVerificationEmail(
    user: { id: string; email: string; firstName?: string },
    rawToken: string,
    tx?: Prisma.TransactionClient
  ) {
    const encryptedToken = encryptActionToken(rawToken);

    return emailOutboxService.enqueueEmail(
      {
        eventType: EmailEventType.VERIFICATION_EMAIL,
        recipient: user.email,
        subject: 'Verify your email address — COLIN',
        templateAlias: 'verification',
        templateData: {
          userId: user.id,
          firstName: user.firstName || 'Student',
          encryptedToken,
          expirationHours: 24,
        },
        idempotencyKey: `verify_${user.id}_${Date.now()}`,
      },
      tx
    );
  }

  /**
   * Enqueues a password reset email dispatch.
   * Protects the raw token by storing only an encrypted token inside the outbox table (Gate E18).
   */
  public async sendPasswordResetEmail(
    user: { id: string; email: string; firstName?: string },
    rawToken: string,
    tx?: Prisma.TransactionClient
  ) {
    const encryptedToken = encryptActionToken(rawToken);

    return emailOutboxService.enqueueEmail(
      {
        eventType: EmailEventType.PASSWORD_RESET,
        recipient: user.email,
        subject: 'Reset your password — COLIN',
        templateAlias: 'password_reset',
        templateData: {
          userId: user.id,
          firstName: user.firstName || 'User',
          encryptedToken,
          expirationMinutes: 60,
        },
        idempotencyKey: `reset_${user.id}_${Date.now()}`,
      },
      tx
    );
  }

  /**
   * Enqueues a password-changed security notification email.
   */
  public async sendPasswordChangedEmail(
    user: { id: string; email: string; firstName?: string },
    meta?: { ipAddress?: string; changedAt?: Date },
    tx?: Prisma.TransactionClient
  ) {
    return emailOutboxService.enqueueEmail(
      {
        eventType: EmailEventType.PASSWORD_CHANGED,
        recipient: user.email,
        subject: 'Your COLIN password was changed',
        templateAlias: 'password_changed',
        templateData: {
          userId: user.id,
          firstName: user.firstName || 'User',
          ipAddress: meta?.ipAddress,
          changedAtIso: (meta?.changedAt || new Date()).toISOString(),
        },
        idempotencyKey: `pw_changed_${user.id}_${Date.now()}`,
      },
      tx
    );
  }

  /**
   * Enqueues a general account security notification.
   */
  public async sendAccountSecurityEmail(
    user: { id: string; email: string; firstName?: string },
    details: { eventDescription: string; ipAddress?: string; actionRequired?: string },
    tx?: Prisma.TransactionClient
  ) {
    return emailOutboxService.enqueueEmail(
      {
        eventType: EmailEventType.ACCOUNT_SECURITY,
        recipient: user.email,
        subject: 'COLIN Account Security Notification',
        templateAlias: 'account_security',
        templateData: {
          userId: user.id,
          firstName: user.firstName || 'User',
          eventDescription: details.eventDescription,
          ipAddress: details.ipAddress,
          actionRequired: details.actionRequired,
          timestampIso: new Date().toISOString(),
        },
        idempotencyKey: `sec_${user.id}_${Date.now()}`,
      },
      tx
    );
  }

  /**
   * Returns outbox operational health metrics.
   */
  public async getOutboxMetrics(): Promise<OutboxMetrics> {
    return emailOutboxService.getMetrics();
  }
}

export const emailService = new EmailService();
