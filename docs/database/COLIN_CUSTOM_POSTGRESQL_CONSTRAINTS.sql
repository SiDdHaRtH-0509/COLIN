-- =============================================================================
-- COLIN PLATFORM — CUSTOM POSTGRESQL CONSTRAINTS & INTEGRITY TRIGGERS
-- Phase 4A.2.2.1-R2.1.1 Hardening & Acceptance Closure Specification
-- Database Engine: PostgreSQL 16+
-- Architecture: Single Source of Truth for Public, Student, Owner & Admin
-- Roles: colin_owner, colin_migrator, colin_app_runtime, colin_admin_runtime
-- NOTE: Specification only. Do not execute against production database.
-- =============================================================================

-- =============================================================================
-- 1. TASK 3: BOOKING FINANCIAL RECONCILIATION & EXACT ALLOCATION
-- =============================================================================

-- Invariant 1.1: Exact Financial Reconciliation Check
-- A booking cannot be in an unpaid state with paid funds, nor in a paid state without full fee payment.
-- Reconciles FORFEITED payment status across Prisma and SQL.
ALTER TABLE booking_requests
DROP CONSTRAINT IF EXISTS chk_booking_financial_reconciliation;

ALTER TABLE booking_requests
ADD CONSTRAINT chk_booking_financial_reconciliation
CHECK (
  (amount_paid = 0.00 AND payment_status = 'UNPAID') OR
  (amount_paid = booking_fee_amount AND payment_status IN ('PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FORFEITED'))
);

-- Invariant 1.2: Monetary Non-Negativity Check
ALTER TABLE booking_requests
DROP CONSTRAINT IF EXISTS chk_booking_requests_amounts_non_negative;

ALTER TABLE booking_requests
ADD CONSTRAINT chk_booking_requests_amounts_non_negative
CHECK (
  booking_fee_amount >= 0.00 AND
  amount_paid >= 0.00 AND
  refund_amount >= 0.00 AND
  platform_fee_retained >= 0.00
);

-- Invariant 1.3: Exact Financial Allocation for Completed Settlements
-- Precludes both under-allocation (e.g. ₹150 paid, refund ₹82.50, retained ₹50 -> unallocated ₹17.50)
-- and over-allocation. If pending, both refund and retained must be 0.
ALTER TABLE booking_requests
DROP CONSTRAINT IF EXISTS chk_booking_settlement_exact_allocation;

ALTER TABLE booking_requests
ADD CONSTRAINT chk_booking_settlement_exact_allocation
CHECK (
  -- If pending decision, no settlement funds may be allocated
  (student_decision = 'PENDING' AND refund_amount = 0.00 AND platform_fee_retained = 0.00) OR
  -- If terminal decision reached, exact 100% allocation of amount paid is mandatory
  (student_decision IN ('ACCEPTED', 'REJECTED', 'EXPIRED') AND (refund_amount + platform_fee_retained) = amount_paid)
);

-- Invariant 1.4: Strict Decision-to-Payment-Status Coherence
-- Enforces: REJECTED -> PARTIALLY_REFUNDED (not generic REFUNDED)
--           ACCEPTED -> PAID
--           EXPIRED  -> FORFEITED
ALTER TABLE booking_requests
DROP CONSTRAINT IF EXISTS chk_booking_decision_payment_status_coherence;

ALTER TABLE booking_requests
ADD CONSTRAINT chk_booking_decision_payment_status_coherence
CHECK (
  (student_decision = 'PENDING') OR
  (student_decision = 'ACCEPTED' AND payment_status = 'PAID' AND refund_amount = 0.00 AND platform_fee_retained = amount_paid) OR
  (student_decision = 'REJECTED' AND payment_status = 'PARTIALLY_REFUNDED' AND refund_amount = 82.50 AND platform_fee_retained = 67.50) OR
  (student_decision = 'EXPIRED' AND payment_status = 'FORFEITED' AND refund_amount = 0.00 AND platform_fee_retained = amount_paid)
);

-- Invariant 1.5: 12-Hour Decision Deadline Alignment
ALTER TABLE booking_requests
DROP CONSTRAINT IF EXISTS chk_booking_requests_decision_deadline;

ALTER TABLE booking_requests
ADD CONSTRAINT chk_booking_requests_decision_deadline
CHECK (
  (visit_completed_at IS NULL AND decision_deadline IS NULL) OR
  (
    visit_completed_at IS NOT NULL AND
    decision_deadline IS NOT NULL AND
    decision_deadline = visit_completed_at + INTERVAL '12 hours'
  )
);

