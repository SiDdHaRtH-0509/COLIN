# COLIN Central Database Data Dictionary

**Document Version:** 2.2.0 (Phase 4A.2.2.1-R2.1 Critical Integrity Closure Baseline)  
**Status:** SPECIFICATION & SCHEMA DICTIONARY (SYNCHRONIZED WITH PRISMA SCHEMA & TEST SUITE)  
**Date:** November 2026  
**Target Engine:** PostgreSQL 16+  
**Standard Naming Conventions:**  
- Tables: `snake_case`, pluralized (e.g. `users`, `properties`, `booking_requests`)
- Columns: `snake_case` (e.g. `created_at`, `booking_fee_amount`)
- Primary Keys: `id` (`UUID DEFAULT gen_random_uuid()`) or composite PKs
- Foreign Keys: `<singular_table>_id` (e.g. `property_id`, `user_id`)
- Currency: `NUMERIC(10, 2)` (Precise INR representation)
- Timestamps: `TIMESTAMPTZ(6)` (UTC with microsecond precision)

---

## 1. Module A: Identity & Authentication (14 Entities)

### 1.1 `users`
Central user registry for students, property hosts, and platform volunteers.
- `id` (UUID, PK)
- `email` (VARCHAR(255), UNIQUE, Normalized Lowercase)
- `phone` (VARCHAR(20), UNIQUE, E.164 Format)
- `password_hash` (VARCHAR(255), Argon2id)
- `primary_role` (ENUM UserRoleType: STUDENT, OWNER, VOLUNTEER, ADMIN, DEFAULT STUDENT)
- `status` (ENUM UserStatus: ACTIVE, INACTIVE, SUSPENDED, DELETED, DEFAULT ACTIVE)
- `is_email_verified` (BOOLEAN, DEFAULT FALSE)
- `is_phone_verified` (BOOLEAN, DEFAULT FALSE)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- `last_login_at` (TIMESTAMPTZ, NULL)

