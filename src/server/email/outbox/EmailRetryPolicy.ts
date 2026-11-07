/**
 * COLIN Transactional Email - Retry Policy & Exponential Backoff
 * Phase 4A.2.5.3: Transactional Email Integration
 * 
 * Enforces Gate E13 (Exponential backoff with jitter) and Gate E14 (Max retries transition to FAILED).
 */

export interface RetryPolicyOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export class EmailRetryPolicy {
  public readonly maxRetries: number;
  public readonly baseDelayMs: number;
  public readonly maxDelayMs: number;

  constructor(options?: RetryPolicyOptions) {
    this.maxRetries = options?.maxRetries ?? 5;
    this.baseDelayMs = options?.baseDelayMs ?? 30000; // 30 seconds
    this.maxDelayMs = options?.maxDelayMs ?? 3600000; // 1 hour cap
  }

  /**
   * Calculates the next attempt timestamp using exponential backoff with random jitter.
   * Attempt 1: ~30s
   * Attempt 2: ~60s
   * Attempt 3: ~120s (2m)
   * Attempt 4: ~240s (4m)
   * Attempt 5: ~480s (8m)
   */
  public calculateNextAttempt(attemptsSoFar: number, fromDate = new Date()): Date {
    const exponent = Math.max(0, attemptsSoFar - 1);
    const exponentialBackoff = this.baseDelayMs * Math.pow(2, exponent);
    const boundedDelay = Math.min(exponentialBackoff, this.maxDelayMs);

    // Add 10-25% random jitter to avoid thundering herd problem
    const jitter = Math.floor(boundedDelay * (0.1 + Math.random() * 0.15));
    const totalDelayMs = boundedDelay + jitter;

    return new Date(fromDate.getTime() + totalDelayMs);
  }

  /**
   * Evaluates if a record should be retried given attempt count and error retryability.
   */
  public shouldRetry(attemptsSoFar: number, isErrorRetryable = true): boolean {
    if (!isErrorRetryable) {
      return false;
    }
    return attemptsSoFar < this.maxRetries;
  }
}
