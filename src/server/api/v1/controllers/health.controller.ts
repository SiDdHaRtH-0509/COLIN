/**
 * COLIN Health Controller
 * Phase 4A.2.2.3: Backend Core Service & API Architecture
 */

import { Request, Response, NextFunction } from 'express';
import { healthService } from '../../../services/HealthService';
import { ApiSuccessResponse, ApiErrorResponse } from '../../../types/api';

export class HealthController {
  /**
   * GET /health/live
   * Liveness probe: proves process and event loop responsiveness.
   */
  getLive = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = healthService.getLiveness();
      const response: ApiSuccessResponse<typeof data> = {
        success: true,
        message: 'Service is alive and responsive.',
        data,
        meta: {
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /health/ready
   * Readiness probe: proves PostgreSQL dual-role connectivity and schema readiness.
   */
  getReady = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await healthService.getReadiness();
      const requestId = req.id || 'unknown';
      const timestamp = new Date().toISOString();

      if (data.isReady) {
        const response: ApiSuccessResponse<typeof data> = {
          success: true,
          message: 'Service and database dependencies are ready to serve traffic.',
          data,
          meta: {
            requestId,
            timestamp,
          },
        };
        res.status(200).json(response);
      } else {
        const response: ApiErrorResponse = {
          success: false,
          error: {
            code: 'SERVICE_NOT_READY',
            message: 'Database dependencies are degraded or unavailable.',
            details: data.database,
          },
          meta: {
            requestId,
            timestamp,
          },
        };
        res.status(503).json(response);
      }
    } catch (err) {
      next(err);
    }
  };
}

export const healthController = new HealthController();
