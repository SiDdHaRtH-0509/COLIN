-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "UserRoleType" AS ENUM ('STUDENT', 'OWNER', 'VOLUNTEER', 'ADMIN');

-- CreateEnum
CREATE TYPE "MfaType" AS ENUM ('TOTP', 'SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "AdminAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'INVITED');

-- CreateEnum
CREATE TYPE "StudentVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "IdDocumentType" AS ENUM ('COLLEGE_ID', 'AADHAAR', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID');

-- CreateEnum
CREATE TYPE "OwnerVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING_DOCS', 'IN_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "OwnerBusinessStructure" AS ENUM ('INDIVIDUAL', 'PROPRIETORSHIP', 'PARTNERSHIP', 'LLP', 'PRIVATE_LIMITED');

-- CreateEnum
CREATE TYPE "OwnerTier" AS ENUM ('STANDARD', 'VERIFIED_PARTNER', 'PREMIUM');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('PG', 'HOSTEL', 'RENTAL_ROOM', 'SHARED_FLAT', 'COLIVING');

-- CreateEnum
CREATE TYPE "PropertyGenderPolicy" AS ENUM ('BOYS_ONLY', 'GIRLS_ONLY', 'COED');

-- CreateEnum
CREATE TYPE "PropertyVerificationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ASSIGNED_VISIT', 'PHYSICALLY_INSPECTED', 'VERIFIED', 'REJECTED', 'DELISTED');

-- CreateEnum
CREATE TYPE "PropertyOccupancyStatus" AS ENUM ('AVAILABLE', 'PARTIALLY_BOOKED', 'FULLY_BOOKED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('SINGLE', 'DOUBLE_SHARING', 'TRIPLE_SHARING', 'FOUR_SHARING', 'DORMITORY');

-- CreateEnum
CREATE TYPE "BedStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "BedReservationStatus" AS ENUM ('TEMPORARY_HOLD', 'CONFIRMED', 'EXPIRED', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('DRAFT', 'PAYMENT_PENDING', 'FEE_PAID', 'VISIT_SCHEDULED', 'VISIT_COMPLETED', 'DECISION_PENDING', 'ACCEPTED', 'REJECTED_REFUND_DUE', 'REJECTED_REFUNDED', 'AUTO_EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingPaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FORFEITED');

-- CreateEnum
CREATE TYPE "VisitSlotStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'STUDENT_NO_SHOW', 'OWNER_NO_SHOW', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "StudentDecision" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VisitReminderType" AS ENUM ('VISIT_24H_BEFORE', 'VISIT_2H_BEFORE', 'DECISION_WINDOW_OPENED', 'DECISION_9H_REMAINING', 'DECISION_6H_REMAINING', 'DECISION_3H_REMAINING', 'DECISION_1H_WARNING', 'DECISION_15M_WARNING', 'DECISION_EXPIRED');

-- CreateEnum
CREATE TYPE "VolunteerStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'INACTIVE', 'PROBATION', 'TERMINATED');

-- CreateEnum
CREATE TYPE "VolunteerTaskType" AS ENUM ('PROPERTY_VERIFICATION', 'STUDENT_ASSISTANCE', 'CHECK_IN_SUPPORT', 'MARKETING', 'DISPUTE_INVESTIGATION');

-- CreateEnum
CREATE TYPE "VolunteerTaskStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('BOOKING_VISIT_FEE', 'BOOKING_REFUND', 'OWNER_SUBSCRIPTION', 'STUDENT_SUBSCRIPTION', 'SPONSORSHIP_FEATURE', 'SECURITY_DEPOSIT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('RAZORPAY', 'CASHFREE', 'PHONEPE', 'STRIPE', 'MANUAL_BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "LedgerAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "LedgerAccountCategory" AS ENUM ('GATEWAY_CLEARING', 'PLATFORM_ESCROW', 'PLATFORM_REVENUE', 'STUDENT_WALLET', 'OWNER_PAYABLE', 'DISPUTE_RESERVE');

-- CreateEnum
CREATE TYPE "JournalTransactionType" AS ENUM ('VISIT_FEE_COLLECTION', 'VISIT_REJECTION_REFUND', 'VISIT_ACCEPTANCE_SETTLEMENT', 'VISIT_EXPIRATION_SETTLEMENT', 'OWNER_SUBSCRIPTION_PAYMENT', 'STUDENT_SUBSCRIPTION_PAYMENT', 'DISBURSEMENT_PAYOUT', 'DISBURSEMENT_REVERSAL');

-- CreateEnum
CREATE TYPE "LedgerTransactionStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "DisbursementStatus" AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'SETTLED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "OwnerSubscriptionTier" AS ENUM ('FREE', 'ESSENTIALS', 'GROWTH', 'PORTFOLIO_ENTERPRISE');

-- CreateEnum
CREATE TYPE "OwnerSubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "StudentSubscriptionTier" AS ENUM ('FREE', 'STUDENT_PLUS', 'CAMPUS_ELITE');

-- CreateEnum
CREATE TYPE "StudentSubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CampaignPlacement" AS ENUM ('HOME_HERO', 'CAMPUS_TOP_PICK', 'SEARCH_PIN', 'MAP_FEATURED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('BOOKING_DISPUTE', 'PROPERTY_MISREPRESENTATION', 'PAYMENT_REFUND_ISSUE', 'OWNER_BEHAVIOR', 'STUDENT_BEHAVIOR', 'MAINTENANCE_FAILURE', 'PLATFORM_TECHNICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED');

-- CreateEnum
CREATE TYPE "AuditActionCategory" AS ENUM ('AUTH_LOGIN', 'AUTH_LOGOUT', 'AUTH_PASSWORD_CHANGE', 'AUTH_MFA_UPDATE', 'ROLE_ASSIGNMENT', 'USER_SUSPENSION', 'PROPERTY_VERIFICATION', 'FEE_OVERRIDE', 'REFUND_ISSUANCE', 'DISBURSEMENT_APPROVAL', 'SYSTEM_SETTING_CHANGE');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EmailOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'ACCEPTED', 'DELIVERED', 'DEFERRED', 'BOUNCED', 'FAILED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "EmailEventType" AS ENUM ('VERIFICATION_EMAIL', 'PASSWORD_RESET', 'PASSWORD_CHANGED', 'ACCOUNT_SECURITY', 'OWNER_VERIFICATION', 'MARKETPLACE_NOTIFICATION');

-- CreateEnum
CREATE TYPE "EmailDeliveryEventType" AS ENUM ('ACCEPTED', 'DELIVERED', 'DEFERRED', 'BOUNCED', 'SPAM_COMPLAINT', 'FAILED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "password_hash" VARCHAR(255) NOT NULL,
    "primary_role" "UserRoleType" NOT NULL DEFAULT 'STUDENT',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "last_login_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "avatar_url" VARCHAR(512),
    "gender" VARCHAR(20),
    "date_of_birth" DATE,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "pincode" VARCHAR(10),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "admin_accounts" (
    "id" UUID NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "status" "AdminAccountStatus" NOT NULL DEFAULT 'INVITED',
    "is_mfa_enforced" BOOLEAN NOT NULL DEFAULT true,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admin_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "last_activity_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_mfa_credentials" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "mfa_type" "MfaType" NOT NULL DEFAULT 'TOTP',
    "secret_encrypted" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admin_mfa_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_mfa_recovery_codes" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_roles" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_system_role" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_permissions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "admin_user_roles" (
    "admin_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_user_roles_pkey" PRIMARY KEY ("admin_id","role_id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "last_activity_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_credentials" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "mfa_type" "MfaType" NOT NULL,
    "secret_encrypted" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_recovery_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "user_id" UUID NOT NULL,
    "college_name" VARCHAR(255) NOT NULL,
    "course" VARCHAR(150),
    "batch_year" INTEGER,
    "student_id_card_url" VARCHAR(512),
    "verification_status" "StudentVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "student_verification_documents" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "document_type" "IdDocumentType" NOT NULL,
    "document_url" VARCHAR(512) NOT NULL,
    "document_number_masked" VARCHAR(50),
    "status" "StudentVerificationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "rejection_reason" TEXT,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMPTZ(6),

    CONSTRAINT "student_verification_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_preferences" (
    "student_id" UUID NOT NULL,
    "preferred_location" VARCHAR(255),
    "max_budget" DECIMAL(10,2),
    "preferred_room_type" "RoomType",
    "food_preference" VARCHAR(50),
    "lifestyle_habits" JSONB,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_preferences_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "student_saved_properties" (
    "student_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "saved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_saved_properties_pkey" PRIMARY KEY ("student_id","property_id")
);

-- CreateTable
CREATE TABLE "student_search_histories" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "search_query" VARCHAR(255),
    "filters_applied" JSONB,
    "results_count" INTEGER NOT NULL DEFAULT 0,
    "searched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_search_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_profiles" (
    "user_id" UUID NOT NULL,
    "business_name" VARCHAR(255),
    "business_structure" "OwnerBusinessStructure" NOT NULL DEFAULT 'INDIVIDUAL',
    "owner_tier" "OwnerTier" NOT NULL DEFAULT 'STANDARD',
    "pan_masked" VARCHAR(20),
    "gstin_masked" VARCHAR(30),
    "verification_status" "OwnerVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "owner_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "owner_kyc_documents" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "document_type" VARCHAR(50) NOT NULL,
    "document_url" VARCHAR(512) NOT NULL,
    "status" "OwnerVerificationStatus" NOT NULL DEFAULT 'PENDING_DOCS',
    "rejection_reason" TEXT,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),

    CONSTRAINT "owner_kyc_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_bank_accounts" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "bank_name" VARCHAR(150) NOT NULL,
    "account_number_masked" VARCHAR(50) NOT NULL,
    "ifsc_code" VARCHAR(20) NOT NULL,
    "account_holder_name" VARCHAR(150) NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "gateway_beneficiary_id" VARCHAR(100),
    "beneficiary_token_encrypted" TEXT,
    "verification_status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "owner_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "property_type" "PropertyType" NOT NULL,
    "gender_policy" "PropertyGenderPolicy" NOT NULL,
    "address_line1" VARCHAR(255) NOT NULL,
    "address_line2" VARCHAR(255),
    "landmark" VARCHAR(150),
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "pincode" VARCHAR(10) NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "nearest_campus" VARCHAR(255),
    "distance_to_campus_km" DECIMAL(5,2),
    "verification_status" "PropertyVerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "occupancy_status" "PropertyOccupancyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "description" TEXT,
    "total_rooms" INTEGER NOT NULL DEFAULT 0,
    "total_beds" INTEGER NOT NULL DEFAULT 0,
    "available_beds" INTEGER NOT NULL DEFAULT 0,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "place_id" VARCHAR(255),
    "coordinate_source" VARCHAR(50) NOT NULL DEFAULT 'OWNER_PROVIDED',
    "google_content_expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_photos" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "photo_storage_url" VARCHAR(512) NOT NULL,
    "thumbnail_url" VARCHAR(512),
    "caption" VARCHAR(150),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "file_size_bytes" INTEGER,
    "mime_type" VARCHAR(30),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_amenities" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "amenity_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "property_amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_rules" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "rule_text" VARCHAR(255) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "property_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_verification_audits" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "previous_status" "PropertyVerificationStatus" NOT NULL,
    "new_status" "PropertyVerificationStatus" NOT NULL,
    "inspection_notes" TEXT,
    "checklist" JSONB,
    "verified_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_verification_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "room_number" VARCHAR(50) NOT NULL,
    "floor_number" INTEGER,
    "room_type" "RoomType" NOT NULL,
    "base_monthly_rent" DECIMAL(10,2) NOT NULL,
    "security_deposit" DECIMAL(10,2) NOT NULL,
    "total_beds" INTEGER NOT NULL DEFAULT 1,
    "occupied_beds" INTEGER NOT NULL DEFAULT 0,
    "has_attached_washroom" BOOLEAN NOT NULL DEFAULT false,
    "has_balcony" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "bed_label" VARCHAR(20) NOT NULL,
    "status" "BedStatus" NOT NULL DEFAULT 'AVAILABLE',
    "monthly_rent" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed_reservations" (
    "id" UUID NOT NULL,
    "bed_id" UUID NOT NULL,
    "booking_id" UUID,
    "student_id" UUID NOT NULL,
    "status" "BedReservationStatus" NOT NULL DEFAULT 'TEMPORARY_HOLD',
    "hold_expires_at" TIMESTAMPTZ(6),
    "confirmed_at" TIMESTAMPTZ(6),
    "released_at" TIMESTAMPTZ(6),
    "release_reason" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bed_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_requests" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "bed_id" UUID,
    "status" "BookingStatus" NOT NULL DEFAULT 'DRAFT',
    "booking_fee_amount" DECIMAL(10,2) NOT NULL DEFAULT 150.00,
    "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "payment_status" "BookingPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "payment_reference" VARCHAR(100),
    "payment_verified_at" TIMESTAMPTZ(6),
    "refund_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "platform_fee_retained" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "visit_completed_at" TIMESTAMPTZ(6),
    "decision_deadline" TIMESTAMPTZ(6),
    "student_decision" "StudentDecision" NOT NULL DEFAULT 'PENDING',
    "decision_submitted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "booking_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_histories" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "from_status" "BookingStatus",
    "to_status" "BookingStatus" NOT NULL,
    "changed_by_user_id" UUID,
    "changed_by_admin_id" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_slots" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "scheduled_start_time" TIMESTAMPTZ(6) NOT NULL,
    "scheduled_end_time" TIMESTAMPTZ(6) NOT NULL,
    "status" "VisitSlotStatus" NOT NULL DEFAULT 'SCHEDULED',
    "reschedule_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "visit_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_availability_options" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "slot_start_time" TIMESTAMPTZ(6) NOT NULL,
    "slot_end_time" TIMESTAMPTZ(6) NOT NULL,
    "proposed_by" VARCHAR(50) NOT NULL,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "decline_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_availability_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_coordinations" (
    "booking_id" UUID NOT NULL,
    "volunteer_id" UUID,
    "coordinator_notes" TEXT,
    "student_notified" BOOLEAN NOT NULL DEFAULT false,
    "owner_notified" BOOLEAN NOT NULL DEFAULT false,
    "volunteer_confirmed_at" TIMESTAMPTZ(6),
    "admin_approved_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "visit_coordinations_pkey" PRIMARY KEY ("booking_id")
);

-- CreateTable
CREATE TABLE "visit_decisions" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "decision" "StudentDecision" NOT NULL,
    "decision_submitted_at" TIMESTAMPTZ(6) NOT NULL,
    "rejection_reason" TEXT,
    "is_within_deadline" BOOLEAN NOT NULL DEFAULT true,
    "refund_calculated" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "retained_fee_calculated" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_reminders" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "reminder_type" "VisitReminderType" NOT NULL,
    "scheduled_at" TIMESTAMPTZ(6) NOT NULL,
    "sent_at" TIMESTAMPTZ(6),
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "delivery_status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_assignment_histories" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "volunteer_id" UUID NOT NULL,
    "volunteer_name_snapshot" VARCHAR(150) NOT NULL,
    "volunteer_phone_snapshot" VARCHAR(20),
    "assigned_by_admin_id" UUID,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMPTZ(6),
    "status" "VolunteerTaskStatus" NOT NULL DEFAULT 'ASSIGNED',
    "reassignment_reason" TEXT,

    CONSTRAINT "visit_assignment_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_feedbacks" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "review_text" TEXT,
    "accurate_as_described" BOOLEAN NOT NULL DEFAULT true,
    "cleanliness_rating" SMALLINT,
    "safety_rating" SMALLINT,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_profiles" (
    "user_id" UUID NOT NULL,
    "status" "VolunteerStatus" NOT NULL DEFAULT 'ONBOARDING',
    "campus_assigned" VARCHAR(255),
    "city" VARCHAR(100) NOT NULL,
    "tasks_completed" INTEGER NOT NULL DEFAULT 0,
    "rating_average" DECIMAL(3,2) NOT NULL DEFAULT 5.00,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "volunteer_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "volunteer_assignments" (
    "id" UUID NOT NULL,
    "volunteer_id" UUID NOT NULL,
    "task_type" "VolunteerTaskType" NOT NULL,
    "property_id" UUID,
    "booking_id" UUID,
    "assigned_by_admin_id" UUID,
    "status" "VolunteerTaskStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "notes" TEXT,

    CONSTRAINT "volunteer_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_reviews" (
    "id" UUID NOT NULL,
    "volunteer_id" UUID NOT NULL,
    "reviewed_by_admin_id" UUID,
    "rating" SMALLINT NOT NULL,
    "feedback" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volunteer_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_payments" (
    "id" UUID NOT NULL,
    "booking_id" UUID,
    "payer_user_id" UUID NOT NULL,
    "payment_type" "PaymentType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "gateway" "PaymentGateway" NOT NULL,
    "gateway_order_id" VARCHAR(100),
    "gateway_payment_id" VARCHAR(100),
    "gateway_signature" VARCHAR(255),
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "idempotency_key" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "financial_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_accounts" (
    "id" UUID NOT NULL,
    "account_number" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "account_type" "LedgerAccountType" NOT NULL,
    "account_category" "LedgerAccountCategory" NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_transactions" (
    "id" UUID NOT NULL,
    "transaction_number" VARCHAR(50) NOT NULL,
    "transaction_type" "JournalTransactionType" NOT NULL,
    "status" "LedgerTransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "payment_id" UUID,
    "disbursement_id" UUID,
    "booking_id" UUID,
    "reverses_transaction_id" UUID,
    "description" VARCHAR(255) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "idempotency_key" VARCHAR(128) NOT NULL,
    "posted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "entry_type" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_disbursements" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "bank_account_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "DisbursementStatus" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" VARCHAR(128) NOT NULL,
    "utr_reference" VARCHAR(100),
    "disbursed_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_disbursements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_subscriptions" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "tier" "OwnerSubscriptionTier" NOT NULL DEFAULT 'FREE',
    "status" "OwnerSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "monthly_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "billing_cycle_days" INTEGER NOT NULL DEFAULT 30,
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "owner_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_subscriptions" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "tier" "StudentSubscriptionTier" NOT NULL DEFAULT 'FREE',
    "status" "StudentSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "fee_paid" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsorship_campaigns" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "placement" "CampaignPlacement" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "daily_budget" DECIMAL(10,2) NOT NULL,
    "total_budget" DECIMAL(10,2) NOT NULL,
    "spent_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "impressions_count" INTEGER NOT NULL DEFAULT 0,
    "clicks_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sponsorship_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "action_url" VARCHAR(512),
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "delivered_at" TIMESTAMPTZ(6),
    "read_at" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "ticket_number" VARCHAR(30) NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "assigned_admin_id" UUID,
    "booking_id" UUID,
    "property_id" UUID,
    "category" "TicketCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "subject" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "resolution_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "sender_user_id" UUID,
    "sender_admin_id" UUID,
    "message" TEXT NOT NULL,
    "attachments" JSONB,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" UUID NOT NULL,
    "admin_id" UUID,
    "action_category" "AuditActionCategory" NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "target_entity" VARCHAR(100) NOT NULL,
    "target_entity_id" UUID,
    "ip_address" VARCHAR(45) NOT NULL,
    "user_agent" TEXT,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'LOW',
    "details_json" JSONB,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_outbox" (
    "id" UUID NOT NULL,
    "event_type" "EmailEventType" NOT NULL,
    "recipient" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "template_alias" VARCHAR(100) NOT NULL,
    "template_data_json" JSONB NOT NULL,
    "status" "EmailOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" VARCHAR(255),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 5,
    "scheduled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_attempt_at" TIMESTAMPTZ(6),
    "last_error_code" VARCHAR(100),
    "last_error_message" TEXT,
    "provider" VARCHAR(50),
    "provider_message_id" VARCHAR(255),
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_delivery_events" (
    "id" UUID NOT NULL,
    "email_outbox_id" UUID,
    "provider" VARCHAR(50) NOT NULL,
    "provider_event_id" VARCHAR(255),
    "provider_message_id" VARCHAR(255),
    "event_type" "EmailDeliveryEventType" NOT NULL,
    "event_timestamp" TIMESTAMPTZ(6) NOT NULL,
    "recipient" VARCHAR(255),
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_delivery_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_suppressions" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "reason" VARCHAR(100) NOT NULL,
    "source" VARCHAR(50) NOT NULL,
    "provider" VARCHAR(50),
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_primary_role_idx" ON "users"("primary_role");

-- CreateIndex
CREATE UNIQUE INDEX "admin_accounts_username_key" ON "admin_accounts"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admin_accounts_email_key" ON "admin_accounts"("email");

-- CreateIndex
CREATE INDEX "admin_accounts_username_idx" ON "admin_accounts"("username");

-- CreateIndex
CREATE INDEX "admin_accounts_email_idx" ON "admin_accounts"("email");

-- CreateIndex
CREATE INDEX "admin_accounts_status_idx" ON "admin_accounts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_token_hash_key" ON "admin_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "admin_sessions_admin_id_idx" ON "admin_sessions"("admin_id");

-- CreateIndex
CREATE INDEX "admin_sessions_token_hash_idx" ON "admin_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "admin_sessions_expires_at_idx" ON "admin_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_mfa_credentials_admin_id_mfa_type_key" ON "admin_mfa_credentials"("admin_id", "mfa_type");

-- CreateIndex
CREATE INDEX "admin_mfa_recovery_codes_admin_id_idx" ON "admin_mfa_recovery_codes"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_roles_code_key" ON "admin_roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "admin_permissions_code_key" ON "admin_permissions"("code");

-- CreateIndex
CREATE INDEX "admin_permissions_module_idx" ON "admin_permissions"("module");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_token_hash_idx" ON "user_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "mfa_credentials_user_id_mfa_type_key" ON "mfa_credentials"("user_id", "mfa_type");

-- CreateIndex
CREATE INDEX "mfa_recovery_codes_user_id_idx" ON "mfa_recovery_codes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_hash_idx" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_token_hash_idx" ON "email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE INDEX "student_profiles_verification_status_idx" ON "student_profiles"("verification_status");

-- CreateIndex
CREATE INDEX "student_profiles_college_name_idx" ON "student_profiles"("college_name");

-- CreateIndex
CREATE INDEX "student_verification_documents_student_id_idx" ON "student_verification_documents"("student_id");

-- CreateIndex
CREATE INDEX "student_verification_documents_status_idx" ON "student_verification_documents"("status");

-- CreateIndex
CREATE INDEX "student_search_histories_student_id_idx" ON "student_search_histories"("student_id");

-- CreateIndex
CREATE INDEX "owner_profiles_verification_status_idx" ON "owner_profiles"("verification_status");

-- CreateIndex
CREATE INDEX "owner_profiles_owner_tier_idx" ON "owner_profiles"("owner_tier");

-- CreateIndex
CREATE INDEX "owner_kyc_documents_owner_id_idx" ON "owner_kyc_documents"("owner_id");

-- CreateIndex
CREATE INDEX "owner_kyc_documents_status_idx" ON "owner_kyc_documents"("status");

-- CreateIndex
CREATE INDEX "owner_bank_accounts_owner_id_idx" ON "owner_bank_accounts"("owner_id");

-- CreateIndex
CREATE INDEX "owner_bank_accounts_gateway_beneficiary_id_idx" ON "owner_bank_accounts"("gateway_beneficiary_id");

-- CreateIndex
CREATE UNIQUE INDEX "properties_slug_key" ON "properties"("slug");

-- CreateIndex
CREATE INDEX "properties_owner_id_idx" ON "properties"("owner_id");

-- CreateIndex
CREATE INDEX "properties_city_verification_status_idx" ON "properties"("city", "verification_status");

-- CreateIndex
CREATE INDEX "properties_property_type_gender_policy_idx" ON "properties"("property_type", "gender_policy");

-- CreateIndex
CREATE INDEX "properties_latitude_longitude_idx" ON "properties"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "property_photos_property_id_idx" ON "property_photos"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_property_photo_display_order" ON "property_photos"("property_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "property_amenities_property_id_amenity_code_key" ON "property_amenities"("property_id", "amenity_code");

-- CreateIndex
CREATE INDEX "property_rules_property_id_idx" ON "property_rules"("property_id");

-- CreateIndex
CREATE INDEX "property_verification_audits_property_id_idx" ON "property_verification_audits"("property_id");

-- CreateIndex
CREATE INDEX "rooms_property_id_idx" ON "rooms"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_property_id_room_number_key" ON "rooms"("property_id", "room_number");

-- CreateIndex
CREATE INDEX "beds_room_id_status_idx" ON "beds"("room_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "beds_room_id_bed_label_key" ON "beds"("room_id", "bed_label");

-- CreateIndex
CREATE INDEX "bed_reservations_bed_id_status_idx" ON "bed_reservations"("bed_id", "status");

-- CreateIndex
CREATE INDEX "bed_reservations_student_id_idx" ON "bed_reservations"("student_id");

-- CreateIndex
CREATE INDEX "bed_reservations_booking_id_idx" ON "bed_reservations"("booking_id");

-- CreateIndex
CREATE INDEX "booking_requests_student_id_idx" ON "booking_requests"("student_id");

-- CreateIndex
CREATE INDEX "booking_requests_property_id_idx" ON "booking_requests"("property_id");

-- CreateIndex
CREATE INDEX "booking_requests_status_idx" ON "booking_requests"("status");

-- CreateIndex
CREATE INDEX "booking_requests_payment_status_idx" ON "booking_requests"("payment_status");

-- CreateIndex
CREATE INDEX "booking_requests_decision_deadline_idx" ON "booking_requests"("decision_deadline");

-- CreateIndex
CREATE INDEX "booking_status_histories_booking_id_idx" ON "booking_status_histories"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "visit_slots_booking_id_key" ON "visit_slots"("booking_id");

-- CreateIndex
CREATE INDEX "visit_slots_scheduled_start_time_idx" ON "visit_slots"("scheduled_start_time");

-- CreateIndex
CREATE INDEX "visit_availability_options_booking_id_idx" ON "visit_availability_options"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "visit_decisions_booking_id_key" ON "visit_decisions"("booking_id");

-- CreateIndex
CREATE INDEX "visit_reminders_booking_id_idx" ON "visit_reminders"("booking_id");

-- CreateIndex
CREATE INDEX "visit_reminders_scheduled_at_delivery_status_idx" ON "visit_reminders"("scheduled_at", "delivery_status");

-- CreateIndex
CREATE UNIQUE INDEX "visit_reminders_booking_id_reminder_type_key" ON "visit_reminders"("booking_id", "reminder_type");

-- CreateIndex
CREATE INDEX "visit_assignment_histories_booking_id_idx" ON "visit_assignment_histories"("booking_id");

-- CreateIndex
CREATE INDEX "visit_assignment_histories_volunteer_id_idx" ON "visit_assignment_histories"("volunteer_id");

-- CreateIndex
CREATE UNIQUE INDEX "visit_feedbacks_booking_id_student_id_key" ON "visit_feedbacks"("booking_id", "student_id");

-- CreateIndex
CREATE INDEX "volunteer_profiles_status_idx" ON "volunteer_profiles"("status");

-- CreateIndex
CREATE INDEX "volunteer_profiles_city_campus_assigned_idx" ON "volunteer_profiles"("city", "campus_assigned");

-- CreateIndex
CREATE INDEX "volunteer_assignments_volunteer_id_status_idx" ON "volunteer_assignments"("volunteer_id", "status");

-- CreateIndex
CREATE INDEX "volunteer_assignments_property_id_idx" ON "volunteer_assignments"("property_id");

-- CreateIndex
CREATE INDEX "volunteer_assignments_booking_id_idx" ON "volunteer_assignments"("booking_id");

-- CreateIndex
CREATE INDEX "volunteer_reviews_volunteer_id_idx" ON "volunteer_reviews"("volunteer_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_payments_idempotency_key_key" ON "financial_payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "financial_payments_payer_user_id_idx" ON "financial_payments"("payer_user_id");

-- CreateIndex
CREATE INDEX "financial_payments_booking_id_idx" ON "financial_payments"("booking_id");

-- CreateIndex
CREATE INDEX "financial_payments_status_idx" ON "financial_payments"("status");

-- CreateIndex
CREATE INDEX "financial_payments_gateway_order_id_idx" ON "financial_payments"("gateway_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_accounts_account_number_key" ON "ledger_accounts"("account_number");

-- CreateIndex
CREATE INDEX "ledger_accounts_account_category_idx" ON "ledger_accounts"("account_category");

-- CreateIndex
CREATE INDEX "ledger_accounts_account_type_idx" ON "ledger_accounts"("account_type");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_transactions_transaction_number_key" ON "ledger_transactions"("transaction_number");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_transactions_idempotency_key_key" ON "ledger_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "ledger_transactions_transaction_type_idx" ON "ledger_transactions"("transaction_type");

-- CreateIndex
CREATE INDEX "ledger_transactions_status_idx" ON "ledger_transactions"("status");

-- CreateIndex
CREATE INDEX "ledger_transactions_posted_at_idx" ON "ledger_transactions"("posted_at");

-- CreateIndex
CREATE INDEX "ledger_transactions_booking_id_idx" ON "ledger_transactions"("booking_id");

-- CreateIndex
CREATE INDEX "ledger_transactions_reverses_transaction_id_idx" ON "ledger_transactions"("reverses_transaction_id");

-- CreateIndex
CREATE INDEX "ledger_entries_account_id_idx" ON "ledger_entries"("account_id");

-- CreateIndex
CREATE INDEX "ledger_entries_transaction_id_idx" ON "ledger_entries"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_disbursements_idempotency_key_key" ON "financial_disbursements"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "financial_disbursements_utr_reference_key" ON "financial_disbursements"("utr_reference");

-- CreateIndex
CREATE INDEX "financial_disbursements_owner_id_idx" ON "financial_disbursements"("owner_id");

-- CreateIndex
CREATE INDEX "financial_disbursements_status_idx" ON "financial_disbursements"("status");

-- CreateIndex
CREATE INDEX "owner_subscriptions_owner_id_idx" ON "owner_subscriptions"("owner_id");

-- CreateIndex
CREATE INDEX "owner_subscriptions_status_idx" ON "owner_subscriptions"("status");

-- CreateIndex
CREATE INDEX "student_subscriptions_student_id_idx" ON "student_subscriptions"("student_id");

-- CreateIndex
CREATE INDEX "student_subscriptions_status_idx" ON "student_subscriptions"("status");

-- CreateIndex
CREATE INDEX "sponsorship_campaigns_owner_id_idx" ON "sponsorship_campaigns"("owner_id");

-- CreateIndex
CREATE INDEX "sponsorship_campaigns_property_id_idx" ON "sponsorship_campaigns"("property_id");

-- CreateIndex
CREATE INDEX "sponsorship_campaigns_placement_status_idx" ON "sponsorship_campaigns"("placement", "status");

-- CreateIndex
CREATE INDEX "system_notifications_user_id_status_idx" ON "system_notifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "system_notifications_created_at_idx" ON "system_notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticket_number_key" ON "support_tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "support_tickets_created_by_user_id_idx" ON "support_tickets"("created_by_user_id");

-- CreateIndex
CREATE INDEX "support_tickets_assigned_admin_id_idx" ON "support_tickets"("assigned_admin_id");

-- CreateIndex
CREATE INDEX "support_tickets_category_status_idx" ON "support_tickets"("category", "status");

-- CreateIndex
CREATE INDEX "support_tickets_priority_idx" ON "support_tickets"("priority");

-- CreateIndex
CREATE INDEX "support_messages_ticket_id_idx" ON "support_messages"("ticket_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_admin_id_idx" ON "admin_audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_category_idx" ON "admin_audit_logs"("action_category");

-- CreateIndex
CREATE INDEX "admin_audit_logs_target_entity_target_entity_id_idx" ON "admin_audit_logs"("target_entity", "target_entity_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_recorded_at_idx" ON "admin_audit_logs"("recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_outbox_idempotency_key_key" ON "email_outbox"("idempotency_key");

-- CreateIndex
CREATE INDEX "email_outbox_status_next_attempt_at_idx" ON "email_outbox"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "email_outbox_recipient_idx" ON "email_outbox"("recipient");

-- CreateIndex
CREATE INDEX "email_outbox_provider_message_id_idx" ON "email_outbox"("provider_message_id");

-- CreateIndex
CREATE INDEX "email_outbox_created_at_idx" ON "email_outbox"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_delivery_events_provider_event_id_key" ON "email_delivery_events"("provider_event_id");

-- CreateIndex
CREATE INDEX "email_delivery_events_email_outbox_id_idx" ON "email_delivery_events"("email_outbox_id");

-- CreateIndex
CREATE INDEX "email_delivery_events_provider_message_id_idx" ON "email_delivery_events"("provider_message_id");

-- CreateIndex
CREATE INDEX "email_delivery_events_recipient_idx" ON "email_delivery_events"("recipient");

-- CreateIndex
CREATE INDEX "email_delivery_events_event_type_idx" ON "email_delivery_events"("event_type");

-- CreateIndex
CREATE UNIQUE INDEX "email_suppressions_email_key" ON "email_suppressions"("email");

-- CreateIndex
CREATE INDEX "email_suppressions_email_idx" ON "email_suppressions"("email");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_mfa_credentials" ADD CONSTRAINT "admin_mfa_credentials_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_mfa_recovery_codes" ADD CONSTRAINT "admin_mfa_recovery_codes_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_role_permissions" ADD CONSTRAINT "admin_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "admin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_role_permissions" ADD CONSTRAINT "admin_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "admin_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "admin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_credentials" ADD CONSTRAINT "mfa_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_recovery_codes" ADD CONSTRAINT "mfa_recovery_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_verification_documents" ADD CONSTRAINT "student_verification_documents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_preferences" ADD CONSTRAINT "student_preferences_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_saved_properties" ADD CONSTRAINT "student_saved_properties_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_saved_properties" ADD CONSTRAINT "student_saved_properties_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_search_histories" ADD CONSTRAINT "student_search_histories_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_profiles" ADD CONSTRAINT "owner_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_kyc_documents" ADD CONSTRAINT "owner_kyc_documents_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owner_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_bank_accounts" ADD CONSTRAINT "owner_bank_accounts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owner_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owner_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_photos" ADD CONSTRAINT "property_photos_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_rules" ADD CONSTRAINT "property_rules_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_verification_audits" ADD CONSTRAINT "property_verification_audits_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_verification_audits" ADD CONSTRAINT "property_verification_audits_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_reservations" ADD CONSTRAINT "bed_reservations_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_reservations" ADD CONSTRAINT "bed_reservations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_reservations" ADD CONSTRAINT "bed_reservations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_histories" ADD CONSTRAINT "booking_status_histories_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_histories" ADD CONSTRAINT "booking_status_histories_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_histories" ADD CONSTRAINT "booking_status_histories_changed_by_admin_id_fkey" FOREIGN KEY ("changed_by_admin_id") REFERENCES "admin_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_slots" ADD CONSTRAINT "visit_slots_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_availability_options" ADD CONSTRAINT "visit_availability_options_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_coordinations" ADD CONSTRAINT "visit_coordinations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_coordinations" ADD CONSTRAINT "visit_coordinations_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteer_profiles"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_decisions" ADD CONSTRAINT "visit_decisions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_reminders" ADD CONSTRAINT "visit_reminders_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_assignment_histories" ADD CONSTRAINT "visit_assignment_histories_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_assignment_histories" ADD CONSTRAINT "visit_assignment_histories_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteer_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_assignment_histories" ADD CONSTRAINT "visit_assignment_histories_assigned_by_admin_id_fkey" FOREIGN KEY ("assigned_by_admin_id") REFERENCES "admin_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_feedbacks" ADD CONSTRAINT "visit_feedbacks_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_feedbacks" ADD CONSTRAINT "visit_feedbacks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_profiles" ADD CONSTRAINT "volunteer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteer_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_assigned_by_admin_id_fkey" FOREIGN KEY ("assigned_by_admin_id") REFERENCES "admin_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_reviews" ADD CONSTRAINT "volunteer_reviews_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteer_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_reviews" ADD CONSTRAINT "volunteer_reviews_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "admin_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_payments" ADD CONSTRAINT "financial_payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_payments" ADD CONSTRAINT "financial_payments_payer_user_id_fkey" FOREIGN KEY ("payer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "financial_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_disbursement_id_fkey" FOREIGN KEY ("disbursement_id") REFERENCES "financial_disbursements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_reverses_transaction_id_fkey" FOREIGN KEY ("reverses_transaction_id") REFERENCES "ledger_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "ledger_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_disbursements" ADD CONSTRAINT "financial_disbursements_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owner_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_disbursements" ADD CONSTRAINT "financial_disbursements_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "owner_bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_subscriptions" ADD CONSTRAINT "owner_subscriptions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owner_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_subscriptions" ADD CONSTRAINT "student_subscriptions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_campaigns" ADD CONSTRAINT "sponsorship_campaigns_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owner_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_campaigns" ADD CONSTRAINT "sponsorship_campaigns_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_notifications" ADD CONSTRAINT "system_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_admin_id_fkey" FOREIGN KEY ("assigned_admin_id") REFERENCES "admin_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_sender_admin_id_fkey" FOREIGN KEY ("sender_admin_id") REFERENCES "admin_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_delivery_events" ADD CONSTRAINT "email_delivery_events_email_outbox_id_fkey" FOREIGN KEY ("email_outbox_id") REFERENCES "email_outbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;
