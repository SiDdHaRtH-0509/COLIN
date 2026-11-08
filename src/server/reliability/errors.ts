/**
/**
 * COLIN Centralized Integration Error Architecture
 * Phase 4A.2.5.6: Integration Reliability & Failure Handling
 *
 * Defines standardized error taxonomy, HTTP status mappings, retryability classification,
 * and universal credential/secret redaction across external service boundaries.
 */

import { redactSecrets } from '../config/secrets.config';

export type IntegrationProviderName =
  | 'google-maps'
  | 's3-storage'
  | 'sendgrid'
  | 'postmark'
  | 'redis'
  | 'postgresql'
  | 'generic';

export interface IntegrationErrorOptions {
  provider: IntegrationProviderName;
  code: string;
  statusCode?: number;
  isRetryable?: boolean;
  correlationId?: string;
  originalError?: unknown;
  details?: Record<string, unknown>;
}

/**
 * Base error class for all external service and infrastructure integration failures.
 * Guarantees that credentials and connection strings are redacted from error messages.
 */
export class IntegrationError extends Error {
  public readonly provider: IntegrationProviderName;
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isRetryable: boolean;
  public readonly correlationId?: string;
  public readonly originalError?: unknown;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, options: IntegrationErrorOptions) {
    // Redact any accidentally embedded secrets from error message
    const sanitizedMessage = redactSecrets(message);
    super(sanitizedMessage);
    this.name = this.constructor.name;
    this.provider = options.provider;
    this.code = options.code;
    this.statusCode = options.statusCode ?? 500;
    this.isRetryable = options.isRetryable ?? false;
    this.correlationId = options.correlationId;
    this.originalError = options.originalError;
    this.details = options.details;

    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON() {
    return {
      name: this.name,
      provider: this.provider,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      isRetryable: this.isRetryable,
      correlationId: this.correlationId,
      details: this.details,
    };
  }
}

/**
 * Thrown when an external integration request exceeds its configured timeout or deadline.
 */
export class IntegrationTimeoutError extends IntegrationError {
  public readonly timeoutMs: number;

  constructor(
    message: string,
    options: {
      provider: IntegrationProviderName;
      timeoutMs: number;
      correlationId?: string;
      originalError?: unknown;
    }
  ) {
    super(message, {
      provider: options.provider,
      code: 'INTEGRATION_TIMEOUT',
      statusCode: 504,
      isRetryable: true,
      correlationId: options.correlationId,
      originalError: options.originalError,
      details: { timeoutMs: options.timeoutMs },
    });
    this.timeoutMs = options.timeoutMs;
  }
}

/**
 * Thrown when a network socket, TCP connection, or DNS lookup fails.
 */
export class IntegrationConnectionError extends IntegrationError {
  constructor(
    message: string,
    options: {
      provider: IntegrationProviderName;
      correlationId?: string;
      originalError?: unknown;
      details?: Record<string, unknown>;
    }
  ) {
    super(message, {
      provider: options.provider,
      code: 'INTEGRATION_CONNECTION_FAILURE',
      statusCode: 503,
      isRetryable: true,
      correlationId: options.correlationId,
      originalError: options.originalError,
      details: options.details,
    });
  }
}

/**
 * Thrown when a provider rejects requests due to quota exhaustion or rate limits (HTTP 429).
 */
export class IntegrationRateLimitError extends IntegrationError {
  public readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    options: {
      provider: IntegrationProviderName;
      retryAfterSeconds?: number;
      correlationId?: string;
      originalError?: unknown;
      details?: Record<string, unknown>;
    }
  ) {
    super(message, {
      provider: options.provider,
      code: 'INTEGRATION_RATE_LIMIT',
      statusCode: 429,
      isRetryable: true,
      correlationId: options.correlationId,
      originalError: options.originalError,
      details: {
        ...options.details,
        retryAfterSeconds: options.retryAfterSeconds,
      },
    });
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

/**
 * Thrown when an operation is rejected immediately because the provider's Circuit Breaker is OPEN.
 */
export class IntegrationCircuitOpenError extends IntegrationError {
  public readonly resetTimeoutMs: number;

  constructor(
    message: string,
    options: {
      provider: IntegrationProviderName;
      resetTimeoutMs: number;
      correlationId?: string;
      details?: Record<string, unknown>;
    }
  ) {
    super(message, {
      provider: options.provider,
      code: 'INTEGRATION_CIRCUIT_OPEN',
      statusCode: 503,
      isRetryable: false,
      correlationId: options.correlationId,
      details: {
        ...options.details,
        resetTimeoutMs: options.resetTimeoutMs,
      },
    });
    this.resetTimeoutMs = options.resetTimeoutMs;
  }
}

/**
 * Thrown when provider API authentication or authorization fails (HTTP 401/403). Non-retryable.
 */
export class IntegrationAuthenticationError extends IntegrationError {
  constructor(
    message: string,
    options: {
      provider: IntegrationProviderName;
      statusCode?: number;
      correlationId?: string;
      originalError?: unknown;
      details?: Record<string, unknown>;
    }
  ) {
    super(message, {
      provider: options.provider,
      code: 'INTEGRATION_AUTHENTICATION_FAILURE',
      statusCode: options.statusCode ?? 401,
      isRetryable: false,
      correlationId: options.correlationId,
      originalError: options.originalError,
      details: options.details,
    });
  }
}

/**
 * General provider-side error (e.g. HTTP 500, 502, 503).
 */
export class IntegrationProviderError extends IntegrationError {
  constructor(
    message: string,
    options: {
      provider: IntegrationProviderName;
      code?: string;
      statusCode?: number;
      isRetryable?: boolean;
      correlationId?: string;
      originalError?: unknown;
      details?: Record<string, unknown>;
    }
  ) {
    const status = options.statusCode ?? 502;
    const retryable = options.isRetryable ?? (status >= 500 || status === 429);
    super(message, {
      provider: options.provider,
      code: options.code ?? `INTEGRATION_PROVIDER_${status}`,
      statusCode: status,
      isRetryable: retryable,
      correlationId: options.correlationId,
      originalError: options.originalError,
      details: options.details,
    });
  }
}

/**
 * Universal classification helper: inspects unknown error and determines retryability.
 */
export function isRetryableIntegrationError(error: unknown): boolean {
  if (error instanceof IntegrationError) {
    return error.isRetryable;
  }

  const errObj = error as Record<string, unknown> | null;
  if (!errObj) return false;

  // Check common network and timeout codes
  const code = typeof errObj.code === 'string' ? errObj.code.toUpperCase() : '';
  const message = typeof errObj.message === 'string' ? errObj.message.toLowerCase() : '';
  const name = typeof errObj.name === 'string' ? errObj.name : '';

  if (
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'EAI_AGAIN' ||
    code === 'ENOTFOUND' ||
    name === 'TimeoutError' ||
    name === 'AbortError' ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('connection reset') ||
    message.includes('network error')
  ) {
    return true;
  }

  // HTTP status codes
  const status = typeof errObj.status === 'number' ? errObj.status : (errObj.statusCode as number | undefined);
  if (status && (status === 429 || status === 502 || status === 503 || status === 504)) {
    return true;
  }

  return false;
}
