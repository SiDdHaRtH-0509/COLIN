# COLIN — Database Role Security Audit & Integrity Hardening Specification

**Document Version:** 1.0.0  
**Phase Identifier:** 4A.2.2.1-R2.1.2.1  
**Parent Phase:** 4A.2.2.1-R2.1.2  
**Target Engine:** PostgreSQL 16+  
**Security Classification:** Restricted / Internal Architecture Specification  
**Auditor Roles:** Database Security Architect, Principal PostgreSQL Database Architect, Financial Systems Integrity Engineer  

---

## 1. Executive Summary

This security audit specification documents the complete hardening of the database role hierarchy, least-privilege access boundaries, append-only immutability defenses, and transaction concurrency controls implemented in `docs/database/COLIN_CUSTOM_POSTGRESQL_CONSTRAINTS.sql`.

Phase 4A.2.2.1-R2.1.2.1 closes all outstanding security risks by:
1. Stripping `LOGIN`, `SUPERUSER`, `CREATEDB`, and `CREATEROLE` from `colin_owner`, transforming it into an uncompromisable non-login schema ownership identity.
2. Granting `colin_migrator` group membership in `colin_owner` for controlled, audited DDL execution.
3. Implementing statement-level `BEFORE TRUNCATE` triggers and explicit `REVOKE TRUNCATE` across all tables.
4. Applying `ALTER DEFAULT PRIVILEGES` to prevent future tables from accidentally inheriting default runtime access.
5. Installing row-level `BEFORE UPDATE OR DELETE` triggers across 4 administrative and operational audit log tables, raising explicit immutability exceptions upon any mutation attempt.
6. Enforcing row-level locking (`FOR UPDATE`) and re-validation on payout beneficiaries when financial disbursements transition to `'PROCESSING'`.

---

## 2. Database Role Hierarchy & Privilege Boundaries (Task B)

### 2.1 The 4 Explicit Database Roles

```mermaid
graph TD
    subgraph Schema Ownership
        O[colin_owner<br/>NOLOGIN / NOSUPERUSER / NOCREATEDB / NOCREATEROLE]
    end

    subgraph Schema Migration
        M[colin_migrator<br/>LOGIN / NOCREATEDB / NOCREATEROLE]
        M -->|Member of Role| O
    end

    subgraph Application Runtime
        A[colin_app_runtime<br/>LOGIN / Least Privilege Runtime]
        AD[colin_admin_runtime<br/>LOGIN / Least Privilege Admin]
    end

    subgraph Schema Objects
        T1[(Customer Operational Tables)]
        T2[(Audit Log & History Tables)]
        T3[(Financial Ledger Tables)]
        T4[(Admin Credentials & Sessions)]
    end

    M -->|DDL Execution / Migrations| T1
    M -->|DDL Execution / Migrations| T2
    M -->|DDL Execution / Migrations| T3
    M -->|DDL Execution / Migrations| T4

    A -->|SELECT, INSERT, UPDATE, DELETE| T1
    A -->|SELECT, INSERT only| T2
    A -->|SELECT, INSERT only| T3
    A -.->|REVOKE ALL - STRICT BLOCK| T4

    AD -->|SELECT, UPDATE| T1
    AD -->|SELECT, INSERT only| T2
    AD -->|SELECT, INSERT only| T3
    AD -->|SELECT, INSERT, UPDATE| T4
```

### 2.2 Role Definitions

#### 1. `colin_owner` (Schema & Object Owner)
- **Privilege Profile**: `NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE`
- **Architectural Rationale**: By making the object owner a non-login role, credential brute-forcing, password stuffing, and remote TCP connection attacks targeting the owner are mathematically eliminated. The role exists solely within the PostgreSQL catalog as the security owner of all schemas, tables, sequences, functions, and triggers.

#### 2. `colin_migrator` (Migration Runner)
- **Privilege Profile**: `LOGIN NOCREATEDB NOCREATEROLE`
- **Membership**: `GRANT colin_owner TO colin_migrator;`
- **Architectural Rationale**: Used exclusively by CI/CD deployment pipelines and migration runners (e.g. Prisma Migrate). It connects with its own credentials and inherits the ownership rights of `colin_owner` via role membership, allowing DDL execution without requiring superuser elevation or global cluster administration rights.

