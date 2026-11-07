/**
 * COLIN Transactional Email - Configuration & Validation
 * Phase 4A.2.5.3: Transactional Email Integration
 */

import { z } from 'zod';
import { EmailConfigurationError } from './email.errors';
import { EmailProviderName } from './email.types';

const emailConfigSchema = z.object({
  provider: z.enum(['mock', 'sendgrid', 'postmark']).default('mock'),
  fromAddress: z.string().email().default('no-reply@colin.in'),
  fromName: z.string().min(1).default('COLIN — Campus Living Verified'),
  replyTo: z.string().email().optional().default('support@colin.in'),
  sendgridApiKey: z.string().optional(),
  postmarkServerToken: z.string().optional(),
  webhookBasicAuthUser: z.string().min(1).default('colin-webhook-admin'),
  webhookBasicAuthPassword: z.string().min(8).default('colin-webhook-secret-key-2026!'),
  publicBaseUrl: z.string().url().default('http://localhost:5173'),
  workerEnabled: z.boolean().default(false),
  maxRetries: z.number().int().min(1).max(20).default(5),
  retryBaseDelayMs: z.number().int().min(1000).default(30000), // 30s base
  batchSize: z.number().int().min(1).max(100).default(20),
});

export type EmailConfig = z.infer<typeof emailConfigSchema>;

let cachedConfig: EmailConfig | null = null;

export function getEmailConfig(forceRefresh = false): EmailConfig {
  if (cachedConfig && !forceRefresh) {
    return cachedConfig;
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  const rawProvider = (process.env.EMAIL_PROVIDER || 'mock').toLowerCase() as EmailProviderName;

  // Production guardrail (Gate E06): Production rejects 'mock' unless explicitly enabled for testing
  if (nodeEnv === 'production' && rawProvider === 'mock' && process.env.ALLOW_MOCK_EMAIL_IN_PRODUCTION !== 'true') {
    throw new EmailConfigurationError(
      "SECURITY & INFRASTRUCTURE ERROR: Production environment strictly rejects 'mock' as an active email delivery provider."
    );
  }

  const rawConfig = {
    provider: rawProvider,
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'no-reply@colin.in',
    fromName: process.env.EMAIL_FROM_NAME || 'COLIN — Campus Living Verified',
    replyTo: process.env.EMAIL_REPLY_TO || 'support@colin.in',
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    postmarkServerToken: process.env.POSTMARK_SERVER_TOKEN,
    webhookBasicAuthUser: process.env.EMAIL_WEBHOOK_BASIC_AUTH_USER || 'colin-webhook-admin',
    webhookBasicAuthPassword: process.env.EMAIL_WEBHOOK_BASIC_AUTH_PASSWORD || 'colin-webhook-secret-key-2026!',
    publicBaseUrl: process.env.EMAIL_PUBLIC_BASE_URL || 'http://localhost:5173',
    workerEnabled: process.env.EMAIL_WORKER_ENABLED === 'true',
    maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES || '5', 10),
    retryBaseDelayMs: parseInt(process.env.EMAIL_RETRY_BASE_DELAY_MS || '30000', 10),
    batchSize: parseInt(process.env.EMAIL_BATCH_SIZE || '20', 10),
  };

  const parsed = emailConfigSchema.safeParse(rawConfig);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      ? (parsed.error.issues as any[]).map((e) => `${e.path?.join?.('.') || 'config'}: ${e.message}`).join(', ')
      : parsed.error.message;
    throw new EmailConfigurationError(`Invalid email configuration: ${errorDetails}`);
  }

  // Validate provider-specific credentials in production
  if (nodeEnv === 'production') {
    if (parsed.data.provider === 'sendgrid' && !parsed.data.sendgridApiKey) {
      throw new EmailConfigurationError(
        'SECURITY & INFRASTRUCTURE ERROR: SendGrid provider in production requires SENDGRID_API_KEY.'
      );
    }
    if (parsed.data.provider === 'postmark' && !parsed.data.postmarkServerToken) {
      throw new EmailConfigurationError(
        'SECURITY & INFRASTRUCTURE ERROR: Postmark provider in production requires POSTMARK_SERVER_TOKEN.'
      );
    }
  }

  cachedConfig = parsed.data;
  return cachedConfig;
}

export function resetEmailConfigCache(): void {
  cachedConfig = null;
}

/**
 * Returns safe email configuration for diagnostic and health monitoring endpoints.
 * Explicitly redacts all API tokens, secret keys, and webhook credentials.
 */
export function getRedactedEmailConfig(): Record<string, unknown> {
  const config = getEmailConfig();
  return {
    provider: config.provider,
    fromAddress: config.fromAddress,
    fromName: config.fromName,
    replyTo: config.replyTo,
    publicBaseUrl: config.publicBaseUrl,
    workerEnabled: config.workerEnabled,
    maxRetries: config.maxRetries,
    retryBaseDelayMs: config.retryBaseDelayMs,
    batchSize: config.batchSize,
    hasSendgridApiKey: Boolean(config.sendgridApiKey),
    hasPostmarkServerToken: Boolean(config.postmarkServerToken),
    webhookUserConfigured: Boolean(config.webhookBasicAuthUser),
    sendgridApiKey: config.sendgridApiKey ? '[REDACTED]' : undefined,
    postmarkServerToken: config.postmarkServerToken ? '[REDACTED]' : undefined,
    webhookBasicAuthPassword: '[REDACTED]',
  };
}
