# COLIN — System Architecture & Component Interaction

**Document ID:** COLIN-EVID-003  
**Target:** Academic B.Tech Capstone Project Documentation  
**Repository Branch:** `colin-prototype-completion`  

---

## 1. System Architecture Overview

COLIN follows a modular multi-tier architecture designed around least-privilege security boundaries, asynchronous domain events, and strict transactional database immutability. The platform cleanly segregates customer operations (Students, Owners, Public) from administrative control and automated background daemons.

---

## 2. High-Level Architecture Diagram

```mermaid
graph TD
    subgraph Client Layer (React 18 Single Page Application)
        PublicPortal["Public Discovery Portal\n(/, /properties)"]
        StudentPortal["Student Scholar Portal\n(/student/*, /visits)"]
        OwnerPortal["Owner Management Portal\n(/owner/*)"]
        AdminPortal["Admin Control Centre\n(/admin/*)"]
    end

    subgraph API Gateway & HTTP Middleware Pipeline (Express 5.3)
        ReqID["Correlation ID Middleware\n(X-Request-ID)"]
        SecHeaders["Security Headers & CORS\n(Helmet, Origin Whitelist)"]
        BodyParsers["Payload Parsers & Cookie Parser\n(10MB Bounded Limit)"]
        RateLimiter["Distributed Rate Limiter\n(Redis 7 Sliding Window Lua)"]
        AuthContext["Auth Context & Token Verifier\n(JWT HS256 & Session Guard)"]
        CSRF["CSRF Defense Middleware\n(Double Submit Cookie)"]
        APIRouter["API Router /api/v1\n(Versioned Controller Mounts)"]
    end

    subgraph Application & Domain Services Tier
        AuthService["Auth & Token Service\n(Bcrypt, JWT, Role Checks)"]
        PropertyService["Property & Room Service\n(Search, Amenities, Rules)"]
        BookingService["Booking & Visit Service\n(12h Window, Decision State)"]
        ImageService["Image Processing Pipeline\n(Sharp, Magic Bytes, EXIF Strip)"]
        EmailService["Email Outbox Service\n(Transactional Notification Queue)"]
    end

    subgraph Autonomous Background Daemons
        ExpiryWorker["BookingExpiryWorker\n(60s Cadence, Mutex Locked)"]
    end

    subgraph Data & Storage Tier
        PostgresApp[(PostgreSQL 18\ncolin_app_runtime)]
        PostgresAdmin[(PostgreSQL 18\ncolin_admin_runtime)]
        RedisStore[(Redis 7.2\nRate Limit & Session Store)]
        DiskStorage[(Local File System / S3\nMaster & Thumbnail WebP)]
    end

    %% Client to Gateway
    PublicPortal & StudentPortal & OwnerPortal & AdminPortal --> ReqID
    ReqID --> SecHeaders --> BodyParsers --> RateLimiter --> AuthContext --> CSRF --> APIRouter

    %% Rate Limiter to Redis
    RateLimiter -.-> RedisStore

    %% Router to Services
    APIRouter --> AuthService & PropertyService & BookingService & ImageService & EmailService

    %% Booking Service to Expiry Worker
    ExpiryWorker -->|Invokes expireOverdueDecisions| BookingService

    %% Services to Storage & DB
    AuthService --> PostgresApp
    PropertyService --> PostgresApp
    BookingService -->|Double-Entry Transactions| PostgresApp
    ImageService --> DiskStorage
    EmailService --> PostgresApp

    %% Admin Isolation
    AdminPortal -.->|colin_admin_runtime| PostgresAdmin
```

---

## 3. Frontend / Backend Communication Protocol