-- Invariant 1.6: Decision-to-Fee Financial Partition Enforcement Trigger
CREATE OR REPLACE FUNCTION validate_booking_decision_financial_partition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_decision = 'PENDING' THEN
    IF NEW.refund_amount != 0.00 OR NEW.platform_fee_retained != 0.00 THEN
      RAISE EXCEPTION 'Financial Partition Violation: PENDING booking % cannot have settlement amounts allocated (got refund=%, retained=%)',
        NEW.id, NEW.refund_amount, NEW.platform_fee_retained;
    END IF;
  ELSIF NEW.student_decision = 'ACCEPTED' THEN
    -- Student moves in: 100% platform fee retained towards onboarding, ₹0.00 refund
    IF NEW.refund_amount != 0.00 OR NEW.platform_fee_retained != NEW.amount_paid THEN
      RAISE EXCEPTION 'Financial Partition Violation: ACCEPTED booking % must have refund=0.00 and platform_fee_retained=% (got refund=%, retained=%)',
        NEW.id, NEW.amount_paid, NEW.refund_amount, NEW.platform_fee_retained;
    END IF;
    IF NEW.payment_status != 'PAID' THEN
      RAISE EXCEPTION 'Financial Partition Violation: ACCEPTED booking % must have payment_status=PAID (got %)',
        NEW.id, NEW.payment_status;
    END IF;
  ELSIF NEW.student_decision = 'REJECTED' THEN
    -- Student rejects after visit: exact 55% refund (₹82.50 of ₹150.00), 45% retained (₹67.50 of ₹150.00)
    IF NEW.amount_paid = 150.00 THEN
      IF NEW.refund_amount != 82.50 OR NEW.platform_fee_retained != 67.50 THEN
        RAISE EXCEPTION 'Financial Partition Violation: REJECTED booking % must have refund=82.50 and platform_fee_retained=67.50 (got refund=%, retained=%)',
          NEW.id, NEW.refund_amount, NEW.platform_fee_retained;
      END IF;
    END IF;
    IF (NEW.refund_amount + NEW.platform_fee_retained) != NEW.amount_paid THEN
      RAISE EXCEPTION 'Financial Partition Violation: REJECTED settlement under-allocated or over-allocated (sum=% expected=%)',
        (NEW.refund_amount + NEW.platform_fee_retained), NEW.amount_paid;
    END IF;
    IF NEW.payment_status != 'PARTIALLY_REFUNDED' THEN
      RAISE EXCEPTION 'Financial Partition Violation: REJECTED booking % must have payment_status=PARTIALLY_REFUNDED (got %)',
        NEW.id, NEW.payment_status;
    END IF;
  ELSIF NEW.student_decision = 'EXPIRED' THEN
    -- Student failed to decide within 12h: 0% refund (₹0.00), 100% retained (₹150.00 forfeited)
    IF NEW.refund_amount != 0.00 OR NEW.platform_fee_retained != NEW.amount_paid THEN
      RAISE EXCEPTION 'Financial Partition Violation: EXPIRED booking % must have refund=0.00 and platform_fee_retained=% (got refund=%, retained=%)',
        NEW.id, NEW.amount_paid, NEW.refund_amount, NEW.platform_fee_retained;
    END IF;
    IF NEW.payment_status != 'FORFEITED' THEN
      RAISE EXCEPTION 'Financial Partition Violation: EXPIRED booking % must have payment_status=FORFEITED (got %)',
        NEW.id, NEW.payment_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_booking_decision_financial_partition ON booking_requests;
CREATE TRIGGER trg_validate_booking_decision_financial_partition
BEFORE INSERT OR UPDATE OF student_decision, refund_amount, platform_fee_retained, amount_paid, payment_status ON booking_requests
FOR EACH ROW
EXECUTE FUNCTION validate_booking_decision_financial_partition();


-- =============================================================================
-- 2. TASK 4: BALANCED DOUBLE-ENTRY LEDGER & REVERSAL ARCHITECTURE
-- =============================================================================

-- Invariant 2.1: Strictly Positive Entry Amounts
ALTER TABLE ledger_entries
DROP CONSTRAINT IF EXISTS chk_ledger_entry_amount_positive;

ALTER TABLE ledger_entries
ADD CONSTRAINT chk_ledger_entry_amount_positive
CHECK (amount > 0.00);

-- Invariant 2.2: Posting Lifecycle Verification Trigger
-- Verifies transaction balance, >= 2 entries, currency consistency, and assigns posted_at timestamp
CREATE OR REPLACE FUNCTION verify_posted_ledger_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_total_debits NUMERIC(12, 2);
  v_total_credits NUMERIC(12, 2);
  v_entry_count INT;
  v_mismatched_currency_count INT;
BEGIN
  -- Only execute verification when transitioning to POSTED
  IF NEW.status = 'POSTED' AND (TG_OP = 'INSERT' OR OLD.status != 'POSTED') THEN
    SELECT
      COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END), 0.00),
      COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END), 0.00),
      COUNT(*),
      COUNT(CASE WHEN currency != NEW.currency THEN 1 END)
    INTO v_total_debits, v_total_credits, v_entry_count, v_mismatched_currency_count
    FROM ledger_entries
    WHERE transaction_id = NEW.id;

    IF v_entry_count < 2 THEN
      RAISE EXCEPTION 'Accounting Invariant Violation: Ledger transaction % must have at least 2 entries before posting (found %)',
        NEW.id, v_entry_count;
    END IF;

    IF v_total_debits != v_total_credits THEN
      RAISE EXCEPTION 'Accounting Invariant Violation: Unbalanced journal transaction %. Debits: %, Credits: %',
        NEW.id, v_total_debits, v_total_credits;
    END IF;

    IF v_mismatched_currency_count > 0 THEN
      RAISE EXCEPTION 'Accounting Invariant Violation: Ledger transaction % has % entries with currency mismatch (expected %)',
        NEW.id, v_mismatched_currency_count, NEW.currency;
    END IF;

    IF NEW.posted_at IS NULL THEN
      NEW.posted_at := CLOCK_TIMESTAMP();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_posted_ledger_transaction ON ledger_transactions;
CREATE TRIGGER trg_verify_posted_ledger_transaction
BEFORE INSERT OR UPDATE OF status ON ledger_transactions
FOR EACH ROW
EXECUTE FUNCTION verify_posted_ledger_transaction();

