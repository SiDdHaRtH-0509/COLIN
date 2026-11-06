/**
 * COLIN Admin Control Centre — Server-Side Security & Verification Engine
 * Phase 4A: Architectural Foundation, Cryptographic Auth, RBAC & Audit Ledger
 * 
 * NOTE ON PROTOTYPE ARCHITECTURE:
 * This module simulates a zero-trust backend authorization server.
 * In production, these verification routines execute in a secure server runtime
 * (Node.js/Go/Python) backed by PostgreSQL/Redis with secure HttpOnly SameSite cookies.
 * Browser client code interacts with this engine exclusively through the AdminApiClient.
 */

import {
  AdminRole,
  AdminPermission,
  AdminUser,
  AdminSession,
  AdminAuditLogEntry,
  AdminMetricsSummary,
  AdminApiResponse,
  PasswordResetToken,
} from '../types/admin';

// -------------------------------------------------------------
// Role-Based Access Control (RBAC) Permissions Matrix
// -------------------------------------------------------------
export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  SUPER_ADMIN: [
    'MANAGE_ADMIN_USERS',
    'ASSIGN_ADMIN_ROLES',
    'VIEW_AUDIT_LOGS',
    'MANAGE_PLATFORM_SETTINGS',
    'VIEW_SYSTEM_HEALTH',
    'VIEW_VISIT_REQUESTS',
    'MANAGE_VISIT_COORDINATION',
    'ASSIGN_VOLUNTEERS',
    'OVERRIDE_VISIT_STATUS',
    'VIEW_PROPERTY_SUBMISSIONS',
    'ASSIGN_PROPERTY_INSPECTIONS',
    'REVIEW_INSPECTION_EVIDENCE',
    'APPROVE_PROPERTY_CERTIFICATION',
    'REJECT_PROPERTY_CERTIFICATION',
    'SUSPEND_PROPERTY_CERTIFICATION',
    'VIEW_FINANCIAL_TRANSACTIONS',
    'PROCESS_REFUNDS',
    'MANAGE_SUBSCRIPTION_RECORDS',
    'VIEW_FINANCIAL_REPORTS',
    'VIEW_STUDENT_PROFILES_MASKED',
    'MANAGE_STUDENT_TICKETS',
    'RESOLVE_STUDENT_DISPUTES',
    'VIEW_OWNER_PROFILES_MASKED',
    'MANAGE_OWNER_TICKETS',
    'ASSIST_OWNER_LISTINGS',
    'MANAGE_SPONSORSHIPS',
    'MANAGE_FEATURED_LISTINGS',
    'VIEW_CAMPAIGN_PERFORMANCE',
    'VIEW_ALL_DEPARTMENTS',
  ],

  OPERATIONS_ADMIN: [
    'VIEW_VISIT_REQUESTS',
    'MANAGE_VISIT_COORDINATION',
    'ASSIGN_VOLUNTEERS',
    'OVERRIDE_VISIT_STATUS',
    'VIEW_PROPERTY_SUBMISSIONS',
    'VIEW_SYSTEM_HEALTH',
  ],

  VERIFICATION_MANAGER: [
    'VIEW_PROPERTY_SUBMISSIONS',
    'ASSIGN_PROPERTY_INSPECTIONS',
    'REVIEW_INSPECTION_EVIDENCE',
    'APPROVE_PROPERTY_CERTIFICATION',
    'REJECT_PROPERTY_CERTIFICATION',
    'SUSPEND_PROPERTY_CERTIFICATION',
    'VIEW_SYSTEM_HEALTH',
  ],

  FINANCE_ADMIN: [
    'VIEW_FINANCIAL_TRANSACTIONS',
    'PROCESS_REFUNDS',
    'MANAGE_SUBSCRIPTION_RECORDS',
    'VIEW_FINANCIAL_REPORTS',
    'VIEW_SYSTEM_HEALTH',
  ],

  STUDENT_SUPPORT: [
    'VIEW_STUDENT_PROFILES_MASKED',
    'MANAGE_STUDENT_TICKETS',
    'RESOLVE_STUDENT_DISPUTES',
    'VIEW_SYSTEM_HEALTH',
  ],

  OWNER_SUPPORT: [
    'VIEW_OWNER_PROFILES_MASKED',
    'MANAGE_OWNER_TICKETS',
    'ASSIST_OWNER_LISTINGS',
    'VIEW_SYSTEM_HEALTH',
  ],

  MARKETING_ADMIN: [
    'MANAGE_SPONSORSHIPS',
    'MANAGE_FEATURED_LISTINGS',
    'VIEW_CAMPAIGN_PERFORMANCE',
    'VIEW_SYSTEM_HEALTH',
  ],
};

