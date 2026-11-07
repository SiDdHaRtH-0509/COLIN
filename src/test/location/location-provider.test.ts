/**
 * COLIN Geolocation Provider & Service Unit Tests
 * Phase 4A.2.5.2: Google Maps & Geolocation Infrastructure
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LocationService,
  MockGeolocationProvider,
  GoogleGeolocationProvider,
  GeolocationValidationError,
  GeolocationNotFoundError,
} from '../../server/location';

describe('COLIN Geolocation Provider Unit Suite', () => {
  let locationService: LocationService;
  let mockProvider: MockGeolocationProvider;

  beforeEach(() => {
    mockProvider = new MockGeolocationProvider();
    locationService = new LocationService(mockProvider);
    locationService.clearCache();
  });

  describe('1. MockGeolocationProvider Operations', () => {
    it('geocodes a recognized student hub address into accurate coordinates', async () => {
      const result = await locationService.geocode('Hudson Lane, North Campus, Delhi');

      expect(result).toBeDefined();
      expect(result.coordinates.latitude).toBeCloseTo(28.6942, 3);
      expect(result.coordinates.longitude).toBeCloseTo(77.2085, 3);
      expect(result.formattedAddress).toContain('Delhi');
      expect(result.addressComponents.city).toBe('Delhi');
      expect(result.addressComponents.pincode).toBe('110009');
    });

    it('geocodes an unrecognized address with deterministic fallback coordinates', async () => {
      const result = await locationService.geocode('Plot 999, Unknown Academic Colony, India');

      expect(result).toBeDefined();
      expect(result.coordinates.latitude).toBeCloseTo(28.6139, 2);
      expect(result.coordinates.longitude).toBeCloseTo(77.2090, 2);
      expect(result.formattedAddress).toContain('Unknown Academic Colony');
    });

    it('rejects empty or whitespace-only address with GeolocationValidationError', async () => {
      await expect(locationService.geocode('')).rejects.toThrow(GeolocationValidationError);
      await expect(locationService.geocode('   ')).rejects.toThrow(GeolocationValidationError);
    });

    it('reverse geocodes coordinates to the closest matching student hub', async () => {
      // Coordinates very close to DU North Campus
      const result = await locationService.reverseGeocode({
        latitude: 28.6950,
        longitude: 77.2090,
      });

      expect(result).toBeDefined();
      expect(result.formattedAddress).toContain('Hudson Lane');
      expect(result.addressComponents.city).toBe('Delhi');
      expect(result.addressComponents.state).toBe('Delhi');
    });

    it('returns autocomplete suggestions matching student search query', async () => {
      const suggestions = await locationService.autocomplete('Campus');

      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      const north = suggestions.find((s) => s.primaryText.includes('North Campus'));
      expect(north).toBeDefined();
      expect(north?.placeId).toBe('hub-delhi-north-campus');
    });

    it('returns empty array when autocomplete query has no matches', async () => {
      const suggestions = await locationService.autocomplete('xyznonexistentplacename12345');
      expect(suggestions).toEqual([]);
    });

    it('retrieves detailed place information by placeId', async () => {
      const details = await locationService.getPlaceDetails('hub-iit-delhi');

      expect(details).toBeDefined();
      expect(details.name).toContain('IIT Delhi');
      expect(details.coordinates.latitude).toBeCloseTo(28.5450, 3);
      expect(details.coordinates.longitude).toBeCloseTo(77.1926, 3);
    });

    it('throws GeolocationNotFoundError when placeId is not recognized', async () => {
      await expect(locationService.getPlaceDetails('invalid-place-id')).rejects.toThrow(
        GeolocationNotFoundError
      );
    });
  });

  describe('2. In-Memory Caching & Cost Optimization', () => {
    it('caches geocoding results and returns cached entry on subsequent calls', async () => {
      const address = 'Satya Niketan, South Campus';
      const result1 = await locationService.geocode(address);

      // Now set mock provider to throw an error to verify it uses the cache
      mockProvider.setSimulatedError(new Error('Provider was called unexpectedly!'));

      const result2 = await locationService.geocode(address);
      expect(result2).toEqual(result1);
    });

    it('caches reverse geocoding results and returns cached entry on subsequent calls', async () => {
      const coords = { latitude: 28.6942, longitude: 77.2085 };
      const res1 = await locationService.reverseGeocode(coords);

      mockProvider.setSimulatedError(new Error('Provider was called unexpectedly!'));

      const res2 = await locationService.reverseGeocode(coords);
      expect(res2).toEqual(res1);
    });
  });

  describe('3. GoogleGeolocationProvider & Secret Key Sanitization', () => {
    it('throws GeolocationValidationError when GoogleGeolocationProvider is initialized with an empty key', () => {
      expect(() => new GoogleGeolocationProvider({ apiKey: '' })).toThrow(GeolocationValidationError);
      expect(() => new GoogleGeolocationProvider({ apiKey: '   ' })).toThrow(GeolocationValidationError);
    });

    it('redacts the Google API key from error messages on network failure', async () => {
      const secretKey = 'AIzaSyColinSecretKey1234567890abcdef';
      const googleProvider = new GoogleGeolocationProvider({
        apiKey: secretKey,
        timeoutMs: 100, // Very low timeout to trigger timeout error
      });

      try {
        await googleProvider.geocodeAddress('Some Location');
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.message).not.toContain(secretKey);
      }
    });
  });
});
