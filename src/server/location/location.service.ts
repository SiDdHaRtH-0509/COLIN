/**
 * COLIN Central Geolocation & Location Service
 * Phase 4A.2.5.2: Google Maps & Geolocation Infrastructure
 * 
 * Manages provider orchestration, in-memory TTL caching, API cost mitigation,
 * and high-precision spatial math utilities.
 */

import { getServerConfig } from '../config/serverConfig';
import {
  GeolocationProvider,
  GeoCoordinates,
  GeocodingResult,
  PlaceSuggestion,
  PlaceDetails,
  GeolocationValidationError,
} from './location.types';
import {
  validateCoordinates,
  validateRadiusKm,
  calculateHaversineKm,
  computeBoundingBox,
  BoundingBox,
} from './validation';
import { MockGeolocationProvider } from './providers/MockGeolocationProvider';
import { GoogleGeolocationProvider } from './providers/GoogleGeolocationProvider';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class LocationService {
  private provider: GeolocationProvider;
  // Geocoding latency cache (24 hours TTL, strictly compliant with Google Maps Platform 30-day limit)
  private readonly geocodeCache = new Map<string, CacheEntry<GeocodingResult>>();
  private readonly reverseGeocodeCache = new Map<string, CacheEntry<GeocodingResult>>();

  // Cache TTL: 24 hours (Google Maps Platform permits up to 30 consecutive calendar days for latency optimization)
  private readonly geocodeTtlMs = 24 * 60 * 60 * 1000;

  constructor(customProvider?: GeolocationProvider) {
    if (customProvider) {
      this.provider = customProvider;
    } else {
      this.provider = this.createDefaultProvider();
    }
  }

  private createDefaultProvider(): GeolocationProvider {
    const config = getServerConfig();

    if (config.geolocationProvider === 'google') {
      if (config.googleMapsServerKey) {
        return new GoogleGeolocationProvider({
          apiKey: config.googleMapsServerKey,
        });
      }
      console.warn(
        '[LocationService] GOOGLE_MAPS_SERVER_KEY is missing. Falling back to MockGeolocationProvider.'
      );
    }

    return new MockGeolocationProvider();
  }

  public getProvider(): GeolocationProvider {
    return this.provider;
  }

  public getAttribution(): string | undefined {
    return this.provider.attribution;
  }

  public setProvider(provider: GeolocationProvider): void {
    this.provider = provider;
  }

  public clearCache(): void {
    this.geocodeCache.clear();
    this.reverseGeocodeCache.clear();
  }

  /**
   * Actively evicts expired cache entries from in-memory stores.
   * Returns the total count of evicted entries.
   */
  public pruneExpiredCache(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.geocodeCache.entries()) {
      if (entry.expiresAt <= now) {
        this.geocodeCache.delete(key);
        count++;
      }
    }

    for (const [key, entry] of this.reverseGeocodeCache.entries()) {
      if (entry.expiresAt <= now) {
        this.reverseGeocodeCache.delete(key);
        count++;
      }
    }

    return count;
  }

  // ===========================================================================
  // GEOCODING & AUTOCOMPLETE OPERATIONS
  // ===========================================================================

  /**
   * Forward geocodes an address. Caches results for up to 24 hours for latency optimization,
   * fully compliant with Google Maps Platform Terms of Service (30-day maximum limit).
   */
  public async geocode(address: string): Promise<GeocodingResult> {
    const cacheKey = address.trim().toLowerCase();
    const cached = this.geocodeCache.get(cacheKey);
    if (cached) {
      if (cached.expiresAt > Date.now()) {
        return cached.value;
      }
      this.geocodeCache.delete(cacheKey);
    }

    const result = await this.provider.geocodeAddress(address);

    const ttl = result.expiresAt
      ? Math.min(Date.now() + this.geocodeTtlMs, result.expiresAt)
      : Date.now() + this.geocodeTtlMs;

    this.geocodeCache.set(cacheKey, {
      value: result,
      expiresAt: ttl,
    });

    return result;
  }

  /**
   * Reverse geocodes coordinates to a human-readable address. Caches results for 24 hours.
   */
  public async reverseGeocode(coords: GeoCoordinates): Promise<GeocodingResult> {
    const valid = validateCoordinates(coords.latitude, coords.longitude);
    const cacheKey = `${valid.latitude.toFixed(5)},${valid.longitude.toFixed(5)}`;
    const cached = this.reverseGeocodeCache.get(cacheKey);
    if (cached) {
      if (cached.expiresAt > Date.now()) {
        return cached.value;
      }
      this.reverseGeocodeCache.delete(cacheKey);
    }

    const result = await this.provider.reverseGeocode(valid);

    const ttl = result.expiresAt
      ? Math.min(Date.now() + this.geocodeTtlMs, result.expiresAt)
      : Date.now() + this.geocodeTtlMs;

    this.reverseGeocodeCache.set(cacheKey, {
      value: result,
      expiresAt: ttl,
    });

    return result;
  }

  /**
   * Autocomplete place search.
   * In compliance with Google Maps Platform Terms of Service (Section 3.2.3(a)),
   * autocomplete predictions are ephemeral and NOT cached across user sessions.
   * Keystrokes are grouped under the caller's session token.
   */
  public async autocomplete(query: string, sessionToken?: string): Promise<PlaceSuggestion[]> {
    return this.provider.searchPlaces(query, sessionToken);
  }

  /**
   * Retrieves place details using a placeId and optional session token.
   * Full Place Details are NOT cached in memory in compliance with Google Terms of Service;
   * only the resolved coordinates and placeId are stored on the listing record in PostgreSQL.
   */
  public async getPlaceDetails(placeId: string, sessionToken?: string): Promise<PlaceDetails> {
    return this.provider.getPlaceDetails(placeId, sessionToken);
  }

  /**
   * Refreshes location data using a stored Place ID or physical address string.
   * Enables automated refresh for listings with Google-derived coordinates reaching 30-day expiration.
   */
  public async refreshLocationData(params: {
    placeId?: string | null;
    address?: string | null;
  }): Promise<{
    coordinates: GeoCoordinates;
    placeId?: string;
    coordinateSource: import('./location.types').LocationSource;
    googleContentExpiresAt: Date;
  }> {
    if (params.placeId) {
      const details = await this.getPlaceDetails(params.placeId);
      const isGoogle = details.source === 'GOOGLE_PLACES' || this.provider.providerName === 'google';
      return {
        coordinates: details.coordinates,
        placeId: details.placeId,
        coordinateSource: isGoogle ? 'GOOGLE_PLACES' : (details.source || 'MOCK_GEOCODING'),
        googleContentExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
    }

    if (params.address) {
      const result = await this.geocode(params.address);
      const isGoogle = result.source === 'GOOGLE_GEOCODING' || this.provider.providerName === 'google';
      return {
        coordinates: result.coordinates,
        placeId: result.placeId,
        coordinateSource: isGoogle ? 'GOOGLE_GEOCODING' : (result.source || 'MOCK_GEOCODING'),
        googleContentExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
    }

    throw new GeolocationValidationError('Either placeId or address is required to refresh location data.');
  }

  // ===========================================================================
  // MATHEMATICAL GEOSPATIAL UTILITIES
  // ===========================================================================

  public validateCoordinates(latitude: unknown, longitude: unknown): GeoCoordinates {
    return validateCoordinates(latitude, longitude);
  }

  public validateRadiusKm(radiusKm: unknown, maxRadiusKm?: number): number {
    return validateRadiusKm(radiusKm, maxRadiusKm);
  }

  public computeDistance(point1: GeoCoordinates, point2: GeoCoordinates): number {
    return calculateHaversineKm(point1, point2);
  }

  public computeBoundingBox(center: GeoCoordinates, radiusKm: number): BoundingBox {
    return computeBoundingBox(center, radiusKm);
  }
}

export const locationService = new LocationService();
