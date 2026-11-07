/**
 * COLIN Admin Property Moderation Controller
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 */

import { Request, Response, NextFunction } from 'express';
import { adminPropertyService } from '../../../services/AdminPropertyService';
import { ApiResponse } from '../../../types/api';

export class AdminPropertyController {
  /**
   * GET /api/v1/admin/properties/pending
   */
  public listPending = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const result = await adminPropertyService.listPending({ page, limit });

      const response: ApiResponse<typeof result.items> = {
        success: true,
        message: 'Pending properties retrieved successfully.',
        data: result.items,
        meta: {
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          },
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/admin/properties/:propertyId
   */
  public getOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const property = await adminPropertyService.getInspectionDetail(req.params.propertyId as string);

      const response: ApiResponse<typeof property> = {
        success: true,
        message: 'Property inspection dossier retrieved successfully.',
        data: property,
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
   * POST /api/v1/admin/properties/:propertyId/approve
   */
  public approve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminPropertyService.approve(
        req.params.propertyId as string,
        req.context!.userId,
        req.body
      );

      const response: ApiResponse<typeof result> = {
        success: true,
        message: 'Property verified and approved for public discovery.',
        data: result,
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
   * POST /api/v1/admin/properties/:propertyId/reject
   */
  public reject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminPropertyService.reject(
        req.params.propertyId as string,
        req.context!.userId,
        req.body
      );

      const response: ApiResponse<typeof result> = {
        success: true,
        message: 'Property listing rejected with moderation note recorded.',
        data: result,
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
   * POST /api/v1/admin/properties/:propertyId/suspend
   */
  public suspend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminPropertyService.suspend(
        req.params.propertyId as string,
        req.context!.userId,
        req.body
      );

      const response: ApiResponse<typeof result> = {
        success: true,
        message: 'Property suspended and removed from public discovery.',
        data: result,
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
   * POST /api/v1/admin/properties/:propertyId/restore
   */
  public restore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminPropertyService.restore(
        req.params.propertyId as string,
        req.context!.userId,
        req.body
      );

      const response: ApiResponse<typeof result> = {
        success: true,
        message: 'Property listing restored to verified status.',
        data: result,
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
   * GET /api/v1/admin/properties/:propertyId/history
   */
  public getHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const history = await adminPropertyService.getHistory(req.params.propertyId as string);

      const response: ApiResponse<typeof history> = {
        success: true,
        message: 'Property verification and moderation history retrieved.',
        data: history,
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

export const adminPropertyController = new AdminPropertyController();
