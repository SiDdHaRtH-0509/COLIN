# COLIN — DATABASE HEALTH AND ERROR HANDLING REPORT

**Phase:** Phase 4A.2.2.2 — Backend Database Connectivity & ORM Integration  
**Components:** `src/server/database/health.ts`, `src/server/database/errors.ts`  
**Observability Standard:** Production Readiness Probe & Domain Error Mapping  
**Status:** FULL PASS  

---

## 1. Database Health Check Architecture

The health subsystem in `src/server/database/health.ts` provides a structured observability probe for backend liveness and readiness monitoring. Designed for integration with Kubernetes readiness probes or cloud monitoring endpoints, it verifies end-to-end database connectivity across both runtime roles while ensuring that sensitive credentials are never exposed in JSON output.

### 1.1 Health Probe Structure

```typescript
export interface DatabaseHealthReport {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  isAlive: boolean;
  isReady: boolean;
  timestamp: string;
  roles: {
    appRuntime: {
      role: 'colin_app_runtime';
      status: 'CONNECTED' | 'ERROR';
      latencyMs?: number;
      error?: string;
    };
    adminRuntime: {
      role: 'colin_admin_runtime';
      status: 'CONNECTED' | 'ERROR';
      latencyMs?: number;
      error?: string;
    };
  };
  metrics: {
    totalRoundTripMs: number;
    configuredPoolMax: number;
  };
}
```

### 1.2 Evaluation Rules
- **`isAlive`**: Evaluates to `true` when the backend process and health module are operational.
- **`isReady`**: Evaluates to `true` only when BOTH `colin_app_runtime` and `colin_admin_runtime` successfully complete active ping queries (`SELECT 1 AS ready;`).
- **Composite Status**:
  - `HEALTHY`: Both roles connected.
  - `DEGRADED`: One role connected, one failing.
  - `UNHEALTHY`: Both roles failing.

---

## 2. Centralized Error Translation Architecture

Raw Prisma and PostgreSQL engine errors contain low-level schema identifiers, SQL state codes, and query text that must never be exposed to frontend clients. 

Located in `src/server/database/errors.ts`, `translateDatabaseError()` inspects incoming exceptions and translates them into strongly typed domain errors with assigned HTTP status codes.

### 2.1 Complete Error Mapping Matrix

| Original Error Source | Pattern / Code | Domain Exception Class | HTTP Status | Domain Error Code |
| :--- | :--- | :--- | :--- | :--- |
| Prisma Client | `P2002` | `UniqueConstraintViolationError` | `409 Conflict` | `UNIQUE_CONSTRAINT_VIOLATION` |
| Prisma Client | `P2003` | `ForeignKeyViolationError` | `400 Bad Request` | `FOREIGN_KEY_VIOLATION` |
| Prisma Client | `P2025` | `RecordNotFoundError` | `404 Not Found` | `RECORD_NOT_FOUND` |
| Prisma Client | `P2028`, `P2034` | `TransactionConflictError` | `409 Conflict` | `TRANSACTION_CONFLICT` |
| Prisma Client | `P2024` | `DatabaseUnavailableError` | `503 Service Unavailable` | `DATABASE_UNAVAILABLE` |
| PostgreSQL Engine | `42501` / `permission denied` | `DatabaseAuthorizationError` | `403 Forbidden` | `DATABASE_AUTHORIZATION_DENIED` |
| PostgreSQL Trigger | `COLIN Constraint Violation` | `ValidationConstraintError` | `422 Unprocessable` | `VALIDATION_CONSTRAINT_VIOLATION` |
| PostgreSQL Trigger | `Accounting Invariant Violation` | `ValidationConstraintError` | `422 Unprocessable` | `VALIDATION_CONSTRAINT_VIOLATION` |
| PostgreSQL Trigger | `Cross-Property Violation` | `ValidationConstraintError` | `422 Unprocessable` | `VALIDATION_CONSTRAINT_VIOLATION` |
| PostgreSQL Trigger | `Student Mismatch` / `Bed Mismatch` | `ValidationConstraintError` | `422 Unprocessable` | `VALIDATION_CONSTRAINT_VIOLATION` |
| PostgreSQL Trigger | `Audit Immutability Violation` | `ValidationConstraintError` | `422 Unprocessable` | `VALIDATION_CONSTRAINT_VIOLATION` |
| PostgreSQL Engine | `23505` / `duplicate key value` | `UniqueConstraintViolationError` | `409 Conflict` | `UNIQUE_CONSTRAINT_VIOLATION` |
| PostgreSQL Engine | `23503` / `foreign key` | `ForeignKeyViolationError` | `400 Bad Request` | `FOREIGN_KEY_VIOLATION` |
| PostgreSQL Engine | `23514` / `check constraint` | `ValidationConstraintError` | `422 Unprocessable` | `VALIDATION_CONSTRAINT_VIOLATION` |
| System / Network | `ECONNREFUSED`, `EACCES` | `DatabaseUnavailableError` | `503 Service Unavailable` | `DATABASE_UNAVAILABLE` |
| Unclassified | Any other unexpected error | `DatabaseError` | `500 Internal Error` | `INTERNAL_DATABASE_ERROR` |

---

## 3. Live Verification & Security Audit

In `src/test/database/backend-orm-integration.test.ts`:
1. **Health Report Probe**:
   - Status returned: `HEALTHY`.
   - `isAlive`: `true`, `isReady`: `true`.
   - Latencies recorded: `appRuntime` ~4ms, `adminRuntime` ~4ms.
   - Zero passwords in output.
2. **Error Translation Verification**:
   - Prisma `P2002`, `P2003`, `P2025`, `P2024`, `P2028` synthetic errors translated to exact domain classes and status codes.
   - PostgreSQL trigger exceptions (`enforce_property_photo_limit`, `validate_ledger_transaction_balance`) translated to `ValidationConstraintError`.
   - PostgreSQL permission denied error on `admin_audit_logs` translated to `DatabaseAuthorizationError`.

The health monitoring and error translation infrastructure is certified production-ready.
