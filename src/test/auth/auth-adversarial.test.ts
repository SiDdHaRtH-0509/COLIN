/**
 * COLIN Authentication Security Hardening & Adversarial Audit Suite
 * Phase 4A.2.3.8: Authentication Security Hardening & Independent Acceptance Audit
 * 
 * Verifies critical security properties under adversarial attack conditions:
 * - Refresh token reuse detection on rotated tokens
 * - Race-condition prevention on concurrent refresh attempts
 * - Immediate access token invalidation (logout, session deletion, password change, suspension)
 * - Double-submit cookie CSRF defenses on state mutations
 * - Complete administrative isolation and colin_admin_runtime verification
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { UserRoleType, UserStatus, AdminAccountStatus } from '@prisma/client';
import { createApp } from '../../server/app';
import { initializeDatabaseConnections, shutdownDatabaseConnections } from '../../server/database/lifecycle';
import { getAppPrismaClient, getAdminPrismaClient } from '../../server/database/prisma';
import { PasswordService } from '../../server/auth/password.service';
import { authSensitiveRateLimiter, passwordResetRateLimiter } from '../../server/middleware/rateLimiter';

describe('COLIN Phase 4A.2.3.8: Authentication Adversarial Audit Suite', () => {
  let app: Express;
  const appPrisma = getAppPrismaClient();
  const adminPrisma = getAdminPrismaClient();

  const timestamp = Date.now();
  const testStudentEmail = `adv_student_${timestamp}@campus.test`;
  const testStudentPassword = 'AdvStudentPassword2026!';

  const testAdminUsername = `adv_admin_${timestamp}`;
  const testAdminEmail = `adv_admin_${timestamp}@admin.colin.in`;
  const testAdminPassword = 'AdvSuperAdminPassword2026!';

  let studentUserId = '';

  let adminAccountId = '';
  let adminAccessToken = '';
  let adminSessionId = '';

  beforeAll(async () => {
    // 1. Establish live database connections across runtime roles
    const conn = await initializeDatabaseConnections();
    expect(conn.appRuntimeConnected).toBe(true);
    expect(conn.adminRuntimeConnected).toBe(true);

    // 2. Instantiate application
    app = createApp();

    // 3. Register test student
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testStudentEmail,
        password: testStudentPassword,
        firstName: 'Adversarial',
        lastName: 'Student',
        role: 'STUDENT',
        collegeName: 'IIT Bombay',
      });
    expect(regRes.status).toBe(201);
    studentUserId = regRes.body.data.user.id;
    expect(regRes.body.data.tokens.accessToken).toBeDefined();
    expect(regRes.body.data.tokens.refreshToken).toBeDefined();
    expect(regRes.body.data.sessionId).toBeDefined();

    // 4. Seed test admin account via colin_admin_runtime
    const adminPasswordHash = await PasswordService.hashPassword(testAdminPassword);

    // Ensure SUPER_ADMIN role exists in admin_roles (seeded at migration/bootstrap level)
    const superAdminRole = await adminPrisma.adminRole.findUnique({
      where: { code: 'SUPER_ADMIN' },
    });

    const adminAccount = await adminPrisma.adminAccount.create({
      data: {
        username: testAdminUsername,
        email: testAdminEmail,
        fullName: 'Audit Super Admin',
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
    adminAccountId = adminAccount.id;
  });

  afterAll(async () => {
    // Clean up created student & admin test records
    try {
      if (studentUserId) {
        await appPrisma.user.delete({ where: { id: studentUserId } }).catch(() => {});
      }
      if (adminAccountId) {
        // colin_admin_runtime has REVOKE DELETE on admin_accounts, mark suspended instead
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

  beforeEach(() => {
    authSensitiveRateLimiter.reset();
    passwordResetRateLimiter.reset();
  });

  // ===========================================================================
  // GATE 1: REFRESH TOKEN REPLAY DETECTION & CONCURRENCY
  // ===========================================================================
  describe('Gate 1: Refresh Token Replay Detection & Concurrency Resilience', () => {
    it('detects previously rotated refresh tokens and revokes all user sessions', async () => {
      // Step 1: Login fresh to get a known active refresh token R1
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: testStudentPassword });
      expect(loginRes.status).toBe(200);

      const R1 = loginRes.body.data.tokens.refreshToken;

      // Step 2: Normal legitimate rotation: refresh R1 -> get R2
      const rotateRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: R1 });
      expect(rotateRes.status).toBe(200);
      const R2 = rotateRes.body.data.tokens.refreshToken;
      expect(R2).not.toBe(R1);

      // Verify that R2 is active
      const legitimateMe = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${rotateRes.body.data.tokens.accessToken}`);
      expect(legitimateMe.status).toBe(200);

      // Step 3: Adversary replays old rotated token R1!
      const replayRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: R1 });

      // Must be rejected with 401
      expect(replayRes.status).toBe(401);
      expect(replayRes.body.error.message).toContain('Refresh token reuse detected');

      // Step 4: Verify that family-wide revocation occurred in PostgreSQL
      const activeSessions = await appPrisma.userSession.findMany({
        where: { userId: studentUserId, isRevoked: false },
      });
      expect(activeSessions.length).toBe(0);

      // Step 5: Verify that the legitimate user's active session is also revoked
      const revokedMe = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${rotateRes.body.data.tokens.accessToken}`);
      expect(revokedMe.status).toBe(401);
    });

    it('prevents simultaneous refresh requests with identical token from both succeeding', async () => {
      // Login fresh to get R_race
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: testStudentPassword });
      expect(loginRes.status).toBe(200);
      const R_race = loginRes.body.data.tokens.refreshToken;

      // Launch TWO simultaneous concurrent refresh requests with R_race
      const [res1, res2] = await Promise.all([
        request(app).post('/api/v1/auth/refresh').send({ refreshToken: R_race }),
        request(app).post('/api/v1/auth/refresh').send({ refreshToken: R_race }),
      ]);

      const statuses = [res1.status, res2.status].sort();

      // Exactly ONE request must succeed (200), and the duplicate request must fail (401)
      expect(statuses).toEqual([200, 401]);
    });
  });

  // ===========================================================================
  // GATE 2: IMMEDIATE ACCESS TOKEN REVOCATION
  // ===========================================================================
  describe('Gate 2: Immediate Access Token Revocation', () => {
    it('invalidates access token immediately upon logout (zero 15-minute grace period)', async () => {
      // 1. Login and obtain A1, R1
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: testStudentPassword });
      expect(loginRes.status).toBe(200);

      const A1 = loginRes.body.data.tokens.accessToken;
      const R1 = loginRes.body.data.tokens.refreshToken;

      // 2. Verify A1 works before logout
      const beforeLogout = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${A1}`);
      expect(beforeLogout.status).toBe(200);

      // 3. Perform logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${A1}`)
        .send({ refreshToken: R1 });
      expect(logoutRes.status).toBe(200);

      // 4. Adversary reuses A1 against protected endpoint
      const afterLogout = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${A1}`);

      // Must be immediately rejected!
      expect(afterLogout.status).toBe(401);
      expect(afterLogout.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('invalidates access token immediately upon individual session revocation', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: testStudentPassword });
      const A2 = loginRes.body.data.tokens.accessToken;
      const S2 = loginRes.body.data.sessionId;

      // Revoke session S2 directly
      const revokeRes = await request(app)
        .delete(`/api/v1/auth/sessions/${S2}`)
        .set('Authorization', `Bearer ${A2}`);
      expect(revokeRes.status).toBe(200);

      // Subsequent access with A2 must fail immediately
      const reuseAttempt = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${A2}`);
      expect(reuseAttempt.status).toBe(401);
    });

    it('invalidates access token immediately upon password change', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: testStudentPassword });
      const A3 = loginRes.body.data.tokens.accessToken;

      const newPass = 'BrandNewPassword2026!Updated';

      // Change password
      const changeRes = await request(app)
        .post('/api/v1/auth/password/change')
        .set('Authorization', `Bearer ${A3}`)
        .send({
          currentPassword: testStudentPassword,
          newPassword: newPass,
        });
      expect(changeRes.status).toBe(200);

      // Reuse A3 -> Must be rejected immediately!
      const reuseA3 = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${A3}`);
      expect(reuseA3.status).toBe(401);

      // Restore password
      const reLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: newPass });
      await request(app)
        .post('/api/v1/auth/password/change')
        .set('Authorization', `Bearer ${reLogin.body.data.tokens.accessToken}`)
        .send({
          currentPassword: newPass,
          newPassword: testStudentPassword,
        });
    });

    it('invalidates access token immediately upon user account suspension', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: testStudentPassword });
      const A4 = loginRes.body.data.tokens.accessToken;

      // Suspend user in PostgreSQL
      await appPrisma.user.update({
        where: { id: studentUserId },
        data: { status: UserStatus.SUSPENDED },
      });

      // Attempt to access with A4
      const suspendedAttempt = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${A4}`);
      expect(suspendedAttempt.status).toBe(401);

      // Restore account to ACTIVE
      await appPrisma.user.update({
        where: { id: studentUserId },
        data: { status: UserStatus.ACTIVE },
      });
    });
  });

  // ===========================================================================
  // GATE 3: CREDENTIAL DELIVERY & CSRF PROTECTION
  // ===========================================================================
  describe('Gate 3: Cookie-Based Authentication & CSRF Protection', () => {
    it('sets HttpOnly access/refresh cookies and returns readable CSRF cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: testStudentPassword });

      expect(res.status).toBe(200);

      const rawCookies = res.headers['set-cookie'];
      const cookies = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];

      expect(cookies.some((c: string) => c.includes('accessToken=') && c.includes('HttpOnly'))).toBe(true);
      expect(cookies.some((c: string) => c.includes('refreshToken=') && c.includes('HttpOnly'))).toBe(true);
      expect(cookies.some((c: string) => c.includes('csrfToken=') && !c.includes('HttpOnly'))).toBe(true);
    });

    it('rejects state mutation without CSRF token when authenticated via cookie', async () => {
      // Login and extract cookies
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: testStudentPassword });

      const rawCookies = loginRes.headers['set-cookie'];
      const cookieHeader = Array.isArray(rawCookies) ? rawCookies.map((c: string) => c.split(';')[0]).join('; ') : '';

      // Send mutation POST with cookie but WITHOUT X-CSRF-Token header
      const attackRes = await request(app)
        .post('/api/v1/auth/password/change')
        .set('Cookie', cookieHeader)
        .send({
          currentPassword: testStudentPassword,
          newPassword: 'SomeOtherPassword123!',
        });

      // Must be rejected with HTTP 403 CSRF_TOKEN_INVALID
      expect(attackRes.status).toBe(403);
      expect(attackRes.body.error.code).toBe('CSRF_TOKEN_INVALID');
    });

    it('rejects state mutation with forged or mismatched CSRF token header', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: testStudentPassword });

      const rawCookies = loginRes.headers['set-cookie'];
      const cookieHeader = Array.isArray(rawCookies) ? rawCookies.map((c: string) => c.split(';')[0]).join('; ') : '';

      // Send mutation with wrong X-CSRF-Token header
      const attackRes = await request(app)
        .post('/api/v1/auth/password/change')
        .set('Cookie', cookieHeader)
        .set('X-CSRF-Token', 'forged-attacker-csrf-token')
        .send({
          currentPassword: testStudentPassword,
          newPassword: 'SomeOtherPassword123!',
        });

      expect(attackRes.status).toBe(403);
      expect(attackRes.body.error.code).toBe('CSRF_TOKEN_INVALID');
    });

    it('permits state mutation with matching CSRF double-submit token', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: testStudentPassword });

      const rawCookies = loginRes.headers['set-cookie'];
      const cookieHeader = Array.isArray(rawCookies) ? rawCookies.map((c: string) => c.split(';')[0]).join('; ') : '';

      // Extract csrfToken value from set-cookie
      const csrfCookie = (Array.isArray(rawCookies) ? rawCookies : []).find((c: string) => c.includes('csrfToken='));
      const csrfValue = csrfCookie ? csrfCookie.split('csrfToken=')[1].split(';')[0] : '';

      const validRes = await request(app)
        .post('/api/v1/auth/password/change')
        .set('Cookie', cookieHeader)
        .set('X-CSRF-Token', csrfValue)
        .send({
          currentPassword: testStudentPassword,
          newPassword: testStudentPassword, // Same password so no state change
        });

      // Passes CSRF validation (returns 200)
      expect(validRes.status).toBe(200);
    });

    it('exempts explicit Authorization: Bearer requests from CSRF header requirements', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testStudentEmail, password: testStudentPassword });

      const token = loginRes.body.data.tokens.accessToken;

      // Mutation using Bearer token without CSRF token header
      const res = await request(app)
        .post('/api/v1/auth/password/change')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: testStudentPassword,
          newPassword: testStudentPassword,
        });

      expect(res.status).toBe(200);
    });
  });

  // ===========================================================================
  // GATE 5: ADMINISTRATIVE AUTHENTICATION ISOLATION
  // ===========================================================================
  describe('Gate 5: Administrative Authentication & Database Isolation', () => {
    it('authenticates administrator credentials via isolated colin_admin_runtime', async () => {
      const res = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({
          identifier: testAdminUsername,
          password: testAdminPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.admin.username).toBe(testAdminUsername);
      expect(res.body.data.admin.primaryRole).toBe('SUPER_ADMIN');

      adminAccessToken = res.body.data.tokens.accessToken;
      adminSessionId = res.body.data.sessionId;

      // Verify that admin_audit_logs record was written via colin_admin_runtime
      const auditLog = await adminPrisma.adminAuditLog.findFirst({
        where: { adminId: adminAccountId, action: 'ADMIN_LOGIN_SUCCESS' },
      });
      expect(auditLog).not.toBeNull();
    });

    it('rejects regular STUDENT credentials on administrative login endpoint (HTTP 401)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({
          identifier: testStudentEmail,
          password: testStudentPassword,
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('permits authenticated ADMIN to access protected administrative system route', async () => {
      const res = await request(app)
        .get('/api/v1/system/admin-test')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.accessGranted).toBe(true);
      expect(res.body.data.context.role).toBe(UserRoleType.ADMIN);
    });

    it('rejects administrative access when admin session is revoked in database', async () => {
      // Mark admin session revoked in admin_sessions table
      await adminPrisma.adminSession.update({
        where: { id: adminSessionId },
        data: { isRevoked: true },
      });

      // Attempt to access administrative endpoint
      const res = await request(app)
        .get('/api/v1/system/admin-test')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects administrative access when admin account is suspended', async () => {
      // Create fresh admin session
      const loginRes = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({
          identifier: testAdminUsername,
          password: testAdminPassword,
        });
      const freshToken = loginRes.body.data.tokens.accessToken;

      // Suspend admin account in admin_accounts
      await adminPrisma.adminAccount.update({
        where: { id: adminAccountId },
        data: { status: AdminAccountStatus.SUSPENDED },
      });

      // Attempt access with fresh token
      const res = await request(app)
        .get('/api/v1/system/admin-test')
        .set('Authorization', `Bearer ${freshToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');

      // Restore admin account
      await adminPrisma.adminAccount.update({
        where: { id: adminAccountId },
        data: { status: AdminAccountStatus.ACTIVE },
      });
    });

    it('strictly prohibits colin_app_runtime from accessing admin_accounts table (42501)', async () => {
      await expect(
        appPrisma.adminAccount.findMany()
      ).rejects.toThrow();
    });
  });
});
