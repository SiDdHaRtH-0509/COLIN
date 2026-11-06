# COLIN Central Database Relationships & Referential Integrity Specification

**Document Version:** 2.2.0 (Phase 4A.2.2.1-R2.1 Critical Integrity Closure Baseline)  
**Status:** SPECIFICATION & REFERENTIAL INTEGRITY ANALYSIS  
**Date:** November 2026  
**Target Engine:** PostgreSQL 16+  
**Scope:** Reconciled Relationship Cardinalities, Referential Actions & Cascade Safety Analysis (54 Models, 13 Modules)  

---

## 1. Referential Integrity Overview

The COLIN database architecture models relationships with explicit referential integrity rules to prevent orphan records, dangling foreign keys, circular dependencies, and catastrophic cascade deletions.

### Referential Action Principles:
1. **`ON DELETE RESTRICT` (Guaranteed Audit & Financial Preservation):**  
   Applied to financial transactions, ledger entries, booking requests, owner profiles, admin accounts, and audit logs. A referenced parent entity cannot be deleted if active financial or audit records exist.
2. **`ON DELETE CASCADE` (Subordinate Lifecycle Dependencies):**  
   Applied strictly to dependent child components that have no business validity without the parent (e.g. `user_profiles`, `property_photos`, `property_amenities`, `property_rules`, `rooms`, `beds`).
3. **`ON DELETE SET NULL` (Historical Continuity on Secondary References):**  
   Applied when a child entity must outlive a parent reference for auditing or historical accountability (e.g., if an administrator account is deactivated, assigned support tickets or volunteer review references are set to NULL while the audit log and ticket resolution notes remain intact).

---

## 2. Comprehensive Relationship Inventory (54 Models)

