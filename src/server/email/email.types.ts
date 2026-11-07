/**
 * COLIN Transactional Email Architecture - Type Definitions
 * Phase 4A.2.5.3: Transactional Email Integration
 */

import {
  EmailOutboxStatus,
  EmailEventType,
  EmailDeliveryEventType,
} from '@prisma/client';

export { EmailOutboxStatus, EmailEventType, EmailDeliveryEventType };

export type EmailProviderName = 'mock' | 'sendgrid' | 'postmark';

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailSender {
  email: string;
  name?: string;
}

export interface EmailMessage {
  to: string;
  toName?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  templateAlias?: string;
  templateData?: Record<string, unknown>;
  idempotencyKey?: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface EmailSendResult {
  success: boolean;
  provider: EmailProviderName;
  providerMessageId?: string;
  statusCode?: number;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface VerificationEmailPayload {
  recipientEmail: string;
  firstName: string;
  rawToken: string;
  expirationHours?: number;
}

export interface PasswordResetEmailPayload {
  recipientEmail: string;
  firstName: string;
  rawToken: string;
  expirationMinutes?: number;
}

export interface PasswordChangedEmailPayload {
  recipientEmail: string;
  firstName: string;
  changedAt?: Date;
  ipAddress?: string;
}

export interface AccountSecurityEmailPayload {
  recipientEmail: string;
  firstName: string;
  eventDescription: string;
  timestamp?: Date;
  ipAddress?: string;
  actionRequired?: string;
}

export interface OutboxEnqueueInput {
  eventType: EmailEventType;
  recipient: string;
  subject: string;
  templateAlias: string;
  templateData: Record<string, unknown>;
  idempotencyKey?: string;
  scheduledAt?: Date;
  maxRetries?: number;
}

export interface OutboxMetrics {
  pendingCount: number;
  processingCount: number;
  acceptedCount: number;
  deliveredCount: number;
  bouncedCount: number;
  failedCount: number;
  suppressedCount: number;
  oldestPendingAgeSeconds: number | null;
  lastWorkerRunAt: Date | null;
}
