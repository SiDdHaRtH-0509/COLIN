/**
 * COLIN Central Booking Policy Constants
 * 
 * Centralized source of truth for visit slot booking fees and refund calculations.
 * Updated as part of Phase 2 UI/UX Redesign.
 */

export const VISIT_BOOKING_FEE = 150.00;
export const VISIT_REFUND_PERCENTAGE = 55;
export const VISIT_REFUND_AMOUNT = 82.50; // 55% of 150.00
export const VISIT_NON_REFUNDABLE_AMOUNT = 67.50; // 45% of 150.00

export const VISIT_POLICY_TITLE = '55% In-Person Visit Refund Guarantee';
export const VISIT_POLICY_DESCRIPTION = 
  'A nominal ₹150.00 slot fee connects you with the verified owner and a COLIN visit guide. If you physically inspect the accommodation and decide the room does not meet your expectations, 55% (₹82.50) is refunded. Prior cancellations, owner reschedules, and no-shows are subject to standard policy conditions.';

export type VisitOutcomeReason =
  | 'visited_rejected' // Student visited and rejected room -> Eligible for 55% refund (₹82.50)
  | 'cancelled_prior'  // Student cancelled prior to on-site visit -> Non-refundable under on-site policy
  | 'owner_cancelled'  // Host / Owner cancelled -> Host reschedule/resolution
  | 'student_no_show'; // Student did not show up -> Ineligible for refund

export interface VisitOutcomeDetails {
  reason: VisitOutcomeReason;
  label: string;
  isEligibleForRefund: boolean;
  refundAmount: number;
  explanation: string;
}

export const VISIT_OUTCOME_OPTIONS: Record<VisitOutcomeReason, VisitOutcomeDetails> = {
  visited_rejected: {
    reason: 'visited_rejected',
    label: "Visited & Room Did Not Meet Expectations",
    isEligibleForRefund: true,
    refundAmount: VISIT_REFUND_AMOUNT,
    explanation: 'Eligible for 55% Refund Guarantee (₹82.50). Simulated return applied.',
  },
  cancelled_prior: {
    reason: 'cancelled_prior',
    label: 'Cancelled Prior to In-Person Visit',
    isEligibleForRefund: false,
    refundAmount: 0.00,
    explanation: 'Ineligible for 55% refund. The 55% refund guarantee strictly applies after an on-site physical inspection when you do not proceed with the room.',
  },
  owner_cancelled: {
    reason: 'owner_cancelled',
    label: 'Host / Owner Cancelled Slot',
    isEligibleForRefund: false,
    refundAmount: 0.00,
    explanation: 'Host cancellation recorded. Your slot has been released for ambassador rescheduling.',
  },
  student_no_show: {
    reason: 'student_no_show',
    label: 'Student Did Not Show Up (No-Show)',
    isEligibleForRefund: false,
    refundAmount: 0.00,
    explanation: 'No-show recorded. The 55% refund guarantee requires completing the on-site physical inspection with your COLIN ambassador.',
  },
};