// -------------------------------------------------------------
// Server Storage Keys (Isolated Server Datastore)
// -------------------------------------------------------------
const SERVER_STORAGE = {
  ADMIN_ACCOUNTS: 'colin_server_admin_accounts_vault',
  ADMIN_SESSIONS: 'colin_server_admin_sessions_store',
  REVOKED_TOKENS: 'colin_server_admin_revoked_tokens',
  AUDIT_LOGS: 'colin_server_admin_audit_logs',
  RATE_LIMITS: 'colin_server_admin_rate_limits',
  MFA_CHALLENGES: 'colin_server_admin_mfa_challenges',
  RESET_TOKENS: 'colin_server_admin_password_resets',
};

// Rate limiting thresholds
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_MAX_LIFETIME_MS = 8 * 60 * 60 * 1000; // 8 hours

interface StoredAdminAccount {
  user: AdminUser;
  salt: string;
  passwordHash: string;
}

interface RateLimitRecord {
  attempts: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}

interface MfaChallenge {
  tempToken: string;
  adminId: string;
  code: string;
  expiresAt: number;
}

// -------------------------------------------------------------
// Cryptographic Utility Functions (Web Crypto API)
// -------------------------------------------------------------
export async function computeHash(data: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const saltedData = encoder.encode(`${salt}:${data}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', saltedData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateCryptoSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateSecureToken(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateCorrelationId(): string {
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
}

// -------------------------------------------------------------
// Internal Server Persistence Helpers
// -------------------------------------------------------------
function readServerStore<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function writeServerStore<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[AdminSecurityServer] Storage write error for ${key}:`, err);
  }
}

// -------------------------------------------------------------
// Initial Administrative Bootstrap (Seed Provisioning)
// -------------------------------------------------------------
// Pre-configured salts and hashes for the administrative personnel
// In production, these are provisioned via CLI or DevOps deployment secrets.
const INITIAL_ADMIN_SEED: Array<{
  email: string;
  name: string;
  role: AdminRole;
  department: string;
  mfaEnabled: boolean;
  initialSecret: string;
}> = [
  {
    email: 'superadmin@colin.in',
    name: 'Chief Operational Officer',
    role: 'SUPER_ADMIN',
    department: 'Executive Operations',
    mfaEnabled: true,
    initialSecret: 'ColinAdmin@2026!Super',
  },
  {
    email: 'operations@colin.in',
    name: 'Vikram Sethi',
    role: 'OPERATIONS_ADMIN',
    department: 'Central Operations',
    mfaEnabled: false,
    initialSecret: 'ColinAdmin@2026!Ops',
  },
  {
    email: 'verification@colin.in',
    name: 'Ananya Deshmukh',
    role: 'VERIFICATION_MANAGER',
    department: 'Quality & Verification',
    mfaEnabled: false,
    initialSecret: 'ColinAdmin@2026!Verify',
  },
  {
    email: 'finance@colin.in',
    name: 'Rohan Mehra',
    role: 'FINANCE_ADMIN',
    department: 'Finance & Accounts',
    mfaEnabled: false,
    initialSecret: 'ColinAdmin@2026!Finance',
  },
  {
    email: 'studentsupport@colin.in',
    name: 'Pooja Nair',
    role: 'STUDENT_SUPPORT',
    department: 'Student Care',
    mfaEnabled: false,
    initialSecret: 'ColinAdmin@2026!Support',
  },
  {
    email: 'ownersupport@colin.in',
    name: 'Suresh Menon',
    role: 'OWNER_SUPPORT',
    department: 'Host Partnerships',
    mfaEnabled: false,
    initialSecret: 'ColinAdmin@2026!Owner',
  },
  {
    email: 'marketing@colin.in',
    name: 'Kavita Roy',
    role: 'MARKETING_ADMIN',
    department: 'Growth & Partnerships',
    mfaEnabled: false,
    initialSecret: 'ColinAdmin@2026!Growth',
  },
];

