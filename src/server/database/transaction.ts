/**
 * COLIN Centralized Database Transaction Manager
 * Phase 4A.2.2.2: Backend Database Connectivity & ORM Integration
 * 
 * Manages interactive Prisma transactions, configurable timeout bounds,
 * ACID rollback guarantees, and error translation.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { getAppPrismaClient, getAdminPrismaClient } from './prisma';
import { translateDatabaseError } from './errors';

export interface TransactionOptions {
  role?: 'app' | 'admin';
  maxWaitMs?: number;
  timeoutMs?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

/**
 * Executes a sequence of database operations within an atomic Prisma interactive transaction.
 * Automatically rolls back all changes if any error occurs and translates engine errors.
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
}
