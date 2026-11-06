# COLIN Central Relational Database Architecture

**Document Version:** 2.2.0 (Phase 4A.2.2.1-R2.1 Critical Integrity Closure Baseline)  
**Status:** ARCHITECTURAL SPECIFICATION & DESIGN (RECONCILED, HARDENED & VERIFIED)  
**Date:** November 2026  
**Architects:** Principal Database Architect, Senior PostgreSQL Engineer, Backend Security Architect, Financial Systems Architect  
**Target Engine:** PostgreSQL 16+  
**Target ORM:** Prisma ORM 6.x / Data Contracts (`prisma/schema.prisma`)  
**Scope:** Central Multi-Tenant Single Source of Truth for Public Web, Student Portal, Owner Portal & Admin Control Centre  

---

## 1. Executive Summary & Remediation Overview

COLIN (Campus Living Verified) connects students across India with in-person verified student accommodations (PGs, hostels, rental rooms, shared flats, and co-living facilities).

Previously, Phases 1 through 4A operated on client-side prototypes using browser `localStorage` and `IndexedDB`. As established in the **Phase 4A.1 Security Audit**, client-side storage is inherently isolated to single browser profiles, lacks multi-user synchronization, and cannot enforce server-side data integrity or zero-trust access boundaries.

In **Phase 4A.2.2.1-R** and **Phase 4A.2.2.1-R2**, the database architecture underwent comprehensive auditing, remediation, and integrity hardening to eliminate structural vulnerabilities, balance the financial ledger, enforce strict isolation between Admin and User authentication, correct booking payment semantics, guarantee bed allocation safety, serialize property photo uploads, and secure financial payouts.

### Architecture Scope Reconciled
- **Total Entities / Prisma Models:** 54 models (synchronized with `prisma/schema.prisma`)
- **Total Enumerated Types (Enums):** 47 enums (synchronized with `prisma/schema.prisma`)
- **Functional Modules:** 13 cohesive business modules (A through M)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               COLIN PLATFORM EXPERIENCES                               │
├─────────────────────┬─────────────────────┬─────────────────────┬──────────────────────┤
│ 1. Public Website   │ 2. Student Portal   │ 3. Owner Portal     │ 4. Admin Control Ctr │
│ (Discovery & Info)  │ (Stays, Visits, KYC)│ (Listings & Rooms)  │ (Ops, Audit, Finance)│
└──────────┬──────────┴──────────┬──────────┴──────────┬──────────┴──────────┬───────────┘
           │                     │                     │                     │
           ▼                     ▼                     ▼                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        COLIN BACKEND API GATEWAY & RBAC LAYER                          │
│         (Stateless JWT / HttpOnly Cookie Bearer Verification / Role Isolation)         │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                    CENTRAL POSTGRESQL 16+ RELATIONAL DATABASE                          │
│   • 13 Core Business Modules             • UUID Primary Keys (gen_random_uuid)         │
│   • Precise NUMERIC(10,2) Currency       • Strict Foreign Key Integrity & Constraints  │
│   • Server UTC TIMESTAMPTZ(6)            • Balanced Double-Entry Financial Ledger      │
│   • Append-Only Immutable Audit Trail    • Partial Unique Indexes for Bed Safety       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Principles (Hardened)

### 2.1 Complete Authentication & Session Isolation (Task A)
To eliminate credential cross-contamination and privilege escalation:
- **Normal Users (`users`):** Authenticate via `users`, managed by `user_sessions`, with TOTP stored in `mfa_credentials` and single-use hashed recovery codes in `mfa_recovery_codes`.
- **Administrative Personnel (`admin_accounts`):** Authenticate via `admin_accounts`, with sessions strictly isolated in `admin_sessions`, TOTP credentials in `admin_mfa_credentials`, and recovery codes in `admin_mfa_recovery_codes`.
- **Zero Self-Registration:** Administrative accounts cannot be registered publicly. They are provisioned exclusively through authorized invitations and administrative role assignments (`admin_user_roles`).
- **Session Security:** All session tokens are stored as SHA-256 hashes (`token_hash`). Sessions support expiration, revocation, `last_activity_at`, and client IP/user-agent metadata tracking.

