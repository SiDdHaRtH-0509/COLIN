/**
 * COLIN HTTP Server Entrypoint & Lifecycle Manager
 * Phase 4A.2.2.3: Backend Core Service & API Architecture
 * 
 * Manages database initialization, HTTP port binding, and graceful process teardown.
 */

import http from 'node:http';
import { createApp } from './app';
import { getServerConfig } from './config/serverConfig';
import { assertProductionSecretsValid } from './config/secrets.config';
import { initializeDatabaseConnections, shutdownDatabaseConnections } from './database/lifecycle';
import { initializeRedis } from './redis';
import { executeGracefulShutdown, registerBackgroundWorker, unregisterBackgroundWorker } from './lifecycle/shutdown';
import { bookingExpiryWorker } from './workers/BookingExpiryWorker';

export { executeGracefulShutdown, registerBackgroundWorker, unregisterBackgroundWorker, bookingExpiryWorker };

let serverInstance: http.Server | null = null;

export async function startServer(): Promise<http.Server> {
  // 1. Validate production secrets and cryptographic key separation
  assertProductionSecretsValid();

  const config = getServerConfig();

  try {
    console.log('[SERVER BOOTSTRAP] Initializing central database connections...');
    const conn = await initializeDatabaseConnections();
    console.log(
      `[SERVER BOOTSTRAP] Database connected successfully. Round-trip latency: ${conn.latencyMs}ms. Dual roles verified.`
    );

    console.log('[SERVER BOOTSTRAP] Initializing Redis client and distributed rate limiter...');
    await initializeRedis();

    const app = createApp();
    const server = http.createServer(app);
    serverInstance = server;

    await new Promise<void>((resolve, reject) => {
      server.listen(config.port, config.host, () => {
        console.log(`[SERVER BOOTSTRAP] COLIN Central API listening on http://${config.host}:${config.port}${config.apiPrefix}`);
        resolve();
      });

      server.on('error', (err: unknown) => {
        reject(err);
      });
    });

    // Start autonomous background workers
    bookingExpiryWorker.start();
    registerBackgroundWorker(bookingExpiryWorker);

    // Register process termination handlers
    setupGracefulShutdown(server);

    return server;
  } catch (err) {
    console.error('[SERVER BOOTSTRAP FATAL] Server startup failed:', err instanceof Error ? err.message : String(err));
    await shutdownDatabaseConnections();
    process.exit(1);
  }
}

export function setupGracefulShutdown(server: http.Server): void {
  const handleShutdown = async (signal: string) => {
    await executeGracefulShutdown({
      server,
      signal,
      gracePeriodMs: 10000,
      exitProcess: true,
    });
  };

  process.once('SIGINT', () => handleShutdown('SIGINT'));
  process.once('SIGTERM', () => handleShutdown('SIGTERM'));
}

export function getServerInstance(): http.Server | null {
  return serverInstance;
}

// Auto-run when executed directly via node or cli (not when imported in test)
const isDirectExecution = typeof process !== 'undefined' && process.argv[1] && process.argv[1].endsWith('server.ts');
if (isDirectExecution) {
  startServer().catch((err) => {
    console.error('[SERVER PROCESS FATAL]', err);
    process.exit(1);
  });
}
