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

// ==========================================
// Phase 3A: 12-Hour Student Decision & Mediation Constants
// ==========================================

export const DECISION_WINDOW_HOURS = 12;
export const DECISION_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

export interface ReminderMilestone {
  id: string;
  afterMs: number;
  label: string;
  message: string;
}

export const DECISION_REMINDER_SCHEDULE: ReminderMilestone[] = [
  {
    id: 'immediately',
    afterMs: 0,
    label: 'Visit Completed',
    message: 'Your visit is complete. Please make your decision within 12 hours.',
  },
  {
    id: '3h',
    afterMs: 3 * 60 * 60 * 1000,
    label: '3 Hours Elapsed',
    message: 'Reminder: Your accommodation decision is still pending.',
  },
  {
    id: '6h',
    afterMs: 6 * 60 * 60 * 1000,
    label: '6 Hours Elapsed (Halfway)',
    message: 'Half of your decision window has passed.',
  },
  {
    id: '9h',
    afterMs: 9 * 60 * 60 * 1000,
    label: '9 Hours Elapsed (3 Hours Left)',
    message: 'Important: Only 3 hours remain.',
  },
  {
    id: '11h',
    afterMs: 11 * 60 * 60 * 1000,
    label: '11 Hours Elapsed (1 Hour Left)',
    message: 'Final reminder: You have 1 hour remaining.',
  },
  {
    id: '11h45m',
    afterMs: (11 * 60 + 45) * 60 * 1000,
    label: '15 Minutes Left',
    message: 'Urgent: Accept or reject now to remain eligible for the 55% refund.',
  },
  {
    id: '12h_expired',
    afterMs: 12 * 60 * 60 * 1000,
    label: 'Decision Expired',
    message: 'Decision expired. Your booking fee is non-refundable.',
  },
];

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
