/**
 * COLIN Graceful Teardown & Lifecycle Tests
 * Phase 4A.2.5.6: Integration Reliability & Failure Handling (Finding 4)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import http from 'node:http';
import {
  executeGracefulShutdown,
  registerBackgroundWorker,
  resetShutdownState,
  BackgroundWorker,
} from '../../server/lifecycle/shutdown';

// Mock database and redis lifecycle modules
vi.mock('../../server/database/lifecycle', () => ({
  shutdownDatabaseConnections: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../server/redis', () => ({
  shutdownRedis: vi.fn().mockResolvedValue(undefined),
}));

import { shutdownDatabaseConnections } from '../../server/database/lifecycle';
import { shutdownRedis } from '../../server/redis';

describe('COLIN Graceful Teardown Lifecycle (Finding 4 Audit Closure)', () => {
  beforeEach(() => {
    resetShutdownState();
    vi.clearAllMocks();
  });

  it('enforces exact 6-step graceful shutdown ordering', async () => {
    const orderEvents: string[] = [];

    // Mock HTTP server
    const mockServer = {
      listening: true,
      close: vi.fn().mockImplementation((cb) => {
        orderEvents.push('STEP_1_SERVER_CLOSE');
        cb();
      }),
      closeIdleConnections: vi.fn().mockImplementation(() => {
        orderEvents.push('STEP_2_CLOSE_IDLE_CONNS');
      }),
    } as unknown as http.Server;

    // Mock background worker
    const mockWorker: BackgroundWorker = {
      name: 'EmailOutboxWorker',
      stop: vi.fn().mockImplementation(async () => {
        orderEvents.push('STEP_3_STOP_WORKER');
      }),
    };

    (shutdownDatabaseConnections as any).mockImplementation(async () => {
      orderEvents.push('STEP_4_SHUTDOWN_DB');
    });

    (shutdownRedis as any).mockImplementation(async () => {
      orderEvents.push('STEP_5_SHUTDOWN_REDIS');
    });

    const report = await executeGracefulShutdown({
      server: mockServer,
      backgroundWorkers: [mockWorker],
      gracePeriodMs: 2000,
      signal: 'SIGTERM',
      exitProcess: false,
    });

    expect(report.success).toBe(true);
    expect(report.signal).toBe('SIGTERM');

    // Verify ordering sequence
    expect(orderEvents).toEqual([
      'STEP_1_SERVER_CLOSE',
      'STEP_2_CLOSE_IDLE_CONNS',
      'STEP_3_STOP_WORKER',
      'STEP_4_SHUTDOWN_DB',
      'STEP_5_SHUTDOWN_REDIS',
    ]);

    expect(report.stepsCompleted).toEqual([
      'STOP_NEW_HTTP_REQUESTS',
      'DRAIN_IN_FLIGHT_REQUESTS',
      'STOP_BACKGROUND_WORKERS',
      'DRAIN_DATABASE_CONNECTIONS',
      'CLOSE_REDIS_RESOURCES',
      'GRACEFUL_SHUTDOWN_COMPLETE',
    ]);

    expect(mockServer.close).toHaveBeenCalledTimes(1);
    expect((mockServer as any).closeIdleConnections).toHaveBeenCalledTimes(1);
    expect(mockWorker.stop).toHaveBeenCalledTimes(1);
    expect(shutdownDatabaseConnections).toHaveBeenCalledTimes(1);
    expect(shutdownRedis).toHaveBeenCalledTimes(1);
  });

  it('handles background worker registration and unregistration properly', async () => {
    const workerStopSpy = vi.fn().mockResolvedValue(undefined);
    const worker: BackgroundWorker = {
      name: 'TelemetryWorker',
      stop: workerStopSpy,
    };

    const unregister = registerBackgroundWorker(worker);

    // Unregister worker
    unregister();

    await executeGracefulShutdown({
      gracePeriodMs: 1000,
      exitProcess: false,
    });

    // Worker was unregistered, should not have been called
    expect(workerStopSpy).not.toHaveBeenCalled();
  });

  it('guarantees idempotency when shutdown is invoked concurrently or repeatedly', async () => {
    const mockServer = {
      listening: true,
      close: vi.fn().mockImplementation((cb) => cb()),
      closeIdleConnections: vi.fn(),
    } as unknown as http.Server;

    const [res1, res2] = await Promise.all([
      executeGracefulShutdown({ server: mockServer, exitProcess: false }),
      executeGracefulShutdown({ server: mockServer, exitProcess: false }),
    ]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    // Server close must be called at most once
    expect(mockServer.close).toHaveBeenCalledTimes(1);
  });
});
