/**
 * COLIN Public Accommodation Discovery Controller
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 */

import { Request, Response, NextFunction } from 'express';
import { propertyService } from '../../../services/PropertyService';
import { ApiResponse } from '../../../types/api';
import { PublicPropertySearchFilter } from '../../../database/repositories/PropertyRepository';

export class PublicPropertyController {
  /**
   * GET /api/v1/properties
   */
  public search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filter: PublicPropertySearchFilter = {
        query: req.query.query as string | undefined,
        city: req.query.city as string | undefined,
        locality: req.query.locality as string | undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        propertyType: req.query.propertyType as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        genderPolicy: req.query.genderPolicy as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        occupancyStatus: req.query.occupancyStatus as any,
        minRent: req.query.minRent ? Number(req.query.minRent) : undefined,
        maxRent: req.query.maxRent ? Number(req.query.maxRent) : undefined,
        amenities: req.query.amenities
          ? Array.isArray(req.query.amenities)
            ? (req.query.amenities as string[])
            : (req.query.amenities as string).split(',').map((s) => s.trim())
          : undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sortBy: req.query.sortBy as any,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 12,
      };

      const result = await propertyService.searchPublic(filter);

      const response: ApiResponse<typeof result.items> = {
        success: true,
        message: 'Properties retrieved successfully.',
        data: result.items,
        meta: {
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
          pagination: result.pagination,
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/properties/:idOrSlug
   */
  public getDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const property = await propertyService.getPublicDetail(req.params.idOrSlug as string);

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
   * GET /api/v1/properties/metadata/filters
   */
  public getFilterMetadata = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metadata = await propertyService.getFilterMetadata();

      const response: ApiResponse<typeof metadata> = {
        success: true,
        message: 'Filter metadata retrieved successfully.',
        data: metadata,
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

export const publicPropertyController = new PublicPropertyController();
