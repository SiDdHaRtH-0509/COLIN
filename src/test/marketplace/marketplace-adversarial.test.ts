/**
 * COLIN Marketplace Adversarial Security Test Suite
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 * 
 * Hostile attack simulations verifying authorization boundaries, IDOR prevention,
 * mass-assignment defenses, resource isolation, and moderation privilege controls.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { PropertyType, PropertyGenderPolicy, AdminAccountStatus, PropertyVerificationStatus } from '@prisma/client';
import { createApp } from '../../server/app';
import { initializeDatabaseConnections, shutdownDatabaseConnections } from '../../server/database/lifecycle';
import { getAppPrismaClient, getAdminPrismaClient } from '../../server/database/prisma';
import { PasswordService } from '../../server/auth/password.service';

describe('COLIN Phase 4A.2.4: Marketplace Adversarial Security Suite', () => {
  let app: Express;
  const appPrisma = getAppPrismaClient();
  const adminPrisma = getAdminPrismaClient();

  const timestamp = Date.now();
  const defaultPassword = 'AdvMarketplacePass2026!';

  let studentToken = '';

  let ownerAToken = '';
  let ownerAPropertyId = '';

  let ownerBToken = '';
  let ownerBPropertyId = '';

  let adminToken = '';
  let adminAccountId = '';

  beforeAll(async () => {
    await initializeDatabaseConnections();
    app = createApp();

    // 1. Student setup
    const studentRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `adv_mkt_student_${timestamp}@campus.test`,
        password: defaultPassword,
        firstName: 'Malicious',
        lastName: 'Student',
        role: 'STUDENT',
        collegeName: 'IIT Delhi',
      });
    studentToken = studentRes.body.data.tokens.accessToken;

    // 2. Owner A setup
    const ownerARes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `adv_owner_a_${timestamp}@owner.test`,
        password: defaultPassword,
        firstName: 'Owner',
        lastName: 'Alpha',
        role: 'OWNER',
        businessName: 'Alpha Stays',
      });
    ownerAToken = ownerARes.body.data.tokens.accessToken;

    // Create Owner A Property
    const propARes = await request(app)
      .post('/api/v1/owner/properties')
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        name: 'Alpha Residency',
        propertyType: PropertyType.PG,
        genderPolicy: PropertyGenderPolicy.COED,
        addressLine1: 'Alpha Street 1',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      });
    ownerAPropertyId = propARes.body.data.id;

    // 3. Owner B setup
    const ownerBRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `adv_owner_b_${timestamp}@owner.test`,
        password: defaultPassword,
        firstName: 'Owner',
        lastName: 'Beta',
        role: 'OWNER',
        businessName: 'Beta Stays',
      });
    ownerBToken = ownerBRes.body.data.tokens.accessToken;

    // Create Owner B Property
    const propBRes = await request(app)
      .post('/api/v1/owner/properties')
      .set('Authorization', `Bearer ${ownerBToken}`)
      .send({
        name: 'Beta Residency',
        propertyType: PropertyType.HOSTEL,
        genderPolicy: PropertyGenderPolicy.BOYS_ONLY,
        addressLine1: 'Beta Street 2',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400002',
      });
    ownerBPropertyId = propBRes.body.data.id;

    // 4. Admin setup
    const adminPasswordHash = await PasswordService.hashPassword(defaultPassword);
    const superAdminRole = await adminPrisma.adminRole.findUnique({
      where: { code: 'SUPER_ADMIN' },
    });

    const admin = await adminPrisma.adminAccount.create({
      data: {
        username: `adv_admin_${timestamp}`,
        email: `adv_admin_${timestamp}@admin.colin.in`,
        fullName: 'Adversarial Admin',
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

    const adminLoginRes = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({
        identifier: `adv_admin_${timestamp}@admin.colin.in`,
        password: defaultPassword,
      });
    adminToken = adminLoginRes.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    try {
      if (adminAccountId) {
        await adminPrisma.adminAccount.update({
          where: { id: adminAccountId },
          data: { status: AdminAccountStatus.SUSPENDED },
        }).catch(() => {});
      }
    } catch {
      // Ignored
    }
    await shutdownDatabaseConnections();
  });

  // ===========================================================================
  // SCENARIO 1: Student attempts property creation
  // ===========================================================================
  it('1. Student cannot create a property (HTTP 403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/owner/properties')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        name: 'Unauthorized Student PG',
        propertyType: PropertyType.PG,
        genderPolicy: PropertyGenderPolicy.COED,
        addressLine1: 'Hostel Road',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110007',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // ===========================================================================
  // SCENARIO 2: Owner A accesses Owner B's property
  // ===========================================================================
  it("2. Owner A cannot access Owner B's property details (HTTP 404 / IDOR Protection)", async () => {
    const res = await request(app)
      .get(`/api/v1/owner/properties/${ownerBPropertyId}`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RECORD_NOT_FOUND');
  });

  // ===========================================================================
  // SCENARIO 3: Owner A modifies Owner B's property
  // ===========================================================================
  it("3. Owner A cannot modify Owner B's property (HTTP 404 / IDOR Protection)", async () => {
    const res = await request(app)
      .patch(`/api/v1/owner/properties/${ownerBPropertyId}`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        name: 'Hijacked Beta Residency',
      });

    expect(res.status).toBe(404);
  });

  // ===========================================================================
  // SCENARIO 4: Mass assignment attempt to set status to APPROVED
  // ===========================================================================
  it('4. Owner cannot self-approve listing through request body mass assignment', async () => {
    const res = await request(app)
      .patch(`/api/v1/owner/properties/${ownerAPropertyId}`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        name: 'Alpha Residency Self Approved',
        verificationStatus: 'VERIFIED', // Hostile mass-assignment
        status: 'APPROVED',
      });

    expect(res.status).toBe(200);
    // In database, verification status must REMAIN 'DRAFT'!
    const propertyInDb = await appPrisma.property.findUnique({
      where: { id: ownerAPropertyId },
    });
    expect(propertyInDb?.verificationStatus).toBe(PropertyVerificationStatus.DRAFT);
  });

  // ===========================================================================
  // SCENARIO 5: Owner attempts to approve their own property
  // ===========================================================================
  it('5. Owner cannot call administrative approve endpoint (HTTP 403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/properties/${ownerAPropertyId}/approve`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        inspectionNotes: 'Owner self approving',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // ===========================================================================
  // SCENARIO 6: Public user retrieves a pending property
  // ===========================================================================
  it('6. Public user cannot retrieve an unverified / draft property (HTTP 404)', async () => {
    const res = await request(app)
      .get(`/api/v1/properties/${ownerAPropertyId}`);

    expect(res.status).toBe(404);
  });

  // ===========================================================================
  // SCENARIO 7: Public user retrieves a suspended property
  // ===========================================================================
  it('7. Public user cannot retrieve a suspended / delisted property (HTTP 404)', async () => {
    // Delist property B
    await appPrisma.property.update({
      where: { id: ownerBPropertyId },
      data: { verificationStatus: PropertyVerificationStatus.DELISTED },
    });

    const res = await request(app)
      .get(`/api/v1/properties/${ownerBPropertyId}`);

    expect(res.status).toBe(404);
  });

  // ===========================================================================
  // SCENARIO 8: Student attempts to access private owner information
  // ===========================================================================
  it("8. Student cannot access owner's private dashboard or management endpoints", async () => {
    const res = await request(app)
      .get('/api/v1/owners/me')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  // ===========================================================================
  // SCENARIO 9: Owner attempts to modify another owner's image
  // ===========================================================================
  it("9. Owner A cannot delete or modify Owner B's property images", async () => {
    // Add photo to Owner B
    const photo = await appPrisma.propertyPhoto.create({
      data: {
        propertyId: ownerBPropertyId,
        photoStorageUrl: 'https://storage.colin.in/properties/beta-photo.jpg',
        displayOrder: 1,
        isCover: true,
      },
    });

    const res = await request(app)
      .delete(`/api/v1/owner/properties/${ownerBPropertyId}/photos/${photo.id}`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(res.status).toBe(404);

    // Confirm photo was NOT deleted
    const stillExists = await appPrisma.propertyPhoto.findUnique({
      where: { id: photo.id },
    });
    expect(stillExists).not.toBeNull();
  });

  // ===========================================================================
  // SCENARIO 10: Ninth image upload is rejected
  // ===========================================================================
  it('10. Ninth image upload is rejected by database constraint and validation', async () => {
    // Insert 8 photos on Owner A property
    for (let i = 1; i <= 8; i++) {
      await appPrisma.propertyPhoto.create({
        data: {
          propertyId: ownerAPropertyId,
          photoStorageUrl: `https://storage.colin.in/properties/adv-photo-${i}.jpg`,
          displayOrder: i,
          isCover: i === 1,
        },
      });
    }

    const res = await request(app)
      .post(`/api/v1/owner/properties/${ownerAPropertyId}/photos`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        photoStorageUrl: 'https://storage.colin.in/properties/adv-photo-9.jpg',
        displayOrder: 9,
      });

    expect([400, 422]).toContain(res.status);
    expect(res.body.error.message).toContain('maximum of 8 photos');
  });

  // ===========================================================================
  // SCENARIO 11: Unauthorized user accesses moderation endpoints
  // ===========================================================================
  it('11. Unauthenticated or student users cannot access moderation queue (HTTP 401/403)', async () => {
    const anonRes = await request(app).get('/api/v1/admin/properties/pending');
    expect(anonRes.status).toBe(401);

    const studentRes = await request(app)
      .get('/api/v1/admin/properties/pending')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(studentRes.status).toBe(403);
  });

  // ===========================================================================
  // SCENARIO 12: Rejected property resubmission
  // ===========================================================================
  it('12. Rejection requires mandatory reason and property can be resubmitted after rejection', async () => {
    // Admin rejects without reason -> rejected by validation
    const failRes = await request(app)
      .post(`/api/v1/admin/properties/${ownerAPropertyId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rejectionReason: 'No' }); // too short

    expect(failRes.status).toBe(400);

    // Admin rejects with proper reason
    const rejectRes = await request(app)
      .post(`/api/v1/admin/properties/${ownerAPropertyId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        rejectionReason: 'Room ventilation and window grilles require upgrading before approval.',
      });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.property.verificationStatus).toBe('REJECTED');

    // Owner fixes and resubmits
    const submitRes = await request(app)
      .post(`/api/v1/owner/properties/${ownerAPropertyId}/submit`)
      .set('Authorization', `Bearer ${ownerAToken}`);
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.verificationStatus).toBe('SUBMITTED');
  });

  // ===========================================================================
  // SCENARIO 13: Admin approval is audited
  // ===========================================================================
  it('13. Admin property approval generates immutable audit records across both audit tables', async () => {
    const approveRes = await request(app)
      .post(`/api/v1/admin/properties/${ownerAPropertyId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inspectionNotes: 'Upgrades inspected and confirmed compliant.',
      });
    expect(approveRes.status).toBe(200);

    // Verify record in property_verification_audits
    const propAudit = await adminPrisma.propertyVerificationAudit.findFirst({
      where: { propertyId: ownerAPropertyId, newStatus: PropertyVerificationStatus.VERIFIED },
    });
    expect(propAudit).not.toBeNull();
    expect(propAudit?.adminId).toBe(adminAccountId);

    // Verify record in admin_audit_logs
    const adminLog = await adminPrisma.adminAuditLog.findFirst({
      where: { targetEntityId: ownerAPropertyId, action: 'PROPERTY_APPROVED' },
    });
    expect(adminLog).not.toBeNull();
    expect(adminLog?.adminId).toBe(adminAccountId);
  });

  // ===========================================================================
  // SCENARIO 14: Suspended property disappears from public search
  // ===========================================================================
  it('14. Suspending an approved property immediately purges it from public search', async () => {
    // 1. Confirm visible in search
    const beforeSearch = await request(app)
      .get('/api/v1/properties')
      .query({ city: 'Mumbai' });
    expect(beforeSearch.body.data.some((p: { id: string }) => p.id === ownerAPropertyId)).toBe(true);

    // 2. Suspend
    await request(app)
      .post(`/api/v1/admin/properties/${ownerAPropertyId}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Investigation into reported municipal building code dispute.' });

    // 3. Confirm purged immediately
    const afterSearch = await request(app)
      .get('/api/v1/properties')
      .query({ city: 'Mumbai' });
    expect(afterSearch.body.data.some((p: { id: string }) => p.id === ownerAPropertyId)).toBe(false);
  });

  // ===========================================================================
  // SCENARIO 15: Mass-assignment attempts cannot modify protected fields
  // ===========================================================================
  it('15. Mass-assignment attempts cannot alter ownerId, verificationStatus, or slug', async () => {
    const maliciousPayload = {
      name: 'Legitimate Name Update',
      ownerId: '00000000-0000-0000-0000-000000000999',
      slug: 'forged-slug-override',
      verificationStatus: 'VERIFIED',
      isFeatured: true,
    };

    const res = await request(app)
      .patch(`/api/v1/owner/properties/${ownerAPropertyId}`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send(maliciousPayload);

    expect(res.status).toBe(200);

    const propInDb = await appPrisma.property.findUnique({
      where: { id: ownerAPropertyId },
    });

    // ownerId must NOT be changed!
    expect(propInDb?.name).toBe('Legitimate Name Update');
    expect(propInDb?.ownerId).not.toBe('00000000-0000-0000-0000-000000000999');
    expect(propInDb?.slug).not.toBe('forged-slug-override');
    expect(propInDb?.verificationStatus).toBe(PropertyVerificationStatus.DELISTED); // Remains suspended
  });
});
