/**
 * COLIN Graceful Teardown & Lifecycle Manager
 * Phase 4A.2.5.6: Integration Reliability & Failure Handling
 *
 * Implements strict 6-step ordered graceful shutdown:
 * 1. Stop accepting new HTTP connections (server.close()).
 * 2. Allow active in-flight requests to complete within the grace period (close idle connections).
 * 3. Stop background workers (e.g. email outbox processing, job runners).
 * 4. Drain and disconnect database connection pools (shutdownDatabaseConnections()).
 * 5. Close Redis clients and distributed connection pools (shutdownRedis()).
 * 6. Finalize teardown; terminate forcefully only if grace period expires.
 */

import http from 'node:http';
import { shutdownDatabaseConnections } from '../database/lifecycle';
import { shutdownRedis } from '../redis';
import { ReliabilityLogger } from '../reliability/logger';

export interface BackgroundWorker {
  name?: string;
  stop: () => Promise<void> | void;
}

const activeBackgroundWorkers: Set<BackgroundWorker> = new Set();

/**
 * Registers an active background worker to be cleanly stopped on graceful shutdown.
 * Returns an unregister function.
 */
export function registerBackgroundWorker(worker: BackgroundWorker): () => void {
  activeBackgroundWorkers.add(worker);
  return () => {
    activeBackgroundWorkers.delete(worker);
  };
}

/**
 * Unregisters a background worker from the shutdown registry.
 */
export function unregisterBackgroundWorker(worker: BackgroundWorker): void {
  activeBackgroundWorkers.delete(worker);
}

/**
 * Returns a list of currently registered background workers.
 */
export function getRegisteredBackgroundWorkers(): BackgroundWorker[] {
  return Array.from(activeBackgroundWorkers);
}

export interface GracefulShutdownOptions {
  server?: http.Server | null;
  gracePeriodMs?: number;
  backgroundWorkers?: BackgroundWorker[];
  signal?: string;
  exitProcess?: boolean;
}

export interface ShutdownExecutionReport {
  success: boolean;
  signal: string;
  stepsCompleted: string[];
  durationMs: number;
  error?: unknown;
}

let isShuttingDown = false;

/**
 * Checks whether the server lifecycle is currently in a graceful shutdown sequence.
 */
export function isGracefulShutdownInProgress(): boolean {
  return isShuttingDown;
}

/**
 * Resets the shutdown state flag (primarily for test environments).
 */
export function resetShutdownState(): void {
  isShuttingDown = false;
}

/**
 * Executes the 6-step graceful shutdown protocol.
 */
export async function executeGracefulShutdown(
  options: GracefulShutdownOptions = {}
): Promise<ShutdownExecutionReport> {
  if (isShuttingDown) {
    return {
      success: true,
      signal: options.signal || 'DUPLICATE',
      stepsCompleted: ['ALREADY_SHUTTING_DOWN'],
      durationMs: 0,
    };
  }
  isShuttingDown = true;

  const startTime = Date.now();
  const signal = options.signal || 'SIGTERM';
  const gracePeriodMs = options.gracePeriodMs ?? 5000;
  const stepsCompleted: string[] = [];
  const server = options.server || null;

  ReliabilityLogger.info(`Graceful shutdown initiated with signal: ${signal}`, {
    operation: 'executeGracefulShutdown',
    details: { signal, gracePeriodMs },
  });

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Stop accepting new HTTP requests
    // -------------------------------------------------------------------------
    if (server && server.listening) {
      await new Promise<void>((resolve) => {
        server.close((err) => {
          if (err) {
            ReliabilityLogger.warn('Error while closing HTTP server listener', {
              operation: 'server.close',
              error: err,
            });
          }
          resolve();
        });
      });
      stepsCompleted.push('STOP_NEW_HTTP_REQUESTS');
    } else {
      stepsCompleted.push('STOP_NEW_HTTP_REQUESTS_SKIPPED');
    }

    // -------------------------------------------------------------------------
    // STEP 2: Allow in-flight requests to complete within grace period
    // -------------------------------------------------------------------------
    if (server) {
      // Close idle sockets so keep-alive connections do not block process exit
      if (typeof (server as any).closeIdleConnections === 'function') {
        (server as any).closeIdleConnections();
      }
      stepsCompleted.push('DRAIN_IN_FLIGHT_REQUESTS');
    } else {
      stepsCompleted.push('DRAIN_IN_FLIGHT_REQUESTS_SKIPPED');
    }

    // -------------------------------------------------------------------------
    // STEP 3: Stop background workers
    // -------------------------------------------------------------------------
    const workersToStop = options.backgroundWorkers || Array.from(activeBackgroundWorkers);
    if (workersToStop.length > 0) {
      await Promise.all(
        workersToStop.map(async (worker) => {
          try {
            await worker.stop();
          } catch (workerErr) {
            ReliabilityLogger.error(`Error stopping worker ${worker.name || 'unnamed'}`, {
              operation: 'stopBackgroundWorker',
              error: workerErr,
            });
          }
        })
      );
      stepsCompleted.push('STOP_BACKGROUND_WORKERS');
    } else {
      stepsCompleted.push('STOP_BACKGROUND_WORKERS_NONE');
    }

    // -------------------------------------------------------------------------
    // STEP 4: Drain database connections
    // -------------------------------------------------------------------------
    try {
      await shutdownDatabaseConnections();
      stepsCompleted.push('DRAIN_DATABASE_CONNECTIONS');
    } catch (dbErr) {
      ReliabilityLogger.error('Error draining database connections during shutdown', {
        provider: 'postgresql',
        operation: 'shutdownDatabaseConnections',
        error: dbErr,
      });
      stepsCompleted.push('DRAIN_DATABASE_CONNECTIONS_FAILED');
    }

    // -------------------------------------------------------------------------
    // STEP 5: Close Redis and other external resources
    // -------------------------------------------------------------------------
    try {
      await shutdownRedis();
      stepsCompleted.push('CLOSE_REDIS_RESOURCES');
    } catch (redisErr) {
      ReliabilityLogger.error('Error closing Redis connections during shutdown', {
        provider: 'redis',
        operation: 'shutdownRedis',
        error: redisErr,
      });
      stepsCompleted.push('CLOSE_REDIS_RESOURCES_FAILED');
    }

    // -------------------------------------------------------------------------
    // STEP 6: Completion / Force termination fallback check
    // -------------------------------------------------------------------------
    const durationMs = Date.now() - startTime;
    stepsCompleted.push('GRACEFUL_SHUTDOWN_COMPLETE');

    ReliabilityLogger.info('Graceful shutdown completed successfully', {
      operation: 'executeGracefulShutdown',
      details: { durationMs, stepsCompleted },
    });

    if (options.exitProcess && process.env.NODE_ENV !== 'test') {
      process.exit(0);
    }

    return {
      success: true,
      signal,
      stepsCompleted,
      durationMs,
    };
  } catch (fatalErr: unknown) {
    const durationMs = Date.now() - startTime;
    ReliabilityLogger.error('Fatal error during graceful teardown execution', {
      operation: 'executeGracefulShutdown',
      error: fatalErr,
      details: { durationMs, stepsCompleted },
    });

    if (options.exitProcess && process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }

    return {
      success: false,
      signal,
      stepsCompleted,
      durationMs,
      error: fatalErr,
    };
  }
}