### 2.2 Correct Booking Financial Semantics (Task B)
A newly created `DRAFT` booking must never appear financially paid:
- `booking_fee_amount`: Required visit fee (₹150.00).
- `amount_paid`: Amount verified and received, initialized to ₹0.00.
- `payment_status`: Managed by enum `BookingPaymentStatus` (`UNPAID`, `PENDING`, `PAID`, `PARTIALLY_REFUNDED`, `REFUNDED`, `FORFEITED`).
- State transition to `FEE_PAID` requires explicit webhook verification and receipt reference.

### 2.3 Preserved COLIN Visit Fee & Refund Policy (Task B)
All financial outcomes are strictly computed using arbitrary-precision decimals (`NUMERIC(10, 2)`):

| Event | Status Transition | Student Paid | Student Refund | COLIN Retained Fee |
| :--- | :--- | :--- | :--- | :--- |
| Guided visit fee paid | `PAYMENT_PENDING` -> `FEE_PAID` | ₹150.00 | ₹0.00 | ₹0.00 (In Escrow) |
| Student accepts after visit | `DECISION_PENDING` -> `ACCEPTED` | ₹150.00 | ₹0.00 | ₹150.00 (Earned) |
| Student rejects within 12 hours | `DECISION_PENDING` -> `REJECTED_REFUND_DUE` | ₹150.00 | ₹82.50 (55%) | ₹67.50 (45%) |
| Student makes no decision in 12h| `DECISION_PENDING` -> `AUTO_EXPIRED` | ₹150.00 | ₹0.00 | ₹150.00 (100% Forfeited)|

### 2.4 Server-Authoritative Decision Deadline (Task C)
- The 12-hour decision window is **strictly computed on the server** when visit completion is confirmed:
  $$\text{decision\_deadline} = \text{visit\_completed\_at} + 12\text{ hours}$$
- Client clocks or frontend timers have zero authority.
- The PostgreSQL database enforces this invariant via check constraint:
  `CHECK ((visit_completed_at IS NULL AND decision_deadline IS NULL) OR (visit_completed_at IS NOT NULL AND decision_deadline IS NOT NULL AND decision_deadline = visit_completed_at + INTERVAL '12 hours'))`.

### 2.5 Bed Allocation Concurrency & Reservation Safety (Task D)
- **Visit Acceptance $\neq$ Tenancy Creation:** Accepting a guided visit outcome indicates interest in leasing; it does not automatically sign a lease or occupy the bed.
- **Temporary Bed Holds:** Managed via `bed_reservations` with status `TEMPORARY_HOLD` and `hold_expires_at`.
- **Double-Allocation Prevention:** A PostgreSQL partial unique index ensures no bed can have more than one active hold or confirmed reservation simultaneously:
  `CREATE UNIQUE INDEX uq_active_bed_reservation ON bed_reservations (bed_id) WHERE status IN ('TEMPORARY_HOLD', 'CONFIRMED');`
- **Cross-Property Integrity Trigger:** A database trigger validates that `bed.room.property_id = booking_request.property_id`.

### 2.6 Balanced Double-Entry Financial Ledger (Task E)
The legacy flawed ledger (which erroneously credited both clearing and escrow) is replaced with an enterprise double-entry journal:
- `ledger_accounts`: Asset, liability, equity, revenue, and expense accounts.
- `ledger_transactions`: Grouped financial events with idempotency keys.
- `ledger_entries`: Paired debit and credit records.
- **Fundamental Accounting Invariant:** For every transaction, $\sum \text{Debits} = \sum \text{Credits}$ across at least 2 entries. This is guaranteed by a PostgreSQL deferred constraint trigger.

### 2.7 Property Photo Integrity (Task G)
- At most 8 photos per property (enforced via database trigger `trg_enforce_max_property_photos`).
- Unique display order per property (`uq_property_photo_display_order`).
- Single cover photo per property enforced by partial unique index `uq_property_cover_photo WHERE is_cover = TRUE`.
- Upload size ($\le 5\text{ MB}$) and MIME types are validated at the API boundary and recorded in `file_size_bytes` and `mime_type`.

### 2.8 Append-Only Audit & Ledger Immutability (Task H)
- `admin_audit_logs`, `property_verification_audits`, `booking_status_histories`, and `ledger_entries` are strictly append-only.
- PostgreSQL database triggers block `UPDATE` and `DELETE` statements at the database engine level.

