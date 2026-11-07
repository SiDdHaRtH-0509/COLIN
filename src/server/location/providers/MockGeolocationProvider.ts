/**
 * COLIN Mock Geolocation Provider
 * Phase 4A.2.5.2: Google Maps & Geolocation Infrastructure
 * 
 * Provides deterministic, offline geocoding, reverse geocoding, and autocomplete
 * for development, CI/CD, and hermetic integration testing.
 */

import {
  GeolocationProvider,
  GeoCoordinates,
  GeocodingResult,
  PlaceSuggestion,
  PlaceDetails,
  GeolocationNotFoundError,
  GeolocationValidationError,
} from '../location.types';
import { validateCoordinates, calculateHaversineKm } from '../validation';

export interface MockHub {
  placeId: string;
  name: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  coordinates: GeoCoordinates;
  keywords: string[];
}

export const MOCK_STUDENT_HUBS: MockHub[] = [
  {
    placeId: 'hub-delhi-north-campus',
    name: 'Delhi University North Campus (GTB Nagar / Hudson Lane)',
    locality: 'Hudson Lane, GTB Nagar',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110009',
    coordinates: { latitude: 28.6942, longitude: 77.2085 },
    keywords: ['north campus', 'delhi university', 'du north', 'gtb nagar', 'hudson lane', 'srcc', 'hindu college', 'hansraj'],
  },
  {
    placeId: 'hub-delhi-south-campus',
    name: 'DU South Campus (Satya Niketan)',
    locality: 'Satya Niketan',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110021',
    coordinates: { latitude: 28.5862, longitude: 77.1685 },
    keywords: ['south campus', 'satya niketan', 'venky', 'motilal', 'arsd', 'du south'],
  },
  {
    placeId: 'hub-iit-delhi',
    name: 'IIT Delhi (Hauz Khas)',
    locality: 'Hauz Khas',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110016',
    coordinates: { latitude: 28.5450, longitude: 77.1926 },
    keywords: ['iit delhi', 'hauz khas', 'sDA', 'iitd'],
  },
  {
    placeId: 'hub-bangalore-christ',
    name: 'Christ University & SG Palya',
    locality: 'SG Palya, Koramangala',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560029',
    coordinates: { latitude: 12.9352, longitude: 77.6085 },
    keywords: ['christ', 'christ university', 'sg palya', 'koramangala', 'hosur road'],
  },
  {
    placeId: 'hub-iit-bombay',
    name: 'IIT Bombay & Powai',
    locality: 'Powai',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400076',
    coordinates: { latitude: 19.1334, longitude: 72.9133 },
    keywords: ['iit bombay', 'powai', 'iitb', 'hiranandani'],
  },
  {
    placeId: 'hub-pune-symbiosis',
    name: 'Symbiosis International University (Viman Nagar)',
    locality: 'Viman Nagar',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411014',
    coordinates: { latitude: 18.5679, longitude: 73.9143 },
    keywords: ['symbiosis', 'viman nagar', 'sls', 'scms', 'siu'],
  },
  {
    placeId: 'hub-hyderabad-iiit',
    name: 'IIIT Hyderabad & Gachibowli',
    locality: 'Gachibowli',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500032',
    coordinates: { latitude: 17.4455, longitude: 78.3489 },
    keywords: ['iiit hyderabad', 'gachibowli', 'hcu', 'iiith', 'financial district'],
  },
  {
    placeId: 'hub-kota-allen',
    name: 'Allen Career Institute & Indraprastha Area',
    locality: 'Indraprastha Industrial Area',
    city: 'Kota',
    state: 'Rajasthan',
    pincode: '324005',
    coordinates: { latitude: 25.1388, longitude: 75.8450 },
    keywords: ['allen', 'kota', 'resonance', 'career point', 'indraprastha'],
  },
  {
    placeId: 'hub-amity-noida',
    name: 'Amity University Noida (Sector 125)',
    locality: 'Sector 125',
    city: 'Noida',
    state: 'Uttar Pradesh',
    pincode: '201313',
    coordinates: { latitude: 28.5440, longitude: 77.3332 },
    keywords: ['amity', 'noida', 'sector 125', 'expressway'],
  },
];

export class MockGeolocationProvider implements GeolocationProvider {
  public readonly providerName = 'mock';
  private simulatedError: Error | null = null;

  /**
   * For testing failure handling and fallback mechanisms.
   */
  public setSimulatedError(error: Error | null): void {
    this.simulatedError = error;
  }

