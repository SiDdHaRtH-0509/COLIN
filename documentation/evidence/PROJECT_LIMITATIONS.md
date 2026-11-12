# COLIN — Engineering Limitations & Production Readiness Roadmap

**Document ID:** COLIN-EVID-010  
**Target:** Academic B.Tech Capstone Project Documentation  
**Repository Branch:** `colin-prototype-completion`  
**Evaluation Scope:** Academic Capstone Prototype Evaluation  

---

## 1. Executive Disclosure

While COLIN successfully satisfies all core architectural, financial, and lifecycle requirements of the prototype specification, it is an **academic capstone prototype** and is **not yet deployable as a commercial production service**. 

Passing automated test suites and achieving a clean build verifies architectural integrity and business rule consistency, but does not substitute for real-world enterprise infrastructure readiness.

---

## 2. Simulated vs. Real Payment Systems

| Capability | Current Prototype State | Commercial Production Requirement |
|---|---|---|
| **Payment Gateway Integration** | **Simulated Test Provider** (`SimulatedPaymentProvider`) | Licensed Payment Aggregator (Razorpay, Cashfree, Stripe) |
| **Card / UPI Transaction Processing** | In-memory verification with synthetic IDs (`pay_sim_...`) | Real-time 3D Secure 2.0 authentication, UPI deep-linking, bank webhooks |
| **Webhook Cryptography** | Test stubs in `src/server/api/v1/routes/webhook.routes.ts` | Cryptographic HMAC-SHA256 signature verification per gateway payload |
| **Nodal Escrow Banking** | Internal double-entry general ledger tracking in PostgreSQL | RBI-compliant Nodal Escrow bank account with automated Payout API |
| **Disbursement Execution** | Internal database disbursement records | Automated IMPS/NEFT bank transfers to host bank accounts |

---

## 3. Mocked vs. Live External Service Providers

### 3.1 Geocoding & Geospatial APIs
- **Prototype Status:** Hybrid implementation in [LocationService.ts](file:///C:/Users/clsid/COLIN/src/server/location/location.service.ts). Contains integration stubs for Google Places Autocomplete API with a curated fallback campus registry for Delhi University North Campus.
- **Production Requirement:** Active Google Maps Platform billing account with API keys, configured geofencing restrictions, and client-side quota controls.

### 3.2 Transactional Email & Messaging Delivery
- **Prototype Status:** Implemented as a transactional PostgreSQL queue in [EmailOutboxService.ts](file:///C:/Users/clsid/COLIN/src/server/email/outbox/EmailOutboxService.ts). Outbox records are generated and tested, but outgoing delivery relies on mock adapters.
- **Production Requirement:** Outbox delivery daemon connected to AWS Simple Email Service (SES) or SendGrid API, with bounce/complaint webhook processing.
- **SMS / WhatsApp:** Not connected; prototype relies exclusively on email notifications and in-app system notifications.

### 3.3 Media Storage & Object Delivery
- **Prototype Status:** [LocalStorageProvider.ts](file:///C:/Users/clsid/COLIN/src/server/storage/providers/LocalStorageProvider.ts) persists WebP assets to local server disk storage (`public/uploads/`).
- **Production Requirement:** Deployment of [S3StorageProvider.ts](file:///C:/Users/clsid/COLIN/src/server/storage/providers/S3StorageProvider.ts) connecting to Amazon S3 or Cloudflare R2, served through a global Content Delivery Network (CDN) with signed presigned URLs.

---

## 4. Manual Operational Dependencies

The business model relies on physical human intervention for safety verification:
1. **Physical Property Verification Audits:**
   An authorized human field concierge must visit the accommodation in person, inspect the 50-point checklist (fire safety, hygiene, Wi-Fi speed, security apparatus), and upload verification evidence. The platform cannot automate physical reality.
2. **Supervised Guided Visits:**
   Campus student ambassadors escort students to physical property walkthroughs.
3. **Manual Administrative Assignment:**
   While visit requests and decision expirations are automated, scheduling and guide dispatch require operational coordination via the Admin Control Centre.

---

## 5. Background Worker Clustering & Distributed Concurrency

- **Current Prototype Implementation:**
  The [BookingExpiryWorker](file:///C:/Users/clsid/COLIN/src/server/workers/BookingExpiryWorker.ts) utilizes an in-process memory mutex (`isProcessing` flag and `inFlightPromise` tracking).
- **Limitation:**
  If the application is horizontally scaled across multiple container instances (e.g. Kubernetes pods or AWS ECS tasks), each instance will run an independent worker, potentially causing duplicate sweeps.
- **Production Requirement:**
  Migration to distributed database advisory locks (`pg_try_advisory_lock` in PostgreSQL) or a distributed Redis queue (e.g., BullMQ with Redlock) to ensure singleton execution across distributed clusters.

---

## 6. Performance Micro-Benchmark Thresholds

As detailed in [TESTING_AND_RESULTS.md](file:///C:/Users/clsid/COLIN/documentation/evidence/TESTING_AND_RESULTS.md), 10 timing-sensitive micro-benchmarks fail during full parallel Vitest execution (761/771 passing). These tests assert sub-5ms or sub-1500ms execution times under synthetic load, which experience jitter when 58 test files compete for CPU and disk I/O on a developer machine. Production benchmarking requires dedicated load testing infrastructure (e.g. k6 or Artillery) run against isolated, production-grade cloud instances.

---

## 7. Deliberately Omitted / Unimplemented Features

1. **Direct Peer-to-Peer In-App Chat:**
   Intentionally excluded. Direct unstructured chat between students and hosts allows unscrupulous brokers to bypass platform verification and harass students off-platform.
2. **Digital Lease Signing (Aadhaar e-Sign):**
   Legal rental lease agreements are executed offline during move-in; digital contract signing with Indian Information Technology Act legal compliance is deferred to Phase 5.
3. **Real-Time GPS Guide Tracking:**
   Real-time map tracking of ambassadors en route to visits is planned for future mobile app releases.
