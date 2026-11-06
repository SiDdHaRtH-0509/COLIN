# COLIN — PostgreSQL Security & Database Role Verification Report

**Document Version:** 1.0.0  
**Phase:** 4A.2.2.1-R2.1.2  
**Parent Phase:** 4A.2.2.1  
**Project:** COLIN — Campus Living Verified  
**Date:** November 5, 2026  
**Auditor Roles:** Senior PostgreSQL Database Engineer, Database Security Architect

---

## 1. Security Architecture & Threat Model

COLIN enforces strict database-level authorization boundaries separating customer-facing runtime connections (`colin_app_runtime`) from administrative operations (`colin_admin_runtime`) and schema migrations (`colin_migrator`).

### 1.1 Non-Superuser Ownership Model (PoLP)
- **`colin_owner`**: Database and schema owner created with `LOGIN CREATEDB CREATEROLE`. Explicitly **NOT** granted `SUPERUSER`.
- **`colin_migrator`**: Role granted membership in `colin_owner` (`GRANT colin_owner TO colin_migrator;`). Manages DDL migrations, custom triggers, and schema evolution without possessing persistent runtime application access.
- **`colin_app_runtime`**: Runtime role utilized by Public, Student, and Owner backend services. Possesses strictly business-entity DML (`SELECT, INSERT, UPDATE, DELETE`) on consumer tables. Prohibited from DDL (`CREATE, ALTER, DROP, TRUNCATE`).
- **`colin_admin_runtime`**: Private Admin Control Centre backend connection. Authorized to query administrative identity, review queues, and append audit events. Prohibited from DDL and TRUNCATE.

---

## 2. Granular Role & Permission Verification Matrix

| Table / Object | `colin_app_runtime` | `colin_admin_runtime` | Security Boundary Enforcement |
| :--- | :---: | :---: | :--- |
| **`admin_accounts`** | **REVOKED (None)** | SELECT, INSERT, UPDATE | App backend cannot query admin password hashes or salt parameters |
| **`admin_sessions`** | **REVOKED (None)** | SELECT, INSERT, UPDATE, DELETE | App backend cannot read or forge administrative session tokens |
| **`admin_mfa_credentials`** | **REVOKED (None)** | SELECT, INSERT, UPDATE, DELETE | MFA TOTP secrets and recovery codes are completely sealed |
| **`admin_password_reset_tokens`** | **REVOKED (None)** | SELECT, INSERT, UPDATE, DELETE | Password reset tokens shielded from customer runtime |
| **`admin_audit_logs`** | **REVOKED (None)** | SELECT, INSERT | Append-only. UPDATE and DELETE prohibited by triggers and role grants |
| **`property_verification_audits`** | **REVOKED (None)** | SELECT, INSERT | Internal inspection records sealed from unverified alteration |
| **`volunteer_reviews`** | **REVOKED (None)** | SELECT, INSERT, UPDATE | Internal quality ratings shielded from customer tampering |
| **`properties`** | SELECT, INSERT, UPDATE, DELETE | SELECT, UPDATE | Public discovery & owner property management |
| **`rooms` / `beds`** | SELECT, INSERT, UPDATE, DELETE | SELECT, UPDATE | Inventory management |
| **`bed_reservations`** | SELECT, INSERT, UPDATE, DELETE | SELECT, UPDATE | 15-minute hold lifecycle, auto-release trigger |
| **`booking_requests`** | SELECT, INSERT, UPDATE, DELETE | SELECT, UPDATE | ₹150 visit fee, decision reconciliation triggers |
| **`financial_disbursements`** | SELECT, INSERT, UPDATE, DELETE | SELECT, UPDATE | Row-locked `owner_bank_accounts` validation on creation and processing |
| **`ledger_transactions`** | SELECT, INSERT | SELECT, INSERT | DRAFT status mutable; POSTED and REVERSED strictly immutable |
| **`ledger_entries`** | SELECT, INSERT | SELECT, INSERT | Immutable trigger; `transaction_id` mutation prohibited |

---

## 3. Statement-Level TRUNCATE Defense

To defend against accidental or malicious mass data destruction, PostgreSQL statement-level triggers are active across all financial, audit, and transactional tables:

```sql
CREATE OR REPLACE FUNCTION prevent_table_truncate()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Security Invariant Violation: Table % is immutable audit/ledger infrastructure. TRUNCATE is strictly forbidden.',
    TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
```

### Protected Tables:
1. `admin_audit_logs`
2. `property_verification_audits`
3. `booking_status_histories`
4. `visit_assignment_histories`
5. `ledger_entries`
6. `ledger_transactions`

---

## 4. Default Privileges Security Policy

To prevent schema drift or accidental privilege leaks during future migrations, PostgreSQL default privileges are explicitly configured:

```sql
ALTER DEFAULT PRIVILEGES FOR ROLE colin_owner IN SCHEMA public 
  REVOKE ALL ON TABLES FROM colin_app_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE colin_migrator IN SCHEMA public 
  REVOKE ALL ON TABLES FROM colin_app_runtime;
```

Any new table created in schema `public` during future migrations will deny access to `colin_app_runtime` until explicitly authorized in migration scripts.

---

## 5. Security Verification Test Evidence

The integration suite (`postgres-integrity.integration.test.ts`) verifies:
- `colin_app_runtime` has `CREATE = false` on schema `public`.
- `colin_app_runtime` has `TRUNCATE = false` on all tables.
- `colin_app_runtime` has `SELECT = false` on `admin_accounts`.
- `colin_app_runtime` has `UPDATE = false` and `DELETE = false` on `ledger_entries`.
- `colin_admin_runtime` has `TRUNCATE = false` on `admin_audit_logs`.
- `colin_migrator` has `CREATE = true` on schema `public`.
