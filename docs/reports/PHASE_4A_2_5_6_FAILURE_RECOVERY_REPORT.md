# COLIN — Phase 4A.2.5.6: Failure Recovery & Compensating Actions Report

**Project:** COLIN — Campus Living Verified  
**Parent Phase:** Phase 4A.2.5 — External Services & Infrastructure Integration  
**Sub-Phase:** Phase 4A.2.5.6 — Integration Reliability & Failure Handling  
**Branch:** `phase-4a-2-5-6-integration-reliability`  
**Baseline Commit:** `4546377`  
**Author:** Distributed Systems Architect & Lead Reliability Engineer  

---

## 1. Executive Summary

Distributed architectures composed of cloud object stores, external transactional email providers, and relational databases cannot achieve distributed two-phase commit (2PC) without prohibitive operational complexity.

COLIN addresses distributed boundary failures through:
1. **Explicit Compensating Actions** for cross-service workflows.
2. **PostgreSQL Concurrency Conflict & Deadlock Recovery**.
3. **Asynchronous Outbox Stale-Job Reclamation**.
4. **Webhook Reconciliation Under At-Least-Once Delivery Semantics**.
5. **Fail-Closed Security Postures for Distributed State**.

---

## 2. Multi-Phase Workflows & Compensating Rollbacks

### 2.1 Photo Upload S3 Compensating Rollback
When an owner uploads a property photo:
1. Sharp processes and optimizes master and thumbnail WebP buffers.
2. Master and thumbnail assets are uploaded to S3 / object storage.
3. Metadata is persisted to PostgreSQL in `property_photos`.

**Failure Mode:** If Step 3 fails (e.g. unique constraint violation, database disconnect, timeout), the uploaded physical assets in S3 would become permanently orphaned.

**Compensating Action Implemented in `PropertyService.uploadPhoto`:**
```typescript
try {
  return await this.propertyRepo.addPhoto(propertyId, { ... });
} catch (dbErr) {
  // Compensating transaction: Clean up storage assets with controlled retry
  await withRetry(() => storageProvider.delete(masterUpload.storageKey), {
    maxAttempts: 3,
    baseDelayMs: 100,
    jitter: true,
  }).catch((cleanupErr) => {
    ReliabilityLogger.error('Compensating storage cleanup failed for master asset', {
      provider: 's3-storage',
      operation: 'uploadPhotoRollback',
      error: cleanupErr,
      details: { storageKey: masterUpload.storageKey, propertyId },
    });
  });

  if (thumbnailUpload) {
    await withRetry(() => storageProvider.delete(thumbnailUpload.storageKey), {
      maxAttempts: 3,
      baseDelayMs: 100,
      jitter: true,
    }).catch((cleanupErr) => {
      ReliabilityLogger.error('Compensating storage cleanup failed for thumbnail asset', {
        provider: 's3-storage',
        operation: 'uploadPhotoRollback',
        error: cleanupErr,
        details: { storageKey: thumbnailUpload.storageKey, propertyId },
      });
    });
  }
  throw dbErr;
}
```

---

## 3. Database Concurrency Conflict & Deadlock Recovery

PostgreSQL serializable and read-committed transactions subject to concurrent write operations may encounter:
- SQLSTATE `40P01` (deadlock detected)
- SQLSTATE `40001` (serialization failure)
- Prisma error `P2034` (transaction conflict)

In `src/server/database/transaction.ts`, `executeTransaction()` was enhanced to accept `maxRetries?: number`. When enabled, transient `TransactionConflictError` exceptions are retried with randomized backoff and jitter, allowing concurrent transactions to serialize cleanly without failing user-facing requests.

---

## 4. Background Job Recovery & Stale Record Reclamation

In the transactional email subsystem:
1. **Worker Crash Detection:** If a worker claims an outbox record (`status = 'PROCESSING'`), dispatches it to the provider, but crashes prior to recording status in PostgreSQL, the record remains in `'PROCESSING'`.
2. **Atomic Reclamation:** In `EmailWorker.claimBatch()`, PostgreSQL CTE query with `FOR UPDATE SKIP LOCKED` claims both new jobs and stale records:
   ```sql
   (status = 'PROCESSING'::"EmailOutboxStatus" AND last_attempt_at < NOW() - (${this.staleTimeoutMinutes} * INTERVAL '1 minute'))
   ```
3. **Webhook Reconciliation:** If SendGrid or Postmark asynchronously posts a delivery webhook prior to or during worker recovery, `handleEvents()` matches the orphaned record via `outboxId` or `idempotencyKey` and transitions status to `'DELIVERED'`, preventing duplicate dispatches.
4. **Honest Delivery Semantics:** If webhooks fail to arrive within 10 minutes, stale reclamation resets the record for retry, fulfilling **at-least-once delivery semantics**. Residual duplicate delivery risk is acknowledged and documented.

---

## 5. Graceful Process Termination & Resource Teardown

To prevent orphan database backends and half-open TCP connections during container restarts, deployment scaling, or SIGTERM events:
- `src/server/database/lifecycle.ts` registers OS signal listeners (`SIGINT`, `SIGTERM`, `beforeExit`).
- `shutdownDatabaseConnections()` drains active Prisma connection pools cleanly before process exit.
- `resetAllCircuitBreakers()` ensures deterministic teardown in testing and staging environments.
