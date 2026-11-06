# COLIN Data Migration & Transition Strategy
## From Browser LocalStorage & IndexedDB to Central PostgreSQL Database

**Document Version:** 2.2.0 (Phase 4A.2.2.1-R2.1 Critical Integrity Closure Baseline)  
**Status:** MIGRATION SPECIFICATION & OPERATIONAL RUNBOOK  
**Date:** November 2026  
**Target Engine:** PostgreSQL 16+ via Prisma ORM / Node.js Backend  
**Scope:** Data Extraction, Sanitization, Transformation & Loading (ETL) Across 54 Entities  

---

## 1. Migration Overview & Baseline Prototype Stores

In Phases 1 through 4A, COLIN stored state across the following prototype storage layers:

| Prototype Storage Key | Physical Location | Nature of Data | Target Relational Entity (54 Models) |
| :--- | :--- | :--- | :--- |
| `colin_registered_users` | Browser `localStorage` | Public user accounts | `users`, `user_profiles`, `student_profiles`, `owner_profiles` |
| `colin_auth_session` | Browser `localStorage` | Active public user session | `user_sessions` |
| `colin_all_properties` | Browser `localStorage` | Property listing catalog | `properties`, `property_amenities`, `property_rules` |
| `colin_property_rooms` | Browser `localStorage` | Room & bed inventory | `rooms`, `beds`, `bed_reservations` |
| `colin_student_visits` | Browser `localStorage` | Booking & visit requests | `booking_requests`, `booking_status_histories`, `visit_slots`, `visit_coordinations`, `visit_decisions`, `visit_reminders` |
| `colin_owner_enquiries`| Browser `localStorage` | Inquiries & disputes | `support_tickets`, `support_messages` |
| `colin_certifications` | Browser `localStorage` | Property verification | `property_verification_audits` |
| `colin_owner_subscription`| Browser `localStorage`| Host SaaS subscriptions | `owner_subscriptions` |
| `colin_sponsorships` | Browser `localStorage` | Featured campaigns | `sponsorship_campaigns` |
| `colin_server_admin_accounts_vault` | Browser `localStorage` | Insecure SHA-256 admin vault | `admin_accounts`, `admin_sessions`, `admin_mfa_credentials`, `admin_mfa_recovery_codes`, `admin_user_roles` |
| `colin_server_admin_audit_logs` | Browser `localStorage` | Simulated audit records | `admin_audit_logs` |
| `colin_image_store` | Browser `IndexedDB` | Student avatar blobs | Private Cloud Object Storage $\rightarrow$ `user_profiles.avatar_url` |
| `colin_property_image_store` | Browser `IndexedDB` | Property photos (max 8) | Private Cloud Object Storage $\rightarrow$ `property_photos.photo_storage_url` |

---

