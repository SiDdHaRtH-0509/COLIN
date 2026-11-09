/**
 * COLIN Booking & Guided Visit Lifecycle Integration Test Suite
 * Validates the complete business lifecycle, simulated payment, 12-hour server deadline,
 * double-entry ledger balance, refund calculations, and role-based permissions.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { PropertyType, PropertyGenderPolicy, PropertyVerificationStatus, AdminAccountStatus } from '@prisma/client';
import { createApp } from '../../server/app';
import { getAppPrismaClient, getAdminPrismaClient } from '../../server/database/prisma';
import { initializeDatabaseConnections, shutdownDatabaseConnections } from '../../server/database/lifecycle';
import { authService } from '../../server/services/AuthService';
import { adminAuthService } from '../../server/services/AdminAuthService';
import { PasswordService } from '../../server/auth/password.service';

describe('COLIN Booking & Guided Visit Lifecycle Integration Suite', () => {
  const appPrisma = getAppPrismaClient();
  const adminPrisma = getAdminPrismaClient();
  let app: Express;

  let student1Token: string;
  let student1Id: string;
  let student2Token: string;
  let student2Id: string;
  let adminToken: string;
  let verifiedPropertyId: string;
  let ownerUserId: string;

  beforeAll(async () => {
    await initializeDatabaseConnections();
    app = createApp();

    // 1. Create verified test property via owner registration and Property model
    const ownerEmail = `booking_owner_${Date.now()}@host.test`;
    const regOwner = await authService.register(
      {
        email: ownerEmail,
        password: 'Password123!',
        firstName: 'Owner',
        lastName: 'Test',
        role: 'OWNER',
        businessName: 'Colin Verified Living Spaces',
      },
      { ipAddress: '127.0.0.1', userAgent: 'Vitest/Test' }
    );
    ownerUserId = regOwner.user.id;

    const prop = await appPrisma.property.create({
      data: {
        ownerId: ownerUserId,
        name: 'Colin Verified Residence',
        slug: `colin-verified-residence-${Date.now()}`,
        propertyType: PropertyType.PG,
        genderPolicy: PropertyGenderPolicy.COED,
        addressLine1: '42 Campus Road, North Campus',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110007',
        verificationStatus: PropertyVerificationStatus.VERIFIED,
        totalRooms: 10,
        totalBeds: 20,
        availableBeds: 10,
      },
    });
    verifiedPropertyId = prop.id;

    // 2. Register Student 1
    const s1Email = `student1-${Date.now()}@test.colin.in`;
    const reg1 = await authService.register(
      {
        email: s1Email,
        password: 'Password123!',
        firstName: 'Aarav',
        lastName: 'Student',
        role: 'STUDENT',
      },
      { ipAddress: '127.0.0.1', userAgent: 'Vitest/Test' }
    );
    student1Token = reg1.tokens.accessToken;
    student1Id = reg1.user.id;

    // 3. Register Student 2
    const s2Email = `student2-${Date.now()}@test.colin.in`;
    const reg2 = await authService.register(
      {
        email: s2Email,
        password: 'Password123!',
        firstName: 'Riya',
        lastName: 'Student',
        role: 'STUDENT',
      },
      { ipAddress: '127.0.0.1', userAgent: 'Vitest/Test' }
    );
    student2Token = reg2.tokens.accessToken;
    student2Id = reg2.user.id;

    // 4. Authenticate Admin
    const adminEmail = `booking_admin_${Date.now()}@admin.colin.in`;
    const adminPassword = 'AdminSecret123!';
    const adminPasswordHash = await PasswordService.hashPassword(adminPassword);
    const superAdminRole = await adminPrisma.adminRole.findUnique({
      where: { code: 'SUPER_ADMIN' },
    });

    const adminAcc = await adminPrisma.adminAccount.create({
      data: {
        username: `booking_admin_${Date.now()}`,
        email: adminEmail,
        fullName: 'Booking Admin Reviewer',
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
    try {
      if (verifiedPropertyId) {
        const bookings = await appPrisma.bookingRequest.findMany({
          where: { propertyId: verifiedPropertyId },
          select: { id: true },
        });
        const bookingIds = bookings.map((b) => b.id);

        if (bookingIds.length > 0) {
          await appPrisma.visitDecision.deleteMany({ where: { bookingId: { in: bookingIds } } }).catch(() => {});
          await appPrisma.visitSlot.deleteMany({ where: { bookingId: { in: bookingIds } } }).catch(() => {});
          await appPrisma.bookingStatusHistory.deleteMany({ where: { bookingId: { in: bookingIds } } }).catch(() => {});

          const txs = await appPrisma.ledgerTransaction.findMany({
            where: { bookingId: { in: bookingIds } },
            select: { id: true },
          });
          const txIds = txs.map((t) => t.id);

          if (txIds.length > 0) {
            await appPrisma.ledgerEntry.deleteMany({ where: { transactionId: { in: txIds } } }).catch(() => {});
            await appPrisma.ledgerTransaction.deleteMany({ where: { id: { in: txIds } } }).catch(() => {});
          }

          await appPrisma.financialPayment.deleteMany({ where: { bookingId: { in: bookingIds } } }).catch(() => {});
          await appPrisma.bookingRequest.deleteMany({ where: { id: { in: bookingIds } } }).catch(() => {});
        }

        await appPrisma.property.deleteMany({ where: { id: verifiedPropertyId } }).catch(() => {});
      }

      if (ownerUserId) {
        await appPrisma.ownerProfile.deleteMany({ where: { userId: ownerUserId } }).catch(() => {});
        await appPrisma.userProfile.deleteMany({ where: { userId: ownerUserId } }).catch(() => {});
        await appPrisma.user.deleteMany({ where: { id: ownerUserId } }).catch(() => {});
      }

      if (student1Id) {
        await appPrisma.studentProfile.deleteMany({ where: { userId: student1Id } }).catch(() => {});
        await appPrisma.userProfile.deleteMany({ where: { userId: student1Id } }).catch(() => {});
        await appPrisma.user.deleteMany({ where: { id: student1Id } }).catch(() => {});
      }

      if (student2Id) {
        await appPrisma.studentProfile.deleteMany({ where: { userId: student2Id } }).catch(() => {});
        await appPrisma.userProfile.deleteMany({ where: { userId: student2Id } }).catch(() => {});
        await appPrisma.user.deleteMany({ where: { id: student2Id } }).catch(() => {});
      }
    } catch (e) {
      // Ignore teardown errors for immutable test records
    }
  });

  let bookingId1: string;

  it('1. Student creates a visit booking request for a verified property (DRAFT / PAYMENT_PENDING)', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        propertyId: verifiedPropertyId,
      });

    if (res.status !== 201) {
      console.error('Test 1 failed with body:', JSON.stringify(res.body, null, 2));
    }

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PAYMENT_PENDING');
    expect(res.body.data.bookingFeeAmount).toBe('150');
    expect(res.body.data.amountPaid).toBe('0');
    expect(res.body.data.propertyId).toBe(verifiedPropertyId);
    expect(res.body.data.studentId).toBe(student1Id);

    bookingId1 = res.body.data.id;
  });

  it('2. Prevents unauthorized user from paying another student booking (IDOR check)', async () => {
    const res = await request(app)
      .post(`/api/v1/bookings/${bookingId1}/pay`)
      .set('Authorization', `Bearer ${student2Token}`)
      .send({
        idempotencyKey: `idemp-idor-${Date.now()}`,
      });

    expect(res.status).toBe(403);
    expect(res.body.error?.message).toMatch(/do not own this booking/i);
  });

  it('3. Simulates failed payment when requested, preserving PAYMENT_PENDING state', async () => {
    const res = await request(app)
      .post(`/api/v1/bookings/${bookingId1}/pay`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        idempotencyKey: `idemp-fail-${Date.now()}`,
        simulateFailure: true,
      });

    expect(res.status).toBe(422);
    expect(res.body.error?.message).toMatch(/declined/i);

    // Verify booking state is still PAYMENT_PENDING
    const checkRes = await request(app)
      .get(`/api/v1/bookings/${bookingId1}`)
      .set('Authorization', `Bearer ${student1Token}`);

    expect(checkRes.status).toBe(200);
    expect(checkRes.body.data.status).toBe('PAYMENT_PENDING');
  });

  it('4. Successfully processes simulated ₹150 payment, transitions to FEE_PAID, and records balanced ledger entry', async () => {
    const idempKey = `idemp-success-${Date.now()}`;
    const res = await request(app)
      .post(`/api/v1/bookings/${bookingId1}/pay`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        idempotencyKey: idempKey,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('FEE_PAID');
    expect(res.body.data.amountPaid).toBe('150');
    expect(res.body.data.paymentStatus).toBe('PAID');
    expect(res.body.data.paymentReference).toMatch(/^SIM-PAY-/);

    // Verify balanced double-entry ledger transaction
    const tx = await appPrisma.ledgerTransaction.findFirst({
      where: { bookingId: bookingId1 },
      include: { entries: true },
    });

    expect(tx).toBeDefined();
    expect(tx?.status).toBe('POSTED');
    expect(tx?.transactionType).toBe('VISIT_FEE_COLLECTION');
    expect(tx?.entries.length).toBe(2);

    const debits = tx!.entries.filter((e) => e.entryType === 'DEBIT');
    const credits = tx!.entries.filter((e) => e.entryType === 'CREDIT');
    expect(debits.length).toBe(1);
    expect(credits.length).toBe(1);
    expect(Number(debits[0].amount)).toBe(150.0);
    expect(Number(credits[0].amount)).toBe(150.0);
  });

  it('5. Rejects visit scheduling by non-admin students (HTTP 401/403 RBAC boundary)', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/bookings/${bookingId1}/schedule`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        scheduledStartTime: new Date(Date.now() + 86400000).toISOString(),
        scheduledEndTime: new Date(Date.now() + 90000000).toISOString(),
      });

    expect(res.status).toBe(403);
  });

  it('6. COLIN Admin schedules visit slot, transitioning booking to VISIT_SCHEDULED', async () => {
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const res = await request(app)
      .post(`/api/v1/admin/bookings/${bookingId1}/schedule`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        scheduledStartTime: start.toISOString(),
        scheduledEndTime: end.toISOString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('VISIT_SCHEDULED');
    expect(res.body.data.visitSlot).toBeDefined();
    expect(new Date(res.body.data.visitSlot.scheduledStartTime).getTime()).toBe(start.getTime());
  });

  it('7. Rejects visit completion from student (Admin-only operation)', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/bookings/${bookingId1}/complete-visit`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send();

    expect(res.status).toBe(403);
  });

  it('8. Authorized Admin records visit completion, establishing authoritative 12-hour server deadline', async () => {
    const beforeCall = Date.now();
    const res = await request(app)
      .post(`/api/v1/admin/bookings/${bookingId1}/complete-visit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    const afterCall = Date.now();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('DECISION_PENDING');
    expect(res.body.data.visitCompletedAt).toBeDefined();
    expect(res.body.data.decisionDeadline).toBeDefined();

    const completedAt = new Date(res.body.data.visitCompletedAt).getTime();
    const deadline = new Date(res.body.data.decisionDeadline).getTime();

    // Verify server timestamp accuracy
    expect(completedAt).toBeGreaterThanOrEqual(beforeCall - 1000);
    expect(completedAt).toBeLessThanOrEqual(afterCall + 1000);

    // Verify exact 12-hour duration (12 * 3600 * 1000 ms = 43,200,000 ms)
    const expectedDeadline = completedAt + 12 * 60 * 60 * 1000;
    expect(deadline).toBe(expectedDeadline);
  });

  it('9. Student accepts stay: transitions to ACCEPTED, ₹0 refund, ₹150 retained, posts balanced settlement ledger', async () => {
    const res = await request(app)
      .post(`/api/v1/bookings/${bookingId1}/decision`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        decision: 'ACCEPTED',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ACCEPTED');
    expect(res.body.data.studentDecision).toBe('ACCEPTED');
    expect(Number(res.body.data.refundAmount)).toBe(0.0);
    expect(Number(res.body.data.platformFeeRetained)).toBe(150.0);

    // Verify balanced double-entry settlement ledger transaction
    const accTx = await appPrisma.ledgerTransaction.findFirst({
      where: {
        bookingId: bookingId1,
        transactionType: 'VISIT_ACCEPTANCE_SETTLEMENT',
      },
      include: { entries: true },
    });

    expect(accTx).toBeDefined();
    expect(accTx?.status).toBe('POSTED');
    expect(accTx?.entries.length).toBe(2);

    const debits = accTx!.entries.filter((e) => e.entryType === 'DEBIT');
    const credits = accTx!.entries.filter((e) => e.entryType === 'CREDIT');
    expect(Number(debits[0].amount)).toBe(150.0);
    expect(Number(credits[0].amount)).toBe(150.0);
  });

  it('10. Lifecycle Scenario B: Rejection triggers exact 55% refund (₹82.50) and 45% retained (₹67.50)', async () => {
    // 1. Create a second booking for Student 2
    const b2Res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${student2Token}`)
      .send({ propertyId: verifiedPropertyId });

    const b2Id = b2Res.body.data.id;

    // 2. Pay ₹150 fee
    await request(app)
      .post(`/api/v1/bookings/${b2Id}/pay`)
      .set('Authorization', `Bearer ${student2Token}`)
      .send({ idempotencyKey: `idemp-b2-${Date.now()}` });

    // 3. Admin schedules
    await request(app)
      .post(`/api/v1/admin/bookings/${b2Id}/schedule`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        scheduledStartTime: new Date(Date.now() + 86400000).toISOString(),
        scheduledEndTime: new Date(Date.now() + 90000000).toISOString(),
      });

    // 4. Admin completes visit
    await request(app)
      .post(`/api/v1/admin/bookings/${b2Id}/complete-visit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    // 5. Student submits REJECTED
    const rejRes = await request(app)
      .post(`/api/v1/bookings/${b2Id}/decision`)
      .set('Authorization', `Bearer ${student2Token}`)
      .send({
        decision: 'REJECTED',
        rejectionReason: 'Room ventilation was inadequate for my requirements.',
      });

    expect(rejRes.status).toBe(200);
    expect(rejRes.body.data.status).toBe('REJECTED_REFUND_DUE');
    expect(rejRes.body.data.studentDecision).toBe('REJECTED');
    expect(Number(rejRes.body.data.refundAmount)).toBe(82.5); // 55%
    expect(Number(rejRes.body.data.platformFeeRetained)).toBe(67.5); // 45%

    // Verify 3-entry balanced ledger transaction: Debit Escrow ₹150 == Credit Student Wallet ₹82.50 + Credit Revenue ₹67.50
    const rejTx = await appPrisma.ledgerTransaction.findFirst({
      where: {
        bookingId: b2Id,
        transactionType: 'VISIT_REJECTION_REFUND',
      },
      include: { entries: true },
    });

    expect(rejTx).toBeDefined();
    expect(rejTx?.status).toBe('POSTED');
    expect(rejTx?.entries.length).toBe(3);

    const debits = rejTx!.entries.filter((e) => e.entryType === 'DEBIT');
    const credits = rejTx!.entries.filter((e) => e.entryType === 'CREDIT');

    const totalDebit = debits.reduce((acc, e) => acc + Number(e.amount), 0);
    const totalCredit = credits.reduce((acc, e) => acc + Number(e.amount), 0);

    expect(totalDebit).toBe(150.0);
    expect(totalCredit).toBe(150.0);
  });

  it('11. Lifecycle Scenario C: Past 12-hour deadline automatically transitions to AUTO_EXPIRED with ₹0 refund', async () => {
    // 1. Create a third booking directly in DECISION_PENDING with past deadline
    const b3Res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ propertyId: verifiedPropertyId });

    const b3Id = b3Res.body.data.id;

    // Fast-forward status to DECISION_PENDING with deadline in the past
    const now = Date.now();
    const visitCompletedAt = new Date(now - 13 * 3600000); // 13 hours ago
    const pastDeadline = new Date(visitCompletedAt.getTime() + 12 * 3600000); // exactly 12h later (1 hour ago)
    await appPrisma.bookingRequest.update({
      where: { id: b3Id },
      data: {
        status: 'DECISION_PENDING',
        paymentStatus: 'PAID',
        amountPaid: 150.0,
        visitCompletedAt,
        decisionDeadline: pastDeadline,
      },
    });

    // 2. Student attempts late submission -> must be rejected
    const lateRes = await request(app)
      .post(`/api/v1/bookings/${b3Id}/decision`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ decision: 'ACCEPTED' });

    expect(lateRes.status).toBe(422);
    expect(lateRes.body.error?.message).toMatch(/expired/i);

    // 3. Process expirations via admin endpoint
    const expRes = await request(app)
      .post('/api/v1/admin/bookings/process-expirations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(expRes.status).toBe(200);
    expect(expRes.body.data.expiredCount).toBeGreaterThanOrEqual(1);

    // 4. Verify booking is now AUTO_EXPIRED
    const b3Check = await appPrisma.bookingRequest.findUnique({
      where: { id: b3Id },
    });

    expect(b3Check?.status).toBe('AUTO_EXPIRED');
    expect(b3Check?.studentDecision).toBe('EXPIRED');
    expect(Number(b3Check?.refundAmount)).toBe(0.0);
    expect(Number(b3Check?.platformFeeRetained)).toBe(150.0);
  });
});
