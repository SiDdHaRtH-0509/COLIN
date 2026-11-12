# COLIN — Security Architecture & Data Protection Documentation

**Document ID:** COLIN-EVID-008  
**Target:** Academic B.Tech Capstone Project Documentation  
**Repository Branch:** `colin-prototype-completion`  
**Security Middleware:** [authContext.ts](file:///C:/Users/clsid/COLIN/src/server/middleware/authContext.ts), [securityHeaders.ts](file:///C:/Users/clsid/COLIN/src/server/middleware/securityHeaders.ts)  
**Database Security:** [COLIN_CUSTOM_POSTGRESQL_CONSTRAINTS.sql](file:///C:/Users/clsid/COLIN/docs/database/COLIN_CUSTOM_POSTGRESQL_CONSTRAINTS.sql#L790-L950)  

---

## 1. Security Architecture Principles

COLIN incorporates Defense-in-Depth across every architectural boundary:
1. **Zero Client Trust:** Controllers never trust client-asserted roles, user IDs, or permissions; all authorization derives strictly from verified cryptographic JWT context attached on the server.
2. **Principle of Least Privilege (PoLP):** Distinct PostgreSQL runtime roles isolate customer web application queries (`colin_app_runtime`) from administrative control centre operations (`colin_admin_runtime`).
3. **Contact Information Masking:** Direct communication channels between students and hosts are shielded to eliminate broker circumvention, extortion, and off-platform harassment.
4. **Append-Only Immutability:** Audit trails and financial journals cannot be modified or deleted, even by administrative principals.

---

## 2. Authentication & Session Management

- **Cryptographic Token Issuance:**
  - **Access Tokens:** Signed via HMAC-SHA256 (`jsonwebtoken v9.0.3`), carrying a short 15-minute time-to-live (TTL). Payload includes `userId`, `role`, and `sessionId`.
  - **Refresh Tokens:** High-entropy random tokens stored in HTTP-only, secure, `SameSite=Strict` cookies with a 7-day TTL.
- **Password Security:**
  - Password hashing employs `bcryptjs` with 12 computational salt rounds.
  - Plaintext passwords are never logged, echoed in error payloads, or cached in memory.
- **Cryptographic Key Separation:**
  - As enforced by [secrets.config.ts](file:///C:/Users/clsid/COLIN/src/server/config/secrets.config.ts), `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be distinct 256-bit cryptographically random strings. Shared or reused keys throw fatal startup errors.

---

## 3. Role-Based Access Control (RBAC) & Boundary Isolation

### 3.1 Role Hierarchy & Permissions

```
                     +-----------------------------------+
                     |         Unauthenticated           |
                     | (Search properties, filter, view) |
                     +-----------------------------------+
                                       |
                +----------------------+----------------------+
                |                                             |
                v                                             v
     +--------------------+                         +--------------------+
     |      STUDENT       |                         |       OWNER        |
     | • Book guided visit|                         | • Create property  |
     | • Pay visit pass   |                         | • Upload 8 photos  |
     | • Submit decision  |                         | • Submit for audit |
     +--------------------+                         +--------------------+
                |                                             |
                +----------------------+----------------------+
                                       |
                                       v
                     +-----------------------------------+
                     |               ADMIN               |
                     | • Verification queue approvals    |
                     | • Visit guide dispatch            |
                     | • IAS-1 balanced ledger dashboard |
                     | • Overdue decision expiry trigger |
                     +-----------------------------------+
```

### 3.2 Administrative Isolation
- Dedicated table `admin_accounts` maintains admin identities separate from general marketplace users in `users`.
- Administrative portal operates under `/admin/login` with strict CSRF tokens and separate session management.
- Backend routes under `/api/v1/admin/*` are guarded by `requireAdmin()`. Non-admin JWT tokens attempting access are rejected with HTTP 403 Forbidden.

---

## 4. Privacy & Contact Masking Safeguards

1. **Host Contact Shielding:**
   Public property listings returned by `GET /api/v1/properties` and `GET /api/v1/properties/:idOrSlug` omit phone numbers, email addresses, and bank accounts.
2. **Student Privacy Shielding:**
   Property owners never receive student phone numbers or home addresses. Guided visits are coordinated exclusively through vetted platform ambassadors.
3. **Anti-Harassment Barrier:**
   By preventing direct contact disclosure until on-site move-in, students are insulated from unvetted broker marketing, aggressive sales pressure, and unauthorized outreach.

---

## 5. Media & File Upload Hardening

The image upload pipeline in [image.processor.ts](file:///C:/Users/clsid/COLIN/src/server/storage/image.processor.ts) enforces multi-layered defenses:

- **Magic Byte Binary Inspection:** Checks leading bytes to verify actual image formats (JPEG `ffd8ff`, PNG `89504e`, WebP `52494646...57454250`).
- **Script & Executable Rejection:** Scans ASCII headers to intercept SVGs, XML, HTML scripts, and Windows PE/ELF binaries disguised as images.
- **Decompression Bomb Defense:** Limits maximum decoded pixel dimensions to 16 Megapixels (`4096 × 4096 px`), preventing CPU/RAM starvation.
- **EXIF & Privacy Metadata Stripping:** Automatically removes all EXIF tags, camera serial numbers, and embedded GPS coordinates during WebP re-encoding.
- **Strict 8-Photo Quota:** Database trigger `trg_enforce_max_property_photos` locks the property row and ensures no property can exceed 8 photos.

---

## 6. Distributed Rate Limiting & Denial-of-Service Defense

Configured in [rateLimiter.service.ts](file:///C:/Users/clsid/COLIN/src/server/redis/rateLimiter.service.ts) using Redis 7 sliding-window Lua scripts:

| Endpoint Tier | Rate Limit Window | Max Requests | Violation Action |
|---|---|---|---|
| **Public Search** (`/api/v1/properties`) | 60 seconds | 120 requests | HTTP 429 Too Many Requests |
| **Authentication** (`/api/v1/auth/login`) | 60 seconds | 10 requests | HTTP 429 + IP Cooling Period |
| **Media Uploads** (`/api/v1/owner/properties/*/photos`) | 60 seconds | 20 requests | HTTP 429 Too Many Requests |
| **Booking & Payments** (`/api/v1/bookings/*`) | 60 seconds | 30 requests | HTTP 429 Too Many Requests |

---

## 7. Audit Logging & Non-Repudiation

- **Central Audit Trails:**
  - `admin_audit_logs`: Records admin approvals, rejections, overrides, and manual triggers.
  - `booking_status_histories`: Immutable state history of every booking transition.
  - `property_verification_audits`: Physical checklist evaluations recorded by field concierges.
- **Database Immutability Triggers:**
  - Row-level trigger `trg_prevent_mutation_admin_audit_logs` blocks `UPDATE` and `DELETE`.
  - Statement-level trigger `trg_prevent_truncate_*` blocks `TRUNCATE` operations on all audit tables.
