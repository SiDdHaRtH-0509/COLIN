/**
 * COLIN Transaction Retry Boundaries & Conflict Resolution Tests
 * Phase 4A.2.5.6: Integration Reliability & Failure Handling (Finding 4)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  executeTransaction,
  isTransientDatabaseConflict,
} from '../../server/database/transaction';
import {
  TransactionConflictError,
  UniqueConstraintViolationError,
  ValidationConstraintError,
  DatabaseAuthorizationError,
} from '../../server/database/errors';
import { PrismaClient } from '@prisma/client';

describe('COLIN Transaction Retry Boundaries (Finding 4 Audit Closure)', () => {
  describe('isTransientDatabaseConflict', () => {
    it('identifies transient concurrency and deadlock errors', () => {
      expect(isTransientDatabaseConflict(new TransactionConflictError())).toBe(true);
      expect(isTransientDatabaseConflict({ code: 'P2034', message: 'Write conflict' })).toBe(true);
      expect(isTransientDatabaseConflict({ code: 'P2028', message: 'Transaction API error' })).toBe(true);
      expect(isTransientDatabaseConflict(new Error('deadlock detected'))).toBe(true);
      expect(isTransientDatabaseConflict(new Error('could not serialize access due to concurrent update (40001)'))).toBe(true);
    });

    it('rejects deterministic non-transient errors as non-retryable', () => {
      expect(isTransientDatabaseConflict(new UniqueConstraintViolationError('Duplicate email', 'email'))).toBe(false);
      expect(isTransientDatabaseConflict(new ValidationConstraintError('Max photo count exceeded'))).toBe(false);
      expect(isTransientDatabaseConflict(new DatabaseAuthorizationError('Permission denied'))).toBe(false);
      expect(isTransientDatabaseConflict(new Error('Syntax error in SQL query'))).toBe(false);
    });
  });

  describe('executeTransaction retry behavior', () => {
    it('retries transient serialization conflict and succeeds when resolved', async () => {
      let attempts = 0;
      const mockPrisma = {
        $transaction: vi.fn().mockImplementation(async (callback) => {
          attempts++;
          if (attempts === 1) {
            throw new TransactionConflictError('deadlock detected (40P01)');
          }
          return callback({ mockTx: true });
        }),
      } as unknown as PrismaClient;

      const action = vi.fn().mockResolvedValue('transaction-result');

      const result = await executeTransaction(action, {
        prismaClient: mockPrisma,
        maxRetries: 3,
        baseDelayMs: 10,
      });

      expect(result).toBe('transaction-result');
      expect(attempts).toBe(2);
      expect(action).toHaveBeenCalledTimes(1); // Executed inside the successful transaction
    });

    it('fast-fails immediately without retry when a non-transient error occurs', async () => {
      let attempts = 0;
      const mockPrisma = {
        $transaction: vi.fn().mockImplementation(async () => {
          attempts++;
          throw new UniqueConstraintViolationError('duplicate key value violates unique constraint', 'email');
        }),
      } as unknown as PrismaClient;

      const action = vi.fn();

      await expect(
        executeTransaction(action, {
          prismaClient: mockPrisma,
          maxRetries: 5,
          baseDelayMs: 10,
        })
      ).rejects.toThrow(UniqueConstraintViolationError);

      // Must fail on attempt 1 without executing retries
      expect(attempts).toBe(1);
      expect(action).not.toHaveBeenCalled();
    });

    it('exhausts retry budget when transaction conflict persists and rethrows TransactionConflictError', async () => {
      let attempts = 0;
      const mockPrisma = {
        $transaction: vi.fn().mockImplementation(async () => {
          attempts++;
          throw new TransactionConflictError('Serialization failure (40001)');
        }),
      } as unknown as PrismaClient;

      const action = vi.fn();

      await expect(
        executeTransaction(action, {
          prismaClient: mockPrisma,
          maxRetries: 3,
          baseDelayMs: 10,
        })
      ).rejects.toThrow(TransactionConflictError);

      expect(attempts).toBe(3);
      expect(action).not.toHaveBeenCalled();
    });
  });
});
