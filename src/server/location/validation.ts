/**
 * COLIN Geolocation Validation & Geospatial Math Utilities
 * Phase 4A.2.5.2: Google Maps & Geolocation Infrastructure
 */

import { GeoCoordinates, GeolocationValidationError } from './location.types';

export const EARTH_RADIUS_KM = 6371;

export const INDIA_BOUNDS = {
  minLat: 6.0,
  maxLat: 38.0,
  minLng: 68.0,
  maxLng: 98.0,
};

/**
 * Checks whether coordinates fall within India's geographic bounding box.
 */
export function isWithinIndiaBoundingBox(lat: number, lng: number): boolean {
  return (
    lat >= INDIA_BOUNDS.minLat &&
    lat <= INDIA_BOUNDS.maxLat &&
    lng >= INDIA_BOUNDS.minLng &&
    lng <= INDIA_BOUNDS.maxLng
  );
}

/**
 * Validates latitude and longitude values according to WGS84 standards.
 * -90 <= latitude <= 90
 * -180 <= longitude <= 180
 * Rejects NaN, Infinity, non-numeric values, or out-of-range floats.
 */
export function validateCoordinates(latitude: unknown, longitude: unknown): GeoCoordinates {
  if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
    throw new GeolocationValidationError('Latitude and longitude are both required.');
  }

  const lat = typeof latitude === 'number' ? latitude : Number(latitude);
  const lng = typeof longitude === 'number' ? longitude : Number(longitude);

  if (Number.isNaN(lat) || !Number.isFinite(lat)) {
    throw new GeolocationValidationError(`Invalid latitude: ${latitude}. Must be a finite number.`);
  }

  if (Number.isNaN(lng) || !Number.isFinite(lng)) {
    throw new GeolocationValidationError(`Invalid longitude: ${longitude}. Must be a finite number.`);
  }

  if (lat < -90 || lat > 90) {
    throw new GeolocationValidationError(`Latitude ${lat} is out of bounds. Must be between -90 and 90 degrees.`);
  }

  if (lng < -180 || lng > 180) {
    throw new GeolocationValidationError(`Longitude ${lng} is out of bounds. Must be between -180 and 180 degrees.`);
  }

  return { latitude: lat, longitude: lng };
}

/**
 * Validates search radius in kilometers.
 */
export function validateRadiusKm(radiusKm: unknown, maxRadiusKm = 100): number {
  if (radiusKm === undefined || radiusKm === null) {
    return 10; // Default 10 km radius
  }

  const r = typeof radiusKm === 'number' ? radiusKm : Number(radiusKm);

  if (Number.isNaN(r) || !Number.isFinite(r) || r <= 0) {
    throw new GeolocationValidationError(`Invalid radius: ${radiusKm}. Must be a positive finite number.`);
  }

  if (r > maxRadiusKm) {
    throw new GeolocationValidationError(`Requested radius ${r} km exceeds maximum permitted radius of ${maxRadiusKm} km.`);
  }

  return r;
}

/**
 * Calculates great-circle spherical distance using Haversine formula (km).
 */
export function calculateHaversineKm(
  point1: GeoCoordinates,
  point2: GeoCoordinates
): number {
  const lat1 = (point1.latitude * Math.PI) / 180;
  const lon1 = (point1.longitude * Math.PI) / 180;
  const lat2 = (point2.latitude * Math.PI) / 180;
  const lon2 = (point2.longitude * Math.PI) / 180;

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  crossesAntimeridian: boolean;
  minLng2?: number;
  maxLng2?: number;
}

/**
 * Computes a bounding box (lat/lng range) for index-accelerated candidate prefiltering.
 * Accounts for latitude convergence and antimeridian crossing.
 */
export function computeBoundingBox(center: GeoCoordinates, radiusKm: number): BoundingBox {
  const latDelta = radiusKm / 111.32; // ~111.32 km per degree latitude
  const minLat = Math.max(-90, center.latitude - latDelta);
  const maxLat = Math.min(90, center.latitude + latDelta);

  // Near poles, longitude spans entire circle [-180, 180]
  if (minLat <= -89.9 || maxLat >= 89.9) {
    return {
      minLat,
      maxLat,
      minLng: -180,
      maxLng: 180,
      crossesAntimeridian: false,
    };
  }

  const radLat = (center.latitude * Math.PI) / 180;
  const lngDelta = radiusKm / (111.32 * Math.cos(radLat));

  let minLng = center.longitude - lngDelta;
  let maxLng = center.longitude + lngDelta;

  // Check antimeridian wrapping
  if (minLng < -180 || maxLng > 180) {
    if (minLng < -180) {
      return {
        minLat,
        maxLat,
        minLng: minLng + 360,
        maxLng: 180,
        crossesAntimeridian: true,
        minLng2: -180,
        maxLng2: maxLng,
      };
    } else {
      return {
        minLat,
        maxLat,
        minLng: minLng,
        maxLng: 180,
        crossesAntimeridian: true,
        minLng2: -180,
        maxLng2: maxLng - 360,
      };
    }
  }

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
    crossesAntimeridian: false,
  };
}
