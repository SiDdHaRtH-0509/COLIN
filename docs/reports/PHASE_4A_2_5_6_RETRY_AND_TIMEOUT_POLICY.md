# COLIN — Phase 4A.2.5.6: Retry & Timeout Policy Specification

**Project:** COLIN — Campus Living Verified  
**Parent Phase:** Phase 4A.2.5 — External Services & Infrastructure Integration  
**Sub-Phase:** Phase 4A.2.5.6 — Integration Reliability & Failure Handling  
**Branch:** `phase-4a-2-5-6-integration-reliability`  
**Baseline Commit:** `4546377`  
**Author:** Site Reliability Engineer & Principal API Architect  

---

## 1. Timeout & Deadline Management

### 1.1 Timeout Matrix & Defaults

| Operation Type | Provider / Subsystem | Default Timeout | Timeout Mechanism | Error Thrown |
|---|---|:---:|---|---|
| **Forward Geocoding** | Google Maps | 5,000ms | `AbortSignal.timeout(5000)` | `GeolocationProviderError` (504) |
| **Reverse Geocoding** | Google Maps | 5,000ms | `AbortSignal.timeout(5000)` | `GeolocationProviderError` (504) |
| **Places Autocomplete** | Google Maps | 5,000ms | `AbortSignal.timeout(5000)` | `GeolocationProviderError` (504) |
| **S3 PutObject** | AWS S3 / R2 | 10,000ms | `withTimeout(10000)` | `StorageProviderError` (504) |
| **S3 DeleteObject** | AWS S3 / R2 | 10,000ms | `withTimeout(10000)` | `StorageProviderError` (504) |
| **SendGrid Mail Send** | SendGrid v3 | 5,000ms | `withTimeout(5000)` | `{ error: { code: 'SENDGRID_TIMEOUT' } }` |
| **Postmark Email Send** | Postmark Server API | 5,000ms | `withTimeout(5000)` | `{ error: { code: 'POSTMARK_TIMEOUT' } }` |
| **Redis Command** | Redis 7 | 3,000ms | `commandTimeoutMs: 3000` | `RedisTimeoutError` |
| **Database Transaction** | PostgreSQL 18.4 | 10,000ms | Prisma `$transaction(timeout: 10000)` | `DatabaseUnavailableError` |

### 1.2 Operation Deadline Propagation
When multiple retries or sequential tasks take place, `OperationDeadline` ensures that the total elapsed time across all attempts does not exceed an absolute operational budget:
```typescript
const deadline = new OperationDeadline(totalBudgetMs, parentSignal);
// Every attempt computes: delayMs = Math.min(delayMs, deadline.remainingMs);
```

---

## 2. Retry Policies & Exponential Backoff

### 2.1 Backoff Mathematical Formulation
The retry engine (`src/server/reliability/retry.ts`) applies exponential backoff with randomized full jitter to prevent the "thundering herd" problem:

$$\text{delay}_{\text{exponential}} = \text{baseDelayMs} \times 2^{\text{attempt} - 1}$$
$$\text{delay}_{\text{bounded}} = \min(\text{maxDelayMs}, \text{delay}_{\text{exponential}})$$
$$\text{delay}_{\text{actual}} = \text{random}(0, \text{delay}_{\text{bounded}})$$

### 2.2 Respect for `Retry-After` Headers
When an external API returns HTTP 429 or 503 accompanied by a `Retry-After` header:
- **Integer Seconds:** Parsed directly (e.g. `Retry-After: 120` $\rightarrow 120,000\text{ms}$).
- **HTTP Date:** Parsed via `Date.parse()` and converted to delta ms against `Date.now()`.
The retry backoff adopts $\max(\text{delay}_{\text{actual}}, \text{delay}_{\text{Retry-After}})$, capped by remaining operation deadline.

---

## 3. Strict Retry Classification

To prevent request amplification and infinite retry loops, errors are classified into retryable and non-retryable categories:

### 3.1 Retryable Errors (Eligible for Automatic Retry)
- **HTTP 429:** Rate limited / quota exceeded.
- **HTTP 502, 503, 504:** Upstream gateway and temporary service outages.
- **Network Interruptions:** `ECONNRESET`, `ECONNREFUSED`, `ETIMEDOUT`, `EAI_AGAIN`, socket hangup.
- **Database Concurrency Conflicts:** PostgreSQL transaction conflict (`P2034`), deadlock detected (`40P01`), serialization failure (`40001`).

### 3.2 Non-Retryable Errors (Fail-Fast Immediately)
- **HTTP 400:** Bad Request / malformed payload.
- **HTTP 401 / 403:** Invalid API keys, unauthorized tokens, expired credentials.
- **HTTP 404:** Resource not found (e.g. Google Maps `ZERO_RESULTS`).
- **HTTP 422:** Validation constraint errors.
- **Database Integrity Violations:** Unique constraint (`23505`), foreign key violation (`23503`), check constraint (`23514`), append-only immutability violation.
- **Circuit Breaker Open:** Fast-fail without dispatching network calls.