### 2.9 Case-Insensitive Normalization (Task I)
- Lowercase uniqueness on `LOWER(email)` for users and admins.
- Lowercase uniqueness on `LOWER(username)` for admin accounts.
- E.164 international phone number format validation via regex check constraint.

---

## 3. High-Level Module Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              13 CORE DATABASE MODULES                                  │
├──────────────────────────────────────┬─────────────────────────────────────────────────┤
│ Module A: Identity & Authentication  │ users, user_profiles, user_sessions, admins,    │
│                                      │ admin_sessions, admin_mfa, rbac_permissions     │
├──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ Module B: Student Management         │ student_profiles, kyc_docs, preferences,        │
│                                      │ saved_properties, search_histories              │
├──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ Module C: Owner Management           │ owner_profiles, kyc_documents, bank_accounts    │
├──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ Module D: Property Management        │ properties, property_photos, amenities, rules,  │
│                                      │ verification_audits                             │
├──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ Module E: Room & Bed Inventory       │ rooms, beds, bed_reservations                   │
├──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ Module F: Booking & Visits (Core)    │ booking_requests, status_histories, visit_slots,│
│                                      │ availability_options, visit_coordinations,      │
│                                      │ visit_decisions, visit_reminders, assignment_log│
├──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ Module G: Volunteer Management       │ volunteer_profiles, assignments, reviews        │
├──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ Module H: Financial Management       │ financial_payments, ledger_accounts,            │
│                                      │ ledger_transactions, ledger_entries, payouts    │
├──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ Module I: Subscription Management    │ owner_subscriptions, student_subscriptions      │
├──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ Module J: Sponsorship & Promotion    │ sponsorship_campaigns                           │
├──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ Module K: Notifications              │ system_notifications                            │
├──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ Module L: Support & Complaints       │ support_tickets, support_messages               │
├──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ Module M: Admin Audit Logging        │ admin_audit_logs (append-only)                  │
└──────────────────────────────────────┴─────────────────────────────────────────────────┘
```

---

## 4. Entity Inventory & Module Mapping

| Module | Table Name | Prisma Model | Key Responsibility |
| :--- | :--- | :--- | :--- |
| **A** | `users` | `User` | Universal identity, credentials, primary role |
| | `user_profiles` | `UserProfile` | Personal details, location, demographics |
| | `admin_accounts` | `AdminAccount` | Isolated internal personnel accounts |
| | `admin_sessions` | `AdminSession` | Server-side isolated admin sessions |
| | `admin_mfa_credentials` | `AdminMfaCredential` | Encrypted TOTP secrets for administrators |
| | `admin_mfa_recovery_codes`| `AdminMfaRecoveryCode` | Single-use salted admin recovery codes |
| | `admin_roles` | `AdminRole` | Administrative role definitions |
| | `admin_permissions` | `AdminPermission` | Granular operational permissions |
| | `admin_role_permissions`| `AdminRolePermission`| Mapping of roles to granular permissions |
| | `admin_user_roles` | `AdminUserRole` | Mapping of admin accounts to roles |
| | `user_sessions` | `UserSession` | Server-managed user sessions with activity tracking |
| | `mfa_credentials` | `MfaCredential` | Encrypted TOTP secrets for normal users |
| | `mfa_recovery_codes` | `MfaRecoveryCode` | Single-use recovery codes for normal users |
| | `password_reset_tokens`| `PasswordResetToken` | Ephemeral password reset tokens |
| **B** | `student_profiles` | `StudentProfile` | College details & verification status |
| | `student_verification_documents` | `StudentVerificationDocument` | Student ID cards & government IDs |
| | `student_preferences` | `StudentPreference` | Housing preferences & lifestyle habits |
| | `student_saved_properties` | `StudentSavedProperty` | Saved / wishlisted accommodations |
| | `student_search_histories` | `StudentSearchHistory` | Search queries and applied filters |
| **C** | `owner_profiles` | `OwnerProfile` | Business structure, tier, & KYC status |
| | `owner_kyc_documents` | `OwnerKycDocument` | Property deed, trade license, PAN proof |
| | `owner_bank_accounts` | `OwnerBankAccount` | Payout destination bank details |
| **D** | `properties` | `Property` | Property listings, geo-coords, status |
| | `property_photos` | `PropertyPhoto` | Photos (max 8, single cover, order) |
| | `property_amenities` | `PropertyAmenity` | Normalized amenity checklist |
| | `property_rules` | `PropertyRule` | House rules, curfews, visitor policies |
| | `property_verification_audits` | `PropertyVerificationAudit` | Physical inspection & admin approval trail |
| **E** | `rooms` | `Room` | Physical rooms, base rent, deposits |
| | `beds` | `Bed` | Individual bed slots & occupancy states |
| | `bed_reservations` | `BedReservation` | Temporary bed holds & confirmed leases |
| **F** | `booking_requests` | `BookingRequest` | Booking lifecycle, fees, 12h decision |
| | `booking_status_histories` | `BookingStatusHistory` | Audit trail of all booking state changes |
| | `visit_slots` | `VisitSlot` | Confirmed scheduled inspection time window |
| | `visit_availability_options` | `VisitAvailabilityOption` | Owner/Student proposed alternative visit times |
| | `visit_coordinations` | `VisitCoordination` | Volunteer assignment & confirmation timestamps |
| | `visit_decisions` | `VisitDecision` | Student accept/reject decision records |
| | `visit_reminders` | `VisitReminder` | Persistent reminder tracking & retry logs |
| | `visit_assignment_histories`| `VisitAssignmentHistory`| Volunteer dispatch & reassignment logs |
| | `visit_feedbacks` | `VisitFeedback` | Post-visit student ratings & reviews |
| **G** | `volunteer_profiles`| `VolunteerProfile` | Campus assignments, tasks count, rating |
| | `volunteer_assignments`| `VolunteerAssignment` | Field verification & assistance tasks |
| | `volunteer_reviews` | `VolunteerReview` | Admin evaluations of volunteer performance |
| **H** | `financial_payments` | `FinancialPayment` | Gateway orders, signatures, verified amounts |
| | `ledger_accounts` | `LedgerAccount` | Normalized chart of accounts |
| | `ledger_transactions`| `LedgerTransaction` | Balanced journal transactions |
| | `ledger_entries` | `LedgerEntry` | Immutable debit and credit entries |
| | `financial_disbursements`| `FinancialDisbursement`| Owner payout records with bank UTR refs |
| **I** | `owner_subscriptions`| `OwnerSubscription` | Owner listing tiers & recurring fees |
| | `student_subscriptions`| `StudentSubscription`| Student premium memberships |
| **J** | `sponsorship_campaigns`| `SponsorshipCampaign`| Featured listings & hero banner campaigns |
| **K** | `system_notifications`| `SystemNotification` | In-app, SMS, email, and WhatsApp dispatch |
| **L** | `support_tickets` | `SupportTicket` | Customer dispute & support tickets |
| | `support_messages` | `SupportMessage` | Threaded discussion messages on tickets |
| **M** | `admin_audit_logs` | `AdminAuditLog` | Append-only administrative activity trail |

---

## 5. Security & Least-Privilege Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              POSTGRESQL ROLE HIERARCHY                                 │
├─────────────────────┬──────────────────────────┬───────────────────────────────────────┤
│ Role Name           │ Assigned Privileges      │ Restrictions                          │
├─────────────────────┼──────────────────────────┼───────────────────────────────────────┤
│ colin_app           │ SELECT, INSERT, UPDATE on│ NO DDL permissions. NO UPDATE or      │
│                     │ operational tables.      │ DELETE on audit logs or ledger tables.│
│                     │ INSERT on audit/ledgers. │ Cannot truncate any table.            │
├─────────────────────┼──────────────────────────┼───────────────────────────────────────┤
│ colin_analytics     │ SELECT on masked views.  │ Strictly READ-ONLY. No access to raw  │
│                     │                          │ passwords, tokens, or PII documents.  │
├─────────────────────┼──────────────────────────┼───────────────────────────────────────┤
│ colin_migrator      │ DDL execution, schema    │ Dedicated CI/CD migration role.       │
│                     │ migration, table creates.│ Not accessible by running API pods.   │
└─────────────────────┴──────────────────────────┴───────────────────────────────────────┘
```