  private checkSimulatedError(): void {
    if (this.simulatedError) {
      throw this.simulatedError;
    }
  }

  public async geocodeAddress(address: string): Promise<GeocodingResult> {
    this.checkSimulatedError();

    if (!address || typeof address !== 'string' || address.trim().length === 0) {
      throw new GeolocationValidationError('Address cannot be empty.');
    }

    const cleanAddress = address.trim().toLowerCase();

    // Find closest matching hub
    const matchedHub = MOCK_STUDENT_HUBS.find((hub) =>
      hub.keywords.some((kw) => cleanAddress.includes(kw)) ||
      cleanAddress.includes(hub.city.toLowerCase()) ||
      cleanAddress.includes(hub.locality.toLowerCase())
    );

    if (matchedHub) {
      return {
        coordinates: matchedHub.coordinates,
        formattedAddress: `${address}, ${matchedHub.locality}, ${matchedHub.city}, ${matchedHub.state} - ${matchedHub.pincode}`,
        placeId: matchedHub.placeId,
        addressComponents: {
          addressLine1: address,
          locality: matchedHub.locality,
          city: matchedHub.city,
          state: matchedHub.state,
          pincode: matchedHub.pincode,
          country: 'India',
        },
        source: 'MOCK_GEOCODING',
      };
    }

    // Default fallback coordinates centered in New Delhi for unrecognized test addresses
    return {
      coordinates: { latitude: 28.6139, longitude: 77.2090 },
      formattedAddress: `${address}, Delhi, India`,
      placeId: 'mock-place-default',
      addressComponents: {
        addressLine1: address,
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        country: 'India',
      },
      source: 'MOCK_GEOCODING',
    };
  }

  public async reverseGeocode(coordinates: GeoCoordinates): Promise<GeocodingResult> {
    this.checkSimulatedError();
    const valid = validateCoordinates(coordinates.latitude, coordinates.longitude);

    // Find nearest mock hub
    let nearestHub = MOCK_STUDENT_HUBS[0];
    let minDistance = calculateHaversineKm(valid, nearestHub.coordinates);

    for (let i = 1; i < MOCK_STUDENT_HUBS.length; i++) {
      const dist = calculateHaversineKm(valid, MOCK_STUDENT_HUBS[i].coordinates);
      if (dist < minDistance) {
        minDistance = dist;
        nearestHub = MOCK_STUDENT_HUBS[i];
      }
    }

    return {
      coordinates: valid,
      formattedAddress: `${nearestHub.locality}, ${nearestHub.city}, ${nearestHub.state} - ${nearestHub.pincode}, India`,
      placeId: nearestHub.placeId,
      addressComponents: {
        locality: nearestHub.locality,
        city: nearestHub.city,
        state: nearestHub.state,
        pincode: nearestHub.pincode,
        country: 'India',
      },
      source: 'MOCK_GEOCODING',
    };
  }

  public async searchPlaces(query: string, _sessionToken?: string): Promise<PlaceSuggestion[]> {
    this.checkSimulatedError();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return [];
    }

    const q = query.trim().toLowerCase();

    const matches = MOCK_STUDENT_HUBS.filter((hub) =>
      hub.name.toLowerCase().includes(q) ||
      hub.city.toLowerCase().includes(q) ||
      hub.locality.toLowerCase().includes(q) ||
      hub.keywords.some((kw) => kw.includes(q))
    );

    return matches.map((hub) => ({
      placeId: hub.placeId,
      primaryText: hub.name,
      secondaryText: `${hub.locality}, ${hub.city}, ${hub.state}`,
      fullText: `${hub.name}, ${hub.locality}, ${hub.city}`,
      types: ['university', 'establishment', 'point_of_interest'],
    }));
  }

  public async getPlaceDetails(placeId: string, _sessionToken?: string): Promise<PlaceDetails> {
    this.checkSimulatedError();

    const hub = MOCK_STUDENT_HUBS.find((h) => h.placeId === placeId);
    if (!hub) {
      throw new GeolocationNotFoundError(`Place with ID ${placeId} not found.`);
    }

    return {
      placeId: hub.placeId,
      name: hub.name,
      formattedAddress: `${hub.name}, ${hub.locality}, ${hub.city}, ${hub.state} - ${hub.pincode}`,
      coordinates: hub.coordinates,
      addressComponents: {
        locality: hub.locality,
        city: hub.city,
        state: hub.state,
        pincode: hub.pincode,
        country: 'India',
      },
      source: 'MOCK_GEOCODING',
    };
  }
}
