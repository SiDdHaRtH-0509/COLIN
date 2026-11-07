/**
 * COLIN Location & Geolocation API Controller
 * Phase 4A.2.5.2: Google Maps & Geolocation Infrastructure
 */

import { Request, Response, NextFunction } from 'express';
import { locationService } from '../../../location/location.service';
import { MOCK_STUDENT_HUBS } from '../../../location/providers/MockGeolocationProvider';
import { GeolocationValidationError } from '../../../location/location.types';
import { ApiResponse } from '../../../types/api';

export class LocationController {
  /**
   * GET /api/v1/location/autocomplete?query=...&sessionToken=...
   */
  public autocomplete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query.query as string | undefined;
      const sessionToken = req.query.sessionToken as string | undefined;

      if (!query || query.trim().length === 0) {
        throw new GeolocationValidationError('Query parameter "query" is required.');
      }

      const suggestions = await locationService.autocomplete(query, sessionToken);

      const response: ApiResponse<typeof suggestions> = {
        success: true,
        message: 'Location autocomplete suggestions retrieved.',
        data: suggestions,
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
   * GET /api/v1/location/places/:placeId
   */
  public getPlaceDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const placeId = req.params.placeId as string;
      const sessionToken = req.query.sessionToken as string | undefined;

      if (!placeId || placeId.trim().length === 0) {
        throw new GeolocationValidationError('Place ID is required.');
      }

      const details = await locationService.getPlaceDetails(placeId, sessionToken);

      const response: ApiResponse<typeof details> = {
        success: true,
        message: 'Place details retrieved successfully.',
        data: details,
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
   * POST /api/v1/location/geocode
   * Body: { address: string }
   */
  public geocode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { address } = req.body || {};

      if (!address || typeof address !== 'string' || address.trim().length === 0) {
        throw new GeolocationValidationError('Field "address" is required.');
      }

      const result = await locationService.geocode(address);

      const response: ApiResponse<typeof result> = {
        success: true,
        message: 'Address geocoded successfully.',
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
   * POST /api/v1/location/reverse-geocode
   * Body: { latitude: number, longitude: number }
   */
  public reverseGeocode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { latitude, longitude } = req.body || {};
      const coords = locationService.validateCoordinates(latitude, longitude);

      const result = await locationService.reverseGeocode(coords);

      const response: ApiResponse<typeof result> = {
        success: true,
        message: 'Coordinates reverse geocoded successfully.',
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
   * GET /api/v1/location/campuses
   * Returns curated list of major colleges, universities, and student coaching hubs.
   */
  public getCampuses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const campuses = MOCK_STUDENT_HUBS.map((hub) => ({
        id: hub.placeId,
        name: hub.name,
        locality: hub.locality,
        city: hub.city,
        state: hub.state,
        pincode: hub.pincode,
        coordinates: hub.coordinates,
      }));

      const response: ApiResponse<typeof campuses> = {
        success: true,
        message: 'Student campuses and hubs retrieved successfully.',
        data: campuses,
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

export const locationController = new LocationController();
