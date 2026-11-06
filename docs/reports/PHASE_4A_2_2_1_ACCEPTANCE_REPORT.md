# COLIN — PHASE 4A.2.2.1 ACCEPTANCE REPORT
## Central Relational Database Schema Design & Data Modelling

**Role:** Principal Database Architect, Senior Backend Engineer, PostgreSQL Specialist, Application Security Architect  
**Project:** COLIN (Campus Living Verified)  
**Phase:** 4A.2.2.1 (Central Database Schema Design & Data Modelling)  
**Date:** November 5, 2026  
**Status:** COMPLETE (Design & Documentation: DOCUMENTED; Prisma Schema: IMPLEMENTED)

---

## 1. EXISTING ARCHITECTURE ASSESSMENT

### 1.1 Current Application State
A thorough inspection of the repository confirms the following architectural facts:
1. **Frontend Architecture:** Modern Single Page Application (SPA) built using Vite 6, React 19, and TypeScript 5.8. Styling is powered by Tailwind CSS 4 with custom design tokens.
2. **Current Persistence Layer:** The active platform stores state exclusively on the client side:
   - `localStorage`: Used for student and owner authentication tokens, student onboarding state, search filters, preferences, and Phase 4A Admin Vault credentials (`colin_admin_vault_v1`, `colin_admin_session_v1`, `colin_admin_audit_logs_v1`).
   - `IndexedDB`: Used for property listings, reviews, bookings, and image cache via client-side storage services (`src/services/storage/`).
3. **Backend & Database Reality:** There is currently **NO** live PostgreSQL database instance, standalone Node.js API server, or active backend service running in the codebase. All existing API calls (`src/services/admin/adminApiClient.ts`) resolve via a client-side simulated server (`src/server/adminSecurity.ts`).
4. **Data Isolation Gaps in Pre-Phase 4 Architecture:**
   - Property records in `localStorage`/`IndexedDB` lack relational constraints between owner profiles, room types, and physical bed slots.
   - Financial figures are stored as arbitrary client-side numbers rather than audited double-entry ledger entries.
   - Booking records lack enforced server timestamps, exposing the 12-hour visit decision window to client clock manipulation.
   - Admin credentials and audit logs were stored in browser `localStorage`, which the Phase 4A.1 security audit correctly classified as high/critical production risks.

### 1.2 Purpose of Phase 4A.2.2.1
Phase 4A.2.2.1 establishes the foundational data architecture required to transition COLIN from client-side mock persistence to an enterprise-grade, centralized PostgreSQL 16+ relational database. This schema models all 13 core business modules and provides the single source of truth for the Public Website, Student Portal, Owner Portal, and COLIN Admin Control Centre.

---

## 2. PROPOSED DATABASE ARCHITECTURE

### 2.1 Engine & Version Specifications
- **Database Engine:** PostgreSQL 16.2+
- **Dialect / Standards:** ANSI SQL / PostgreSQL standard with extensions (`pgcrypto`, `uuid-ossp`, `citext`).
- **ORM / Schema Tool:** Prisma ORM 6.x (`prisma/schema.prisma`) with full declarative type-safety, relational mapping, and index definitions.
- **Character Encoding:** `UTF8` with `LC_COLLATE = 'en_US.UTF-8'` and `LC_CTYPE = 'en_US.UTF-8'`.
- **Temporal Handling:** Strictly `TIMESTAMPTZ` (UTC) with microsecond precision (`TIMESTAMPTZ(6)`). All business expirations and SLA deadlines are evaluated server-side.
- **Identifier Strategy:** Universally Unique Identifiers (UUIDv4) for all externally addressable and business-critical entities (`id UUID PRIMARY KEY DEFAULT gen_random_uuid()`). Sequential integer IDs are prohibited for public entities to prevent enumeration attacks.
- **Numeric & Financial Representation:** Arbitrary-precision decimals (`NUMERIC(10, 2)` and `NUMERIC(12, 2)`). Floating-point types (`FLOAT`, `DOUBLE PRECISION`, `REAL`) are strictly forbidden for currency and inventory counts.

