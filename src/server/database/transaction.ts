/**
 * COLIN Centralized Database Transaction Manager
 * Phase 4A.2.2.2: Backend Database Connectivity & ORM Integration
 * 
 * Manages interactive Prisma transactions, configurable timeout bounds,
 * ACID rollback guarantees, and error translation.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { getAppPrismaClient, getAdminPrismaClient } from './prisma';
import { translateDatabaseError, TransactionConflictError } from './errors';
import { withRetry } from '../reliability/retry';

export interface TransactionOptions {
  role?: 'app' | 'admin';
  maxWaitMs?: number;
  timeoutMs?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
  maxRetries?: number; // Optional retry attempts for transient concurrency conflicts (P2034, 40001, 40P01)
}

/**
 * Executes a sequence of database operations within an atomic Prisma interactive transaction.
 * Automatically rolls back all changes if any error occurs, translates engine errors,
 * and provides controlled retry for transient concurrency/deadlock conflicts.
 */
export async function executeTransaction<T>(
  action: (tx: Prisma.TransactionClient) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const role = options.role || 'app';
  const client: PrismaClient = role === 'admin' ? getAdminPrismaClient() : getAppPrismaClient();

  const maxWait = options.maxWaitMs || 5000;
  const timeout = options.timeoutMs || 10000;
  const isolationLevel = options.isolationLevel || Prisma.TransactionIsolationLevel.ReadCommitted;
  const maxRetries = options.maxRetries ?? 1; // Default to single execution unless retry is enabled

  return await withRetry(
    async () => {
      try {
        return await client.$transaction(
          async (tx) => {
            return await action(tx);
          },
          {
            maxWait,
            timeout,
            isolationLevel,
          }
        );
      } catch (err) {
        throw translateDatabaseError(err);
      }
    },
    {
      maxAttempts: maxRetries,
      baseDelayMs: 100,
      maxDelayMs: 1000,
      jitter: true,
      isRetryable: (err) => err instanceof TransactionConflictError,
    }
  );
}
