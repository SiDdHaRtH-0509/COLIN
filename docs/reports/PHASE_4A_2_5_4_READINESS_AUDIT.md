# COLIN — Phase 4A.2.5.4: Infrastructure Readiness Audit

**Project:** COLIN — Campus Living Verified  
**Parent Phase:** Phase 4A.2.5 — External Services & Infrastructure Integration  
**Sub-Phase:** Phase 4A.2.5.4 — Redis Distributed Rate Limiting Infrastructure  
**Feature Branch:** `phase-4a-2-5-4-redis-rate-limiting`  
**Baseline Commit:** `68260fe`  
**Author:** Principal Backend & Redis Infrastructure Engineer  

---

## 1. Executive Summary & Verification of Baseline

Prior to beginning Phase 4A.2.5.4, the working tree and repository history were verified:
1. **Repository Working Tree:** Verified clean with zero uncommitted changes.
2. **Current Baseline Commit:** `68260fe` (`feat(email): reconcile test inventory, enforce append-only delivery events, audit key management, and verify worker resilience`).
3. **Audit of Previous Phase 4A.2.5.3 Findings:**
   - *Finding 1 (Encryption-Key Separation & Dual-Key Rotation):* Verified resolved in `src/server/email/email.crypto.ts` with `getPrimaryEncryptionKey()`, `getFallbackEncryptionKey()`, production enforcement, and automated tests.
   - *Finding 2 (Delivery-Event Immutability):* Verified resolved in `COLIN_CUSTOM_POSTGRESQL_CONSTRAINTS.sql` via role permission revocation (`DELETE`, `TRUNCATE`, core `UPDATE`) and row-level immutability trigger `prevent_delivery_event_mutation()`.
   - *Finding 3 (Worker Crash Recovery):* Verified resolved in `src/server/email/outbox/EmailWorker.ts` with CTE-materialized batch claiming (`WITH batch AS (...) UPDATE ... FROM batch WHERE o.id = batch.id FOR UPDATE SKIP LOCKED`) and automated resilience tests.
4. **Platform Test Baseline:** All 32 platform test files and 571 tests are passing with zero regressions on live PostgreSQL 18.

---

## 2. Current Rate Limiter Architecture & Identified Vulnerabilities

### 2.1 Existing In-Memory Implementation
The existing rate limiter is located at `src/server/middleware/rateLimiter.ts`:
- **State Storage:** In-memory JavaScript `Map<string, RateLimitRecord>` where `RateLimitRecord = { timestamps: number[] }`.
- **Limiter Instances:**
  - `authSensitiveRateLimiter`: 10 requests / 15 minutes (`/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/admin/login`).
  - `passwordResetRateLimiter`: 5 requests / 15 minutes (`/api/v1/auth/password/forgot`, `/api/v1/auth/password/reset`).

### 2.2 Critical Limitations & Architectural Flaws

| Vulnerability / Limitation | Impact | Severity | Proposed Phase 4A.2.5.4 Solution |
|---|---|---|---|
| **No Horizontal Scalability** | Each backend container/process maintains its own separate `Map`. An attacker can multiply brute-force attempts by the number of active cluster instances ($N \times 10$). | **CRITICAL** | Redis-backed shared centralized counters using atomic Lua scripts. |
| **Naive IP Extraction & Spoofing** | Extracts IP as `req.headers['x-forwarded-for']?.split(',')[0]`. An attacker can spoof arbitrary client IPs via header injection to bypass limits trivially. | **HIGH** | Trusted proxy validation: inspect `req.socket.remoteAddress` unless proxy peer is explicitly listed in `TRUSTED_PROXIES`. |
| **Memory Leak in In-Memory Map** | Keys are stored indefinitely in the JavaScript heap; keys are only cleaned when evaluated, risking memory bloat under distributed port scans. | **MEDIUM** | Redis keys configured with TTL expiration (`EXPIRE`), automatically purged by Redis engine. |
| **Fail-Open by Default on Restart** | If a backend container crashes or restarts, all rate-limit counters are reset to zero. | **MEDIUM** | Redis persistence (RDB/AOF) decouples rate-limit state from backend process lifecycles. |
| **No Layered Identity Protection** | Rate limiting is purely IP-based; a distributed botnet with rotating proxies can brute force a single target student account. | **HIGH** | Dual-layered rate limiting: IP rate limiting + HMAC-hashed account identifier limiting (`hmac-sha256(secret, email)`). |