### 2.2 Relational Integrity & Security Principles
1. **Multi-Tenant Experience Separation:** Public, Student, Owner, and Admin users share the relational core but operate under isolated database roles and strict schema privileges.
2. **Double-Entry Financial Ledger:** All monetary events (booking fees, refunds, platform commissions, disbursements) produce immutable credit/debit records in `financial_ledgers`.
3. **Mediated Contact Model:** The database schema strictly prohibits direct exposure of student phone numbers or emails to property owners and vice-versa. All interactions are brokered via booking IDs, visit slots, and verified volunteers.
4. **Append-Only Immutable Auditing:** Administrative actions, role grants, fee overrides, and verification audits are recorded in append-only tables (`admin_audit_logs`, `property_verification_audits`). `UPDATE` and `DELETE` operations are revoked on these tables.
5. **Least-Privilege Database Roles:**
   - `colin_app`: Read/write access to application tables; strictly prohibited from modifying audit logs or altering schema.
   - `colin_analytics`: Read-only access to masked reporting views.
   - `colin_migrator`: DDL schema execution and database migration role.

---

## 3. ENTITY INVENTORY

The central data model comprises **34 distinct relational entities** organized across **13 functional modules**:

| Module | Table Name | Prisma Model | Entity Role | Primary Key | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A. Identity & Auth** | `users` | `User` | Universal identity & authentication credentials | `id` (UUID) | DOCUMENTED |
| | `user_profiles` | `UserProfile` | Common personal details (name, avatar, DOB) | `user_id` (UUID) | DOCUMENTED |
| | `admin_accounts` | `AdminAccount` | Isolated internal personnel accounts | `id` (UUID) | DOCUMENTED |
| | `admin_roles` | `AdminRole` | Administrative role definitions | `id` (UUID) | DOCUMENTED |
| | `admin_permissions` | `AdminPermission` | Granular operational permissions | `id` (UUID) | DOCUMENTED |
| | `admin_role_permissions`| `AdminRolePermission`| Mapping of roles to granular permissions | `(role_id, permission_id)` | DOCUMENTED |
| | `admin_user_roles` | `AdminUserRole` | Mapping of admin accounts to roles | `(admin_id, role_id)` | DOCUMENTED |
| | `user_sessions` | `UserSession` | Server-managed refresh sessions | `id` (UUID) | DOCUMENTED |
| | `mfa_credentials` | `MfaCredential` | Encrypted TOTP secrets & MFA status | `id` (UUID) | DOCUMENTED |
| | `mfa_recovery_codes` | `MfaRecoveryCode` | Single-use salted recovery codes | `id` (UUID) | DOCUMENTED |
| | `password_reset_tokens`| `PasswordResetToken` | Ephemeral password reset tokens | `id` (UUID) | DOCUMENTED |
| **B. Student Management**| `student_profiles` | `StudentProfile` | College details & verification status | `user_id` (UUID) | DOCUMENTED |
| | `student_verification_documents` | `StudentVerificationDocument` | Student ID cards & Aadhaar/passport | `id` (UUID) | DOCUMENTED |
| | `student_preferences` | `StudentPreference` | Housing preferences & lifestyle habits | `student_id` (UUID) | DOCUMENTED |
| | `student_saved_properties` | `StudentSavedProperty` | Saved / wishlisted accommodations | `(student_id, property_id)` | DOCUMENTED |
| | `student_search_histories` | `StudentSearchHistory` | Search queries and applied filters | `id` (UUID) | DOCUMENTED |
| **C. Owner Management** | `owner_profiles` | `OwnerProfile` | Business structure, tier, & KYC status | `user_id` (UUID) | DOCUMENTED |
| | `owner_kyc_documents` | `OwnerKycDocument` | Property deed, trade license, PAN proof | `id` (UUID) | DOCUMENTED |
| | `owner_bank_accounts` | `OwnerBankAccount` | Payout destination bank details | `id` (UUID) | DOCUMENTED |
| **D. Property Management**| `properties` | `Property` | Property listings, geo-coords, status | `id` (UUID) | DOCUMENTED |
| | `property_photos` | `PropertyPhoto` | Photos (max 8 enforced), storage URLs | `id` (UUID) | DOCUMENTED |
| | `property_amenities` | `PropertyAmenity` | Normalized amenity checklist | `id` (UUID) | DOCUMENTED |
| | `property_rules` | `PropertyRule` | House rules, curfews, visitor policies | `id` (UUID) | DOCUMENTED |
| | `property_verification_audits` | `PropertyVerificationAudit` | Physical inspection & admin approval trail | `id` (UUID) | DOCUMENTED |
| **E. Room & Bed Inventory**| `rooms` | `Room` | Physical rooms, base rent, deposits | `id` (UUID) | DOCUMENTED |
| | `beds` | `Bed` | Individual bed slots & occupancy states | `id` (UUID) | DOCUMENTED |
| **F. Booking & Visits** | `booking_requests` | `BookingRequest` | Booking lifecycle, fees, 12h decision | `id` (UUID) | DOCUMENTED |
| | `visit_slots` | `VisitSlot` | Scheduled inspection time windows | `id` (UUID) | DOCUMENTED |
| | `visit_coordinations` | `VisitCoordination` | Volunteer assignment & mediated dispatch | `booking_id` (UUID) | DOCUMENTED |
| | `visit_feedbacks` | `VisitFeedback` | Post-visit student ratings & reviews | `id` (UUID) | DOCUMENTED |
| **G. Volunteer Management**| `volunteer_profiles`| `VolunteerProfile` | Campus assignments, tasks count, rating | `user_id` (UUID) | DOCUMENTED |
| | `volunteer_assignments`| `VolunteerAssignment` | Field verification & assistance tasks | `id` (UUID) | DOCUMENTED |
| | `volunteer_reviews` | `VolunteerReview` | Admin evaluations of volunteer performance | `id` (UUID) | DOCUMENTED |
| **H. Financial Management**| `financial_payments` | `FinancialPayment` | Gateway orders, signatures, amounts | `id` (UUID) | DOCUMENTED |
| | `financial_ledgers` | `FinancialLedger` | Double-entry ledger entries | `id` (UUID) | DOCUMENTED |
| | `financial_disbursements`| `FinancialDisbursement`| Owner payout records with bank UTR refs | `id` (UUID) | DOCUMENTED |
| **I. Subscriptions** | `owner_subscriptions`| `OwnerSubscription` | Owner listing tiers & recurring fees | `id` (UUID) | DOCUMENTED |
| | `student_subscriptions`| `StudentSubscription`| Student premium memberships | `id` (UUID) | DOCUMENTED |
| **J. Sponsorship** | `sponsorship_campaigns`| `SponsorshipCampaign`| Featured listings & hero banner campaigns | `id` (UUID) | DOCUMENTED |
| **K. Notifications** | `system_notifications`| `SystemNotification` | In-app, SMS, email, and WhatsApp dispatch | `id` (UUID) | DOCUMENTED |
| **L. Support & Complaints**| `support_tickets` | `SupportTicket` | Customer dispute & support tickets | `id` (UUID) | DOCUMENTED |
| | `support_messages` | `SupportMessage` | Threaded discussion messages on tickets | `id` (UUID) | DOCUMENTED |
| **M. Audit Logging** | `admin_audit_logs` | `AdminAuditLog` | Append-only administrative activity trail | `id` (UUID) | DOCUMENTED |

