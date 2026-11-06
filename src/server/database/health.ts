/**
 * COLIN Database Health & Observability Probe
 * Phase 4A.2.2.2: Backend Database Connectivity & ORM Integration
 * 
 * Provides safe liveness and readiness health checks for the central database,
 * testing dual-role query execution while preventing credential leakage.
 */

import { getAppPrismaClient, getAdminPrismaClient } from './prisma';
import { getDatabaseConfig } from './config';

export interface DatabaseHealthReport {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  isAlive: boolean;
  isReady: boolean;
  timestamp: string;
  roles: {
    appRuntime: {
      role: 'colin_app_runtime';
      status: 'CONNECTED' | 'ERROR';
      latencyMs?: number;
      error?: string;
    };
    adminRuntime: {
      role: 'colin_admin_runtime';
      status: 'CONNECTED' | 'ERROR';
      latencyMs?: number;
      error?: string;
    };
  };
  metrics: {
    totalRoundTripMs: number;
    configuredPoolMax: number;
  };
}

/**
 * Executes an active ping query to verify database readiness.
 * Returns a comprehensive health report without exposing secrets.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthReport> {
  const config = getDatabaseConfig();
  const overallStart = Date.now();
  const timestamp = new Date().toISOString();

  let appStatus: 'CONNECTED' | 'ERROR' = 'ERROR';
  let appLatency: number | undefined;
  let appError: string | undefined;

  let adminStatus: 'CONNECTED' | 'ERROR' = 'ERROR';
  let adminLatency: number | undefined;
  let adminError: string | undefined;

  // 1. Probe colin_app_runtime
  const appStart = Date.now();
  try {
    const appClient = getAppPrismaClient();
    await appClient.$queryRaw`SELECT 1 AS ready;`;
    appLatency = Date.now() - appStart;
    appStatus = 'CONNECTED';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    appError = msg.includes('ECONNREFUSED') || msg.includes('EACCES')
      ? 'Database server is unreachable on configured host:port.'
      : 'App runtime probe query failed.';
  }

  // 2. Probe colin_admin_runtime
  const adminStart = Date.now();
  try {
    const adminClient = getAdminPrismaClient();
    await adminClient.$queryRaw`SELECT 1 AS ready;`;
    adminLatency = Date.now() - adminStart;
    adminStatus = 'CONNECTED';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    adminError = msg.includes('ECONNREFUSED') || msg.includes('EACCES')
      ? 'Database server is unreachable on configured host:port.'
      : 'Admin runtime probe query failed.';
  }

  const totalRoundTripMs = Date.now() - overallStart;

  // Derive composite health
  let overallStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'UNHEALTHY';
  if (appStatus === 'CONNECTED' && adminStatus === 'CONNECTED') {
    overallStatus = 'HEALTHY';
  } else if (appStatus === 'CONNECTED' || adminStatus === 'CONNECTED') {
    overallStatus = 'DEGRADED';
  }

  return {
    status: overallStatus,
    isAlive: true, // Process and probe module are running
    isReady: overallStatus === 'HEALTHY',
    timestamp,
    roles: {
      appRuntime: {
        role: 'colin_app_runtime',
        status: appStatus,
        latencyMs: appLatency,
        error: appError,
      },
      adminRuntime: {
        role: 'colin_admin_runtime',
        status: adminStatus,
        latencyMs: adminLatency,
        error: adminError,
      },
    },
    metrics: {
      totalRoundTripMs,
      configuredPoolMax: config.poolMax,
    },
  };
}
