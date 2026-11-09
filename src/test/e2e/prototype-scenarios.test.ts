/**
 * COLIN End-to-End Prototype Scenarios Verification Suite
 * 
 * Verifies all 14 end-to-end prototype scenarios:
 * 1. Student Registration & Profile Setup
 * 2. Property Owner Registration & Listing
 * 3. 8-Photo Upload & Cover Management
 * 4. Property Verification Submission (DRAFT -> SUBMITTED)
 * 5. Admin Inspection & Approval (SUBMITTED -> VERIFIED)
 * 6. Public Discovery & Search Filtering (Only VERIFIED shown, contacts shielded)
 * 7. Student Booking Request (PAYMENT_PENDING, ₹150 fee)
 * 8. Simulated ₹150 Payment & Escrow Posting (FEE_PAID, Double-Entry Escrow)
 * 9. Admin Visit Scheduling (VISIT_SCHEDULED)
 * 10. Admin Visit Completion & 12h Server Deadline (DECISION_PENDING)
 * 11. Scenario A: Student Acceptance & Platform Revenue Settlement (ACCEPTED, ₹150 revenue)
 * 12. Scenario B: Student Rejection & 55% Refund Settlement (REJECTED, ₹82.50 refund, ₹67.50 retained)
 * 13. Scenario C: Past 12h Deadline Auto-Expiry Settlement (AUTO_EXPIRED, ₹150 forfeited)
 * 14. RBAC & Cross-Role Access Boundaries (Multi-tier role enforcement & isolation)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import {
  PropertyType,
  PropertyGenderPolicy,
  AdminAccountStatus,
} from '@prisma/client';
import { createApp } from '../../server/app';
import { getAppPrismaClient, getAdminPrismaClient } from '../../server/database/prisma';
import { initializeDatabaseConnections, shutdownDatabaseConnections } from '../../server/database/lifecycle';
import { authService } from '../../server/services/AuthService';
import { PasswordService } from '../../server/auth/password.service';

describe('COLIN Prototype End-to-End Scenarios (1 to 14)', () => {
  const appPrisma = getAppPrismaClient();
  const adminPrisma = getAdminPrismaClient();
  let app: Express;

  // Shared session credentials & entity IDs
  let student1Token: string;
  let student1Id: string;
  let student2Token: string;
  let student2Id: string;
  let student3Token: string;
  let student3Id: string;

  let ownerToken: string;
  let ownerUserId: string;

  let adminToken: string;
  let adminId: string;

  let propertyId: string;
  let photoIds: string[] = [];
  let booking1Id: string;
  let booking2Id: string;
  let booking3Id: string;

  beforeAll(async () => {
    await initializeDatabaseConnections();
    app = createApp();

    // Setup Admin Account & Token
    const adminEmail = `e2e_admin_${Date.now()}@admin.colin.in`;
    const adminPassword = 'AdminSecret123!';
    const adminPasswordHash = await PasswordService.hashPassword(adminPassword);
    const superAdminRole = await adminPrisma.adminRole.findUnique({
      where: { code: 'SUPER_ADMIN' },
    });

    const adminAcc = await adminPrisma.adminAccount.create({
      data: {
        username: `e2e_admin_${Date.now()}`,
        email: adminEmail,
        fullName: 'E2E Prototype Lead Admin',
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
    adminId = adminAcc.id;

    const adminLoginRes = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({
        identifier: adminEmail,
        password: adminPassword,
      });
    expect(adminLoginRes.status).toBe(200);
    adminToken = adminLoginRes.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    // Teardown created test entities safely
    try {
      if (propertyId) {
        await appPrisma.propertyPhoto.deleteMany({ where: { propertyId } }).catch(() => {});
      }
    } catch {}
    await shutdownDatabaseConnections();
  });

  // =========================================================================
  // SCENARIO 1: Student Registration & Profile Setup
  // =========================================================================
  it('Scenario 1: Student Registration & Profile Setup', async () => {
    const email = `scholar_${Date.now()}@delhi.edu.in`;
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'Password123!',
        firstName: 'Devendra',
        lastName: 'Sharma',
        role: 'STUDENT',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.data.user.role).toBe('STUDENT');
    student1Token = regRes.body.data.tokens.accessToken;
    student1Id = regRes.body.data.user.id;

    // Student profile update
    const updateRes = await request(app)
      .patch('/api/v1/students/me')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        collegeName: 'Faculty of Technology, Delhi University',
        course: 'B.Tech Computer Engineering',
        batchYear: 2026,
        preferences: {
          maxBudget: 14500,
          preferredLocation: 'North Campus',
        },
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);

    // Verify profile retrieval
    const profileRes = await request(app)
      .get('/api/v1/students/me')
      .set('Authorization', `Bearer ${student1Token}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.collegeName).toBe('Faculty of Technology, Delhi University');
    expect(profileRes.body.data.course).toBe('B.Tech Computer Engineering');
  });

  // =========================================================================
  // SCENARIO 2: Property Owner Registration & Listing
  // =========================================================================
  it('Scenario 2: Property Owner Registration & Listing Creation', async () => {
    const ownerEmail = `host_partner_${Date.now()}@northcampus.in`;
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: ownerEmail,
        password: 'Password123!',
        firstName: 'Suresh',
        lastName: 'Agarwal',
        role: 'OWNER',
        businessName: 'Agarwal Scholars Living',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.data.user.role).toBe('OWNER');
    ownerToken = regRes.body.data.tokens.accessToken;
    ownerUserId = regRes.body.data.user.id;

    // Create property listing
    const propRes = await request(app)
      .post('/api/v1/owner/properties')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Agarwal Royal Residency North Campus',
        propertyType: PropertyType.PG,
        genderPolicy: PropertyGenderPolicy.BOYS_ONLY,
        addressLine1: '88 Chhatra Marg, North Campus',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110007',
        totalRooms: 12,
        totalBeds: 24,
        availableBeds: 8,
      });

    expect(propRes.status).toBe(201);
    expect(propRes.body.success).toBe(true);
    propertyId = propRes.body.data.id;
    expect(propertyId).toBeDefined();
    expect(propRes.body.data.verificationStatus).toBe('DRAFT');
  });

  // =========================================================================
  // SCENARIO 3: 8-Photo Upload & Cover Management
  // =========================================================================
  it('Scenario 3: 8-Photo Upload & Cover Photo Assignment', async () => {
    const photoCategories = [
      'Building Facade & Entry Gate',
      'Spacious Furnished Double Room',
      'Attached Sanitized Washroom',
      'Hygienic Modern Dining Hall',
      'Air-Conditioned Study Room',
      'Common Recreation Lounge',
      'Commercial RO Water Plant',
      '24x7 High-Speed Wi-Fi Area',
    ];

    for (let i = 0; i < 8; i++) {
      const res = await request(app)
        .post(`/api/v1/owner/properties/${propertyId}/photos`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          photoStorageUrl: `https://storage.colin.in/properties/${propertyId}/photo_${i + 1}.webp`,
          thumbnailUrl: `https://storage.colin.in/properties/${propertyId}/photo_${i + 1}_thumb.webp`,
          caption: photoCategories[i],
          displayOrder: i + 1,
          isCover: i === 0, // First photo is cover
        });

      expect(res.status).toBe(201);
      photoIds.push(res.body.data.id);
    }

    expect(photoIds.length).toBe(8);

    // Verify photos on property
    const propDetails = await request(app)
      .get(`/api/v1/owner/properties/${propertyId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(propDetails.status).toBe(200);
    expect(propDetails.body.data.photos.length).toBe(8);
    const coverPhotos = propDetails.body.data.photos.filter((p: any) => p.isCover);
    expect(coverPhotos.length).toBe(1);
  });

  // =========================================================================
  // SCENARIO 4: Property Verification Submission
  // =========================================================================
  it('Scenario 4: Property Verification Submission', async () => {
    const submitRes = await request(app)
      .post(`/api/v1/owner/properties/${propertyId}/submit`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.success).toBe(true);
    expect(submitRes.body.data.verificationStatus).toBe('SUBMITTED');
  });

  // =========================================================================
  // SCENARIO 5: Admin Inspection & Approval
  // =========================================================================
  it('Scenario 5: Admin Inspection & Verification Approval', async () => {
    // 1. Verify property appears in Admin Verification Queue
    const queueRes = await request(app)
      .get('/api/v1/admin/properties/pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(queueRes.status).toBe(200);
    expect(Array.isArray(queueRes.body.data)).toBe(true);
    const inQueue = queueRes.body.data.some((p: any) => p.id === propertyId);
    expect(inQueue).toBe(true);

    // 2. Admin inspects and approves property
    const approveRes = await request(app)
      .post(`/api/v1/admin/properties/${propertyId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        inspectionNotes: 'Verified in-person by COLIN Field Operations Team. Compliant with safety norms.',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.property.verificationStatus).toBe('VERIFIED');
  });

  // =========================================================================
  // SCENARIO 6: Public Discovery & Search Filtering
  // =========================================================================
  it('Scenario 6: Public Discovery & Search Filtering (Shielded Contact)', async () => {
    const searchRes = await request(app)
      .get('/api/v1/properties?city=Delhi&genderPolicy=BOYS_ONLY');

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.success).toBe(true);
    expect(Array.isArray(searchRes.body.data)).toBe(true);
    const found = searchRes.body.data.find((p: any) => p.id === propertyId);
    expect(found).toBeDefined();
    expect(found.verificationStatus).toBe('VERIFIED');

    // Shielding verification: private owner credentials must not be exposed to unauthenticated public
    expect(found.owner?.user?.passwordHash).toBeUndefined();
    expect(found.owner?.user?.email).toBeUndefined();
  });

  // =========================================================================
  // SCENARIO 7: Student Booking Request
  // =========================================================================
  it('Scenario 7: Student Guided Visit Booking Request', async () => {
    const tomorrow = new Date(Date.now() + 24 * 3600000).toISOString().split('T')[0];
    const dayAfter = new Date(Date.now() + 48 * 3600000).toISOString().split('T')[0];

    const bookRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        propertyId,
        preferredVisitDates: [tomorrow, dayAfter],
        studentNotes: 'Interested in double-sharing room on the 2nd floor.',
      });

    expect(bookRes.status).toBe(201);
    expect(bookRes.body.success).toBe(true);
    expect(bookRes.body.data.status).toBe('PAYMENT_PENDING');
    expect(Number(bookRes.body.data.bookingFeeAmount)).toBe(150.00);
    booking1Id = bookRes.body.data.id;
  });

  // =========================================================================
  // SCENARIO 8: Simulated ₹150 Payment & Escrow Posting
  // =========================================================================
  it('Scenario 8: Simulated ₹150 Payment Capture & Double-Entry Escrow Posting', async () => {
    const payRes = await request(app)
      .post(`/api/v1/bookings/${booking1Id}/pay`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        idempotencyKey: `idemp-e2e-${Date.now()}`,
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.status).toBe('FEE_PAID');
    expect(payRes.body.data.paymentStatus).toBe('PAID');
    expect(Number(payRes.body.data.amountPaid)).toBe(150.00);

    // Verify double-entry ledger balance
    const financeRes = await request(app)
      .get('/api/v1/admin/bookings/finance-summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(financeRes.status).toBe(200);
    expect(financeRes.body.data.isBalanced).toBe(true);
    expect(financeRes.body.data.escrowBalance).toBeGreaterThanOrEqual(150.00);
  });

  // =========================================================================
  // SCENARIO 9: Admin Visit Scheduling
  // =========================================================================
  it('Scenario 9: Admin Guided Visit Slot Scheduling', async () => {
    const startTime = new Date(Date.now() + 10 * 3600000).toISOString();
    const endTime = new Date(Date.now() + 11 * 3600000).toISOString();

    const schedRes = await request(app)
      .post(`/api/v1/admin/bookings/${booking1Id}/schedule`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        scheduledStartTime: startTime,
        scheduledEndTime: endTime,
        coordinationNotes: 'Campus guide assigned. Meet student at entrance.',
      });

    expect(schedRes.status).toBe(200);
    expect(schedRes.body.data.status).toBe('VISIT_SCHEDULED');
  });

  // =========================================================================
  // SCENARIO 10: Admin Visit Completion & 12h Server Deadline
  // =========================================================================
  it('Scenario 10: Admin Records Visit Completion & Strict 12h Deadline Activated', async () => {
    const completeRes = await request(app)
      .post(`/api/v1/admin/bookings/${booking1Id}/complete-visit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        completionNotes: 'Student toured Room 204, washroom, and mess area.',
      });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe('DECISION_PENDING');
    expect(completeRes.body.data.visitCompletedAt).toBeDefined();
    expect(completeRes.body.data.decisionDeadline).toBeDefined();

    // Verify strict 12-hour invariant
    const completedAt = new Date(completeRes.body.data.visitCompletedAt).getTime();
    const deadline = new Date(completeRes.body.data.decisionDeadline).getTime();
    const diffHours = (deadline - completedAt) / (1000 * 60 * 60);
    expect(Math.abs(diffHours - 12)).toBeLessThan(0.01);
  });

  // =========================================================================
  // SCENARIO 11: Scenario A: Student Acceptance & Platform Revenue Settlement
  // =========================================================================
  it('Scenario 11: Scenario A: Student Accepts & 100% Retained Revenue Settles', async () => {
    const decisionRes = await request(app)
      .post(`/api/v1/bookings/${booking1Id}/decision`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        decision: 'ACCEPTED',
        studentNotes: 'I am taking the room! Very pleased with cleanliness and staff.',
      });

    expect(decisionRes.status).toBe(200);
    expect(decisionRes.body.data.status).toBe('ACCEPTED');
    expect(decisionRes.body.data.studentDecision).toBe('ACCEPTED');
    expect(Number(decisionRes.body.data.refundAmount)).toBe(0.00);
    expect(Number(decisionRes.body.data.platformFeeRetained)).toBe(150.00);

    // Ledger zero-sum invariant check
    const financeRes = await request(app)
      .get('/api/v1/admin/bookings/finance-summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(financeRes.status).toBe(200);
    expect(financeRes.body.data.isBalanced).toBe(true);
  });

  // =========================================================================
  // SCENARIO 12: Scenario B: Student Rejection & 55% Refund Settlement
  // =========================================================================
  it('Scenario 12: Scenario B: Student Rejects & 55% Refund (₹82.50) Settles', async () => {
    // 1. Register student 2
    const s2Email = `scholar2_${Date.now()}@delhi.edu.in`;
    const reg2 = await authService.register(
      {
        email: s2Email,
        password: 'Password123!',
        firstName: 'Ananya',
        lastName: 'Verma',
        role: 'STUDENT',
      },
      { ipAddress: '127.0.0.1', userAgent: 'Vitest/E2E' }
    );
    student2Token = reg2.tokens.accessToken;
    student2Id = reg2.user.id;

    // 2. Create booking 2
    const b2Res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${student2Token}`)
      .send({
        propertyId,
        preferredVisitDates: ['2026-11-15'],
        studentNotes: 'Looking for quiet study room.',
      });
    expect(b2Res.status).toBe(201);
    booking2Id = b2Res.body.data.id;

    // 3. Payment
    await request(app)
      .post(`/api/v1/bookings/${booking2Id}/pay`)
      .set('Authorization', `Bearer ${student2Token}`)
      .send({ idempotencyKey: `idemp-b2-${Date.now()}` });

    // 4. Schedule visit
    await request(app)
      .post(`/api/v1/admin/bookings/${booking2Id}/schedule`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        scheduledStartTime: new Date(Date.now() + 5 * 3600000).toISOString(),
        scheduledEndTime: new Date(Date.now() + 6 * 3600000).toISOString(),
      });

    // 5. Complete visit
    await request(app)
      .post(`/api/v1/admin/bookings/${booking2Id}/complete-visit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ completionNotes: 'Completed visit with Ananya.' });

    // 6. Student Rejects accommodation
    const rejectRes = await request(app)
      .post(`/api/v1/bookings/${booking2Id}/decision`)
      .set('Authorization', `Bearer ${student2Token}`)
      .send({
        decision: 'REJECTED',
        studentNotes: 'Decided to stay closer to metro station.',
      });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe('REJECTED_REFUND_DUE');
    expect(rejectRes.body.data.studentDecision).toBe('REJECTED');
    expect(rejectRes.body.data.paymentStatus).toBe('PARTIALLY_REFUNDED');

    // Strict 55% / 45% financial split validation
    expect(Number(rejectRes.body.data.refundAmount)).toBe(82.50);
    expect(Number(rejectRes.body.data.platformFeeRetained)).toBe(67.50);

    // Ledger zero-sum invariant check
    const financeRes = await request(app)
      .get('/api/v1/admin/bookings/finance-summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(financeRes.status).toBe(200);
    expect(financeRes.body.data.isBalanced).toBe(true);
  });

  // =========================================================================
  // SCENARIO 13: Scenario C: Past 12h Deadline Auto-Expiry Settlement
  // =========================================================================
  it('Scenario 13: Scenario C: Past 12h Deadline Auto-Expiry Settlement', async () => {
    // 1. Register student 3
    const s3Email = `scholar3_${Date.now()}@delhi.edu.in`;
    const reg3 = await authService.register(
      {
        email: s3Email,
        password: 'Password123!',
        firstName: 'Vikram',
        lastName: 'Rathore',
        role: 'STUDENT',
      },
      { ipAddress: '127.0.0.1', userAgent: 'Vitest/E2E' }
    );
    student3Token = reg3.tokens.accessToken;
    student3Id = reg3.user.id;

    // 2. Create booking 3
    const b3Res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${student3Token}`)
      .send({
        propertyId,
        preferredVisitDates: ['2026-11-16'],
      });
    expect(b3Res.status).toBe(201);
    booking3Id = b3Res.body.data.id;

    // 3. Payment
    await request(app)
      .post(`/api/v1/bookings/${booking3Id}/pay`)
      .set('Authorization', `Bearer ${student3Token}`)
      .send({ idempotencyKey: `idemp-b3-${Date.now()}` });

    // 4. Schedule visit
    await request(app)
      .post(`/api/v1/admin/bookings/${booking3Id}/schedule`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        scheduledStartTime: new Date(Date.now() - 20 * 3600000).toISOString(),
        scheduledEndTime: new Date(Date.now() - 19 * 3600000).toISOString(),
      });

    // 5. Complete visit
    await request(app)
      .post(`/api/v1/admin/bookings/${booking3Id}/complete-visit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ completionNotes: 'Completed visit yesterday.' });

    // 6. Fast-forward timestamps in database (past 12-hour deadline)
    const visitCompletedAt = new Date(Date.now() - 14 * 3600000);
    const decisionDeadline = new Date(visitCompletedAt.getTime() + 12 * 3600000);

    await appPrisma.bookingRequest.update({
      where: { id: booking3Id },
      data: {
        visitCompletedAt,
        decisionDeadline,
      },
    });

    // 7. Trigger expiration worker
    const expireRes = await request(app)
      .post('/api/v1/admin/bookings/process-expirations')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(expireRes.status).toBe(200);
    expect(expireRes.body.data.expiredCount).toBeGreaterThanOrEqual(1);

    // Verify booking 3 expired
    const expiredBooking = await appPrisma.bookingRequest.findUnique({
      where: { id: booking3Id },
    });

    expect(expiredBooking?.status).toBe('AUTO_EXPIRED');
    expect(expiredBooking?.paymentStatus).toBe('FORFEITED');
    expect(Number(expiredBooking?.refundAmount)).toBe(0.00);
    expect(Number(expiredBooking?.platformFeeRetained)).toBe(150.00);

    // Verify double-entry ledger remains zero-sum balanced
    const financeRes = await request(app)
      .get('/api/v1/admin/bookings/finance-summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(financeRes.status).toBe(200);
    expect(financeRes.body.data.isBalanced).toBe(true);
  });

  // =========================================================================
  // SCENARIO 14: RBAC & Cross-Role Access Boundaries
  // =========================================================================
  it('Scenario 14: Strict RBAC & Cross-Role Access Isolation', async () => {
    // 1. Student attempting to access admin booking list -> 403 Forbidden
    const sAccessAdmin = await request(app)
      .get('/api/v1/admin/bookings')
      .set('Authorization', `Bearer ${student1Token}`);
    expect([401, 403]).toContain(sAccessAdmin.status);

    // 2. Student attempting to approve a property -> 403 Forbidden
    const sApproveProp = await request(app)
      .post(`/api/v1/admin/properties/${propertyId}/approve`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ auditNotes: 'Malicious attempt' });
    expect([401, 403]).toContain(sApproveProp.status);

    // 3. Owner attempting to access admin finance ledger -> 403 Forbidden
    const oAccessFinance = await request(app)
      .get('/api/v1/admin/bookings/finance-summary')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect([401, 403]).toContain(oAccessFinance.status);

    // 4. Unauthenticated request to student profile -> 401 Unauthorized
    const unauthStudent = await request(app).get('/api/v1/students/me');
    expect(unauthStudent.status).toBe(401);

    // 5. Unauthenticated request to create booking -> 401 Unauthorized
    const unauthBooking = await request(app)
      .post('/api/v1/bookings')
      .send({ propertyId });
    expect(unauthBooking.status).toBe(401);

    // 6. Owner cannot modify or schedule visits directly
    const ownerSchedule = await request(app)
      .post(`/api/v1/admin/bookings/${booking1Id}/schedule`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        scheduledStartTime: new Date().toISOString(),
        scheduledEndTime: new Date().toISOString(),
      });
    expect([401, 403]).toContain(ownerSchedule.status);
  });
});