---

## 4. ER DIAGRAM REFERENCE

A comprehensive entity-relationship specification has been designed and published in:
- **`docs/database/COLIN_DATABASE_ERD.md`**

Key diagrams include:
1. **Master Architecture ER Diagram:** Complete multi-module visual layout mapping all 34 entities, primary keys, foreign keys, cardinality notations, and domain boundaries.
2. **Mediated Booking & 12-Hour Decision ER Subsystem:** Illustrating the decoupled mediation between `student_profiles`, `booking_requests`, `visit_slots`, `visit_coordinations`, `volunteer_profiles`, and `owner_profiles`.
3. **Room & Bed Inventory Concurrency Model:** Illustrating how individual `beds` are linked to `booking_requests` with transactional concurrency locks to eliminate double-booking.
4. **Administrative Vault & RBAC Isolation Subsystem:** Illustrating the completely segregated authentication and authorization domain for `admin_accounts`, `admin_roles`, `admin_permissions`, and `admin_audit_logs`.

---

## 5. TABLE AND RELATIONSHIP SUMMARY

Complete technical column specifications and relational mappings are published in:
- **`docs/database/COLIN_DATA_DICTIONARY.md`** (Column-by-column definitions, data types, nullability, defaults, check constraints, business semantics)
- **`docs/database/COLIN_DATABASE_RELATIONSHIPS.md`** (Foreign key actions, referential integrity rules, cascade safety analysis, join index design)

