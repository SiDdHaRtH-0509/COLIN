# COLIN — Phase 6 Starting Baseline & System Handover Reference

**Document Version**: 1.0.0  
**Baseline Date**: November 14, 2026  
**Originating Phase**: Phase 5 (Central PostgreSQL Activation & Acceptance)  
**Target Phase**: Phase 6  
**Git Branch**: `colin-prototype-completion`  
**Status**: **FROZEN & VERIFIED BASELINE**

---

## 1. Environment & Infrastructure Topology

```
+-----------------------------------------------------------------------------------+
|                                  COLIN RUNTIME                                    |
+-----------------------------------------------------------------------------------+
|  Client Portals (Vite / React 18):       |  Backend Gateway (Node.js 20 / Express): |
|  - Public Website (/)                    |  - Host: http://localhost:5000         |
|  - Student Portal (/student/*)           |  - Base API: /api/v1                   |
|  - Owner Portal (/owner/*)               |  - Health Probes: /health/live, /ready |
|  - Admin Control Centre (/admin/*)       |                                        |
+------------------------------------------+----------------------------------------+
                                           |
                              Prisma Client ORM (5.22.0)
                        Dual Connection Pools (10 conn/role)
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                   Dedicated PostgreSQL 16.16 Docker Service                       |
|                          Container: colin-postgres                                |
|                               Port: 5434                                          |
|                          Databases: colin, colin_test                             |
+-----------------------------------------------------------------------------------+
```

---

## 2. Platform Startup & Development Commands

### A. Database Provisioning & Management
```bash
# Verify PostgreSQL container is running
docker ps --filter "name=colin-postgres"

# Inspect database schema and apply pending migrations
pnpm exec prisma validate
pnpm exec prisma migrate status

# Run database connectivity and user verification script
node scripts/test-db-connection.mjs
```

### B. Backend Service Startup
```bash
# Start the Express API server (runs on http://localhost:5000)
pnpm run start:server
# Or using tsx directly:
pnpm exec tsx src/server/server.ts
```

### C. Frontend Web Applications Startup
```bash
# Start Vite development server (runs on http://localhost:5173)
pnpm run dev

# Build production bundle
pnpm run build
```

---

## 3. Test Suites & Verification Commands

All test commands run without mocking live database constraints:

```bash
# 1. Live PostgreSQL 16+ Engine Integrity Suite (78 tests)
pnpm exec vitest run src/test/database/postgres-integrity.integration.test.ts

# 2. Backend ORM & Lifecycle Integration Suite (43 tests)
pnpm exec vitest run src/test/database/backend-orm-integration.test.ts

# 3. Cross-Browser Synchronization & Shared Backend Persistence (8 tests)
pnpm exec vitest run src/test/cross_browser_integration.test.ts

# 4. Admin Auth & Foundation Component Suite (15 tests)
pnpm exec vitest run src/test/admin_auth_and_foundation.test.tsx

# 5. Admin End-to-End Acceptance Suite (12 tests)
pnpm exec vitest run src/test/admin_e2e_acceptance.test.tsx

# 6. Admin Pages Component Suite (6 tests)
pnpm exec vitest run src/test/admin_pages.test.tsx

# Full Automated Regression Gate (162 tests)
pnpm run test:db:integration
pnpm run test:orm:integration

# Typecheck
pnpm exec tsc --noEmit
```

---

## 4. Authentication, Session & RBAC Architecture

### A. Authentication Architecture
- **Tokens**: Stateless JSON Web Tokens (JWT) signed with HMAC-SHA256.
- **Header Convention**: `Authorization: Bearer <token>`
- **Password Security**: Passwords hashed with `bcryptjs` using 12 salt rounds. Plaintext passwords are never stored or returned in DTOs.
- **Account Identification**: Unique UUID v4 primary keys across all user records. Unique constraint enforced on `users.email`.

### B. Role-Based Access Control (RBAC)
- **Roles**:
  - `STUDENT`: Access to public search, student profile, visit booking pass creation, fee payments, and decision submission.
  - `OWNER`: Access to property management, photo uploads, KYC document submission, and booking inquiry review.
  - `ADMIN`: Operational management, property verification review, visit scheduling, user moderation.
  - `SUPER_ADMIN`: Comprehensive administrative rights including system configuration, metrics, role promotion, and audit inspection.
- **Middleware Enforcement**:
  - `requireAuth`: Verifies token signature and checks if user account is `ACTIVE`. Suspended accounts are immediately rejected with HTTP 403.
  - `requireRole(...)`: Validates that the active session matches one of the authorized roles. Unauthorized requests receive HTTP 403 Forbidden.

### C. Database Role Separation (Least Privilege)
- **`colin_app_runtime`**: Runtime role used for all public, student, and owner requests. Strictly barred from reading or writing to `admin_accounts`, `admin_roles`, or `admin_audit_logs`.
- **`colin_admin_runtime`**: Dedicated runtime role used for administrative requests. Authorized to write audit logs; strictly prohibited from modifying or truncating audit history.

---

## 5. Audit & Compliance Infrastructure

- **Immutable Audit Logs**: The `admin_audit_logs` table logs all administrative actions with timestamp, admin ID, target resource, action category, and JSON diff metadata.
- **PostgreSQL Triggers**:
  - `prevent_table_truncate`: Blocks `TRUNCATE TABLE` on audit, ledger, and status history tables.
  - `check_ledger_transaction_balance`: Enforces zero-sum double-entry accounting.
  - `chk_booking_settlement_exact_allocation`: Mandates that rejection refunds (₹82.50) and retained fees (₹67.50) exactly equal ₹150.00.

---

## 6. Known Security & Implementation Boundaries for Phase 6

1. **Production Secret Management**: Development currently relies on a gitignored `.env` file. For Phase 6 production deployments, configure AWS Secrets Manager, HashiCorp Vault, or platform-managed environment secrets.
2. **Rate Limiting**: In-memory Redis rate limiter is active; consider scaling to distributed Redis cluster if traffic exceeds 10,000 req/sec.
3. **Session Revocation**: JWT tokens use short TTLs with refresh rotation. In Phase 6, integrate real-time token blocklisting in Redis for immediate session revocation upon password reset.
