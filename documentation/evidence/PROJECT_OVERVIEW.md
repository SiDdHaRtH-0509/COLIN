# COLIN — Project Overview & Technical Scope

**Document ID:** COLIN-EVID-001  
**Target:** Academic B.Tech Capstone Project Documentation  
**Repository Branch:** `colin-prototype-completion`  
**System Status:** Prototype Complete & Verified  

---

## 1. Project Purpose

**COLIN** (Campus Optimized Living & Information Network) is an enterprise-grade web platform designed to eliminate fraud, broker spam, and predatory rental practices in off-campus student accommodation. By providing a managed, audited marketplace connecting university scholars with certified property hosts, COLIN establishes a verified standard for student living centered around on-site physical audits, supervised guided visits, guaranteed decision windows, and transparent double-entry escrow accounting.

---

## 2. Problem Statement

Off-campus student housing across major university clusters (such as Delhi University North Campus, Vijay Nagar, Kamla Nagar, and Hudson Lane) suffers from systemic inefficiencies:

1. **Misleading Listings & Fake Photography:** Unverified broker listings frequently use outdated, doctored, or stock imagery. Students discover severe maintenance deficits, lack of ventilation, or pest issues only upon arrival.
2. **Predatory Brokerage & Harassment:** Aggressive middlemen demand exorbitant unrefundable commissions (often 15–30 days of rent) and frequently spam students across unencrypted messaging channels.
3. **Substandard Safety & Fire Compliance:** Many commercial student hostelling buildings operate without functional fire extinguishers, proper electrical grounding, CCTV coverage, or secure biometric access controls.
4. **Deposit Forfeiture & Unfair Terms:** Security deposits and advance booking tokens are routinely withheld without itemized accounting or legal recourse when a student declines a substandard property.
5. **No Structured Decision Window:** Students visiting multiple properties are pressured into paying immediate holding tokens on the spot under threat of losing the room to another candidate.

---

## 3. Proposed Solution

COLIN re-engineers student housing as a managed concierge service:

- **Strict Verification Shield:** Properties cannot receive booking requests or publish public contact details until an authorized field coordinator conducts an in-person physical inspection across 50 safety, sanitation, and infrastructural checklist items.
- **Mandatory 8-Photo Evidence Pipeline:** Owners must submit eight high-resolution, unedited photos representing distinct mandatory zones (facade, bedroom, bathroom, mess hall, study room, common area, water filtration, security apparatus). The backend strips GPS/EXIF metadata, guards against decompressed image bombs, and enforces strict maximums.
- **Guided Visit Model with ₹150 Slot Pass:** Rather than exposing owner contact information to broker scraping, students book a supervised field visit coordinated by vetted campus ambassadors.
- **12-Hour Exclusive Decision Window:** Upon completion of the guided visit, the server records an authoritative timestamp and opens a strict 12-hour decision deadline. The bed reservation is temporarily held, giving the student guaranteed time to evaluate options without coercion.
- **Fair 55% Refund Policy:** If the accommodation fails to meet the student's expectations, rejecting the offer automatically returns 55% (₹82.50) of the visit pass fee to the student's refund payable ledger, while the remaining 45% (₹67.50) covers field guide logistics.
- **IAS-1 Compliant Double-Entry Accounting:** Every rupee collected into escrow is tracked in an append-only double-entry general ledger in PostgreSQL, preventing ledger imbalance ($\sum \text{Debits} = \sum \text{Credits}$) at the database engine level via custom triggers.

---

## 4. Target Users & Stakeholders

| Stakeholder Role | Access Portal | Primary Objectives & Capabilities |
|---|---|---|
| **University Student** | Student Scholar Portal (`/student/*`) | Search verified rooms, filter by proximity/amenities, request guided visits, pay simulated ₹150 visit pass, review 12-hour countdown, accept/reject booking. |
| **Property Host / Owner** | Property Owner Portal (`/owner/*`) | Register properties, configure bed/room occupancy, submit 8 mandatory photos, track physical verification audit status, review room occupancy. |
| **Field Coordinator / Volunteer** | Field Concierge Operations | Assigned to escort students on guided property walkthroughs, verify physical amenities, submit check-in verification tokens. |
| **Platform Administrator** | Admin Control Centre (`/admin/*`) | Review pending property audits, schedule guided visit slots, record visit completion (activating 12h deadline), monitor IAS-1 ledger, trigger manual expirations. |

---

## 5. Project Scope & Boundary Definition