### Summary of Relational Policies:
- **`ON DELETE RESTRICT` (Guaranteed Audit & Financial Preservation):**
  - Any entity referenced in financial transactions (`financial_payments`, `financial_ledgers`, `financial_disbursements`) or active bookings (`booking_requests`) cannot be deleted while records exist.
  - Property deletions are blocked if associated with active rooms, beds, bookings, or financial disbursements.
- **`ON DELETE CASCADE` (Parent-Owned Dependent Lifecycle):**
  - Profile components (`user_profiles`, `student_preferences`, `property_photos`, `property_amenities`, `property_rules`, `rooms`, `beds`) cascade delete when their direct parent is purged in compliance with GDPR/data privacy requests.
- **`ON DELETE SET NULL` (Historical Continuity on Secondary References):**
  - Administrative assignees on support tickets, audit logs, and volunteer assignments are set to NULL if an admin account is deactivated, preventing broken foreign keys while maintaining complete incident records.

---

## 6. DATA INTEGRITY CONSTRAINTS

The database design incorporates multiple layers of constraint enforcement:

### 6.1 Uniqueness Constraints
- `users`: `UNIQUE (email)`, `UNIQUE (phone)`
- `admin_accounts`: `UNIQUE (username)`, `UNIQUE (email)`
- `admin_roles`: `UNIQUE (code)`
- `admin_permissions`: `UNIQUE (code)`
- `rooms`: `UNIQUE (property_id, room_number)`
- `beds`: `UNIQUE (room_id, bed_label)`
- `property_amenities`: `UNIQUE (property_id, amenity_code)`
- `mfa_credentials`: `UNIQUE (user_id, mfa_type)`
- `financial_payments`: `UNIQUE (idempotency_key)`
- `financial_disbursements`: `UNIQUE (utr_reference)`
- `support_tickets`: `UNIQUE (ticket_number)`

### 6.2 Check Constraints
- **Financial Non-Negativity:**
  - `CHECK (amount >= 0.00)` on payments, ledgers, and disbursements.
  - `CHECK (base_monthly_rent > 0.00)` and `CHECK (security_deposit >= 0.00)` on rooms and beds.
- **Booking Fee Breakdown Integrity:**
  - `CHECK (booking_fee_paid = refund_amount + platform_fee_retained)` on `booking_requests`.
- **Photo Limit Enforcement:**
  - `CHECK (display_order >= 0 AND display_order < 8)` coupled with an application-level constraint ensuring no property exceeds 8 uploaded photos.
- **12-Hour Decision Window Deadline:**
  - `CHECK (decision_deadline = visit_completed_at + INTERVAL '12 hours')` on `booking_requests`.

