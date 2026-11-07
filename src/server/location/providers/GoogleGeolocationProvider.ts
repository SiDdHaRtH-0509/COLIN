/**
 * COLIN Google Maps Geolocation Provider
 * Phase 4A.2.5.2: Google Maps & Geolocation Infrastructure
 * 
 * Interacts with Google Maps Geocoding API and Places API using a secure server key.
 * Features request timeouts, secret redaction, and strict coordinate validation.
 */

import {
  GeolocationProvider,
  GeoCoordinates,
  GeocodingResult,
  PlaceSuggestion,
  PlaceDetails,
  AddressComponents,
  GeolocationValidationError,
  GeolocationNotFoundError,
  GeolocationProviderError,
} from '../location.types';
import { validateCoordinates } from '../validation';

export interface GoogleGeolocationConfig {
  apiKey: string;
  timeoutMs?: number;
  region?: string;
}

export class GoogleGeolocationProvider implements GeolocationProvider {
  public readonly providerName = 'google';
  public readonly attribution = 'Powered by Google';
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly region: string;

  constructor(config: GoogleGeolocationConfig) {
    if (!config.apiKey || typeof config.apiKey !== 'string' || config.apiKey.trim().length === 0) {
      throw new GeolocationValidationError('Google Geolocation Provider requires a non-empty API key.');
    }
    this.apiKey = config.apiKey.trim();
    this.timeoutMs = config.timeoutMs || 5000;
    this.region = config.region || 'in';
  }

  private redactKey(text: string): string {
    if (!this.apiKey) return text;
    return text.split(this.apiKey).join('[REDACTED_KEY]');
  }

