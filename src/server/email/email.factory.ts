/**
 * COLIN Transactional Email - Provider Factory
 * Phase 4A.2.5.3: Transactional Email Integration
 * 
 * Centralized provider resolution enabling seamless provider swapping (Gate E29)
 * and production environment isolation (Gate E06).
 */

import { EmailProvider } from './providers/EmailProvider';
import { MockEmailProvider } from './providers/MockEmailProvider';
import { SendGridProvider } from './providers/SendGridProvider';
import { PostmarkProvider } from './providers/PostmarkProvider';
import { EmailProviderName } from './email.types';
import { getEmailConfig } from './email.config';
import { EmailConfigurationError } from './email.errors';

let singletonMockProvider: MockEmailProvider | null = null;

export function getSharedMockEmailProvider(): MockEmailProvider {
  if (!singletonMockProvider) {
    singletonMockProvider = new MockEmailProvider();
  }
  return singletonMockProvider;
}

export function createEmailProvider(overrideProvider?: EmailProviderName): EmailProvider {
  const config = getEmailConfig();
  const providerType = overrideProvider || config.provider;

  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'production' && providerType === 'mock' && process.env.ALLOW_MOCK_EMAIL_IN_PRODUCTION !== 'true') {
    throw new EmailConfigurationError(
      "SECURITY & INFRASTRUCTURE ERROR: Production environment strictly rejects 'mock' as an active email delivery provider."
    );
  }

  switch (providerType) {
    case 'sendgrid':
      return new SendGridProvider({ apiKey: config.sendgridApiKey });

    case 'postmark':
      return new PostmarkProvider({ serverToken: config.postmarkServerToken });

    case 'mock':
    default:
      return getSharedMockEmailProvider();
  }
}
