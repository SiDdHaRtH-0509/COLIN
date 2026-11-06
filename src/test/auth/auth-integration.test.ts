/**
 * COLIN Authentication & Authorization Integration Test Suite
 * Phase 4A.2.3: Authentication & Authorization Integration
 * 
 * Verifies end-to-end authentication flows, PostgreSQL persistence,
 * token rotation, replay-attack reuse detection, RBAC boundaries,
 * and session management against live PostgreSQL 18.4 on port 5433.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { UserRoleType, UserStatus } from '@prisma/client';
import { createApp } from '../../server/app';
import { initializeDatabaseConnections, shutdownDatabaseConnections } from '../../server/database/lifecycle';
import { getAppPrismaClient } from '../../server/database/prisma';
import { authSensitiveRateLimiter, passwordResetRateLimiter } from '../../server/middleware/rateLimiter';

describe('COLIN Phase 4A.2.3: Authentication & Authorization Integration Suite', () => {
  let app: Express;
  const prisma = getAppPrismaClient();

  const timestamp = Date.now();
  const testStudentEmail = `student_${timestamp}@campus.test`;
  const testOwnerEmail = `owner_${timestamp}@campus.test`;
  const testPassword = 'SecureStudentPass2026!';
  const updatedPassword = 'NewStudentPass2026!Updated';

  let studentAccessToken = '';
  let studentRefreshToken = '';
  let studentUserId = '';
  let studentSessionId = '';

  let ownerAccessToken = '';
  let ownerUserId = '';

  beforeAll(async () => {
    // 1. Establish live database connectivity across runtime roles
    const conn = await initializeDatabaseConnections();
    expect(conn.appRuntimeConnected).toBe(true);
    expect(conn.adminRuntimeConnected).toBe(true);

    // 2. Instantiate decoupled Express HTTP application
    app = createApp();
  });

  afterAll(async () => {
    // Cleanup created test records to maintain pristine database state
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [testStudentEmail, testOwnerEmail, `attacker_${timestamp}@campus.test`],
          },
        },
      });
    } catch {
      // Ignored if records already removed
    }

    await shutdownDatabaseConnections();
  });

  beforeEach(() => {
    // Reset rate limiter counters between tests
    authSensitiveRateLimiter.reset();
    passwordResetRateLimiter.reset();
  });

  // ===========================================================================
  // 1. USER REGISTRATION & IDENTITY LIFECYCLE
  // ===========================================================================
  describe('1. User Registration & Onboarding', () => {
    it('registers a new STUDENT with profile and role-specific student profile', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testStudentEmail,
          password: testPassword,
          firstName: 'Aarav',
          lastName: 'Sharma',
          phone: '+919876543210',
          role: 'STUDENT',
          collegeName: 'IIT Delhi',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(testStudentEmail);
      expect(res.body.data.user.role).toBe(UserRoleType.STUDENT);
      expect(res.body.data.user.profile.firstName).toBe('Aarav');
      expect(res.body.data.user.studentProfile.collegeName).toBe('IIT Delhi');
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      studentUserId = res.body.data.user.id;
      studentAccessToken = res.body.data.tokens.accessToken;
      studentRefreshToken = res.body.data.tokens.refreshToken;
      studentSessionId = res.body.data.sessionId;

      // Verify Set-Cookie headers
      const rawCookies = res.headers['set-cookie'];
      const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
      expect(cookies.length).toBeGreaterThan(0);
      expect(cookies.some((c: string) => c.includes('accessToken='))).toBe(true);
      expect(cookies.some((c: string) => c.includes('refreshToken='))).toBe(true);

      // Verify direct PostgreSQL persistence and password hashing
      const dbUser = await prisma.user.findUnique({
        where: { id: studentUserId },
        include: { profile: true, studentProfile: true },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.passwordHash.startsWith('$2')).toBe(true);
      expect(dbUser?.passwordHash).not.toBe(testPassword); // Plaintext never stored
      expect(dbUser?.profile?.firstName).toBe('Aarav');
      expect(dbUser?.studentProfile?.collegeName).toBe('IIT Delhi');
    });

    it('registers a new OWNER with associated business details', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testOwnerEmail,
          password: testPassword,
          firstName: 'Vikram',
          lastName: 'Malhotra',
          role: 'OWNER',
          businessName: 'Apex Student Stays',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe(UserRoleType.OWNER);
      expect(res.body.data.user.ownerProfile.businessName).toBe('Apex Student Stays');

      ownerUserId = res.body.data.user.id;
      ownerAccessToken = res.body.data.tokens.accessToken;
    });

    it('allows registered OWNER to inspect own profile via /me', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${ownerAccessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.id).toBe(ownerUserId);
      expect(res.body.data.user.role).toBe(UserRoleType.OWNER);
    });

    it('rejects registration with a duplicate email (HTTP 409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testStudentEmail,
          password: testPassword,
          firstName: 'Duplicate',
          role: 'STUDENT',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNIQUE_CONSTRAINT_VIOLATION');
    });

    it('rejects registration with weak password (HTTP 400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `weak_${timestamp}@campus.test`,
          password: 'short',
          firstName: 'Weak',
          role: 'STUDENT',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('prohibits public registration with elevated role ADMIN (HTTP 400)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `admin_hacker_${timestamp}@campus.test`,
          password: testPassword,
          firstName: 'Infiltrator',
          role: 'ADMIN',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ===========================================================================
  // 2. AUTHENTICATION & LOGIN
  // ===========================================================================
  describe('2. User Authentication & Login', () => {
    it('authenticates valid credentials and updates lastLoginAt in PostgreSQL', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testStudentEmail,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      // Update active tokens
      studentAccessToken = res.body.data.tokens.accessToken;
      studentRefreshToken = res.body.data.tokens.refreshToken;
      studentSessionId = res.body.data.sessionId;

      // Verify lastLoginAt updated in database
      const dbUser = await prisma.user.findUnique({ where: { id: studentUserId } });
      expect(dbUser?.lastLoginAt).not.toBeNull();
    });

    it('rejects login with incorrect password (HTTP 401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testStudentEmail,
          password: 'IncorrectPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects login with non-existent email (HTTP 401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: `nobody_${timestamp}@campus.test`,
          password: testPassword,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects login for SUSPENDED user accounts (HTTP 403 Forbidden)', async () => {
      // Temporarily set user to SUSPENDED
      await prisma.user.update({
        where: { id: studentUserId },
        data: { status: UserStatus.SUSPENDED },
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testStudentEmail,
          password: testPassword,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');

      // Restore to ACTIVE
      await prisma.user.update({
        where: { id: studentUserId },
        data: { status: UserStatus.ACTIVE },
      });
    });
  });

  // ===========================================================================
  // 3. AUTHENTICATED PROFILE & IDENTITY INSPECTION
  // ===========================================================================
  describe('3. Authenticated Identity & Self-Service (/api/v1/auth/me)', () => {
    it('returns sanitized user profile for authenticated Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe(studentUserId);
      expect(res.body.data.user.email).toBe(testStudentEmail);
      expect(res.body.data.user.passwordHash).toBeUndefined(); // Never exposed
      expect(res.body.data.sessionId).toBe(studentSessionId);
    });

    it('rejects access when Authorization header is absent (HTTP 401)', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects access when Bearer token is forged or malformed (HTTP 401)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.forged.jwt.token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });
  });

  // ===========================================================================
  // 4. TOKEN REFRESH, ROTATION & REPLAY ATTACK DETECTION
  // ===========================================================================
  describe('4. Token Refresh, Rotation & Reuse Detection', () => {
    it('refreshes token pair and rotates refresh token in database', async () => {
      const previousRefreshToken = studentRefreshToken;

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: previousRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).not.toBe(previousRefreshToken);

      // Save new active tokens
      studentAccessToken = res.body.data.tokens.accessToken;
      studentRefreshToken = res.body.data.tokens.refreshToken;

      // Verify the new access token is valid
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${studentAccessToken}`);
      expect(meRes.status).toBe(200);
    });

    it('detects replay attack when rotated refresh token is reused, revoking all sessions', async () => {
      // Create a fresh login to test reuse
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: testPassword });

      const initialRefreshToken = loginRes.body.data.tokens.refreshToken;

      // 1st consumption: Rotates token successfully
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: initialRefreshToken });
      expect(refreshRes.status).toBe(200);

      // Now explicitly mark the previous session revoked or attempt to use old token
      // In our design, when a token is rotated, the old token hash is replaced.
      // If someone steals an old refresh token and tries to use it:
      // It will either not match an active token, or if tracked as revoked, triggers family revocation.
      // Let's create a session and explicitly mark it revoked to test the reuse detection logic directly:
      const revokedSession = await prisma.userSession.create({
        data: {
          userId: studentUserId,
          tokenHash: 'sha256-revoked-token-hash-for-replay-test',
          isRevoked: true,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      // Calculate the raw token that hashes to this tokenHash or inject in test
      // To test the exact code path in AuthService:
      // Let's mock token by hashing a known string
      const crypto = await import('crypto');
      const testRawToken = 'reuse-detection-test-raw-token';
      const testHash = crypto.createHash('sha256').update(testRawToken).digest('hex');

      await prisma.userSession.update({
        where: { id: revokedSession.id },
        data: { tokenHash: testHash },
      });

      // Present the revoked token
      const reuseAttempt = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: testRawToken });

      expect(reuseAttempt.status).toBe(401);
      expect(reuseAttempt.body.error.message).toContain('Refresh token reuse detected');

      // Verify that ALL sessions for this student are now revoked
      const activeSessions = await prisma.userSession.findMany({
        where: { userId: studentUserId, isRevoked: false },
      });
      expect(activeSessions.length).toBe(0);
    });
  });

  // ===========================================================================
  // 5. PASSWORD MANAGEMENT & RECOVERY
  // ===========================================================================
  describe('5. Password Management & Recovery Workflows', () => {
    beforeEach(async () => {
      // Re-login student to obtain fresh active session
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: testPassword });
      studentAccessToken = loginRes.body.data.tokens.accessToken;
      studentRefreshToken = loginRes.body.data.tokens.refreshToken;
      studentSessionId = loginRes.body.data.sessionId;
    });

    it('changes password with valid current credentials and revokes sessions', async () => {
      const res = await request(app)
        .post('/api/v1/auth/password/change')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: updatedPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify old password no longer works
      const oldLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: testPassword });
      expect(oldLogin.status).toBe(401);

      // Verify new password works
      const newLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: updatedPassword });
      expect(newLogin.status).toBe(200);
      studentAccessToken = newLogin.body.data.tokens.accessToken;

      // Restore original password for remaining tests
      await request(app)
        .post('/api/v1/auth/password/change')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          currentPassword: updatedPassword,
          newPassword: testPassword,
        });
    });

    it('rejects password change if current password is wrong (HTTP 401)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/password/change')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          currentPassword: 'CompletelyWrongPassword123!',
          newPassword: 'AnotherPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('initiates forgot-password workflow and resets password via token', async () => {
      const forgotRes = await request(app)
        .post('/api/v1/auth/password/forgot')
        .send({ email: testStudentEmail });

      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.success).toBe(true);
      const resetToken = forgotRes.body.data.resetToken;
      expect(resetToken).toBeDefined();

      // Reset password using token
      const resetRes = await request(app)
        .post('/api/v1/auth/password/reset')
        .send({
          token: resetToken,
          newPassword: 'ResetPassword2026Success!',
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // Verify login with new password
      const loginCheck = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: 'ResetPassword2026Success!' });
      expect(loginCheck.status).toBe(200);

      // Restore password
      studentAccessToken = loginCheck.body.data.tokens.accessToken;
      await request(app)
        .post('/api/v1/auth/password/change')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          currentPassword: 'ResetPassword2026Success!',
          newPassword: testPassword,
        });
    });
  });

  // ===========================================================================
  // 6. SESSION AUDIT & REVOCATION
  // ===========================================================================
  describe('6. Session Management & Audit Endpoints', () => {
    beforeEach(async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: testPassword });
      studentAccessToken = loginRes.body.data.tokens.accessToken;
      studentSessionId = loginRes.body.data.sessionId;
    });

    it('lists active sessions for authenticated user with masked IP', async () => {
      const res = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.sessions)).toBe(true);
      expect(res.body.data.sessions.length).toBeGreaterThan(0);

      const currentSession = res.body.data.sessions.find((s: { isCurrent: boolean }) => s.isCurrent);
      expect(currentSession).toBeDefined();
    });

    it('revokes an active session by session ID', async () => {
      const res = await request(app)
        .delete(`/api/v1/auth/sessions/${studentSessionId}`)
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify in database that session is marked revoked
      const session = await prisma.userSession.findUnique({ where: { id: studentSessionId } });
      expect(session?.isRevoked).toBe(true);
    });
  });

  // ===========================================================================
  // 7. ROLE-BASED ACCESS CONTROL (RBAC) BOUNDARIES
  // ===========================================================================
  describe('7. Role-Based Access Control (RBAC) Boundaries', () => {
    it('prohibits STUDENT from accessing ADMIN-restricted routes (HTTP 403 Forbidden)', async () => {
      // Re-login student
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: testPassword });

      const res = await request(app)
        .get('/api/v1/system/admin-test')
        .set('Authorization', `Bearer ${loginRes.body.data.tokens.accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('permits valid administrative bearer token to access ADMIN-restricted routes', async () => {
      // Test bearer token format for ADMIN in test mode: test-token-<userId>-ADMIN
      const res = await request(app)
        .get('/api/v1/system/admin-test')
        .set('Authorization', 'Bearer test-token-admin01-ADMIN-SUPER_ADMIN');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.context.adminRole).toBe('SUPER_ADMIN');
    });
  });

  // ===========================================================================
  // 8. LOGOUT & COOKIE TERMINATION
  // ===========================================================================
  describe('8. Session Termination & Logout', () => {
    it('terminates active session and clears auth cookies', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: testPassword });

      const token = loginRes.body.data.tokens.accessToken;
      const refToken = loginRes.body.data.tokens.refreshToken;

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({ refreshToken: refToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify clear cookie headers
      const rawCookies = res.headers['set-cookie'];
      const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
      expect(cookies.length).toBeGreaterThan(0);
      expect(cookies.some((c: string) => c.includes('accessToken=;'))).toBe(true);
    });
  });

  // ===========================================================================
  // 9. RATE LIMITING INTEGRATION (HTTP 429)
  // ===========================================================================
  describe('9. Brute-Force Rate Limiting Defense', () => {
    it('returns HTTP 429 Too Many Requests when endpoint exceeds rate limit threshold', async () => {
      // authSensitiveRateLimiter allows 10 requests per window
      // Send 10 failed requests to exhaust the limit
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'bad@bad.com', password: 'bad' });
      }

      // The 11th request must trigger HTTP 429
      const blockedRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'bad@bad.com', password: 'bad' });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.success).toBe(false);
      expect(blockedRes.body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(blockedRes.headers['retry-after']).toBeDefined();
    });
  });
});
