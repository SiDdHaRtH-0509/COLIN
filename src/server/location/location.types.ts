/**
 * COLIN Geolocation & Location Infrastructure Types
 * Phase 4A.2.5.2: Google Maps & Geolocation Infrastructure
 */

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface AddressComponents {
  addressLine1?: string;
  addressLine2?: string;
  locality?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export type LocationSource =
  | 'OWNER_PROVIDED'
  | 'OWNER_CONFIRMED'
  | 'GOOGLE_GEOCODING'
  | 'GOOGLE_PLACES'
  | 'MOCK_GEOCODING'
  | 'COLIN_DERIVED';

export interface GeocodingResult {
  coordinates: GeoCoordinates;
  formattedAddress: string;
  placeId?: string;
  addressComponents: AddressComponents;
  source?: LocationSource;
  cachedAt?: number;
  expiresAt?: number;
}

export interface PlaceSuggestion {
  placeId: string;
  primaryText: string;
  secondaryText?: string;
  fullText: string;
  types?: string[];
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  coordinates: GeoCoordinates;
  addressComponents?: AddressComponents;
  source?: LocationSource;
  expiresAt?: number;
}

export interface GeolocationProvider {
  readonly providerName: string;
  readonly attribution?: string;
  geocodeAddress(address: string): Promise<GeocodingResult>;
  reverseGeocode(coordinates: GeoCoordinates): Promise<GeocodingResult>;
  searchPlaces(query: string, sessionToken?: string): Promise<PlaceSuggestion[]>;
  getPlaceDetails(placeId: string, sessionToken?: string): Promise<PlaceDetails>;
}

export class GeolocationValidationError extends Error {
  public readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'GeolocationValidationError';
    Object.setPrototypeOf(this, GeolocationValidationError.prototype);
  }
}

export class GeolocationNotFoundError extends Error {
  public readonly statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'GeolocationNotFoundError';
    Object.setPrototypeOf(this, GeolocationNotFoundError.prototype);
  }
}

export class GeolocationProviderError extends Error {
  public readonly statusCode = 502;
  public readonly isRetryable: boolean;

  constructor(message: string, isRetryable = false) {
    super(message);
    this.name = 'GeolocationProviderError';
    this.isRetryable = isRetryable;
    Object.setPrototypeOf(this, GeolocationProviderError.prototype);
  }
}
