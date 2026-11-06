/**
 * COLIN Base Repository Abstraction
 * Phase 4A.2.2.2: Backend Database Connectivity & ORM Integration
 * 
 * Provides consistent error handling, PrismaClient accessor, and transaction client support.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { getAppPrismaClient, getAdminPrismaClient } from '../prisma';
import { translateDatabaseError } from '../errors';

export abstract class BaseRepository {
  protected readonly defaultRole: 'app' | 'admin';

  constructor(defaultRole: 'app' | 'admin' = 'app') {
    this.defaultRole = defaultRole;
  }

  /**
   * Resolves the active Prisma client, preferring a transaction client if passed.
   */
  protected getClient(tx?: Prisma.TransactionClient): Prisma.TransactionClient | PrismaClient {
    if (tx) {
      return tx;
    }
    return this.defaultRole === 'admin' ? getAdminPrismaClient() : getAppPrismaClient();
  }

  /**
   * Executes a database query wrapping any low-level errors into domain errors.
   */
  protected async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (err) {
      throw translateDatabaseError(err);
    }
  }
}
