/**
 * COLIN Automatic Booking Expiry Worker
 * Phase 4A / Final Prototype Remediation Sprint
 *
 * Implements autonomous background processing of overdue student visit decisions:
 * - Runs periodically (default: 60 seconds interval).
 * - Identifies bookings with status = DECISION_PENDING and decision_deadline <= current server time.
 * - Invokes authoritative BookingService.expireOverdueDecisions().
 * - Reuses existing financial settlement logic (Escrow debit ₹150, Revenue credit ₹150, zero refund).
 * - Enforces single-execution mutex lock to prevent concurrent/overlapping worker runs.
 * - Handles transient PostgreSQL errors via exponential backoff retry.
 * - Logs operations with structured logs via ReliabilityLogger.
 * - Integrates into graceful shutdown lifecycle: stops scheduling, drains active executions.
 * - Recovers overdue bookings immediately upon server startup.
 */

import { bookingService, BookingService } from '../services/BookingService';
import { BackgroundWorker, isGracefulShutdownInProgress } from '../lifecycle/shutdown';
import { ReliabilityLogger } from '../reliability/logger';
import { withRetry } from '../reliability/retry';
import { isTransientDatabaseConflict } from '../database/transaction';

export interface BookingExpiryWorkerOptions {
  intervalMs?: number;
  runOnStart?: boolean;
  bookingService?: BookingService;
}

export class BookingExpiryWorker implements BackgroundWorker {
  public readonly name = 'BookingExpiryWorker';

  private intervalMs: number;
  private runOnStart: boolean;
  private service: BookingService;

  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isProcessing = false;
  private inFlightPromise: Promise<number> | null = null;

  constructor(options?: BookingExpiryWorkerOptions) {
    this.intervalMs = options?.intervalMs ?? 60000;
    this.runOnStart = options?.runOnStart ?? true;
    this.service = options?.bookingService ?? bookingService;
  }

  /**
   * Starts the background worker scheduler.
   */
  public start(): void {
    if (this.isRunning) {
      ReliabilityLogger.warn('BookingExpiryWorker start called but worker is already running', {
        operation: 'BookingExpiryWorker.start',
      });
      return;
    }

    this.isRunning = true;
    ReliabilityLogger.info('BookingExpiryWorker started', {
      operation: 'BookingExpiryWorker.start',
      details: { intervalMs: this.intervalMs },
    });

    // Run recovery cycle immediately on startup if requested
    if (this.runOnStart) {
      this.runOnce().catch((err) => {
        ReliabilityLogger.error('BookingExpiryWorker initial startup run encountered error', {
          operation: 'BookingExpiryWorker.initialRun',
          error: err,
        });
      });
    }

    this.timer = setInterval(() => {
      this.runOnce().catch((err) => {
        ReliabilityLogger.error('BookingExpiryWorker scheduled run encountered error', {
          operation: 'BookingExpiryWorker.intervalRun',
          error: err,
        });
      });
    }, this.intervalMs);

    // Unref timer so it doesn't prevent Node process exit in standalone scripts
    if (this.timer && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  /**
   * Executes a single expiry cycle with concurrency guards, transaction protection,
   * retry policies, and structured audit logging.
   */
  public async runOnce(cutoffTime: Date = new Date()): Promise<number> {
    // 1. Guard against running if graceful shutdown is in progress and worker stopped
    if (isGracefulShutdownInProgress() && !this.isRunning) {
      ReliabilityLogger.info('BookingExpiryWorker skipping execution: shutdown in progress', {
        operation: 'BookingExpiryWorker.runOnce',
      });
      return 0;
    }

    // 2. Concurrency guard: prevent duplicate or overlapping concurrent execution
    if (this.isProcessing) {
      ReliabilityLogger.warn('BookingExpiryWorker skipping cycle: previous execution still active', {
        operation: 'BookingExpiryWorker.concurrencyGuard',
      });
      if (this.inFlightPromise) {
        return this.inFlightPromise;
      }
      return 0;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    const executionPromise = (async () => {
      try {
        const expiredCount = await withRetry(
          async () => this.service.expireOverdueDecisions(cutoffTime),
          {
            maxAttempts: 3,
            baseDelayMs: 200,
            maxDelayMs: 1000,
            isRetryable: (err) => isTransientDatabaseConflict(err),
          }
        );

        if (expiredCount > 0) {
          ReliabilityLogger.info(`BookingExpiryWorker processed ${expiredCount} expired booking(s)`, {
            operation: 'BookingExpiryWorker.expireOverdue',
            durationMs: Date.now() - startTime,
            details: { expiredCount },
          });
        }

        return expiredCount;
      } catch (error) {
        ReliabilityLogger.error('BookingExpiryWorker failed to process overdue bookings', {
          provider: 'postgresql',
          operation: 'BookingExpiryWorker.runOnce',
          durationMs: Date.now() - startTime,
          error,
        });
        throw error;
      } finally {
        this.isProcessing = false;
        this.inFlightPromise = null;
      }
    })();

    this.inFlightPromise = executionPromise;
    return executionPromise;
  }

  /**
   * Stops the background worker and drains any active in-flight executions safely.
   */
  public async stop(): Promise<void> {
    ReliabilityLogger.info('BookingExpiryWorker stopping...', {
      operation: 'BookingExpiryWorker.stop',
    });

    this.isRunning = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Drain active execution if present
    if (this.inFlightPromise) {
      ReliabilityLogger.info('BookingExpiryWorker draining in-flight execution...', {
        operation: 'BookingExpiryWorker.drain',
      });
      try {
        await this.inFlightPromise;
      } catch {
        // Error already logged by runOnce
      }
    }

    ReliabilityLogger.info('BookingExpiryWorker stopped cleanly', {
      operation: 'BookingExpiryWorker.stopped',
    });
  }

  public getStatus(): { isRunning: boolean; isProcessing: boolean; intervalMs: number } {
    return {
      isRunning: this.isRunning,
      isProcessing: this.isProcessing,
      intervalMs: this.intervalMs,
    };
  }
}

export const bookingExpiryWorker = new BookingExpiryWorker();