## 2. Data Categorization & Security Directives

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              DATA CLASSIFICATION MATRIX                                │
├─────────────────────┬───────────────────────────┬──────────────────────────────────────┤
│ Classification      │ Examples                  │ Migration Policy                     │
├─────────────────────┼───────────────────────────┼──────────────────────────────────────┤
│ 1. Seed Data        │ Roles, 27 Permissions,    │ Ingest via canonical database seed   │
│                     │ Amenities catalog         │ script (`prisma/seed.ts`).           │
├─────────────────────┼───────────────────────────┼──────────────────────────────────────┤
│ 2. Demo Records     │ Aarav Mehra (Student),    │ STRICT EXCLUSION. Marked with        │
│                     │ Col. Rajesh Sharma (Owner)│ `is_demo = true` or excluded from    │
│                     │                           │ production production databases.     │
├─────────────────────┼───────────────────────────┼──────────────────────────────────────┤
│ 3. Mock Data        │ Initial 6 properties in   │ Retain as seed fixtures for test/dev │
│                     │ `mockData.ts`             │ environments only. Do not mix with   │
│                     │                           │ real verified properties.            │
├─────────────────────┼───────────────────────────┼──────────────────────────────────────┤
│ 4. Genuine User Data│ Registered users in local │ Extract, validate, sanitize, and     │
│                     │ `colin_registered_users`  │ ingest with password reset required. │
├─────────────────────┼───────────────────────────┼──────────────────────────────────────┤
│ 5. Insecure Admin   │ Browser vault admin       │ STRICT EXCLUSION. Do NOT import      │
│    Credentials      │ credentials in `vault`    │ single-round SHA-256 admin hashes.   │
│                     │                           │ Re-provision via secure CLI.         │
└─────────────────────┴───────────────────────────┴──────────────────────────────────────┘
```

### Critical Security Directives:
1. **Never migrate browser-stored administrative credentials (Task A):** Admin credentials created in Phase 4A used single-round salted SHA-256 stored in `colin_server_admin_accounts_vault`. These are permanently invalidated. All administrative officers must be provisioned afresh on the genuine backend with **Argon2id** password hashing and mandatory Multi-Factor Authentication enrollment.
2. **Never import demo student/owner profiles as live accounts:** Demo profiles must never be granted production credentials.

---

## 3. Specific Entity Remediation Transformations

### 3.1 Booking Fee Semantics Transformation (Task B)
When transforming legacy booking records (`colin_student_visits`):
- `bookingFeePaid` (legacy default ₹150) must **not** be mapped directly to `amountPaid`.
- **Mapping Logic:**
  - If `status == 'DRAFT'` or `status == 'PAYMENT_PENDING'`:
    - `booking_fee_amount = 150.00`
    - `amount_paid = 0.00`
    - `payment_status = 'UNPAID'`
  - If `status IN ('FEE_PAID', 'VISIT_SCHEDULED', 'VISIT_COMPLETED', 'DECISION_PENDING', 'ACCEPTED')`:
    - `booking_fee_amount = 150.00`
    - `amount_paid = 150.00`
    - `payment_status = 'PAID'`
    - Generate corresponding initial `booking_status_histories` entry.
  - If `status == 'REJECTED_REFUNDED'`:
    - `booking_fee_amount = 150.00`
    - `amount_paid = 150.00`
    - `refund_amount = 82.50`
    - `platform_fee_retained = 67.50`
    - `payment_status = 'PARTIALLY_REFUNDED'`
  - If `status == 'AUTO_EXPIRED'`:
    - `booking_fee_amount = 150.00`
    - `amount_paid = 150.00`
    - `refund_amount = 0.00`
    - `platform_fee_retained = 150.00`
    - `payment_status = 'FORFEITED'`

### 3.2 Double-Entry Ledger Initial State Transformation (Task E)
All historical verified payments must generate balanced journal postings:
1. Initialize Chart of Accounts:
   - `1010`: `GATEWAY_CLEARING` (Asset)
   - `2010`: `PLATFORM_ESCROW` (Liability)
   - `4010`: `PLATFORM_REVENUE` (Revenue)
   - `2020`: `STUDENT_WALLET` (Liability)
   - `2030`: `OWNER_PAYABLE` (Liability)
2. For every ₹150 visit fee paid:
   - `DEBIT`: `GATEWAY_CLEARING` (₹150.00)
   - `CREDIT`: `PLATFORM_ESCROW` (₹150.00)
3. For every rejection refund:
   - `DEBIT`: `PLATFORM_ESCROW` (₹150.00)
   - `CREDIT`: `GATEWAY_CLEARING` (₹82.50)
   - `CREDIT`: `PLATFORM_REVENUE` (₹67.50)
4. For every accepted visit:
   - `DEBIT`: `PLATFORM_ESCROW` (₹150.00)
   - `CREDIT`: `PLATFORM_REVENUE` (₹150.00)

### 3.3 Property Photos Migration & Limit Enforcement (Task G)
1. Extract photo binaries from `IndexedDB`.
2. Verify total count per property $\le 8$. Any extraneous photos must be flagged for owner review.
3. Upload binaries to private S3/Cloudflare R2 bucket:
   `properties/{property_id}/photos/{uuid}.webp`
4. Set `is_cover = true` for exactly one photo per property.
5. Populate `file_size_bytes` and `mime_type`.

---

## 4. Phased Migration Execution Plan

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 MIGRATION TIMELINE                                     │
├──────────────────┬──────────────────┬──────────────────┬──────────────────┬────────────┤
│ Phase 1: Prep    │ Phase 2: Schema  │ Phase 3: Media   │ Phase 4: Data    │ Phase 5:   │
│ & Environment    │ Deployment       │ Pipeline (S3)    │ ETL Migration    │ Cutover    │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┴────────────┘
```

1. **Phase 1: Environment & Tooling Preparation**
   - Provision PostgreSQL 16+ on managed infrastructure.
   - Configure environment variables (`DATABASE_URL`, `S3_BUCKET`, `ARGON2_SECRET`).
2. **Phase 2: Schema Deployment**
   - Apply Prisma schema migrations.
   - Run `COLIN_CUSTOM_POSTGRESQL_CONSTRAINTS.sql` to install partial indexes, triggers, and checks.
   - Seed master roles, permissions, amenities, and chart of accounts.
3. **Phase 3: Media Migration**
   - Stream base64 blobs from IndexedDB to S3 bucket.
   - Record storage URLs in `property_photos` and `user_profiles`.
4. **Phase 4: ETL Data Migration**
   - Run automated ETL script transforming localStorage JSON to PostgreSQL records.
   - Reconcile double-entry ledger balances.
5. **Phase 5: Cutover & Validation**
   - Execute post-migration validation checks (record counts, foreign key integrity, balance sheet reconciliation).
   - Switch frontend API client from client mock to live backend gateway.
