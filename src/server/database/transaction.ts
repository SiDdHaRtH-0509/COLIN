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
import { ReliabilityLogger } from '../reliability/logger';

export interface TransactionOptions {
  role?: 'app' | 'admin';
  maxWaitMs?: number;
  timeoutMs?: number;
  totalDeadlineMs?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
  maxRetries?: number; // Maximum attempts for transient concurrency conflicts (P2034, 40001, 40P01)
  baseDelayMs?: number;
  maxDelayMs?: number;
  prismaClient?: PrismaClient;
}

/**
 * Checks whether an error represents a transient concurrency conflict or deadlock.
 */
export function isTransientDatabaseConflict(error: unknown): boolean {
  if (error instanceof TransactionConflictError) {
    return true;
  }

  const errObj = error as Record<string, unknown> | null;
  const rawMsg = errObj && typeof errObj.message === 'string' ? errObj.message : String(error);
  const code = (errObj?.code as string) || '';

  if (code === 'P2034' || code === 'P2028') {
    return true;
  }

  if (
    rawMsg.includes('40P01') ||
    rawMsg.includes('40001') ||
    rawMsg.includes('deadlock detected') ||
    rawMsg.includes('could not serialize access') ||
    rawMsg.includes('TRANSACTION_CONFLICT')
  ) {
    return true;
  }

  return false;
}

/**
 * Executes a sequence of database operations within an atomic Prisma interactive transaction.
 * Automatically rolls back all changes if any error occurs, translates engine errors,
 * and provides controlled retry exclusively for transient concurrency/deadlock conflicts.
 * Non-transient errors (unique constraints, validations, foreign keys) fast-fail immediately.
 */
export async function executeTransaction<T>(
  action: (tx: Prisma.TransactionClient) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const role = options.role || 'app';
  const client: PrismaClient = options.prismaClient || (role === 'admin' ? getAdminPrismaClient() : getAppPrismaClient());

  const maxWait = options.maxWaitMs || 5000;
  const timeout = options.timeoutMs || 10000;
  const totalDeadlineMs = options.totalDeadlineMs || 15000;
  const isolationLevel = options.isolationLevel || Prisma.TransactionIsolationLevel.ReadCommitted;
  const maxRetries = Math.max(1, options.maxRetries ?? 1);

  return await withRetry(
    async (attempt) => {
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
        const translated = translateDatabaseError(err);
        if (isTransientDatabaseConflict(translated) || isTransientDatabaseConflict(err)) {
          ReliabilityLogger.warn(`Transient database transaction conflict detected on attempt ${attempt}. Retrying...`, {
            provider: 'postgresql',
            operation: 'executeTransaction',
            details: { attempt, maxRetries, error: translated.message },
          });
          throw translated;
        }
        throw translated;
      }
    },
    {
      maxAttempts: maxRetries,
      baseDelayMs: options.baseDelayMs ?? 100,
      maxDelayMs: options.maxDelayMs ?? 1000,
      jitter: true,
      totalDeadlineMs,
      isRetryable: (err) => isTransientDatabaseConflict(err),
    }
  );
}