  private async fetchWithTimeout(url: string): Promise<any> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        throw new GeolocationProviderError(
          `Google Maps API returned HTTP ${response.status}: ${response.statusText}`,
          response.status >= 500
        );
      }

      return await response.json();
    } catch (err: any) {
      if (err.name === 'TimeoutError' || err.code === 20) {
        throw new GeolocationProviderError(`Google Maps API request timed out after ${this.timeoutMs}ms.`, true);
      }
      if (err instanceof GeolocationProviderError) {
        throw err;
      }
      const sanitized = this.redactKey(err.message || String(err));
      throw new GeolocationProviderError(`Google Maps API communication failed: ${sanitized}`, true);
    }
  }

  public async geocodeAddress(address: string): Promise<GeocodingResult> {
    if (!address || typeof address !== 'string' || address.trim().length === 0) {
      throw new GeolocationValidationError('Address cannot be empty.');
    }

    const endpoint = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address.trim()
    )}&region=${this.region}&key=${this.apiKey}`;

    const data = await this.fetchWithTimeout(endpoint);

    if (data.status === 'ZERO_RESULTS') {
      throw new GeolocationNotFoundError(`No location found for address: "${address}".`);
    }

    if (data.status === 'OVER_QUERY_LIMIT') {
      throw new GeolocationProviderError('Google Geocoding API quota exceeded or rate limited.', true);
    }

    if (data.status === 'REQUEST_DENIED') {
      throw new GeolocationProviderError(
        `Google Geocoding API request denied: ${this.redactKey(data.error_message || 'Access Denied')}`
      );
    }

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new GeolocationProviderError(`Google Geocoding failed with status: ${data.status}`);
    }

    const firstResult = data.results[0];
    const loc = firstResult.geometry?.location;

    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
      throw new GeolocationProviderError('Google Geocoding response missing valid coordinates.');
    }

    const validCoords = validateCoordinates(loc.lat, loc.lng);
    const components = this.extractAddressComponents(firstResult.address_components || []);

    return {
      coordinates: validCoords,
      formattedAddress: firstResult.formatted_address || address,
      placeId: firstResult.place_id,
      addressComponents: components,
      source: 'GOOGLE_GEOCODING',
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
  }

  public async reverseGeocode(coordinates: GeoCoordinates): Promise<GeocodingResult> {
    const valid = validateCoordinates(coordinates.latitude, coordinates.longitude);

    const endpoint = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${valid.latitude},${valid.longitude}&key=${this.apiKey}`;

    const data = await this.fetchWithTimeout(endpoint);

    if (data.status === 'ZERO_RESULTS') {
      throw new GeolocationNotFoundError(`No address found for coordinates (${valid.latitude}, ${valid.longitude}).`);
    }

    if (data.status === 'OVER_QUERY_LIMIT') {
      throw new GeolocationProviderError('Google Reverse Geocoding API quota exceeded.', true);
    }

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new GeolocationProviderError(`Google Reverse Geocoding failed with status: ${data.status}`);
    }

    const firstResult = data.results[0];
    const components = this.extractAddressComponents(firstResult.address_components || []);

    return {
      coordinates: valid,
      formattedAddress: firstResult.formatted_address,
      placeId: firstResult.place_id,
      addressComponents: components,
      source: 'GOOGLE_GEOCODING',
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
  }

  public async searchPlaces(query: string, sessionToken?: string): Promise<PlaceSuggestion[]> {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return [];
    }

    let endpoint = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      query.trim()
    )}&components=country:${this.region}&key=${this.apiKey}`;

    if (sessionToken) {
      endpoint += `&sessiontoken=${encodeURIComponent(sessionToken)}`;
    }

    const data = await this.fetchWithTimeout(endpoint);

    if (data.status === 'ZERO_RESULTS') {
      return [];
    }

    if (data.status === 'OVER_QUERY_LIMIT') {
      throw new GeolocationProviderError('Google Places API quota exceeded.', true);
    }

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new GeolocationProviderError(`Google Places autocomplete failed with status: ${data.status}`);
    }

    const predictions: any[] = data.predictions || [];

    return predictions.map((p) => ({
      placeId: p.place_id,
      primaryText: p.structured_formatting?.main_text || p.description,
      secondaryText: p.structured_formatting?.secondary_text,
      fullText: p.description,
      types: p.types || [],
    }));
  }

  public async getPlaceDetails(placeId: string, sessionToken?: string): Promise<PlaceDetails> {
    if (!placeId || typeof placeId !== 'string' || placeId.trim().length === 0) {
      throw new GeolocationValidationError('Place ID cannot be empty.');
    }

    let endpoint = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      placeId.trim()
    )}&fields=place_id,name,formatted_address,geometry,address_components&key=${this.apiKey}`;

    if (sessionToken) {
      endpoint += `&sessiontoken=${encodeURIComponent(sessionToken)}`;
    }

    const data = await this.fetchWithTimeout(endpoint);

    if (data.status === 'NOT_FOUND' || data.status === 'ZERO_RESULTS') {
      throw new GeolocationNotFoundError(`Place ID "${placeId}" not found.`);
    }

    if (data.status !== 'OK' || !data.result) {
      throw new GeolocationProviderError(`Google Place Details failed with status: ${data.status}`);
    }

    const result = data.result;
    const loc = result.geometry?.location;

    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
      throw new GeolocationProviderError('Place Details missing geometry coordinates.');
    }

    const validCoords = validateCoordinates(loc.lat, loc.lng);
    const components = this.extractAddressComponents(result.address_components || []);

    return {
      placeId: result.place_id,
      name: result.name || result.formatted_address,
      formattedAddress: result.formatted_address || '',
      coordinates: validCoords,
      addressComponents: components,
      source: 'GOOGLE_PLACES',
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
  }

  private extractAddressComponents(components: any[]): AddressComponents {
    const res: AddressComponents = {};

    for (const comp of components) {
      const types: string[] = comp.types || [];
      if (types.includes('sublocality_level_1') || types.includes('sublocality') || types.includes('neighborhood')) {
        res.locality = comp.long_name;
      } else if (types.includes('locality')) {
        res.city = comp.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        res.state = comp.long_name;
      } else if (types.includes('postal_code')) {
        res.pincode = comp.long_name;
      } else if (types.includes('country')) {
        res.country = comp.long_name;
      } else if (types.includes('route')) {
        res.addressLine2 = comp.long_name;
      } else if (types.includes('street_number')) {
        res.addressLine1 = comp.long_name;
      }
    }

    return res;
  }
}
