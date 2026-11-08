# COLIN — Phase 4A.2.5.6: Circuit Breaker Architecture & Isolation Report

**Project:** COLIN — Campus Living Verified  
**Parent Phase:** Phase 4A.2.5 — External Services & Infrastructure Integration  
**Sub-Phase:** Phase 4A.2.5.6 — Integration Reliability & Failure Handling  
**Branch:** `phase-4a-2-5-6-integration-reliability`  
**Baseline Commit:** `4546377`  
**Author:** Distributed Systems Architect & Lead Reliability Engineer  

---

## 1. Executive Summary

To protect COLIN from cascading failures and excessive downstream latency during third-party SaaS disruptions, a zero-dependency, lightweight, in-memory **Circuit Breaker** pattern was implemented in `src/server/reliability/circuitBreaker.ts`.

The architecture enforces strict **provider-level isolation**: each external dependency operates an isolated circuit breaker instance. An outage in Google Maps never impacts Cloud Storage, SendGrid, or Postmark.

---

## 2. State Machine Specification

```
         +---------------------------------------+
         |                                       |
         v                                       |
    +----------+   failure count >= threshold  +------+
    |  CLOSED  | ----------------------------> | OPEN |
    +----------+                               +------+
         ^                                       |
         | probe success          open duration  |
         |                        elapsed        |
         |                                       v
         |                             +-----------+
         +---------------------------- | HALF-OPEN |
                  probe failure        +-----------+
                        |                    ^
                        +--------------------+ (re-opens immediately)
```

### 2.1 State Definitions
1. **`CLOSED` (Normal Operation):**
   - Outbound requests pass through unimpeded.
   - Successful calls reset consecutive failure counter to 0.
   - Failures increment consecutive failure counter.
   - If consecutive failures reach `failureThreshold`, state transitions to `OPEN`.
2. **`OPEN` (Fast-Fail Protection):**
   - Requests are intercepted immediately and rejected with `IntegrationCircuitOpenError` (HTTP 503).
   - Zero network calls are dispatched to the failing provider.
   - After `openDurationMs` has elapsed, the next incoming request transitions the circuit to `HALF-OPEN`.
3. **`HALF-OPEN` (Canary Recovery Probe):**
   - Up to `halfOpenProbeLimit` (default 1) probe request is permitted through to the external provider.
   - Additional concurrent requests during probing are rejected fast.
   - **Probe Success:** Circuit recovers immediately to `CLOSED`; failure counters reset to 0.
   - **Probe Failure:** Circuit immediately returns to `OPEN` for another full `openDurationMs` window.

---

## 3. Provider Configuration & Isolation Matrix (Gate F08)

| Circuit Breaker | Targeted Provider | Failure Threshold | Open Duration | Probe Limit | Observable Metrics |
|---|---|:---:|:---:|:---:|---|
| **`google-maps`** | Google Geocoding & Places APIs | 3 | 15,000ms | 1 | Total failures, rejections, state transitions |
| **`s3-storage`** | AWS S3 / Cloudflare R2 | 3 | 15,000ms | 1 | Total failures, rejections, state transitions |
| **`sendgrid`** | SendGrid v3 Mail Send API | 3 | 20,000ms | 1 | Total failures, rejections, state transitions |
| **`postmark`** | Postmark Server API | 3 | 20,000ms | 1 | Total failures, rejections, state transitions |

### Isolation Verification:
In automated test `src/test/reliability/circuit-breaker.test.ts`:
- Forcefully tripping the `google-maps` circuit breaker to `OPEN` was proven to leave `s3-storage`, `sendgrid`, and `postmark` circuit breakers in `CLOSED` state with 100% operational availability.

---

## 4. Observable State Metrics

Each circuit breaker exposes real-time telemetry via `breaker.getMetrics()`:
```typescript
interface CircuitBreakerMetrics {
  provider: IntegrationProviderName;
  state: 'CLOSED' | 'OPEN' | 'HALF-OPEN';
  consecutiveFailures: number;
  totalSuccesses: number;
  totalFailures: number;
  totalRejected: number;
  lastStateChange: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
}
```
State transitions trigger `onStateChange(oldState, newState, provider)` hooks which emit structured JSON audit logs via `ReliabilityLogger`.
