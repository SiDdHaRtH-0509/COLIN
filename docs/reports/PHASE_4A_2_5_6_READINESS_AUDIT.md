# COLIN — Phase 4A.2.5.6.0: Integration Reliability Readiness Audit

**Project:** COLIN — Campus Living Verified  
**Parent Phase:** Phase 4A.2.5 — External Services & Infrastructure Integration  
**Sub-Phase:** Phase 4A.2.5.6 — Integration Reliability & Failure Handling  
**Branch:** `phase-4a-2-5-6-integration-reliability`  
**Baseline Commit:** `4546377`  
**Author:** Principal Backend Reliability Engineer & SRE Auditor  

---

## 1. Executive Summary

As part of the initial readiness audit for Phase 4A.2.5.6, every external-service dependency and internal infrastructure boundary within COLIN was audited for:
- Request timeouts and deadline propagation.
- Error classification and translation.
- Safe vs. unsafe retry behavior.
- Duplicate operation risk.
- Circuit breaker protection and provider isolation.
- State reconciliation and compensating actions.
- Graceful degradation paths.

---

## 2. Integration Failure Handling Audit Matrix

| Integration | Current Failure Handling | Timeout | Retry | Recovery / Compensating Action | Audit Finding & Gap |
|---|---|---|---|---|---|
| **PostgreSQL 18.4** | `translateDatabaseError` maps Prisma/SQL errors to typed domain errors. Interactive transactions rollback on throw. | Interactive transactions: default `maxWait: 5s`, `timeout: 10s`. | No automatic retry on transaction serialization failures (`P2034` / `40001`) or deadlocks (`40P01`). | Graceful shutdown hooks registered on `SIGINT`/`SIGTERM`/`beforeExit`. | **Gap:** Lack of controlled retry for transient serialization/deadlock conflicts; connection pool exhaustion raises generic `DatabaseUnavailableError` without backoff. |
| **Redis 7** | ioredis error listeners, `failMode: 'closed'` for auth endpoints, Lua script atomic execution. | `connectTimeoutMs: 5s`, `commandTimeoutMs: 3s`. | ioredis built-in retry strategy (max 3 retries, exponential backoff with jitter up to 3s). | Fail-closed rejects auth traffic; connection state tracking (`CONNECTING`, `READY`, `RECONNECTING`, `ERROR`). | **Gap:** Transient command timeouts throw unhandled `RedisTimeoutError` in rate-limiter without localized circuit breaker; no health check endpoint exposing Redis circuit state. |
| **Google Maps** | `GoogleGeolocationProvider` catches fetch errors and maps HTTP >= 500 or status `OVER_QUERY_LIMIT` to `GeolocationProviderError(retryable=true)`. | `AbortSignal.timeout(5000)` on HTTP requests. | **None.** `LocationService` immediately bubbles provider errors without retry or backoff. | 24-hour in-memory cache for coordinates/addresses serves as temporary buffer; Place IDs stored permanently in DB. | **Gap:** No circuit breaker; downstream calls continue hammering Google API during outages; no retry on transient 429/503; error messages must guarantee key redaction. |
| **Cloud Storage (S3 / R2)** | `S3StorageProvider` catches AWS SDK errors and maps to `StorageProviderError`. `PropertyService` executes compensating delete on DB failure. | Default AWS SDK HTTP client timeout (~120s) without explicit tight request timeout. | **None** in provider layer. | Compensating cleanup: `PropertyService.uploadPhoto` deletes uploaded S3 master/thumbnail if PostgreSQL insert fails. | **Gap:** AWS SDK lacks explicit request/connect timeout bounding (could hang on slow connections); compensating deletes lack retry if S3 itself encounters a network blip; deletion is idempotent but lacks error classification. |
| **SendGrid** | `SendGridProvider` handles HTTP 202/200; classifies HTTP 429 / >=500 as retryable in `EmailSendResult`. | **None.** Default global `fetch()` without `AbortSignal.timeout()`. Can hang indefinitely if upstream hangs. | Worker retries based on `EmailRetryPolicy` (exponential backoff up to 5 attempts). | Webhook reconciliation updates orphaned `'SENDING'` records to `'DELIVERED'`; stale job sweep resets to `'FAILED'`. | **Gap:** Critical missing fetch timeout in provider adapter; no circuit breaker; lack of rate-limit backoff on 429; SendGrid metadata does not guarantee provider deduplication. |
| **Postmark** | `PostmarkProvider` handles HTTP 200 with `ErrorCode === 0`; maps errors to `EmailSendResult`. | **None.** Default global `fetch()` without `AbortSignal.timeout()`. Can hang indefinitely if upstream hangs. | Worker retries based on `EmailRetryPolicy` (exponential backoff up to 5 attempts). | Webhook reconciliation updates orphaned `'SENDING'` records; stale job sweep resets to `'FAILED'`. | **Gap:** Critical missing fetch timeout; no circuit breaker; lack of provider-side idempotency headers; worker operates under at-least-once delivery semantics. |