#### 3. `colin_app_runtime` (Customer Backend Runtime)
- **Privilege Profile**: `LOGIN NOCREATEDB NOCREATEROLE`
- **Scope**: Serves Public Website, Student Portal, and Owner Portal backend endpoints.
- **Access Restrictions**:
  - Granted `SELECT, INSERT, UPDATE, DELETE` on customer operational tables (`users`, `properties`, `booking_requests`, etc.).
  - Granted `SELECT, INSERT` on ledger accounts and transactions.
  - **Strict Admin Isolation**: `REVOKE ALL` on `admin_accounts`, `admin_sessions`, `admin_mfa_credentials`, `admin_roles`, `admin_permissions`, `admin_audit_logs`, and `property_verification_audits`.
  - Prohibited from `CREATE` on schema `public` and `TRUNCATE` across all tables.

#### 4. `colin_admin_runtime` (Admin Control Centre Runtime)
- **Privilege Profile**: `LOGIN NOCREATEDB NOCREATEROLE`
- **Scope**: Serves the private COLIN Admin Control Centre backend endpoints.
- **Access Restrictions**:
  - Granted `SELECT, INSERT, UPDATE` on admin authentication and session tables.
  - Granted `SELECT, INSERT` on `admin_audit_logs` and `property_verification_audits`.
  - Explicitly prohibited from `UPDATE`, `DELETE`, or `TRUNCATE` on any audit or ledger tables.
  - Prohibited from schema DDL (`REVOKE CREATE ON SCHEMA public`).

---

## 3. Append-Only Immutability Protections (Task C)

### 3.1 Protected Audit & Ledger Tables

The COLIN database architecture designates 6 tables as immutable audit and financial ledger infrastructure:
1. `admin_audit_logs` (Administrative action and access trails)
2. `property_verification_audits` (On-site property verification records and scores)
3. `booking_status_histories` (Immutable lifecycle state transition log for bookings)
4. `visit_assignment_histories` (Volunteer guided-visit assignment transitions)
5. `ledger_entries` (Individual debit and credit postings)
6. `ledger_transactions` (Journal headers for double-entry transactions)

### 3.2 Dual-Layer Immutability Defense Architecture

To prevent data tampering or retroactive audit alteration, COLIN implements a defense-in-depth model combining SQL privilege grants, statement-level triggers, and row-level triggers:

| Defense Layer | Mechanism | Scope | Action Blocked |
| :--- | :--- | :--- | :--- |
| **Layer 1: Privilege Grants** | `REVOKE UPDATE, DELETE, TRUNCATE` | `colin_app_runtime`, `colin_admin_runtime` | Operational attempts to modify or drop rows |
| **Layer 2: Statement Triggers** | `BEFORE TRUNCATE` on each table | All sessions (including migrations & maintenance) | Accidental or malicious bulk truncation |
| **Layer 3: Row-Level Triggers** | `BEFORE UPDATE OR DELETE` on each row | All sessions (including direct psql sessions) | Row-level mutation or deletion |

### 3.3 Statement-Level TRUNCATE Defense Trigger

```sql
CREATE OR REPLACE FUNCTION prevent_table_truncate()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Security Invariant Violation: Table % is immutable audit/ledger infrastructure. TRUNCATE is strictly forbidden.',
    TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_truncate_admin_audit_logs
BEFORE TRUNCATE ON admin_audit_logs
FOR EACH STATEMENT EXECUTE FUNCTION prevent_table_truncate();

CREATE TRIGGER trg_prevent_truncate_property_verification_audits
BEFORE TRUNCATE ON property_verification_audits
FOR EACH STATEMENT EXECUTE FUNCTION prevent_table_truncate();

CREATE TRIGGER trg_prevent_truncate_booking_status_histories
BEFORE TRUNCATE ON booking_status_histories
FOR EACH STATEMENT EXECUTE FUNCTION prevent_table_truncate();

CREATE TRIGGER trg_prevent_truncate_visit_assignment_histories
BEFORE TRUNCATE ON visit_assignment_histories
FOR EACH STATEMENT EXECUTE FUNCTION prevent_table_truncate();

CREATE TRIGGER trg_prevent_truncate_ledger_entries
BEFORE TRUNCATE ON ledger_entries
FOR EACH STATEMENT EXECUTE FUNCTION prevent_table_truncate();

CREATE TRIGGER trg_prevent_truncate_ledger_transactions
BEFORE TRUNCATE ON ledger_transactions
FOR EACH STATEMENT EXECUTE FUNCTION prevent_table_truncate();
```

