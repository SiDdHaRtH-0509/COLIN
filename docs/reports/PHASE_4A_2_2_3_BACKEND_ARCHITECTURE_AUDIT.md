# COLIN — PHASE 4A.2.2.3 BACKEND ARCHITECTURE AUDIT

**Project:** COLIN — Student Accommodation Platform  
**Phase:** Phase 4A.2.2.3 — Backend Core Service & API Architecture  
**Previous Phase:** Phase 4A.2.2.2 — Backend Database Connectivity & ORM Integration  
**Base Acceptance Commit:** `3b2aac3`  
**Current Feature Branch:** `phase-4a-2-2-3-backend-core-api`  
**Evaluation Standard:** Production-Grade Modular Monolith Architecture  

---

## 1. Executive Summary & Audit Purpose

Before introducing backend server infrastructure, an exhaustive audit of the COLIN repository was conducted to inspect existing packages, runtime configurations, server-side modules, and frontend integration surfaces.

The objective of Phase 4A.2.2.3 is to establish a secure, versioned, maintainable backend HTTP server and API architecture without breaking existing frontend routes, disrupting client test suites, or introducing heavyweight or competing frameworks.

---

## 2. Comprehensive Repository Audit Findings

### 2.1 Backend HTTP Server Presence
- **Current State:** No standalone HTTP daemon server currently runs.
- **Previous Implementations:**
  - `src/server/adminSecurity.ts`: An in-memory zero-trust authorization and session simulation engine developed in Phase 4A.1 to support Admin Control Centre frontend workflows.
  - `src/server/database/`: Hardened database persistence infrastructure implemented in Phase 4A.2.2.2 containing configuration, PrismaClient singletons, lifecycle handlers, domain repositories, transaction runners, error translators, and health probes.

### 2.2 Framework & Dependency Inspection
- **Package Manifest (`package.json`):**
  - Frontend: React 18.3.1, React Router DOM 6.28.0, Tailwind CSS 3.4.15, Framer Motion 11.11.17, Lucide React 0.460.0.
  - Database: `@prisma/client` 5.22.0, `pg` 8.13.1, `prisma` 5.22.0.
  - Tooling & Testing: TypeScript 5.6.3, Vite 5.4.11, Vitest 2.1.9, Testing Library.
  - HTTP Server Frameworks: **None installed** (no Express, Fastify, NestJS, Koa, or Hapi).
  - Validation Libraries: **None installed** (no Zod, Yup, or Joi).
  - API Testing Utilities: **None installed** (no Supertest).

### 2.3 Package & Workspace Structure
- Single unified monorepo package rooted at `C:/Users/clsid/COLIN`.
- Frontend code and server code coexist under `src/`. Server infrastructure resides cleanly under `src/server/`.

### 2.4 TypeScript Configuration & Server-Side Support
- `tsconfig.json` specifies `"target": "ES2020"`, `"module": "ESNext"`, `"moduleResolution": "bundler"`, and `"strict": true`.
- Native Node.js 20+ ES modules (`"type": "module"` in `package.json`) are fully supported.
- Type checking (`tsc --noEmit`) covers `src/`, ensuring static validation across both client and server modules.

### 2.5 Routes and Controllers
- Frontend client routes reside in `src/App.tsx`.
- Client-side mock API service for admin resides in `src/services/admin/adminApiClient.ts`.
- **Zero backend HTTP routes or controllers** currently exist.

### 2.6 Middleware Architecture
- In-memory session verification routines exist in `src/server/adminSecurity.ts`.
- **Zero HTTP middleware** (CORS, Request ID, JSON body parsers, rate limiters, centralized HTTP error handlers) currently exists.

### 2.7 Authentication Infrastructure
- Client-side state managed via `src/context/AuthContext.tsx`.
- In-memory RBAC permissions matrix defined in `src/server/adminSecurity.ts`.
- Central PostgreSQL schema defines full auth models (`users`, `user_profiles`, `user_sessions`, `admin_accounts`, `admin_sessions`).
- HTTP authentication interfaces and security request context (`AuthenticatedRequestContext`) need formal integration boundaries in this phase.

### 2.8 Database Persistence Layer Integration
- Full PostgreSQL 18.4 + Prisma 5.22.0 persistence layer is verified and functional in `src/server/database/`.
- Dual-role runtime access (`colin_app_runtime` vs `colin_admin_runtime`) is enforced.
- 5 foundational repositories are operational: `UserRepository`, `PropertyRepository`, `BedReservationRepository`, `LedgerRepository`, and `AdminAuditRepository`.
- 282 platform tests (161 unit & invariant + 78 postgres integrity + 43 backend ORM integration) pass with 100% success.

### 2.9 OpenAPI Configuration
- **No OpenAPI / Swagger specification** or generator exists.

### 2.10 Dependency Conflict Assessment
- There are **zero conflicting HTTP server dependencies**. The dependency tree is lean and cleanly partitioned.