---

## 7. SECURITY AND PRIVACY CONSIDERATIONS

### 7.1 Password & Secret Protection
- **Hashing Algorithm:** Argon2id with recommended OWASP parameters:
  - Memory cost ($m$): $65,536\text{ KiB}$ (64 MB)
  - Time iterations ($t$): $3$
  - Parallelism ($p$): $4$
- **MFA Secrets:** TOTP secret keys and recovery codes are encrypted at rest using AES-256-GCM before storage in `mfa_credentials`.
- **Single-Use Recovery:** Recovery codes stored in `mfa_recovery_codes` are hashed using HMAC-SHA-256 with an environment pepper.

### 7.2 PII Protection & Data Masking
- Government identification documents (PAN, Aadhaar, Passport) and bank account numbers are stored in masked format (`pan_masked`, `account_number_masked`) in operational database tables.
- Raw document images are uploaded to private object storage buckets (S3/Cloud Storage) accessible exclusively via time-limited (15-minute) pre-signed URLs generated by authorized backend endpoints.

### 7.3 Student-Owner Privacy Firewall (Mediation Model)
- Property owners **never** receive student phone numbers or email addresses in API payloads or database queries.
- Students **never** receive personal contact numbers of property owners.
- Visit coordination is dispatched exclusively through the platform: the student and owner receive calendar notifications and visit confirmation tokens; field accompaniment is handled by COLIN volunteers.

---

## 8. FINANCIAL DATA DESIGN

### 8.1 Currency Standard
- Base currency: Indian Rupee (`INR`).
- Zero floating-point representation. Precision columns:
  - Transaction amounts: `NUMERIC(10, 2)` (supports up to ₹99,999,999.99).
  - Running account balances: `NUMERIC(12, 2)` (supports up to ₹9,999,999,999.99).

### 8.2 Double-Entry Ledger System
Every payment or refund event creates paired balanced entries in `financial_ledgers`:
- When a student pays the ₹150 booking fee:
  - `CREDIT` to `GATEWAY_CLEARING` (₹150.00)
  - `CREDIT` to `PLATFORM_ESCROW` (₹150.00)
- When a student rejects within 12 hours:
  - `DEBIT` from `PLATFORM_ESCROW` (₹82.50) -> `CREDIT` to `STUDENT_WALLET` / Gateway Refund
  - `DEBIT` from `PLATFORM_ESCROW` (₹67.50) -> `CREDIT` to `PLATFORM_REVENUE`

### 8.3 Idempotency & Gateway Reconciliation
- All payment transactions require a client-generated UUID `idempotency_key` stored in `financial_payments`.
- Duplicate payment attempts with identical idempotency keys are rejected at the database level (`UNIQUE (idempotency_key)`), preventing double-charging during network retries.

---

## 9. BOOKING LIFECYCLE DATA DESIGN

### 9.1 Finite State Machine
```
DRAFT
  │
  ▼
PAYMENT_PENDING
  │ (₹150 Paid)
  ▼
FEE_PAID
  │ (Slot Confirmed)
  ▼
VISIT_SCHEDULED
  │ (Visit Executed)
  ▼
VISIT_COMPLETED
  │ (Server sets: decision_deadline = visit_completed_at + 12h)
  ▼
DECISION_PENDING
  ├── Student Accepts within 12h ──────────────► ACCEPTED (Bed Reserved, ₹150 Fee Retained)
  ├── Student Rejects within 12h ──────────────► REJECTED_REFUND_DUE (₹82.50 Refund, ₹67.50 Retained)
  │                                                    │ (Processed via Gateway)
  │                                                    ▼
  │                                              REJECTED_REFUNDED
  └── 12h Window Passes without Decision ──────► AUTO_EXPIRED (₹150 Fee Retained, Bed Released)
```

