# COLIN — Phase 4A.2.5.6: Integration Reliability Architecture

**Project:** COLIN — Campus Living Verified  
**Parent Phase:** Phase 4A.2.5 — External Services & Infrastructure Integration  
**Sub-Phase:** Phase 4A.2.5.6 — Integration Reliability & Failure Handling  
**Branch:** `phase-4a-2-5-6-integration-reliability`  
**Baseline Commit:** `4546377`  
**Author:** Distributed Systems Architect & Principal Reliability Engineer  

---

## 1. Architectural Philosophy & Design Principles

The COLIN platform connects to diverse external services and distributed infrastructure dependencies:
1. **Google Maps Platform** (Geocoding & Places APIs)
2. **Cloud Storage** (AWS S3 / Cloudflare R2 / Local)
3. **Transactional Email** (SendGrid v3 / Postmark)
4. **Distributed Cache & Rate Limiting** (Redis 7 via ioredis)
5. **Relational Database** (PostgreSQL 18.4 via Prisma 5)

Prior to Phase 4A.2.5.6, failure handling was fragmented across provider adapters. Phase 4A.2.5.6 establishes a unified, multi-layered reliability architecture governed by five strict distributed systems principles:

1. **Explicit Bounded Deadlines:** No network operation may hang indefinitely. Every outbound request is constrained by strict connection timeouts, request timeouts, and overall operation deadlines.
2. **Strict Retry Classification:** Retries are strictly limited to idempotent, transient failure modes (HTTP 429, 502, 503, 504, connection reset, socket timeout). Non-retryable client errors (400, 401, 403, 404, 422) and validation/immutability constraints fail fast without request amplification.
3. **Provider-Isolated Circuit Breakers:** Cascading failures in one external provider (e.g. Google Maps outage) must never impact or degrade unrelated subsystems (e.g. cloud image storage or email delivery). Each provider maintains an independent, observable circuit breaker.
4. **Honest Delivery Semantics & Compensating Actions:** Distributed atomicity across heterogeneous boundaries is mathematically impossible without distributed transactions (2PC). The system formally adopts **at-least-once delivery semantics** for asynchronous email dispatches and applies explicit compensating rollbacks for multi-phase operations (e.g. S3 photo upload rollback upon PostgreSQL failure).
5. **Universal Secret Redaction:** All error messages, stack traces, and structured log events guarantee zero credential leakage into logs or telemetry.

---

## 2. Component Hierarchy & Module Structure

The centralized reliability subsystem is implemented in `src/server/reliability/`:

```
src/server/reliability/
├── errors.ts           # Standardized error taxonomy, HTTP status codes, retryability predicates
├── timeout.ts          # withTimeout(), OperationDeadline, AbortSignal propagation
├── retry.ts            # withRetry(), exponential backoff, randomized full jitter, Retry-After parsing
├── circuitBreaker.ts   # CircuitBreaker state machine (CLOSED, OPEN, HALF-OPEN) & provider registry
├── logger.ts           # ReliabilityLogger: structured JSON logs with correlation IDs & secret masking
└── index.ts            # Unified barrel exports
```

---

## 3. Integration Error Taxonomy

All integration errors extend `IntegrationError` (which automatically sanitizes credentials and URLs via `redactSecrets()`):

| Error Class | Code | HTTP Status | Retryable? | Primary Triggers |
|---|---|:---:|:---:|---|
| `IntegrationTimeoutError` | `INTEGRATION_TIMEOUT` | 504 | **YES** | Request duration exceeds timeout limit or deadline expires |
| `IntegrationConnectionError` | `INTEGRATION_CONNECTION_FAILURE` | 503 | **YES** | `ECONNRESET`, `ECONNREFUSED`, `ETIMEDOUT`, DNS lookup failure |
| `IntegrationRateLimitError` | `INTEGRATION_RATE_LIMIT` | 429 | **YES** | HTTP 429 response, `OVER_QUERY_LIMIT`, carrying `retryAfterSeconds` |
| `IntegrationCircuitOpenError` | `INTEGRATION_CIRCUIT_OPEN` | 503 | **NO** | Fast-fail when provider circuit is in `OPEN` state |
| `IntegrationAuthenticationError` | `INTEGRATION_AUTHENTICATION_FAILURE` | 401 / 403 | **NO** | Missing, malformed, or rejected API key / bearer token |
| `IntegrationProviderError` | `INTEGRATION_PROVIDER_<STATUS>` | 500 – 504 | Conditional | Upstream server errors (500, 502, 503, 504) |

---

## 4. Provider Reliability Configurations

| Provider | Circuit Breaker | Failure Threshold | Open Duration | Probe Limit | Request Timeout | Retry Policy |
|---|---|:---:|:---:|:---:|:---:|---|
| **Google Maps** | `google-maps` | 3 failures | 15,000ms | 1 probe | 5,000ms | Max 2 attempts, 200ms base delay, full jitter |
| **S3 Storage** | `s3-storage` | 3 failures | 15,000ms | 1 probe | 10,000ms | Max 3 attempts on compensating delete |
| **SendGrid** | `sendgrid` | 3 failures | 20,000ms | 1 probe | 5,000ms | Background outbox retry (1–5 attempts, backoff up to 8m) |
| **Postmark** | `postmark` | 3 failures | 20,000ms | 1 probe | 5,000ms | Background outbox retry (1–5 attempts, backoff up to 8m) |
| **Redis** | `redis` | N/A | N/A | N/A | 3,000ms command | ioredis exponential backoff (max 3 retries); fail-closed for auth |
| **PostgreSQL** | `postgresql` | N/A | N/A | N/A | 10,000ms tx | Max 3 retries on transient deadlock (`40P01`) / conflict (`P2034`) |

---

## 5. Graceful Degradation Strategies

1. **Google Maps Unavailable / Circuit OPEN:**
   - Geocoding and reverse geocoding fall back to cached coordinates where legally permitted under Google Maps Platform §3.2.3(a) (up to 30 days).
   - If not cached, user requests fail gracefully with descriptive error without crashing unrelated listing search or authentication workflows.
2. **Cloud Storage Unavailable:**
   - Existing photo URLs remain viewable through public delivery URLs.
   - New photo uploads fail safely with descriptive `StorageProviderError`.
   - If S3 upload succeeds but database persistence fails, compensating cleanup runs with retry to prevent orphaned assets.
3. **Transactional Email Down:**
   - Email notifications remain safely queued in `email_outbox` in PostgreSQL.
   - Circuit breaker trips to OPEN; worker defers dispatch without dropping records or crashing.
   - Once provider recovers, worker resumes processing pending outbox records automatically.
4. **Redis Unavailable:**
   - Sensitive authentication rate limiting enforces `failMode: 'closed'`, rejecting unauthorized bursts.
   - Non-sensitive routes fail open or use local in-memory fallback for development environments.
