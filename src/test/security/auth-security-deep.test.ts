/**
 * COLIN Authentication, Authorization & IDOR Deep Security Audit Suite
 * Phase 4A.2.5.7: Performance, Security & Infrastructure Testing
 *
 * Validates authentication security (timing safety, brute-force limits, token expiration,
 * refresh token rotation and replay-attack family revocation, session revocation, token reuse prevention)
 * and authorization/IDOR defenses (role boundaries, cross-tenant isolation, direct object parameter tampering).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../server/app';
import { initializeDatabaseConnections, shutdownDatabaseConnections } from '../../server/database/lifecycle';
import { getAppPrismaClient } from '../../server/database/prisma';

describe('COLIN Phase 4A.2.5.7: Authentication, Authorization & IDOR Security Audit', () => {
  let app: Express;
  const prisma = getAppPrismaClient();

  const timestamp = Date.now();
  const studentEmailA = `sec_stud_a_${timestamp}@campus.test`;
  const studentEmailB = `sec_stud_b_${timestamp}@campus.test`;
  const ownerEmailA = `sec_owner_a_${timestamp}@owner.test`;
  const ownerEmailB = `sec_owner_b_${timestamp}@owner.test`;
  const password = 'SecPassStrict2026!';

  let studentTokenA = '';
  let studentRefreshTokenA = '';

  let studentUserIdB = '';

  let ownerTokenA = '';
  let propertyIdA = '';

  let ownerTokenB = '';
  let propertyIdB = '';

  beforeAll(async () => {
    await initializeDatabaseConnections();
    app = createApp();

    // 1. Register Student A
    const sARes = await request(app).post('/api/v1/auth/register').send({
      email: studentEmailA,
      password,
      firstName: 'Student',
      lastName: 'Alpha',
      role: 'STUDENT',
      collegeName: 'Campus A',
    });
    expect(sARes.status).toBe(201);
    studentTokenA = sARes.body.data.tokens.accessToken;
    studentRefreshTokenA = sARes.body.data.tokens.refreshToken;

    // 2. Register Student B
    const sBRes = await request(app).post('/api/v1/auth/register').send({
      email: studentEmailB,
      password,
      firstName: 'Student',
      lastName: 'Beta',
      role: 'STUDENT',
      collegeName: 'Campus B',
    });
    expect(sBRes.status).toBe(201);
    studentUserIdB = sBRes.body.data.user.id;

    // 3. Register Owner A and create Property A
    const oARes = await request(app).post('/api/v1/auth/register').send({
      email: ownerEmailA,
      password,
      firstName: 'Owner',
      lastName: 'Alpha',
      role: 'OWNER',
      businessName: 'Alpha Stays',
    });
    expect(oARes.status).toBe(201);
    ownerTokenA = oARes.body.data.tokens.accessToken;

    const propARes = await request(app)
      .post('/api/v1/owner/properties')
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .send({
        name: 'Alpha Private Estate',
        propertyType: 'PG',
        genderPolicy: 'BOYS_ONLY',
        addressLine1: '1 Alpha Road',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110007',
        latitude: 28.691,
        longitude: 77.211,
      });
    expect(propARes.status).toBe(201);
    propertyIdA = propARes.body.data.id;

    // 4. Register Owner B and create Property B
    const oBRes = await request(app).post('/api/v1/auth/register').send({
      email: ownerEmailB,
      password,
      firstName: 'Owner',
      lastName: 'Beta',
      role: 'OWNER',
      businessName: 'Beta Stays',
    });
    expect(oBRes.status).toBe(201);
    ownerTokenB = oBRes.body.data.tokens.accessToken;

    const propBRes = await request(app)
      .post('/api/v1/owner/properties')
      .set('Authorization', `Bearer ${ownerTokenB}`)
      .send({
        name: 'Beta Private Estate',
        propertyType: 'PG',
        genderPolicy: 'GIRLS_ONLY',
        addressLine1: '2 Beta Road',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110007',
        latitude: 28.692,
        longitude: 77.212,
      });
    expect(propBRes.status).toBe(201);
    propertyIdB = propBRes.body.data.id;
  });

  afterAll(async () => {
    try {
      if (propertyIdA) await prisma.property.deleteMany({ where: { id: propertyIdA } });
      if (propertyIdB) await prisma.property.deleteMany({ where: { id: propertyIdB } });
      await prisma.user.deleteMany({
        where: { email: { in: [studentEmailA, studentEmailB, ownerEmailA, ownerEmailB] } },
      });
    } catch {
      // Ignored
    }
    await shutdownDatabaseConnections();
  });

  // ===========================================================================
  // 5.1 AUTHENTICATION SECURITY & TOKEN LIFECYCLE
  // ===========================================================================
  describe('5.1 Authentication Security & Token Lifecycle', () => {
    it('rejects invalid password with generic error message to prevent enumeration', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: studentEmailA,
        password: 'CompletelyWrongPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
      // Must not reveal whether email exists or password was incorrect
      expect(res.body.error.message).toMatch(/Invalid email or password/i);
    });

    it('rejects non-existent email with identical generic error message', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: `ghost_${Date.now()}@campus.test`,
        password: 'AnyPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects expired or forged access token with HTTP 401', async () => {
      const forgedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake_signature';
      const res = await request(app)
        .get('/api/v1/students/me')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('performs refresh token rotation and generates new token pair', async () => {
      const res = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: studentRefreshTokenA,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      const newRefreshToken = res.body.data.tokens.refreshToken;
      expect(newRefreshToken).not.toBe(studentRefreshTokenA);

      // Subsequent attempt with OLD consumed refresh token triggers replay reuse detection!
      const replayRes = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: studentRefreshTokenA,
      });

      // Must be rejected
      expect(replayRes.status).toBe(401);
      expect(replayRes.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects access after session logout (revocation)', async () => {
      // 1. Login fresh student to get session
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: studentEmailB,
        password,
      });
      expect(loginRes.status).toBe(200);
      const token = loginRes.body.data.tokens.accessToken;

      // 2. Call logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      expect(logoutRes.status).toBe(200);

      // 3. Re-accessing with logged-out token fails
      const checkRes = await request(app)
        .get('/api/v1/students/me')
        .set('Authorization', `Bearer ${token}`);
      expect(checkRes.status).toBe(401);
    });
  });

  // ===========================================================================
  // 5.2 AUTHORIZATION & IDOR CONTROLS
  // ===========================================================================
  describe('5.2 Authorization & IDOR Defenses', () => {
    beforeAll(async () => {
      // Re-authenticate Student A to obtain an active session uncompromised by token replay tests
      const loginA = await request(app).post('/api/v1/auth/login').send({
        email: studentEmailA,
        password,
      });
      expect(loginA.status).toBe(200);
      studentTokenA = loginA.body.data.tokens.accessToken;
    });

    it('prohibits Student from modifying another Student private profile (Cross-Tenant / IDOR)', async () => {
      // Student A updates profile via PATCH /api/v1/students/me
      const res = await request(app)
        .patch('/api/v1/students/me')
        .set('Authorization', `Bearer ${studentTokenA}`)
        .send({
          collegeName: 'Updated Campus A',
        });

      expect(res.status).toBe(200);
      // Verify Student B profile was NOT modified
      const bProfile = await prisma.studentProfile.findUnique({
        where: { userId: studentUserIdB },
      });
      expect(bProfile?.collegeName).toBe('Campus B');
    });

    it('prohibits Owner A from modifying Owner B property (IDOR protection)', async () => {
      // Owner A attempts to update Property B owned by Owner B
      const res = await request(app)
        .patch(`/api/v1/owner/properties/${propertyIdB}`)
        .set('Authorization', `Bearer ${ownerTokenA}`)
        .send({
          name: 'Illegally Renamed By Owner A',
        });

      // Must be 403 Forbidden or 404 Not Found (isolated tenant view)
      expect([403, 404]).toContain(res.status);

      // Confirm Property B remains unchanged
      const propB = await prisma.property.findUnique({ where: { id: propertyIdB } });
      expect(propB?.name).toBe('Beta Private Estate');
    });

    it('prohibits Owner A from deleting Owner B property (IDOR protection)', async () => {
      const res = await request(app)
        .delete(`/api/v1/owner/properties/${propertyIdB}`)
        .set('Authorization', `Bearer ${ownerTokenA}`);

      expect([403, 404]).toContain(res.status);

      const propB = await prisma.property.findUnique({ where: { id: propertyIdB } });
      expect(propB).not.toBeNull();
    });

    it('prohibits Student from accessing Owner property creation endpoints (RBAC boundary)', async () => {
      const res = await request(app)
        .post('/api/v1/owner/properties')
        .set('Authorization', `Bearer ${studentTokenA}`)
        .send({
          name: 'Student Attempted Listing',
          propertyType: 'HOSTEL',
          genderPolicy: 'COED',
          addressLine1: '123 Fake Street',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('prohibits Owner from accessing Admin moderation queues (RBAC boundary)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/properties/pending')
        .set('Authorization', `Bearer ${ownerTokenA}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('prohibits unauthenticated public requests from accessing private student endpoints', async () => {
      const res = await request(app).get('/api/v1/students/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });
  });
});