### 9.2 Exact Financial Computations
| Outcome | Student Decision | Total Paid | Refund Amount (55%) | Retained Platform Fee (45%) |
| :--- | :--- | :--- | :--- | :--- |
| **Accepted** | Student accepts room | ₹150.00 | ₹0.00 | ₹150.00 |
| **Rejected** | Student rejects within 12h | ₹150.00 | ₹82.50 | ₹67.50 |
| **Expired** | No decision within 12h | ₹150.00 | ₹0.00 | ₹150.00 (100% Forfeited) |

### 9.3 Server Timestamp Enforcement
- The 12-hour decision window is **strictly calculated on the server** when the volunteer/admin records visit completion (`NOW()`).
- Database check constraint `CHECK (decision_deadline = visit_completed_at + INTERVAL '12 hours')` guarantees that no client or malicious API request can extend the window.

---

## 10. MIGRATION STRATEGY

The complete migration strategy from client-side `localStorage`/`IndexedDB` to PostgreSQL is documented in:
- **`docs/database/COLIN_DATA_MIGRATION_PLAN.md`**

### Summary of Phases:
1. **Data Classification & Cleansing:**
   - Discard mock property entries, fake students, and dummy reviews created during development.
   - Retain authentic student onboarding preferences and verified properties.
   - Invalidate all client-side SHA-256 admin password hashes stored in `colin_admin_vault_v1`. All administrative personnel must undergo mandatory Argon2id credential setup upon first backend login.
2. **Binary Media Extraction:**
   - Extract raw base64 data URLs currently stored in `IndexedDB`.
   - Upload binaries to S3/Cloud Storage (`properties/{id}/photos/{uuid}.webp`).
   - Store lightweight, clean URLs in `property_photos`.
3. **Dual-Write / Shadow Pipeline:**
   - Client applications write to local storage as fallback while streaming updates to the REST/GraphQL backend.
   - Background reconciliation jobs verify checksums before decommissioning local persistence.

---

## 11. FILES CREATED AND MODIFIED

| File Path | Nature of File | Primary Content | Status |
| :--- | :--- | :--- | :--- |
| `docs/database/COLIN_DATABASE_ARCHITECTURE.md` | Architecture Spec | PostgreSQL 16+ design, modules, indexing, roles, security | DOCUMENTED |
| `docs/database/COLIN_DATABASE_ERD.md` | ER Diagrams | Master Mermaid ERD, Mediated Booking, Bed Inventory, Admin RBAC | DOCUMENTED |
| `docs/database/COLIN_DATA_DICTIONARY.md` | Data Dictionary | Table-by-table column schemas, types, nullability, constraints | DOCUMENTED |
| `docs/database/COLIN_DATABASE_RELATIONSHIPS.md`| Relationship Spec| 1:1, 1:N, N:M cardinalities, foreign key actions, indexes | DOCUMENTED |
| `docs/database/COLIN_DATA_MIGRATION_PLAN.md` | Migration Plan | Step-by-step transition from localStorage/IndexedDB to PostgreSQL | DOCUMENTED |
| `prisma/schema.prisma` | Prisma Schema | Complete Prisma ORM schema modeling 34 entities across 13 modules | IMPLEMENTED |
| `PHASE_4A_2_2_1_ACCEPTANCE_REPORT.md` | Acceptance Report | Master architectural acceptance report for Phase 4A.2.2.1 | IMPLEMENTED |
| `docs/reports/PHASE_4A_2_2_1_ACCEPTANCE_REPORT.md` | Mirror Copy | Archived copy of master acceptance report | IMPLEMENTED |

---

## 12. VALIDATION COMMANDS AND ACTUAL RESULTS

### 12.1 TypeScript Type Checking
```powershell
npx tsc --noEmit
```
**Actual Result:** Exited with code `0`. Zero type errors across the entire codebase.

### 12.2 Test Suite Execution
```powershell
pnpm test
```
**Actual Result:**
- **Test Files:** 10 passed (10 total)
- **Tests:** 129 passed (129 total)
- **Time:** 10.97s
- **Status:** PASS (Zero regressions).