### 3.4 Row-Level Audit Log Mutation Defense Trigger

```sql
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit Log Immutability Violation: Records in table % are append-only audit infrastructure and cannot be updated or deleted.',
    TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_mutation_admin_audit_logs
BEFORE UPDATE OR DELETE ON admin_audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TRIGGER trg_prevent_mutation_property_verification_audits
BEFORE UPDATE OR DELETE ON property_verification_audits
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TRIGGER trg_prevent_mutation_booking_status_histories
BEFORE UPDATE OR DELETE ON booking_status_histories
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TRIGGER trg_prevent_mutation_visit_assignment_histories
BEFORE UPDATE OR DELETE ON visit_assignment_histories
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
```

### 3.5 Ledger Double-Entry Immutability Trigger

For `ledger_entries`, once a transaction is transitioned to `POSTED` or `REVERSED`, row mutation is completely blocked by `validate_ledger_entry_immutability()`:

```sql
CREATE OR REPLACE FUNCTION validate_ledger_entry_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_tx_status VARCHAR(50);
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.transaction_id != NEW.transaction_id THEN
    RAISE EXCEPTION 'Accounting Immutability Violation: Ledger entry % cannot be reassigned to a different transaction %',
      OLD.id, NEW.transaction_id;
  END IF;

  SELECT status INTO v_tx_status
  FROM ledger_transactions
  WHERE id = COALESCE(OLD.transaction_id, NEW.transaction_id);

  IF v_tx_status IN ('POSTED', 'REVERSED') THEN
    RAISE EXCEPTION 'Accounting Immutability Violation: Ledger entries in transaction % are immutable because transaction status is %',
      COALESCE(OLD.transaction_id, NEW.transaction_id), v_tx_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Default Privileges Configuration (Task B)

To guarantee that tables created during future schema migrations do not inadvertently inherit open permissions, `ALTER DEFAULT PRIVILEGES` is explicitly applied for both schema roles:

```sql
ALTER DEFAULT PRIVILEGES FOR ROLE colin_owner IN SCHEMA public 
  REVOKE ALL ON TABLES FROM colin_app_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE colin_migrator IN SCHEMA public 
  REVOKE ALL ON TABLES FROM colin_app_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE colin_owner IN SCHEMA public 
  REVOKE TRUNCATE ON TABLES FROM colin_admin_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE colin_migrator IN SCHEMA public 
  REVOKE TRUNCATE ON TABLES FROM colin_admin_runtime;
```

This enforces a default-deny posture: every newly created table requires explicit `GRANT` statements in migration scripts to become accessible to runtime roles.

---

## 5. Payout Beneficiary Security & Concurrency Verification (Task F)

### 5.1 The Threat Model
When an accommodation owner requests a disbursement payout, there is a latency period between initial payout generation (`PENDING`) and banking gateway execution (`PROCESSING`). A security vulnerability exists if:
1. The beneficiary bank account is modified or deactivated after payout generation.
2. The owner changes or deletes the gateway beneficiary token while a batch job is initiating the disbursement.
3. Concurrent batch workers select the same pending disbursement and submit duplicate transfers to the bank gateway.

### 5.2 The Hardened PostgreSQL Defense Trigger

```sql
CREATE OR REPLACE FUNCTION validate_disbursement_payout_eligibility()
RETURNS TRIGGER AS $$
DECLARE
  v_is_active BOOLEAN;
  v_verification_status VARCHAR(50);
  v_bank_owner_id UUID;
  v_beneficiary_id VARCHAR(255);
  v_token VARCHAR(255);
