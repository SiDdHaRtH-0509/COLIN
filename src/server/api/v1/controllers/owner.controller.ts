/**
 * COLIN Owner API Controller
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 */

import { Request, Response, NextFunction } from 'express';
import { ownerService } from '../../../services/OwnerService';
import { ApiResponse } from '../../../types/api';

export class OwnerController {
  /**
   * GET /api/v1/owners/me
   */
  public getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await ownerService.getProfile(req.context!.userId);

      const response: ApiResponse<typeof profile> = {
        success: true,
        message: 'Owner profile retrieved successfully.',
        data: profile,
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
   * PATCH /api/v1/owners/me
   */
  public updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await ownerService.updateProfile(req.context!.userId, req.body);

      const response: ApiResponse<typeof updated> = {
        success: true,
        message: 'Owner profile updated successfully.',
        data: updated,
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
   * GET /api/v1/owners/me/dashboard-summary
   */
  public getDashboardSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await ownerService.getDashboardSummary(req.context!.userId);

      const response: ApiResponse<typeof summary> = {
        success: true,
        message: 'Owner dashboard summary retrieved successfully.',
        data: summary,
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

export const ownerController = new OwnerController();