---

## 3. Framework Selection & Technical Justification

### 3.1 Framework Evaluation

| Criteria | Native `node:http` | Fastify | NestJS | Express |
| :--- | :--- | :--- | :--- | :--- |
| **Architectural Weight** | Zero dependencies | Lightweight | Extremely Heavy (Decorators, DI container, metadata reflection) | **Lightweight** |
| **Maturity & Stability** | Low (manual routing, body parsing) | High | High | **Industry Standard (Rock Solid)** |
| **TypeScript Compatibility** | Requires manual typings | Good | High | **Excellent (`@types/express`)** |
| **In-Memory Testing** | Complex socket mocking | Inject API | Requires full module bootstrap | **Effortless with `supertest`** |
| **Separation of App & Server** | Manual | Supported | Supported | **Clean (`createApp()` vs `server.listen()`)** |
| **Compliance with Rules** | High engineering overhead | Acceptable | **Explicitly Prohibited by Prompt** | **Recommended Standard** |

### 3.2 Technical Justification for Express
1. **Separation of Concerns**: Allows clean decoupling between application creation (`createApp()` returning `express.Application`) and network socket binding (`server.ts`). This allows integration test suites to execute requests in-memory via `supertest` without opening network ports or causing port conflicts.
2. **Minimal Surface Area**: Adds only standard HTTP routing, request/response lifecycle hooks, and middleware pipelining without imposing architectural dogmatism or reflection overhead.
3. **Seamless Middleware Ecosystem**: Standard middleware (`cors`, `helmet`-style security headers, request correlation IDs) integrate predictably with standard signatures (`(req, res, next)`).
4. **Zero Frontend Interference**: Operates strictly under `src/server/`, leaving the Vite dev server and React 18 client bundles untouched.

### 3.3 Request Validation Selection: Zod
- **Selected Library:** `zod`
- **Justification:** Zero runtime dependencies, TypeScript-first type inference (`z.infer<T>`), composable schemas, precise error reporting via `ZodError.issues`, and universal support for body, query, and route parameter validation.

### 3.4 HTTP Integration Testing: Supertest
- **Selected Library:** `supertest` + `@types/supertest`
- **Justification:** Enables high-speed, deterministic HTTP assertion against the `express.Application` instance directly within Vitest without starting an active TCP listener.

---

## 4. Dependencies Installation Plan

In accordance with execution rules (Terminal Sandbox Rule 6: Windows pnpm install outside sandbox with `BypassSandbox: true`):

```bash
pnpm add express zod cors
pnpm add -D @types/express @types/cors supertest @types/supertest
```

### Security Implications:
- Explicit CORS origin whitelisting: Wildcard origins (`*`) are prohibited when credentials are enabled.
- Request payload ceiling: Express JSON parser bound to maximum 1MB to prevent memory exhaustion denial-of-service attacks.
- Secure HTTP headers: Explicit configuration of `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Strict-Transport-Security`.
- Credential sanitization: Standardized request logging strips authorization headers, cookie tokens, and sensitive body fields (`password`, `passwordHash`, `token`).

---

## 5. Architectural Directory Layout

The following structure will be established under `src/server/`:

```
src/server/
├── app.ts                        # Application factory (createApp) & middleware pipeline
├── server.ts                     # Standalone HTTP network listener & bootstrap entrypoint
├── config/
│   └── serverConfig.ts           # HTTP server, port, CORS, & environment configuration
├── api/
│   └── v1/
│       ├── index.ts              # Central v1 router registration
│       ├── routes/
│       │   ├── health.routes.ts  # Liveness & readiness probe routes
│       │   └── system.routes.ts  # System diagnostics & OpenAPI spec routes
│       └── controllers/
│           ├── health.controller.ts # Health check controller
│           └── system.controller.ts # System info & OpenAPI controller
├── middleware/
│   ├── requestId.ts              # X-Request-Id correlation generator
│   ├── securityHeaders.ts        # Production HTTP security headers
│   ├── cors.ts                   # Configured CORS middleware
│   ├── requestLogger.ts          # Sanitized request logging
│   ├── validateRequest.ts        # Generic Zod schema validation middleware
│   ├── authContext.ts            # AuthenticatedRequestContext extractor & mock-guard interface
│   └── errorHandler.ts           # Centralized HTTP & database error pipeline
├── services/
│   ├── HealthService.ts          # Service bridging DB health probe to API responses
│   └── SystemService.ts          # System diagnostic & metadata service
├── types/
│   ├── api.ts                    # Standard API success & error response interfaces
│   └── auth.ts                   # AuthenticatedRequestContext & security interfaces
└── docs/
    └── openapi.json              # OpenAPI 3.1 specification for /api/v1
```

---

## 6. Audit Verdict

The architecture audit is **COMPLETE**. The technical path is fully defined, dependencies are vetted, and implementation is authorized to proceed to Stage 2.
