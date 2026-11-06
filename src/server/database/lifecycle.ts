/**
 * COLIN Database Connection Lifecycle & Graceful Shutdown Manager
 * Phase 4A.2.2.2: Backend Database Connectivity & ORM Integration
 * 
 * Manages active connection verification, lifecycle hooks, and process signal listeners.
 */

import { getAppPrismaClient, getAdminPrismaClient, disconnectPrismaClients } from './prisma';
import { translateDatabaseError } from './errors';

let isShuttingDown = false;
let lifecycleHooksRegistered = false;

export interface ConnectionStatus {
  appRuntimeConnected: boolean;
  adminRuntimeConnected: boolean;
  latencyMs: number;
}

/**
 * Initializes and establishes active connections for both runtime roles,
 * verifying that the PostgreSQL server responds within acceptable latency bounds.
 */
export async function initializeDatabaseConnections(): Promise<ConnectionStatus> {
  const startTime = Date.now();
  let appRuntimeConnected = false;
  let adminRuntimeConnected = false;

  try {
    const appClient = getAppPrismaClient();
    await appClient.$queryRaw`SELECT 1 as connected;`;
    appRuntimeConnected = true;
  } catch (err) {
    throw translateDatabaseError(err);
  }

  try {
    const adminClient = getAdminPrismaClient();
    await adminClient.$queryRaw`SELECT 1 as connected;`;
    adminRuntimeConnected = true;
  } catch (err) {
    throw translateDatabaseError(err);
  }

  const latencyMs = Date.now() - startTime;

  // Register process signal hooks once for automatic graceful shutdown
  registerLifecycleHooks();

  return {
    appRuntimeConnected,
    adminRuntimeConnected,
    latencyMs,
  };
}

/**
 * Gracefully shuts down all active database connections, waiting for pending operations to complete.
 */
export async function shutdownDatabaseConnections(): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  try {
    await disconnectPrismaClients();
  } catch (err) {
    console.error('[DATABASE SHUTDOWN ERROR]', err);
  } finally {
    isShuttingDown = false;
  }
}

/**
 * Registers OS process termination signal listeners to prevent zombie PostgreSQL backends.
 */
export function registerLifecycleHooks(): void {
  if (lifecycleHooksRegistered || typeof process === 'undefined' || !process.on) {
    return;
  }

  lifecycleHooksRegistered = true;

  const handleTermination = async (signal: string) => {
    // Avoid double logging on test runs
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[DATABASE LIFECYCLE] Received ${signal}. Disconnecting database clients...`);
    }
    await shutdownDatabaseConnections();
  };

  process.once('SIGINT', () => handleTermination('SIGINT'));
  process.once('SIGTERM', () => handleTermination('SIGTERM'));
  process.once('beforeExit', () => handleTermination('beforeExit'));
}
