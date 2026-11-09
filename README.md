<div align="center">

<img src="public/assets/colin-logo.png" alt="COLIN Logo" width="220" />

# COLIN — Student Accommodation Discovery & Management Platform

**An enterprise-grade student accommodation discovery, guided visit booking, and property management platform.**

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.3-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18.4-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.2-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-762%2F762%20Passing-44A833?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Live Workspaces](#platform-workspaces) • [Key Features](#key-features) • [End-to-End Lifecycle](#guided-visit--financial-lifecycle) • [Architecture](#architecture) • [Testing & QA](#testing--quality-assurance) • [Reports](#documentation)

---

</div>

## Overview

**COLIN** bridges the trust, safety, and operational gap between university students seeking certified accommodations and property hosts managing PGs, hostels, and student flats.

Operating across four unified portals, COLIN integrates multi-attribute accommodation discovery, in-person field concierge visits, cryptographic role-based access control, PostgreSQL 18 transactional immutability, and an IAS-1 compliant double-entry financial ledger.

---

## Platform Workspaces

The platform delivers four distinct user experiences:

1. **Public Discovery Portal (`/`, `/property/:id`)**: High-performance student accommodation search engine with multi-facet filters (city, type, gender policy, budget, amenities). Restricts unverified listings and shields host contact details from unauthenticated users.
2. **Student Scholar Portal (`/student/*`)**: Secure student workspace featuring academic profile customization, housing preference matching, guided visit booking requests, simulated payment capture (`TEST/SIMULATED`), a 12-hour post-visit decision countdown, and virtual room tours.
3. **Property Owner Portal (`/owner/*`)**: Host inventory and operations portal supporting step-by-step listing registration, an 8-photo mandatory photographic evidence pipeline with cover photo selection, room and bed inventory management, and submission for physical quality verification.
4. **Admin Control Centre (`/admin/*`)**: High-security operational headquarters providing a live property verification queue, field visit scheduling and guide dispatch, visit completion recording with automatic 12-hour deadline calculation, overdue decision expiry workers, and real-time double-entry ledger summaries.

---

## Guided Visit & Financial Lifecycle

COLIN eliminates broker spam and protects students through a managed, in-person visit model backed by double-entry ledger accounting:

```mermaid
stateDiagram-v2
    [*] --> PAYMENT_PENDING: Student requests visit (₹150 fee)
    PAYMENT_PENDING --> FEE_PAID: Student captures payment (Escrow Posted)
    FEE_PAID --> VISIT_SCHEDULED: Admin schedules visit slot & guide
    VISIT_SCHEDULED --> DECISION_PENDING: Admin records physical completion
    note right of DECISION_PENDING: Strict 12-Hour Server Decision Deadline Activated

    DECISION_PENDING --> ACCEPTED: Student Accepts Accommodation
    note right of ACCEPTED: 100% (₹150) Settles from Escrow to Platform Revenue

    DECISION_PENDING --> REJECTED_REFUND_DUE: Student Rejects Accommodation
    note right of REJECTED_REFUND_DUE: 55% (₹82.50) Student Refund Payable\n45% (₹67.50) Retained Platform Fee

    DECISION_PENDING --> AUTO_EXPIRED: 12-Hour Deadline Elapsed
    note right of AUTO_EXPIRED: 100% (₹150) Forfeited to Platform Revenue\nTriggered by Expiry Worker
```

### Double-Entry General Ledger Invariant
Every financial event is recorded across balanced debit and credit entries. The database trigger `trg_prevent_unbalanced_ledger_transaction` guarantees that unposted or unbalanced journal entries are rejected at the storage engine level ($\sum \text{Debits} \equiv \sum \text{Credits}$).

---

## Key Features

### 🎓 Student Experience & Discovery
* **Discovery Engine**: Filter by proximity to Delhi University North Campus, budget ceiling, room occupancy, and gender policy.
* **COLIN Verified Shield**: On-site audited listings meeting 50 physical safety, hygiene, Wi-Fi, and fire-safety standards.
* **12-Hour Reserved Window**: Following an on-site visit, the student holds a strict 12-hour exclusive decision window before the room is released.
* **Fair 55% Refund Guarantee**: If the accommodation does not meet student expectations, 55% (₹82.50) is refunded to the student payable account.

### 🏢 Property Host Management
* **Listing Lifecycle**: Create listings in `DRAFT`, upload mandatory photographic assets, and submit for verification (`SUBMITTED`).
* **8-Photo Evidence Pipeline**: Requires distinct shots of facade, bedroom, bathroom, mess hall, study room, common area, water filtration, and security features.
* **Bed & Room Allocation**: Manage Single, Double, and Triple occupancy beds with dynamic monthly rent and security deposits.
* **Safety Isolation**: Host accounts are isolated from visitor scheduling; direct contact masking prevents student harassment.

### 🛡️ Admin Moderation & Quality Control
* **Moderation Pipeline**: Review submitted listings, inspect high-resolution gallery evidence, and grant official verification badges.
* **Dispatch & Coordination**: Assign field guides and schedule visit time windows with students.
* **Overdue Decision Expiry Worker**: Scans and settles visits exceeding the 12-hour deadline via `POST /api/v1/admin/bookings/process-expirations`.
* **Zero-Sum Balance Sheet**: Continuous tracking of `ESCROW_CASH`, `ESCROW_LIABILITY_STUDENT_DEPOSITS`, `REVENUE_VISIT_FEES`, and `REFUNDS_PAYABLE_STUDENT`.

---

## Architecture & Technology Stack

```mermaid
graph TD
    subgraph Frontend Application
        R6[React Router 6]
        AuthCtx[Auth & AdminAuth Contexts]
        Portals[Public | Student | Owner | Admin]
    end

    subgraph Backend API Gateway
        Express[Express 5.3 Framework]
        RBAC[JWT Role Guards]
        RateLimit[Redis 7 Sliding Window Rate Limiter]
    end

    subgraph Services & Domain
        AuthSvc[Authentication & Crypto Service]
        PropSvc[Property & Photo Pipeline]
        BookSvc[Visit Booking Lifecycle Service]
        LedgSvc[Double-Entry Ledger Engine]
    end

    subgraph Storage & Infrastructure
        AppDB[(PostgreSQL 18: colin_app_runtime)]
        AdminDB[(PostgreSQL 18: colin_admin_runtime)]
        Cache[(Redis 7: Session & Rate Limit Store)]
    end

    Portals --> R6 --> AuthCtx --> Express
    Express --> RBAC --> RateLimit
    RateLimit --> AuthSvc & PropSvc & BookSvc
    BookSvc --> LedgSvc
    AuthSvc --> AppDB & AdminDB
    PropSvc --> AppDB
    BookSvc --> AppDB
    LedgSvc --> AppDB
    RateLimit --> Cache
```

* **Frontend**: React 18, TypeScript 5.6, Tailwind CSS 3.4, Lucide Icons, Vite 5.4.
* **Backend**: Node.js 20+, Express 5.3, TypeScript strict mode.
* **ORM & Database**: Prisma ORM 5.22, PostgreSQL 18.4 (with custom check constraints, triggers, and least-privilege roles `colin_app_runtime` vs `colin_admin_runtime`).
* **Cache & Rate Limiting**: Redis 7.2 Alpine with atomic Lua sliding-window scripts and 128-bit UUID member tracking.
* **Security & Crypto**: CSPRNG 256-bit key generation, Argon2id/Bcrypt password hashing, AES-256-GCM email encryption, and immutable audit logs.

---

## Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) v20.0.0 or higher
* [pnpm](https://pnpm.io/) v9 or higher
* [PostgreSQL](https://www.postgresql.org/) v18 (configured on port 5433 or standard 5432)
* [Redis](https://redis.io/) v7 (running on port 6379)

### Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SiDdHaRtH-0509/COLIN.git
   cd COLIN
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and configure your database and Redis connection URLs:
   ```env
   DATABASE_URL="postgresql://colin_app_runtime:AppPass123!@localhost:5433/colin_dev?schema=public"
   ADMIN_DATABASE_URL="postgresql://colin_admin_runtime:AdminPass123!@localhost:5433/colin_dev?schema=public"
   REDIS_URL="redis://localhost:6379"
   JWT_SECRET="<64-char-hex-secret>"
   PORT=3000
   ```

4. **Run Database Migrations & Invariants**:
   ```bash
   npx prisma migrate deploy
   ```

5. **Start Frontend & Backend Development Servers**:
   ```bash
   pnpm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Testing & Quality Assurance

The COLIN platform prototype is verified by an exhaustive, automated regression and integration test suite:

```bash
# Execute the complete automated test suite (762 tests)
pnpm exec vitest run

# Run only the 14-scenario end-to-end integration suite
pnpm exec vitest run src/test/e2e/prototype-scenarios.test.ts

# Run the guided visit booking and double-entry ledger suite
pnpm exec vitest run src/test/booking/booking-lifecycle.integration.test.ts

# Run admin control centre page tests
pnpm exec vitest run src/test/admin_pages.test.tsx
```

### Verified Test Metrics
* **Total Test Files**: 57 passed (57)
* **Total Tests**: **762 passed (762)**
* **Failing Tests**: **0**
* **Skipped Tests**: **0**
* **Test Duration**: ~45 seconds
* **Type Safety**: Clean (`npx tsc --noEmit`)

---

## Documentation & Milestone Reports

Comprehensive engineering specifications, audit logs, and verification reports are maintained in the [`docs/`](docs/) directory:

* [COLIN Prototype Completion Report](docs/reports/COLIN_PROTOTYPE_COMPLETION_REPORT.md)
* [COLIN Feature Completion Matrix](docs/reports/COLIN_FEATURE_COMPLETION_MATRIX.md)
* [COLIN End-to-End Test Report (762 Passing Tests)](docs/reports/COLIN_END_TO_END_TEST_REPORT.md)
* [COLIN Known Limitations & Roadmap](docs/reports/COLIN_KNOWN_LIMITATIONS.md)
* [Central Database Architecture](docs/database/COLIN_DATABASE_ARCHITECTURE.md)
* [Platform Monetization Strategy](docs/MONETIZATION_STRATEGY.md)

---

## License

This project is licensed under the [MIT License](LICENSE).
