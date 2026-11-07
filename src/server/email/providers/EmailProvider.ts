/**
 * COLIN Transactional Email - Provider Interface
 * Phase 4A.2.5.3: Transactional Email Integration
 */

import { EmailMessage, EmailSendResult, EmailProviderName } from '../email.types';

export interface EmailProvider {
  readonly providerName: EmailProviderName;

  /**
   * Dispatches a single transactional email message to the underlying delivery provider.
   */
  sendEmail(message: EmailMessage): Promise<EmailSendResult>;

  /**
   * Validates provider credentials and connectivity prerequisites.
   */
  validatePrerequisites?(): void;
}
