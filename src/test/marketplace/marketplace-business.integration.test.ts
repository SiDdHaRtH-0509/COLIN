/**
 * COLIN Marketplace Business Integration Test Suite
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 * 
 * Verifies live PostgreSQL 18.4 transactions, student/owner profile APIs,
 * property creation, photo gallery lifecycle, admin moderation, and public discovery.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { PropertyType, PropertyGenderPolicy, RoomType, AdminAccountStatus } from '@prisma/client';
import { createApp } from '../../server/app';
import { initializeDatabaseConnections, shutdownDatabaseConnections } from '../../server/database/lifecycle';
import { getAppPrismaClient, getAdminPrismaClient } from '../../server/database/prisma';
import { PasswordService } from '../../server/auth/password.service';

describe('COLIN Phase 4A.2.4: Marketplace Business Integration Suite', () => {
  let app: Express;
  const appPrisma = getAppPrismaClient();
  const adminPrisma = getAdminPrismaClient();

  const timestamp = Date.now();
  const studentEmail = `mkt_student_${timestamp}@campus.test`;
  const ownerEmail = `mkt_owner_${timestamp}@owner.test`;
  const adminEmail = `mkt_admin_${timestamp}@admin.colin.in`;
  const defaultPassword = 'MarketplacePass2026!';

  let studentUserId = '';
  let studentToken = '';

  let ownerUserId = '';
  let ownerToken = '';

  let adminAccountId = '';
  let adminToken = '';

  let testPropertyId = '';
  let testPhotoId = '';

  beforeAll(async () => {
    await initializeDatabaseConnections();
    app = createApp();

    // 1. Register Student
    const studentRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: studentEmail,
        password: defaultPassword,
        firstName: 'Marketplace',
        lastName: 'Student',
        role: 'STUDENT',
        collegeName: 'IIT Delhi',
      });
    expect(studentRes.status).toBe(201);
    studentUserId = studentRes.body.data.user.id;
    studentToken = studentRes.body.data.tokens.accessToken;

    // 2. Register Owner
    const ownerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: ownerEmail,
        password: defaultPassword,
        firstName: 'Marketplace',
        lastName: 'Owner',
        role: 'OWNER',
        businessName: 'Shivaji Stays & Hostels',
      });
    expect(ownerRes.status).toBe(201);
    ownerUserId = ownerRes.body.data.user.id;
    ownerToken = ownerRes.body.data.tokens.accessToken;

    // 3. Register / Seed Admin
    const adminPasswordHash = await PasswordService.hashPassword(defaultPassword);
    const superAdminRole = await adminPrisma.adminRole.findUnique({
      where: { code: 'SUPER_ADMIN' },
    });

    const admin = await adminPrisma.adminAccount.create({
      data: {
        username: `mkt_admin_${timestamp}`,
        email: adminEmail,
        fullName: 'Marketplace Reviewer',
        passwordHash: adminPasswordHash,
        status: AdminAccountStatus.ACTIVE,
        ...(superAdminRole
          ? {
              userRoles: {
                create: {
                  roleId: superAdminRole.id,
                },
              },
            }
          : {}),
      },
    });
    adminAccountId = admin.id;

    // Login as Admin to get genuine admin session & token
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({
        identifier: adminEmail,
        password: defaultPassword,
      });
    expect(adminLoginRes.status).toBe(200);
    adminToken = adminLoginRes.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    // Cleanup created records by marking inactive/suspended
    try {
      if (adminAccountId) {
        await adminPrisma.adminAccount.update({
          where: { id: adminAccountId },
          data: { status: AdminAccountStatus.SUSPENDED },
        }).catch(() => {});
      }
      if (studentUserId) {
        await appPrisma.user.update({
          where: { id: studentUserId },
          data: { status: 'SUSPENDED' },
        }).catch(() => {});
      }
      if (ownerUserId) {
        await appPrisma.user.update({
          where: { id: ownerUserId },
          data: { status: 'SUSPENDED' },
        }).catch(() => {});
      }
    } catch {
      // Ignored
    }
    await shutdownDatabaseConnections();
  });

  // ===========================================================================
  // MODULE 1: STUDENT PROFILE MANAGEMENT
  // ===========================================================================
  describe('1. Student Profile APIs', () => {
    it('retrieves own student profile (GET /api/v1/students/me)', async () => {
      const res = await request(app)
        .get('/api/v1/students/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(studentEmail);
      expect(res.body.data.collegeName).toBe('IIT Delhi');
    });

    it('updates student personal info and preferences (PATCH /api/v1/students/me)', async () => {
      const res = await request(app)
        .patch('/api/v1/students/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          firstName: 'Aarav',
          lastName: 'Mehta',
          course: 'B.Tech Mechanical',
          batchYear: 2027,
          preferences: {
            preferredLocation: 'Hauz Khas',
            maxBudget: 18000,
            preferredRoomType: RoomType.SINGLE,
            foodPreference: 'Vegetarian',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.firstName).toBe('Aarav');
      expect(res.body.data.course).toBe('B.Tech Mechanical');
      expect(res.body.data.preferences.preferredLocation).toBe('Hauz Khas');
      expect(res.body.data.preferences.maxBudget).toBe(18000);
    });

    it('retrieves student profile completion status (GET /api/v1/students/me/completion)', async () => {
      const res = await request(app)
        .get('/api/v1/students/me/completion')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.completionPercentage).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.completedFields)).toBe(true);
    });
  });

  // ===========================================================================
  // MODULE 2: OWNER PROFILE MANAGEMENT
  // ===========================================================================
  describe('2. Owner Profile APIs', () => {
    it('retrieves own owner profile (GET /api/v1/owners/me)', async () => {
      const res = await request(app)
        .get('/api/v1/owners/me')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(ownerEmail);
      expect(res.body.data.businessName).toBe('Shivaji Stays & Hostels');
    });

    it('updates owner business profile (PATCH /api/v1/owners/me)', async () => {
      const res = await request(app)
        .patch('/api/v1/owners/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          businessName: 'Shivaji Premium Student Living LLP',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.businessName).toBe('Shivaji Premium Student Living LLP');
    });

    it('retrieves owner listing statistics (GET /api/v1/owners/me/dashboard-summary)', async () => {
      const res = await request(app)
        .get('/api/v1/owners/me/dashboard-summary')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.ownerId).toBe(ownerUserId);
      expect(res.body.data.totalProperties).toBe(0);
    });
  });

  // ===========================================================================
  // MODULE 3: PROPERTY LIFECYCLE & MANAGEMENT
  // ===========================================================================
  describe('3. Property Creation & Management', () => {
    it('creates a new property in DRAFT status (POST /api/v1/owner/properties)', async () => {
      const res = await request(app)
        .post('/api/v1/owner/properties')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Shivaji Boys Residency',
          propertyType: PropertyType.HOSTEL,
          genderPolicy: PropertyGenderPolicy.BOYS_ONLY,
          addressLine1: 'Building 14, Jia Sarai',
          landmark: 'Opposite IIT Delhi Main Gate',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110016',
          nearestCampus: 'IIT Delhi',
          distanceToCampusKm: 0.4,
          description: 'Spacious student hostel with high speed fiber internet, mess, and study hall',
          totalRooms: 15,
          totalBeds: 30,
          availableBeds: 12,
          amenities: [
            { amenityCode: 'WIFI', name: 'High-Speed Wi-Fi' },
            { amenityCode: 'FOOD', name: '3 Meals Included' },
            { amenityCode: 'POWER_BACKUP', name: '24/7 Power Backup' },
          ],
          rules: [
            { ruleText: 'Gates lock at 10:30 PM', displayOrder: 1 },
            { ruleText: 'Strictly non-smoking campus', displayOrder: 2 },
          ],
          initialRoom: {
            roomNumber: '101',
            roomType: RoomType.DOUBLE_SHARING,
            baseMonthlyRent: 11500,
            securityDeposit: 23000,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.verificationStatus).toBe('DRAFT');
      expect(res.body.data.slug).toContain('shivaji-boys-residency');
      testPropertyId = res.body.data.id;
    });

    it('lists owner properties with pagination (GET /api/v1/owner/properties)', async () => {
      const res = await request(app)
        .get('/api/v1/owner/properties')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.some((p: { id: string }) => p.id === testPropertyId)).toBe(true);
    });

    it('retrieves detailed owner property (GET /api/v1/owner/properties/:id)', async () => {
      const res = await request(app)
        .get(`/api/v1/owner/properties/${testPropertyId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(testPropertyId);
      expect(res.body.data.amenities.length).toBe(3);
      expect(res.body.data.rules.length).toBe(2);
      expect(res.body.data.rooms.length).toBe(1);
    });

    it('updates owner property details (PATCH /api/v1/owner/properties/:id)', async () => {
      const res = await request(app)
        .patch(`/api/v1/owner/properties/${testPropertyId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          description: 'Updated: Ultra-fast fiber internet and newly renovated dining hall',
          availableBeds: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.availableBeds).toBe(10);
    });
  });

  // ===========================================================================
  // MODULE 4: PROPERTY PHOTO LIFECYCLE (MAX 8 RULE)
  // ===========================================================================
  describe('4. Property Image Management', () => {
    it('attaches cover photo to property (POST /api/v1/owner/properties/:id/photos)', async () => {
      const res = await request(app)
        .post(`/api/v1/owner/properties/${testPropertyId}/photos`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          photoStorageUrl: 'https://storage.colin.in/properties/shivaji-1.jpg',
          caption: 'Building facade and security gate',
          displayOrder: 1,
          isCover: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isCover).toBe(true);
      testPhotoId = res.body.data.id;
    });

    it('attaches 7 more photos up to maximum 8 limit', async () => {
      for (let i = 2; i <= 8; i++) {
        const res = await request(app)
          .post(`/api/v1/owner/properties/${testPropertyId}/photos`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            photoStorageUrl: `https://storage.colin.in/properties/shivaji-${i}.jpg`,
            caption: `Room angle ${i}`,
            displayOrder: i,
          });
        expect(res.status).toBe(201);
      }
    });

    it('rejects 9th photo insertion (violates max 8 rule)', async () => {
      const res = await request(app)
        .post(`/api/v1/owner/properties/${testPropertyId}/photos`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          photoStorageUrl: 'https://storage.colin.in/properties/shivaji-9.jpg',
          caption: 'Attempting 9th photo',
          displayOrder: 9,
        });

      expect([400, 422]).toContain(res.status);
      expect(res.body.error.message).toContain('maximum of 8 photos');
    });

    it('reorders property photos (PUT /api/v1/owner/properties/:id/photos/reorder)', async () => {
      const res = await request(app)
        .put(`/api/v1/owner/properties/${testPropertyId}/photos/reorder`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          orders: [
            { photoId: testPhotoId, displayOrder: 2 },
          ],
        });

      expect(res.status).toBe(200);
    });

    it('designates a new cover photo (PUT /api/v1/owner/properties/:id/photos/:photoId/cover)', async () => {
      const res = await request(app)
        .put(`/api/v1/owner/properties/${testPropertyId}/photos/${testPhotoId}/cover`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isCover).toBe(true);
    });
  });

  // ===========================================================================
  // MODULE 5: PROPERTY SUBMISSION & ADMIN MODERATION WORKFLOW
  // ===========================================================================
  describe('5. Property Submission & Admin Moderation', () => {
    it('submits property for verification (POST /api/v1/owner/properties/:id/submit)', async () => {
      const res = await request(app)
        .post(`/api/v1/owner/properties/${testPropertyId}/submit`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.verificationStatus).toBe('SUBMITTED');
    });

    it('lists pending properties in admin moderation queue (GET /api/v1/admin/properties/pending)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/properties/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((p: { id: string }) => p.id === testPropertyId)).toBe(true);
    });

    it('retrieves property inspection dossier for admin review (GET /api/v1/admin/properties/:id)', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/properties/${testPropertyId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(testPropertyId);
      expect(res.body.data.owner.user.email).toBe(ownerEmail);
    });

    it('approves property and logs verification audit (POST /api/v1/admin/properties/:id/approve)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/properties/${testPropertyId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          inspectionNotes: 'On-site physical inspection passed with distinction. Fire exits verified.',
          checklist: {
            fireSafetyApproved: true,
            biometricSecurityActive: true,
            cleanLinenCertified: true,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.property.verificationStatus).toBe('VERIFIED');
      expect(res.body.data.auditRecord.inspectionNotes).toContain('distinction');
    });

    it('retrieves moderation audit history (GET /api/v1/admin/properties/:id/history)', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/properties/${testPropertyId}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].newStatus).toBe('VERIFIED');
    });
  });

  // ===========================================================================
  // MODULE 6: PUBLIC ACCOMMODATION DISCOVERY & SEARCH
  // ===========================================================================
  describe('6. Public Discovery & Search APIs', () => {
    it('discovers verified property publicly without authentication (GET /api/v1/properties)', async () => {
      const res = await request(app)
        .get('/api/v1/properties')
        .query({
          city: 'New Delhi',
          propertyType: PropertyType.HOSTEL,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const found = res.body.data.find((p: { id: string }) => p.id === testPropertyId);
      expect(found).toBeDefined();
      expect(found.pricing.startingMonthlyRent).toBe(11500);

      // Verify ZERO owner personal data leakage
      expect(found.owner.phone).toBeUndefined();
      expect(found.owner.email).toBeUndefined();
      expect(found.owner.businessName).toBe('Shivaji Premium Student Living LLP');
    });

    it('retrieves public property details by ID (GET /api/v1/properties/:id)', async () => {
      const res = await request(app)
        .get(`/api/v1/properties/${testPropertyId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(testPropertyId);
      expect(res.body.data.verificationStatus).toBe('VERIFIED');
    });

    it('retrieves filter metadata for search UI (GET /api/v1/properties/metadata/filters)', async () => {
      const res = await request(app)
        .get('/api/v1/properties/metadata/filters');

      expect(res.status).toBe(200);
      expect(res.body.data.cities).toContain('New Delhi');
      expect(res.body.data.propertyTypes).toContain('HOSTEL');
    });

    it('suspends property and confirms immediate removal from discovery (POST /api/v1/admin/properties/:id/suspend)', async () => {
      const suspendRes = await request(app)
        .post(`/api/v1/admin/properties/${testPropertyId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Temporary electrical maintenance required.' });

      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.data.property.verificationStatus).toBe('DELISTED');

      // Now query public API: suspended property must NOT appear
      const publicSearch = await request(app)
        .get('/api/v1/properties')
        .query({ city: 'New Delhi' });

      expect(publicSearch.status).toBe(200);
      const stillFound = publicSearch.body.data.find((p: { id: string }) => p.id === testPropertyId);
      expect(stillFound).toBeUndefined();

      // Probing directly returns 404
      const directProbe = await request(app)
        .get(`/api/v1/properties/${testPropertyId}`);
      expect(directProbe.status).toBe(404);
    });

    it('restores property to verified state (POST /api/v1/admin/properties/:id/restore)', async () => {
      const restoreRes = await request(app)
        .post(`/api/v1/admin/properties/${testPropertyId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Maintenance complete and certified.' });

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.data.property.verificationStatus).toBe('VERIFIED');

      // Re-appears in public search
      const publicSearch = await request(app)
        .get('/api/v1/properties')
        .query({ city: 'New Delhi' });
      expect(publicSearch.body.data.some((p: { id: string }) => p.id === testPropertyId)).toBe(true);
    });
  });
});
