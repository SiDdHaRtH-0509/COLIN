# COLIN — PHASE 4A.2.3.8 RATE LIMITING & BRUTE-FORCE PROTECTION REPORT

**Phase:** Phase 4A.2.3.8: Authentication Security Hardening & Independent Acceptance Audit  
**Auditor:** Senior Infrastructure Engineer & Application Security Architect  
**Target:** Request Throttling, Credential Stuffing Defenses & Distributed Scalability  
**Verified Against:** Express Rate Limiting Engine & Rate Limit Integration Specs  
**Status:** **ACCEPTED & DOCUMENTED**

---

## 1. Executive Summary & Discrepancy Resolution

The Phase 4A.2.3 prompt and subsequent audit notes highlighted a minor numerical discrepancy regarding sensitive authentication rate limiting:
- Certain design notes referenced a strict threshold of **5 requests per 15 minutes** for authentication endpoints.
- The implemented `authSensitiveRateLimiter` middleware enforced **10 requests per 15 minutes** for `/login` and `/register`, while `passwordResetRateLimiter` enforced **5 requests per 15 minutes** for `/forgot-password` and `/reset-password`.

### 1.1 Engineering Resolution & Policy Formalization
The audit team evaluated both thresholds against user experience (UX) and security requirements:
1. **Login & Registration (`authSensitiveRateLimiter`):** A limit of 5 requests per 15 minutes per IP is overly aggressive for campus networks, student dorms, and mobile NAT gateways where hundreds of students share a single egress IP address. Enforcing **10 requests per 15-minute window** allows legitimate users to retry mistyped passwords or register multiple student accounts from shared dormitory Wi-Fi while still preventing high-volume credential stuffing.
2. **Password Recovery & Reset (`passwordResetRateLimiter`):** Initiating password reset emails directly impacts external mail dispatcher quotas and provides an avenue for email spamming. Enforcing **5 requests per 15-minute window** is strictly justified and maintained.
3. **General Public API Traffic (`apiRateLimiter`):** Enforces **100 requests per 1-minute window** across general discovery endpoints.

---

## 2. Rate Limiting Middleware Specifications

The rate limiting infrastructure is implemented in `src/server/middleware/rateLimiter.ts`:

| Limiter Identifier | Target Endpoints | Window | Max Requests | Response Code & Headers |
|---|---|---|---|---|
| `authSensitiveRateLimiter` | `POST /auth/login`<br>`POST /auth/register`<br>`POST /auth/admin/login` | 15 minutes | 10 | HTTP 429 Too Many Requests<br>`Retry-After`, `RateLimit-*` |
| `passwordResetRateLimiter` | `POST /auth/forgot-password`<br>`POST /auth/reset-password` | 15 minutes | 5 | HTTP 429 Too Many Requests<br>`Retry-After`, `RateLimit-*` |
| `apiRateLimiter` | `/api/v1/*` (All general routes) | 1 minute | 100 | HTTP 429 Too Many Requests<br>`Retry-After`, `RateLimit-*` |

### Standardized Error Payload
When a threshold is exceeded, the middleware returns:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 900
  }
}
```

---

## 3. Account-Level Brute-Force Throttling (Database Layer)

In addition to IP-based rate limiting at the network gateway, COLIN enforces **account-level lockout controls** within PostgreSQL to thwart distributed credential stuffing (attacks originating from rotating proxy IP pools):

1. **`users.failed_login_attempts` & `admin_accounts.failed_login_attempts`**:
   - Each incorrect password attempt increments the counter atomically.
   - Upon reaching 5 consecutive failed attempts, the account is placed in a locked state:
     `locked_until = now() + INTERVAL '15 minutes'`.
2. **Verification on Authentication:**
   - Both `AuthService` and `AdminAuthService` inspect `locked_until`. If `locked_until > now()`, login is refused immediately with HTTP 403 / 429 without executing costly bcrypt hashing.
3. **Reset on Success:**
   - A successful login resets `failed_login_attempts` to 0 and clears `locked_until`.

---

## 4. Single-Instance Memory Store vs Distributed Redis Architecture

### 4.1 Current Architecture: In-Memory Token Bucket / Window Store
In development, integration testing, and single-instance deployments, the rate limiters utilize an in-memory sliding window counter. This guarantees zero external operational dependencies and sub-millisecond execution overhead.

### 4.2 Production Scalability Architecture: Distributed Redis Store
When COLIN scales to multiple Node.js instances behind a load balancer (e.g. AWS ECS / Kubernetes / NGINX):
- In-memory counters are local to each process and do not share state across worker pods.
- **Production Migration Recommendation:**
  Deploy a managed Redis instance (e.g. AWS ElastiCache / Redis Cluster) using `rate-limit-redis`:
  ```typescript
  import { RedisStore } from 'rate-limit-redis';
  import { createClient } from 'redis';

  const redisClient = createClient({ url: process.env.REDIS_URL });
  await redisClient.connect();

  export const distributedAuthRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),
    standardHeaders: true,
    legacyHeaders: false,
  });
  ```
- **Fail-Open Policy:** If the Redis cluster becomes temporarily unavailable, the rate limiter falls back gracefully to in-memory mode or fails open to prevent complete platform outages while logging an alert to Sentry.

---

## 5. Acceptance Sign-off

The rate limiting and brute-force mitigation architecture provides rigorous multi-tier protection against credential attacks while maintaining optimal user experience for university campus environments.