### 12.3 Production Build Verification
```powershell
pnpm run build
```
**Actual Result:**
- Vite built production bundle successfully in 2.21s.
- Bundle output:
  - `dist/index.html` (1.37 kB)
  - `dist/assets/index-*.css` (96.53 kB)
  - `dist/assets/index-*.js` (480.99 kB)
- **Status:** PASS (Zero build warnings or failures).

---

## 13. UNRESOLVED ARCHITECTURAL DECISIONS

The following architectural decisions are documented for resolution during Phase 4A.2.2.2 backend implementation:
1. **Primary Read-Replica Topology:** Whether initial launch requires a read-replica pool via PgBouncer or if a single vertically scaled PostgreSQL instance (e.g. 4 vCPU, 16 GB RAM) is sufficient for initial launch (< 50,000 MAU).
2. **Photo Upload Pipeline:** Whether images should be uploaded directly to S3 via pre-signed PUT URLs from the browser, or streamed through the backend API for automated EXIF scrubbing and WebP optimization.
3. **Real-time Notification Broker:** Selection between PostgreSQL native `LISTEN/NOTIFY` (lightweight, zero additional infra) vs Redis Pub/Sub / BullMQ for visit coordination and 12-hour decision window alerts.
4. **Automated Payout Provider:** Selection between Razorpay Route / Cashfree Split Settlements for automated ₹82.50 refunds and owner rent disbursements.

---

## 14. KNOWN LIMITATIONS

1. **Client-Side Runtime Environment:** As identified in Phase 4A.1, the application currently operates entirely in the browser. The database schema in `prisma/schema.prisma` represents the architectural specification and is prepared for backend deployment; it cannot connect to a live database until a PostgreSQL instance and backend service are provisioned.
2. **Database Migrations (`prisma migrate dev`):** Running migrations requires a live PostgreSQL instance with a valid `DATABASE_URL` environment variable. This will occur in Phase 4A.2.2.2.
3. **Legacy Local Storage Active:** To prevent breaking existing Phase 1, Phase 2, Phase 3, and Phase 4A functionality, client-side storage services remain active until the real backend API is connected.

---

## 15. RECOMMENDATIONS FOR PHASE 4A.2.2.2

To transition this schema into an active, operational backend in Phase 4A.2.2.2, execute the following steps:
1. **Infrastructure Provisioning:**
   - Configure a `docker-compose.yml` defining PostgreSQL 16 (`postgres:16-alpine`) with health checks and persistent volume storage for local development.
   - Configure environment variables (`DATABASE_URL`, `ARGON2_SECRET`, `JWT_SECRET`, `SESSION_SECRET`).
2. **Prisma Client Generation & Migration Execution:**
   - Run `npx prisma migrate dev --name init_colin_central_db` to generate initial SQL migrations and create tables.
   - Generate `@prisma/client` bindings.
3. **Backend Service Framework Setup:**
   - Scaffold a modular backend service (Fastify or Express with TypeScript) implementing the REST/GraphQL endpoints.
   - Mount the central database connection pool with Prisma client.
4. **Authentication & Security Engine Implementation:**
   - Implement Argon2id hashing for `users` and `admin_accounts`.
   - Implement Redis-backed or database-persisted session management with secure, HTTP-only, SameSite cookies.
   - Replace `src/server/adminSecurity.ts` with authentic backend API endpoints.
5. **Background Scheduled Workers:**
   - Deploy a reliable scheduled worker (e.g., BullMQ with Redis or a lightweight Node cron service) to scan for bookings where `NOW() > decision_deadline AND student_decision = 'PENDING'`, automatically triggering `AUTO_EXPIRED` status transitions and releasing reserved beds.

---

**Report Prepared By:**  
Principal Database Architect & Senior Backend Engineer  
COLIN Platform Engineering Team
