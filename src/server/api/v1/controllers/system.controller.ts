/**
 * COLIN System Controller
 * Phase 4A.2.2.3: Backend Core Service & API Architecture
 */

import { Request, Response, NextFunction } from 'express';
import { systemService } from '../../../services/SystemService';
import { ApiSuccessResponse } from '../../../types/api';

export class SystemController {
  getInfo = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = systemService.getSystemInfo();
      const response: ApiSuccessResponse<typeof data> = {
        success: true,
        message: 'System information retrieved successfully.',
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

  getOpenApiSpec = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = systemService.getOpenApiDocument();
      // Return raw OpenAPI spec or JSON API wrapper
      if (req.query.format === 'json') {
        res.status(200).json(data);
        return;
      }
      const response: ApiSuccessResponse<typeof data> = {
        success: true,
        message: 'OpenAPI specification retrieved successfully.',
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

  validateEcho = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = systemService.processEchoTest(req.body);
      const response: ApiSuccessResponse<typeof data> = {
        success: true,
        message: 'Request payload validated and processed successfully.',
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

  adminOnlyDemo = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const response: ApiSuccessResponse<{ accessGranted: true; context: typeof req.context }> = {
        success: true,
        message: 'Administrative route authorization verified.',
        data: {
          accessGranted: true,
          context: req.context,
        },
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
}

export const systemController = new SystemController();
