/**
 * COLIN Owner Property Management Controller
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 */

import { Request, Response, NextFunction } from 'express';
import { propertyService } from '../../../services/PropertyService';
import { ApiResponse } from '../../../types/api';
import { PropertyVerificationStatus } from '@prisma/client';

export class OwnerPropertyController {
  /**
   * POST /api/v1/owner/properties
   */
  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const property = await propertyService.createProperty(req.context!.userId, req.body);

      const response: ApiResponse<typeof property> = {
        success: true,
        message: 'Property listing created successfully in draft status.',
        data: property,
        meta: {
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/owner/properties
   */
  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const status = req.query.status as PropertyVerificationStatus | undefined;

      const result = await propertyService.listOwnerProperties(req.context!.userId, { page, limit, status });

      const response: ApiResponse<typeof result.items> = {
        success: true,
        message: 'Owner properties retrieved successfully.',
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
   * GET /api/v1/owner/properties/:propertyId
   */
  public getOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const property = await propertyService.getOwnerProperty(
        req.params.propertyId as string,
        req.context!.userId
      );

      const response: ApiResponse<typeof property> = {
        success: true,
        message: 'Property details retrieved successfully.',
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
   * PATCH /api/v1/owner/properties/:propertyId
   */
  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await propertyService.updateOwnerProperty(
        req.params.propertyId as string,
        req.context!.userId,
        req.body
      );

      const response: ApiResponse<typeof updated> = {
        success: true,
        message: 'Property updated successfully.',
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
   * DELETE /api/v1/owner/properties/:propertyId
   */
  public archive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const archived = await propertyService.archiveProperty(
        req.params.propertyId as string,
        req.context!.userId
      );

      const response: ApiResponse<typeof archived> = {
        success: true,
        message: 'Property archived/delisted successfully.',
        data: archived,
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
   * POST /api/v1/owner/properties/:propertyId/submit
   */
  public submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const submitted = await propertyService.submitProperty(
        req.params.propertyId as string,
        req.context!.userId
      );

      const response: ApiResponse<typeof submitted> = {
        success: true,
        message: 'Property submitted for verification successfully.',
        data: submitted,
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
   * GET /api/v1/owner/properties/:propertyId/status
   */
  public getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = await propertyService.getPropertyStatus(
        req.params.propertyId as string,
        req.context!.userId
      );

      const response: ApiResponse<typeof status> = {
        success: true,
        message: 'Property moderation status retrieved successfully.',
        data: status,
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

  // ===========================================================================
  // PHOTO LIFECYCLE
  // ===========================================================================

  /**
   * POST /api/v1/owner/properties/:propertyId/photos
   */
  public addPhoto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const photo = await propertyService.addPhoto(
        req.params.propertyId as string,
        req.context!.userId,
        req.body
      );

      const response: ApiResponse<typeof photo> = {
        success: true,
        message: 'Property photo added successfully.',
        data: photo,
        meta: {
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /api/v1/owner/properties/:propertyId/photos/:photoId
   */
  public deletePhoto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await propertyService.deletePhoto(
        req.params.propertyId as string,
        req.context!.userId,
        req.params.photoId as string
      );

      const response: ApiResponse<null> = {
        success: true,
        message: 'Property photo deleted successfully.',
        data: null,
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
   * PUT /api/v1/owner/properties/:propertyId/photos/reorder
   */
  public reorderPhotos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const photos = await propertyService.reorderPhotos(
        req.params.propertyId as string,
        req.context!.userId,
        req.body.orders
      );

      const response: ApiResponse<typeof photos> = {
        success: true,
        message: 'Property photos reordered successfully.',
        data: photos,
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
   * PUT /api/v1/owner/properties/:propertyId/photos/:photoId/cover
   */
  public setCoverPhoto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const coverPhoto = await propertyService.setCoverPhoto(
        req.params.propertyId as string,
        req.context!.userId,
        req.params.photoId as string
      );

      const response: ApiResponse<typeof coverPhoto> = {
        success: true,
        message: 'Cover photo designated successfully.',
        data: coverPhoto,
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

export const ownerPropertyController = new OwnerPropertyController();
