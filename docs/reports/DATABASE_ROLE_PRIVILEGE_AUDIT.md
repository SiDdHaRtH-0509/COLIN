# COLIN — DATABASE ROLE PRIVILEGE AUDIT & SECURITY SPECIFICATION

**Document Version:** 1.0.0  
**Phase Identifier:** Phase 4A.2.2.1-R2.1.2.2  
**Target Engine:** PostgreSQL 16+  
**Security Classification:** Restricted / Database Security Standard  
**Auditor Roles:** PostgreSQL Security Auditor, Principal Database Engineer, Application Security Architect  

---

## 1. Executive Summary

This document presents the security audit and formal verification matrix for COLIN's 4 database roles, least-privilege table grants, DDL boundaries, and append-only audit protections.

The architecture strictly enforces:
1. **Non-Login Schema Ownership**: `colin_owner` cannot establish network sessions, neutralizing credential attacks.
2. **Dedicated Migrator Membership**: `colin_migrator` inherits schema ownership rights via role membership without requiring superuser elevation.
3. **Strict Admin Data Isolation**: `colin_app_runtime` is completely blocked (`REVOKE ALL`) from accessing administrative credentials, MFA tokens, sessions, and audit queues.
4. **Append-Only Immutability**: All runtime roles are stripped of `UPDATE`, `DELETE`, and `TRUNCATE` privileges on audit and ledger tables. Statement-level and row-level triggers enforce engine-level immutability exceptions even under elevated sessions.
5. **Default-Deny Privileges**: `ALTER DEFAULT PRIVILEGES` revokes automatic grants on future tables created by the owner or migrator.

---

## 2. The 4 Explicit Database Roles

### 2.1 Role Attribute Matrix

```
========================================================================================================
ROLE NAME            LOGIN?   SUPERUSER?   CREATEDB?   CREATEROLE?   PRIMARY RESPONSIBILITY
========================================================================================================
colin_owner          NO       NO           NO          NO            Schema & object catalog ownership
colin_migrator       YES      NO           NO          NO            CI/CD migration execution & DDL runner
colin_app_runtime    YES      NO           NO          NO            Public, Student, and Owner API backend
colin_admin_runtime  YES      NO           NO          NO            Admin Control Centre backend
========================================================================================================
```

### 2.2 DDL & Role Provisioning SQL

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'colin_owner') THEN
    CREATE ROLE colin_owner WITH NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'colin_migrator') THEN
    CREATE ROLE colin_migrator WITH LOGIN NOCREATEDB NOCREATEROLE;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'colin_app_runtime') THEN
    CREATE ROLE colin_app_runtime WITH LOGIN NOCREATEDB NOCREATEROLE;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'colin_admin_runtime') THEN
    CREATE ROLE colin_admin_runtime WITH LOGIN NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

-- Object ownership strategy: migrator inherits ownership via membership
GRANT colin_owner TO colin_migrator;

-- Schema usage and DDL boundaries
GRANT USAGE, CREATE ON SCHEMA public TO colin_owner;
GRANT USAGE, CREATE ON SCHEMA public TO colin_migrator;
GRANT USAGE ON SCHEMA public TO colin_app_runtime;
GRANT USAGE ON SCHEMA public TO colin_admin_runtime;
REVOKE CREATE ON SCHEMA public FROM colin_app_runtime, colin_admin_runtime;
```

---

## 3. Comprehensive Privilege Verification Matrix

| Table Category / Table Name | `colin_owner` | `colin_migrator` | `colin_app_runtime` | `colin_admin_runtime` | Security Boundary |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Customer Operational** (`users`, `user_profiles`, `properties`, `rooms`, `beds`, `booking_requests`, etc.) | ALL | ALL (Inherited) | `SELECT, INSERT, UPDATE, DELETE` | `SELECT, UPDATE` | Standard business operations; no TRUNCATE |
| **Administrative Auth** (`admin_accounts`, `admin_sessions`, `admin_mfa_credentials`, `admin_roles`) | ALL | ALL (Inherited) | **REVOKE ALL (NONE)** | `SELECT, INSERT, UPDATE` | Strict customer-admin isolation boundary |
| **Audit Logs** (`admin_audit_logs`, `property_verification_audits`) | ALL | ALL (Inherited) | **REVOKE ALL (NONE)** | `SELECT, INSERT` (NO UPDATE/DELETE) | Append-only administrative accountability |
| **Operational History** (`booking_status_histories`, `visit_assignment_histories`) | ALL | ALL (Inherited) | `SELECT, INSERT` | `SELECT, INSERT` | Append-only status transition log |
| **Financial Ledger** (`ledger_entries`) | ALL | ALL (Inherited) | `SELECT, INSERT` | `SELECT, INSERT` | Immutable dual-entry postings; NO UPDATE/DELETE |
| **Ledger Transactions** (`ledger_transactions`) | ALL | ALL (Inherited) | `SELECT, INSERT, UPDATE (status, posted_at, reverses_id)` | `SELECT, INSERT, UPDATE (status, posted_at, reverses_id)` | Post & reverse only; NO DELETE/TRUNCATE |
| **Schema DDL** (`public.*`) | `CREATE` | `CREATE` | **REVOKE CREATE** | **REVOKE CREATE** | Runtime roles cannot alter schema objects |

---

## 4. Default Privileges & Revocation Policies

To eliminate accidental permission inheritance when new migrations create tables, default privileges are explicitly hardened:

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

---

## 5. Defense-in-Depth Immutability Triggers

### 5.1 Statement-Level TRUNCATE Defense (6 Tables)
Applied to: `admin_audit_logs`, `property_verification_audits`, `booking_status_histories`, `visit_assignment_histories`, `ledger_entries`, `ledger_transactions`.

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
```

### 5.2 Row-Level Audit Mutation Defense (4 Tables)
Applied to: `admin_audit_logs`, `property_verification_audits`, `booking_status_histories`, `visit_assignment_histories`.

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
```

---

## 6. Threat Mitigation Matrix

| Threat Vector | Attack Scenario | Implemented Defense Primitive |
| :--- | :--- | :--- |
| **Owner Credential Compromise** | Attacker attempts to brute-force `colin_owner` credentials over network socket. | `NOLOGIN` on `colin_owner` mathematically prevents network login. |
| **Lateral Movement (Public -> Admin)** | SQL injection vulnerability in public search endpoint attempts to read admin credentials. | `REVOKE ALL` on `admin_accounts`, `admin_sessions`, `admin_mfa_credentials` blocks table access at PostgreSQL catalog level. |
| **Audit Trail Erasure** | Compromised admin account attempts to purge audit logs using `DELETE FROM admin_audit_logs`. | SQL `REVOKE DELETE` + row-level trigger `prevent_audit_log_mutation()` blocks execution with `Audit Log Immutability Violation`. |
| **Catastrophic Bulk Truncation** | Rogue operator or compromised CI script attempts `TRUNCATE TABLE ledger_entries`. | SQL `REVOKE TRUNCATE` + statement trigger `prevent_table_truncate()` immediately aborts transaction. |
| **Ledger Entry Reassignment** | Malicious actor attempts to reassign existing debit/credit entry to another transaction. | `validate_ledger_entry_immutability()` blocks `transaction_id` updates unconditionally. |

---

## 7. Role Audit Sign-Off

The role hierarchy and privilege matrix in `docs/database/COLIN_CUSTOM_POSTGRESQL_CONSTRAINTS.sql` satisfies the Principle of Least Privilege (PoLP) and defense-in-depth security standards required for production financial and administrative operations.
