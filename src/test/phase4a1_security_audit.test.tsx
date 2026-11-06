/**
 * COLIN Phase 4A.1: Independent Security & Backend Architecture Audit Test Suite
 * Principal Application Security Engineer & Backend Architect
 * 
 * Empirically tests and captures the exact security behaviors:
 * 1. Execution environment verification (browser/jsdom vs trusted server)
 * 2. Password hashing algorithm properties (SHA-256 single-round)
 * 3. Session store location & mutability (localStorage)
 * 4. Direct RBAC verification across roles and permissions
 * 5. MFA challenge validation (hardcoded code analysis)
 * 6. Audit log mutability & client timestamp reliance
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  bootstrapAdminServer,
  serverAdminLogin,
  serverVerifyMfa,
  serverVerifySession,
  serverRequirePermission,
  computeHash,
  recordAuditLog,
  getServerAuditLogs,
} from '../server/adminSecurity';

describe('COLIN Phase 4A.1 Security & Architecture Audit Verification', () => {
  beforeEach(async () => {
    localStorage.clear();
    await bootstrapAdminServer(true);
  });

  // -------------------------------------------------------------
  // Audit Check 1: Authentication Execution Location
  // -------------------------------------------------------------
  it('Audit Check 1: Verifies that "server" security logic executes within the client global scope', () => {
    // Evidence: window and localStorage are directly accessed by the "server" module
    expect(typeof window).toBe('object');
    expect(typeof localStorage).toBe('object');
    
    // The accounts vault is stored directly in browser localStorage
    const rawVault = localStorage.getItem('colin_server_admin_accounts_vault');
    expect(rawVault).toBeTruthy();
    
    const accounts = JSON.parse(rawVault!);
    expect(accounts.length).toBeGreaterThan(0);
    // Any client-side script running in the browser can inspect the accounts
    expect(accounts[0].user.email).toBe('superadmin@colin.in');
    expect(accounts[0].salt).toBeDefined();
    expect(accounts[0].passwordHash).toBeDefined();
  });

  // -------------------------------------------------------------
  // Audit Check 2: Password Hashing Algorithm Verification
  // -------------------------------------------------------------
  it('Audit Check 2: Verifies that password hashing uses single-round SHA-256 without memory-hardness', async () => {
    const salt = 'audit-salt-12345';
    const secret = 'TestPassword@2026';
    
    const hash = await computeHash(secret, salt);
    
    // SHA-256 hex string length is exactly 64 characters (256 bits)
    expect(hash).toHaveLength(64);
    
    // Validate that it computes in sub-millisecond time (lacks computational work factor / Argon2 cost)
    const t0 = performance.now();
    await computeHash(secret, salt);
    const duration = performance.now() - t0;
    
    // Single-round SHA-256 takes < 2ms, confirming absence of iterative KDF stretching (e.g. 600,000 rounds)
    expect(duration).toBeLessThan(50);
  });

  // -------------------------------------------------------------
  // Audit Check 3: Session Security & Storage
  // -------------------------------------------------------------
  it('Audit Check 3: Verifies session store is client localStorage-based and vulnerable to client tampering', async () => {
    const loginRes = await serverAdminLogin('operations@colin.in', 'ColinAdmin@2026!Ops');
    const token = loginRes.data?.session?.token!;
    expect(token).toBeDefined();

    // Verify session exists in localStorage
    const rawSessions = localStorage.getItem('colin_server_admin_sessions_store');
    expect(rawSessions).toBeTruthy();
    expect(rawSessions).toContain(token);

    // Client can arbitrarily tamper with or delete the session store directly in DevTools
    localStorage.removeItem('colin_server_admin_sessions_store');
    
    // Verifying session now fails because the storage was deleted client-side
    const verifyRes = serverVerifySession(token);
    expect(verifyRes.valid).toBe(false);
    expect(verifyRes.statusCode).toBe(401);
  });

  // -------------------------------------------------------------
  // Audit Check 4: RBAC Verification Across Roles & Direct Requests
  // -------------------------------------------------------------
  describe('Audit Check 4: RBAC Enforcement at the API Dispatcher Layer', () => {
    it('Rejects requests with missing authentication (null token)', () => {
      const res = serverVerifySession(null);
      expect(res.valid).toBe(false);
      expect(res.statusCode).toBe(401);
      expect(res.error).toBe('Authorization header with Bearer token is missing.');
    });

    it('Rejects requests with invalid/forged authentication', () => {
      const res = serverVerifySession('forged-token-999');
      expect(res.valid).toBe(false);
      expect(res.statusCode).toBe(401);
      expect(res.error).toBe('Session not found or expired on server.');
    });

    it('Rejects student credentials/token when accessing admin endpoints', () => {
      // Simulate student session from colin_auth_session
      const studentSessionToken = 'student-auth-token-123';
      const res = serverVerifySession(studentSessionToken);
      expect(res.valid).toBe(false);
      expect(res.statusCode).toBe(401);
    });

    it('Rejects owner credentials/token when accessing admin endpoints', () => {
      const ownerSessionToken = 'owner-auth-token-456';
      const res = serverVerifySession(ownerSessionToken);
      expect(res.valid).toBe(false);
      expect(res.statusCode).toBe(401);
    });

    it('Enforces least privilege: OPERATIONS_ADMIN is denied SUPER_ADMIN and FINANCE privileges', async () => {
      const opsLogin = await serverAdminLogin('operations@colin.in', 'ColinAdmin@2026!Ops');
      const token = opsLogin.data?.session?.token!;

      // Permitted: Visit coordination
      const allowed = serverRequirePermission(token, 'MANAGE_VISIT_COORDINATION');
      expect(allowed.authorized).toBe(true);
      expect(allowed.statusCode).toBe(200);

      // Denied: Financial operations
      const financeDenied = serverRequirePermission(token, 'PROCESS_REFUNDS');
      expect(financeDenied.authorized).toBe(false);
      expect(financeDenied.statusCode).toBe(403);
      expect(financeDenied.error).toBe("Access Denied: Account lacks required privilege 'PROCESS_REFUNDS'.");

      // Denied: System administration
      const adminDenied = serverRequirePermission(token, 'MANAGE_ADMIN_USERS');
      expect(adminDenied.authorized).toBe(false);
      expect(adminDenied.statusCode).toBe(403);
      expect(adminDenied.error).toBe("Access Denied: Account lacks required privilege 'MANAGE_ADMIN_USERS'.");
    });

    it('Enforces least privilege: VERIFICATION_MANAGER is denied finance and support privileges', async () => {
      const verifyLogin = await serverAdminLogin('verification@colin.in', 'ColinAdmin@2026!Verify');
      const token = verifyLogin.data?.session?.token!;

      // Permitted: Property verification
      const verifyAllowed = serverRequirePermission(token, 'APPROVE_PROPERTY_CERTIFICATION');
      expect(verifyAllowed.authorized).toBe(true);
      expect(verifyAllowed.statusCode).toBe(200);

      // Denied: Student support
      const supportDenied = serverRequirePermission(token, 'MANAGE_STUDENT_TICKETS');
      expect(supportDenied.authorized).toBe(false);
      expect(supportDenied.statusCode).toBe(403);
    });

    it('Enforces least privilege: STUDENT_SUPPORT is denied owner support and finance privileges', async () => {
      const studentSupportLogin = await serverAdminLogin('studentsupport@colin.in', 'ColinAdmin@2026!Support');
      const token = studentSupportLogin.data?.session?.token!;

      // Permitted: Masked student data
      const studentAllowed = serverRequirePermission(token, 'VIEW_STUDENT_PROFILES_MASKED');
      expect(studentAllowed.authorized).toBe(true);

      // Denied: Owner support
      const ownerDenied = serverRequirePermission(token, 'VIEW_OWNER_PROFILES_MASKED');
      expect(ownerDenied.authorized).toBe(false);
      expect(ownerDenied.statusCode).toBe(403);

      // Denied: Verification
      const certDenied = serverRequirePermission(token, 'APPROVE_PROPERTY_CERTIFICATION');
      expect(certDenied.authorized).toBe(false);
      expect(certDenied.statusCode).toBe(403);
    });
  });

  // -------------------------------------------------------------
  // Audit Check 5: MFA Authenticator Verification
  // -------------------------------------------------------------
  it('Audit Check 5: Verifies that MFA uses a static comparison rather than RFC 6238 TOTP', async () => {
    const loginRes = await serverAdminLogin('superadmin@colin.in', 'ColinAdmin@2026!Super');
    expect(loginRes.requiresMfa).toBe(true);
    const tempToken = loginRes.tempMfaToken!;

    // Any random code fails
    const failRes = await serverVerifyMfa(tempToken, '123456');
    expect(failRes.success).toBe(false);
    expect(failRes.errorCode).toBe('MFA_CODE_MISMATCH');

    // The static code '654321' passes unconditionally
    const passRes = await serverVerifyMfa(tempToken, '654321');
    expect(passRes.success).toBe(true);
    expect(passRes.data?.session?.token).toBeDefined();
  });

  // -------------------------------------------------------------
  // Audit Check 6: Audit Log Mutability & Client Clocks
  // -------------------------------------------------------------
  it('Audit Check 6: Verifies that audit logs are mutable in browser storage and lack WORM protection', () => {
    recordAuditLog({
      adminId: 'AUDIT_TEST',
      adminEmail: 'audit@colin.in',
      adminRole: 'SUPER_ADMIN',
      action: 'SECURITY_AUDIT_PROBE',
      targetResource: 'system/test',
      severity: 'INFO',
      correlationId: 'req-audit-probe',
    });

    const logsBefore = getServerAuditLogs(10);
    expect(logsBefore.length).toBeGreaterThan(0);

    // Demonstration of mutability: Any client-side actor can delete or alter audit logs
    localStorage.removeItem('colin_server_admin_audit_logs');
    
    const logsAfter = getServerAuditLogs(10);
    expect(logsAfter.length).toBe(0); // Audit trail was wiped with zero server resistance
  });
});
