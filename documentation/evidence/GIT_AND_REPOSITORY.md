# COLIN — Repository Structure, Git History & Source Hierarchy

**Document ID:** COLIN-EVID-011  
**Target:** Academic B.Tech Capstone Project Documentation  
**Repository Branch:** `colin-prototype-completion`  
**Working Tree State:** Clean (Zero uncommitted changes)  

---

## 1. Git Repository State & Traceability

- **Active Branch:** `colin-prototype-completion`
- **Initial Baseline HEAD:** `eca7533`
- **Current HEAD Commit:** `d102ae9`
- **Branch Policy Compliance:**
  - Branch preserved throughout all remediation and documentation phases.
  - Zero history rewrites or rebases performed.
  - No remote pushes or unapproved merges into `main`.
  - Atomic, single-purpose commits.

### Recent Commit Log (Chronological Reverse Order)

```text
d102ae9 docs(remediation): add final prototype remediation, browser e2e, and expiry worker reports
b1fe196 test(playwright): account for owner property subscription limit in listing form test
3db390e test(playwright): integrate browser end-to-end testing for student, owner, admin, and security journeys
f0d01b8 feat(worker): implement autonomous automatic booking decision expiry worker with graceful shutdown
ccc16e7 fix(typescript): resolve compiler errors, API unwrapping, email outbox input, and adapter contracts
eca7533 [Baseline HEAD at start of Final Prototype Remediation Sprint]
```

---

## 2. Top-Level Repository Structure

```text
COLIN/
├── documentation/
│   └── evidence/                      # Academic B.Tech Capstone Evidence Deliverables
│       ├── PROJECT_OVERVIEW.md
│       ├── TECHNOLOGY_STACK.md
│       ├── SYSTEM_ARCHITECTURE.md
│       ├── DATABASE_DOCUMENTATION.md
│       ├── API_DOCUMENTATION.md
│       ├── BOOKING_LIFECYCLE.md
│       ├── FINANCIAL_LEDGER.md
│       ├── SECURITY_DOCUMENTATION.md
│       ├── TESTING_AND_RESULTS.md
│       ├── PROJECT_LIMITATIONS.md
│       ├── GIT_AND_REPOSITORY.md
│       └── SCREENSHOT_REQUIREMENTS.md
├── docs/
│   └── database/
│       └── COLIN_CUSTOM_POSTGRESQL_CONSTRAINTS.sql  # PL/pgSQL Triggers & Schema Constraints
├── e2e/                               # Playwright Browser End-to-End Test Suite
│   ├── admin-journey.spec.ts          # Control Centre E2E flows
│   ├── owner-journey.spec.ts          # Host inventory & photo limit flows
│   ├── security.spec.ts               # RBAC and private route isolation flows
│   └── student-journey.spec.ts        # Student explore, visit pass & decision flows
├── prisma/
│   └── schema.prisma                  # Central Prisma Schema (58 Relational Models)
├── public/                            # Static Frontend Web Assets
│   └── assets/                        # Logos and UI icons
├── scripts/                           # Engineering Utility & Benchmark Scripts
│   ├── generate_attribution_screenshots.cjs
│   └── geospatial_benchmark.ts
├── src/                               # Application Source Code (Frontend & Backend)
│   ├── components/                    # Reusable React UI Components
│   ├── constants/                     # Platform Enums & Shared Constants
│   ├── context/                       # React Context Providers (Auth, Admin, Property, Student)
│   ├── data/                          # Seed Data & Verification Fixtures
│   ├── pages/                         # React Portal Page Views (Public, Student, Owner, Admin)
│   ├── server/                        # Backend Application & Services Tier
│   │   ├── api/v1/                    # RESTful Route Controllers & Zod Schemas
│   │   ├── auth/                      # Password & JWT Token Services
│   │   ├── config/                    # Server & Secret Configurations
│   │   ├── database/                  # Repositories & Prisma Dual-Client Singletons
│   │   ├── email/                     # Transactional Outbox & Notification Templates
│   │   ├── lifecycle/                 # Database & Process Graceful Shutdown Handlers
│   │   ├── location/                  # Geospatial & Campus Location Services
│   │   ├── middleware/                # Express Pipeline Middleware Chain
│   │   ├── payments/                  # Simulated Payment Provider
│   │   ├── redis/                     # Redis Client & Sliding-Window Rate Limiter
│   │   ├── reliability/               # Circuit Breakers, Retry Handlers & Structured Loggers
│   │   ├── services/                  # Core Business Domain Services (Booking, Property, Admin)
│   │   ├── storage/                   # Image Processing Pipeline & S3/Local Providers
│   │   ├── types/                     # Backend Data Contracts & Enums
│   │   └── workers/                   # BookingExpiryWorker Autonomous Daemon
│   ├── services/                      # Frontend API Client Services
│   ├── test/                          # Comprehensive Vitest Test Suite (58 Test Files)
│   ├── types/                         # Frontend TypeScript Interfaces
│   ├── utils/                         # Property Adapters & Formatting Helpers
│   ├── App.tsx                        # Main React Route Hierarchy
│   ├── index.css                      # Tailwind Global Style Injections
│   └── main.tsx                       # React DOM Client Entrypoint
├── package.json                       # Package Manifest & Script Definitions
├── playwright.config.ts               # Playwright Test Engine Configuration
├── pnpm-lock.yaml                     # Dependency Version Pinning Lockfile
├── tsconfig.json                      # Strict TypeScript Compiler Configuration
└── vite.config.ts                     # Vite Development Server & Reverse Proxy Configuration
```

