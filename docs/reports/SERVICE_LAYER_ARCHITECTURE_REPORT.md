# COLIN — SERVICE LAYER ARCHITECTURE REPORT

**Phase:** Phase 4A.2.2.3 — Backend Core Service & API Architecture  
**Component Directory:** `src/server/services/`  
**Pattern:** Service-Oriented Business Logic Layer  
**Status:** FULL PASS  

---

## 1. Architectural Role & Layered Hierarchy

The Service Layer coordinates business workflows, multi-repository persistence operations, and transaction boundaries. It resides cleanly between HTTP controllers and the database repository layer:

```
[ HTTP Request ]
       │
       ▼
[ Middleware Pipeline ] (RequestId, Security, CORS, Parsers, AuthContext, ValidateRequest)
       │
       ▼
[ Controllers ] (Read validated input, context resolution, call service, format response)
       │
       ▼
[ Services ] (Business rules, workflow coordination, transaction orchestration)
       │
       ▼
[ Repositories ] (Data access, relational queries, constraint enforcement)
       │
       ▼
[ Central Database ] (PostgreSQL 18.4 Engine via PrismaClient)
```

---

## 2. Design Principles & Anti-Patterns Avoided

### 2.1 Principles
1. **Thin Controllers**: Controllers never contain business logic, SQL queries, or data transformation algorithms. They only translate HTTP requests into service calls and service responses into HTTP responses.
2. **Transaction Orchestration**: Multi-repository operations (e.g. reserving a bed and creating the corresponding ledger transaction) are coordinated in services using `executeTransaction<T>()`.
3. **Testability**: Services are structured as classes with decoupled dependencies, allowing unit tests to instantiate them directly or inject mock repositories if necessary.

### 2.2 Anti-Patterns Avoided
- **No Heavyweight IoC Containers**: Avoided NestJS or complex reflection-based dependency injection containers, which introduce massive startup overhead and obscure execution flow.
- **No Redundant CRUD Services**: Avoided generating 54 boilerplate services for all Prisma models. Services are created only when business domain logic justifies their existence.
- **No Database Leakage into Services**: Services interact with data solely through domain repositories and transaction runners, never by raw Prisma queries.

---

## 3. Representative Services Implemented

### 3.1 `HealthService` (`src/server/services/HealthService.ts`)
- **Purpose**: Evaluates application and database operational readiness.
- **Methods**:
  - `getLiveness()`: Returns status `UP`, uptime in seconds, and ISO timestamp.
  - `getReadiness()`: Calls `checkDatabaseHealth()` from `src/server/database/health.ts`. Verifies that both `colin_app_runtime` and `colin_admin_runtime` are connected and healthy.
- **Return Type**: `ReadinessResult` containing composite readiness boolean and detailed database role health.

### 3.2 `SystemService` (`src/server/services/SystemService.ts`)
- **Purpose**: Exposes platform metadata, versioning, runtime performance indicators, and OpenAPI specification.
- **Methods**:
  - `getSystemInfo()`: Computes memory footprint (`rss`, `heapTotal`, `heapUsed` in MB), Node.js version, and environment.
  - `getOpenApiDocument()`: Returns the complete OpenAPI 3.1 specification for `/api/v1`.
  - `processEchoTest()`: Illustrates service-level data processing following Zod schema validation.

---

## 4. Verification Status

All services were verified in `src/test/api/backend-core-api.integration.test.ts`:
- Services executed cleanly in under 5ms.
- Memory statistics reflected active Node.js heap allocations.
- Real database readiness probes were executed and reported status `READY`.
