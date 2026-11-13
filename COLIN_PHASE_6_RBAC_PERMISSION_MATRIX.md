# COLIN — PHASE 6 RBAC PERMISSION MATRIX
## Comprehensive Role-Based Access Control Architecture & Capability Enforcement

**Platform:** COLIN Student Accommodation Platform  
**Target Environments:** Staging & Production  
**Architecture:** Multi-Tier RBAC with Server-Side Middleware Enforcement  
**Report Date:** November 2026  
**Status:** FULL PASS — PRODUCTION ENFORCED  

---

## 1. Overview & Architecture

COLIN implements a strict, server-side Role-Based Access Control (RBAC) model ensuring that every administrative operation, customer-facing action, and cross-tenant interaction is rigorously authorized before reaching business logic or database layers.

### Architectural Core Principles
1. **Zero Client Trust:** Frontend UI visibility toggles are cosmetic only; authorization is enforced authoritatively on the server via `requireAuth`, `requireAdmin`, and `requireAdminPermission(...)`.
2. **Principle of Least Privilege:** Every administrative role receives only the exact capabilities necessary to execute its operational domain.
3. **Cross-Tenant Isolation:** Resource ownership is validated at the SQL query level (e.g., `WHERE owner_id = :authenticatedUserId`), guaranteeing that hosts cannot view or mutate another host's properties, bookings, or financial disbursements.
4. **Audit Trail Accountability:** Any administrative action involving state changes or sensitive data inspection creates an append-only, tamper-proof record in `admin_audit_logs`.

---

## 2. Platform Role Hierarchy

COLIN establishes 9 primary platform roles across two discrete identity stores:

### 2.1 Customer Identities (`users` table)
- **`STUDENT`:** Discovers verified accommodations, schedules visits, pays visit pass fees, manages KYC documents, books rooms, and raises support tickets.
- **`OWNER`:** Lists properties and rooms, manages availability, reviews scheduled visits, manages bank accounts, and receives payouts.

### 2.2 Administrative Identities (`admin_accounts` table)
COLIN defines 7 discrete administrative tiers:

| Tier | Role Code | Role Name | Operational Scope |
| :---: | :--- | :--- | :--- |
| **T-1** | `SUPER_ADMIN` | Super Administrator | Root administrative authority; security configuration, admin provisioning, role assignments, financial disbursements, and audit oversight. |
| **T-2** | `OPERATIONS_ADMIN` | Operations Administrator | Platform workflow management, booking lifecycle interventions, visit coordination, and officer routing. |
| **T-3** | `VERIFICATION_MANAGER`| Verification Manager | Physical property inspection, safety audits, verification document review, and property approval/rejection. |
| **T-4** | `FINANCE_ADMIN` | Finance Administrator | Double-entry ledger reconciliation, payment gateway audits, refund authorizations, and financial reporting. |
| **T-5** | `STUDENT_SUPPORT` | Student Support Specialist | Student grievance resolution, visit coordination assistance, student profile support, and ticket management. |
| **T-6** | `OWNER_SUPPORT` | Owner Support Specialist | Host onboarding, listing creation assistance, KYC initial check, and host ticket resolution. |
| **T-7** | `MARKETING_ADMIN` | Marketing Administrator | Promotional campaigns, university partnerships, student referral programs, and banner curation. |

---

## 3. Comprehensive Administrative Capability Matrix

Below is the definitive capability-to-role assignment matrix enforced by the COLIN backend:

| Capability / Permission Code | SUPER ADMIN | OPERATIONS ADMIN | VERIFICATION MANAGER | FINANCE ADMIN | STUDENT SUPPORT | OWNER SUPPORT | MARKETING ADMIN |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **SYSTEM & ADMIN MANAGEMENT** | | | | | | | |
| `SYSTEM_CONFIGURATION` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `MANAGE_ADMIN_USERS` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `CONFIGURE_MFA` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `VIEW_AUDIT_LOGS` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `VIEW_ANALYTICS` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| `EXPORT_REPORTS` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **PROPERTY & VERIFICATION** | | | | | | | |
| `VIEW_PROPERTIES` | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| `APPROVE_PROPERTY` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `REJECT_PROPERTY` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `SUSPEND_PROPERTY` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `RESTORE_PROPERTY` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `ASSIGN_VERIFICATION_OFFICER`| ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `COMPLETE_VERIFICATION_AUDIT`| ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **FINANCE & LEDGER** | | | | | | | |
| `VIEW_FINANCIAL_LEDGER` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `PROCESS_REFUNDS` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `DISBURSE_FUNDS` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `RECONCILE_ACCOUNTS` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `VIEW_BOOKINGS` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| `CANCEL_BOOKING_FORCE` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **USER & SUPPORT OPERATIONS** | | | | | | | |
| `VIEW_STUDENT_PROFILES` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `VIEW_STUDENT_PROFILES_UNMASKED`| ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `SUSPEND_STUDENT_ACCOUNT` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `RESOLVE_STUDENT_TICKETS` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `VIEW_OWNER_PROFILES` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `VIEW_OWNER_PROFILES_UNMASKED`| ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `SUSPEND_OWNER_ACCOUNT` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `RESOLVE_OWNER_TICKETS` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **GROWTH & MARKETING** | | | | | | | |
| `MANAGE_MARKETING_CAMPAIGNS`| ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `MANAGE_PROMOTIONS` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 4. Server-Side Middleware Enforcement

