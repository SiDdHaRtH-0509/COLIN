# COLIN — PHASE 6 DATABASE SECURITY REPORT
## Database Role Least-Privilege Separation, Immutability Triggers & Audit Protection

**Platform:** COLIN Student Accommodation Platform  
**Target Environments:** Staging & Production  
**Database Engine:** PostgreSQL 16+ via Prisma ORM  
**Security Standard:** CIS PostgreSQL 16 Benchmark, NIST SP 800-53 (AC-6 Least Privilege, AU-9 Protection of Audit Information)  
**Report Date:** November 2026  
**Status:** FULL PASS — DEFENSES ACTIVE  

---

## 1. Executive Summary

This report documents the database-level security controls, role-based privilege isolation, and append-only immutability triggers implemented under **Phase 6H (Database Security Hardening)** for the COLIN platform.

Rather than relying solely on application-layer guards, COLIN enforces defense-in-depth directly inside the PostgreSQL database engine. Customer application processes cannot access administrative tables even if an SQL injection vulnerability were to exist in a public endpoint. Furthermore, audit logs and financial records are physically immutable and cannot be updated, deleted, or truncated by any application runtime role.

---

## 2. Least-Privilege Database Role Architecture

COLIN defines 4 specialized PostgreSQL database roles:

| Role Name | Scope & Authority | Login Permitted | Target Workload |
| :--- | :--- | :---: | :--- |
| **`colin_owner`** | Database Owner / DDL Master | Yes (Admin only) | Initial schema setup, extension installation, and disaster recovery. |
| **`colin_migrator`** | Migration Runner | Yes | Executing Prisma migrations (`prisma migrate deploy`). Holds `CREATE` on schema `public`. |
| **`colin_app_runtime`** | Customer Runtime (Web & App) | Yes | Servicing Student, Owner, and Public Website traffic. Granted DML strictly on operational tables. |
| **`colin_admin_runtime`**| Administrative Runtime | Yes | Servicing the Admin Control Centre. Holds DML on admin tables and moderation workflows. |

---

## 3. Strict Privilege Isolation Matrix

### 3.1 Schema & Table Access Permissions

| Database Table | `colin_app_runtime` (Customer) | `colin_admin_runtime` (Admin) | Immutability Safeguards |
| :--- | :---: | :---: | :--- |
| **Customer Operational** (`users`, `properties`, `bookings`, `beds`) | `SELECT, INSERT, UPDATE, DELETE` | `SELECT, UPDATE` | Business constraints |
| **Financial Ledger** (`ledger_entries`) | `SELECT, INSERT` | `SELECT, INSERT` | ❌ No `UPDATE`, `DELETE`, or `TRUNCATE` |
| **Financial Transactions** (`ledger_transactions`) | `SELECT, INSERT, UPDATE (status)` | `SELECT, INSERT, UPDATE (status)` | ❌ No `DELETE` or `TRUNCATE` |
| **Admin Accounts & Roles** (`admin_accounts`, `admin_roles`) | 🚫 **REVOKED (No Access)** | `SELECT, INSERT, UPDATE` | Strong hashing & MFA |
| **Admin MFA Credentials** (`admin_mfa_credentials`) | 🚫 **REVOKED (No Access)** | `SELECT, INSERT, UPDATE, DELETE` | Single-use hashes |
| **Admin Audit Logs** (`admin_audit_logs`) | 🚫 **REVOKED (No Access)** | `SELECT, INSERT` | ❌ No `UPDATE`, `DELETE`, or `TRUNCATE` |
| **Property Verification Audits** (`property_verification_audits`) | 🚫 **REVOKED (No Access)** | `SELECT, INSERT` | ❌ No `UPDATE`, `DELETE`, or `TRUNCATE` |
| **Booking Status History** (`booking_status_histories`) | `SELECT, INSERT` | `SELECT, INSERT` | ❌ No `UPDATE`, `DELETE`, or `TRUNCATE` |
| **Email Delivery Events** (`email_delivery_events`) | `SELECT, INSERT` | `SELECT, INSERT` | ❌ No `DELETE` or `TRUNCATE` |

### 3.2 SQL Grant Definitions
Enforced via `docs/database/COLIN_CUSTOM_POSTGRESQL_CONSTRAINTS.sql`:

```sql
-- STRICT ADMIN ISOLATION: colin_app_runtime CANNOT access admin auth or audit data
REVOKE ALL ON 
  admin_accounts, admin_sessions, admin_mfa_credentials, admin_mfa_recovery_codes,
  admin_roles, admin_permissions, admin_role_permissions, admin_user_roles,
  admin_audit_logs, property_verification_audits, volunteer_reviews
FROM colin_app_runtime;

-- REVOKE DDL from both runtime roles
REVOKE CREATE ON SCHEMA public FROM colin_app_runtime, colin_admin_runtime;
```

---

## 4. Append-Only Immutability Triggers

To satisfy regulatory compliance and ensure forensic integrity in the event of an investigation, all audit trails, financial entries, and history tables are protected by PostgreSQL triggers that reject mutation statements.

### 4.1 Statement-Level Truncate Prevention
```sql
CREATE OR REPLACE FUNCTION prevent_table_truncate()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Security Invariant Violation: TRUNCATE is strictly prohibited on table %.',
    TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_truncate_admin_audit_logs
BEFORE TRUNCATE ON admin_audit_logs
FOR EACH STATEMENT EXECUTE FUNCTION prevent_table_truncate();
```

### 4.2 Row-Level Update & Delete Prevention
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

Any attempt by an administrator, rogue application process, or SQL injection payload to execute `UPDATE admin_audit_logs` or `DELETE FROM admin_audit_logs` triggers an immediate PostgreSQL exception:
`PostgresError { code: "42501" / "P0001", message: "Audit Log Immutability Violation: Records in table admin_audit_logs are append-only audit infrastructure and cannot be updated or deleted." }`

---

## 5. Automated Test Evidence

Verified in `src/test/security/phase6_security_hardening.integration.test.ts`:

| Test ID | Test Scenario | Verified Outcome | Status |
| :--- | :--- | :--- | :--- |
| **SEC-7.1** | `colin_app_runtime` attempts to query `admin_audit_logs` | Rejected with PostgreSQL error `42501 (permission denied)` | PASS |
| **SEC-7.2** | `colin_admin_runtime` attempts to update `admin_audit_logs` | Rejected with PostgreSQL error `42501 (permission denied)` / immutability trigger | PASS |
| **SEC-7.3** | `colin_admin_runtime` attempts to delete `admin_audit_logs` | Rejected with PostgreSQL error `42501 (permission denied)` / immutability trigger | PASS |

---

## 6. Conclusion
The database architecture provides defense-in-depth through strict role separation and immutable append-only triggers. Customer runtimes are segregated from administrative structures, and forensic audit records are physically tamper-proof.