-- Invariant 2.3: Immutability of Posted Ledger Entries & Lock Protocol
-- Prohibits moving an entry between transactions (transaction_id is immutable)
-- Prohibits INSERT, UPDATE, and DELETE on entries belonging to POSTED or REVERSED transactions
CREATE OR REPLACE FUNCTION prevent_posted_ledger_entry_mutation()
RETURNS TRIGGER AS $$
DECLARE
  v_tx_status VARCHAR(20);
  v_tx_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_tx_id := OLD.transaction_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.transaction_id != OLD.transaction_id THEN
      RAISE EXCEPTION 'Accounting Integrity Violation: Cannot reassign transaction_id on existing ledger entry % (must delete and re-insert into draft transaction)',
        OLD.id;
    END IF;
    v_tx_id := NEW.transaction_id;
  ELSE
    v_tx_id := NEW.transaction_id;
  END IF;

  -- Row-level lock on the parent transaction to serialize entry changes with posting
  SELECT status INTO v_tx_status
  FROM ledger_transactions
  WHERE id = v_tx_id
  FOR UPDATE;

  IF v_tx_status IS NULL THEN
    RAISE EXCEPTION 'Data Integrity Violation: Referenced ledger transaction % does not exist', v_tx_id;
  END IF;

  IF v_tx_status IN ('POSTED', 'REVERSED') THEN
    RAISE EXCEPTION 'Accounting Immutability Violation: Cannot % ledger entry. Parent transaction % is %.',
      TG_OP, v_tx_id, v_tx_status;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_ledger_entries ON ledger_entries;
CREATE TRIGGER trg_immutable_ledger_entries
BEFORE INSERT OR UPDATE OR DELETE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_posted_ledger_entry_mutation();

-- Invariant 2.4: Immutability of Posted Ledger Transactions & Reversal Linkage
CREATE OR REPLACE FUNCTION prevent_posted_ledger_transaction_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('POSTED', 'REVERSED') THEN
      RAISE EXCEPTION 'Accounting Immutability Violation: Cannot delete % transaction %', OLD.status, OLD.id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'POSTED' THEN
      -- Permitted: transitioning status to REVERSED while preserving all financial columns
      IF NEW.status = 'REVERSED' AND
         NEW.id = OLD.id AND
         NEW.transaction_number = OLD.transaction_number AND
         NEW.currency = OLD.currency AND
         NEW.posted_at = OLD.posted_at THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'Accounting Immutability Violation: Posted transaction % cannot be modified except transitioning to REVERSED with financial fields unchanged.', OLD.id;
    ELSIF OLD.status = 'REVERSED' THEN
      RAISE EXCEPTION 'Accounting Immutability Violation: Reversed transaction % is terminal and immutable.', OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_posted_ledger_transactions ON ledger_transactions;
CREATE TRIGGER trg_immutable_posted_ledger_transactions
BEFORE UPDATE OR DELETE ON ledger_transactions
FOR EACH ROW
EXECUTE FUNCTION prevent_posted_ledger_transaction_mutation();

-- Reversal Procedure: Atomically creates and posts reversing transaction
CREATE OR REPLACE FUNCTION reverse_ledger_transaction(
  p_original_tx_id UUID,
  p_reversal_tx_number VARCHAR(50),
  p_description VARCHAR(255),
  p_reversal_type VARCHAR(50) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_orig_status VARCHAR(20);
  v_orig_type VARCHAR(50);
  v_orig_currency VARCHAR(3);
  v_reversal_id UUID;
  v_actual_rev_type VARCHAR(50);
  v_entry RECORD;
BEGIN
  -- Lock original transaction
  SELECT status, transaction_type, currency INTO v_orig_status, v_orig_type, v_orig_currency
  FROM ledger_transactions
  WHERE id = p_original_tx_id
  FOR UPDATE;

  IF v_orig_status IS NULL THEN
    RAISE EXCEPTION 'Accounting Reversal Violation: Original transaction % not found', p_original_tx_id;
  END IF;

  IF v_orig_status != 'POSTED' THEN
    RAISE EXCEPTION 'Accounting Reversal Violation: Cannot reverse transaction % in % status (must be POSTED)',
      p_original_tx_id, v_orig_status;
  END IF;

  -- Check for existing reversal
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE reverses_transaction_id = p_original_tx_id) THEN
    RAISE EXCEPTION 'Accounting Reversal Violation: Transaction % has already been reversed', p_original_tx_id;
  END IF;

  -- Determine valid reversal transaction type from JournalTransactionType enum
  IF p_reversal_type IS NOT NULL THEN
    IF p_reversal_type NOT IN (
      'VISIT_FEE_COLLECTION', 'VISIT_REJECTION_REFUND', 'VISIT_ACCEPTANCE_SETTLEMENT',
      'VISIT_EXPIRATION_SETTLEMENT', 'OWNER_SUBSCRIPTION_PAYMENT', 'STUDENT_SUBSCRIPTION_PAYMENT',
      'DISBURSEMENT_PAYOUT', 'DISBURSEMENT_REVERSAL'
    ) THEN
      RAISE EXCEPTION 'Accounting Reversal Violation: Invalid reversal transaction type %', p_reversal_type;
    END IF;
    v_actual_rev_type := p_reversal_type;
  ELSE
    IF v_orig_type = 'DISBURSEMENT_PAYOUT' THEN
      v_actual_rev_type := 'DISBURSEMENT_REVERSAL';
    ELSIF v_orig_type = 'VISIT_FEE_COLLECTION' THEN
      v_actual_rev_type := 'VISIT_REJECTION_REFUND';
    ELSE
      v_actual_rev_type := 'DISBURSEMENT_REVERSAL';
    END IF;
  END IF;

  v_reversal_id := gen_random_uuid();

  -- Create reversal transaction
  INSERT INTO ledger_transactions (
    id, transaction_number, transaction_type, status, currency, description,
    idempotency_key, reverses_transaction_id, created_at
  ) VALUES (
    v_reversal_id, p_reversal_tx_number, v_actual_rev_type::"JournalTransactionType", 'DRAFT'::"LedgerTransactionStatus", v_orig_currency, p_description,
    'idemp-rev-' || v_reversal_id::text, p_original_tx_id, CLOCK_TIMESTAMP()
  );

  -- Copy inverted entries (DEBIT <-> CREDIT)
  FOR v_entry IN SELECT * FROM ledger_entries WHERE transaction_id = p_original_tx_id LOOP
    INSERT INTO ledger_entries (
      id, transaction_id, account_id, entry_type, amount, currency, created_at
    ) VALUES (
      gen_random_uuid(),
      v_reversal_id,
      v_entry.account_id,
      (CASE WHEN v_entry.entry_type = 'DEBIT' THEN 'CREDIT' ELSE 'DEBIT' END)::"LedgerEntryType",
      v_entry.amount,
      v_entry.currency,
      CLOCK_TIMESTAMP()
    );
  END LOOP;

  -- Post the reversal transaction
  UPDATE ledger_transactions SET status = 'POSTED'::"LedgerTransactionStatus", posted_at = CLOCK_TIMESTAMP() WHERE id = v_reversal_id;

  -- Mark original transaction as REVERSED
  UPDATE ledger_transactions SET status = 'REVERSED'::"LedgerTransactionStatus" WHERE id = p_original_tx_id;

  RETURN v_reversal_id;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 3. TASK 5: VOLUNTEER ASSIGNMENT SNAPSHOT TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION record_volunteer_assignment_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  v_volunteer_exists BOOLEAN;
  v_volunteer_name VARCHAR(150);
  v_volunteer_phone VARCHAR(20);
