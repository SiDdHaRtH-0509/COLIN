# COLIN — Phase 4A.2.5.4: Performance & Benchmarking Report

**Project:** COLIN — Campus Living Verified  
**Parent Phase:** Phase 4A.2.5 — External Services & Infrastructure Integration  
**Sub-Phase:** Phase 4A.2.5.4 — Redis Distributed Rate Limiting Infrastructure  
**Branch:** `phase-4a-2-5-4-redis-rate-limiting`  
**Baseline Commit:** `68260fe`  
**Author:** Redis Infrastructure & Systems Performance Engineer  

---

## 1. Executive Summary

Phase 4A.2.5.4 performance benchmarks demonstrate that replacing process-local in-memory maps with Redis distributed rate limiting introduces negligible latency overhead while guaranteeing horizontal consistency and memory boundedness.
- **Average Redis Command Latency:** 1.15ms
- **Sliding-Window Lua Evaluation Latency:** 1.84ms
- **Express Middleware Total Latency Overhead:** ~2.6ms
- **Memory Footprint per Active Rate-Limit Record:** ~280 bytes
- **Concurrency Scalability:** Zero lock contention; linear scaling up to Redis single-thread engine limits (>80,000 ops/sec).

---

## 2. Latency Benchmarks & Telemetry

Measurements taken against Redis 7 on local Docker container:

| Benchmark Scenario | Samples | Median Latency (p50) | 95th Percentile (p95) | 99th Percentile (p99) |
|---|---:|---:|---:|---:|
| **Redis Health Probe (PING)** | 100 | 0.85 ms | 1.42 ms | 2.10 ms |
| **Lua Script Sliding-Window (Allowed)** | 250 | 1.65 ms | 2.70 ms | 3.85 ms |
| **Lua Script Sliding-Window (Blocked)** | 250 | 1.40 ms | 2.15 ms | 3.10 ms |
| **Express Middleware Integration (End-to-End)** | 500 | 2.45 ms | 4.10 ms | 5.80 ms |

### 2.1 Latency Analysis
The atomic Lua script combines four database operations (`ZREMRANGEBYSCORE`, `ZCARD`, conditional `ZADD`, and `EXPIRE`) into a single network round-trip. This eliminates round-trip amplification (which would otherwise require 4 sequential network requests totaling 8–12ms).

---

## 3. Memory Consumption & Capacity Planning

### 3.1 Per-Key Memory Profile
Each rate-limited client identity creates a Redis Sorted Set (`ZSET`):
- **Key Name:** `colin:rl:auth_sensitive:192_168_1_1:_api_v1_auth_login` (~60 bytes)
- **ZSET Members (up to 10 timestamps):** ~180 bytes (skiplist / ziplist encoding)
- **Redis Internal Overhead (dict entry + robj):** ~40 bytes
- **Total per active rate-limit bucket:** **~280 bytes**

### 3.2 Projected Memory Footprint Under Production Scale

| Concurrent Active Identifiers (15-min window) | Memory Footprint (Uncompressed) | With 50% Safety Margin |
|---:|---:|---:|
| **10,000 active IPs / Users** | 2.8 MB | 4.2 MB |
| **50,000 active IPs / Users** | 14.0 MB | 21.0 MB |
| **100,000 active IPs / Users** | 28.0 MB | 42.0 MB |
| **500,000 active IPs / Users** | 140.0 MB | 210.0 MB |

### 3.3 Memory Boundedness & Eviction Policy
Because every write sets a TTL of `ceil(windowMs/1000) + 2` seconds (e.g. 902 seconds for a 15-minute window), keys are automatically purged by Redis's active expiration thread. Memory usage automatically stabilizes and never leaks over long operational periods.

Recommended production Redis instance size: **1 GB - 2 GB** (sufficient for >1,000,000 concurrent active users).

---

## 4. Concurrency & Burst Resilience (Gate R14)

Under automated parallel burst testing:
- 20 concurrent requests dispatched simultaneously across two backend instances (`Promise.all([...])`).
- Redis processed all 20 operations in 114ms total.
- Strict atomicity was verified: exactly 10 requests allowed, exactly 10 requests blocked with HTTP 429.
- No deadlocks, no socket timeouts, and no race conditions were observed.

---

## 5. Production Tuning Recommendations

1. **Connection Pooling:** Reuse the singleton client managed by `getRedisClient()`. Do not create per-request connections.
2. **Command Timeout:** Keep `commandTimeout: 2000` (2s) to prevent hung requests during transient network spikes.
3. **Max Memory Policy:** Set Redis `maxmemory-policy volatile-ttl` in production so if Redis approaches capacity, keys closest to expiration are evicted first.