### In-Scope (Implemented & Verified in Prototype)
- Multi-facet property discovery with geographical proximity calculations.
- Strict Role-Based Access Control (RBAC) across 4 roles (Public, Student, Owner, Admin).
- Complete 6-stage booking state machine (`DRAFT` $\to$ `PAYMENT_PENDING` $\to$ `FEE_PAID` $\to$ `VISIT_SCHEDULED` $\to$ `VISIT_COMPLETED` $\to$ `DECISION_PENDING` $\to$ `ACCEPTED` / `REJECTED_REFUND_DUE` / `AUTO_EXPIRED`).
- Automated background worker (`BookingExpiryWorker`) running every 60 seconds with startup catch-up and graceful shutdown.
- Double-entry accounting ledger with database-level immutability triggers and balance constraints.
- Secure image processing pipeline using `sharp` (magic bytes validation, dimension bounds, EXIF stripping, WebP encoding).
- End-to-end automated test suites (Vitest unit/integration tests and Playwright browser E2E suites).

### Out-of-Scope (Simulated / Future Commercial Roadmap)
- Real money gateway transactions (simulated test adapter used; no production banking licenses or live UPI/card networks connected).
- Third-party SMS/WhatsApp gateway delivery (email delivery is recorded via transactional `EmailOutbox` in PostgreSQL).
- Production cloud storage buckets (abstracted via local storage provider with S3-compatible provider stub).
- Real-time peer-to-peer web chat (deliberately avoided to prevent broker bypass and contact leakage).

---

## 6. Implementation Status Matrix

| Subsystem / Feature | Implementation State | Verification Mechanism | Code References |
|---|---|---|---|
| **Property Discovery & Search** | Implemented | Vitest + Playwright | [PublicPropertyService.ts](file:///C:/Users/clsid/COLIN/src/server/services/PropertyService.ts), [public.property.routes.ts](file:///C:/Users/clsid/COLIN/src/server/api/v1/routes/public.property.routes.ts) |
| **8-Photo Evidence Pipeline** | Implemented | Vitest + DB Triggers | [image.processor.ts](file:///C:/Users/clsid/COLIN/src/server/storage/image.processor.ts), [COLIN_CUSTOM_POSTGRESQL_CONSTRAINTS.sql](file:///C:/Users/clsid/COLIN/docs/database/COLIN_CUSTOM_POSTGRESQL_CONSTRAINTS.sql#L671-L709) |
| **Guided Visit Booking State Machine** | Implemented | Vitest Integration | [BookingService.ts](file:///C:/Users/clsid/COLIN/src/server/services/BookingService.ts), [booking-lifecycle.integration.test.ts](file:///C:/Users/clsid/COLIN/src/test/booking/booking-lifecycle.integration.test.ts) |
| **12-Hour Decision Window** | Implemented | Vitest + DB Constraint | [BookingService.ts](file:///C:/Users/clsid/COLIN/src/server/services/BookingService.ts#L401-L403), [COLIN_CUSTOM_POSTGRESQL_CONSTRAINTS.sql](file:///C:/Users/clsid/COLIN/docs/database/COLIN_CUSTOM_POSTGRESQL_CONSTRAINTS.sql#L71-L85) |
| **Autonomous Expiry Worker** | Implemented | Unit Test + Daemon Lifecycle | [BookingExpiryWorker.ts](file:///C:/Users/clsid/COLIN/src/server/workers/BookingExpiryWorker.ts), [booking-expiry-worker.test.ts](file:///C:/Users/clsid/COLIN/src/test/workers/booking-expiry-worker.test.ts) |
| **Double-Entry General Ledger** | Implemented | PostgreSQL Triggers | [LedgerRepository.ts](file:///C:/Users/clsid/COLIN/src/server/database/repositories/LedgerRepository.ts), [postgres-integrity.integration.test.ts](file:///C:/Users/clsid/COLIN/src/test/database/postgres-integrity.integration.test.ts) |
| **Payment Gateway Integration** | **Simulated / Test** | Simulated Provider Stub | [SimulatedPaymentProvider.ts](file:///C:/Users/clsid/COLIN/src/server/payments/SimulatedPaymentProvider.ts) |
| **Transactional Email Delivery** | Outbox Implemented (Provider Mocked) | DB Integration Test | [EmailOutboxService.ts](file:///C:/Users/clsid/COLIN/src/server/email/outbox/EmailOutboxService.ts), [email-outbox.integration.test.ts](file:///C:/Users/clsid/COLIN/src/test/email/email-outbox.integration.test.ts) |
| **Cloud Object Storage** | Local Disk Implemented (S3 Ready) | File Integration Test | [LocalStorageProvider.ts](file:///C:/Users/clsid/COLIN/src/server/storage/providers/LocalStorageProvider.ts), [S3StorageProvider.ts](file:///C:/Users/clsid/COLIN/src/server/storage/providers/S3StorageProvider.ts) |