| Parent Table | Child Table | Relationship | Cardinality | Foreign Key Column | Referential Action | Business Justification & Semantics |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| **`users`** | `user_profiles` | 1:1 | $1 : 0..1$ | `user_id` | `CASCADE` | User profile deleted when user is purged. |
| **`users`** | `user_sessions` | 1:N | $1 : 0..N$ | `user_id` | `CASCADE` | Purging user removes active session tokens. |
| **`users`** | `mfa_credentials` | 1:N | $1 : 0..N$ | `user_id` | `CASCADE` | Purging user removes MFA keys. |
| **`users`** | `mfa_recovery_codes`| 1:N | $1 : 0..N$ | `user_id` | `CASCADE` | Purging user removes backup codes. |
| **`users`** | `password_reset_tokens`| 1:N | $1 : 0..N$ | `user_id` | `CASCADE` | Reset tokens invalid if user is removed. |
| **`admin_accounts`** | `admin_sessions` | 1:N | $1 : 0..N$ | `admin_id` | `CASCADE` | **Task A:** Deleting admin account terminates admin sessions. |
| **`admin_accounts`** | `admin_mfa_credentials`| 1:N | $1 : 0..N$ | `admin_id` | `CASCADE` | **Task A:** Admin TOTP keys deleted with admin account. |
| **`admin_accounts`** | `admin_mfa_recovery_codes`| 1:N | $1 : 0..N$ | `admin_id` | `CASCADE` | **Task A:** Admin backup codes deleted with admin account. |
| **`admin_accounts`** | `admin_user_roles` | N:M | $1 : 0..N$ | `admin_id` | `CASCADE` | Removing an admin account unlinks role assignments. |
| **`admin_roles`** | `admin_user_roles` | N:M | $1 : 0..N$ | `role_id` | `CASCADE` | Removing a role unlinks admin users. |
| **`admin_roles`** | `admin_role_permissions`| N:M | $1 : 0..N$ | `role_id` | `CASCADE` | Role permissions unlinked on role delete. |
| **`admin_permissions`**| `admin_role_permissions`| N:M | $1 : 0..N$ | `permission_id`| `CASCADE` | Permission unlinked on permission delete. |
| **`users`** | `student_profiles` | 1:1 | $1 : 0..1$ | `user_id` | `CASCADE` | User can embody a student persona. |
| **`student_profiles`**| `student_verification_documents`| 1:N | $1 : 0..N$ | `student_id` | `CASCADE` | KYC documents depend on student profile. |
| **`student_profiles`**| `student_preferences` | 1:1 | $1 : 0..1$ | `student_id` | `CASCADE` | Housing preferences depend on student profile. |
| **`student_profiles`**| `student_saved_properties` | N:M | $1 : 0..N$ | `student_id` | `CASCADE` | Wishlist items unlinked on student profile delete. |
| **`properties`** | `student_saved_properties` | N:M | $1 : 0..N$ | `property_id` | `CASCADE` | Wishlist items unlinked on property delete. |
| **`student_profiles`**| `student_search_histories` | 1:N | $1 : 0..N$ | `student_id` | `CASCADE` | Search histories depend on student profile. |
| **`users`** | `owner_profiles` | 1:1 | $1 : 0..1$ | `user_id` | `CASCADE` | User can embody a host persona. |
| **`owner_profiles`** | `owner_kyc_documents` | 1:N | $1 : 0..N$ | `owner_id` | `CASCADE` | Host deeds and trade licenses depend on owner profile. |
| **`owner_profiles`** | `owner_bank_accounts` | 1:N | $1 : 0..N$ | `owner_id` | `CASCADE` | Host bank accounts depend on owner profile. |
| **`owner_profiles`** | `properties` | 1:N | $1 : 0..N$ | `owner_id` | `RESTRICT` | **Critical:** Cannot delete host with active properties. |
| **`properties`** | `property_photos` | 1:N | $1 : 0..8$ | `property_id` | `CASCADE` | **Task G:** Photos belong to parent property (max 8). |
| **`properties`** | `property_amenities` | N:M | $1 : 0..N$ | `property_id` | `CASCADE` | Amenity junction unlinked on property delete. |
| **`properties`** | `property_rules` | 1:N | $1 : 0..N$ | `property_id` | `CASCADE` | House rules destroyed on property delete. |
| **`properties`** | `property_verification_audits`| 1:N | $1 : 0..N$ | `property_id` | `CASCADE` | Audits unlinked on property delete. |
| **`admin_accounts`** | `property_verification_audits`| 1:N | $1 : 0..N$ | `admin_id` | `RESTRICT` | **Task H:** Cannot delete admin who signed audit logs. |
| **`properties`** | `rooms` | 1:N | $1 : 0..N$ | `property_id` | `CASCADE` | Rooms belong to parent property. |
| **`rooms`** | `beds` | 1:N | $1 : 1..N$ | `room_id` | `CASCADE` | Beds belong to parent room. |
| **`beds`** | `bed_reservations` | 1:N | $1 : 0..N$ | `bed_id` | `RESTRICT` | **Task D:** Cannot delete bed with active reservation. |
| **`booking_requests`**| `bed_reservations` | 1:N | $1 : 0..N$ | `booking_id` | `SET NULL` | **Task D:** Reservation preserved if booking draft cancelled. |
| **`student_profiles`**| `bed_reservations` | 1:N | $1 : 0..N$ | `student_id` | `RESTRICT` | **Task D:** Cannot delete student with active bed hold. |
| **`student_profiles`**| `booking_requests` | 1:N | $1 : 0..N$ | `student_id` | `RESTRICT` | **Critical:** Cannot delete student with booking history. |
| **`properties`** | `booking_requests` | 1:N | $1 : 0..N$ | `property_id` | `RESTRICT` | **Critical:** Cannot delete property with booking history. |
| **`beds`** | `booking_requests` | 1:N | $1 : 0..N$ | `bed_id` | `SET NULL` | Booking inquiry bed set to null if bed unlisted. |
| **`booking_requests`**| `booking_status_histories` | 1:N | $1 : 0..N$ | `booking_id` | `CASCADE` | **Task C:** Status history belongs to booking lifecycle. |
| **`users`** | `booking_status_histories` | 1:N | $1 : 0..N$ | `changed_by_user_id`| `SET NULL`| Historical actor preserved if user deactivated. |
| **`admin_accounts`** | `booking_status_histories` | 1:N | $1 : 0..N$ | `changed_by_admin_id`| `SET NULL`| Historical actor preserved if admin deactivated. |
| **`booking_requests`**| `visit_slots` | 1:1 | $1 : 0..1$ | `booking_id` | `CASCADE` | Visit slot belongs to booking request. |
| **`booking_requests`**| `visit_availability_options`| 1:N | $1 : 0..N$ | `booking_id` | `CASCADE` | **Task C:** Proposed availability belongs to booking. |
| **`booking_requests`**| `visit_coordinations` | 1:1 | $1 : 0..1$ | `booking_id` | `CASCADE` | Coordination belongs to booking request. |
| **`volunteer_profiles`**| `visit_coordinations` | 1:N | $1 : 0..N$ | `volunteer_id`| `SET NULL` | Coordination preserved if volunteer unassigned. |
| **`booking_requests`**| `visit_decisions` | 1:1 | $1 : 0..1$ | `booking_id` | `CASCADE` | **Task C:** Student decision belongs to booking request. |
| **`booking_requests`**| `visit_reminders` | 1:N | $1 : 0..N$ | `booking_id` | `CASCADE` | **Task C:** Reminders belong to booking request. |
| **`booking_requests`**| `visit_assignment_histories`| 1:N | $1 : 0..N$ | `booking_id` | `CASCADE` | **Task C:** Assignment log belongs to booking request. |
| **`volunteer_profiles`**| `visit_assignment_histories`| 1:N | $1 : 0..N$ | `volunteer_id`| `CASCADE` | Assignment log belongs to volunteer. |
| **`admin_accounts`** | `visit_assignment_histories`| 1:N | $1 : 0..N$ | `assigned_by_admin_id`| `SET NULL`| Historical dispatcher preserved. |
| **`booking_requests`**| `visit_feedbacks` | 1:1 | $1 : 0..1$ | `booking_id` | `CASCADE` | Review belongs to booking request. |
| **`student_profiles`**| `visit_feedbacks` | 1:N | $1 : 0..N$ | `student_id` | `CASCADE` | Feedback belongs to student. |
| **`users`** | `volunteer_profiles` | 1:1 | $1 : 0..1$ | `user_id` | `CASCADE` | User can embody a volunteer persona. |
| **`volunteer_profiles`**| `volunteer_assignments`| 1:N | $1 : 0..N$ | `volunteer_id`| `CASCADE` | Assignments belong to volunteer. |
| **`properties`** | `volunteer_assignments`| 1:N | $1 : 0..N$ | `property_id` | `SET NULL` | **Task F:** Assignment preserved if property unlisted. |
| **`booking_requests`**| `volunteer_assignments`| 1:N | $1 : 0..N$ | `booking_id` | `SET NULL` | **Task F:** Assignment preserved if booking archived. |
| **`admin_accounts`** | `volunteer_assignments`| 1:N | $1 : 0..N$ | `assigned_by_admin_id`| `SET NULL`| Historical assigner preserved. |
| **`volunteer_profiles`**| `volunteer_reviews` | 1:N | $1 : 0..N$ | `volunteer_id`| `CASCADE` | Reviews belong to volunteer. |
| **`admin_accounts`** | `volunteer_reviews` | 1:N | $1 : 0..N$ | `reviewed_by_admin_id`| `SET NULL`| **Task F:** Review preserved if admin deactivated. |
| **`users`** | `financial_payments` | 1:N | $1 : 0..N$ | `payer_user_id`| `RESTRICT` | **Task F:** Cannot delete user with payment records. |
| **`booking_requests`**| `financial_payments` | 1:N | $1 : 0..N$ | `booking_id` | `SET NULL` | Payment record preserved if booking purged. |
| **`ledger_transactions`**| `ledger_entries` | 1:N | $1 : 2..N$ | `transaction_id`| `RESTRICT` | **Task E:** Double-entry lines cannot be orphaned. |
| **`ledger_accounts`** | `ledger_entries` | 1:N | $1 : 0..N$ | `account_id` | `RESTRICT` | **Task E:** Chart of accounts cannot delete active accounts. |
| **`financial_payments`**| `ledger_transactions`| 1:N | $1 : 0..N$ | `payment_id` | `RESTRICT` | **Task E:** Cannot delete payment with ledger postings. |
| **`financial_disbursements`**| `ledger_transactions`| 1:N | $1 : 0..N$ | `disbursement_id`| `RESTRICT`| **Task E:** Cannot delete disbursement with ledger postings. |
| **`booking_requests`**| `ledger_transactions`| 1:N | $1 : 0..N$ | `booking_id` | `RESTRICT` | **Task E:** Cannot delete booking with ledger postings. |
| **`owner_profiles`** | `financial_disbursements`| 1:N | $1 : 0..N$ | `owner_id` | `RESTRICT` | **Task F:** Cannot delete owner with disbursement records. |
| **`owner_bank_accounts`**| `financial_disbursements`| 1:N | $1 : 0..N$ | `bank_account_id`| `RESTRICT`| **Task F:** Cannot delete bank account with disbursement records. |
| **`owner_profiles`** | `owner_subscriptions` | 1:N | $1 : 0..N$ | `owner_id` | `CASCADE` | Subscriptions belong to owner. |
| **`student_profiles`**| `student_subscriptions`| 1:N | $1 : 0..N$ | `student_id` | `CASCADE` | Subscriptions belong to student. |
| **`owner_profiles`** | `sponsorship_campaigns`| 1:N | $1 : 0..N$ | `owner_id` | `CASCADE` | Campaigns belong to owner. |
| **`properties`** | `sponsorship_campaigns`| 1:N | $1 : 0..N$ | `property_id` | `CASCADE` | Campaigns belong to property. |
| **`users`** | `system_notifications` | 1:N | $1 : 0..N$ | `user_id` | `CASCADE` | Notifications belong to user. |
| **`users`** | `support_tickets` | 1:N | $1 : 0..N$ | `created_by_user_id`| `RESTRICT` | Cannot delete user with open support disputes. |
| **`admin_accounts`** | `support_tickets` | 1:N | $1 : 0..N$ | `assigned_admin_id`| `SET NULL`| Ticket preserved if assigned admin deactivated. |
| **`booking_requests`**| `support_tickets` | 1:N | $1 : 0..N$ | `booking_id` | `SET NULL` | Ticket preserved if booking archived. |
| **`properties`** | `support_tickets` | 1:N | $1 : 0..N$ | `property_id` | `SET NULL` | Ticket preserved if property unlisted. |
| **`support_tickets`** | `support_messages` | 1:N | $1 : 1..N$ | `ticket_id` | `CASCADE` | Messages belong to ticket thread. |
| **`users`** | `support_messages` | 1:N | $1 : 0..N$ | `sender_user_id`| `SET NULL`| Historical sender preserved. |
| **`admin_accounts`** | `support_messages` | 1:N | $1 : 0..N$ | `sender_admin_id`| `SET NULL`| **Task F:** Historical sender admin preserved. |
| **`admin_accounts`** | `admin_audit_logs` | 1:N | $1 : 0..N$ | `admin_id` | `SET NULL` | **Task H:** Audit trail preserved if admin removed. |