---

## 3. Key Source Code Directory Responsibilities

| Directory Path | Core Responsibility |
|---|---|
| [src/pages/](file:///C:/Users/clsid/COLIN/src/pages) | Houses the 4 portal view layouts: Public Discovery (`/`), Student (`/student`), Owner (`/owner`), and Admin Control Centre (`/admin`). |
| [src/context/](file:///C:/Users/clsid/COLIN/src/context) | Encapsulates client-side authentication, session persistence, and synchronized property/booking state. |
| [src/server/services/](file:///C:/Users/clsid/COLIN/src/server/services) | Implements domain business logic: [BookingService.ts](file:///C:/Users/clsid/COLIN/src/server/services/BookingService.ts), [PropertyService.ts](file:///C:/Users/clsid/COLIN/src/server/services/PropertyService.ts), [AdminPropertyService.ts](file:///C:/Users/clsid/COLIN/src/server/services/AdminPropertyService.ts). |
| [src/server/database/](file:///C:/Users/clsid/COLIN/src/server/database) | Manages Prisma dual-role connections, transactions, and repositories: [BookingRepository.ts](file:///C:/Users/clsid/COLIN/src/server/database/repositories/BookingRepository.ts), [LedgerRepository.ts](file:///C:/Users/clsid/COLIN/src/server/database/repositories/LedgerRepository.ts). |
| [src/server/workers/](file:///C:/Users/clsid/COLIN/src/server/workers) | Implements autonomous server background daemons: [BookingExpiryWorker.ts](file:///C:/Users/clsid/COLIN/src/server/workers/BookingExpiryWorker.ts). |
| [src/server/storage/](file:///C:/Users/clsid/COLIN/src/server/storage) | Hardens media uploads: [image.processor.ts](file:///C:/Users/clsid/COLIN/src/server/storage/image.processor.ts) and storage adapters. |
| [src/test/](file:///C:/Users/clsid/COLIN/src/test) | 58 test files covering unit, integration, database integrity, rate limiting, and reliability. |
| [e2e/](file:///C:/Users/clsid/COLIN/e2e) | Automated browser test specs covering cross-portal user journeys in headless Chromium. |
