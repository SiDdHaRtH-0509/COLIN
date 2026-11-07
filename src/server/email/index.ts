/**
 * COLIN Transactional Email Subsystem - Central Exports
 * Phase 4A.2.5.3: Transactional Email Integration
 */

export * from './email.types';
export * from './email.errors';
export * from './email.config';
export * from './email.crypto';
export * from './email.factory';
export * from './email.templates';
export * from './email.service';
export * from './providers/EmailProvider';
export * from './providers/MockEmailProvider';
export * from './providers/SendGridProvider';
export * from './providers/PostmarkProvider';
export * from './outbox/EmailOutboxService';
export * from './outbox/EmailWorker';
export * from './outbox/EmailRetryPolicy';
export * from './webhooks/EmailWebhookController';
export * from './webhooks/SendGridWebhookHandler';
export * from './webhooks/PostmarkWebhookHandler';
