# PHASE 4A.2.3 — AUTHORIZATION & RBAC ARCHITECTURE REPORT

**Project:** COLIN — Campus Living Verified  
**Phase:** Phase 4A.2.3 (Authentication & Authorization Integration)  
**Engineering Roles:** RBAC / Authorization Engineer, Application Security Engineer, Principal Backend Architect  
**Status:** COMPLETE & VERIFIED  
**Date:** 2026-11-06  

---

## 1. Executive Summary

This report specifies the role-based access control (RBAC), context extraction boundaries, and resource ownership protection mechanisms implemented in Phase 4A.2.3. The authorization subsystem enforces least-privilege principles, strictly prohibiting horizontal privilege escalation (cross-tenant access) and vertical privilege escalation (user to administrator).

---

## 2. Role Taxonomy & Platform Matrix

COLIN defines three distinct platform personas governed by database enums and application guards:

| Role | Database Enum | Portal Surface | Permitted Actions | Prohibited Actions |
| :--- | :--- | :--- | :--- | :--- |
| **`STUDENT`** | `UserRoleType.STUDENT` | Student Portal | Search stays, manage student profile, create booking requests, view assigned visits, manage personal sessions. | Modify property listings, access financial ledgers, view other students' profiles, execute administrative tasks. |
| **`OWNER`** | `UserRoleType.OWNER` | Owner Portal | Manage property listings, upload room photos, view booking inquiries for owned stays, review payouts. | Access properties owned by other owners, perform student booking requests, access administrative audit trails. |
| **`ADMIN`** | `UserRoleType.ADMIN` | Admin Control Centre | Verify student KYC, audit ledger entries, review dispute cases, manage system settings, access administrative diagnostics. | Cannot self-register publicly; provisioned strictly via isolated administrative workflows. |

---

## 3. Authorization Route Guards & Middleware

### 3.1 `authContextMiddleware` (`src/server/middleware/authContext.ts`)
Attaches trusted, server-derived security metadata to `req.context`:
```typescript
export interface AuthenticatedRequestContext {
  userId: string;
  role: UserRoleType;
  sessionId: string;
  authenticationStatus: 'AUTHENTICATED' | 'ANONYMOUS';
  email?: string;
  permissions?: AdminPermission[];
  adminRole?: AdminRole;
}
```
* **Production Path:** Extracts Bearer token or HttpOnly cookie, verifies HS256 signature using `TokenService.verifyAccessToken()`. If valid, populates authenticated context; if invalid or absent, marks request `ANONYMOUS`.
* **Testing Backwards Compatibility:** Preserves structured fixture tokens (`test-token-<userId>-<role>[-<adminRole>]`) under `NODE_ENV !== 'production'` to ensure existing regression suites pass without disruption.
* **Elimination of Header Trust:** Client-provided `x-role` or `x-user-id` headers are completely ignored.

### 3.2 Guard Directives

#### `requireAuth()`
* Rejects requests with `HTTP 401 Unauthorized` if `req.context.authenticationStatus !== 'AUTHENTICATED'` or `req.context.userId` is empty.
* Standardized error response: `ApiErrorResponse` with code `UNAUTHENTICATED`.

#### `requireRole(allowedRoles: UserRoleType[])`
* Ensures `req.context.role` is included in the allowed roles array.
* If user is unauthenticated: triggers `HTTP 401 UNAUTHENTICATED`.
* If authenticated but role is not permitted: triggers `HTTP 403 FORBIDDEN` (`FORBIDDEN`).

#### `requireResourceOwner(getOwnerUserId: (req: Request) => string | string[] | undefined)`
* Enforces horizontal tenant isolation.
* Resolves resource owner ID from request parameters, body, or query.
* Permits execution if:
  1. `req.context.role === UserRoleType.ADMIN` (Supervisory access), OR
  2. `req.context.userId === resolvedOwnerId` (Self-service access).
* Otherwise rejects with `HTTP 403 FORBIDDEN` (`You are not authorized to access or modify this resource.`).

#### `requireAdmin(minimumRole?: AdminRole)`
* Enforces administrative access boundaries:
  1. Must be `AUTHENTICATED`.
  2. Must have `req.context.role === UserRoleType.ADMIN`.
  3. If `minimumRole` is specified, ensures `req.context.adminRole` satisfies or exceeds tier (or equals `'SUPER_ADMIN'`).
* Non-administrators are rejected with `HTTP 403 FORBIDDEN`.

---

## 4. Empirical Security & Privilege Escalation Tests

The following authorization scenarios were executed against live endpoints:

1. **Unauthenticated Access to Protected Endpoints:**
   - Requesting `GET /api/v1/auth/me` without Authorization header -> Rejected with HTTP 401 `UNAUTHENTICATED`.
   - Requesting `GET /api/v1/auth/sessions` without Authorization header -> Rejected with HTTP 401 `UNAUTHENTICATED`.
2. **Student Attempting Administrative Execution:**
   - Authenticated student session making request to `GET /api/v1/system/admin-test` -> Rejected with HTTP 403 `FORBIDDEN`.
3. **Cross-Tenant Session Manipulation:**
   - Authenticated user attempting `DELETE /api/v1/auth/sessions/:sessionId` where session belongs to another user -> Rejected with HTTP 403 `FORBIDDEN`.
4. **Forged Bearer Token Rejection:**
   - Tampered JWT token with modified signature submitted to `/api/v1/auth/me` -> Rejected with HTTP 401 `UNAUTHENTICATED`.

---

## 5. Authorization Verification Sign-Off

All authorization guards and RBAC policies are verified and operating in full compliance with the COLIN Master Engineering Standard.
