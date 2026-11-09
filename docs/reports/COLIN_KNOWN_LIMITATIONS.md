# COLIN — KNOWN LIMITATIONS & COMMERCIAL ROADMAP

**Document:** COLIN Platform Prototype Known Limitations  
**Classification:** Technical Disclosure & Engineering Transparency  
**Date:** November 9, 2026  
**Auditor:** Principal Reliability Engineer & Software Architect  

---

## 1. Purpose & Scope

This document provides a rigorous, transparent inventory of the known limitations, architectural boundaries, and simulated subsystems present in the current COLIN prototype. It establishes clear distinction between production-verified architectural mechanisms and prototype-level simulation adapters.

---

## 2. Simulated Subsystems & Non-Production Adapters

### 2.1 Payment Gateway Adapter (`TEST/SIMULATED`)
- **Current Implementation**: Guided visit booking fees (₹150.00) are captured through a local simulated payment adapter (`src/server/services/BookingService.ts`). The order identifiers are prefixed with `sim_order_`, and transaction references with `SIM-PAY-`.
- **UI Labeling**: All payment interfaces explicitly display the `Mode: TEST/SIMULATED` pill. No actual banking or UPI rail transactions occur.
- **Production Roadmap**: Prior to commercial public launch, replace the simulated adapter with an authorized RBI-compliant payment aggregator (e.g., Razorpay, Cashfree, or PayU) implementing webhook signature verification (`X-Razorpay-Signature`) and auto-refund webhooks.

### 2.2 External Cloud Storage (AWS S3 / Cloudflare R2)
- **Current Implementation**: The storage subsystem implements a dual-mode provider architecture (`S3StorageProvider` vs `MockStorageProvider`). In local test environments without active S3 bucket credentials, image uploads route through deterministic local/mock endpoints.
- **Production Roadmap**: Provision dedicated, least-privilege IAM credentials for Amazon S3 / Cloudflare R2 with CORS rules restricting PUT requests directly from the web client via presigned URLs.

### 2.3 Geolocation & Mapping (Google Maps Platform)
- **Current Implementation**: If `GOOGLE_MAPS_API_KEY` is not present, `GoogleGeolocationProvider` falls back to deterministic mock geocoding based on standard Indian postal pin codes and North Campus landmarks.
- **Production Roadmap**: Activate live Google Places Autocomplete and Geocoding APIs with HTTP referer and IP restriction quotas.

### 2.4 Transactional Email Delivery (SendGrid / Postmark)
- **Current Implementation**: Transactional emails (verification, password resets, visit notices) are queued in `email_outboxes`. In development and test runs, a mock email dispatcher logs deliveries to prevent external SMTP dependencies and spam-filter lockouts.
- **Production Roadmap**: Configure verified DKIM, SPF, and DMARC records on the production domain (`colin.in`) and attach SendGrid/Postmark webhooks for real-time delivery reconciliation.

---

## 3. Architectural & Concurrency Boundaries

### 3.1 Live Notification Delivery
- **Current Implementation**: Real-time updates on visit status changes and inspection approvals currently rely on page reloads, tab navigation, and client polling intervals (`Refresh Queue`, `Refresh Ledger`).
- **Production Roadmap**: Introduce a Server-Sent Events (SSE) or WebSocket connection hub (e.g., Socket.io or AWS API Gateway WebSockets) backed by Redis Pub/Sub to push instant status alerts to student and owner browser tabs.

### 3.2 Scheduled Background Workers
- **Current Implementation**: The overdue visit decision expiry worker (`expireOverdueDecisions`) can be triggered manually via `POST /api/v1/admin/bookings/process-expirations` or invoked programmatically.
- **Production Roadmap**: Mount a dedicated Node.js cron runner or cloud-native scheduler (e.g., AWS EventBridge / Cloud Tasks) to execute the expiry pass every 5 minutes.

### 3.3 Single-Region Deployment
- **Current Implementation**: The database and cache run on a single local host (PostgreSQL 18 on port 5433, Redis 7 on port 6379).
- **Production Roadmap**: For high-availability multi-city operations across India, deploy PostgreSQL across primary-standby read replicas with PgBouncer connection pooling and a multi-node Redis Sentinel / Cluster cluster.

---

## 4. User Experience & Feature Enhancements

1. **Digital Tenancy Agreements**: The prototype terminates at accommodation acceptance (`ACCEPTED`). Generation of digitally signed rental agreements, Aadhaar e-Sign, and monthly recurring rent collections represent post-prototype features.
2. **Student Roommate Matching**: Roommate preference matching and lifestyle quizzes are captured in profile metadata (`lifestyleHabits: Record<string, unknown>`), but algorithmic compatibility scoring remains a Phase 5 expansion.
3. **Advanced Biometric Verification**: On-site student identity verification during guided visits currently relies on manual field volunteer confirmation rather than biometric or DigiLocker SDK integrations.