### 4.1 Granular Capability Guard
Every protected route passes through `requireAdminPermission(...)`:

```typescript
// src/server/middleware/adminPermission.ts
export function requireAdminPermission(permission: AdminPermission) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const admin = req.admin;
    if (!admin) {
      throw new UnauthorizedError('Administrative authentication required.');
    }

    // SUPER_ADMIN holds all administrative capabilities by design
    if (admin.roles.includes('SUPER_ADMIN')) {
      return next();
    }

    const hasPermission = admin.permissions?.includes(permission);
    if (!hasPermission) {
      throw new ForbiddenError(
        `Access denied. Requires '${permission}' permission.`
      );
    }

    return next();
  };
}
```

### 4.2 Endpoint Protection Mapping

| Endpoint | HTTP Method | Required Permission |
| :--- | :---: | :--- |
| `/api/v1/admin/properties/pending` | `GET` | `VIEW_PROPERTIES` |
| `/api/v1/admin/properties/:id/approve` | `POST` | `APPROVE_PROPERTY` |
| `/api/v1/admin/properties/:id/reject` | `POST` | `REJECT_PROPERTY` |
| `/api/v1/admin/properties/:id/suspend` | `POST` | `SUSPEND_PROPERTY` |
| `/api/v1/admin/properties/:id/restore` | `POST` | `RESTORE_PROPERTY` |
| `/api/v1/admin/bookings/finance-summary` | `GET` | `VIEW_FINANCIAL_LEDGER` |
| `/api/v1/admin/students/:id/unmask` | `POST` | `VIEW_STUDENT_PROFILES_UNMASKED` |
| `/api/v1/admin/owners/:id/unmask` | `POST` | `VIEW_OWNER_PROFILES_UNMASKED` |

---

## 5. Cross-Tenant Customer Isolation

### 5.1 Defense Against Insecure Direct Object References (IDOR)
To guarantee strict tenant isolation between property owners:
1. **Property Ownership Scoping:** Any request to update, view drafts, or submit a property for verification asserts that the property's `owner_id` strictly matches the authenticated owner's `user.id`.
```sql
SELECT * FROM properties WHERE id = :propertyId AND owner_id = :authenticatedUserId;
```
2. **Cross-Tenant Mutation Rejection:** If Owner B submits property ID belonging to Owner A, the server returns `403 Forbidden` (`FORBIDDEN_OPERATION`):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN_OPERATION",
    "message": "You are not authorized to modify this property listing."
  }
}
```

---

## 6. Verification & Automated Test Evidence

Verified in `src/test/security/phase6_security_hardening.integration.test.ts`:

| Test ID | Test Scenario | Verified Outcome | Status |
| :--- | :--- | :--- | :--- |
| **SEC-4.1** | Cross-tenant property submission rejection | Owner B attempting to submit Owner A's property returns 403 Forbidden | PASS |
| **SEC-4.2** | Unauthorized user accessing admin endpoints | Student session calling `/admin/metrics` returns 401/403 Forbidden | PASS |
| **SEC-4.3** | Granular admin capability enforcement (Approve Property) | Super Admin and Verification Manager succeed (200 OK); unauthorized tiers rejected | PASS |
| **SEC-4.4** | Granular admin capability enforcement (Financial Ledger) | Finance Admin succeeds (200 OK); non-financial tiers receive 403 Forbidden | PASS |

---

## 7. Conclusion
The COLIN RBAC architecture enforces multi-tiered role segregation and fine-grained capability checks at every API layer. Cross-tenant isolation eliminates IDOR vulnerabilities, and all administrative actions are strictly validated before execution.
