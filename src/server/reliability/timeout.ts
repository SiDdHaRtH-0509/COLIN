/**
 * COLIN Timeout & Deadline Management
 * Phase 4A.2.5.6: Integration Reliability & Failure Handling
 *
 * Implements deterministic operation deadlines, cancellation propagation via AbortSignal,
 * resource cleanup, and timeout error translation.
 */

import { IntegrationProviderName, IntegrationTimeoutError } from './errors';

export const DEFAULT_INTEGRATION_TIMEOUTS: Record<IntegrationProviderName, number> = {
  'google-maps': 5000,
  's3-storage': 10000,
  'sendgrid': 5000,
  'postmark': 5000,
  'redis': 3000,
  'postgresql': 10000,
  'generic': 5000,
};

export interface TimeoutOptions {
  provider?: IntegrationProviderName;
  operationName?: string;
  correlationId?: string;
  parentSignal?: AbortSignal;
}

/**
 * Encapsulates an overall operation deadline across multiple retry attempts.
 */
export class OperationDeadline {
  public readonly deadlineTime: number;
  public readonly totalBudgetMs: number;
  private readonly controller: AbortController;
  private timer: NodeJS.Timeout | null = null;

  constructor(budgetMs: number, parentSignal?: AbortSignal) {
    this.totalBudgetMs = budgetMs;
    this.deadlineTime = Date.now() + budgetMs;
    this.controller = new AbortController();

    if (budgetMs > 0) {
      this.timer = setTimeout(() => {
        this.controller.abort(new Error(`Deadline of ${budgetMs}ms exceeded`));
      }, budgetMs);
      if (this.timer.unref) this.timer.unref();
    }

    if (parentSignal) {
      if (parentSignal.aborted) {
        this.abort(parentSignal.reason);
      } else {
        parentSignal.addEventListener('abort', () => this.abort(parentSignal.reason), { once: true });
      }
    }
  }

  public get remainingMs(): number {
    return Math.max(0, this.deadlineTime - Date.now());
  }

  public get isExpired(): boolean {
    return this.remainingMs <= 0 || this.controller.signal.aborted;
  }

  public get signal(): AbortSignal {
    return this.controller.signal;
  }

  public abort(reason?: unknown): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.controller.signal.aborted) {
      this.controller.abort(reason);
    }
  }

  public cleanup(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

/**
 * Executes an async operation with an explicit timeout bound and AbortSignal.
 * Cleans up timer resources reliably in all execution paths.
 */
export async function withTimeout<T>(
  action: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  options: TimeoutOptions = {}
): Promise<T> {
  const provider = options.provider || 'generic';
  const operationName = options.operationName || 'operation';
  const controller = new AbortController();

  let parentAbortListener: (() => void) | null = null;
  if (options.parentSignal) {
    if (options.parentSignal.aborted) {
      controller.abort(options.parentSignal.reason);
    } else {
      parentAbortListener = () => controller.abort(options.parentSignal?.reason);
      options.parentSignal.addEventListener('abort', parentAbortListener, { once: true });
    }
  }

  let timer: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new IntegrationTimeoutError(
          `${provider} ${operationName} timed out after ${timeoutMs}ms.`,
          {
            provider,
            timeoutMs,
            correlationId: options.correlationId,
          }
        )
      );
    }, timeoutMs);
    if (timer.unref) timer.unref();
  });

  try {
    return await Promise.race([action(controller.signal), timeoutPromise]);
  } catch (err: unknown) {
    if (controller.signal.aborted && !(err instanceof IntegrationTimeoutError)) {
      throw new IntegrationTimeoutError(
        `${provider} ${operationName} timed out after ${timeoutMs}ms.`,
        {
          provider,
          timeoutMs,
          correlationId: options.correlationId,
          originalError: err,
        }
      );
    }
    throw err;
  } finally {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (options.parentSignal && parentAbortListener) {
      options.parentSignal.removeEventListener('abort', parentAbortListener);
    }
  }
}
