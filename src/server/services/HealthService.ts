/**
 * COLIN Central Health Service
 * Phase 4A.2.2.3: Backend Core Service & API Architecture
 * 
 * Bridges database observability probes and application lifecycle states into API responses.
 */

import { checkDatabaseHealth, DatabaseHealthReport } from '../database/health';

export interface LivenessResult {
  status: 'UP';
  uptimeSeconds: number;
  timestamp: string;
}

export interface ReadinessResult {
  status: 'READY' | 'NOT_READY';
  isReady: boolean;
  database: DatabaseHealthReport;
  timestamp: string;
}

export class HealthService {
  private readonly startTime = Date.now();

  /**
   * Returns application liveness. Liveness proves the Node.js event loop is operational.
   */
  getLiveness(): LivenessResult {
    return {
      status: 'UP',
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Returns application readiness. Readiness confirms that the application and its critical
   * dependencies (PostgreSQL dual runtime roles) are healthy and ready to serve live traffic.
   */
  async getReadiness(): Promise<ReadinessResult> {
    const dbHealth = await checkDatabaseHealth();
    const isReady = dbHealth.isReady && dbHealth.status === 'HEALTHY';

    return {
      status: isReady ? 'READY' : 'NOT_READY',
      isReady,
      database: dbHealth,
      timestamp: new Date().toISOString(),
    };
  }
}

// Export singleton instance for dependency management
export const healthService = new HealthService();
