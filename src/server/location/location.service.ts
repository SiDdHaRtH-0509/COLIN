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
  private readonly geocodeCache = new Map<string, CacheEntry<GeocodingResult>>();
  private readonly reverseGeocodeCache = new Map<string, CacheEntry<GeocodingResult>>();
  private readonly autocompleteCache = new Map<string, CacheEntry<PlaceSuggestion[]>>();
  private readonly placeDetailsCache = new Map<string, CacheEntry<PlaceDetails>>();

  // Cache TTLs
  private readonly geocodeTtlMs = 24 * 60 * 60 * 1000; // 24 hours
  private readonly autocompleteTtlMs = 10 * 60 * 1000; // 10 minutes

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

  public setProvider(provider: GeolocationProvider): void {
    this.provider = provider;
  }

  public clearCache(): void {
    this.geocodeCache.clear();
    this.reverseGeocodeCache.clear();
    this.autocompleteCache.clear();
    this.placeDetailsCache.clear();
  }

  // ===========================================================================
  // GEOCODING & AUTOCOMPLETE OPERATIONS
  // ===========================================================================

  public async geocode(address: string): Promise<GeocodingResult> {
    const cacheKey = address.trim().toLowerCase();
    const cached = this.geocodeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const result = await this.provider.geocodeAddress(address);

    this.geocodeCache.set(cacheKey, {
      value: result,
      expiresAt: Date.now() + this.geocodeTtlMs,
    });

    return result;
  }

  public async reverseGeocode(coords: GeoCoordinates): Promise<GeocodingResult> {
    const valid = validateCoordinates(coords.latitude, coords.longitude);
    const cacheKey = `${valid.latitude.toFixed(5)},${valid.longitude.toFixed(5)}`;
    const cached = this.reverseGeocodeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const result = await this.provider.reverseGeocode(valid);

    this.reverseGeocodeCache.set(cacheKey, {
      value: result,
      expiresAt: Date.now() + this.geocodeTtlMs,
    });

    return result;
  }

  public async autocomplete(query: string, sessionToken?: string): Promise<PlaceSuggestion[]> {
    const cacheKey = `${query.trim().toLowerCase()}_${sessionToken || ''}`;
    const cached = this.autocompleteCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const results = await this.provider.searchPlaces(query, sessionToken);

    this.autocompleteCache.set(cacheKey, {
      value: results,
      expiresAt: Date.now() + this.autocompleteTtlMs,
    });

    return results;
  }

  public async getPlaceDetails(placeId: string, sessionToken?: string): Promise<PlaceDetails> {
    const cacheKey = `${placeId.trim()}_${sessionToken || ''}`;
    const cached = this.placeDetailsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const result = await this.provider.getPlaceDetails(placeId, sessionToken);

    this.placeDetailsCache.set(cacheKey, {
      value: result,
      expiresAt: Date.now() + this.geocodeTtlMs,
    });

    return result;
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