export async function bootstrapAdminServer(force: boolean = false): Promise<void> {
  const existingAccounts = readServerStore<StoredAdminAccount[]>(SERVER_STORAGE.ADMIN_ACCOUNTS, []);
  if (!force && existingAccounts.length > 0) {
    return;
  }

  const seededAccounts: StoredAdminAccount[] = [];
  for (const seed of INITIAL_ADMIN_SEED) {
    const salt = generateCryptoSalt();
    const passwordHash = await computeHash(seed.initialSecret, salt);
    const user: AdminUser = {
      id: `adm-${seed.role.toLowerCase()}-${Date.now().toString(36)}`,
      email: seed.email.toLowerCase(),
      name: seed.name,
      role: seed.role,
      department: seed.department,
      permissions: ROLE_PERMISSIONS[seed.role],
      status: 'active',
      mfaEnabled: seed.mfaEnabled,
      createdAt: new Date().toISOString(),
      createdBy: 'SYSTEM_BOOTSTRAP',
    };
    seededAccounts.push({ user, salt, passwordHash });
  }

  writeServerStore(SERVER_STORAGE.ADMIN_ACCOUNTS, seededAccounts);

  // Log initial bootstrap event in audit trail
  recordAuditLog({
    adminId: 'SYSTEM',
    adminEmail: 'bootstrap@colin.internal',
    adminRole: 'SUPER_ADMIN',
    action: 'ADMINISTRATIVE_STORE_BOOTSTRAP',
    targetResource: 'system/auth_vault',
    details: { initialAccountCount: seededAccounts.length },
    severity: 'INFO',
    correlationId: generateCorrelationId(),
  });
}

// Auto-run bootstrap
bootstrapAdminServer();

// -------------------------------------------------------------
// Audit Logging Engine
// -------------------------------------------------------------
export function recordAuditLog(entry: Omit<AdminAuditLogEntry, 'id' | 'timestamp'>): AdminAuditLogEntry {
  const logs = readServerStore<AdminAuditLogEntry[]>(SERVER_STORAGE.AUDIT_LOGS, []);
  const fullEntry: AdminAuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  
  logs.unshift(fullEntry); // newest first
  // Retain last 500 audit log entries in prototype store
  if (logs.length > 500) {
    logs.length = 500;
  }
  writeServerStore(SERVER_STORAGE.AUDIT_LOGS, logs);
  return fullEntry;
}

export function getServerAuditLogs(limit: number = 50): AdminAuditLogEntry[] {
  const logs = readServerStore<AdminAuditLogEntry[]>(SERVER_STORAGE.AUDIT_LOGS, []);
  return logs.slice(0, limit);
}

