/**
 * COLIN Geospatial Search & Discovery Integration Test Suite
 * Phase 4A.2.5.2: Google Maps & Geolocation Infrastructure
 * 
 * Verifies live PostgreSQL 18.4 geospatial queries, radius filtering,
 * distance sorting, bounding-box optimization, and location API endpoints.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { PropertyType, PropertyGenderPolicy, PropertyVerificationStatus } from '@prisma/client';
import { createApp } from '../../server/app';
import { initializeDatabaseConnections, shutdownDatabaseConnections } from '../../server/database/lifecycle';
import { getAppPrismaClient } from '../../server/database/prisma';

describe('COLIN Phase 4A.2.5.2: Geospatial Search & Discovery Integration Suite', () => {
  let app: Express;
  const appPrisma = getAppPrismaClient();

  const timestamp = Date.now();
  const ownerEmail = `geo_owner_${timestamp}@campus.test`;
  const defaultPassword = 'GeoLocationSecure2026!';

  let ownerToken = '';
  let northCampusPropId = '';
  let southCampusPropId = '';
  let bangalorePropId = '';
  let draftPropId = '';

  beforeAll(async () => {
    await initializeDatabaseConnections();
    app = createApp();

    // 1. Register Owner
    const ownerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: ownerEmail,
        password: defaultPassword,
        firstName: 'Anand',
        lastName: 'Bansal',
        role: 'OWNER',
        businessName: 'Bansal Student Living',
      });
    expect(ownerRes.status).toBe(201);
    ownerToken = ownerRes.body.data.tokens.accessToken;

    // 2. Create Property 1: DU North Campus (Lat: 28.6942, Lng: 77.2085)
    const p1Res = await request(app)
      .post('/api/v1/owner/properties')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: `Bansal Residency North Campus ${timestamp}`,
        propertyType: PropertyType.PG,
        genderPolicy: PropertyGenderPolicy.BOYS_ONLY,
        addressLine1: '42 Hudson Lane, GTB Nagar',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110009',
        latitude: 28.6942,
        longitude: 77.2085,
        nearestCampus: 'Delhi University North Campus',
        totalRooms: 10,
        totalBeds: 20,
        availableBeds: 10,
      });
    expect(p1Res.status).toBe(201);
    northCampusPropId = p1Res.body.data.id;

    // 3. Create Property 2: DU South Campus (~12.5 km away, Lat: 28.5862, Lng: 77.1685)
    const p2Res = await request(app)
      .post('/api/v1/owner/properties')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: `Bansal Haven South Campus ${timestamp}`,
        propertyType: PropertyType.HOSTEL,
        genderPolicy: PropertyGenderPolicy.GIRLS_ONLY,
        addressLine1: '12 Satya Niketan',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110021',
        latitude: 28.5862,
        longitude: 77.1685,
        nearestCampus: 'DU South Campus',
        totalRooms: 12,
        totalBeds: 24,
        availableBeds: 8,
      });
    expect(p2Res.status).toBe(201);
    southCampusPropId = p2Res.body.data.id;

    // 4. Create Property 3: Bangalore (~1740 km away, Lat: 12.9352, Lng: 77.6085)
    const p3Res = await request(app)
      .post('/api/v1/owner/properties')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: `Bansal Luxury CoLiving Bangalore ${timestamp}`,
        propertyType: PropertyType.COLIVING,
        genderPolicy: PropertyGenderPolicy.COED,
        addressLine1: '88 SG Palya, Koramangala',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560029',
        latitude: 12.9352,
        longitude: 77.6085,
        nearestCampus: 'Christ University',
        totalRooms: 15,
        totalBeds: 30,
        availableBeds: 15,
      });
    expect(p3Res.status).toBe(201);
    bangalorePropId = p3Res.body.data.id;

    // 5. Create Property 4: Draft listing near North Campus (must NOT appear in public discovery)
    const p4Res = await request(app)
      .post('/api/v1/owner/properties')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: `Bansal Draft Stay ${timestamp}`,
        propertyType: PropertyType.PG,
        genderPolicy: PropertyGenderPolicy.COED,
        addressLine1: '45 Hudson Lane',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110009',
        latitude: 28.6945,
        longitude: 77.2088,
      });
    expect(p4Res.status).toBe(201);
    draftPropId = p4Res.body.data.id;

    // Directly mark Properties 1, 2, and 3 as VERIFIED for public discovery testing
    await appPrisma.property.updateMany({
      where: { id: { in: [northCampusPropId, southCampusPropId, bangalorePropId] } },
      data: { verificationStatus: PropertyVerificationStatus.VERIFIED },
    });
  });

  afterAll(async () => {
    try {
      const allIds = [northCampusPropId, southCampusPropId, bangalorePropId, draftPropId].filter(Boolean);
      if (allIds.length > 0) {
        await appPrisma.property.deleteMany({ where: { id: { in: allIds } } });
      }
      await appPrisma.user.deleteMany({ where: { email: ownerEmail } });
    } catch {
      // Ignore teardown errors
    } finally {
      await shutdownDatabaseConnections();
    }
  });

  describe('1. Location API Endpoints', () => {
    it('GET /api/v1/location/autocomplete returns place suggestions', async () => {
      const res = await request(app).get('/api/v1/location/autocomplete?query=Campus');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/location/places/:placeId returns place details', async () => {
      const res = await request(app).get('/api/v1/location/places/hub-delhi-north-campus');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toContain('Delhi University North Campus');
      expect(res.body.data.coordinates.latitude).toBeCloseTo(28.6942, 3);
    });

    it('POST /api/v1/location/geocode returns coordinates for address', async () => {
      const res = await request(app)
        .post('/api/v1/location/geocode')
        .send({ address: 'Hudson Lane, Delhi' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.coordinates.latitude).toBeDefined();
      expect(res.body.data.coordinates.longitude).toBeDefined();
    });

    it('POST /api/v1/location/reverse-geocode returns address for coordinates', async () => {
      const res = await request(app)
        .post('/api/v1/location/reverse-geocode')
        .send({ latitude: 28.6942, longitude: 77.2085 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.formattedAddress).toContain('Delhi');
    });

    it('GET /api/v1/location/campuses returns curated campus list', async () => {
      const res = await request(app).get('/api/v1/location/campuses');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('2. Public Geospatial Radius Discovery', () => {
    it('discovers only properties within 5 km of North Campus', async () => {
      // Centered at North Campus (28.6942, 77.2085) with 5 km radius
      const res = await request(app)
        .get('/api/v1/properties?latitude=28.6942&longitude=77.2085&radiusKm=5');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const items = res.body.data;
      const ids = items.map((p: any) => p.id);

      // North Campus property MUST be included
      expect(ids).toContain(northCampusPropId);

      // Distance should be ~0 km
      const northProp = items.find((p: any) => p.id === northCampusPropId);
      expect(northProp.distanceKm).toBeDefined();
      expect(northProp.distanceKm).toBeLessThan(1.0);

      // South Campus (12.5 km away) and Bangalore MUST NOT be included
      expect(ids).not.toContain(southCampusPropId);
      expect(ids).not.toContain(bangalorePropId);

      // Unverified/Draft property MUST NOT be included
      expect(ids).not.toContain(draftPropId);
    });

    it('discovers both North and South campus properties when radius is expanded to 20 km', async () => {
      const res = await request(app)
        .get('/api/v1/properties?latitude=28.6942&longitude=77.2085&radiusKm=20');

      expect(res.status).toBe(200);
      const items = res.body.data;
      const ids = items.map((p: any) => p.id);

      expect(ids).toContain(northCampusPropId);
      expect(ids).toContain(southCampusPropId);
      expect(ids).not.toContain(bangalorePropId);
    });

    it('sorts properties by distance in ascending order when sortBy=distance', async () => {
      const res = await request(app)
        .get('/api/v1/properties?latitude=28.6942&longitude=77.2085&radiusKm=25&sortBy=distance');

      expect(res.status).toBe(200);
      const items = res.body.data;

      const northIndex = items.findIndex((p: any) => p.id === northCampusPropId);
      const southIndex = items.findIndex((p: any) => p.id === southCampusPropId);

      expect(northIndex).toBeGreaterThanOrEqual(0);
      expect(southIndex).toBeGreaterThanOrEqual(0);
      expect(northIndex).toBeLessThan(southIndex); // North Campus (~0 km) comes before South Campus (~12.5 km)
    });
  });

  describe('3. Adversarial & Security Validations', () => {
    it('rejects out-of-bounds latitude (>90) with HTTP 400', async () => {
      const res = await request(app)
        .get('/api/v1/properties?latitude=95.0&longitude=77.2085&radiusKm=10');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects excessive radius (>100 km) with HTTP 400', async () => {
      const res = await request(app)
        .get('/api/v1/properties?latitude=28.6942&longitude=77.2085&radiusKm=350');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects sortBy=distance when coordinates are not provided', async () => {
      const res = await request(app)
        .get('/api/v1/properties?sortBy=distance');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('never leaks owner email or phone number in public discovery results', async () => {
      const res = await request(app)
        .get('/api/v1/properties?latitude=28.6942&longitude=77.2085&radiusKm=5');

      expect(res.status).toBe(200);
      const jsonStr = JSON.stringify(res.body);

      expect(jsonStr).not.toContain(ownerEmail);
      expect(jsonStr).not.toContain('ownerContact');
      expect(jsonStr).not.toContain('phone');
    });
  });
});
