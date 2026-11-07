/**
 * COLIN Geospatial Validation & Mathematical Oracle Unit Tests
 * Phase 4A.2.5.2: Google Maps & Geolocation Infrastructure
 */

import { describe, it, expect } from 'vitest';
import {
  validateCoordinates,
  validateRadiusKm,
  calculateHaversineKm,
  computeBoundingBox,
  GeolocationValidationError,
} from '../../server/location';

describe('COLIN Geospatial Math & Validation Unit Suite', () => {
  describe('1. Coordinate Validation Bounds & Sanitization', () => {
    it('accepts valid geographic coordinates in India', () => {
      const coords = validateCoordinates(28.6942, 77.2085);
      expect(coords.latitude).toBe(28.6942);
      expect(coords.longitude).toBe(77.2085);
    });

    it('accepts numeric strings and parses them into numbers', () => {
      const coords = validateCoordinates('12.9352', '77.6085');
      expect(coords.latitude).toBe(12.9352);
      expect(coords.longitude).toBe(77.6085);
    });

    it('accepts global boundary coordinates', () => {
      expect(validateCoordinates(0, 0)).toEqual({ latitude: 0, longitude: 0 });
      expect(validateCoordinates(90, 180)).toEqual({ latitude: 90, longitude: 180 });
      expect(validateCoordinates(-90, -180)).toEqual({ latitude: -90, longitude: -180 });
    });

    it('rejects latitude greater than 90 degrees', () => {
      expect(() => validateCoordinates(90.0001, 77.2)).toThrow(GeolocationValidationError);
      expect(() => validateCoordinates(120, 77.2)).toThrow(/out of bounds/);
    });

    it('rejects latitude less than -90 degrees', () => {
      expect(() => validateCoordinates(-90.1, 77.2)).toThrow(GeolocationValidationError);
    });

    it('rejects longitude greater than 180 degrees', () => {
      expect(() => validateCoordinates(28.6, 180.001)).toThrow(GeolocationValidationError);
      expect(() => validateCoordinates(28.6, 250)).toThrow(/out of bounds/);
    });

    it('rejects longitude less than -180 degrees', () => {
      expect(() => validateCoordinates(28.6, -180.001)).toThrow(GeolocationValidationError);
    });

    it('rejects non-numeric, NaN, and Infinity inputs', () => {
      expect(() => validateCoordinates(NaN, 77.2)).toThrow(/Must be a finite number/);
      expect(() => validateCoordinates(28.6, NaN)).toThrow(/Must be a finite number/);
      expect(() => validateCoordinates(Infinity, 77.2)).toThrow(/Must be a finite number/);
      expect(() => validateCoordinates(28.6, -Infinity)).toThrow(/Must be a finite number/);
      expect(() => validateCoordinates('invalid-lat', 77.2)).toThrow(GeolocationValidationError);
    });

    it('rejects missing or null coordinate arguments', () => {
      expect(() => validateCoordinates(null, 77.2)).toThrow(/required/);
      expect(() => validateCoordinates(28.6, undefined)).toThrow(/required/);
    });
  });

  describe('2. Radius Validation', () => {
    it('defaults to 10 km when radius is undefined or null', () => {
      expect(validateRadiusKm(undefined)).toBe(10);
      expect(validateRadiusKm(null)).toBe(10);
    });

    it('accepts valid positive radius up to maxRadiusKm', () => {
      expect(validateRadiusKm(5)).toBe(5);
      expect(validateRadiusKm(25)).toBe(25);
      expect(validateRadiusKm('15')).toBe(15);
      expect(validateRadiusKm(100)).toBe(100);
    });

    it('rejects radius exceeding maxRadiusKm (100 km)', () => {
      expect(() => validateRadiusKm(101)).toThrow(/exceeds maximum permitted radius/);
      expect(() => validateRadiusKm(500)).toThrow(GeolocationValidationError);
    });

    it('rejects negative, zero, or non-finite radius values', () => {
      expect(() => validateRadiusKm(0)).toThrow(/positive finite number/);
      expect(() => validateRadiusKm(-5)).toThrow(/positive finite number/);
      expect(() => validateRadiusKm(NaN)).toThrow(/positive finite number/);
      expect(() => validateRadiusKm(Infinity)).toThrow(/positive finite number/);
      expect(() => validateRadiusKm('not-a-number')).toThrow(/positive finite number/);
    });
  });

  describe('3. Independent Distance Calculation Oracle', () => {
    it('calculates zero distance for identical coordinates', () => {
      const p = { latitude: 28.6942, longitude: 77.2085 };
      expect(calculateHaversineKm(p, p)).toBe(0);
    });

    it('calculates accurate distance between Delhi North Campus and IIT Delhi (~17.5 km)', () => {
      const northCampus = { latitude: 28.6942, longitude: 77.2085 };
      const iitDelhi = { latitude: 28.5450, longitude: 77.1926 };

      const dist = calculateHaversineKm(northCampus, iitDelhi);
      // Geodetic reference is ~16.6 - 17.5 km
      expect(dist).toBeGreaterThan(16);
      expect(dist).toBeLessThan(18);
    });

    it('calculates accurate distance between Delhi and Bangalore (~1740 km)', () => {
      const delhi = { latitude: 28.6139, longitude: 77.2090 };
      const bangalore = { latitude: 12.9716, longitude: 77.5946 };

      const dist = calculateHaversineKm(delhi, bangalore);
      expect(dist).toBeGreaterThan(1700);
      expect(dist).toBeLessThan(1780);
    });

    it('calculates accurate 1 km boundary distance', () => {
      // 1 degree latitude ~ 111.32 km -> 1 km ~ 0.008983 degrees lat
      const p1 = { latitude: 28.0000, longitude: 77.0000 };
      const p2 = { latitude: 28.008983, longitude: 77.0000 };

      const dist = calculateHaversineKm(p1, p2);
      expect(dist).toBeCloseTo(1.0, 1);
    });
  });

  describe('4. Bounding Box Computation', () => {
    it('computes standard bounding box with correct latitude and longitude bounds', () => {
      const center = { latitude: 28.6942, longitude: 77.2085 };
      const bbox = computeBoundingBox(center, 10);

      expect(bbox.crossesAntimeridian).toBe(false);
      expect(bbox.minLat).toBeLessThan(center.latitude);
      expect(bbox.maxLat).toBeGreaterThan(center.latitude);
      expect(bbox.minLng).toBeLessThan(center.longitude);
      expect(bbox.maxLng).toBeGreaterThan(center.longitude);
    });

    it('handles polar coordinates by expanding longitude to entire [-180, 180] span', () => {
      const center = { latitude: 89.95, longitude: 0 };
      const bbox = computeBoundingBox(center, 50);

      expect(bbox.minLng).toBe(-180);
      expect(bbox.maxLng).toBe(180);
      expect(bbox.crossesAntimeridian).toBe(false);
    });

    it('handles antimeridian wrapping when bounding box crosses longitude 180', () => {
      const center = { latitude: 0, longitude: 179.95 };
      const bbox = computeBoundingBox(center, 25);

      expect(bbox.crossesAntimeridian).toBe(true);
      expect(bbox.minLng).toBeDefined();
      expect(bbox.maxLng).toBe(180);
      expect(bbox.minLng2).toBe(-180);
      expect(bbox.maxLng2).toBeDefined();
    });
  });
});
