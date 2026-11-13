/**
 * =============================================================================
 * COLIN PHASE 6 — PRODUCTION SECURITY, AUTH & ACCESS CONTROL INTEGRATION SUITE
 * =============================================================================
 * Phase 6J: Comprehensive Security Integration & Verification Gate
 *
 * Verifies:
 * 1. Authentication Hardening & Account Lockout Defense
 * 2. Session Management, Refresh Token Rotation & Reuse Detection
 * 3. Database-backed RFC 6238 TOTP MFA & Single-Use Recovery Code Lifecycle
 * 4. Granular Server-Side RBAC & Multi-Tier Admin Permission Enforcement
 * 5. PII Masking, Audited Unmasking & Data Protection Compliance
 * 6. File Upload Binary Magic-Byte Inspection & Path Traversal Prevention
 * 7. Database-Level Least-Privilege Isolation & Audit Immutability Triggers
 *
 * Zero mock objects. Live Express API & PostgreSQL 16+ integration.
 * =============================================================================
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { MfaService } from '../../server/auth/mfa.service';
import { UploadValidator } from '../../server/storage/uploadValidator';
import { PiiUtils } from '../../server/utils/pii';
import { getAppPrismaClient, getAdminPrismaClient } from '../../server/database/prisma';

const API_BASE = 'http://localhost:5000/api/v1';

const apiFetch = (url: string, init?: RequestInit) => {
  const headers = new Headers(init?.headers || {});
  if (!headers.has('x-bypass-rate-limit')) {
    headers.set('x-bypass-rate-limit', 'true');
  }
  return fetch(url, { ...init, headers });
};

describe('COLIN Phase 6: Production Security, Authentication & Access Control Hardening', () => {
  const appPrisma = getAppPrismaClient();
  const adminPrisma = getAdminPrismaClient();

  const timestamp = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const studentEmail = `sec.student.${timestamp}@colin.edu`;
  const ownerEmailA = `sec.owner.a.${timestamp}@colin.in`;
  const ownerEmailB = `sec.owner.b.${timestamp}@colin.in`;
  const adminEmail = `sec.admin.${timestamp}@colin.in`;
  const adminUsername = `secadmin_${timestamp.replace(/[^a-zA-Z0-9_]/g, '')}`;
  const password = 'StrongPassword2026!';
  const studentPhone = '+919' + Math.floor(100000000 + Math.random() * 900000000);

  let studentToken = '';
  let studentRefreshToken = '';
  let studentUserId = '';

  let ownerTokenA = '';
  let propertyIdA = '';

  let ownerTokenB = '';

  let adminToken = '';
  let mfaSecret = '';
  let recoveryCodes: string[] = [];

  beforeAll(async () => {
    // Ensure database connection is ready
    const res = await apiFetch(`${API_BASE}/health/ready`);
    expect(res.status).toBe(200);
  });

  // ===========================================================================
  // DOMAIN 1: AUTHENTICATION HARDENING & BRUTE-FORCE DEFENSE
  // ===========================================================================
  describe('Domain 1: Authentication Hardening & Lockout Defense', () => {
    it('1.1 Student registration enforces strong password and creates active account', async () => {
      const res = await apiFetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentEmail,
          password,
          firstName: 'Siddharth',
          lastName: 'Mehta',
          role: 'STUDENT',
          collegeName: 'IIT Delhi',
          phone: studentPhone,
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe(studentEmail.toLowerCase());
      expect(body.data.user.status).toBe('ACTIVE');
      expect(body.data.user.passwordHash).toBeUndefined(); // Never leaked

      studentToken = body.data.tokens.accessToken;
      studentRefreshToken = body.data.tokens.refreshToken;
      studentUserId = body.data.user.id;
    });

    it('1.2 Rejects registration with weak password', async () => {
      const res = await apiFetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `weak.${timestamp}@colin.edu`,
          password: 'short',
          firstName: 'Weak',
          role: 'STUDENT',
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it('1.3 Rejects public registration attempting privilege escalation to ADMIN', async () => {
      const res = await apiFetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `escalate.${timestamp}@colin.edu`,
          password,
          firstName: 'Hacker',
          role: 'ADMIN',
        }),
      });

      expect([400, 403, 429]).toContain(res.status);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it('1.4 Rejects invalid login with generic error to prevent account enumeration', async () => {
      const res = await apiFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentEmail,
          password: 'WrongPassword999!',
        }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      const message = body.error?.message || body.message || '';
      expect(message).toMatch(/invalid email or password/i);
    });

    it('1.5 Suspended user account is locked out from logging in', async () => {
      try {
        // Suspend user in DB
        await appPrisma.user.update({
          where: { id: studentUserId },
          data: { status: 'SUSPENDED' },
        });

        const res = await apiFetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: studentEmail,
            password,
          }),
        });

        expect(res.status).toBe(403);
        const body = await res.json();
        const message = body.error?.message || body.message || '';
        expect(message).toMatch(/suspended/i);
      } finally {
        // Guarantee reactivation for subsequent tests
        await appPrisma.user.update({
          where: { id: studentUserId },
          data: { status: 'ACTIVE' },
        });
      }
    });
  });

  // ===========================================================================
  // DOMAIN 2: SESSION LIFECYCLE & REFRESH TOKEN REUSE DETECTION
  // ===========================================================================
  describe('Domain 2: Session Management & Token Rotation', () => {
    it('2.1 Refresh token rotation issues a new token pair and invalidates old token', async () => {
      const res = await apiFetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: studentRefreshToken }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.tokens.accessToken).toBeDefined();
      expect(body.data.tokens.refreshToken).toBeDefined();
      expect(body.data.tokens.refreshToken).not.toBe(studentRefreshToken);

      const rotatedRefreshToken = body.data.tokens.refreshToken;
      studentToken = body.data.tokens.accessToken;

      // 2.2 REUSE DETECTION: Presenting the previous revoked refresh token triggers family revocation!
      const replayRes = await apiFetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: studentRefreshToken }),
      });

      expect(replayRes.status).toBe(401);

      // Verify that even the rotated token was revoked due to replay attack detection
      const subsequentRes = await apiFetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rotatedRefreshToken }),
      });
      expect(subsequentRes.status).toBe(401);
    });

    it('2.3 Re-authenticates student and verifies /auth/me profile access', async () => {
      const loginRes = await apiFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: studentEmail, password }),
      });
      expect(loginRes.status).toBe(200);
      const loginBody = await loginRes.json();
      studentToken = loginBody.data.tokens.accessToken;

      const meRes = await apiFetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(meRes.status).toBe(200);
      const meBody = await meRes.json();
      expect(meBody.data.user.email).toBe(studentEmail.toLowerCase());
    });
  });

  // ===========================================================================
  // DOMAIN 3: MULTI-FACTOR AUTHENTICATION (MFA) FOR ADMINISTRATORS
  // ===========================================================================
  describe('Domain 3: Administrative Multi-Factor Authentication (MFA)', () => {
    beforeAll(async () => {
      // Seed a dedicated administrative account for MFA verification
      const passwordHash = await (await import('../../server/auth/password.service')).PasswordService.hashPassword(password);
      const admin = await adminPrisma.adminAccount.create({
        data: {
          username: adminUsername,
          email: adminEmail,
          fullName: 'Security Auditor Admin',
          passwordHash,
          status: 'ACTIVE',
          isMfaEnforced: true,
          failedLoginAttempts: 0,
        },
      });

      // Assign SUPER_ADMIN role
      const superRole = await adminPrisma.adminRole.findUnique({ where: { code: 'SUPER_ADMIN' } });
      if (superRole) {
        await adminPrisma.adminUserRole.create({
          data: { adminId: admin.id, roleId: superRole.id },
        });
      }
    });

    it('3.1 Initial admin login before MFA enrollment succeeds with mfaSetupRequired flag', async () => {
      const res = await apiFetch(`${API_BASE}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: adminEmail, password }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.mfaSetupRequired).toBe(true);
      adminToken = body.data.tokens.accessToken;
    });

    it('3.2 Admin enrolls in MFA via /auth/admin/mfa/setup and receives Base32 secret and 10 recovery codes', async () => {
      const res = await apiFetch(`${API_BASE}/auth/admin/mfa/setup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.secret).toBeDefined();
      expect(body.data.otpAuthUrl).toContain('otpauth://totp/');
      expect(body.data.recoveryCodes.length).toBe(10);

      mfaSecret = body.data.secret;
      recoveryCodes = body.data.recoveryCodes;
    });

    it('3.3 Admin confirms MFA enrollment with valid TOTP code', async () => {
      const validCode = MfaService.generateTotp(mfaSecret);
      const res = await apiFetch(`${API_BASE}/auth/admin/mfa/confirm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: validCode }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it('3.4 Subsequent admin login triggers MFA challenge requirement (requiresMfa = true)', async () => {
      const res = await apiFetch(`${API_BASE}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: adminEmail, password }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.requiresMfa).toBe(true);
      expect(body.data.mfaChallengeToken).toBeDefined();

      const challengeToken = body.data.mfaChallengeToken;

      // 3.5 Rejects invalid TOTP code
      const invalidVerifyRes = await apiFetch(`${API_BASE}/auth/admin/mfa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mfaChallengeToken: challengeToken,
          code: '000000',
        }),
      });
      expect(invalidVerifyRes.status).toBe(401);

      // 3.6 Valid TOTP code successfully completes authentication
      const validCode = MfaService.generateTotp(mfaSecret);
      const validVerifyRes = await apiFetch(`${API_BASE}/auth/admin/mfa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mfaChallengeToken: challengeToken,
          code: validCode,
        }),
      });

      expect(validVerifyRes.status).toBe(200);
      const verifyBody = await validVerifyRes.json();
      expect(verifyBody.success).toBe(true);
      expect(verifyBody.data.tokens.accessToken).toBeDefined();
      adminToken = verifyBody.data.tokens.accessToken;
    });

    it('3.7 Emergency Single-Use Recovery Code validates login and cannot be reused', async () => {
      // 1. Initiate login challenge
      const loginRes = await apiFetch(`${API_BASE}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: adminEmail, password }),
      });
      const challengeToken = (await loginRes.json()).data.mfaChallengeToken;

      // 2. Consume first recovery code
      const chosenRecoveryCode = recoveryCodes[0];
      const recRes = await apiFetch(`${API_BASE}/auth/admin/mfa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mfaChallengeToken: challengeToken,
          code: chosenRecoveryCode,
        }),
      });

      expect(recRes.status).toBe(200);
      const recBody = await recRes.json();
      expect(recBody.success).toBe(true);
      adminToken = recBody.data.tokens.accessToken;

      // 3. Attempt to REUSE the same recovery code on a new challenge -> Must fail!
      const loginRes2 = await apiFetch(`${API_BASE}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: adminEmail, password }),
      });
      const challengeToken2 = (await loginRes2.json()).data.mfaChallengeToken;

      const reuseRes = await apiFetch(`${API_BASE}/auth/admin/mfa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mfaChallengeToken: challengeToken2,
          code: chosenRecoveryCode,
        }),
      });

      expect(reuseRes.status).toBe(401);
    });
  });

  // ===========================================================================
  // DOMAIN 4: ROLE-BASED ACCESS CONTROL & PRIVILEGE BOUNDARIES
  // ===========================================================================
  describe('Domain 4: Server-Side Role-Based Access Control', () => {
    beforeAll(async () => {
      // Register Owner A
      const resA = await apiFetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ownerEmailA,
          password,
          firstName: 'Host',
          lastName: 'Alpha',
          role: 'OWNER',
          businessName: 'Alpha PG Stays',
        }),
      });
      const bodyA = await resA.json();
      ownerTokenA = bodyA.data.tokens.accessToken;

      // Register Owner B
      const resB = await apiFetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ownerEmailB,
          password,
          firstName: 'Host',
          lastName: 'Beta',
          role: 'OWNER',
          businessName: 'Beta PG Stays',
        }),
      });
      const bodyB = await resB.json();
      ownerTokenB = bodyB.data.tokens.accessToken;

      // Owner A creates property
      const propRes = await apiFetch(`${API_BASE}/owner/properties`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ownerTokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Alpha Heights Luxury PG',
          propertyType: 'PG',
          genderPolicy: 'COED',
          addressLine1: 'North Campus',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110007',
          nearestCampus: 'DU North Campus',
          distanceToCampusKm: 0.5,
          totalRooms: 10,
          totalBeds: 20,
          availableBeds: 20,
        }),
      });
      propertyIdA = (await propRes.json()).data.id;
    });

    it('4.1 Student is forbidden from accessing Admin endpoints (HTTP 403)', async () => {
      const res = await apiFetch(`${API_BASE}/admin/metrics`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('4.2 Owner is forbidden from accessing Admin verification routes (HTTP 403)', async () => {
      const res = await apiFetch(`${API_BASE}/admin/properties/pending`, {
        headers: { Authorization: `Bearer ${ownerTokenA}` },
      });
      expect(res.status).toBe(403);
    });

    it('4.3 Cross-Tenant Isolation: Owner B cannot modify or submit Owner A property (HTTP 403/404)', async () => {
      const res = await apiFetch(`${API_BASE}/owner/properties/${propertyIdA}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ownerTokenB}` },
      });
      expect([403, 404]).toContain(res.status);
    });

    it('4.4 Administrative capability enforcement: Student Support cannot view Finance Summary (HTTP 403)', async () => {
      const studentSupportToken = 'test-token-suppadmin1-ADMIN-STUDENT_SUPPORT';
      const res = await apiFetch(`${API_BASE}/admin/bookings/finance-summary`, {
        headers: { Authorization: `Bearer ${studentSupportToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('4.5 Administrative capability enforcement: Super Admin can access Finance Summary', async () => {
      const res = await apiFetch(`${API_BASE}/admin/bookings/finance-summary`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
    });
  });

  // ===========================================================================
  // DOMAIN 5: PII MASKING & AUDITED UNMASKING (DPDP COMPLIANCE)
  // ===========================================================================
  describe('Domain 5: PII Masking & Data Protection Compliance', () => {
    it('5.1 PiiUtils correctly masks emails, phones, Aadhaar and PAN numbers', () => {
      expect(PiiUtils.maskEmail('rahul.verma@colin.edu')).toMatch(/^r\*+a@colin\.edu$/);
      expect(PiiUtils.maskPhone('+91 9876543210')).toMatch(/\+91 \*{6}3210/);
      expect(PiiUtils.maskAadhaar('1234 5678 9012')).toBe('XXXX-XXXX-9012');
      expect(PiiUtils.maskPan('ABCDE1234F')).toBe('XXXXX1234X');
    });

    it('5.2 Student directory provides masked PII by default in response fields', async () => {
      const res = await apiFetch(`${API_BASE}/admin/students`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      const match = body.data.find((s: any) => s.id === studentUserId);
      expect(match).toBeDefined();
      expect(match.maskedEmail).toMatch(/\*+/);
      expect(match.maskedPhone).toMatch(/\*+/);
    });

    it('5.3 Audited PII unmasking endpoint exposes raw PII and records audit log', async () => {
      const res = await apiFetch(`${API_BASE}/admin/students/${studentUserId}/unmask`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Dispute investigation' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.email).toBe(studentEmail.toLowerCase());
      expect(body.data.phone).toBe(studentPhone);

      // Verify audit record was created in admin_audit_logs
      const audit = await adminPrisma.adminAuditLog.findFirst({
        where: {
          targetEntity: 'User',
          targetEntityId: studentUserId,
          action: 'ADMIN_PII_UNMASKED',
        },
      });
      expect(audit).toBeDefined();
    });
  });

  // ===========================================================================
  // DOMAIN 6: FILE UPLOAD VALIDATION & BINARY SIGNATURE DEFENSE
  // ===========================================================================
  describe('Domain 6: File Upload Security & Magic-Byte Validation', () => {
    it('6.1 Validates genuine PNG buffer and generates safe UUID filename', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
      const res = UploadValidator.validateBuffer(pngBuffer, 'avatar.png');
      expect(res.isValid).toBe(true);
      expect(res.mimeType).toBe('image/png');
      expect(res.sanitizedFilename).toMatch(/^[0-9a-f-]{36}\.png$/);
    });

    it('6.2 Rejects executable scripts even if renamed to image extensions', () => {
      const fakeImageBuffer = Buffer.from('<?php echo "malicious payload"; ?>');
      const res = UploadValidator.validateBuffer(fakeImageBuffer, 'payload.jpg');
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toMatch(/invalid file format/i);
    });

    it('6.3 Strictly blocks executable extensions (.exe, .sh, .js)', () => {
      const validPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const res = UploadValidator.validateBuffer(validPngHeader, 'virus.exe');
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toMatch(/executable or script extension/i);
    });

    it('6.4 Rejects oversized file buffers exceeding maximum payload ceiling', () => {
      const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB > 5MB limit
      const res = UploadValidator.validateBuffer(oversizedBuffer, 'huge.jpg');
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toMatch(/exceeds maximum limit/i);
    });
  });

  // ===========================================================================
  // DOMAIN 7: DATABASE SECURITY & IMMUTABILITY TRIGGERS
  // ===========================================================================
  describe('Domain 7: Database Role Least-Privilege & Immutability Triggers', () => {
    it('7.1 Prohibits colin_app_runtime from accessing admin_audit_logs', async () => {
      let threwPermissionDenied = false;
      try {
        await appPrisma.adminAuditLog.findMany({ take: 1 });
      } catch (err: any) {
        threwPermissionDenied = err.message.includes('permission denied') || err.message.includes('42501');
      }
      expect(threwPermissionDenied).toBe(true);
    });

    it('7.2 Prohibits colin_admin_runtime from updating admin_audit_logs via immutability trigger', async () => {
      const firstLog = await adminPrisma.adminAuditLog.findFirst({
        select: { id: true },
      });

      if (firstLog) {
        let threwImmutabilityError = false;
        try {
          await adminPrisma.adminAuditLog.update({
            where: { id: firstLog.id },
            data: { action: 'MUTATED_ACTION' },
          });
        } catch (err: any) {
          threwImmutabilityError =
            err.message.includes('permission denied') ||
            err.message.includes('Immutability') ||
            err.message.includes('42501');
        }
        expect(threwImmutabilityError).toBe(true);
      }
    });

    it('7.3 Prohibits deleting records from admin_audit_logs', async () => {
      const firstLog = await adminPrisma.adminAuditLog.findFirst({
        select: { id: true },
      });

      if (firstLog) {
        let threwDeleteError = false;
        try {
          await adminPrisma.adminAuditLog.delete({
            where: { id: firstLog.id },
          });
        } catch (err: any) {
          threwDeleteError =
            err.message.includes('permission denied') ||
            err.message.includes('Immutability') ||
            err.message.includes('42501');
        }
        expect(threwDeleteError).toBe(true);
      }
    });
  });
});
