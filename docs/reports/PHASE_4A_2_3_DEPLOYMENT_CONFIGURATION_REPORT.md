# PHASE 4A.2.3 — DEPLOYMENT & CONFIGURATION SPECIFICATION REPORT

**Project:** COLIN — Campus Living Verified  
**Phase:** Phase 4A.2.3 (Authentication & Authorization Integration)  
**Target Environments:** Staging / Production / CI/CD  
**Status:** COMPLETE & VERIFIED  
**Date:** 2026-11-06  

---

## 1. Executive Summary

This report establishes the deployment environment configuration, cryptographic secret management protocols, cookie security policies, and production operational prerequisites for the COLIN authentication engine.

---

## 2. Environment Variables Catalog

| Variable Name | Required | Default / Example Value | Description |
| :--- | :-: | :--- | :--- |
| `NODE_ENV` | Yes | `production` | Runtime mode (`development`, `test`, `production`). |
| `PORT` | No | `3001` | Network port for the Express application. |
| `HOST` | No | `0.0.0.0` | Bind IP interface. |
| `DATABASE_URL` | Yes | `postgresql://colin_app_runtime:<SECRET>@db:5432/colin?schema=public` | Connection pool URI authenticated as `colin_app_runtime`. |
| `ADMIN_DATABASE_URL`| Yes | `postgresql://colin_admin_runtime:<SECRET>@db:5432/colin?schema=public`| Connection pool URI authenticated as `colin_admin_runtime`. |
| `JWT_SECRET` | Yes | `min-32-chars-cryptographically-random-hex` | 256-bit secret used to sign and verify HS256 JWT access tokens. |
| `JWT_EXPIRES_IN` | No | `15m` | Lifetime of access tokens (900 seconds). |
| `REFRESH_TOKEN_EXPIRES_DAYS`| No | `7` | Retention window for active refresh token sessions in days. |
| `BCRYPT_ROUNDS` | No | `12` | Cost factor for password hashing (12 in prod, 10 in test). |
| `CORS_ORIGINS` | Yes | `https://student.colin.in,https://owner.colin.in` | Comma-separated list of allowed browser origins. |
| `BODY_SIZE_LIMIT` | No | `1mb` | Maximum JSON request body size ceiling. |

---

## 3. Cookie Security & Cross-Site Scripting (XSS) Defenses

All authentication cookies issued by `AuthController` enforce production security flags:

1. **`HttpOnly: true`:** Prohibits client-side JavaScript from accessing cookies via `document.cookie`, neutralizing cross-site scripting (XSS) token theft.
2. **`Secure: true`:** When `NODE_ENV === 'production'`, cookies are strictly transmitted over HTTPS, preventing sniffing on insecure networks.
3. **`SameSite: 'lax'`:** Defends against Cross-Site Request Forgery (CSRF) while ensuring seamless top-level navigation from verified external portals.
4. **Scoping (`path`):**
   - `accessToken`: Scoped to root (`/`) for universal API access.
   - `refreshToken`: Restricted strictly to `/api/v1/auth`, minimizing unnecessary exposure on public static routes.

---

## 4. Secret Lifecycle & Key Rotation Strategy

1. **`JWT_SECRET` Rotation Protocol:**
   - In production, dual-secret verification will be supported during scheduled maintenance windows (accepting tokens signed with either current or prior secret while minting with new secret).
2. **Database Credential Masking:**
   - The database configuration module (`src/server/database/config.ts`) automatically intercepts and masks passwords via `redactDatabaseUrl()`. Raw passwords are never exposed in log outputs, APM traces, or health check responses.

---

## 5. Production Readiness Checklist

- [x] Dual-role database connection pooling configured (`colin_app_runtime` vs `colin_admin_runtime`).
- [x] Zero plaintext passwords logged or returned in responses.
- [x] Password complexity policy verified (minimum 8 characters with alphanumeric requirements).
- [x] Sliding-window rate limiting active on `/register`, `/login`, and `/password/forgot`.
- [x] Refresh token rotation and replay-attack reuse detection verified.
- [x] Account enumeration prevention verified on password reset workflows.
- [x] Clean TypeScript build (`tsc --noEmit` exits with 0 errors).
- [x] Production bundle successfully generated via Vite.