- **Protocol:** HTTP/1.1 RESTful JSON over TCP.
- **Port Orchestration:**
  - Frontend Client: `http://localhost:5173` (Vite Development Server)
  - Backend API: `http://localhost:3001` (Express Application Gateway)
  - Reverse Proxy: Configured in [vite.config.ts](file:///C:/Users/clsid/COLIN/vite.config.ts) mapping `/api` to the backend target, precluding browser CORS issues during local execution.
- **Correlation & Traceability:** Every incoming request receives an `X-Request-ID` header generated via UUIDv4 in [requestId.ts](file:///C:/Users/clsid/COLIN/src/server/middleware/requestId.ts). This ID flows through all logger entries and error responses, enabling end-to-end request tracing.
- **Standard Envelope:** Responses adhere to a consistent contract:
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": {
      "requestId": "6b3e8c14-5d82-4f11-9a71-893bc44ef012",
      "timestamp": "2026-11-12T18:30:00.000Z"
    }
  }
  ```

---

## 4. Dual-Role Database Access Strategy

To enforce the Principle of Least Privilege (PoLP), COLIN maintains two distinct database roles managed through singleton clients in [src/server/database/prisma.ts](file:///C:/Users/clsid/COLIN/src/server/database/prisma.ts):

1. **`colin_app_runtime`:**
   - Used for all customer queries originating from Students, Owners, and unauthenticated public visitors.
   - Strictly granted `SELECT`, `INSERT`, `UPDATE` only on business tables (`properties`, `rooms`, `beds`, `booking_requests`, `financial_payments`).
   - **Explicit Revocation:** Completely barred from querying or modifying administrative tables (`admin_accounts`, `admin_sessions`, `admin_roles`, `admin_audit_logs`).
2. **`colin_admin_runtime`:**
   - Dedicated connection pool used exclusively by the Admin Control Centre and administrative controllers.
   - Accesses audit logs, verification queue queues, and user privilege tables.
   - Enforces read-only or append-only rules on historical ledger and audit tables.

---

## 5. Background Worker Daemon Architecture

The platform incorporates an autonomous background worker subsystem registered in the server bootstrap lifecycle ([server.ts](file:///C:/Users/clsid/COLIN/src/server/server.ts)):

```
 +-------------------------------------------------------------------+
 |                   BookingExpiryWorker Subsystem                   |
 +-------------------------------------------------------------------+
   |
   |-- 1. Server Bootstrap:
   |      Instantiated and registered with graceful shutdown manager.
   |
   |-- 2. Startup Catch-Up Sweep:
   |      Runs an immediate sweep on boot to process overdue decisions
   |      that elapsed during maintenance downtime.
   |
   |-- 3. Scheduled Periodic Interval (60,000 ms):
   |      Fires every 60 seconds.
   |
   |-- 4. Mutex Concurrency Lock:
   |      Evaluates `isProcessing` flag. If a previous sweep is active,
   |      subsequent intervals log a warning and skip safely.
   |
   |-- 5. Canonical Domain Logic:
   |      Invokes `BookingService.expireOverdueDecisions(cutoffTime)`.
   |      - Queries `status = DECISION_PENDING` AND `decisionDeadline <= NOW()`.
   |      - Atomically updates booking to `AUTO_EXPIRED`.
   |      - Posts double-entry ledger settlement (Debit Escrow, Credit Revenue).
   |
   |-- 6. Graceful Shutdown & Drain:
   |      On `SIGTERM`/`SIGINT`, clears interval timer, rejects new work,
   |      and awaits `inFlightPromise` drain (up to 10s timeout).
```

---

## 6. External Service Integrations & Abstraction Strategy

| Service Domain | Production Intent | Prototype Implementation State | Abstraction Mechanism |
|---|---|---|---|
| **Payment Gateway** | Razorpay / Stripe UPI & Cards | **Simulated / Test Provider** | [SimulatedPaymentProvider.ts](file:///C:/Users/clsid/COLIN/src/server/payments/SimulatedPaymentProvider.ts) generates synthetic order IDs, verifies idempotency tokens, and simulates bank success/decline states. |
| **Object Storage** | AWS S3 / Cloudflare R2 | **Local Disk Provider** | [LocalStorageProvider.ts](file:///C:/Users/clsid/COLIN/src/server/storage/providers/LocalStorageProvider.ts) stores processed WebP files in `public/uploads/` with URL serving. An S3-compatible driver [S3StorageProvider.ts](file:///C:/Users/clsid/COLIN/src/server/storage/providers/S3StorageProvider.ts) is fully implemented for seamless cloud switchover. |
| **Geospatial & Mapping** | Google Maps Platform | **Hybrid (API + Fallback Registry)** | [LocationService.ts](file:///C:/Users/clsid/COLIN/src/server/location/location.service.ts) integrates Google Places Autocomplete API with a curated fallback campus coordinate dataset for Delhi University North Campus. |
| **Transactional Email** | SendGrid / Postmark | **PostgreSQL Outbox Queue** | [EmailOutboxService.ts](file:///C:/Users/clsid/COLIN/src/server/email/outbox/EmailOutboxService.ts) serializes transactional emails to PostgreSQL table `email_outbox`, protecting customer workflows from external SMTP downtime. |
