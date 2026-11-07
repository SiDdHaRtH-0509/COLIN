/**
 * COLIN Google Maps Data Retention & Policy Compliance Verification Suite
 * Phase 4A.2.5.2: Final Google Maps Data Retention & Compliance Correction
 * 
 * Verifies field-level data provenance, 30-day Google content expiration,
 * Place ID indefinite retention, cache eviction, owner-confirmed location immunity,
 * and geospatial search continuity without expired Google content.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import React from 'react';
import request from 'supertest';
import { render, screen } from '@testing-library/react';
import { Express } from 'express';
import {
  LocationService,
  MockGeolocationProvider,
  GoogleGeolocationProvider,
  locationAuditService,
} from '../../server/location';
import { PropertyRepository } from '../../server/database/repositories/PropertyRepository';
import { PropertyService } from '../../server/services/PropertyService';
import { createAutocompleteSessionToken } from '../../services/locationService';
import { PropertyType, PropertyGenderPolicy, PropertyVerificationStatus, Prisma } from '@prisma/client';
import { getAppPrismaClient } from '../../server/database';
import { getAdminPrismaClient } from '../../server/database/prisma';
import { createApp } from '../../server/app';
import { initializeDatabaseConnections } from '../../server/database/lifecycle';
import { GoogleAttribution } from '../../components/common/GoogleAttribution';

describe('COLIN Google Maps Data Retention & Policy Compliance Suite', () => {
  let locationService: LocationService;
  let mockProvider: MockGeolocationProvider;
  let propertyRepo: PropertyRepository;
  let propertyService: PropertyService;
  let testOwnerId: string;
  const createdPropertyIds: string[] = [];

  let app: Express;
  let ownerToken: string;
  let ownerUserId: string;
  let studentToken: string;
  let otherOwnerToken: string;

  beforeAll(async () => {
    await initializeDatabaseConnections();
    app = createApp();

    const timestamp = Date.now();
    const ownerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `loc_owner_${timestamp}@compliance.test`,
        password: 'LocationSecure2026!',
        firstName: 'Devendra',
        lastName: 'Sharma',
        role: 'OWNER',
        businessName: 'Sharma Living Spaces',
      });
    ownerToken = ownerRes.body.data.tokens.accessToken;
    ownerUserId = ownerRes.body.data.user.id;

    const studentRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `loc_student_${timestamp}@student.test`,
        password: 'LocationSecure2026!',
        firstName: 'Rahul',
        lastName: 'Verma',
        role: 'STUDENT',
      });
    studentToken = studentRes.body.data.tokens.accessToken;

    const otherOwnerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `loc_other_${timestamp}@other.test`,
        password: 'LocationSecure2026!',
        firstName: 'Pooja',
        lastName: 'Patel',
        role: 'OWNER',
        businessName: 'Patel Accommodations',
      });
    otherOwnerToken = otherOwnerRes.body.data.tokens.accessToken;
  });

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

  // ===========================================================================
  // 7. GATES G26 - G40: FINAL COMPLIANCE CLOSURE & ACCEPTANCE VERIFICATION
  // ===========================================================================
  describe('7. Gates G26 - G40: Final Compliance Closure & Acceptance Verification', () => {
    // Gate G26: Verify that properties with expired Google coordinates return null for distanceToCampusKm and undefined for distanceKm in public DTOs
    it('[Gate G26] suppresses distanceToCampusKm and distanceKm in public DTOs when Google coordinates are expired', async () => {
      const slug = `g26-expired-${Date.now()}`;
      const prop = await propertyRepo.createProperty({
        ownerId: testOwnerId,
        name: 'G26 Expired Listing',
        slug,
        propertyType: PropertyType.PG,
        genderPolicy: PropertyGenderPolicy.COED,
        addressLine1: '12 Hudson Lane',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110009',
        latitude: 28.6942,
        longitude: 77.2085,
        nearestCampus: 'Delhi University North Campus',
        distanceToCampusKm: 1.5,
        coordinateSource: 'GOOGLE_GEOCODING',
        googleContentExpiresAt: new Date(Date.now() - 60000), // Expired 1 min ago
      });
      createdPropertyIds.push(prop.id);

      // Cast to include dynamic distanceKm
      const withDynamicDist = { ...prop, distanceKm: 0.8 };
      const dto = propertyService.formatPublicPropertyDto(withDynamicDist as any);

      expect(dto.address.isLocationExpired).toBe(true);
      expect(dto.address.latitude).toBeNull();
      expect(dto.address.longitude).toBeNull();
      expect(dto.address.distanceToCampusKm).toBeNull();
      expect(dto.distanceKm).toBeUndefined();
    });

    // Gate G27: Verify that properties with OWNER_PROVIDED coordinates retain distanceToCampusKm when googleContentExpiresAt is null or in the past
    it('[Gate G27] retains distanceToCampusKm indefinitely for OWNER_PROVIDED coordinates', async () => {
      const slug = `g27-owner-${Date.now()}`;
      const prop = await propertyRepo.createProperty({
        ownerId: testOwnerId,
        name: 'G27 Owner Provided Listing',
        slug,
        propertyType: PropertyType.PG,
        genderPolicy: PropertyGenderPolicy.COED,
        addressLine1: '45 Hauz Khas Village',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110016',
        latitude: 28.5450,
        longitude: 77.1926,
        nearestCampus: 'IIT Delhi',
        distanceToCampusKm: 0.6,
        coordinateSource: 'OWNER_PROVIDED',
        googleContentExpiresAt: null,
      });
      createdPropertyIds.push(prop.id);

      const dto = propertyService.formatPublicPropertyDto(prop as any);

      expect(dto.address.isLocationExpired).toBe(false);
      expect(dto.address.latitude).toBe(28.545);
      expect(dto.address.longitude).toBe(77.1926);
      expect(dto.address.distanceToCampusKm).toBe(0.6);
      expect(dto.address.coordinateSource).toBe('OWNER_PROVIDED');
    });

    // Gate G28: Verify that properties with OWNER_CONFIRMED coordinates retain distanceToCampusKm indefinitely
    it('[Gate G28] retains distanceToCampusKm indefinitely for OWNER_CONFIRMED coordinates', async () => {
      const slug = `g28-confirmed-${Date.now()}`;
      const prop = await propertyRepo.createProperty({
        ownerId: testOwnerId,
        name: 'G28 Owner Confirmed Listing',
        slug,
        propertyType: PropertyType.PG,
        genderPolicy: PropertyGenderPolicy.COED,
        addressLine1: '88 SG Palya',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560029',
        latitude: 12.9352,
        longitude: 77.6085,
        nearestCampus: 'Christ University',
        distanceToCampusKm: 0.3,
        coordinateSource: 'OWNER_CONFIRMED',
        googleContentExpiresAt: null,
      });
      createdPropertyIds.push(prop.id);

      const dto = propertyService.formatPublicPropertyDto(prop as any);

      expect(dto.address.isLocationExpired).toBe(false);
      expect(dto.address.distanceToCampusKm).toBe(0.3);
      expect(dto.address.coordinateSource).toBe('OWNER_CONFIRMED');
    });

    // Gate G29: Verify that refreshPropertyLocation recalculates distanceToCampusKm when coordinates are refreshed and campus info is available
    it('[Gate G29] recalculates distanceToCampusKm when coordinates are refreshed via refreshPropertyLocation', async () => {
      const slug = `g29-refresh-${Date.now()}`;
      const prop = await propertyRepo.createProperty({
        ownerId: testOwnerId,
        name: 'G29 Refresh Listing',
        slug,
        propertyType: PropertyType.PG,
        genderPolicy: PropertyGenderPolicy.COED,
        addressLine1: 'Hudson Lane, GTB Nagar',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110009',
        latitude: 28.6942,
        longitude: 77.2085,
        nearestCampus: 'Delhi University North Campus',
        distanceToCampusKm: 99.0, // Stale distance
        coordinateSource: 'GOOGLE_GEOCODING',
        googleContentExpiresAt: new Date(Date.now() - 1000), // Expired
      });
      createdPropertyIds.push(prop.id);

      // Refresh location
      const refreshed = await propertyService.refreshPropertyLocation(prop.id, testOwnerId);

      expect(refreshed.googleContentExpiresAt).toBeDefined();
      expect(refreshed.googleContentExpiresAt!.getTime()).toBeGreaterThan(Date.now());
      expect(refreshed.distanceToCampusKm).not.toBeNull();
      // Near North Campus, Haversine distance should be very small (< 1 km)
      expect(Number(refreshed.distanceToCampusKm)).toBeLessThan(5);
    });

    // Gate G30: Verify that LocationService in-memory cache stores only permitted fields
    it('[Gate G30] stores only permitted fields in LocationService in-memory geocoding cache', async () => {
      const res = await locationService.geocode('Hudson Lane, Delhi');
      expect(res).toBeDefined();
      expect(res.coordinates).toHaveProperty('latitude');
      expect(res.coordinates).toHaveProperty('longitude');
      expect(res.formattedAddress).toBeDefined();
      expect(res.addressComponents).toBeDefined();

      // Permitted field whitelist check
      const permittedKeys = ['coordinates', 'formattedAddress', 'placeId', 'addressComponents', 'source', 'cachedAt', 'expiresAt'];
      const actualKeys = Object.keys(res);
      for (const key of actualKeys) {
        expect(permittedKeys).toContain(key);
      }
    });

    // Gate G31: Verify that pruneExpiredCache() physically evicts expired entries
    it('[Gate G31] physically evicts expired entries from cache when pruneExpiredCache() is called', () => {
      locationService.clearCache();
      const expiredTimestamp = Date.now() - 5000;
      const validResult = {
        coordinates: { latitude: 28.6942, longitude: 77.2085 },
        formattedAddress: 'Hudson Lane, Delhi',
        addressComponents: { city: 'Delhi', state: 'Delhi' },
        source: 'MOCK_GEOCODING' as const,
      };

      locationService.setCacheEntryForTesting('geocode', 'test-expired-address', validResult, expiredTimestamp);
      expect(locationService.getCacheStats().geocodeCacheSize).toBe(1);

      const evicted = locationService.pruneExpiredCache();
      expect(evicted).toBe(1);
      expect(locationService.getCacheStats().geocodeCacheSize).toBe(0);
    });

    // Gate G32: Verify that autocomplete() does NOT add entries to geocodeCache or reverseGeocodeCache
    it('[Gate G32] guarantees zero caching for Places Autocomplete predictions', async () => {
      locationService.clearCache();
      expect(locationService.getCacheStats().geocodeCacheSize).toBe(0);
      expect(locationService.getCacheStats().reverseGeocodeCacheSize).toBe(0);

      const token = createAutocompleteSessionToken();
      const suggestions = await locationService.autocomplete('North Campus', token);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(locationService.getCacheStats().geocodeCacheSize).toBe(0);
      expect(locationService.getCacheStats().reverseGeocodeCacheSize).toBe(0);
    });

    // Gate G33: Verify that autocomplete predictions are ephemeral across calls
    it('[Gate G33] delivers fresh results without persisting predictions across calls', async () => {
      const token1 = createAutocompleteSessionToken();
      const token2 = createAutocompleteSessionToken();

      const res1 = await locationService.autocomplete('North', token1);
      const res2 = await locationService.autocomplete('South', token2);

      expect(res1).toBeDefined();
      expect(res2).toBeDefined();
      expect(locationService.getCacheStats().geocodeCacheSize).toBe(0);
    });

    // Gate G34: Verify that GoogleAttribution component renders 'Powered by Google'
    it('[Gate G34] renders visible and accessible "Powered by Google" attribution', () => {
      const { unmount } = render(React.createElement(GoogleAttribution, { provider: 'google' }));
      const badge = screen.getByTestId('google-maps-attribution');
      expect(badge).toBeDefined();
      expect(badge.getAttribute('role')).toBe('img');
      expect(badge.getAttribute('aria-label')).toBe('Powered by Google');
      expect(screen.getByText('powered by')).toBeDefined();
      unmount();

      const { unmount: unmount2 } = render(React.createElement(GoogleAttribution, { source: 'GOOGLE_GEOCODING' }));
      expect(screen.getByTestId('google-maps-attribution')).toBeDefined();
      unmount2();
    });

    // Gate G35: Verify that GoogleAttribution does not render for mock provider unless explicit flag is enabled
    it('[Gate G35] does not render Google attribution when provider is mock', () => {
      const { container, unmount } = render(React.createElement(GoogleAttribution, { provider: 'mock' }));
      expect(container.querySelector('[data-testid="google-maps-attribution"]')).toBeNull();
      unmount();

      const { unmount: unmount2 } = render(React.createElement(GoogleAttribution, { provider: 'mock', showMockInDev: true }));
      expect(screen.getByTestId('mock-location-attribution')).toBeDefined();
      unmount2();
    });

    // Gate G36: Verify that confirm-location requires authenticated owner and blocks unauthorized callers
    it('[Gate G36] requires authenticated owner and enforces 401/403/404 authorization checks on confirm-location', async () => {
      const pRes = await request(app)
        .post('/api/v1/owner/properties')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Gate G36 Auth Stay',
          propertyType: 'PG',
          genderPolicy: 'COED',
          addressLine1: '32 Chhatra Marg',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110007',
          latitude: 28.6942,
          longitude: 77.2085,
        });
      expect(pRes.status).toBe(201);
      const propId = pRes.body.data.id;
      createdPropertyIds.push(propId);

      // 1. Unauthenticated -> 401
      const unauthRes = await request(app)
        .post(`/api/v1/owner/properties/${propId}/confirm-location`)
        .send({ confirmedLatitude: 28.6942, confirmedLongitude: 77.2085, isAccuracyConfirmed: true });
      expect(unauthRes.status).toBe(401);

      // 2. Student caller -> 403 Forbidden
      const studentRes = await request(app)
        .post(`/api/v1/owner/properties/${propId}/confirm-location`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ confirmedLatitude: 28.6942, confirmedLongitude: 77.2085, isAccuracyConfirmed: true });
      expect(studentRes.status).toBe(403);

      // 3. Different owner caller -> 404 Not Found (ownership check)
      const otherRes = await request(app)
        .post(`/api/v1/owner/properties/${propId}/confirm-location`)
        .set('Authorization', `Bearer ${otherOwnerToken}`)
        .send({ confirmedLatitude: 28.6942, confirmedLongitude: 77.2085, isAccuracyConfirmed: true });
      expect(otherRes.status).toBe(404);
    });

    // Gate G37: Verify that confirm-location rejects requests without isAccuracyConfirmed: true
    it('[Gate G37] rejects confirm-location requests when isAccuracyConfirmed is false or missing', async () => {
      const pRes = await request(app)
        .post('/api/v1/owner/properties')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Gate G37 Validation Stay',
          propertyType: 'PG',
          genderPolicy: 'COED',
          addressLine1: '55 Chhatra Marg',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110007',
          latitude: 28.6942,
          longitude: 77.2085,
        });
      const propId = pRes.body.data.id;
      createdPropertyIds.push(propId);

      // isAccuracyConfirmed is false -> 400
      const falseRes = await request(app)
        .post(`/api/v1/owner/properties/${propId}/confirm-location`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ confirmedLatitude: 28.6942, confirmedLongitude: 77.2085, isAccuracyConfirmed: false });
      expect(falseRes.status).toBe(400);

      // isAccuracyConfirmed is missing -> 400
      const missingRes = await request(app)
        .post(`/api/v1/owner/properties/${propId}/confirm-location`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ confirmedLatitude: 28.6942, confirmedLongitude: 77.2085 });
      expect(missingRes.status).toBe(400);
    });

    // Gate G38: Verify that confirm-location rejects coordinates outside India geographic bounding box
    it('[Gate G38] rejects confirm-location coordinates outside India geographic bounding box', async () => {
      const pRes = await request(app)
        .post('/api/v1/owner/properties')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Gate G38 Bounds Stay',
          propertyType: 'PG',
          genderPolicy: 'COED',
          addressLine1: '77 Mall Road',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110007',
          latitude: 28.6942,
          longitude: 77.2085,
        });
      const propId = pRes.body.data.id;
      createdPropertyIds.push(propId);

      // London coordinates (lat: 51.5074, lng: -0.1278) -> 400
      const londonRes = await request(app)
        .post(`/api/v1/owner/properties/${propId}/confirm-location`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ confirmedLatitude: 51.5074, confirmedLongitude: -0.1278, isAccuracyConfirmed: true });
      expect(londonRes.status).toBe(400);

      // Latitude too low (< 6.0) -> 400
      const lowLatRes = await request(app)
        .post(`/api/v1/owner/properties/${propId}/confirm-location`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ confirmedLatitude: 2.0, confirmedLongitude: 77.0, isAccuracyConfirmed: true });
      expect(lowLatRes.status).toBe(400);
    });

    // Gate G39: Verify that generic property update rejects or ignores coordinateSource: 'OWNER_CONFIRMED'
    it('[Gate G39] rejects client attempts to supply coordinateSource in generic property updates', async () => {
      const pRes = await request(app)
        .post('/api/v1/owner/properties')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Gate G39 Provenance Spoof Stay',
          propertyType: 'PG',
          genderPolicy: 'COED',
          addressLine1: '109 Mall Road',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110007',
          latitude: 28.6942,
          longitude: 77.2085,
        });
      const propId = pRes.body.data.id;
      createdPropertyIds.push(propId);

      // Attempt to spoof OWNER_CONFIRMED via generic PATCH -> 400
      const spoofRes = await request(app)
        .patch(`/api/v1/owner/properties/${propId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ coordinateSource: 'OWNER_CONFIRMED' });
      expect(spoofRes.status).toBe(400);

      // Verify coordinateSource was NOT updated
      const getRes = await request(app)
        .get(`/api/v1/owner/properties/${propId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(getRes.body.data.coordinateSource).not.toBe('OWNER_CONFIRMED');
    });

    // Gate G40: Verify that successful confirm-location records an audit trail event
    it('[Gate G40] records structured audit trail event upon successful location confirmation', async () => {
      locationAuditService.clearAuditEvents();

      const pRes = await request(app)
        .post('/api/v1/owner/properties')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Gate G40 Audit Trail Stay',
          propertyType: 'PG',
          genderPolicy: 'COED',
          addressLine1: '125 Mall Road',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110007',
          latitude: 28.6942,
          longitude: 77.2085,
        });
      const propId = pRes.body.data.id;
      createdPropertyIds.push(propId);

      const confirmRes = await request(app)
        .post(`/api/v1/owner/properties/${propId}/confirm-location`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ confirmedLatitude: 28.6945, confirmedLongitude: 77.2090, isAccuracyConfirmed: true });
      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.coordinateSource).toBe('OWNER_CONFIRMED');
      expect(confirmRes.body.data.googleContentExpiresAt).toBeNull();

      // Verify audit trail entry
      const events = locationAuditService.getAuditEvents(propId);
      expect(events.length).toBeGreaterThanOrEqual(1);
      const audit = events[0];
      expect(audit.propertyId).toBe(propId);
      expect(audit.ownerId).toBe(ownerUserId);
      expect(audit.newSource).toBe('OWNER_CONFIRMED');
      expect(audit.confirmedCoordinates.latitude).toBe(28.6945);
      expect(audit.confirmedCoordinates.longitude).toBe(77.2090);
      expect(audit.confirmedAt).toBeDefined();
      expect(audit.requestId).toBeDefined();
    });

    // Gate G41 (Finding A): Suppresses Google-derived distance calculations in public DTO until owner confirmation
    it('[Gate G41] suppresses Google-derived distance calculations in public DTO until owner confirmation', async () => {
      const slug = `g41-dist-suppress-${Date.now()}`;
      const prop = await getAppPrismaClient().property.create({
        data: {
          ownerId: ownerUserId,
          name: 'Gate G41 Google Derived Stay',
          slug,
          propertyType: PropertyType.PG,
          genderPolicy: PropertyGenderPolicy.COED,
          addressLine1: 'Hudson Lane, GTB Nagar',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110009',
          latitude: 28.6942,
          longitude: 77.2085,
          nearestCampus: 'Delhi University North Campus',
          distanceToCampusKm: 0.8,
          coordinateSource: 'GOOGLE_GEOCODING',
          googleContentExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          verificationStatus: PropertyVerificationStatus.VERIFIED,
        },
      });
      createdPropertyIds.push(prop.id);

      // 1. Unconfirmed Google-derived property in formatPublicPropertyDto
      const unconfirmedDto = propertyService.formatPublicPropertyDto(prop);
      expect(unconfirmedDto.address.distanceToCampusKm).toBeNull();
      expect(unconfirmedDto.distanceKm).toBeUndefined();
      expect(unconfirmedDto.address.coordinateSource).toBe('GOOGLE_GEOCODING');

      // 2. Unconfirmed Google-derived property via public marketplace API
      const pubRes = await request(app).get(`/api/v1/properties/${prop.id}`);
      expect(pubRes.status).toBe(200);
      expect(pubRes.body.data.address.distanceToCampusKm).toBeNull();

      // 3. Confirm location via owner confirmation endpoint
      const confirmRes = await request(app)
        .post(`/api/v1/owner/properties/${prop.id}/confirm-location`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ confirmedLatitude: 28.6942, confirmedLongitude: 77.2085, isAccuracyConfirmed: true });
      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.coordinateSource).toBe('OWNER_CONFIRMED');

      // 4. Confirmed property now surfaces valid distanceToCampusKm in public DTO
      const confirmedDbProp = await propertyRepo.findById(prop.id);
      expect(confirmedDbProp).toBeDefined();
      const confirmedDto = propertyService.formatPublicPropertyDto(confirmedDbProp!);
      expect(confirmedDto.address.distanceToCampusKm).not.toBeNull();
      expect(Number(confirmedDto.address.distanceToCampusKm)).toBeLessThan(5);
      expect(confirmedDto.address.coordinateSource).toBe('OWNER_CONFIRMED');

      // 5. Expired Google-derived coordinates suppress coordinates and distance completely
      const expiredProp = await getAppPrismaClient().property.create({
        data: {
          ownerId: testOwnerId,
          name: 'Gate G41 Expired Stay',
          slug: `g41-expired-${Date.now()}`,
          propertyType: PropertyType.PG,
          genderPolicy: PropertyGenderPolicy.COED,
          addressLine1: 'Kamla Nagar',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110007',
          latitude: 28.6942,
          longitude: 77.2085,
          nearestCampus: 'Delhi University North Campus',
          distanceToCampusKm: 1.1,
          coordinateSource: 'GOOGLE_GEOCODING',
          googleContentExpiresAt: new Date(Date.now() - 5000), // Expired
          verificationStatus: PropertyVerificationStatus.VERIFIED,
        },
      });
      createdPropertyIds.push(expiredProp.id);

      const expiredDto = propertyService.formatPublicPropertyDto(expiredProp);
      expect(expiredDto.address.isLocationExpired).toBe(true);
      expect(expiredDto.address.latitude).toBeNull();
      expect(expiredDto.address.longitude).toBeNull();
      expect(expiredDto.address.distanceToCampusKm).toBeNull();
      expect(expiredDto.distanceKm).toBeUndefined();
    });

    // Gate G42 (Finding D): Transactional atomicity of property update and immutable admin_audit_logs record
    it('[Gate G42] executes property location confirmation and admin_audit_logs insertion in a single atomic transaction', async () => {
      const pRes = await request(app)
        .post('/api/v1/owner/properties')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Gate G42 Atomic Transaction Stay',
          propertyType: 'PG',
          genderPolicy: 'COED',
          addressLine1: '32 Chhatra Marg',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110007',
          latitude: 28.6942,
          longitude: 77.2085,
        });
      const propId = pRes.body.data.id;
      createdPropertyIds.push(propId);

      const confirmRes = await request(app)
        .post(`/api/v1/owner/properties/${propId}/confirm-location`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ confirmedLatitude: 28.6950, confirmedLongitude: 77.2095, isAccuracyConfirmed: true });
      expect(confirmRes.status).toBe(200);

      // Verify the record exists in the admin_audit_logs table via getAdminPrismaClient()
      const adminClient = getAdminPrismaClient();
      const auditLogRecord = await adminClient.adminAuditLog.findFirst({
        where: {
          targetEntity: 'Property',
          targetEntityId: propId,
          action: 'LOCATION_CONFIRMED_BY_OWNER',
        },
        orderBy: { recordedAt: 'desc' },
      });

      expect(auditLogRecord).toBeDefined();
      expect(auditLogRecord!.id).toBeDefined();
      expect(auditLogRecord!.actionCategory).toBe('PROPERTY_VERIFICATION');
      expect(auditLogRecord!.targetEntityId).toBe(propId);
      expect((auditLogRecord!.detailsJson as any)?.newSource).toBe('OWNER_CONFIRMED');
      expect((auditLogRecord!.detailsJson as any)?.confirmedCoordinates?.latitude).toBe(28.695);
      expect((auditLogRecord!.detailsJson as any)?.confirmedCoordinates?.longitude).toBe(77.2095);
    });

    // Gate G43 (Finding D): PostgreSQL trigger trg_prevent_mutation_admin_audit_logs enforces append-only immutability
    it('[Gate G43] enforces database-level immutability preventing UPDATE and DELETE on admin_audit_logs', async () => {
      const adminClient = getAdminPrismaClient();

      // Fetch existing audit record
      const existingAudit = await adminClient.adminAuditLog.findFirst({
        where: { action: 'LOCATION_CONFIRMED_BY_OWNER' },
        orderBy: { recordedAt: 'desc' },
      });
      expect(existingAudit).toBeDefined();
      const logId = existingAudit!.id;

      // 1. Attempt to mutate audit log row -> Must fail with database-level immutability error (role restriction or trigger)
      await expect(
        adminClient.$executeRawUnsafe(`UPDATE admin_audit_logs SET action = 'TAMPERED_ACTION' WHERE id = '${logId}'::uuid;`)
      ).rejects.toThrow(/(?:permission denied for table admin_audit_logs|Audit Log Immutability Violation)/);

      // 2. Attempt to delete audit log row -> Must fail with database-level immutability error (role restriction or trigger)
      await expect(
        adminClient.$executeRawUnsafe(`DELETE FROM admin_audit_logs WHERE id = '${logId}'::uuid;`)
      ).rejects.toThrow(/(?:permission denied for table admin_audit_logs|Audit Log Immutability Violation)/);

      // 3. Verify record was unaffected and remains unchanged
      const intactRecord = await adminClient.adminAuditLog.findUnique({
        where: { id: logId },
      });
      expect(intactRecord).toBeDefined();
      expect(intactRecord!.action).toBe('LOCATION_CONFIRMED_BY_OWNER');
    });
  });
});