---

## 3. Detailed Architectural Findings

### 3.1 Finding R-01: Missing Request Timeouts in Email Providers
- **Observation:** Both `SendGridProvider.sendEmail` and `PostmarkProvider.sendEmail` invoke global `fetch(endpoint, options)` without an `AbortSignal`.
- **Impact:** An upstream network partition or slow HTTP response from SendGrid/Postmark can block the email worker thread indefinitely, consuming resources and starving other outbox items.
- **Remediation:** Implement explicit configurable request timeouts (default 5,000ms) with `AbortSignal.timeout()` in both email providers.

### 3.2 Finding R-02: Absence of Circuit Breakers Across External Dependencies
- **Observation:** If Google Maps, AWS S3, or SendGrid suffers a prolonged outage or severe rate limiting (HTTP 429 / 503), every incoming request continues attempting external network dispatches, adding latency and exacerbating provider quota exhaustion.
- **Impact:** Cascading latency spikes across user-facing endpoints.
- **Remediation:** Implement an isolated, in-memory, zero-dependency Circuit Breaker (`CircuitBreaker`) with states `CLOSED`, `OPEN`, `HALF-OPEN`, failure count thresholds, open-window TTLs, and per-provider instances (`google-maps`, `s3-storage`, `sendgrid`, `postmark`).

### 3.3 Finding R-03: Lack of Centralized Controlled Retry Mechanism
- **Observation:** While `EmailWorker` has an asynchronous outbox retry policy (`EmailRetryPolicy`), synchronous external calls (Google Geocoding, S3 signed operations, database transactions) lack a unified retry abstraction with exponential backoff, jitter, and classification.
- **Impact:** Transient network drops or brief 503s cause immediate user-visible failures.
- **Remediation:** Implement a centralized `withRetry()` utility that:
  1. Inspects error retryability (only transient network errors, HTTP 429, 502, 503, 504).
  2. Never retries non-retryable errors (400, 401, 403, 404, validation errors).
  3. Applies exponential backoff with full randomized jitter ($T = \min(\text{maxDelay}, \text{baseDelay} \times 2^{\text{attempt}} + \text{jitter})$).
  4. Respects `Retry-After` headers if returned by providers.
  5. Enforces total operation deadlines.

### 3.4 Finding R-04: Compensating Deletion Resilience in Photo Uploads
- **Observation:** In `PropertyService.uploadPhoto()`, if PostgreSQL persistence fails, compensating deletes are dispatched:
  `await storageProvider.delete(masterUpload.storageKey).catch(() => {});`
- **Impact:** If the delete fails due to a transient S3 network hiccup, the object is orphaned permanently in S3 without retry or alert.
- **Remediation:** Enhance compensating cleanup using `withRetry` (up to 3 attempts with backoff) and structured error logging.

### 3.5 Finding R-05: Database Transient Serialization & Deadlock Handling
- **Observation:** PostgreSQL interactive transactions in `executeTransaction()` catch Prisma errors and throw `translateDatabaseError(err)`. A `P2034` (transaction conflict) or deadlock error produces `TransactionConflictError`, but is not automatically retried at the transaction boundary.
- **Impact:** User requests fail on high concurrency even when a 50ms retry would succeed.
- **Remediation:** Add transaction-level safe retry options for read/write transactions subject to concurrency conflicts.

---

## 4. Readiness Audit Conclusion & Implementation Plan
The integration reliability posture requires five coordinated architectural additions:
1. **Centralized Error Hierarchy & Redaction:** Standardized `IntegrationError` classes with error codes, HTTP status, retryability flags, and guaranteed secret masking.
2. **Timeout & Deadline Manager:** Unified AbortController / deadline wrappers for all HTTP requests and async operations.
3. **Resilient Retry Engine:** `withRetry()` with exponential backoff, jitter, Retry-After support, and deadline enforcement.
4. **Provider-Isolated Circuit Breakers:** Independent state machines for each external SaaS provider.
5. **Compensating Action & Graceful Degradation Patterns:** Safe rollbacks, cached data fallback, and fault-injection test coverage.
