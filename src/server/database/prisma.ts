/**
 * COLIN Central Prisma Client Singleton & Lifecycle Manager
 * Phase 4A.2.2.2: Backend Database Connectivity & ORM Integration
 * 
 * Enforces singleton instantiation across application hot reloads,
 * provides strict dual-role accessors (colin_app_runtime vs colin_admin_runtime),
 * and handles graceful disconnection.
 */

import { PrismaClient } from '@prisma/client';
import { getDatabaseConfig, redactDatabaseUrl } from './config';

declare global {
  // eslint-disable-next-line no-var
  var __colinAppPrismaClient__: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __colinAdminPrismaClient__: PrismaClient | undefined;
}

/**
 * Creates a configured PrismaClient instance attached to the specified connection string.
 */
function createPrismaClient(url: string, roleName: string): PrismaClient {
  const config = getDatabaseConfig();
  const isDevelopment = config.nodeEnv === 'development';

  const client = new PrismaClient({
    datasources: {
      db: { url },
    },
    log: isDevelopment
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'stdout', level: 'error' },
          { emit: 'stdout', level: 'warn' },
        ]
      : [{ emit: 'stdout', level: 'error' }],
  });

  if (isDevelopment) {
    // Audit query logging without printing sensitive data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any).$on('query', (e: { query: string; duration: number }) => {
      // In development, trace query duration for performance diagnostics
      if (e.duration > 100) {
        console.warn(`[SLOW QUERY - ${roleName}] (${e.duration}ms): ${e.query.substring(0, 120)}...`);
      }
    });
  }

  return client;
}

/**
 * Returns the singleton PrismaClient authenticated as `colin_app_runtime`.
 * Used for all Student, Owner, and Public portal queries.
 */
export function getAppPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === 'production') {
    if (!global.__colinAppPrismaClient__) {
      const config = getDatabaseConfig();
      global.__colinAppPrismaClient__ = createPrismaClient(config.appDatabaseUrl, 'colin_app_runtime');
    }
    return global.__colinAppPrismaClient__;
  }

  // Development & Test: attach to globalThis to preserve connection across HMR
  if (!global.__colinAppPrismaClient__) {
    const config = getDatabaseConfig();
    global.__colinAppPrismaClient__ = createPrismaClient(config.appDatabaseUrl, 'colin_app_runtime');
  }
  return global.__colinAppPrismaClient__;
}

/**
 * Returns the singleton PrismaClient authenticated as `colin_admin_runtime`.
 * Used strictly for Admin Control Centre workflows and administrative audits.
 */
export function getAdminPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === 'production') {
    if (!global.__colinAdminPrismaClient__) {
      const config = getDatabaseConfig();
      global.__colinAdminPrismaClient__ = createPrismaClient(config.adminDatabaseUrl, 'colin_admin_runtime');
    }
    return global.__colinAdminPrismaClient__;
  }

  // Development & Test: attach to globalThis to preserve connection across HMR
  if (!global.__colinAdminPrismaClient__) {
    const config = getDatabaseConfig();
    global.__colinAdminPrismaClient__ = createPrismaClient(config.adminDatabaseUrl, 'colin_admin_runtime');
  }
  return global.__colinAdminPrismaClient__;
}

/**
 * Disconnects both singleton Prisma instances cleanly on process termination or test cleanup.
 */
export async function disconnectPrismaClients(): Promise<void> {
  const promises: Promise<void>[] = [];

  if (global.__colinAppPrismaClient__) {
    promises.push(global.__colinAppPrismaClient__.$disconnect());
    global.__colinAppPrismaClient__ = undefined;
  }

  if (global.__colinAdminPrismaClient__) {
    promises.push(global.__colinAdminPrismaClient__.$disconnect());
    global.__colinAdminPrismaClient__ = undefined;
  }

  await Promise.all(promises);
}

/**
 * Diagnostic utility returning connection metadata with credentials securely masked.
 */
export function getPrismaClientInfo(): { appRole: string; adminRole: string; appEndpoint: string; adminEndpoint: string } {
  const config = getDatabaseConfig();
  return {
    appRole: 'colin_app_runtime',
    adminRole: 'colin_admin_runtime',
    appEndpoint: redactDatabaseUrl(config.appDatabaseUrl),
    adminEndpoint: redactDatabaseUrl(config.adminDatabaseUrl),
  };
}
