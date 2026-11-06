# COLIN — PostgreSQL Multi-Session Concurrency Test Report

**Document Version:** 1.0.0  
**Phase:** 4A.2.2.1-R2.1.2  
**Parent Phase:** 4A.2.2.1  
**Project:** COLIN — Campus Living Verified  
**Date:** November 5, 2026  
**Auditor Roles:** Senior PostgreSQL Database Engineer, Integration Test Engineer, QA Automation Lead

---

## 1. Concurrency Testing Architecture

To verify transaction isolation, row-level locking, and exclusion guarantees under race conditions, COLIN's integration suite implements **Domain 10: Multi-Session Concurrency Verification**.

Each scenario utilizes two distinct, independent PostgreSQL client connections:
- **Connection 1 (`execSql`)**: Primary session simulating user or worker A.
- **Connection 2 (`execSecondarySql`)**: Secondary session simulating user or worker B.

---

## 2. Concurrency Scenario Verifications

### 2.1 Scenario E.1: Bed Reservation Race Condition
- **Business Rule**: Exactly one active reservation (`TEMPORARY_HOLD` or `CONFIRMED`) may exist for any individual bed at any point in time.
- **Mechanism**: Partial unique index `uq_active_bed_reservation` on `bed_reservations (bed_id)` where `status IN ('TEMPORARY_HOLD', 'CONFIRMED')`.
- **Race Scenario**:
  1. Session 1 begins a transaction and inserts a `TEMPORARY_HOLD` on Bed A.
  2. Session 2 concurrently attempts to insert a `TEMPORARY_HOLD` on the identical Bed A.
  3. Session 1 commits the transaction.
  4. Session 2's insert is strictly rejected with a unique constraint violation (`uq_active_bed_reservation`).
- **Outcome**: Exactly one active hold persists. Zero duplicate holds. Zero bed over-allocation.

### 2.2 Scenario E.2: Payout Beneficiary Row-Locking & Deactivation Race
- **Business Rule**: Payouts must disburse only to active, verified bank accounts belonging to the registered owner. Deactivating an account while a payout is being authorized must be safely serialized.
- **Mechanism**: `SELECT ... FROM owner_bank_accounts WHERE id = NEW.bank_account_id FOR UPDATE;` inside `fn_validate_payout_disbursement()`.
- **Race Scenario**:
  1. Session 1 begins a transaction to disburse funds to Bank Account B. The trigger acquires an exclusive row lock (`FOR UPDATE`) on Bank Account B.
  2. Session 2 concurrently attempts `UPDATE owner_bank_accounts SET is_active = FALSE WHERE id = B;`. Session 2 blocks waiting for Session 1's lock release.
  3. Session 1 transitions the payout to `PROCESSING`, re-validates the active beneficiary, and commits.
  4. Session 2's deactivation succeeds only after Session 1's atomic validation and state transition are finalized.
- **Outcome**: Bank account details cannot be silently redirected or deactivated mid-flight. Zero unauthorized disbursements.

### 2.3 Scenario E.3: Property Photo Limit Concurrency (Max 8 Cap)
- **Business Rule**: A property can have at most 8 photos.
- **Mechanism**: `fn_enforce_max_property_photos()` trigger executing with table-level row-locking on the destination property.
- **Race Scenario**:
  1. Destination property already contains 7 uploaded photos.
  2. Session 1 and Session 2 concurrently attempt to upload a photo to the property.
  3. Session 1 succeeds, bringing the total photo count to 8.
  4. Session 2's concurrent attempt is strictly rejected by the trigger (`Property already has the maximum allowed 8 photos`).
- **Outcome**: Photo count never exceeds 8. Maximum storage limits and grid layout invariants are preserved.

### 2.4 Scenario E.4: Ledger Immutability Under Concurrent Insertion
- **Business Rule**: Posted transactions are immutable. No entry may be added, updated, or removed once a transaction transitions to `POSTED`.
- **Mechanism**: `fn_prevent_posted_ledger_mutation()` trigger verifying parent transaction status.
- **Race Scenario**:
  1. Transaction TX-130 is in `DRAFT` status with balanced debit and credit entries.
  2. Session 1 issues `UPDATE ledger_transactions SET status = 'POSTED' WHERE id = TX-130;`.
  3. Session 2 concurrently attempts `INSERT INTO ledger_entries (...) VALUES (..., TX-130, ...);`.
  4. Session 2's insert is strictly rejected with `Accounting Immutability Violation: Cannot INSERT entry into POSTED transaction`.
- **Outcome**: Balanced ledger state is permanently sealed. Zero unposted entry slips.

---

## 3. Concurrency Implementation Standards

- **Explicit Connection Isolation**: Tests instantiate separate `pg.Client` socket connections rather than sharing an in-memory client state.
- **Deterministic Cleanup**: All concurrent records are registered with unique test IDs and cleaned up via LIFO SQL statements.
- **Bounded Wait Periods**: Concurrency barriers use deterministic transactional locks rather than fragile, arbitrary `setTimeout()` sleeps.
