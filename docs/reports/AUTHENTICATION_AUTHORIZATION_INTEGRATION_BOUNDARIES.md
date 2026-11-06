# COLIN — AUTHENTICATION AND AUTHORIZATION INTEGRATION BOUNDARIES

**Phase:** Phase 4A.2.2.3 — Backend Core Service & API Architecture  
**Component Modules:** `src/server/types/auth.ts`, `src/server/middleware/authContext.ts`  
**Security Standard:** Zero-Trust Server-Side Context & Role Enforcement  
**Status:** FULL PASS  

---

## 1. Executive Summary & Purpose

Phase 4A.2.2.3 establishes formal integration boundaries for backend authentication and authorization without implementing business registration or login endpoints (which belong to Phase 4A.2.4).

The architecture establishes:
1. A strongly typed server-side security context (`AuthenticatedRequestContext`).
2. Middleware interfaces for authentication checking (`requireAuth()`), role authorization (`requireRole()`), and administrative isolation (`requireAdmin()`).
3. Explicit zero-trust rules ensuring controllers never trust client-supplied headers or roles.

---

## 2. Authenticated Request Context (`AuthenticatedRequestContext`)

Defined in `src/server/types/auth.ts`, the context represents the verified identity of the caller:

```typescript
export type AuthStatus = 'AUTHENTICATED' | 'ANONYMOUS';

export interface AuthenticatedRequestContext {
  userId: string;
  role: UserRoleType;
  sessionId: string;
  authenticationStatus: AuthStatus;
  email?: string;
  permissions?: AdminPermission[];
  adminRole?: AdminRole;
}

declare global {
  namespace Express {
    interface Request {
      id?: string;
      context?: AuthenticatedRequestContext;
    }
  }
}
```

### 2.1 Core Rules
- **Server-Side Provenance**: The context is attached exclusively by server-side middleware after cryptographic or session verification.
- **Default State**: Requests lacking valid credentials receive `authenticationStatus = 'ANONYMOUS'`.

---

## 3. Middleware Security Interfaces

Located in `src/server/middleware/authContext.ts`:

### 3.1 `authContextMiddleware`
- Inspects incoming `Authorization: Bearer <token>` header.
- In development/test environments, parses structured test bearer tokens (`test-token-<userId>-<role>[-<adminRole>]`) to allow reproducible integration testing of role boundaries.
- In production, acts as the integration hook for JWT and session validation engines (to be connected in Phase 4A.2.4).

### 3.2 `requireAuth()`
- Rejects anonymous requests with HTTP 401 `UNAUTHENTICATED`:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication required to access this resource."
  },
  "meta": { "requestId": "..." }
}
```

### 3.3 `requireRole(allowedRoles: UserRoleType[])`
- Checks whether `req.context.role` is included in `allowedRoles`.
- Rejects unauthorized roles with HTTP 403 `FORBIDDEN`.

### 3.4 `requireAdmin(minimumRole?: AdminRole)`
- Strictly protects administrative endpoints.
- Verifies that `req.context.role === UserRoleType.ADMIN`.
- If `minimumRole` is specified, verifies that `req.context.adminRole` satisfies the tier requirement (`SUPER_ADMIN` has universal access).
- Non-admin users attempting to access administrative routes receive HTTP 403 `FORBIDDEN`.

---

## 4. Zero-Trust Security Guarantees

1. **No Client Role Injection**: The server explicitly ignores headers such as `X-User-Role` or `X-Admin-Role`.
2. **No Hardcoded Production Secrets**: No test identities or bypass tokens are accepted when `NODE_ENV === 'production'`.
3. **Fail-Closed Design**: If the security context cannot be resolved, the request is treated as anonymous.

---

## 5. Verification Results

In `src/test/api/backend-core-api.integration.test.ts`:
- Unauthenticated requests to `/api/v1/system/admin-test` failed with HTTP 401 `UNAUTHENTICATED`.
- Authenticated `STUDENT` requests to `/api/v1/system/admin-test` failed with HTTP 403 `FORBIDDEN`.
- Authenticated `ADMIN` requests to `/api/v1/system/admin-test` succeeded with HTTP 200 and received authorized context.
- Zero credential disclosure was observed.
