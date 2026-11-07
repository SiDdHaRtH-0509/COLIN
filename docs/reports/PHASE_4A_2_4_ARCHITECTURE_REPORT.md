# COLIN — Phase 4A.2.4 Architectural Design & Service Blueprint Report

**Phase:** Phase 4A.2.4 — Core Marketplace Domain & Business API Implementation  
**Project:** COLIN — Campus Living Verified  
**Runtime:** Node.js 20+ / TypeScript Strict  
**Database:** PostgreSQL 18.4 (Disposable Integration & Target Production)  
**ORM:** Prisma 5.22.0  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary

Phase 4A.2.4 establishes the core accommodation marketplace business domain and RESTful API layer for the COLIN platform. Building directly upon the security-hardened authentication foundation from Phase 4A.2.3 and the verified multi-role PostgreSQL architecture from Phase 4A.2.2, this phase delivers the domain models, repositories, business services, controllers, routes, and validation schemas governing student profiles, owner operations, property inventory, photo asset management, admin moderation workflows, and public search/discovery.

All architectural implementations adhere strictly to the principle of least privilege, strict input validation via Zod, binary magic byte image inspection, zero-direct-contact data privacy enforcement, and dual-audit tracking.

---

## 2. Layered Architecture & Component Topology

The system adheres strictly to a clean, multi-layered hexagonal architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HTTP / REST Clients                             │
│       (Student Portal, Owner Workspace, Admin Control Centre, Public)  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTP / HTTPS
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     API Gateway & Security Layer                       │
│  - Helmet Security Headers                                             │
│  - CORS Policy Engine                                                  │
│  - Rate Limiter (Standard & Strict Auth Limiters)                       │
│  - Request ID & Correlation Tracking                                   │
│  - Cookie Parser & CSRF Double-Submit Validation                       │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Authentication & RBAC Middleware                   │
│  - authenticateAccessToken (JWT Verification & UserSession check)      │
│  - requireRoles([STUDENT, PROPERTY_OWNER, ADMIN])                     │
│  - requireAdminAccess (colin_admin_runtime credential verification)    │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       Express Routing Layer (v1)                       │
│  - /api/v1/students           -> student.routes.ts                     │
│  - /api/v1/owners             -> owner.routes.ts                       │
│  - /api/v1/owner/properties   -> owner.property.routes.ts              │
│  - /api/v1/properties         -> public.property.routes.ts             │
│  - /api/v1/admin/properties   -> admin.property.routes.ts              │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Controllers & DTO Validation                      │
│  - Zod Request Body, Param, and Query Parsing                          │
│  - HTTP Status Code & RFC-7807 Error Envelope Serialization            │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Domain Service Layer                            │
│  - StudentService (Profile completion, preferences)                    │
│  - OwnerService (Profile management, summary KPIs)                     │
│  - PropertyService (Creation, update, photos, privacy sanitization)    │
│  - AdminPropertyService (Review queue, dossier, approval/rejection)    │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       Data Access Layer              │  │      Storage Service         │
│  - StudentRepository                 │  │  - StorageProvider Interface │
│  - OwnerRepository                   │  │  - LocalStorageProvider       │
│  - PropertyRepository                │  │  - Binary Magic Byte Checker  │
│  - AdminPropertyRepository           │  │  - Max 5MB & Safe Filenames   │
└──────────────────┬───────────────────┘  └──────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Prisma ORM & PostgreSQL Database                  │
│  - Dual Connection Pools: colin_app_runtime vs colin_admin_runtime     │
│  - Database Enforced Constraints & Invariant Triggers                  │
│  - PostgreSQL 18.4 Engine                                              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Security Boundaries & Least Privilege Separation

1. **Role-Based Connection Pool Isolation:**
   - Standard application operations (`/api/v1/students`, `/api/v1/owners`, `/api/v1/owner/properties`, `/api/v1/properties`) execute exclusively via `colin_app_runtime`.
   - Administrative moderation operations (`/api/v1/admin/properties`) execute via `colin_admin_runtime`.
   - `colin_app_runtime` is strictly prohibited by PostgreSQL DDL privileges from accessing `admin_accounts`, `admin_sessions`, `admin_audit_logs`, and writing to `property_verification_audits`.
   - `colin_admin_runtime` possesses read/update privileges on moderation tables with immutable triggers preventing deletion or tampering of audit trails.

2. **Data Privacy & Zero-Direct-Contact Guarantee:**
   - Public property endpoints (`/api/v1/properties` and `/api/v1/properties/:slug`) run through `formatPublicPropertyDto()`.
   - Owner direct contact information (`phone`, `email`, internal user IDs, PAN, GSTIN, bank details) is completely stripped and never exposed to prospective students.
   - All tenant inquiries and visit bookings must route through COLIN verified platform channels.

3. **Storage Asset Security:**
   - Direct file uploads require multipart parsing, binary inspection of initial file bytes (JPEG `0xFFD8FF`, PNG `0x89504E47`, WEBP `RIFF...WEBP`), strict 5MB file size enforcement, and UUID-based collision-resistant file names.

---

## 4. Verification & Readiness Verdict

- **Architecture Integrity:** PASS
- **Layer Decoupling:** PASS
- **Least-Privilege Role Isolation:** PASS
- **Production Build:** PASS
