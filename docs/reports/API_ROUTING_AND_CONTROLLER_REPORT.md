# COLIN — API ROUTING AND CONTROLLER REPORT

**Phase:** Phase 4A.2.2.3 — Backend Core Service & API Architecture  
**Component Modules:** `src/server/api/v1/routes/`, `src/server/api/v1/controllers/`  
**API Namespace:** `/api/v1`  
**Status:** FULL PASS  

---

## 1. Routing Architecture Overview

COLIN's backend routing implements a centralized, versioned hierarchy under the `/api/v1` namespace. Routes are strictly organized by domain and maintain clear separation between route definition (HTTP method, path, validation middleware, authorization guards) and controller logic (request context inspection, service invocation, standardized response formatting).

### 1.1 Directory Structure

```
src/server/api/v1/
├── index.ts                      # Central v1 router mounting domain sub-routers
├── routes/
│   ├── health.routes.ts          # /health routes (live, ready)
│   └── system.routes.ts          # /system routes (info, openapi, validate-test, admin-test)
└── controllers/
    ├── health.controller.ts      # HealthController
    └── system.controller.ts      # SystemController
```

---

## 2. Route Registration & Versioning

The root API router (`src/server/api/v1/index.ts`) aggregates domain sub-routers:

```typescript
const v1Router = Router();

v1Router.use('/health', healthRoutes);
v1Router.use('/system', systemRoutes);

export default v1Router;
```

In `src/server/app.ts`, this router is mounted dynamically with the configured prefix (`config.apiPrefix = '/api/v1'`), guaranteeing that future API versions (e.g. `/api/v2`) can coexist seamlessly without breaking legacy consumers.

---

## 3. Controller Architecture & Architectural Boundary Rules

Controllers in COLIN are strictly constrained to HTTP protocol concerns.

### 3.1 Controller Responsibilities
1. **Input Extraction**: Reads pre-validated `req.params`, `req.query`, and `req.body` provided by upstream Zod validation middleware.
2. **Context Resolution**: Reads trusted server-side security context from `req.context`.
3. **Service Delegation**: Dispatches business operations to domain services (`healthService`, `systemService`, etc.).
4. **Standardized Response Formatting**: Wraps outputs in the canonical `ApiSuccessResponse` format, populating correlation IDs from `req.id`.
5. **Error Forwarding**: Delegates unexpected failures or rejected promises to `next(err)` for centralized handling.

### 3.2 Prohibited Controller Behaviors (Strict Enforcement)
- **NO Direct Database Queries**: Controllers never instantiate or query PrismaClient directly.
- **NO Financial Calculations**: Double-entry ledger calculations belong exclusively in domain repositories and accounting services.
- **NO Unvalidated Client Input**: Controllers never access raw, unvalidated request objects.
- **NO Client-Supplied Authorization Trust**: Controllers never inspect headers such as `x-role` or client claims; authorization is enforced exclusively by server-side middleware guards.

---

## 4. Representative Controllers Implemented

### 4.1 `HealthController` (`src/server/api/v1/controllers/health.controller.ts`)
- **`getLive(req, res, next)`**: Proves event loop responsiveness. Returns HTTP 200 with uptime and status `UP`.
- **`getReady(req, res, next)`**: Queries dual-role database connectivity via `healthService.getReadiness()`.
  - When database is healthy: returns HTTP 200 with database health report.
  - When database is degraded or offline: returns HTTP 503 (`SERVICE_NOT_READY`) with diagnostic report (zero plaintext secrets).

### 4.2 `SystemController` (`src/server/api/v1/controllers/system.controller.ts`)
- **`getInfo(req, res, next)`**: Returns platform branding, backend service name, environment, Node.js version, and memory usage.
- **`getOpenApiSpec(req, res, next)`**: Exposes the complete OpenAPI 3.1 specification either wrapped in canonical JSON or as raw JSON (`?format=json`).
- **`validateEcho(req, res, next)`**: Validates request body against strict Zod schema, processes payload via `systemService`, and returns validated response.
- **`adminOnlyDemo(req, res, next)`**: Protected by `requireAdmin()` middleware, proving strict role boundary enforcement.

---

## 5. 404 Route Not Found Handling

Unmatched endpoints and unsupported HTTP methods are trapped by a terminal catch-all handler mounted after all route registrations:

```typescript
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested endpoint '${req.method} ${req.originalUrl}' does not exist on this server.`,
    },
    meta: {
      requestId: req.id || 'unknown',
      timestamp: new Date().toISOString(),
    },
  });
});
```

---

## 6. Verification Results

In `src/test/api/backend-core-api.integration.test.ts`:
- All `/api/v1` routes responded with correct HTTP status codes and headers.
- Undefined endpoints returned standardized 404 `ROUTE_NOT_FOUND` JSON.
- Method mismatches (e.g. `POST /api/v1/health/live`) were cleanly rejected with 404.
- Controllers demonstrated zero leaked database credentials or internal stack traces.
