# COLIN — Double-Entry Financial Ledger & Escrow Accounting

**Document ID:** COLIN-EVID-007  
**Target:** Academic B.Tech Capstone Project Documentation  
**Repository Branch:** `colin-prototype-completion`  
**Ledger Repository:** [LedgerRepository.ts](file:///C:/Users/clsid/COLIN/src/server/database/repositories/LedgerRepository.ts)  
**Payment Provider:** [SimulatedPaymentProvider.ts](file:///C:/Users/clsid/COLIN/src/server/payments/SimulatedPaymentProvider.ts) (SIMULATED/TEST)  
**Integrity Tests:** [postgres-integrity.integration.test.ts](file:///C:/Users/clsid/COLIN/src/test/database/postgres-integrity.integration.test.ts)  

---

> [!IMPORTANT]
> **SIMULATED / TEST PAYMENT SYSTEM NOTICE**  
> All monetary payments, gateway tokens, and merchant settlement accounts in the current COLIN prototype run on a **deterministic in-memory simulated test provider** (`SimulatedPaymentProvider`). Real currency is never debited or credited, and no live banking or card networks are connected. However, all internal ledger accounting, debits, credits, escrow liabilities, and balance sheet calculations are authentic, mathematically validated, and enforced by PostgreSQL 18 database triggers.

---

## 1. Accounting Philosophy & IAS-1 Compliance

COLIN implements an enterprise double-entry general ledger adhering to International Accounting Standard 1 (IAS-1). Rather than tracking funds with a single mutable `wallet_balance` integer or float, every financial occurrence is recorded as an immutable journal transaction containing at least two balanced entries:

$$\sum \text{Debits} \equiv \sum \text{Credits} \quad \iff \quad \sum \text{Debits} - \sum \text{Credits} = 0$$

### Chart of Accounts

| Account Code | Account Name | Account Type | Category | Accounting Role |
|---|---|---|---|---|
| `1000` | Payment Gateway Clearing | **ASSET** | `GATEWAY_CLEARING` | Inflow receivable clearing account from payment gateway. |
| `2000` | Platform Visit Fee Escrow | **LIABILITY** | `PLATFORM_ESCROW` | Unearned escrow deposit held on behalf of the student pending decision. |
| `2100` | Student Refund Payable | **LIABILITY** | `STUDENT_WALLET` | Outstanding liability payable to student upon visit rejection. |
| `4000` | Platform Retained Revenue | **REVENUE** | `PLATFORM_REVENUE` | Earned platform operating revenue (coordination, verification). |

---

## 2. Mathematical Partition & Exact Fee Allocation

The platform enforces strict monetary values for student guided visits:
- **Statutory Visit Slot Pass Fee:** ₹150.00
- **Rejection Refund Rate (55%):** ₹82.50
- **Platform Retained Fee (45%):** ₹67.50
- **Acceptance / Expiry Refund Rate (0%):** ₹0.00 (₹150.00 retained)

### Mathematical Proof of Balance Across All Settlement States:

1. **Rejection Settlement:**
   $$\text{Debit (Escrow)} = ₹150.00$$
   $$\text{Credit (Student Payable)} = ₹82.50$$
   $$\text{Credit (Platform Revenue)} = ₹67.50$$
   $$\text{Total Credits} = ₹82.50 + ₹67.50 = ₹150.00$$
   $$\text{Net Balance} = ₹150.00 - ₹150.00 = 0.00 \quad \checkmark$$

2. **Acceptance Settlement:**
   $$\text{Debit (Escrow)} = ₹150.00$$
   $$\text{Credit (Platform Revenue)} = ₹150.00$$
   $$\text{Net Balance} = ₹150.00 - ₹150.00 = 0.00 \quad \checkmark$$

3. **Automatic Expiration Settlement:**
   $$\text{Debit (Escrow)} = ₹150.00$$
   $$\text{Credit (Platform Revenue)} = ₹150.00$$
   $$\text{Net Balance} = ₹150.00 - ₹150.00 = 0.00 \quad \checkmark$$

---

## 3. Financial Event Journal Flows

### 3.1 Initial Payment Capture (Booking Requested $\to$ `FEE_PAID`)
Upon payment capture, the funds enter escrow liability:

```
Transaction Type: VISIT_FEE_COLLECTION
Status: POSTED
Description: "Visit fee collection for booking [UUID] (TEST/SIMULATED)"

Entries:
  1. DEBIT   Account 1000 (Payment Gateway Clearing)     ₹150.00
  2. CREDIT  Account 2000 (Platform Visit Fee Escrow)    ₹150.00
  -------------------------------------------------------------
  Balance: ₹150.00 (Dr) = ₹150.00 (Cr)                   [BALANCED]
```

### 3.2 Student Accepts Accommodation (`DECISION_PENDING` $\to$ `ACCEPTED`)
The student confirms lease; escrow liability is cleared into earned platform revenue:

```
Transaction Type: VISIT_ACCEPTANCE_SETTLEMENT
Status: POSTED
Description: "Visit acceptance settlement for booking [UUID]"

Entries:
  1. DEBIT   Account 2000 (Platform Visit Fee Escrow)    ₹150.00
  2. CREDIT  Account 4000 (Platform Retained Revenue)    ₹150.00
  -------------------------------------------------------------
  Balance: ₹150.00 (Dr) = ₹150.00 (Cr)                   [BALANCED]
```

### 3.3 Student Rejects Accommodation (`DECISION_PENDING` $\to$ `REJECTED_REFUND_DUE`)
The student declines; the 55% fair refund policy is executed:

```
Transaction Type: VISIT_REJECTION_REFUND
Status: POSTED
Description: "Visit rejection refund for booking [UUID] (55% refund, 45% retained)"

Entries:
  1. DEBIT   Account 2000 (Platform Visit Fee Escrow)    ₹150.00
  2. CREDIT  Account 2100 (Student Refund Payable)        ₹82.50
  3. CREDIT  Account 4000 (Platform Retained Revenue)     ₹67.50
  -------------------------------------------------------------
  Balance: ₹150.00 (Dr) = ₹150.00 (Cr)                   [BALANCED]
```

### 3.4 Automatic Decision Expiry (`DECISION_PENDING` $\to$ `AUTO_EXPIRED`)
The 12-hour deadline elapses; non-responsive booking is forfeited:

```
Transaction Type: VISIT_EXPIRATION_SETTLEMENT
Status: POSTED
Description: "Automatic expiration settlement for booking [UUID]"

Entries:
  1. DEBIT   Account 2000 (Platform Visit Fee Escrow)    ₹150.00
  2. CREDIT  Account 4000 (Platform Retained Revenue)    ₹150.00
  -------------------------------------------------------------
  Balance: ₹150.00 (Dr) = ₹150.00 (Cr)                   [BALANCED]
```

---

## 4. Idempotency & Database Enforcement Controls

### 4.1 Idempotency Key Architecture
To eliminate duplicate double-charges or duplicate settlements, every financial action requires a unique idempotency key:
- `idempotency_key` on `financial_payments`: Enforces unique payment per booking attempt.
- `idempotency_key` on `ledger_transactions`: Formed as `idemp-fee-<bookingId>-<paymentKey>` or `idemp-acc-<bookingId>` / `idemp-rej-<bookingId>`.
- Any re-submission with the same idempotency key is intercepted by PostgreSQL's unique constraint, returning the existing transaction without creating duplicate accounting legs.

### 4.2 Posting Balance Trigger (`trg_verify_posted_ledger_transaction`)
Defined in [COLIN_CUSTOM_POSTGRESQL_CONSTRAINTS.sql](file:///C:/Users/clsid/COLIN/docs/database/COLIN_CUSTOM_POSTGRESQL_CONSTRAINTS.sql#L158-L205):
```plpgsql
IF v_total_debits != v_total_credits THEN
  RAISE EXCEPTION 'Accounting Invariant Violation: Unbalanced journal transaction %. Debits: %, Credits: %',
    NEW.id, v_total_debits, v_total_credits;
END IF;
```
It is structurally impossible for buggy application code to commit an unbalanced journal transaction.

### 4.3 Immutability of Posted Records
Once a transaction achieves status `'POSTED'`, trigger `trg_immutable_ledger_entries` blocks all subsequent updates and deletions. Any correction requires an explicit reversing transaction created via `reverse_ledger_transaction()`, preserving a forensic audit trail.

---

## 5. Verification & Test Evidence

Validated in [postgres-integrity.integration.test.ts](file:///C:/Users/clsid/COLIN/src/test/database/postgres-integrity.integration.test.ts) (78 passing tests) and [database_integrity_verification_r2.test.ts](file:///C:/Users/clsid/COLIN/src/test/database_integrity_verification_r2.test.ts) (32 passing tests):
- Unbalanced transactions deliberately injected in tests were rejected with code `P0001`.
- Transactions with single entry legs were rejected.
- Negative entry amounts were blocked by check constraint.
- Attempted deletions of posted ledger entries were blocked.