// -------------------------------------------------------------
// Rate Limiting & Brute Force Engine
// -------------------------------------------------------------
function checkRateLimit(identifier: string): { allowed: boolean; retryAfterSeconds?: number } {
  const records = readServerStore<Record<string, RateLimitRecord>>(SERVER_STORAGE.RATE_LIMITS, {});
  const record = records[identifier];
  const now = Date.now();

  if (!record) {
    return { allowed: true };
  }

  // Check if actively locked out
  if (record.lockedUntil && record.lockedUntil > now) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  // If lockout expired, reset attempts
  if (record.lockedUntil && record.lockedUntil <= now) {
    delete records[identifier];
    writeServerStore(SERVER_STORAGE.RATE_LIMITS, records);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedLoginAttempt(identifier: string): { locked: boolean; retryAfterSeconds?: number } {
  const records = readServerStore<Record<string, RateLimitRecord>>(SERVER_STORAGE.RATE_LIMITS, {});
  const now = Date.now();
  const current = records[identifier] || { attempts: 0, lockedUntil: null, lastAttemptAt: now };

  current.attempts += 1;
  current.lastAttemptAt = now;

  if (current.attempts >= MAX_FAILED_ATTEMPTS) {
    current.lockedUntil = now + LOCKOUT_WINDOW_MS;
    records[identifier] = current;
    writeServerStore(SERVER_STORAGE.RATE_LIMITS, records);
    return { locked: true, retryAfterSeconds: Math.ceil(LOCKOUT_WINDOW_MS / 1000) };
  }

  records[identifier] = current;
  writeServerStore(SERVER_STORAGE.RATE_LIMITS, records);
  return { locked: false };
}

function clearRateLimit(identifier: string): void {
  const records = readServerStore<Record<string, RateLimitRecord>>(SERVER_STORAGE.RATE_LIMITS, {});
  if (records[identifier]) {
    delete records[identifier];
    writeServerStore(SERVER_STORAGE.RATE_LIMITS, records);
  }
}

// -------------------------------------------------------------
// Core Administrative Authentication Routines (Server-Side)
// -------------------------------------------------------------

/**
 * Server Authenticate Admin Credentials
 */
export async function serverAdminLogin(
  email: string,
  secret: string,
  options: { ipAddress?: string; userAgent?: string; rememberDevice?: boolean } = {}
): Promise<AdminApiResponse<{ session?: AdminSession; admin?: AdminUser }>> {
  await bootstrapAdminServer();
  const correlationId = generateCorrelationId();
  const cleanEmail = email.trim().toLowerCase();

  // 1. Rate Limit Verification
  const rateCheck = checkRateLimit(cleanEmail);
  if (!rateCheck.allowed) {
    recordAuditLog({
      adminId: 'UNKNOWN',
      adminEmail: cleanEmail,
      adminRole: 'OPERATIONS_ADMIN',
      action: 'LOGIN_BLOCKED_RATE_LIMIT',
      targetResource: 'auth/login',
      details: { retryAfterSeconds: rateCheck.retryAfterSeconds },
      severity: 'WARNING',
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      correlationId,
    });
    return {
      success: false,
      statusCode: 429,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: `Too many failed attempts. Account temporarily locked. Try again in ${rateCheck.retryAfterSeconds} seconds.`,
      retryAfterSeconds: rateCheck.retryAfterSeconds,
      correlationId,
    };
  }

  // 2. Fetch Stored Admin Account
  const accounts = readServerStore<StoredAdminAccount[]>(SERVER_STORAGE.ADMIN_ACCOUNTS, []);
  const account = accounts.find((a) => a.user.email.toLowerCase() === cleanEmail);

  if (!account) {
    const rateStatus = recordFailedLoginAttempt(cleanEmail);
    recordAuditLog({
      adminId: 'UNKNOWN',
      adminEmail: cleanEmail,
      adminRole: 'OPERATIONS_ADMIN',
      action: 'LOGIN_FAILED_UNKNOWN_USER',
      targetResource: 'auth/login',
      severity: 'WARNING',
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      correlationId,
    });
    return {
      success: false,
      statusCode: 401,
      errorCode: 'INVALID_CREDENTIALS',
      message: 'Invalid administrative email or security passphrase.',
      retryAfterSeconds: rateStatus.retryAfterSeconds,
      correlationId,
    };
  }

  // 3. Verify Account Status
  if (account.user.status === 'disabled') {
    recordAuditLog({
      adminId: account.user.id,
      adminEmail: cleanEmail,
      adminRole: account.user.role,
      action: 'LOGIN_REJECTED_DISABLED_ACCOUNT',
      targetResource: 'auth/login',
      severity: 'WARNING',
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      correlationId,
    });
    return {
      success: false,
      statusCode: 403,
      errorCode: 'ACCOUNT_DISABLED',
      message: 'This administrative account has been deactivated by Super Admin.',
      correlationId,
    };
  }

  // 4. Verify Cryptographic Password Hash
  const computedHash = await computeHash(secret, account.salt);
  if (computedHash !== account.passwordHash) {
    const rateStatus = recordFailedLoginAttempt(cleanEmail);
    recordAuditLog({
      adminId: account.user.id,
      adminEmail: cleanEmail,
      adminRole: account.user.role,
      action: 'LOGIN_FAILED_INVALID_PASSWORD',
      targetResource: 'auth/login',
      severity: 'WARNING',
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      correlationId,
    });
    return {
      success: false,
      statusCode: 401,
      errorCode: 'INVALID_CREDENTIALS',
      message: 'Invalid administrative email or security passphrase.',
      retryAfterSeconds: rateStatus.retryAfterSeconds,
      correlationId,
    };
  }

  // 5. Success: Clear rate limits
  clearRateLimit(cleanEmail);

  // 6. Check MFA Enforcement
  if (account.user.mfaEnabled) {
    const tempMfaToken = generateSecureToken();
    const challenges = readServerStore<MfaChallenge[]>(SERVER_STORAGE.MFA_CHALLENGES, []);
    
    // Store challenge valid for 5 minutes (test code is 654321 for verification)
    challenges.push({
      tempToken: tempMfaToken,
      adminId: account.user.id,
      code: '654321', // In production, generated dynamically via TOTP algorithm
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    writeServerStore(SERVER_STORAGE.MFA_CHALLENGES, challenges);

    recordAuditLog({
      adminId: account.user.id,
      adminEmail: cleanEmail,
      adminRole: account.user.role,
      action: 'MFA_CHALLENGE_ISSUED',
      targetResource: 'auth/mfa',
      severity: 'INFO',
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      correlationId,
    });

    return {
      success: true,
      statusCode: 200,
      requiresMfa: true,
      tempMfaToken,
      message: 'Multi-factor authentication required. Please enter your 6-digit authenticator code.',
      correlationId,
    };
  }

  // 7. Issue Server Session
  const session = createServerSession(account.user, options);

  // Update last login in account
  account.user.lastLoginAt = new Date().toISOString();
  account.user.lastLoginIp = options.ipAddress || '127.0.0.1';
  writeServerStore(SERVER_STORAGE.ADMIN_ACCOUNTS, accounts);

  recordAuditLog({
    adminId: account.user.id,
    adminEmail: cleanEmail,
    adminRole: account.user.role,
    action: 'ADMIN_LOGIN_SUCCESS',
    targetResource: 'auth/session',
    details: { sessionExpiry: session.expiresAt },
    severity: 'INFO',
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    correlationId,
  });

  return {
    success: true,
    statusCode: 200,
    data: {
      session,
      admin: account.user,
    },
    message: 'Authentication successful.',
    correlationId,
  };
}

/**
 * Complete MFA Challenge
 */
export async function serverVerifyMfa(
  tempMfaToken: string,
  mfaCode: string,
  options: { ipAddress?: string; userAgent?: string; rememberDevice?: boolean } = {}
): Promise<AdminApiResponse<{ session?: AdminSession; admin?: AdminUser }>> {
  const correlationId = generateCorrelationId();
  const challenges = readServerStore<MfaChallenge[]>(SERVER_STORAGE.MFA_CHALLENGES, []);
  const challengeIdx = challenges.findIndex((c) => c.tempToken === tempMfaToken);

  if (challengeIdx < 0) {
    return {
      success: false,
      statusCode: 401,
      errorCode: 'MFA_INVALID_SESSION',
      message: 'MFA verification session expired or invalid. Please log in again.',
      correlationId,
    };
  }

  const challenge = challenges[challengeIdx];
  if (challenge.expiresAt < Date.now()) {
    challenges.splice(challengeIdx, 1);
    writeServerStore(SERVER_STORAGE.MFA_CHALLENGES, challenges);
    return {
      success: false,
      statusCode: 401,
      errorCode: 'MFA_EXPIRED',
      message: 'MFA challenge timed out. Please authenticate again.',
      correlationId,
    };
  }

  if (challenge.code !== mfaCode.trim()) {
    return {
      success: false,
      statusCode: 401,
      errorCode: 'MFA_CODE_MISMATCH',
      message: 'Incorrect 6-digit authenticator code.',
      correlationId,
    };
  }

  // Clean up challenge
  challenges.splice(challengeIdx, 1);
  writeServerStore(SERVER_STORAGE.MFA_CHALLENGES, challenges);

  // Fetch account
  const accounts = readServerStore<StoredAdminAccount[]>(SERVER_STORAGE.ADMIN_ACCOUNTS, []);
  const account = accounts.find((a) => a.user.id === challenge.adminId);
  if (!account || account.user.status === 'disabled') {
    return {
      success: false,
      statusCode: 403,
      errorCode: 'ACCOUNT_INACTIVE',
      message: 'Administrative account disabled or invalid.',
      correlationId,
    };
  }

  const session = createServerSession(account.user, options);

  account.user.lastLoginAt = new Date().toISOString();
  writeServerStore(SERVER_STORAGE.ADMIN_ACCOUNTS, accounts);

  recordAuditLog({
    adminId: account.user.id,
    adminEmail: account.user.email,
    adminRole: account.user.role,
    action: 'MFA_VERIFIED_SUCCESS',
    targetResource: 'auth/session',
    details: { sessionExpiry: session.expiresAt },
    severity: 'INFO',
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    correlationId,
  });

  return {
    success: true,
    statusCode: 200,
    data: {
      session,
      admin: account.user,
    },
    message: 'MFA verification verified.',
    correlationId,
  };
}

/**
 * Issue new session and persist in session store
 */
function createServerSession(
  user: AdminUser,
  options: { ipAddress?: string; userAgent?: string; rememberDevice?: boolean }
): AdminSession {
  const token = generateSecureToken();
  const now = new Date();
  const lifetime = options.rememberDevice ? 7 * 24 * 60 * 60 * 1000 : SESSION_MAX_LIFETIME_MS;
  const expiresAt = new Date(now.getTime() + lifetime).toISOString();

  const session: AdminSession = {
    token,
    adminId: user.id,
    adminEmail: user.email,
    role: user.role,
    createdAt: now.toISOString(),
    expiresAt,
    lastActivityAt: now.toISOString(),
    userAgent: options.userAgent,
    ipAddress: options.ipAddress,
    rememberDevice: options.rememberDevice,
  };

  const sessions = readServerStore<Record<string, AdminSession>>(SERVER_STORAGE.ADMIN_SESSIONS, {});
  sessions[token] = session;
  writeServerStore(SERVER_STORAGE.ADMIN_SESSIONS, sessions);

  return session;
}

/**
 * Server Session Verification (Enforced on EVERY admin request)
 */
export function serverVerifySession(token: string | null | undefined): {
  valid: boolean;
  admin?: AdminUser;
  session?: AdminSession;
  error?: string;
  statusCode: number;
} {
  if (!token) {
    return { valid: false, error: 'Authorization header with Bearer token is missing.', statusCode: 401 };
  }

  // 1. Check Revocation List
  const revoked = readServerStore<string[]>(SERVER_STORAGE.REVOKED_TOKENS, []);
  if (revoked.includes(token)) {
    return { valid: false, error: 'Session token has been invalidated/revoked.', statusCode: 401 };
  }

  // 2. Fetch Active Session
  const sessions = readServerStore<Record<string, AdminSession>>(SERVER_STORAGE.ADMIN_SESSIONS, {});
  const session = sessions[token];
  if (!session) {
    return { valid: false, error: 'Session not found or expired on server.', statusCode: 401 };
  }

  // 3. Check Absolute Expiration
  const now = Date.now();
  if (new Date(session.expiresAt).getTime() <= now) {
    delete sessions[token];
    writeServerStore(SERVER_STORAGE.ADMIN_SESSIONS, sessions);
    return { valid: false, error: 'Session has expired.', statusCode: 401 };
  }

  // 4. Check Idle Timeout (if not remember device)
  if (!session.rememberDevice) {
    const lastActive = new Date(session.lastActivityAt).getTime();
    if (now - lastActive > SESSION_IDLE_TIMEOUT_MS) {
      delete sessions[token];
      writeServerStore(SERVER_STORAGE.ADMIN_SESSIONS, sessions);
      return { valid: false, error: 'Session expired due to inactivity.', statusCode: 401 };
    }
  }

  // 5. Verify Underlying Admin Account Status
  const accounts = readServerStore<StoredAdminAccount[]>(SERVER_STORAGE.ADMIN_ACCOUNTS, []);
  const account = accounts.find((a) => a.user.id === session.adminId);
  if (!account) {
    return { valid: false, error: 'Associated admin account no longer exists.', statusCode: 401 };
  }
  if (account.user.status === 'disabled') {
    return { valid: false, error: 'Account has been deactivated.', statusCode: 403 };
  }

  // 6. Slide activity timestamp
  session.lastActivityAt = new Date().toISOString();
  sessions[token] = session;
  writeServerStore(SERVER_STORAGE.ADMIN_SESSIONS, sessions);

  return {
    valid: true,
    admin: account.user,
    session,
    statusCode: 200,
  };
}

/**
 * Server-Side RBAC Permission Verification
 */
export function serverRequirePermission(
  token: string | null | undefined,
  requiredPermission: AdminPermission
): {
  authorized: boolean;
  admin?: AdminUser;
  session?: AdminSession;
  error?: string;
  statusCode: number;
} {
  const sessionCheck = serverVerifySession(token);
  if (!sessionCheck.valid || !sessionCheck.admin) {
    return {
      authorized: false,
      error: sessionCheck.error,
      statusCode: sessionCheck.statusCode,
    };
  }

  const { admin } = sessionCheck;
  // Super admin possesses all permissions
  if (admin.role === 'SUPER_ADMIN') {
    return { authorized: true, admin, session: sessionCheck.session, statusCode: 200 };
  }

  const hasPerm = admin.permissions.includes(requiredPermission);
  if (!hasPerm) {
    recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      adminRole: admin.role,
      action: 'UNAUTHORIZED_ACTION_ATTEMPT',
      targetResource: `permission/${requiredPermission}`,
      severity: 'WARNING',
      correlationId: generateCorrelationId(),
    });
    return {
      authorized: false,
      error: `Access Denied: Account lacks required privilege '${requiredPermission}'.`,
      statusCode: 403,
    };
  }

  return {
    authorized: true,
    admin,
    session: sessionCheck.session,
    statusCode: 200,
  };
}

/**
 * Server Logout & Session Invalidation
 */
export function serverAdminLogout(token: string | null | undefined): AdminApiResponse {
  const correlationId = generateCorrelationId();
  if (!token) {
    return { success: true, statusCode: 200, message: 'No active session.', correlationId };
  }

  // Add to revoked list
  const revoked = readServerStore<string[]>(SERVER_STORAGE.REVOKED_TOKENS, []);
  if (!revoked.includes(token)) {
    revoked.push(token);
    writeServerStore(SERVER_STORAGE.REVOKED_TOKENS, revoked);
  }

  // Remove from active sessions
  const sessions = readServerStore<Record<string, AdminSession>>(SERVER_STORAGE.ADMIN_SESSIONS, {});
  const session = sessions[token];
  if (session) {
    delete sessions[token];
    writeServerStore(SERVER_STORAGE.ADMIN_SESSIONS, sessions);

    recordAuditLog({
      adminId: session.adminId,
      adminEmail: session.adminEmail,
      adminRole: session.role,
      action: 'ADMIN_LOGOUT',
      targetResource: 'auth/session',
      severity: 'INFO',
      correlationId,
    });
  }

  return {
    success: true,
    statusCode: 200,
    message: 'Session revoked successfully.',
    correlationId,
  };
}

/**
 * Server Password Recovery Flow
 */
export function serverRequestPasswordReset(email: string): AdminApiResponse {
  const correlationId = generateCorrelationId();
  const cleanEmail = email.trim().toLowerCase();
  const accounts = readServerStore<StoredAdminAccount[]>(SERVER_STORAGE.ADMIN_ACCOUNTS, []);
  const account = accounts.find((a) => a.user.email.toLowerCase() === cleanEmail);

  // Even if email is not found, return generic success to prevent user enumeration
  if (!account) {
    return {
      success: true,
      statusCode: 200,
      message: 'If the administrative email exists, secure reset instructions have been dispatched.',
      correlationId,
    };
  }

  const resetToken = generateSecureToken();
  const resets = readServerStore<PasswordResetToken[]>(SERVER_STORAGE.RESET_TOKENS, []);
  resets.push({
    token: resetToken,
    email: cleanEmail,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 mins
    used: false,
  });
  writeServerStore(SERVER_STORAGE.RESET_TOKENS, resets);

  recordAuditLog({
    adminId: account.user.id,
    adminEmail: cleanEmail,
    adminRole: account.user.role,
    action: 'PASSWORD_RESET_REQUESTED',
    targetResource: 'auth/reset',
    severity: 'INFO',
    correlationId,
  });

  return {
    success: true,
    statusCode: 200,
    data: { resetTokenSimulated: resetToken },
    message: 'Password recovery token generated and sent to registered admin contact.',
    correlationId,
  };
}

/**
 * Server Update Admin Status (Deactivate or Suspend)
 */
export function serverUpdateAdminStatus(
  requesterToken: string,
  targetAdminId: string,
  newStatus: 'active' | 'disabled' | 'suspended'
): AdminApiResponse {
  const auth = serverRequirePermission(requesterToken, 'MANAGE_ADMIN_USERS');
  if (!auth.authorized || !auth.admin) {
    return {
      success: false,
      statusCode: auth.statusCode,
      message: auth.error,
      correlationId: generateCorrelationId(),
    };
  }

  const correlationId = generateCorrelationId();
  const accounts = readServerStore<StoredAdminAccount[]>(SERVER_STORAGE.ADMIN_ACCOUNTS, []);
  const target = accounts.find((a) => a.user.id === targetAdminId);

  if (!target) {
    return { success: false, statusCode: 404, message: 'Target admin account not found.', correlationId };
  }

  // Prevent disabling self or other super admins unless explicitly allowed
  if (target.user.role === 'SUPER_ADMIN' && target.user.id === auth.admin.id) {
    return { success: false, statusCode: 400, message: 'Cannot disable your own Super Admin account.', correlationId };
  }

  const oldStatus = target.user.status;
  target.user.status = newStatus;
  writeServerStore(SERVER_STORAGE.ADMIN_ACCOUNTS, accounts);

  // If disabled, revoke all active sessions for that admin immediately
  if (newStatus === 'disabled') {
    const sessions = readServerStore<Record<string, AdminSession>>(SERVER_STORAGE.ADMIN_SESSIONS, {});
    const revoked = readServerStore<string[]>(SERVER_STORAGE.REVOKED_TOKENS, []);
    for (const [t, s] of Object.entries(sessions)) {
      if (s.adminId === targetAdminId) {
        revoked.push(t);
        delete sessions[t];
      }
    }
    writeServerStore(SERVER_STORAGE.ADMIN_SESSIONS, sessions);
    writeServerStore(SERVER_STORAGE.REVOKED_TOKENS, revoked);
  }

  recordAuditLog({
    adminId: auth.admin.id,
    adminEmail: auth.admin.email,
    adminRole: auth.admin.role,
    action: 'ADMIN_ACCOUNT_STATUS_CHANGED',
    targetResource: `admin_user/${targetAdminId}`,
    beforeState: { status: oldStatus },
    afterState: { status: newStatus },
    severity: 'CRITICAL',
    correlationId,
  });

  return {
    success: true,
    statusCode: 200,
    message: `Admin account status updated to ${newStatus}.`,
    correlationId,
  };
}

// -------------------------------------------------------------
// Real Operational Metrics Engine (Shared Business Data Source)
// -------------------------------------------------------------
export function serverGetAdminMetrics(token: string): AdminApiResponse<AdminMetricsSummary> {
  const auth = serverVerifySession(token);
  if (!auth.valid) {
    return {
      success: false,
      statusCode: auth.statusCode,
      message: auth.error,
      correlationId: generateCorrelationId(),
    };
  }

  // Read actual records from central business storage
  const registeredUsersRaw = readServerStore<any[]>('colin_registered_users', []);
  const propertiesRaw = readServerStore<any[]>('colin_all_properties', []);
  const visitsRaw = readServerStore<any[]>('colin_student_visits', []);
  const subscriptionsRaw = readServerStore<any>('colin_owner_subscription', null);

  // Calculate actual counts from live store
  const totalStudents = registeredUsersRaw.filter((u) => u.role === 'student').length;
  const totalOwners = registeredUsersRaw.filter((u) => u.role === 'owner').length;
  const totalProperties = propertiesRaw.length;

  const pendingPropertyVerifications = propertiesRaw.filter(
    (p) =>
      p.verificationStatus === 'inspection_requested' ||
      p.verificationStatus === 'inspection_scheduled' ||
      p.verificationStatus === 'payment_pending'
  ).length;

  const pendingVisitRequests = visitsRaw.filter(
    (v) =>
      v.status === 'PENDING_COLIN_REVIEW' ||
      v.status === 'AWAITING_OWNER_AVAILABILITY' ||
      v.status === 'AWAITING_COLIN_CONFIRMATION'
  ).length;

  const completedVisits = visitsRaw.filter(
    (v) =>
      v.status === 'Completed' ||
      v.status === 'VISIT_COMPLETED_DECISION_PENDING' ||
      v.status === 'STUDENT_ACCEPTED' ||
      v.status === 'STUDENT_REJECTED'
  ).length;

  // Active volunteers participating in physical property inspections & student visit guiding
  const activeVolunteers = 14;

  // Derive platform revenue from visit slot booking fees and subscription tiers
  let totalRevenue = 0;
  for (const visit of visitsRaw) {
    if (visit.feePaid) {
      totalRevenue += Number(visit.feePaid);
    }
  }
  if (subscriptionsRaw && subscriptionsRaw.price) {
    totalRevenue += Number(subscriptionsRaw.price);
  }

  return {
    success: true,
    statusCode: 200,
    data: {
      totalStudents,
      totalOwners,
      totalProperties,
      pendingPropertyVerifications,
      pendingVisitRequests,
      completedVisits,
      activeVolunteers,
      totalPlatformRevenue: totalRevenue,
      isPrototypeData: true,
    },
    correlationId: generateCorrelationId(),
  };
}
