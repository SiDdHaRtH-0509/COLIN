/**
 * COLIN Structured Operational Logger
 * Phase 4A.2.5.6: Integration Reliability & Failure Handling
 *
 * Provides structured JSON error and event logging with correlation IDs,
 * provider tags, and guaranteed universal secret redaction.
 */

import { redactSecrets } from '../config/secrets.config';
import { IntegrationError } from './errors';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface StructuredLogPayload {
  level: LogLevel;
  timestamp: string;
  provider?: string;
  operation?: string;
  correlationId?: string;
  message: string;
  code?: string;
  durationMs?: number;
  retryAttempt?: number;
  isRetryable?: boolean;
  circuitState?: string;
  details?: Record<string, unknown>;
}

export class ReliabilityLogger {
  private static sanitizeObject(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return redactSecrets(obj);
    if (typeof obj === 'number' || typeof obj === 'boolean') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => ReliabilityLogger.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        // Redact values for sensitive keys
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('secret') ||
          lowerKey.includes('password') ||
          lowerKey.includes('key') ||
          lowerKey.includes('token') ||
          lowerKey.includes('authorization')
        ) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = ReliabilityLogger.sanitizeObject(value);
        }
      }
      return sanitized;
    }

    return String(obj);
  }

  public static log(
    level: LogLevel,
    message: string,
    metadata: {
      provider?: string;
      operation?: string;
      correlationId?: string;
      error?: unknown;
      durationMs?: number;
      retryAttempt?: number;
      isRetryable?: boolean;
      circuitState?: string;
      details?: Record<string, unknown>;
    } = {}
  ): void {
    const payload: StructuredLogPayload = {
      level,
      timestamp: new Date().toISOString(),
      provider: metadata.provider,
      operation: metadata.operation,
      correlationId: metadata.correlationId,
      message: redactSecrets(message),
      durationMs: metadata.durationMs,
      retryAttempt: metadata.retryAttempt,
      isRetryable: metadata.isRetryable,
      circuitState: metadata.circuitState,
    };

    if (metadata.error) {
      if (metadata.error instanceof IntegrationError) {
        payload.code = metadata.error.code;
        payload.isRetryable = metadata.error.isRetryable;
        payload.details = (ReliabilityLogger.sanitizeObject(metadata.error.details) as Record<string, unknown>) || {};
      } else if (metadata.error instanceof Error) {
        payload.code = metadata.error.name;
        payload.details = { errorMessage: redactSecrets(metadata.error.message) };
      }
    }

    if (metadata.details) {
      payload.details = {
        ...payload.details,
        ...(ReliabilityLogger.sanitizeObject(metadata.details) as Record<string, unknown>),
      };
    }

    // In testing, do not spam stdout unless explicitly enabled
    if (process.env.NODE_ENV !== 'test' || process.env.DEBUG_RELIABILITY === 'true') {
      const output = JSON.stringify(payload);
      if (level === 'error') {
        console.error(output);
      } else if (level === 'warn') {
        console.warn(output);
      } else {
        console.log(output);
      }
    }
  }

  public static info(message: string, metadata?: Parameters<typeof ReliabilityLogger.log>[2]): void {
    ReliabilityLogger.log('info', message, metadata);
  }

  public static warn(message: string, metadata?: Parameters<typeof ReliabilityLogger.log>[2]): void {
    ReliabilityLogger.log('warn', message, metadata);
  }

  public static error(message: string, metadata?: Parameters<typeof ReliabilityLogger.log>[2]): void {
    ReliabilityLogger.log('error', message, metadata);
  }
}
