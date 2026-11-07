# COLIN — Phase 4A.2.5.4: Redis Architecture & Distributed Rate Limiting

**Project:** COLIN — Campus Living Verified  
**Parent Phase:** Phase 4A.2.5 — External Services & Infrastructure Integration  
**Sub-Phase:** Phase 4A.2.5.4 — Redis Distributed Rate Limiting Infrastructure  
**Branch:** `phase-4a-2-5-4-redis-rate-limiting`  
**Baseline Commit:** `68260fe`  
**Author:** Principal Backend & Redis Infrastructure Engineer  

---

## 1. Architectural Overview & System Design

Phase 4A.2.5.4 transforms COLIN's rate-limiting architecture from single-process in-memory counters to an enterprise-grade, horizontally scalable, distributed infrastructure backed by Redis.

```
+---------------------------------------------------------------------------------------------+
|                                    COLIN Application Tier                                   |
|                                                                                             |
|   +-----------------------+     +-----------------------+     +-------------------------+   |
|   |  Backend Instance 1   |     |  Backend Instance 2   |     |  Backend Instance N...  |   |
|   |  - TrustedProxy IP    |     |  - TrustedProxy IP    |     |  - TrustedProxy IP      |   |
|   |  - HMAC Account Hash  |     |  - HMAC Account Hash  |     |  - HMAC Account Hash    |   |
|   |  - Express 5 Pipeline |     |  - Express 5 Pipeline |     |  - Express 5 Pipeline   |   |
|   +-----------+-----------+     +-----------+-----------+     +------------+------------+   |
+---------------|-----------------------------|------------------------------|----------------+
                |                             |                              |
                +-----------------------------+------------------------------+
                                              |
                                              v (TCP / TLS with Connection Pool & Auto-Reconnect)
                        +---------------------------------------------+
                        |                 Redis 7.x                   |
                        |  - Key Prefix: "colin:"                     |
                        |  - Atomic Lua Sliding Window Engine         |
                        |  - ZSET: Score=Timestamp, Member=EntryId    |
                        |  - Auto-evict TTL: ceil(windowMs/1000) + 2  |
                        +---------------------------------------------+
```

---

## 2. Redis Client Infrastructure (`src/server/redis/redis.client.ts`)

### 2.1 Driver Selection & Version
- **Driver:** `ioredis@6.0.0`
- **Justification:** Native support for pre-registered Lua commands, robust connection event hooks (`connect`, `ready`, `error`, `close`, `reconnecting`, `end`), automatic exponential backoff with jitter, configurable per-command timeouts, and zero native build dependencies.

### 2.2 Client Configuration & Resiliency Parameters
```typescript
{
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'colin:',
  connectTimeout: 5000,        // 5s initial connection timeout
  commandTimeout: 2000,        // 2s per-command execution timeout
  maxRetriesPerRequest: 2,     // Limit in-flight command retry queuing
  lazyConnect: true,           // Explicit lifecycle control
  retryStrategy: (times) => {
    if (times > 5) return null; // Terminate after 5 attempts to avoid stampedes
    return Math.min(100 * Math.pow(2, times - 1) + Math.random() * 50, 3000);
  }
}
```

---

## 3. Atomic Sliding-Window Engine (`executeSlidingWindowLua`)

Rate limiting uses a Sorted Set (`ZSET`) where:
- **Key:** `rl:<policy_name>:<sanitized_client_ip>:<route_path>`
- **Score:** Floating/integer Unix millisecond timestamp (`now`)
- **Member:** Unique entry identifier (`${now}-${crypto.randomBytes(4).toString('hex')}`)

### 3.1 Lua Script Implementation
```lua
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local entryId = ARGV[4]

-- 1. Remove expired entries outside the sliding window
local clearBefore = now - windowMs
redis.call('ZREMRANGEBYSCORE', key, '-inf', clearBefore)

-- 2. Count active entries in current window
local currentCount = redis.call('ZCARD', key)

-- 3. Evaluate capacity
if currentCount < limit then
    redis.call('ZADD', key, now, entryId)
    local ttlSeconds = math.ceil(windowMs / 1000) + 2
    redis.call('EXPIRE', key, ttlSeconds)
    local remaining = limit - currentCount - 1
    return { 1, currentCount + 1, remaining, 0 }
else
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local resetMs = windowMs
    if #oldest > 0 then
        local oldestScore = tonumber(oldest[2])
        resetMs = math.max(0, oldestScore + windowMs - now)
    end
    local retryAfter = math.ceil(resetMs / 1000)
    if retryAfter < 1 then retryAfter = 1 end
    return { 0, currentCount, 0, retryAfter }
end
```

### 3.2 Atomicity & Concurrency Guarantees
Because Redis executes Lua scripts as atomic single-threaded operations:
1. No two requests can interleave between the `ZCARD` check and the `ZADD` write.
2. Race conditions under high concurrency are mathematically impossible.
3. Every node across the cluster observes the identical, exact global request count.

---

## 4. Key Namespacing & Identity Architecture

### 4.1 Key Structure
All keys conform to standard COLIN namespacing:
- **IP-Route Policy:** `colin:rl:<policy>:<sanitized_ip>:<route>`
  - Example: `colin:rl:auth_sensitive:192_168_1_50:_api_v1_auth_login`
- **Account Identity Policy:** `colin:rl:act:<hmac_hash>:<policy>`
  - Example: `colin:rl:act:7a1f592d...c309:auth_sensitive`

### 4.2 HMAC Account Privacy Protection
Account identifiers (email addresses) are transformed using `crypto.createHmac('sha256', secret)`:
- Plaintext emails are NEVER stored in Redis keys, values, or log statements.
- Key generation is deterministic, ensuring exact rate limiting while preserving GDPR and DPDP Act compliance.

---

## 5. Anti-Spoofing & Client IP Extraction (`src/server/middleware/trustedProxy.ts`)

A critical vulnerability in naive rate limiters is trusting the incoming `X-Forwarded-For` header. An attacker can supply arbitrary IP values (`X-Forwarded-For: 1.2.3.4`) to bypass IP limits.

**COLIN Anti-Spoofing Architecture:**
1. Inspect direct TCP socket remote address (`req.socket.remoteAddress`).
2. Verify if the direct peer is in the configured `TRUSTED_PROXIES` whitelist (`127.0.0.1`, `::1`, loopback/internal VPC load balancer).
3. **If peer is UNTRUSTED:** The `X-Forwarded-For` header is **COMPLETELY IGNORED**. The direct peer IP is used as the rate-limiting identity.
4. **If peer is TRUSTED:** The leftmost hop from `X-Forwarded-For` is safely extracted as the genuine client IP.

---

## 6. HTTP Response Headers Conformance

Every request handled by the rate limiter sets standardized RFC response headers:
- `RateLimit-Limit`: Maximum requests permitted within the sliding window.
- `RateLimit-Remaining`: Remaining request quota for the current window.
- `RateLimit-Reset`: Estimated seconds until quota renewal.
- `Retry-After`: Set on HTTP 429 status codes, indicating exact wait time in seconds.

---

## 7. Cluster Scalability Verification

Multi-instance testing confirmed that independent backend instances share a unified counter state. Requests routed through Node A and Node B contribute to the same atomic quota, guaranteeing cluster-wide protection against distributed brute-force attacks.