---

## 3. Technology & Dependency Selection Rationale

### 3.1 Redis Client: `ioredis` vs `redis` (node-redis)
`ioredis` (version 6.0.0) was selected for the following architectural reasons:
1. **Native Lua Script Management:** Built-in `defineCommand()` pre-loads Lua scripts and automatically executes via `EVALSHA` with transparent fallback to `EVAL` upon cache miss.
2. **Deterministic Connection Lifecycle:** Provides granular events (`connect`, `ready`, `error`, `close`, `reconnecting`, `end`) essential for health probes and graceful degradation.
3. **Configurable Reconnection Strategy:** Supports exponential backoff with jitter on reconnect attempts, preventing reconnect storms against Redis during network partitions.
4. **Command & Connection Timeouts:** Granular `connectTimeout` and `commandTimeout` settings prevent hung Express requests when Redis latency degrades.
5. **Production Provenance:** Industry-standard driver with native TypeScript types and zero native C++ binding build requirements.

### 3.2 Rate-Limiting Algorithm Selection: Sliding-Window Log via Atomic Lua
We evaluated three algorithms:
1. **Fixed Window Counter:**
   - *Pros:* Simple (`INCR` + `EXPIRE`).
   - *Cons:* Vulnerable to 2x boundary traffic bursts at window boundaries (e.g. 10 requests at 14:59 and 10 at 15:01).
2. **Token Bucket / GCRA (Leaky Bucket):**
   - *Pros:* Smooths request rates over time.
   - *Cons:* Does not match COLIN's existing contract of allowing bursts up to 10 requests immediately within 15 minutes followed by lock out.
3. **Sliding-Window Counter via Sorted Set (`ZSET`):**
   - *Selection:* **SELECTED**.
   - Uses a Redis sorted set per client/policy where score and member are the request timestamp.
   - Atomic Lua script removes elements older than `now - windowMs`, checks cardinality against `maxRequests`, and conditionally adds the current timestamp with an atomic `EXPIRE`.
   - Guarantees strict 100% adherence to existing policy contracts across all instances.

---

## 4. Proposed Architecture & Module Structure

```
src/server/redis/
├── redis.types.ts          # Type definitions, options, and rate-limit result DTOs
├── redis.errors.ts         # Standardized error hierarchy (RedisConnectionError, etc.)
├── redis.config.ts         # Zod-validated environment configuration & secret redaction
├── redis.client.ts         # Singleton ioredis client with retryStrategy & lifecycle events
├── redis.health.ts         # Liveness, readiness, latency probes, and metrics
├── redis.lifecycle.ts      # Server startup initialization and graceful shutdown
└── index.ts                # Central barrel exports

src/server/middleware/
├── distributedRateLimiter.ts # Redis-backed rate limiter middleware & factory
└── trustedProxy.ts         # Secure client IP extraction & anti-spoofing logic
```

---

## 5. Security & Fail-Mode Architecture

### 5.1 Fail-Mode Policy
- **Authentication Endpoints:** **FAIL-CLOSED** (`RATE_LIMIT_FAIL_MODE=closed`). If Redis is unavailable or times out, sensitive endpoints (`/login`, `/register`, `/password/reset`) reject requests with HTTP 429/503 to prevent unthrottled brute-force attacks during an outage.
- **Non-Sensitive Endpoints:** Fail-open can be selectively allowed for non-sensitive public discovery endpoints if configured.

### 5.2 Secret Protection
- Account identifiers (e.g. student email addresses) are hashed using `HMAC-SHA-256` with a dedicated secret (`RATE_LIMIT_IDENTITY_HMAC_SECRET`).
- Redis connection strings, passwords, and tokens are never printed to console or application logs (`redactRedisConfig()`).

---

## 6. Baseline Test Status

- **Total Test Files:** 32 test files
- **Total Existing Tests:** 571 tests
- **Baseline Passing:** 571 passed (100%), 0 failures
- **Status:** READY TO PROCEED WITH IMPLEMENTATION.
