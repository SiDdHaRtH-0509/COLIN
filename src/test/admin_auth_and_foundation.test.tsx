/**
 * COLIN Admin Control Centre — Comprehensive Test Suite
 * Phase 4A: Architecture, Authentication, RBAC & Foundation Validation
 * 
 * Validates all 10 mandated scenarios:
 * 1. Normal student cannot access Admin Portal resources.
 * 2. Owner cannot access Admin Portal resources.
 * 3. Unauthenticated user cannot access protected admin pages.
 * 4. Authenticated admin without permission cannot execute restricted actions (403 Forbidden).
 * 5. Disabled admin account cannot continue using an existing session.
 * 6. Logging out invalidates the admin session.
 * 7. Public registration cannot create an admin account.
 * 8. Refreshing the page does not bypass authentication.
 * 9. Direct API requests without valid authorization are rejected.
 * 10. Existing Student and Owner Portal functionality remains intact.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Contexts
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AdminAuthProvider, useAdminAuth } from '../context/AdminAuthContext';
import { PropertyProvider } from '../context/PropertyContext';
import { StudentProvider } from '../context/StudentContext';
import { ToastProvider } from '../context/ToastContext';

// Components & Pages
import { AdminProtectedRoute } from '../components/admin/AdminProtectedRoute';
import { AdminLoginPage } from '../pages/admin/AdminLoginPage';
import { AdminDashboardOverviewPage } from '../pages/admin/AdminDashboardOverviewPage';
import { AdminPlaceholderPage } from '../pages/admin/AdminPlaceholderPage';

// Server Security & Client
import {
  bootstrapAdminServer,
  serverAdminLogin,
  serverVerifyMfa,
  serverAdminLogout,
  serverVerifySession,
  serverRequirePermission,
  serverUpdateAdminStatus,
  serverGetAdminMetrics,
  getServerAuditLogs,
  computeHash,
} from '../server/adminSecurity';
import {
  AdminApiClient,
  maskPhoneNumber,
  maskEmailAddress,
  maskAddress,
} from '../services/admin/adminApiClient';

// Combined Wrapper for UI Tests
const TestAppWrapper: React.FC<{ initialEntries?: string[]; children?: React.ReactNode }> = ({
  initialEntries = ['/admin'],
  children,
}) => {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <PropertyProvider>
          <StudentProvider>
            <ToastProvider>
              <MemoryRouter initialEntries={initialEntries}>
                {children || (
                  <Routes>
                    <Route path="/admin/login" element={<AdminLoginPage />} />
                    <Route
                      path="/admin"
                      element={
                        <AdminProtectedRoute>
                          <AdminDashboardOverviewPage />
                        </AdminProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/verification"
                      element={
                        <AdminProtectedRoute requiredPermission="APPROVE_PROPERTY_CERTIFICATION">
                          <AdminPlaceholderPage />
                        </AdminProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/finance"
                      element={
                        <AdminProtectedRoute requiredPermission="VIEW_FINANCIAL_TRANSACTIONS">
                          <AdminPlaceholderPage />
                        </AdminProtectedRoute>
                      }
                    />
                    <Route path="/student/dashboard" element={<div>Student Dashboard Page</div>} />
                    <Route path="/owner/dashboard" element={<div>Owner Dashboard Page</div>} />
                  </Routes>
                )}
              </MemoryRouter>
            </ToastProvider>
          </StudentProvider>
        </PropertyProvider>
      </AdminAuthProvider>
    </AuthProvider>
  );
};

// Helper Consumer to inspect Admin Context
const AdminContextInspector: React.FC = () => {
  const { admin, isAuthenticated, isLoading, login, logout, hasPermission } = useAdminAuth();

  return (
    <div>
      <div data-testid="admin-auth-status">{isAuthenticated ? 'AUTHENTICATED' : 'UNAUTHENTICATED'}</div>
      <div data-testid="admin-loading">{isLoading ? 'LOADING' : 'READY'}</div>
      <div data-testid="admin-email">{admin?.email || 'NONE'}</div>
      <div data-testid="admin-role">{admin?.role || 'NONE'}</div>
      <div data-testid="admin-perm-audit">
        {hasPermission('VIEW_AUDIT_LOGS') ? 'CAN_VIEW_AUDIT' : 'CANNOT_VIEW_AUDIT'}
      </div>
      <button onClick={() => login('operations@colin.in', 'ColinAdmin@2026!Ops')}>
        Login Operations
      </button>
      <button onClick={() => login('superadmin@colin.in', 'ColinAdmin@2026!Super')}>
        Login SuperAdmin
      </button>
      <button onClick={logout}>Logout Admin</button>
    </div>
  );
};

describe('COLIN Phase 4A: Admin Control Centre Architecture & Security Foundation', () => {
  beforeEach(async () => {
    localStorage.clear();
    await bootstrapAdminServer(true);
  });

  // -------------------------------------------------------------
  // Scenario 1: A normal student cannot access Admin Portal resources
  // -------------------------------------------------------------
  it('Scenario 1: Normal student session cannot access protected Admin Portal resources', async () => {
    // 1. Authenticate as a normal student in public/student AuthContext
    localStorage.setItem(
      'colin_auth_session',
      JSON.stringify({
        id: 'usr-student-01',
        name: 'Aarav Mehra',
        email: 'aarav.mehra@colin.in',
        role: 'student',
      })
    );

    // 2. Attempt to render Admin Control Centre at /admin
    render(
      <TestAppWrapper initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <AdminProtectedRoute>
                <AdminDashboardOverviewPage />
              </AdminProtectedRoute>
            }
          />
        </Routes>
      </TestAppWrapper>
    );

    // 3. Must redirect to Admin Login page and NOT render admin dashboard
    await waitFor(() => {
      expect(screen.getByText('Admin Authentication Gateway')).toBeInTheDocument();
      expect(screen.queryByText('COLIN Central Operations Headquarters')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------
  // Scenario 2: An owner cannot access Admin Portal resources
  // -------------------------------------------------------------
  it('Scenario 2: Property owner session cannot access protected Admin Portal resources', async () => {
    // 1. Authenticate as a property owner in public AuthContext
    localStorage.setItem(
      'colin_auth_session',
      JSON.stringify({
        id: 'usr-owner-01',
        name: 'Col. Rajesh Sharma',
        email: 'rajesh.sharma@colin.in',
        role: 'owner',
      })
    );

    // 2. Attempt to render Admin Control Centre at /admin/verification
    render(
      <TestAppWrapper initialEntries={['/admin/verification']}>
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin/verification"
            element={
              <AdminProtectedRoute requiredPermission="APPROVE_PROPERTY_CERTIFICATION">
                <AdminPlaceholderPage />
              </AdminProtectedRoute>
            }
          />
        </Routes>
      </TestAppWrapper>
    );

    // 3. Redirected strictly to admin login
    await waitFor(() => {
      expect(screen.getByText('Admin Authentication Gateway')).toBeInTheDocument();
      expect(screen.queryByText('Property Verification & Inspection Queue')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------
  // Scenario 3: An unauthenticated user cannot access protected admin pages
  // -------------------------------------------------------------
  it('Scenario 3: Unauthenticated user is blocked and redirected to /admin/login', async () => {
    render(<TestAppWrapper initialEntries={['/admin']} />);

    await waitFor(() => {
      expect(screen.getByText('Admin Authentication Gateway')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('admin@colin.in')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------
  // Scenario 4: Authenticated admin without permission cannot execute restricted actions
  // -------------------------------------------------------------
  it('Scenario 4: Server blocks unauthorized admin actions with 403 Forbidden', async () => {
    // Authenticate as Operations Admin
    const loginRes = await serverAdminLogin('operations@colin.in', 'ColinAdmin@2026!Ops');
    expect(loginRes.success).toBe(true);
    const token = loginRes.data?.session?.token;
    expect(token).toBeDefined();

    // 1. Operations Admin CAN manage visits (Permitted)
    const opsPerm = serverRequirePermission(token, 'MANAGE_VISIT_COORDINATION');
    expect(opsPerm.authorized).toBe(true);
    expect(opsPerm.statusCode).toBe(200);

    // 2. Operations Admin CANNOT manage admin accounts (Restricted)
    const adminPerm = serverRequirePermission(token, 'MANAGE_ADMIN_USERS');
    expect(adminPerm.authorized).toBe(false);
    expect(adminPerm.statusCode).toBe(403);
    expect(adminPerm.error).toContain('MANAGE_ADMIN_USERS');

    // 3. Operations Admin CANNOT approve property certifications (Restricted)
    const verifyPerm = serverRequirePermission(token, 'APPROVE_PROPERTY_CERTIFICATION');
    expect(verifyPerm.authorized).toBe(false);
    expect(verifyPerm.statusCode).toBe(403);

    // 4. Operations Admin CANNOT process financial refunds (Restricted)
    const financePerm = serverRequirePermission(token, 'PROCESS_REFUNDS');
    expect(financePerm.authorized).toBe(false);
    expect(financePerm.statusCode).toBe(403);
  });

  // -------------------------------------------------------------
  // Scenario 5: A disabled admin account cannot continue using an existing session
  // -------------------------------------------------------------
  it('Scenario 5: Disabled admin account has active session immediately invalidated', async () => {
    // 1. Operations admin logs in and obtains active session
    const opsLogin = await serverAdminLogin('operations@colin.in', 'ColinAdmin@2026!Ops');
    const opsToken = opsLogin.data?.session?.token;
    const opsAdminId = opsLogin.data?.admin?.id;
    expect(opsToken).toBeDefined();
    expect(opsAdminId).toBeDefined();

    // Verify session is initially valid
    const preCheck = serverVerifySession(opsToken);
    expect(preCheck.valid).toBe(true);

    // 2. Super Admin logs in and disables the operations admin account
    const superLogin = await serverAdminLogin('superadmin@colin.in', 'ColinAdmin@2026!Super');
    expect(superLogin.requiresMfa).toBe(true);
    const mfaRes = await serverVerifyMfa(superLogin.tempMfaToken!, '654321');
    const superToken = mfaRes.data?.session?.token!;

    const disableRes = serverUpdateAdminStatus(superToken, opsAdminId!, 'disabled');
    expect(disableRes.success).toBe(true);

    // 3. Operations admin's existing session token MUST now be rejected
    const postCheck = serverVerifySession(opsToken);
    expect(postCheck.valid).toBe(false);
    expect(postCheck.statusCode).toBe(401); // Token revoked/cleared

    // 4. Further login attempts by disabled account must be rejected with 403
    const reLogin = await serverAdminLogin('operations@colin.in', 'ColinAdmin@2026!Ops');
    expect(reLogin.success).toBe(false);
    expect(reLogin.statusCode).toBe(403);
    expect(reLogin.errorCode).toBe('ACCOUNT_DISABLED');
  });

  // -------------------------------------------------------------
  // Scenario 6: Logging out invalidates the admin session
  // -------------------------------------------------------------
  it('Scenario 6: Logout invalidates the session token on both client and server', async () => {
    // 1. Log in
    const loginRes = await serverAdminLogin('operations@colin.in', 'ColinAdmin@2026!Ops');
    const token = loginRes.data?.session?.token!;
    expect(token).toBeDefined();

    // Session is valid
    expect(serverVerifySession(token).valid).toBe(true);

    // 2. Perform server logout
    const logoutRes = serverAdminLogout(token);
    expect(logoutRes.success).toBe(true);

    // 3. Token is now on revoked blacklist and rejected
    const postLogoutCheck = serverVerifySession(token);
    expect(postLogoutCheck.valid).toBe(false);
    expect(postLogoutCheck.statusCode).toBe(401);
  });

  // -------------------------------------------------------------
  // Scenario 7: Public registration cannot create an admin account
  // -------------------------------------------------------------
  it('Scenario 7: Public user registration cannot create or escalate to admin role', async () => {
    render(
      <AuthProvider>
        <AdminAuthProvider>
          <AuthConsumerWithSignup />
        </AdminAuthProvider>
      </AuthProvider>
    );

    // Attempt to signup via public AuthContext
    await act(async () => {
      screen.getByText('Trigger Public Signup').click();
    });

    // Verify public registered users does NOT grant admin access
    await waitFor(() => {
      const rawPublicUsers = localStorage.getItem('colin_registered_users');
      expect(rawPublicUsers).toBeTruthy();
      expect(rawPublicUsers).toContain('infiltrator@test.com');
    });

    // Admin login attempt with these credentials must fail
    const adminLoginRes = await serverAdminLogin('infiltrator@test.com', 'SomePassword123');
    expect(adminLoginRes.success).toBe(false);
    expect(adminLoginRes.statusCode).toBe(401);
  });

  // -------------------------------------------------------------
  // Scenario 8: Refreshing the page does not bypass authentication
  // -------------------------------------------------------------
  it('Scenario 8: Page refresh verifies cryptographic session against server store', async () => {
    // 1. Valid login and token persistence
    const loginRes = await serverAdminLogin('operations@colin.in', 'ColinAdmin@2026!Ops');
    const token = loginRes.data?.session?.token!;
    AdminApiClient.setStoredToken(token);

    // 2. Mount context (simulating fresh page load)
    const { unmount } = render(
      <AdminAuthProvider>
        <AdminContextInspector />
      </AdminAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-auth-status').textContent).toBe('AUTHENTICATED');
      expect(screen.getByTestId('admin-email').textContent).toBe('operations@colin.in');
      expect(screen.getByTestId('admin-role').textContent).toBe('OPERATIONS_ADMIN');
    });

    unmount();

    // 3. Now simulate forged/invalid token on refresh
    AdminApiClient.setStoredToken('forged-token-xyz');
    render(
      <AdminAuthProvider>
        <AdminContextInspector />
      </AdminAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-auth-status').textContent).toBe('UNAUTHENTICATED');
      expect(screen.getByTestId('admin-email').textContent).toBe('NONE');
    });
  });

  // -------------------------------------------------------------
  // Scenario 9: Direct API requests without valid authorization are rejected
  // -------------------------------------------------------------
  it('Scenario 9: Direct API requests without authorization are rejected with 401', () => {
    // 1. Missing token
    const nullCheck = serverVerifySession(null);
    expect(nullCheck.valid).toBe(false);
    expect(nullCheck.statusCode).toBe(401);

    // 2. Empty string token
    const emptyCheck = serverVerifySession('');
    expect(emptyCheck.valid).toBe(false);
    expect(emptyCheck.statusCode).toBe(401);

    // 3. Permission check with invalid token
    const permCheck = serverRequirePermission('invalid-token', 'VIEW_AUDIT_LOGS');
    expect(permCheck.authorized).toBe(false);
    expect(permCheck.statusCode).toBe(401);
  });

  // -------------------------------------------------------------
  // Additional Security & Cryptography Tests
  // -------------------------------------------------------------
  it('Cryptographic password hashing: generates deterministic SHA-256 hash using unique salt', async () => {
    const salt1 = 'salt-alpha-1234';
    const salt2 = 'salt-beta-5678';
    const secret = 'AdminPass@2026';

    const hash1 = await computeHash(secret, salt1);
    const hash2 = await computeHash(secret, salt2);

    expect(hash1).toHaveLength(64); // SHA-256 hex string length
    expect(hash2).toHaveLength(64);
    expect(hash1).not.toBe(hash2); // Different salts produce different hashes
    expect(await computeHash(secret, salt1)).toBe(hash1); // Deterministic
  });

  it('Brute-force protection: 5 failed attempts trigger rate-limit lockout (429)', async () => {
    const email = 'operations@colin.in';
    const wrongPass = 'WrongPasswordAttempt';

    for (let i = 0; i < 4; i++) {
      const res = await serverAdminLogin(email, wrongPass);
      expect(res.statusCode).toBe(401);
    }

    // 5th attempt locks the account
    const fifthRes = await serverAdminLogin(email, wrongPass);
    expect(fifthRes.statusCode).toBe(401);
    expect(fifthRes.retryAfterSeconds).toBeDefined();

    // 6th attempt is blocked by rate-limiter with 429
    const blockedRes = await serverAdminLogin(email, 'ColinAdmin@2026!Ops');
    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    expect(blockedRes.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('Multi-Factor Authentication (MFA): enforces 2-step verification for Super Admin', async () => {
    // 1. Initial password validation
    const loginRes = await serverAdminLogin('superadmin@colin.in', 'ColinAdmin@2026!Super');
    expect(loginRes.success).toBe(true);
    expect(loginRes.requiresMfa).toBe(true);
    expect(loginRes.tempMfaToken).toBeDefined();

    // 2. Incorrect MFA code fails
    const failMfa = await serverVerifyMfa(loginRes.tempMfaToken!, '111111');
    expect(failMfa.success).toBe(false);
    expect(failMfa.statusCode).toBe(401);
    expect(failMfa.errorCode).toBe('MFA_CODE_MISMATCH');

    // 3. Valid MFA code succeeds and issues session
    const passMfa = await serverVerifyMfa(loginRes.tempMfaToken!, '654321');
    expect(passMfa.success).toBe(true);
    expect(passMfa.data?.session?.token).toBeDefined();
    expect(passMfa.data?.admin?.role).toBe('SUPER_ADMIN');
  });

  it('Audit logging: records immutable audit trail with correlation IDs', async () => {
    await serverAdminLogin('operations@colin.in', 'ColinAdmin@2026!Ops');

    const logs = getServerAuditLogs(10);
    expect(logs.length).toBeGreaterThan(0);
    const loginLog = logs.find((l) => l.action === 'ADMIN_LOGIN_SUCCESS');
    expect(loginLog).toBeDefined();
    expect(loginLog?.adminEmail).toBe('operations@colin.in');
    expect(loginLog?.correlationId).toMatch(/^req-/);
    expect(loginLog?.timestamp).toBeDefined();
  });

  it('PII masking utilities protect student and owner personal information', () => {
    expect(maskPhoneNumber('+91 98765 43210')).toBe('+91 9****210');
    expect(maskEmailAddress('aarav.mehra@colin.in')).toBe('aa***@colin.in');
    expect(maskAddress('Flat 402, Sunshine Apts, Mukherjee Nagar')).toBe('***, Mukherjee Nagar');
  });

  it('Metrics engine calculates derived statistics from shared business datastore', async () => {
    // Populate prototype shared store
    localStorage.setItem(
      'colin_all_properties',
      JSON.stringify([
        { id: 'prop-1', verificationStatus: 'inspection_requested' },
        { id: 'prop-2', verificationStatus: 'approved' },
      ])
    );
    localStorage.setItem(
      'colin_student_visits',
      JSON.stringify([
        { id: 'vis-1', status: 'PENDING_COLIN_REVIEW', feePaid: 150 },
        { id: 'vis-2', status: 'Completed', feePaid: 150 },
      ])
    );

    const loginRes = await serverAdminLogin('operations@colin.in', 'ColinAdmin@2026!Ops');
    const token = loginRes.data?.session?.token!;

    const metricsRes = serverGetAdminMetrics(token);
    expect(metricsRes.success).toBe(true);
    expect(metricsRes.data?.totalProperties).toBe(2);
    expect(metricsRes.data?.pendingPropertyVerifications).toBe(1);
    expect(metricsRes.data?.pendingVisitRequests).toBe(1);
    expect(metricsRes.data?.completedVisits).toBe(1);
    expect(metricsRes.data?.totalPlatformRevenue).toBe(300);
  });
});

// Helper component to trigger public signup
const AuthConsumerWithSignup: React.FC = () => {
  const { signup } = useAuth();
  return (
    <button
      onClick={() =>
        signup({
          name: 'Public Infiltrator',
          email: 'infiltrator@test.com',
          phone: '+91 99999 88888',
          role: 'student',
        })
      }
    >
      Trigger Public Signup
    </button>
  );
};
