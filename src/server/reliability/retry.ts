/**
 * COLIN Retry & Exponential Backoff Engine
 * Phase 4A.2.5.6: Integration Reliability & Failure Handling
 *
 * Implements exponential backoff with randomized full jitter, Retry-After header parsing,
 * total deadline enforcement, and strict retryable error classification.
 */

import { isRetryableIntegrationError, IntegrationRateLimitError } from './errors';
import { OperationDeadline } from './timeout';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
  totalDeadlineMs?: number;
  isRetryable?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  signal?: AbortSignal;
}

/**
 * Parses Retry-After header value (either seconds integer or HTTP date format) into milliseconds.
 */
export function parseRetryAfterHeader(headerValue?: string | number | null): number | null {
  if (headerValue === undefined || headerValue === null) return null;

  if (typeof headerValue === 'number') {
    return Math.max(0, headerValue * 1000);
  }

  const trimmed = String(headerValue).trim();
  const seconds = parseInt(trimmed, 10);
  if (!isNaN(seconds) && String(seconds) === trimmed) {
    return Math.max(0, seconds * 1000);
  }

  // Attempt HTTP Date parse
  const parsedDate = Date.parse(trimmed);
  if (!isNaN(parsedDate)) {
    return Math.max(0, parsedDate - Date.now());
  }

  return null;
}

/**
 * Calculates backoff delay with exponential scaling and randomized full jitter.
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  jitter = true
): number {
  const exponential = baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
  const bounded = Math.min(maxDelayMs, exponential);

  if (!jitter) {
    return bounded;
  }

  // Full jitter: random between 0 and bounded
  return Math.floor(Math.random() * bounded);
}

/**
 * Executes an async action with controlled retries, exponential backoff, and jitter.
 */
export async function withRetry<T>(
  action: (attempt: number, signal: AbortSignal) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 200;
  const maxDelayMs = options.maxDelayMs ?? 3000;
  const jitter = options.jitter ?? true;
  const isRetryableFn = options.isRetryable ?? isRetryableIntegrationError;

  const deadline = options.totalDeadlineMs ? new OperationDeadline(options.totalDeadlineMs, options.signal) : null;
  const activeSignal = deadline ? deadline.signal : options.signal;

  let lastError: unknown;

  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (activeSignal?.aborted) {
        throw activeSignal.reason || new Error('Operation aborted prior to execution.');
      }

      try {
        return await action(attempt, activeSignal || new AbortController().signal);
      } catch (err: unknown) {
        lastError = err;

        // If this was our last allowed attempt, do not wait; rethrow immediately
        if (attempt >= maxAttempts) {
          break;
        }

        // Check if the error is classified as retryable
        if (!isRetryableFn(err, attempt)) {
          break;
        }

        // Check if deadline is already exceeded
        if (deadline && deadline.isExpired) {
          break;
        }

        // Determine backoff delay: check for Retry-After first
        let delayMs = calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs, jitter);

        if (err instanceof IntegrationRateLimitError && err.retryAfterSeconds) {
          delayMs = Math.max(delayMs, err.retryAfterSeconds * 1000);
        } else {
          // Check for retry-after in error details or headers
          const errObj = err as Record<string, unknown> | null;
          const retryAfterVal = errObj?.retryAfter || (errObj?.headers as Record<string, string>)?.['retry-after'];
          const parsedHeaderDelay = parseRetryAfterHeader(retryAfterVal as string | number);
          if (parsedHeaderDelay !== null) {
            delayMs = Math.max(delayMs, parsedHeaderDelay);
          }
        }

        // Cap delay to remaining deadline budget if deadline is active
        if (deadline) {
          const remaining = deadline.remainingMs;
          if (remaining <= 0) break;
          delayMs = Math.min(delayMs, remaining);
        }

        if (options.onRetry) {
          options.onRetry(err, attempt, delayMs);
        }

        // Sleep for delay duration with abort awareness
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, delayMs);
          if (activeSignal) {
            const onAbort = () => {
              clearTimeout(timer);
              reject(activeSignal.reason || new Error('Operation aborted during backoff delay.'));
            };
            activeSignal.addEventListener('abort', onAbort, { once: true });
          }
        });
      }
    }
  } finally {
    if (deadline) {
      deadline.cleanup();
    }
  }

  throw lastError;
}
