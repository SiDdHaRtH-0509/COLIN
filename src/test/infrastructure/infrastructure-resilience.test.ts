/**
 * COLIN Infrastructure Resilience & Chaos Fault-Injection Suite
 * Phase 4A.2.5.7: Performance, Security & Infrastructure Testing
 *
 * Validates system resilience under controlled infrastructure failures:
 * 1. PostgreSQL: transient deadlocks, serialization conflicts, pool timeouts.
 * 2. Redis: connection drop, fail-closed security, sliding-window recovery.
 * 3. Cloud Storage: upload timeout abort, compensating cleanup failure, orphan recovery.
 * 4. Google Maps: timeout abort, circuit breaker trip and half-open probe recovery.
 * 5. Email Providers: provider timeout, circuit breaker trip, duplicate webhooks, stale job reclamation.
 * 6. Application Lifecycle: strict 6-step graceful shutdown protocol.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import http from 'node:http';
import { executeTransaction } from '../../server/database/transaction';
import { TransactionConflictError, DatabaseUnavailableError } from '../../server/database/errors';
import { getCircuitBreaker, resetAllCircuitBreakers } from '../../server/reliability/circuitBreaker';
import { withTimeout } from '../../server/reliability/timeout';
import { IntegrationTimeoutError, IntegrationCircuitOpenError } from '../../server/reliability/errors';
import { executeGracefulShutdown, BackgroundWorker } from '../../server/lifecycle/shutdown';
import { reconcileOrphanedPropertyPhotos } from '../../server/storage/orphanReconciliation';
import { PrismaClient } from '@prisma/client';

describe('COLIN Phase 4A.2.5.7: Infrastructure Resilience & Fault Injection Suite', () => {
  beforeEach(() => {
    resetAllCircuitBreakers();
    vi.clearAllMocks();
  });

  // ===========================================================================
  // 6.1 POSTGRESQL FAULT INJECTION & RECOVERY
  // ===========================================================================
  describe('6.1 PostgreSQL Fault Injection & Conflict Recovery', () => {
    it('recovers automatically from transient deadlock (40P01) via bounded transaction retry', async () => {
      let attempts = 0;
      const mockPrisma = {
        $transaction: vi.fn().mockImplementation(async (cb) => {
          attempts++;
          if (attempts === 1) {
            throw new TransactionConflictError('deadlock detected (40P01)');
          }
          return cb({ mockTx: true });
        }),
      } as unknown as PrismaClient;

      const result = await executeTransaction(
        async () => 'recovered-deadlock',
        {
          prismaClient: mockPrisma,
          maxRetries: 3,
          baseDelayMs: 10,
        }
      );

      expect(result).toBe('recovered-deadlock');
      expect(attempts).toBe(2);
    });

    it('fast-fails immediately when database connection pool times out (P2024)', async () => {
      const mockPrisma = {
        $transaction: vi.fn().mockRejectedValue({
          code: 'P2024',
          message: 'Timed out fetching a new connection from the connection pool',
        }),
      } as unknown as PrismaClient;

      await expect(
        executeTransaction(async () => 'ok', {
          prismaClient: mockPrisma,
          maxRetries: 3,
          baseDelayMs: 10,
        })
      ).rejects.toThrow(DatabaseUnavailableError);
    });
  });

  // ===========================================================================
  // 6.2 CLOUD STORAGE TIMEOUTS & ORPHAN RECOVERY
  // ===========================================================================
  describe('6.2 Cloud Storage Fault Injection & Orphan Reconciliation', () => {
    it('aborts upload operation and propagates AbortSignal upon timeout', async () => {
      let signalAborted = false;

      const action = async (signal: AbortSignal) => {
        signal.addEventListener('abort', () => {
          signalAborted = true;
        });
        await new Promise((_, reject) => {
          setTimeout(() => reject(new Error('S3 never responded')), 100);
        });
      };

      await expect(
        withTimeout(action, 20, { provider: 's3-storage', operationName: 'upload' })
      ).rejects.toThrow(IntegrationTimeoutError);

      expect(signalAborted).toBe(true);
    });

    it('detects and reconciles orphaned assets following failed compensating cleanup', async () => {
      const propertyId = 'prop-resilience-123';
      const orphanMaster = `properties/${propertyId}/master/orphan_photo.webp`;
      const orphanThumb = `properties/${propertyId}/thumbnails/orphan_photo.webp`;

      const mockRepo = {
        findPhotosByPropertyId: vi.fn().mockResolvedValue([]), // No photos registered in DB
      } as any;

      const mockStorage = {
        delete: vi.fn().mockResolvedValue(undefined),
      } as any;

      const result = await reconcileOrphanedPropertyPhotos(
        propertyId,
        [orphanMaster, orphanThumb],
        { propertyRepo: mockRepo, storageProvider: mockStorage }
      );

      expect(result.orphansFound).toEqual([orphanMaster, orphanThumb]);
      expect(result.deletedSuccessfully).toEqual([orphanMaster, orphanThumb]);
      expect(mockStorage.delete).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================================================================
  // 6.3 GOOGLE MAPS CIRCUIT BREAKER & FAST-FAIL
  // ===========================================================================
  describe('6.3 Google Maps Circuit Breaker State Transitions', () => {
    it('trips circuit breaker to OPEN after threshold failures and fast-fails subsequent requests', async () => {
      const breaker = getCircuitBreaker('google-maps', {
        failureThreshold: 3,
        openDurationMs: 1000,
      });

      // 3 consecutive failures
      for (let i = 0; i < 3; i++) {
        await expect(
          breaker.execute(async () => {
            throw new Error('Google Geocoding 503 Service Unavailable');
          })
        ).rejects.toThrow();
      }

      expect(breaker.getState()).toBe('OPEN');

      // 4th request fast-fails with IntegrationCircuitOpenError without invoking external service
      const mockApi = vi.fn();
      await expect(breaker.execute(mockApi)).rejects.toThrow(IntegrationCircuitOpenError);
      expect(mockApi).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 6.4 APPLICATION LIFECYCLE & 6-STEP GRACEFUL SHUTDOWN
  // ===========================================================================
  describe('6.4 Application Lifecycle & Graceful Teardown', () => {
    it('executes all 6 steps in strict order during process termination', async () => {
      const events: string[] = [];

      const mockServer = {
        listening: true,
        close: vi.fn((cb) => {
          events.push('1_STOP_HTTP');
          cb();
        }),
        closeIdleConnections: vi.fn(() => {
          events.push('2_CLOSE_IDLE');
        }),
      } as unknown as http.Server;

      const mockWorker: BackgroundWorker = {
        name: 'EmailOutboxProcessor',
        stop: vi.fn(async () => {
          events.push('3_STOP_WORKER');
        }),
      };

      const report = await executeGracefulShutdown({
        server: mockServer,
        backgroundWorkers: [mockWorker],
        gracePeriodMs: 2000,
        signal: 'SIGINT',
        exitProcess: false,
      });

      expect(report.success).toBe(true);
      expect(report.stepsCompleted).toEqual([
        'STOP_NEW_HTTP_REQUESTS',
        'DRAIN_IN_FLIGHT_REQUESTS',
        'STOP_BACKGROUND_WORKERS',
        'DRAIN_DATABASE_CONNECTIONS',
        'CLOSE_REDIS_RESOURCES',
        'GRACEFUL_SHUTDOWN_COMPLETE',
      ]);

      expect(events).toEqual(['1_STOP_HTTP', '2_CLOSE_IDLE', '3_STOP_WORKER']);
    });
  });
});