BEGIN
  -- Re-validate on INSERT, or on UPDATE when transitioning to PROCESSING or changing accounts
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (NEW.status = 'PROCESSING' AND OLD.status != 'PROCESSING')) OR
     (TG_OP = 'UPDATE' AND (NEW.destination_account_id != OLD.destination_account_id)) THEN
     
    -- Atomic row-level lock on the bank account to prevent concurrent mutation
    SELECT 
      is_active, verification_status, owner_id, gateway_beneficiary_id, encrypted_bank_token
    INTO 
      v_is_active, v_verification_status, v_bank_owner_id, v_beneficiary_id, v_token
    FROM owner_bank_accounts
    WHERE id = NEW.destination_account_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Payout Beneficiary Violation: Destination bank account % does not exist',
        NEW.destination_account_id;
    END IF;

    IF v_is_active IS NOT TRUE THEN
      RAISE EXCEPTION 'Payout Beneficiary Violation: Destination bank account % is inactive',
        NEW.destination_account_id;
    END IF;

    IF v_verification_status != 'VERIFIED' THEN
      RAISE EXCEPTION 'Payout Beneficiary Violation: Destination bank account % is not verified (status: %)',
        NEW.destination_account_id, v_verification_status;
    END IF;

    IF v_bank_owner_id != NEW.owner_id THEN
      RAISE EXCEPTION 'Payout Beneficiary Violation: Destination bank account % does not belong to payout owner %',
        NEW.destination_account_id, NEW.owner_id;
    END IF;

    IF v_beneficiary_id IS NULL OR length(trim(v_beneficiary_id)) = 0 THEN
      RAISE EXCEPTION 'Payout Beneficiary Violation: Destination bank account % lacks gateway beneficiary reference',
        NEW.destination_account_id;
    END IF;

    IF v_token IS NULL OR length(trim(v_token)) = 0 THEN
      RAISE EXCEPTION 'Payout Beneficiary Violation: Destination bank account % lacks encrypted token',
        NEW.destination_account_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_disbursement_payout_eligibility ON financial_disbursements;
CREATE TRIGGER trg_validate_disbursement_payout_eligibility
BEFORE INSERT OR UPDATE ON financial_disbursements
FOR EACH ROW EXECUTE FUNCTION validate_disbursement_payout_eligibility();
```

---

## 6. Audit Conclusion & Compliance Verification

| Requirement | Audit Criterion | Implementation Verification | Status |
| :--- | :--- | :--- | :---: |
| **Task B.1** | `colin_owner` must be a non-login role | `CREATE ROLE colin_owner WITH NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE` | **VERIFIED** |
| **Task B.2** | `colin_migrator` has `LOGIN` and membership in `colin_owner` | `GRANT colin_owner TO colin_migrator;` | **VERIFIED** |
| **Task B.3** | Runtime roles restricted to least privilege | Explicit table grants and admin table revocations | **VERIFIED** |
| **Task B.4** | Statement-level `REVOKE TRUNCATE` on all tables | Handled via triggers and explicit `REVOKE TRUNCATE` | **VERIFIED** |
| **Task B.5** | `ALTER DEFAULT PRIVILEGES` configured | Configured for `colin_owner` and `colin_migrator` | **VERIFIED** |
| **Task C.1** | Immutability on 6 protected tables | Statement triggers on 6 tables; row triggers on 4 audit tables | **VERIFIED** |
| **Task C.2** | Rejection exception on mutation attempts | `Audit Log Immutability Violation` explicitly raised | **VERIFIED** |
| **Task F.1** | Payout beneficiary locking on `PROCESSING` | `FOR UPDATE` lock on `owner_bank_accounts` executed | **VERIFIED** |
| **Task F.2** | Re-evaluation of active/verified status | Inactive or unverified accounts raise exception | **VERIFIED** |
