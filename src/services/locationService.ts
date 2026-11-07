/**
 * COLIN Location & Geolocation Service
 * Computes distances using Haversine formula and interfaces with Browser Geolocation.
 * Pre-architected to seamlessly swap with Google Maps Distance Matrix / Geocoding API.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeolocationResult {
  coords?: Coordinates;
  error?: string;
  errorCode?: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED';
  locationName?: string;
}

/**
 * Calculates great-circle distance between two points on the Earth (Haversine formula).
 * Supports both (coords1, coords2) or (lat1, lon1, lat2, lon2).
 * Returns distance in kilometers (km).
 */
export function calculateHaversineDistance(
  lat1OrCoords1: number | Coordinates,
  lon1OrCoords2: number | Coordinates,
  lat2?: number,
  lon2?: number
): number {
  let lat1: number;
  let lon1: number;
  let lat2Val: number;
  let lon2Val: number;

  if (typeof lat1OrCoords1 === 'object' && typeof lon1OrCoords2 === 'object') {
    lat1 = lat1OrCoords1.latitude;
    lon1 = lat1OrCoords1.longitude;
    lat2Val = lon1OrCoords2.latitude;
    lon2Val = lon1OrCoords2.longitude;
  } else {
    lat1 = lat1OrCoords1 as number;
    lon1 = lon1OrCoords2 as number;
    lat2Val = lat2 as number;
    lon2Val = lon2 as number;
  }

  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2Val - lat1) * Math.PI) / 180;
  const dLon = ((lon2Val - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2Val * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats a distance in km into a human-friendly label.
 * e.g. 0.45 km -> "450 m away", 2.34 km -> "2.3 km away"
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

/**
 * Requests the user's current GPS position using browser Geolocation API.
 * Must be triggered explicitly by user action (never automatically).
 */
export function getCurrentUserLocation(): Promise<GeolocationResult> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      resolve({
        error: 'Geolocation is not supported by your browser. Please search manually by city or campus.',
        errorCode: 'NOT_SUPPORTED',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          locationName: 'Current GPS Location',
        });
      },
      (error) => {
        let errorMsg = 'Unable to retrieve location.';
        let code: GeolocationResult['errorCode'] = 'POSITION_UNAVAILABLE';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Location permission was denied. You can still discover stays by selecting your college campus or city above.';
            code = 'PERMISSION_DENIED';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'Location information is currently unavailable from your device.';
            code = 'POSITION_UNAVAILABLE';
            break;
          case error.TIMEOUT:
            errorMsg = 'The request to obtain your location timed out. Please try again.';
            code = 'TIMEOUT';
            break;
        }

        resolve({
          error: errorMsg,
          errorCode: code,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * Mapping Provider Interface (Architecture ready for Google Maps API integration)
 */
export interface MapProviderConfig {
  apiKey?: string;
  provider: 'google-maps' | 'browser-native';
}

export const MAP_CONFIG: MapProviderConfig = {
  provider: 'browser-native', // Future Google Maps migration will supply sanitized AGY/env key
};

// =============================================================================
// BACKEND LOCATION API CLIENT (Phase 4A.2.5.2)
// =============================================================================

export interface FrontendPlaceSuggestion {
  placeId: string;
  primaryText: string;
  secondaryText?: string;
  fullText: string;
  types?: string[];
}

export interface FrontendPlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  coordinates: Coordinates;
  addressComponents?: {
    locality?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
}

export interface FrontendGeocodingResult {
  coordinates: Coordinates;
  formattedAddress: string;
  placeId?: string;
  addressComponents?: {
    locality?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
}

/**
 * Searches places / campuses via backend proxy with session token support.
 */
export async function fetchAutocompleteSuggestions(
  query: string,
  sessionToken?: string
): Promise<FrontendPlaceSuggestion[]> {
  try {
    const params = new URLSearchParams({ query: query.trim() });
    if (sessionToken) params.set('sessionToken', sessionToken);

    const res = await fetch(`/api/v1/location/autocomplete?${params.toString()}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

/**
 * Retrieves details and coordinates for a selected place.
 */
export async function fetchPlaceDetails(
  placeId: string,
  sessionToken?: string
): Promise<FrontendPlaceDetails | null> {
  try {
    const params = new URLSearchParams();
    if (sessionToken) params.set('sessionToken', sessionToken);

    const res = await fetch(`/api/v1/location/places/${encodeURIComponent(placeId)}?${params.toString()}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

/**
 * Geocodes an address string to coordinates via backend service.
 */
export async function geocodeAddress(address: string): Promise<FrontendGeocodingResult | null> {
  try {
    const res = await fetch('/api/v1/location/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: address.trim() }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

/**
 * Reverse geocodes coordinates to a human-readable address.
 */
export async function reverseGeocodeCoords(coords: Coordinates): Promise<FrontendGeocodingResult | null> {
  try {
    const res = await fetch('/api/v1/location/reverse-geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

/**
 * Creates a unique session token (UUID v4) for Google Places Autocomplete grouping.
 * Follows Google Maps Platform Terms of Service: session begins on first keystroke
 * and concludes upon Place Details selection. Abandoned sessions are discarded.
 */
export function createAutocompleteSessionToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Fetches curated list of student hubs, colleges, and coaching areas.
 */
export async function fetchCampuses(): Promise<any[]> {
  try {
    const res = await fetch('/api/v1/location/campuses');
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}