### 1.2 `user_profiles`
General personal profile details.
- `user_id` (UUID, PK, FK -> users.id ON DELETE CASCADE)
- `first_name` (VARCHAR(100))
- `last_name` (VARCHAR(100))
- `avatar_url` (VARCHAR(512), NULL)
- `gender` (VARCHAR(20), NULL)
- `date_of_birth` (DATE, NULL)
- `city` (VARCHAR(100), NULL)
- `state` (VARCHAR(100), NULL)
- `pincode` (VARCHAR(10), NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 1.3 `admin_accounts`
Segregated internal administrative personnel accounts.
- `id` (UUID, PK)
- `username` (VARCHAR(50), UNIQUE, Normalized Lowercase)
- `email` (VARCHAR(255), UNIQUE, Normalized Lowercase)
- `full_name` (VARCHAR(150))
- `password_hash` (VARCHAR(255), Argon2id)
- `status` (ENUM AdminAccountStatus: ACTIVE, SUSPENDED, DEACTIVATED, INVITED, DEFAULT INVITED)
- `is_mfa_enforced` (BOOLEAN, DEFAULT TRUE)
- `failed_login_attempts` (INT, DEFAULT 0)
- `locked_until` (TIMESTAMPTZ, NULL)
- `last_login_at` (TIMESTAMPTZ, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 1.4 `admin_sessions` (Remediated Task A)
Isolated administrative sessions table.
- `id` (UUID, PK)
- `admin_id` (UUID, FK -> admin_accounts.id ON DELETE CASCADE)
- `token_hash` (VARCHAR(255), UNIQUE, SHA-256)
- `ip_address` (VARCHAR(45), NULL)
- `user_agent` (TEXT, NULL)
- `expires_at` (TIMESTAMPTZ)
- `is_revoked` (BOOLEAN, DEFAULT FALSE)
- `last_activity_at` (TIMESTAMPTZ, DEFAULT NOW())
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 1.5 `admin_mfa_credentials` (Remediated Task A)
Dedicated administrator TOTP credentials.
- `id` (UUID, PK)
- `admin_id` (UUID, FK -> admin_accounts.id ON DELETE CASCADE)
- `mfa_type` (ENUM MfaType: TOTP, SMS, EMAIL, DEFAULT TOTP)
- `secret_encrypted` (TEXT, AES-256-GCM)
- `is_enabled` (BOOLEAN, DEFAULT FALSE)
- `last_used_at` (TIMESTAMPTZ, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- *Constraint:* `UNIQUE (admin_id, mfa_type)`

### 1.6 `admin_mfa_recovery_codes` (Remediated Task A)
Single-use hashed recovery backup codes for administrators.
- `id` (UUID, PK)
- `admin_id` (UUID, FK -> admin_accounts.id ON DELETE CASCADE)
- `code_hash` (VARCHAR(255), HMAC-SHA-256)
- `is_used` (BOOLEAN, DEFAULT FALSE)
- `used_at` (TIMESTAMPTZ, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 1.7 `admin_roles`
Master administrative roles catalog.
- `id` (UUID, PK)
- `code` (VARCHAR(50), UNIQUE)
- `name` (VARCHAR(100))
- `description` (TEXT, NULL)
- `is_system_role` (BOOLEAN, DEFAULT FALSE)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 1.8 `admin_permissions`
Granular operation and capability definitions.
- `id` (UUID, PK)
- `code` (VARCHAR(100), UNIQUE)
- `module` (VARCHAR(50))
- `action` (VARCHAR(50))
- `description` (TEXT, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 1.9 `admin_role_permissions`
Junction mapping roles to permissions.
- `role_id` (UUID, FK -> admin_roles.id ON DELETE CASCADE)
- `permission_id` (UUID, FK -> admin_permissions.id ON DELETE CASCADE)
- `granted_at` (TIMESTAMPTZ, DEFAULT NOW())
- *Primary Key:* `(role_id, permission_id)`

### 1.10 `admin_user_roles`
Junction assigning roles to admin accounts.
- `admin_id` (UUID, FK -> admin_accounts.id ON DELETE CASCADE)
- `role_id` (UUID, FK -> admin_roles.id ON DELETE CASCADE)
- `assigned_at` (TIMESTAMPTZ, DEFAULT NOW())
- *Primary Key:* `(admin_id, role_id)`

### 1.11 `user_sessions`
Active client session tokens for normal users.
- `id` (UUID, PK)
- `user_id` (UUID, FK -> users.id ON DELETE CASCADE)
- `token_hash` (VARCHAR(255), UNIQUE, SHA-256)
- `ip_address` (VARCHAR(45), NULL)
- `user_agent` (TEXT, NULL)
- `expires_at` (TIMESTAMPTZ)
- `is_revoked` (BOOLEAN, DEFAULT FALSE)
- `last_activity_at` (TIMESTAMPTZ, DEFAULT NOW())
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 1.12 `mfa_credentials`
TOTP secrets for regular users.
- `id` (UUID, PK)
- `user_id` (UUID, FK -> users.id ON DELETE CASCADE)
- `mfa_type` (ENUM MfaType)
- `secret_encrypted` (TEXT, AES-256-GCM)
- `is_enabled` (BOOLEAN, DEFAULT FALSE)
- `last_used_at` (TIMESTAMPTZ, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- *Constraint:* `UNIQUE (user_id, mfa_type)`

### 1.13 `mfa_recovery_codes`
Hashed recovery codes for regular users.
- `id` (UUID, PK)
- `user_id` (UUID, FK -> users.id ON DELETE CASCADE)
- `code_hash` (VARCHAR(255), HMAC-SHA-256)
- `is_used` (BOOLEAN, DEFAULT FALSE)
- `used_at` (TIMESTAMPTZ, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 1.14 `password_reset_tokens`
Time-limited password reset tokens.
- `id` (UUID, PK)
- `user_id` (UUID, FK -> users.id ON DELETE CASCADE)
- `token_hash` (VARCHAR(255), UNIQUE)
- `expires_at` (TIMESTAMPTZ)
- `is_used` (BOOLEAN, DEFAULT FALSE)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

---

## 2. Module B: Student Management (5 Entities)

### 2.1 `student_profiles`
Academic credentials and student verification badge.
- `user_id` (UUID, PK, FK -> users.id ON DELETE CASCADE)
- `college_name` (VARCHAR(255))
- `course` (VARCHAR(150), NULL)
- `batch_year` (INT, NULL)
- `student_id_card_url` (VARCHAR(512), NULL)
- `verification_status` (ENUM StudentVerificationStatus: UNVERIFIED, PENDING_REVIEW, VERIFIED, REJECTED, DEFAULT UNVERIFIED)
- `verified_at` (TIMESTAMPTZ, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 2.2 `student_verification_documents`
Student government and college identification proofs.
- `id` (UUID, PK)
- `student_id` (UUID, FK -> student_profiles.user_id ON DELETE CASCADE)
- `document_type` (ENUM IdDocumentType: COLLEGE_ID, AADHAAR, PASSPORT, DRIVING_LICENSE, VOTER_ID)
- `document_url` (VARCHAR(512))
- `document_number_masked` (VARCHAR(50), NULL)
- `status` (ENUM StudentVerificationStatus, DEFAULT PENDING_REVIEW)
- `rejection_reason` (TEXT, NULL)
- `uploaded_at` (TIMESTAMPTZ, DEFAULT NOW())
- `verified_at` (TIMESTAMPTZ, NULL)

### 2.3 `student_preferences`
Accommodation discovery filters and lifestyle habits.
- `student_id` (UUID, PK, FK -> student_profiles.user_id ON DELETE CASCADE)
- `preferred_location` (VARCHAR(255), NULL)
- `max_budget` (NUMERIC(10, 2), NULL)
- `preferred_room_type` (ENUM RoomType, NULL)
- `food_preference` (VARCHAR(50), NULL)
- `lifestyle_habits` (JSONB, NULL)
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 2.4 `student_saved_properties`
Student bookmarked listings.
- `student_id` (UUID, FK -> student_profiles.user_id ON DELETE CASCADE)
- `property_id` (UUID, FK -> properties.id ON DELETE CASCADE)
- `saved_at` (TIMESTAMPTZ, DEFAULT NOW())
- *Primary Key:* `(student_id, property_id)`

### 2.5 `student_search_histories`
Search audit and analytics records.
- `id` (UUID, PK)
- `student_id` (UUID, FK -> student_profiles.user_id ON DELETE CASCADE)
- `search_query` (VARCHAR(255), NULL)
- `filters_applied` (JSONB, NULL)
- `results_count` (INT, DEFAULT 0)
- `searched_at` (TIMESTAMPTZ, DEFAULT NOW())

---

## 3. Module C: Owner Management (3 Entities)

### 3.1 `owner_profiles`
Property host business identity and partnership tier.
- `user_id` (UUID, PK, FK -> users.id ON DELETE CASCADE)
- `business_name` (VARCHAR(255), NULL)
- `business_structure` (ENUM OwnerBusinessStructure: INDIVIDUAL, PROPRIETORSHIP, PARTNERSHIP, LLP, PRIVATE_LIMITED, DEFAULT INDIVIDUAL)
- `owner_tier` (ENUM OwnerTier: STANDARD, VERIFIED_PARTNER, PREMIUM, DEFAULT STANDARD)
- `pan_masked` (VARCHAR(20), NULL)
- `gstin_masked` (VARCHAR(30), NULL)
- `verification_status` (ENUM OwnerVerificationStatus: UNVERIFIED, PENDING_DOCS, IN_REVIEW, VERIFIED, REJECTED, SUSPENDED, DEFAULT UNVERIFIED)
- `verified_at` (TIMESTAMPTZ, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 3.2 `owner_kyc_documents`
Deeds, utility bills, and trade licenses.
- `id` (UUID, PK)
- `owner_id` (UUID, FK -> owner_profiles.user_id ON DELETE CASCADE)
- `document_type` (VARCHAR(50))
- `document_url` (VARCHAR(512))
- `status` (ENUM OwnerVerificationStatus, DEFAULT PENDING_DOCS)
- `rejection_reason` (TEXT, NULL)
- `uploaded_at` (TIMESTAMPTZ, DEFAULT NOW())
- `reviewed_at` (TIMESTAMPTZ, NULL)

### 3.3 `owner_bank_accounts`
Disbursement payout bank accounts.
- `id` (UUID, PK)
- `owner_id` (UUID, FK -> owner_profiles.user_id ON DELETE CASCADE)
- `bank_name` (VARCHAR(150))
- `account_number_masked` (VARCHAR(50))
- `ifsc_code` (VARCHAR(20))
- `account_holder_name` (VARCHAR(150))
- `is_verified` (BOOLEAN, DEFAULT FALSE)
- `is_primary` (BOOLEAN, DEFAULT TRUE)
- `is_active` (BOOLEAN, DEFAULT TRUE)
- `gateway_beneficiary_id` (VARCHAR(100), NULL)
- `beneficiary_token_encrypted` (TEXT, NULL)
- `verification_status` (VARCHAR(30), DEFAULT 'PENDING')
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- *Custom Constraint:* Partial unique index ensures at most one active primary bank account per owner (`WHERE is_active = TRUE AND is_primary = TRUE`). Payouts require `is_verified = TRUE`.

---

## 4. Module D: Property Management (5 Entities)

### 4.1 `properties`
Verified student accommodations.
- `id` (UUID, PK)
- `owner_id` (UUID, FK -> owner_profiles.user_id ON DELETE RESTRICT)
- `name` (VARCHAR(255))
- `slug` (VARCHAR(255), UNIQUE)
- `property_type` (ENUM PropertyType: PG, HOSTEL, RENTAL_ROOM, SHARED_FLAT, COLIVING)
- `gender_policy` (ENUM PropertyGenderPolicy: BOYS_ONLY, GIRLS_ONLY, COED)
- `address_line1` (VARCHAR(255))
- `address_line2` (VARCHAR(255), NULL)
- `landmark` (VARCHAR(150), NULL)
- `city` (VARCHAR(100))
- `state` (VARCHAR(100))
- `pincode` (VARCHAR(10))
- `latitude` (NUMERIC(10, 7), NULL)
- `longitude` (NUMERIC(10, 7), NULL)
- `nearest_campus` (VARCHAR(255), NULL)
- `distance_to_campus_km` (NUMERIC(5, 2), NULL)
- `verification_status` (ENUM PropertyVerificationStatus: DRAFT, SUBMITTED, ASSIGNED_VISIT, PHYSICALLY_INSPECTED, VERIFIED, REJECTED, DELISTED, DEFAULT DRAFT)
- `occupancy_status` (ENUM PropertyOccupancyStatus: AVAILABLE, PARTIALLY_BOOKED, FULLY_BOOKED, MAINTENANCE, DEFAULT AVAILABLE)
- `description` (TEXT, NULL)
- `total_rooms` (INT, DEFAULT 0)
- `total_beds` (INT, DEFAULT 0)
- `available_beds` (INT, DEFAULT 0)
- `is_featured` (BOOLEAN, DEFAULT FALSE)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 4.2 `property_photos` (Remediated Task G)
Listing photographs.
- `id` (UUID, PK)
- `property_id` (UUID, FK -> properties.id ON DELETE CASCADE)
- `photo_storage_url` (VARCHAR(512))
- `thumbnail_url` (VARCHAR(512), NULL)
- `caption` (VARCHAR(150), NULL)
- `display_order` (INT, DEFAULT 0)
- `is_cover` (BOOLEAN, DEFAULT FALSE)
- `file_size_bytes` (INT, NULL)
- `mime_type` (VARCHAR(30), NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- *Custom Constraints:* Single cover photo (`is_cover=true` unique), unique `(property_id, display_order)`, max 8 per property trigger.

### 4.3 `property_amenities`
Offered property amenities checklist.
- `id` (UUID, PK)
- `property_id` (UUID, FK -> properties.id ON DELETE CASCADE)
- `amenity_code` (VARCHAR(50))
- `name` (VARCHAR(100))
- `is_available` (BOOLEAN, DEFAULT TRUE)
- *Constraint:* `UNIQUE (property_id, amenity_code)`

### 4.4 `property_rules`
House regulations and curfew policies.
- `id` (UUID, PK)
- `property_id` (UUID, FK -> properties.id ON DELETE CASCADE)
- `rule_text` (VARCHAR(255))
- `display_order` (INT, DEFAULT 0)

### 4.5 `property_verification_audits`
Physical audit records by COLIN personnel.
- `id` (UUID, PK)
- `property_id` (UUID, FK -> properties.id ON DELETE CASCADE)
- `admin_id` (UUID, FK -> admin_accounts.id ON DELETE RESTRICT)
- `previous_status` (ENUM PropertyVerificationStatus)
- `new_status` (ENUM PropertyVerificationStatus)
- `inspection_notes` (TEXT, NULL)
- `checklist` (JSONB, NULL)
- `verified_at` (TIMESTAMPTZ, DEFAULT NOW())
- *Security:* Append-only via trigger.

---

## 5. Module E: Room & Bed Inventory (3 Entities)

### 5.1 `rooms`
Physical accommodation rooms.
- `id` (UUID, PK)
- `property_id` (UUID, FK -> properties.id ON DELETE CASCADE)
- `room_number` (VARCHAR(50))
- `floor_number` (INT, NULL)
- `room_type` (ENUM RoomType: SINGLE, DOUBLE_SHARING, TRIPLE_SHARING, FOUR_SHARING, DORMITORY)
- `base_monthly_rent` (NUMERIC(10, 2))
- `security_deposit` (NUMERIC(10, 2))
- `total_beds` (INT, DEFAULT 1)
- `occupied_beds` (INT, DEFAULT 0)
- `has_attached_washroom` (BOOLEAN, DEFAULT FALSE)
- `has_balcony` (BOOLEAN, DEFAULT FALSE)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- *Constraint:* `UNIQUE (property_id, room_number)`

### 5.2 `beds`
Discrete bed slots.
- `id` (UUID, PK)
- `room_id` (UUID, FK -> rooms.id ON DELETE CASCADE)
- `bed_label` (VARCHAR(20))
- `status` (ENUM BedStatus: AVAILABLE, RESERVED, OCCUPIED, MAINTENANCE, DEFAULT AVAILABLE)
- `monthly_rent` (NUMERIC(10, 2))
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- *Constraint:* `UNIQUE (room_id, bed_label)`

### 5.3 `bed_reservations` (Remediated Task D)
Concurrency reservation hold engine.
- `id` (UUID, PK)
- `bed_id` (UUID, FK -> beds.id ON DELETE RESTRICT)
- `booking_id` (UUID, NULL, FK -> booking_requests.id ON DELETE SET NULL)
- `student_id` (UUID, FK -> student_profiles.user_id ON DELETE RESTRICT)
- `status` (ENUM BedReservationStatus: TEMPORARY_HOLD, CONFIRMED, EXPIRED, RELEASED, CANCELLED, DEFAULT TEMPORARY_HOLD)
- `hold_expires_at` (TIMESTAMPTZ, NULL)
- `confirmed_at` (TIMESTAMPTZ, NULL)
- `released_at` (TIMESTAMPTZ, NULL)
- `release_reason` (VARCHAR(255), NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- *Custom Constraint:* Partial unique index `(bed_id) WHERE status IN ('TEMPORARY_HOLD', 'CONFIRMED')`.

---

## 6. Module F: Booking & Visit Coordination (9 Entities)

### 6.1 `booking_requests` (Remediated Task B & C)
Guided visit booking lifecycle engine.
- `id` (UUID, PK)
- `student_id` (UUID, FK -> student_profiles.user_id ON DELETE RESTRICT)
- `property_id` (UUID, FK -> properties.id ON DELETE RESTRICT)
- `bed_id` (UUID, NULL, FK -> beds.id ON DELETE SET NULL)
- `status` (ENUM BookingStatus: DRAFT, PAYMENT_PENDING, FEE_PAID, VISIT_SCHEDULED, VISIT_COMPLETED, DECISION_PENDING, ACCEPTED, REJECTED_REFUND_DUE, REJECTED_REFUNDED, AUTO_EXPIRED, CANCELLED, DEFAULT DRAFT)
- `booking_fee_amount` (NUMERIC(10, 2), DEFAULT 150.00)
- `amount_paid` (NUMERIC(10, 2), DEFAULT 0.00)
- `payment_status` (ENUM BookingPaymentStatus: UNPAID, PENDING, PAID, PARTIALLY_REFUNDED, REFUNDED, FORFEITED, DEFAULT UNPAID)
- `payment_reference` (VARCHAR(100), NULL)
- `payment_verified_at` (TIMESTAMPTZ, NULL)
- `refund_amount` (NUMERIC(10, 2), DEFAULT 0.00)
- `platform_fee_retained` (NUMERIC(10, 2), DEFAULT 0.00)
- `visit_completed_at` (TIMESTAMPTZ, NULL)
- `decision_deadline` (TIMESTAMPTZ, NULL)
- `student_decision` (ENUM StudentDecision: PENDING, ACCEPTED, REJECTED, EXPIRED, DEFAULT PENDING)
- `decision_submitted_at` (TIMESTAMPTZ, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- *Custom Constraints:* `decision_deadline = visit_completed_at + INTERVAL '12 hours'` (when non-null); cross-property bed check trigger.

### 6.2 `booking_status_histories` (Remediated Task C)
Persistent state transition log.
- `id` (UUID, PK)
- `booking_id` (UUID, FK -> booking_requests.id ON DELETE CASCADE)
- `from_status` (ENUM BookingStatus, NULL)
- `to_status` (ENUM BookingStatus)
- `changed_by_user_id` (UUID, NULL, FK -> users.id ON DELETE SET NULL)
- `changed_by_admin_id` (UUID, NULL, FK -> admin_accounts.id ON DELETE SET NULL)
- `reason` (TEXT, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 6.3 `visit_slots`
Confirmed inspection time window.
- `id` (UUID, PK)
- `booking_id` (UUID, UNIQUE, FK -> booking_requests.id ON DELETE CASCADE)
- `scheduled_start_time` (TIMESTAMPTZ)
- `scheduled_end_time` (TIMESTAMPTZ)
- `status` (ENUM VisitSlotStatus: SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, STUDENT_NO_SHOW, OWNER_NO_SHOW, CANCELLED, RESCHEDULED, DEFAULT SCHEDULED)
- `reschedule_count` (INT, DEFAULT 0)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 6.4 `visit_availability_options` (Remediated Task C)
Proposed alternative visit dates by host or admin.
- `id` (UUID, PK)
- `booking_id` (UUID, FK -> booking_requests.id ON DELETE CASCADE)
- `slot_start_time` (TIMESTAMPTZ)
- `slot_end_time` (TIMESTAMPTZ)
- `proposed_by` (VARCHAR(50))
- `is_confirmed` (BOOLEAN, DEFAULT FALSE)
- `decline_reason` (TEXT, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 6.5 `visit_coordinations` (Remediated Task J)
Volunteer field assignment and physical completion record.
- `booking_id` (UUID, PK, FK -> booking_requests.id ON DELETE CASCADE)
- `volunteer_id` (UUID, NULL, FK -> volunteer_profiles.user_id ON DELETE SET NULL)
- `coordinator_notes` (TEXT, NULL)
- `student_notified` (BOOLEAN, DEFAULT FALSE)
- `owner_notified` (BOOLEAN, DEFAULT FALSE)
- `volunteer_confirmed_at` (TIMESTAMPTZ, NULL)
- `admin_approved_at` (TIMESTAMPTZ, NULL)
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 6.6 `visit_decisions` (Remediated Task C)
Formal record of the student post-visit decision.
- `id` (UUID, PK)
- `booking_id` (UUID, UNIQUE, FK -> booking_requests.id ON DELETE CASCADE)
- `decision` (ENUM StudentDecision)
- `decision_submitted_at` (TIMESTAMPTZ)
- `rejection_reason` (TEXT, NULL)
- `is_within_deadline` (BOOLEAN, DEFAULT TRUE)
- `refund_calculated` (NUMERIC(10, 2), DEFAULT 0.00)
- `retained_fee_calculated` (NUMERIC(10, 2), DEFAULT 0.00)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 6.7 `visit_reminders` (Remediated Task C)
Scheduled notification queue and delivery tracking.
- `id` (UUID, PK)
- `booking_id` (UUID, FK -> booking_requests.id ON DELETE CASCADE)
- `reminder_type` (ENUM VisitReminderType: VISIT_24H_BEFORE, VISIT_2H_BEFORE, DECISION_WINDOW_OPENED, DECISION_6H_REMAINING, DECISION_1H_WARNING, DECISION_EXPIRED)
- `scheduled_at` (TIMESTAMPTZ)
- `sent_at` (TIMESTAMPTZ, NULL)
- `channel` (ENUM NotificationChannel, DEFAULT IN_APP)
- `delivery_status` (ENUM NotificationStatus, DEFAULT PENDING)
- `retry_count` (INT, DEFAULT 0)
- `last_error` (TEXT, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 6.8 `visit_assignment_histories` (Remediated Task C)
Volunteer dispatch, handoff, and reassignment log.
- `id` (UUID, PK)
- `booking_id` (UUID, FK -> booking_requests.id ON DELETE CASCADE)
- `volunteer_id` (UUID, FK -> volunteer_profiles.user_id ON DELETE CASCADE)
- `assigned_by_admin_id` (UUID, NULL, FK -> admin_accounts.id ON DELETE SET NULL)
- `assigned_at` (TIMESTAMPTZ, DEFAULT NOW())
- `unassigned_at` (TIMESTAMPTZ, NULL)
- `status` (ENUM VolunteerTaskStatus, DEFAULT ASSIGNED)
- `reassignment_reason` (TEXT, NULL)

### 6.9 `visit_feedbacks`
Post-visit student rating and quality reviews.
- `id` (UUID, PK)
- `booking_id` (UUID, FK -> booking_requests.id ON DELETE CASCADE)
- `student_id` (UUID, FK -> student_profiles.user_id ON DELETE CASCADE)
- `rating` (SMALLINT)
- `review_text` (TEXT, NULL)
- `accurate_as_described` (BOOLEAN, DEFAULT TRUE)
- `cleanliness_rating` (SMALLINT, NULL)
- `safety_rating` (SMALLINT, NULL)
- `submitted_at` (TIMESTAMPTZ, DEFAULT NOW())
- *Constraint:* `UNIQUE (booking_id, student_id)`

---

## 7. Module G: Volunteer Management (3 Entities)

### 7.1 `volunteer_profiles`
Field ambassador metadata and performance rating.
- `user_id` (UUID, PK, FK -> users.id ON DELETE CASCADE)
- `status` (ENUM VolunteerStatus: ONBOARDING, ACTIVE, INACTIVE, PROBATION, TERMINATED, DEFAULT ONBOARDING)
- `campus_assigned` (VARCHAR(255), NULL)
- `city` (VARCHAR(100))
- `tasks_completed` (INT, DEFAULT 0)
- `rating_average` (NUMERIC(3, 2), DEFAULT 5.00)
- `joined_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 7.2 `volunteer_assignments` (Remediated Task F)
Field operations task assignments with typed foreign keys.
- `id` (UUID, PK)
- `volunteer_id` (UUID, FK -> volunteer_profiles.user_id ON DELETE CASCADE)
- `task_type` (ENUM VolunteerTaskType: PROPERTY_VERIFICATION, STUDENT_ASSISTANCE, CHECK_IN_SUPPORT, MARKETING, DISPUTE_INVESTIGATION)
- `property_id` (UUID, NULL, FK -> properties.id ON DELETE SET NULL)
- `booking_id` (UUID, NULL, FK -> booking_requests.id ON DELETE SET NULL)
- `assigned_by_admin_id` (UUID, NULL, FK -> admin_accounts.id ON DELETE SET NULL)
- `status` (ENUM VolunteerTaskStatus: ASSIGNED, IN_PROGRESS, COMPLETED, FAILED, CANCELLED, DEFAULT ASSIGNED)
- `assigned_at` (TIMESTAMPTZ, DEFAULT NOW())
- `completed_at` (TIMESTAMPTZ, NULL)
- `notes` (TEXT, NULL)

### 7.3 `volunteer_reviews` (Remediated Task F)
Administrative performance assessments.
- `id` (UUID, PK)
- `volunteer_id` (UUID, FK -> volunteer_profiles.user_id ON DELETE CASCADE)
- `reviewed_by_admin_id` (UUID, NULL, FK -> admin_accounts.id ON DELETE SET NULL)
- `rating` (SMALLINT)
- `feedback` (TEXT, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

---

## 8. Module H: Financial Management (5 Entities - Balanced Double-Entry)

### 8.1 `financial_payments` (Remediated Task F)
Inbound payment orders from Razorpay/Cashfree.
- `id` (UUID, PK)
- `booking_id` (UUID, NULL, FK -> booking_requests.id ON DELETE SET NULL)
- `payer_user_id` (UUID, FK -> users.id ON DELETE RESTRICT)
- `payment_type` (ENUM PaymentType: BOOKING_VISIT_FEE, BOOKING_REFUND, OWNER_SUBSCRIPTION, STUDENT_SUBSCRIPTION, SPONSORSHIP_FEATURE, SECURITY_DEPOSIT)
- `amount` (NUMERIC(10, 2))
- `currency` (VARCHAR(3), DEFAULT 'INR')
- `gateway` (ENUM PaymentGateway: RAZORPAY, CASHFREE, PHONEPE, STRIPE, MANUAL_BANK_TRANSFER)
- `gateway_order_id` (VARCHAR(100), NULL)
- `gateway_payment_id` (VARCHAR(100), NULL)
- `gateway_signature` (VARCHAR(255), NULL)
- `status` (ENUM PaymentStatus: INITIATED, PROCESSING, SUCCESS, FAILED, REFUNDED, PARTIALLY_REFUNDED, DEFAULT INITIATED)
- `idempotency_key` (VARCHAR(128), UNIQUE)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 8.2 `ledger_accounts` (Remediated Task E)
Chart of accounts.
- `id` (UUID, PK)
- `account_number` (VARCHAR(50), UNIQUE)
- `name` (VARCHAR(150))
- `account_type` (ENUM LedgerAccountType: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
- `account_category` (ENUM LedgerAccountCategory: GATEWAY_CLEARING, PLATFORM_ESCROW, PLATFORM_REVENUE, STUDENT_WALLET, OWNER_PAYABLE, DISPUTE_RESERVE)
- `currency` (VARCHAR(3), DEFAULT 'INR')
- `is_active` (BOOLEAN, DEFAULT TRUE)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 8.3 `ledger_transactions` (Remediated Task E)
Journal header grouping debit and credit lines.
- `id` (UUID, PK)
- `transaction_number` (VARCHAR(50), UNIQUE)
- `transaction_type` (ENUM JournalTransactionType: VISIT_FEE_COLLECTION, VISIT_REJECTION_REFUND, VISIT_ACCEPTANCE_SETTLEMENT, VISIT_EXPIRATION_SETTLEMENT, OWNER_SUBSCRIPTION_PAYMENT, STUDENT_SUBSCRIPTION_PAYMENT, DISBURSEMENT_PAYOUT, DISBURSEMENT_REVERSAL)
- `payment_id` (UUID, NULL, FK -> financial_payments.id ON DELETE RESTRICT)
- `disbursement_id` (UUID, NULL, FK -> financial_disbursements.id ON DELETE RESTRICT)
- `booking_id` (UUID, NULL, FK -> booking_requests.id ON DELETE RESTRICT)
- `description` (VARCHAR(255))
- `idempotency_key` (VARCHAR(128), UNIQUE)
- `posted_at` (TIMESTAMPTZ, DEFAULT NOW())
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 8.4 `ledger_entries` (Remediated Task E)
Balanced double-entry journal lines.
- `id` (UUID, PK)
- `transaction_id` (UUID, FK -> ledger_transactions.id ON DELETE RESTRICT)
- `account_id` (UUID, FK -> ledger_accounts.id ON DELETE RESTRICT)
- `entry_type` (ENUM LedgerEntryType: CREDIT, DEBIT)
- `amount` (NUMERIC(10, 2))
- `currency` (VARCHAR(3), DEFAULT 'INR')
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- *Integrity Rule:* `SUM(DEBIT) = SUM(CREDIT)` per transaction verified by deferred constraint trigger.

### 8.5 `financial_disbursements` (Remediated Task F & Task 10)
Payout settlements to property owners.
- `id` (UUID, PK)
- `owner_id` (UUID, FK -> owner_profiles.user_id ON DELETE RESTRICT)
- `bank_account_id` (UUID, FK -> owner_bank_accounts.id ON DELETE RESTRICT)
- `amount` (NUMERIC(10, 2))
- `currency` (VARCHAR(3), DEFAULT 'INR')
- `status` (ENUM DisbursementStatus: PENDING, QUEUED, PROCESSING, SETTLED, FAILED, REVERSED, DEFAULT PENDING)
- `idempotency_key` (VARCHAR(128), UNIQUE)
- `utr_reference` (VARCHAR(100), UNIQUE, NULL)
- `disbursed_at` (TIMESTAMPTZ, NULL)
- `failure_reason` (TEXT, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- *Custom Constraint:* Triggers guarantee bank account belongs to owner and is verified; enforces unique idempotency keys.

---

## 9. Module I: Subscription Management (2 Entities)

### 9.1 `owner_subscriptions`
Property host listing tiers and recurring SaaS fees.
- `id` (UUID, PK)
- `owner_id` (UUID, FK -> owner_profiles.user_id ON DELETE CASCADE)
- `tier` (ENUM OwnerSubscriptionTier: FREE, ESSENTIALS, GROWTH, PORTFOLIO_ENTERPRISE, DEFAULT FREE)
- `status` (ENUM OwnerSubscriptionStatus: ACTIVE, PAST_DUE, CANCELLED, EXPIRED, DEFAULT ACTIVE)
- `started_at` (TIMESTAMPTZ, DEFAULT NOW())
- `expires_at` (TIMESTAMPTZ, NULL)
- `monthly_fee` (NUMERIC(10, 2), DEFAULT 0.00)
- `billing_cycle_days` (INT, DEFAULT 30)
- `auto_renew` (BOOLEAN, DEFAULT TRUE)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 9.2 `student_subscriptions`
Student premium membership subscriptions.
- `id` (UUID, PK)
- `student_id` (UUID, FK -> student_profiles.user_id ON DELETE CASCADE)
- `tier` (ENUM StudentSubscriptionTier: FREE, STUDENT_PLUS, CAMPUS_ELITE, DEFAULT FREE)
- `status` (ENUM StudentSubscriptionStatus: ACTIVE, CANCELLED, EXPIRED, DEFAULT ACTIVE)
- `started_at` (TIMESTAMPTZ, DEFAULT NOW())
- `expires_at` (TIMESTAMPTZ, NULL)
- `fee_paid` (NUMERIC(10, 2), DEFAULT 0.00)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

---

## 10. Module J: Sponsorship & Promotion (1 Entity)

### 10.1 `sponsorship_campaigns` (Remediated Task F)
Featured badges and campus hero banners.
- `id` (UUID, PK)
- `owner_id` (UUID, FK -> owner_profiles.user_id ON DELETE CASCADE)
- `property_id` (UUID, FK -> properties.id ON DELETE CASCADE)
- `placement` (ENUM CampaignPlacement: HOME_HERO, CAMPUS_TOP_PICK, SEARCH_PIN, MAP_FEATURED)
- `status` (ENUM CampaignStatus: PENDING_PAYMENT, ACTIVE, PAUSED, COMPLETED, EXPIRED, DEFAULT PENDING_PAYMENT)
- `daily_budget` (NUMERIC(10, 2))
- `total_budget` (NUMERIC(10, 2))
- `spent_amount` (NUMERIC(10, 2), DEFAULT 0.00)
- `start_date` (DATE)
- `end_date` (DATE)
- `impressions_count` (INT, DEFAULT 0)
- `clicks_count` (INT, DEFAULT 0)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- *Custom Constraint:* Trigger verifies property belongs to owner.

---

## 11. Module K: Notifications (1 Entity)

### 11.1 `system_notifications`
Multi-channel notification dispatch records.
- `id` (UUID, PK)
- `user_id` (UUID, FK -> users.id ON DELETE CASCADE)
- `channel` (ENUM NotificationChannel: IN_APP, EMAIL, SMS, WHATSAPP, DEFAULT IN_APP)
- `priority` (ENUM NotificationPriority: LOW, NORMAL, HIGH, URGENT, DEFAULT NORMAL)
- `title` (VARCHAR(200))
- `body` (TEXT)
- `action_url` (VARCHAR(512), NULL)
- `status` (ENUM NotificationStatus: PENDING, DELIVERED, READ, FAILED, DEFAULT PENDING)
- `delivered_at` (TIMESTAMPTZ, NULL)
- `read_at` (TIMESTAMPTZ, NULL)
- `metadata` (JSONB, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

---

## 12. Module L: Support & Complaints (2 Entities)

### 12.1 `support_tickets`
Dispute and customer inquiries.
- `id` (UUID, PK)
- `ticket_number` (VARCHAR(30), UNIQUE)
- `created_by_user_id` (UUID, FK -> users.id ON DELETE RESTRICT)
- `assigned_admin_id` (UUID, NULL, FK -> admin_accounts.id ON DELETE SET NULL)
- `booking_id` (UUID, NULL, FK -> booking_requests.id ON DELETE SET NULL)
- `property_id` (UUID, NULL, FK -> properties.id ON DELETE SET NULL)
- `category` (ENUM TicketCategory: BOOKING_DISPUTE, PROPERTY_MISREPRESENTATION, PAYMENT_REFUND_ISSUE, OWNER_BEHAVIOR, STUDENT_BEHAVIOR, MAINTENANCE_FAILURE, PLATFORM_TECHNICAL, OTHER)
- `priority` (ENUM TicketPriority: LOW, MEDIUM, HIGH, CRITICAL, DEFAULT MEDIUM)
- `status` (ENUM TicketStatus: OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED, REOPENED, DEFAULT OPEN)
- `subject` (VARCHAR(255))
- `description` (TEXT)
- `resolution_notes` (TEXT, NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- `resolved_at` (TIMESTAMPTZ, NULL)

### 12.2 `support_messages` (Remediated Task F)
Threaded discussion messages.
- `id` (UUID, PK)
- `ticket_id` (UUID, FK -> support_tickets.id ON DELETE CASCADE)
- `sender_user_id` (UUID, NULL, FK -> users.id ON DELETE SET NULL)
- `sender_admin_id` (UUID, NULL, FK -> admin_accounts.id ON DELETE SET NULL)
- `message` (TEXT)
- `attachments` (JSONB, NULL)
- `sent_at` (TIMESTAMPTZ, DEFAULT NOW())

---

## 13. Module M: Administrative Audit Logging (1 Entity)

### 13.1 `admin_audit_logs` (Remediated Task H)
Append-only immutable activity log for all operations in the Admin Control Centre.
- `id` (UUID, PK)
- `admin_id` (UUID, NULL, FK -> admin_accounts.id ON DELETE SET NULL)
- `action_category` (ENUM AuditActionCategory: AUTH_LOGIN, AUTH_LOGOUT, AUTH_PASSWORD_CHANGE, AUTH_MFA_UPDATE, ROLE_ASSIGNMENT, USER_SUSPENSION, PROPERTY_VERIFICATION, FEE_OVERRIDE, REFUND_ISSUANCE, DISBURSEMENT_APPROVAL, SYSTEM_SETTING_CHANGE)
- `action` (VARCHAR(100))
- `target_entity` (VARCHAR(100))
- `target_entity_id` (UUID, NULL)
- `ip_address` (VARCHAR(45))
- `user_agent` (TEXT, NULL)
- `severity` (ENUM AuditSeverity: LOW, MEDIUM, HIGH, CRITICAL, DEFAULT LOW)
- `details_json` (JSONB, NULL)
- `recorded_at` (TIMESTAMPTZ, DEFAULT NOW())
- *Security:* Database trigger blocks UPDATE and DELETE.