BEGIN
  -- Verify volunteer exists in users
  SELECT EXISTS(SELECT 1 FROM users WHERE id = NEW.volunteer_id) INTO v_volunteer_exists;
  IF NOT v_volunteer_exists THEN
    RAISE EXCEPTION 'Data Integrity Violation: Referenced volunteer % does not exist in users', NEW.volunteer_id;
  END IF;

  -- Accurately join users and user_profiles based on actual Prisma schema
  SELECT 
    CASE 
      WHEN up.first_name IS NOT NULL AND up.last_name IS NOT NULL THEN
        TRIM(CONCAT(up.first_name, ' ', up.last_name))
      WHEN up.first_name IS NOT NULL THEN
        up.first_name
      ELSE
        'Volunteer ' || SUBSTRING(NEW.volunteer_id::text, 1, 8)
    END,
    u.phone
  INTO v_volunteer_name, v_volunteer_phone
  FROM users u
  LEFT JOIN user_profiles up ON up.user_id = u.id
  WHERE u.id = NEW.volunteer_id;

  IF v_volunteer_name IS NULL OR v_volunteer_name = '' THEN
    v_volunteer_name := 'Volunteer ' || SUBSTRING(NEW.volunteer_id::text, 1, 8);
  END IF;

  -- Create immutable assignment history entry with denormalized snapshots
  IF NEW.booking_id IS NOT NULL THEN
    INSERT INTO visit_assignment_histories (
      id,
      booking_id,
      volunteer_id,
      volunteer_name_snapshot,
      volunteer_phone_snapshot,
      assigned_by_admin_id,
      assigned_at,
      status
    ) VALUES (
      gen_random_uuid(),
      NEW.booking_id,
      NEW.volunteer_id,
      v_volunteer_name,
      v_volunteer_phone,
      NEW.assigned_by_admin_id,
      CLOCK_TIMESTAMP(),
      NEW.status
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_record_volunteer_assignment_snapshot ON volunteer_assignments;
CREATE TRIGGER trg_record_volunteer_assignment_snapshot
BEFORE INSERT ON volunteer_assignments
FOR EACH ROW
EXECUTE FUNCTION record_volunteer_assignment_snapshot();


-- =============================================================================
-- 4. TASK 6: PAYOUT BENEFICIARY VALIDATION & REDIRECTION DEFENSE
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_disbursements_idempotency
ON financial_disbursements (idempotency_key);

CREATE OR REPLACE FUNCTION validate_disbursement_payout_eligibility()
RETURNS TRIGGER AS $$
DECLARE
  v_bank_owner_id UUID;
  v_is_active BOOLEAN;
  v_is_verified BOOLEAN;
  v_beneficiary_id VARCHAR(100);
  v_token_encrypted TEXT;
BEGIN
  IF NEW.amount <= 0.00 THEN
    RAISE EXCEPTION 'Payout Safety Violation: Disbursement amount % must be strictly positive', NEW.amount;
  END IF;

  -- Lock the bank account row to prevent concurrent modification or deactivation during payout creation
  SELECT 
    owner_id, 
    is_active, 
    is_verified, 
    gateway_beneficiary_id, 
    beneficiary_token_encrypted
  INTO 
    v_bank_owner_id, 
    v_is_active, 
    v_is_verified, 
    v_beneficiary_id, 
    v_token_encrypted
  FROM owner_bank_accounts
  WHERE id = NEW.bank_account_id
  FOR UPDATE;

  IF v_bank_owner_id IS NULL THEN
    RAISE EXCEPTION 'Payout Safety Violation: Referenced bank account % does not exist', NEW.bank_account_id;
  END IF;

  IF v_bank_owner_id != NEW.owner_id THEN
    RAISE EXCEPTION 'Ownership Violation: Bank account % belongs to Owner %, not payee Owner %',
      NEW.bank_account_id, v_bank_owner_id, NEW.owner_id;
  END IF;

  IF v_is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Payout Safety Violation: Bank account % is inactive and cannot receive disbursements',
      NEW.bank_account_id;
  END IF;

  IF v_is_verified IS NOT TRUE THEN
    RAISE EXCEPTION 'Payout Safety Violation: Bank account % is not verified by banking partner',
      NEW.bank_account_id;
  END IF;

  IF v_beneficiary_id IS NULL OR TRIM(v_beneficiary_id) = '' THEN
    RAISE EXCEPTION 'Payout Safety Violation: Bank account % lacks gateway beneficiary reference',
      NEW.bank_account_id;
  END IF;

  IF v_token_encrypted IS NULL OR TRIM(v_token_encrypted) = '' THEN
    RAISE EXCEPTION 'Payout Safety Violation: Bank account % lacks encrypted beneficiary token',
      NEW.bank_account_id;
  END IF;

  -- Re-validation check specifically for PROCESSING transition
  IF NEW.status = 'PROCESSING' THEN
    IF v_is_active IS NOT TRUE OR v_is_verified IS NOT TRUE THEN
      RAISE EXCEPTION 'Payout Safety Violation: Bank account % must be active and verified during PROCESSING transition',
        NEW.bank_account_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_disbursement_payout_eligibility ON financial_disbursements;
CREATE TRIGGER trg_validate_disbursement_payout_eligibility
BEFORE INSERT OR UPDATE OF owner_id, bank_account_id, amount, status ON financial_disbursements
FOR EACH ROW
EXECUTE FUNCTION validate_disbursement_payout_eligibility();


-- =============================================================================
-- 5. TASK 7: BI-DIRECTIONAL BED & BOOKING RELATIONSHIP CONSISTENCY
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_bed_reservation
ON bed_reservations (bed_id)
WHERE status IN ('TEMPORARY_HOLD', 'CONFIRMED');

CREATE OR REPLACE FUNCTION validate_bed_reservation_integrity()
RETURNS TRIGGER AS $$
DECLARE
  v_bed_property_id UUID;
  v_booking_property_id UUID;
  v_booking_student_id UUID;
  v_booking_bed_id UUID;
BEGIN
  -- Lock the bed to serialize concurrent reservation attempts
  SELECT r.property_id INTO v_bed_property_id
  FROM beds b
  JOIN rooms r ON b.room_id = r.id
  WHERE b.id = NEW.bed_id
  FOR UPDATE;

  IF v_bed_property_id IS NULL THEN
    RAISE EXCEPTION 'Data Integrity Violation: Bed % does not exist or has no parent room', NEW.bed_id;
  END IF;

  IF NEW.booking_id IS NOT NULL THEN
    -- Lock booking to verify coherence
    SELECT property_id, student_id, bed_id
    INTO v_booking_property_id, v_booking_student_id, v_booking_bed_id
    FROM booking_requests
    WHERE id = NEW.booking_id
    FOR UPDATE;

    IF v_booking_property_id IS NULL THEN
      RAISE EXCEPTION 'Data Integrity Violation: Referenced booking % does not exist', NEW.booking_id;
    END IF;

    IF v_bed_property_id != v_booking_property_id THEN
      RAISE EXCEPTION 'Cross-Property Violation: Reserved bed % belongs to property %, but booking % is for property %',
        NEW.bed_id, v_bed_property_id, NEW.booking_id, v_booking_property_id;
    END IF;

    IF NEW.student_id != v_booking_student_id THEN
      RAISE EXCEPTION 'Student Mismatch: Reservation student % does not match booking student %',
        NEW.student_id, v_booking_student_id;
    END IF;

    IF v_booking_bed_id IS NOT NULL AND v_booking_bed_id != NEW.bed_id THEN
      RAISE EXCEPTION 'Bed Mismatch: Reservation bed % does not match booking bed %',
        NEW.bed_id, v_booking_bed_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_bed_reservation_integrity ON bed_reservations;
CREATE TRIGGER trg_validate_bed_reservation_integrity
BEFORE INSERT OR UPDATE OF bed_id, booking_id, student_id, status ON bed_reservations
FOR EACH ROW
EXECUTE FUNCTION validate_bed_reservation_integrity();

CREATE OR REPLACE FUNCTION validate_booking_bed_reservation_consistency()
RETURNS TRIGGER AS $$
DECLARE
  v_active_reservation_count INT;
  v_active_bed_id UUID;
BEGIN
  SELECT COUNT(*), MAX(bed_id::text)::uuid
  INTO v_active_reservation_count, v_active_bed_id
  FROM bed_reservations
  WHERE booking_id = NEW.id AND status IN ('TEMPORARY_HOLD', 'CONFIRMED');

  IF v_active_reservation_count > 0 THEN
    IF NEW.property_id != OLD.property_id THEN
      RAISE EXCEPTION 'Booking Consistency Violation: Cannot change property of booking % while active bed reservation exists',
        NEW.id;
    END IF;

    IF NEW.student_id != OLD.student_id THEN
      RAISE EXCEPTION 'Booking Consistency Violation: Cannot change student of booking % while active bed reservation exists',
        NEW.id;
    END IF;

    IF NEW.bed_id IS NOT NULL AND NEW.bed_id != v_active_bed_id THEN
      RAISE EXCEPTION 'Booking Consistency Violation: Booking bed % does not match active reserved bed %',
        NEW.bed_id, v_active_bed_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_booking_bed_reservation_consistency ON booking_requests;
CREATE TRIGGER trg_validate_booking_bed_reservation_consistency
BEFORE UPDATE OF property_id, student_id, bed_id ON booking_requests
FOR EACH ROW
EXECUTE FUNCTION validate_booking_bed_reservation_consistency();

CREATE OR REPLACE FUNCTION expire_stale_bed_reservations()
RETURNS INT AS $$
DECLARE
  v_expired_count INT;
BEGIN
  UPDATE bed_reservations
  SET 
    status = 'EXPIRED',
    released_at = CLOCK_TIMESTAMP(),
    release_reason = 'Temporary hold expired after statutory window',
    updated_at = CLOCK_TIMESTAMP()
  WHERE status = 'TEMPORARY_HOLD'
    AND hold_expires_at IS NOT NULL
    AND hold_expires_at <= CLOCK_TIMESTAMP();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 6. TASK 8: PROPERTY PHOTO LIMIT AND CROSS-PROPERTY LOCKING
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_property_cover_photo
ON property_photos (property_id)
WHERE is_cover = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_property_photo_display_order
ON property_photos (property_id, display_order);

CREATE OR REPLACE FUNCTION enforce_max_property_photos()
RETURNS TRIGGER AS $$
DECLARE
  v_dummy UUID;
  v_photo_count INT;
BEGIN
  -- Handle cross-property update with deterministic lock ordering
  IF TG_OP = 'UPDATE' AND OLD.property_id != NEW.property_id THEN
    IF OLD.property_id < NEW.property_id THEN
      PERFORM id FROM properties WHERE id = OLD.property_id FOR UPDATE;
      PERFORM id FROM properties WHERE id = NEW.property_id FOR UPDATE;
    ELSE
      PERFORM id FROM properties WHERE id = NEW.property_id FOR UPDATE;
      PERFORM id FROM properties WHERE id = OLD.property_id FOR UPDATE;
    END IF;
  ELSE
    PERFORM id FROM properties WHERE id = NEW.property_id FOR UPDATE;
  END IF;

  SELECT COUNT(*) INTO v_photo_count
  FROM property_photos
  WHERE property_id = NEW.property_id
    AND (TG_OP = 'INSERT' OR id != NEW.id);

  IF v_photo_count >= 8 THEN
    RAISE EXCEPTION 'COLIN Constraint Violation: Property % already has the maximum allowed 8 photos (attempted to add photo %)',
      NEW.property_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_max_property_photos ON property_photos;
CREATE TRIGGER trg_enforce_max_property_photos
BEFORE INSERT OR UPDATE OF property_id ON property_photos
FOR EACH ROW
EXECUTE FUNCTION enforce_max_property_photos();


-- =============================================================================
-- 7. TASK 9: FINAL STUDENT DECISION IMMUTABILITY
-- =============================================================================

CREATE OR REPLACE FUNCTION prevent_final_decision_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Decision Immutability Violation: Cannot delete recorded visit decision for booking %', OLD.booking_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.decision IN ('ACCEPTED', 'REJECTED', 'EXPIRED') THEN
      RAISE EXCEPTION 'Decision Immutability Violation: Final student decision % on booking % is immutable and cannot be overwritten.',
        OLD.decision, OLD.booking_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_final_decision_mutation ON visit_decisions;
CREATE TRIGGER trg_prevent_final_decision_mutation
BEFORE UPDATE OR DELETE ON visit_decisions
FOR EACH ROW
EXECUTE FUNCTION prevent_final_decision_mutation();

CREATE OR REPLACE FUNCTION prevent_booking_decision_reversal()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.student_decision IN ('ACCEPTED', 'REJECTED', 'EXPIRED') AND NEW.student_decision != OLD.student_decision THEN
    RAISE EXCEPTION 'Decision Immutability Violation: Terminal booking decision % cannot be reversed or modified.',
      OLD.student_decision;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_booking_decision_reversal ON booking_requests;
CREATE TRIGGER trg_prevent_booking_decision_reversal
BEFORE UPDATE OF student_decision ON booking_requests
FOR EACH ROW
EXECUTE FUNCTION prevent_booking_decision_reversal();

CREATE OR REPLACE FUNCTION sync_visit_decision_to_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_payment_status "BookingPaymentStatus";
BEGIN
  IF NEW.decision = 'ACCEPTED' THEN
    v_payment_status := 'PAID'::"BookingPaymentStatus";
  ELSIF NEW.decision = 'REJECTED' THEN
    v_payment_status := 'PARTIALLY_REFUNDED'::"BookingPaymentStatus";
  ELSIF NEW.decision = 'EXPIRED' THEN
    v_payment_status := 'FORFEITED'::"BookingPaymentStatus";
  ELSE
    v_payment_status := 'PAID'::"BookingPaymentStatus";
  END IF;

  UPDATE booking_requests
  SET 
    student_decision = NEW.decision,
    refund_amount = NEW.refund_calculated,
    platform_fee_retained = NEW.retained_fee_calculated,
    decision_submitted_at = NEW.decision_submitted_at,
    payment_status = v_payment_status,
    updated_at = NOW()
  WHERE id = NEW.booking_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_visit_decision_to_booking ON visit_decisions;
CREATE TRIGGER trg_sync_visit_decision_to_booking
AFTER INSERT ON visit_decisions
FOR EACH ROW
EXECUTE FUNCTION sync_visit_decision_to_booking();


-- =============================================================================
-- 8. TASK 10 & 11: DATABASE ROLE ISOLATION & SECURITY ARCHITECTURE
-- =============================================================================

-- 4 Explicit Roles (PoLP / Non-Superuser Ownership):
-- 1. colin_owner: Schema & Object Owner (non-superuser, least privilege)
-- 2. colin_migrator: Dedicated migration role with DDL privileges
-- 3. colin_app_runtime: Standard customer-facing runtime (Student, Owner, Public)
-- 4. colin_admin_runtime: Internal Admin Control Centre operations

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

-- Object ownership strategy: colin_migrator is a member of colin_owner
GRANT colin_owner TO colin_migrator;

-- Grant schema usage and creation
GRANT USAGE, CREATE ON SCHEMA public TO colin_owner;
GRANT USAGE, CREATE ON SCHEMA public TO colin_migrator;
GRANT USAGE ON SCHEMA public TO colin_app_runtime;
GRANT USAGE ON SCHEMA public TO colin_admin_runtime;
REVOKE CREATE ON SCHEMA public FROM colin_app_runtime, colin_admin_runtime;

-- Configure Default Privileges: Future tables created by owner/migrator do NOT grant automatic access to app runtime
ALTER DEFAULT PRIVILEGES FOR ROLE colin_owner IN SCHEMA public REVOKE ALL ON TABLES FROM colin_app_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE colin_migrator IN SCHEMA public REVOKE ALL ON TABLES FROM colin_app_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE colin_owner IN SCHEMA public REVOKE TRUNCATE ON TABLES FROM colin_admin_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE colin_migrator IN SCHEMA public REVOKE TRUNCATE ON TABLES FROM colin_admin_runtime;

-- Runtime operational tables for colin_app_runtime (Public/Student/Owner)
GRANT SELECT, INSERT, UPDATE, DELETE ON 
  users, user_profiles, user_sessions, mfa_credentials, mfa_recovery_codes,
  password_reset_tokens, email_verification_tokens, email_outbox, email_suppressions,
  student_profiles, student_verification_documents,
  student_preferences, student_saved_properties, student_search_histories,
  owner_profiles, owner_kyc_documents, owner_bank_accounts,
  properties, property_photos, property_amenities, property_rules,
  rooms, beds, bed_reservations, booking_requests, visit_slots,
  visit_availability_options, visit_coordinations, visit_decisions,
  visit_reminders, visit_feedbacks, volunteer_profiles, volunteer_assignments,
  financial_payments, financial_disbursements,
  owner_subscriptions, student_subscriptions, sponsorship_campaigns,
  system_notifications, support_tickets, support_messages,
  ledger_accounts
TO colin_app_runtime;

-- STRICT ADMIN ISOLATION: colin_app_runtime CANNOT access admin auth or audit data
REVOKE ALL ON 
  admin_accounts, admin_sessions, admin_mfa_credentials, admin_mfa_recovery_codes,
  admin_roles, admin_permissions, admin_role_permissions, admin_user_roles,
  admin_audit_logs, property_verification_audits, volunteer_reviews
FROM colin_app_runtime;

-- Admin runtime permissions for colin_admin_runtime
GRANT SELECT, INSERT, UPDATE, DELETE ON
  admin_accounts, admin_sessions, admin_mfa_credentials, admin_mfa_recovery_codes,
  admin_user_roles, volunteer_reviews
TO colin_admin_runtime;

GRANT SELECT ON
  admin_roles, admin_permissions, admin_role_permissions
TO colin_admin_runtime;

-- Administrative moderation and approval permissions
GRANT SELECT, UPDATE ON
  properties, property_photos, property_amenities, property_rules, rooms, beds, student_profiles, owner_profiles
TO colin_admin_runtime;

GRANT SELECT ON
  users, user_profiles
TO colin_admin_runtime;

-- Append-Only Audit Logging (Both roles have only SELECT, INSERT)
GRANT SELECT, INSERT ON admin_audit_logs, property_verification_audits TO colin_admin_runtime;
GRANT SELECT, INSERT ON booking_status_histories, visit_assignment_histories TO colin_app_runtime, colin_admin_runtime;
GRANT SELECT, INSERT ON email_delivery_events TO colin_app_runtime, colin_admin_runtime;
GRANT UPDATE (email_outbox_id) ON email_delivery_events TO colin_app_runtime, colin_admin_runtime;

REVOKE UPDATE, DELETE, TRUNCATE ON 
  admin_audit_logs, property_verification_audits, booking_status_histories, visit_assignment_histories 
FROM colin_app_runtime, colin_admin_runtime;
REVOKE DELETE, TRUNCATE ON email_delivery_events FROM colin_app_runtime, colin_admin_runtime;

-- Financial Ledger Restrictions (Both roles have only SELECT, INSERT on entries; no DELETE or TRUNCATE)
GRANT SELECT, INSERT ON ledger_entries, ledger_transactions TO colin_app_runtime, colin_admin_runtime;
GRANT UPDATE (status, posted_at, reverses_transaction_id) ON ledger_transactions TO colin_app_runtime, colin_admin_runtime;

REVOKE UPDATE, DELETE, TRUNCATE ON ledger_entries FROM colin_app_runtime, colin_admin_runtime;
REVOKE DELETE, TRUNCATE ON ledger_transactions FROM colin_app_runtime, colin_admin_runtime;

-- DDL Revocation
REVOKE CREATE ON SCHEMA public FROM colin_app_runtime, colin_admin_runtime;

-- Statement-Level TRUNCATE Protection Triggers
CREATE OR REPLACE FUNCTION prevent_table_truncate()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Security Invariant Violation: Table % is immutable audit/ledger infrastructure. TRUNCATE is strictly forbidden.',
    TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_truncate_admin_audit_logs ON admin_audit_logs;
CREATE TRIGGER trg_prevent_truncate_admin_audit_logs
BEFORE TRUNCATE ON admin_audit_logs
FOR EACH STATEMENT EXECUTE FUNCTION prevent_table_truncate();

DROP TRIGGER IF EXISTS trg_prevent_truncate_property_verification_audits ON property_verification_audits;
CREATE TRIGGER trg_prevent_truncate_property_verification_audits
BEFORE TRUNCATE ON property_verification_audits
FOR EACH STATEMENT EXECUTE FUNCTION prevent_table_truncate();

DROP TRIGGER IF EXISTS trg_prevent_truncate_booking_status_histories ON booking_status_histories;
CREATE TRIGGER trg_prevent_truncate_booking_status_histories
BEFORE TRUNCATE ON booking_status_histories
FOR EACH STATEMENT EXECUTE FUNCTION prevent_table_truncate();

DROP TRIGGER IF EXISTS trg_prevent_truncate_visit_assignment_histories ON visit_assignment_histories;
CREATE TRIGGER trg_prevent_truncate_visit_assignment_histories
BEFORE TRUNCATE ON visit_assignment_histories
FOR EACH STATEMENT EXECUTE FUNCTION prevent_table_truncate();

DROP TRIGGER IF EXISTS trg_prevent_truncate_ledger_entries ON ledger_entries;
CREATE TRIGGER trg_prevent_truncate_ledger_entries
BEFORE TRUNCATE ON ledger_entries
FOR EACH STATEMENT EXECUTE FUNCTION prevent_table_truncate();

DROP TRIGGER IF EXISTS trg_prevent_truncate_ledger_transactions ON ledger_transactions;
CREATE TRIGGER trg_prevent_truncate_ledger_transactions
BEFORE TRUNCATE ON ledger_transactions
FOR EACH STATEMENT EXECUTE FUNCTION prevent_table_truncate();

DROP TRIGGER IF EXISTS trg_prevent_truncate_email_delivery_events ON email_delivery_events;
CREATE TRIGGER trg_prevent_truncate_email_delivery_events
BEFORE TRUNCATE ON email_delivery_events
FOR EACH STATEMENT EXECUTE FUNCTION prevent_table_truncate();

-- Row-Level Immutability Triggers for Append-Only Audit & History Tables
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit Log Immutability Violation: Records in table % are append-only audit infrastructure and cannot be updated or deleted.',
    TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_mutation_admin_audit_logs ON admin_audit_logs;
CREATE TRIGGER trg_prevent_mutation_admin_audit_logs
BEFORE UPDATE OR DELETE ON admin_audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_prevent_mutation_property_verification_audits ON property_verification_audits;
CREATE TRIGGER trg_prevent_mutation_property_verification_audits
BEFORE UPDATE OR DELETE ON property_verification_audits
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_prevent_mutation_booking_status_histories ON booking_status_histories;
CREATE TRIGGER trg_prevent_mutation_booking_status_histories
BEFORE UPDATE OR DELETE ON booking_status_histories
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_prevent_mutation_visit_assignment_histories ON visit_assignment_histories;
CREATE TRIGGER trg_prevent_mutation_visit_assignment_histories
BEFORE UPDATE OR DELETE ON visit_assignment_histories
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE OR REPLACE FUNCTION prevent_delivery_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Audit Log Immutability Violation: Records in table email_delivery_events are append-only audit infrastructure and cannot be deleted.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.id IS DISTINCT FROM NEW.id
       OR OLD.created_at IS DISTINCT FROM NEW.created_at
       OR OLD.event_timestamp IS DISTINCT FROM NEW.event_timestamp
       OR OLD.provider IS DISTINCT FROM NEW.provider
       OR OLD.provider_event_id IS DISTINCT FROM NEW.provider_event_id
       OR OLD.provider_message_id IS DISTINCT FROM NEW.provider_message_id
       OR OLD.event_type IS DISTINCT FROM NEW.event_type
       OR OLD.recipient IS DISTINCT FROM NEW.recipient
       OR OLD.metadata_json::text IS DISTINCT FROM NEW.metadata_json::text THEN
      RAISE EXCEPTION 'Audit Log Immutability Violation: Records in table email_delivery_events are append-only audit infrastructure and cannot be updated.';
    END IF;

    IF OLD.email_outbox_id IS DISTINCT FROM NEW.email_outbox_id THEN
      IF NEW.email_outbox_id IS NOT NULL THEN
        RAISE EXCEPTION 'Audit Log Immutability Violation: Re-linking email_outbox_id is strictly prohibited.';
      END IF;

      IF OLD.email_outbox_id IS NOT NULL AND EXISTS (SELECT 1 FROM email_outbox WHERE id = OLD.email_outbox_id) THEN
        RAISE EXCEPTION 'Audit Log Immutability Violation: Manual unlinking of email_outbox_id is prohibited while parent outbox record exists.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_mutation_email_delivery_events ON email_delivery_events;
CREATE TRIGGER trg_prevent_mutation_email_delivery_events
BEFORE UPDATE OR DELETE ON email_delivery_events
FOR EACH ROW EXECUTE FUNCTION prevent_delivery_event_mutation();
