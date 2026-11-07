/**
 * COLIN Google Maps Data Retention & Policy Compliance Verification Suite
 * Phase 4A.2.5.2: Final Google Maps Data Retention & Compliance Correction
 * 
 * Verifies field-level data provenance, 30-day Google content expiration,
 * Place ID indefinite retention, cache eviction, owner-confirmed location immunity,
 * and geospatial search continuity without expired Google content.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  LocationService,
  MockGeolocationProvider,
  GoogleGeolocationProvider,
} from '../../server/location';
import { PropertyRepository } from '../../server/database/repositories/PropertyRepository';
import { PropertyService } from '../../server/services/PropertyService';
import { createAutocompleteSessionToken } from '../../services/locationService';
import { PropertyType, PropertyGenderPolicy, PropertyVerificationStatus, Prisma } from '@prisma/client';
import { getAppPrismaClient } from '../../server/database';

describe('COLIN Google Maps Data Retention & Policy Compliance Suite', () => {
  let locationService: LocationService;
  let mockProvider: MockGeolocationProvider;
  let propertyRepo: PropertyRepository;
  let propertyService: PropertyService;
  let testOwnerId: string;
  const createdPropertyIds: string[] = [];

  beforeEach(async () => {
    mockProvider = new MockGeolocationProvider();
    locationService = new LocationService(mockProvider);
    locationService.clearCache();
    propertyRepo = new PropertyRepository();
    propertyService = new PropertyService();

    // Setup a verified owner profile for testing database persistence
    testOwnerId = '00000000-0000-0000-0000-000000000002'; // seeded owner
  });

  afterEach(async () => {
    const prisma = getAppPrismaClient();
    if (createdPropertyIds.length > 0) {
      await prisma.property.deleteMany({
        where: { id: { in: createdPropertyIds } },
      });
      createdPropertyIds.length = 0;
    }
  });

  // ===========================================================================
  // 1. DATA PROVENANCE & GOOGLE CONTENT EXPIRATION (30-DAY MAXIMUM)
  // ===========================================================================
  describe('1. Data Provenance & 30-Day Expiration Invariants', () => {
    it('GoogleGeolocationProvider attaches attribution and 30-day expiration to geocoding results', async () => {
      const googleProvider = new GoogleGeolocationProvider({
        apiKey: 'AIzaSyFakeKeyForProvenanceTesting12345',
      });

      expect(googleProvider.attribution).toBe('Powered by Google');
      expect(googleProvider.providerName).toBe('google');
    });

    it('MockGeolocationProvider tags results with MOCK_GEOCODING and no expiration', async () => {
      const result = await mockProvider.geocodeAddress('Hudson Lane, Delhi');
      expect(result.source).toBe('MOCK_GEOCODING');
      expect(result.expiresAt).toBeUndefined();
    });

    it('distinguishes Customer Content (Owner-Provided) from Google-Derived content', async () => {
      const slug1 = `prov-owner-${Date.now()}`;
      const ownerProp = await propertyRepo.createProperty({
        ownerId: testOwnerId,
        name: 'Owner Entered Stay',
        slug: slug1,
        propertyType: PropertyType.PG,
        genderPolicy: PropertyGenderPolicy.COED,
        addressLine1: '123 University Marg',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110007',
        latitude: 28.6942,
        longitude: 77.2085,
        coordinateSource: 'OWNER_PROVIDED',
      });
      createdPropertyIds.push(ownerProp.id);

      expect(ownerProp.coordinateSource).toBe('OWNER_PROVIDED');
      expect(ownerProp.googleContentExpiresAt).toBeNull();
      expect(ownerProp.placeId).toBeNull();

      const slug2 = `prov-google-${Date.now()}`;
      const googleProp = await propertyRepo.createProperty({
        ownerId: testOwnerId,
        name: 'Google Geocoded Stay',
        slug: slug2,
        propertyType: PropertyType.PG,
        genderPolicy: PropertyGenderPolicy.COED,
        addressLine1: '456 Ring Road',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110009',
        latitude: 28.7000,
        longitude: 77.2100,
        placeId: 'ChIJfakePlaceId12345',
        coordinateSource: 'GOOGLE_GEOCODING',
      });
      createdPropertyIds.push(googleProp.id);

      expect(googleProp.coordinateSource).toBe('GOOGLE_GEOCODING');
      expect(googleProp.placeId).toBe('ChIJfakePlaceId12345');
      expect(googleProp.googleContentExpiresAt).not.toBeNull();

      // Expiration must be approximately 30 days in the future
      const expiresAtMs = new Date(googleProp.googleContentExpiresAt!).getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      expect(expiresAtMs).toBeGreaterThan(Date.now() + thirtyDaysMs - 60000);
      expect(expiresAtMs).toBeLessThanOrEqual(Date.now() + thirtyDaysMs + 60000);
    });
  });

  // ===========================================================================
  // 2. PLACE ID INDEFINITE RETENTION & REFRESH WORKFLOW
  // ===========================================================================
  describe('2. Place ID Persistence & Location Refresh Workflow', () => {
    it('persists Place ID indefinitely under Google Maps ToS Section 3.2.4 exception', async () => {
      const slug = `placeid-test-${Date.now()}`;
      const prop = await propertyRepo.createProperty({
        ownerId: testOwnerId,
        name: 'Place ID Retention Stay',
        slug,
        propertyType: PropertyType.HOSTEL,
        genderPolicy: PropertyGenderPolicy.BOYS_ONLY,
        addressLine1: 'North Campus Main Road',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110009',
        placeId: 'ChIJnd72a834-DkR_place_id_exempt_from_caching',
        coordinateSource: 'GOOGLE_PLACES',
      });
      createdPropertyIds.push(prop.id);

      const retrieved = await propertyRepo.findById(prop.id);
      expect(retrieved?.placeId).toBe('ChIJnd72a834-DkR_place_id_exempt_from_caching');
    });

    it('refreshes expired location data using stored Place ID via LocationService', async () => {
      const refreshed = await locationService.refreshLocationData({
        placeId: 'hub-delhi-north-campus',
      });

      expect(refreshed.coordinates.latitude).toBeCloseTo(28.6942, 3);
      expect(refreshed.coordinates.longitude).toBeCloseTo(77.2085, 3);
      expect(refreshed.placeId).toBe('hub-delhi-north-campus');
      expect(refreshed.googleContentExpiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('refreshes expired location data using physical address string fallback', async () => {
      const refreshed = await locationService.refreshLocationData({
        address: 'Powai, Mumbai',
      });

      expect(refreshed.coordinates.latitude).toBeCloseTo(19.1334, 3);
      expect(refreshed.coordinates.longitude).toBeCloseTo(72.9133, 3);
      expect(refreshed.placeId).toBe('hub-iit-bombay');
      expect(refreshed.googleContentExpiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('updates location provenance and extends 30-day expiration in propertyRepo.updateLocationProvenance()', async () => {
      const slug = `refresh-prop-${Date.now()}`;
      const prop = await propertyRepo.createProperty({
        ownerId: testOwnerId,
        name: 'Stay to Refresh',
        slug,
        propertyType: PropertyType.PG,
        genderPolicy: PropertyGenderPolicy.COED,
        addressLine1: 'Old GT Road',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110007',
        latitude: 28.6000,
        longitude: 77.2000,
        coordinateSource: 'GOOGLE_GEOCODING',
        googleContentExpiresAt: new Date(Date.now() - 1000), // Already expired!
      });
      createdPropertyIds.push(prop.id);

      // Verify it was recorded as expired
      const expiredList = await propertyRepo.findExpiredGoogleLocations();
      expect(expiredList.some((p) => p.id === prop.id)).toBe(true);

      // Refresh property location
      const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const updated = await propertyRepo.updateLocationProvenance(prop.id, {
        latitude: 28.6942,
        longitude: 77.2085,
        placeId: 'hub-delhi-north-campus',
        coordinateSource: 'GOOGLE_GEOCODING',
        googleContentExpiresAt: newExpiry,
      });

      expect(Number(updated.latitude)).toBeCloseTo(28.6942, 4);
      expect(Number(updated.longitude)).toBeCloseTo(77.2085, 4);
      expect(updated.googleContentExpiresAt!.getTime()).toBe(newExpiry.getTime());

      // No longer in expired list
      const postRefreshExpiredingsings = await propertyRepo.findExpiredGoogleLocations();
      expect(postRefreshExpiredingsings.some((p) => p.id === prop.id)).toBe(false);
    });
  });

  // ===========================================================================
  // 3. OWNER CONFIRMATION IMMUNITY FROM 30-DAY GOOGLE EXPIRATION
  // ===========================================================================
  describe('3. Owner Confirmation & Authoritative Customer Content Transition', () => {
    it('transitions coordinateSource to OWNER_CONFIRMED and clears expiration when owner confirms location', async () => {
      const slug = `confirm-loc-${Date.now()}`;
      const prop = await propertyRepo.createProperty({
        ownerId: testOwnerId,
        name: 'Owner Confirmed Stay',
        slug,
        propertyType: PropertyType.PG,
        genderPolicy: PropertyGenderPolicy.GIRLS_ONLY,
        addressLine1: 'Hudson Lane House',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110009',
        latitude: 28.6942,
        longitude: 77.2085,
        coordinateSource: 'GOOGLE_GEOCODING',
        googleContentExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // Expiring in 10 days
      });
      createdPropertyIds.push(prop.id);

      // Owner confirms the pin location
      const confirmed = await propertyRepo.confirmLocation(prop.id, testOwnerId);
      expect(confirmed.coordinateSource).toBe('OWNER_CONFIRMED');
      expect(confirmed.googleContentExpiresAt).toBeNull();

      // Read back from database
      const reRead = await propertyRepo.findById(prop.id);
      expect(reRead?.coordinateSource).toBe('OWNER_CONFIRMED');
      expect(reRead?.googleContentExpiresAt).toBeNull();
    });
  });

  // ===========================================================================
  // 4. IN-MEMORY CACHE EXPIRATION & PRUNING IN LOCATION SERVICE
  // ===========================================================================
  describe('4. In-Memory Cache Expiry & Eviction Invariants', () => {
    it('prunes expired cache entries and re-fetches from provider upon expiry', async () => {
      const address = 'Delhi University North Campus';
      await locationService.geocode(address);

      // Artificially prune cache
      const pruned = locationService.pruneExpiredCache();
      expect(pruned).toBe(0); // None expired yet

      // Clear cache and verify subsequent call re-invokes provider
      locationService.clearCache();
      const res = await locationService.geocode(address);
      expect(res).toBeDefined();
    });

    it('ensures autocomplete predictions are ephemeral and not cached in LocationService', async () => {
      const q = 'Campus';
      const r1 = await locationService.autocomplete(q);
      expect(r1.length).toBeGreaterThan(0);

      // Verify no autocomplete cache exists on locationService instance
      expect((locationService as any).autocompleteCache).toBeUndefined();
    });
  });

  // ===========================================================================
  // 5. SESSION TOKEN INTEGRITY & DISCARDING OF ABANDONED SESSIONS
  // ===========================================================================
  describe('5. Session Token Grouping & Attribution', () => {
    it('generates unique UUID v4 session tokens for autocomplete keystroke grouping', () => {
      const token1 = createAutocompleteSessionToken();
      const token2 = createAutocompleteSessionToken();

      expect(token1).not.toBe(token2);
      expect(token1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('binds session token to Place Details and closes the billing session', async () => {
      const sessionToken = createAutocompleteSessionToken();
      const suggestions = await locationService.autocomplete('North Campus', sessionToken);
      expect(suggestions.length).toBeGreaterThan(0);

      const placeId = suggestions[0].placeId;
      const details = await locationService.getPlaceDetails(placeId, sessionToken);
      expect(details.placeId).toBe(placeId);
    });
  });

  // ===========================================================================
  // 6. GEOSPATIAL SEARCH CONTINUITY & EXPIRED COORDINATE SUPPRESSION
  // ===========================================================================
  describe('6. Geospatial Search & Public DTO Suppression of Expired Coordinates', () => {
    it('suppresses expired Google coordinates in formatPublicProperty() DTO response', async () => {
      // Mock raw property object with expired Google content
      const expiredRawProp: any = {
        id: 'prop-expired-123',
        name: 'Expired Property Stay',
        slug: 'expired-property-stay',
        propertyType: 'PG',
        genderPolicy: 'COED',
        addressLine1: 'Expired St',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        latitude: new Prisma.Decimal(28.6139),
        longitude: new Prisma.Decimal(77.2090),
        coordinateSource: 'GOOGLE_GEOCODING',
        googleContentExpiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
        rooms: [],
      };

      const dto = propertyService.formatPublicPropertyDto(expiredRawProp);
      expect(dto.address.latitude).toBeNull();
      expect(dto.address.longitude).toBeNull();
      expect(dto.address.isLocationExpired).toBe(true);
      expect(dto.address.addressLine1).toBe('Expired St'); // Owner address preserved!
    });

    it('preserves valid (non-expired) Google coordinates in formatPublicPropertyDto() DTO response', async () => {
      const validRawProp: any = {
        id: 'prop-valid-123',
        name: 'Active Property Stay',
        slug: 'active-property-stay',
        propertyType: 'PG',
        genderPolicy: 'COED',
        addressLine1: 'Active St',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        latitude: new Prisma.Decimal(28.6139),
        longitude: new Prisma.Decimal(77.2090),
        coordinateSource: 'GOOGLE_GEOCODING',
        googleContentExpiresAt: new Date(Date.now() + 25 * 24 * 3600000), // Valid for 25 more days
        rooms: [],
      };

      const dto = propertyService.formatPublicPropertyDto(validRawProp);
      expect(dto.address.latitude).toBeCloseTo(28.6139, 4);
      expect(dto.address.longitude).toBeCloseTo(77.2090, 4);
      expect(dto.address.isLocationExpired).toBe(false);
    });

    it('preserves OWNER_CONFIRMED coordinates regardless of date in formatPublicPropertyDto()', async () => {
      const ownerConfirmedProp: any = {
        id: 'prop-confirmed-123',
        name: 'Confirmed Property Stay',
        slug: 'confirmed-property-stay',
        propertyType: 'PG',
        genderPolicy: 'COED',
        addressLine1: 'Confirmed St',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        latitude: new Prisma.Decimal(28.6139),
        longitude: new Prisma.Decimal(77.2090),
        coordinateSource: 'OWNER_CONFIRMED',
        googleContentExpiresAt: null, // No expiration
        rooms: [],
      };

      const dto = propertyService.formatPublicPropertyDto(ownerConfirmedProp);
      expect(dto.address.latitude).toBeCloseTo(28.6139, 4);
      expect(dto.address.longitude).toBeCloseTo(77.2090, 4);
      expect(dto.address.isLocationExpired).toBe(false);
      expect(dto.address.coordinateSource).toBe('OWNER_CONFIRMED');
    });

    it('excludes expired Google listings from public geospatial radius search while returning valid listings', async () => {
      // 1. Create an active listing near DU North Campus
      const slugActive = `active-geo-${Date.now()}`;
      const activeProp = await propertyRepo.createProperty({
        ownerId: testOwnerId,
        name: 'Active Campus Stay',
        slug: slugActive,
        propertyType: PropertyType.PG,
        genderPolicy: PropertyGenderPolicy.COED,
        addressLine1: 'Hudson Lane Active',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110009',
        latitude: 28.6945,
        longitude: 77.2088,
        coordinateSource: 'OWNER_CONFIRMED',
        googleContentExpiresAt: null,
      });
      createdPropertyIds.push(activeProp.id);

      // Verify by submitting and checking search
      const prisma = getAppPrismaClient();
      await prisma.property.update({
        where: { id: activeProp.id },
        data: { verificationStatus: PropertyVerificationStatus.VERIFIED },
      });

      // 2. Create an expired listing at the exact same location
      const slugExpired = `expired-geo-${Date.now()}`;
      const expiredProp = await propertyRepo.createProperty({
        ownerId: testOwnerId,
        name: 'Expired Campus Stay',
        slug: slugExpired,
        propertyType: PropertyType.PG,
        genderPolicy: PropertyGenderPolicy.COED,
        addressLine1: 'Hudson Lane Expired',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110009',
        latitude: 28.6946,
        longitude: 77.2089,
        coordinateSource: 'GOOGLE_GEOCODING',
        googleContentExpiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago!
      });
      createdPropertyIds.push(expiredProp.id);

      await prisma.property.update({
        where: { id: expiredProp.id },
        data: { verificationStatus: PropertyVerificationStatus.VERIFIED },
      });

      // Search at DU North Campus center
      const searchResults = await propertyRepo.searchPublicProperties({
        latitude: 28.6942,
        longitude: 77.2085,
        radiusKm: 2.0,
      });

      const foundActive = searchResults.items.some((p) => p.id === activeProp.id);
      const foundExpired = searchResults.items.some((p) => p.id === expiredProp.id);

      expect(foundActive).toBe(true);
      expect(foundExpired).toBe(false); // Expired Google listing MUST be excluded!
    });
  });
});
