/**
 * COLIN Transactional Email - Error Hierarchy
 * Phase 4A.2.5.3: Transactional Email Integration
 */

export class EmailError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = 'EMAIL_ERROR', statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class EmailConfigurationError extends EmailError {
  constructor(message: string) {
    super(message, 'EMAIL_CONFIG_ERROR', 500);
  }
}

export class EmailProviderError extends EmailError {
  public readonly isRetryable: boolean;
  public readonly provider: string;

  constructor(message: string, provider: string, code = 'PROVIDER_ERROR', isRetryable = false, statusCode = 502) {
    super(`[${provider}] ${message}`, code, statusCode);
    this.provider = provider;
    this.isRetryable = isRetryable;
  }
}

export class EmailSuppressionError extends EmailError {
  public readonly recipient: string;

  constructor(recipient: string, reason: string) {
    super(`Recipient <${recipient}> is suppressed from receiving emails: ${reason}`, 'EMAIL_SUPPRESSED', 422);
    this.recipient = recipient;
  }
}

export class EmailTemplateError extends EmailError {
  constructor(message: string) {
    super(message, 'EMAIL_TEMPLATE_ERROR', 400);
  }
}

export class EmailWebhookVerificationError extends EmailError {
  constructor(message: string) {
    super(message, 'WEBHOOK_VERIFICATION_FAILED', 401);
  }
}
