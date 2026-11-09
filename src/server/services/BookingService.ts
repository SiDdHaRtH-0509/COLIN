/**
 * COLIN Booking & Guided Visit Service
 * Implements the authoritative lifecycle:
 * DRAFT -> PAYMENT_PENDING -> FEE_PAID -> VISIT_SCHEDULED -> VISIT_COMPLETED -> DECISION_PENDING
 * -> ACCEPTED / REJECTED_REFUND_DUE / AUTO_EXPIRED
 * 
 * Enforces ₹150 visit fee policy (₹82.50 refund on reject, ₹67.50 retained, ₹0 refund on accept/expiry),
 * double-entry ledger postings, and authoritative 12-hour server timestamp deadline.
 */

import {
  BookingStatus,
  BookingPaymentStatus,
  StudentDecision,
  JournalTransactionType,
  LedgerAccountType,
  LedgerAccountCategory,
  LedgerEntryType,
  PaymentGateway,
  PaymentType,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { AuthorizationError } from '../middleware/authContext';
import { ValidationConstraintError, RecordNotFoundError } from '../database/errors';
import { bookingRepository, BookingDetailedView } from '../database/repositories/BookingRepository';
import { LedgerRepository } from '../database/repositories/LedgerRepository';
import { PropertyRepository } from '../database/repositories/PropertyRepository';
import { StudentRepository } from '../database/repositories/StudentRepository';
import { simulatedPaymentProvider } from '../payments/SimulatedPaymentProvider';
import { emailOutboxService } from '../email/outbox/EmailOutboxService';

const ledgerRepository = new LedgerRepository();
const propertyRepository = new PropertyRepository();
const studentRepository = new StudentRepository();
import {
  renderBookingConfirmationEmail,
  renderPaymentConfirmationEmail,
  renderVisitScheduledEmail,
  renderVisitCompletedEmail,
  renderBookingDecisionEmail,
} from '../email/email.templates';
import { getAppPrismaClient } from '../database/prisma';

export interface CreateBookingInput {
  studentId: string;
  propertyId: string;
  bedId?: string;
}

export interface ProcessPaymentInput {
  idempotencyKey: string;
  simulateFailure?: boolean;
}

export interface ScheduleVisitInput {
  scheduledStartTime: string | Date;
  scheduledEndTime: string | Date;
  volunteerId?: string;
}

export interface SubmitDecisionInput {
  decision: 'ACCEPTED' | 'REJECTED';
  rejectionReason?: string;
}

export class BookingService {
  /**
   * Helper to ensure standard ledger accounts exist in the double-entry chart of accounts.
   */
  private async ensureLedgerAccounts(tx?: Prisma.TransactionClient) {
    const clearing = await ledgerRepository.ensureAccount(
      LedgerAccountCategory.GATEWAY_CLEARING,
      'Payment Gateway Clearing',
      LedgerAccountType.ASSET,
      '1000',
      tx
    );

    const escrow = await ledgerRepository.ensureAccount(
      LedgerAccountCategory.PLATFORM_ESCROW,
      'Platform Visit Fee Escrow',
      LedgerAccountType.LIABILITY,
      '2000',
      tx
    );

    const revenue = await ledgerRepository.ensureAccount(
      LedgerAccountCategory.PLATFORM_REVENUE,
      'Platform Retained Revenue',
      LedgerAccountType.REVENUE,
      '4000',
      tx
    );

    const studentWallet = await ledgerRepository.ensureAccount(
      LedgerAccountCategory.STUDENT_WALLET,
      'Student Refund Payable',
      LedgerAccountType.LIABILITY,
      '2100',
      tx
    );

    return { clearing, escrow, revenue, studentWallet };
  }

  /**
   * 1. Student requests a guided visit for an approved property.
   */
  async createBooking(input: CreateBookingInput): Promise<BookingDetailedView> {
    const student = await studentRepository.findProfileByUserId(input.studentId);
    if (!student) {
      throw new Error('Student profile not found. Please complete profile registration.');
    }

    const property = await propertyRepository.findById(input.propertyId);
    if (!property) {
      throw new Error('Accommodation listing not found.');
    }

    if (property.verificationStatus !== 'VERIFIED') {
      throw new Error('Guided visits can only be requested for COLIN Verified properties.');
    }

    // Check if student already has an active visit booking for this property
    const existing = await bookingRepository.findByStudentId(input.studentId, { limit: 10 });
    const duplicate = existing.items.find(
      (b) =>
        b.propertyId === input.propertyId &&
        ['PAYMENT_PENDING', 'FEE_PAID', 'VISIT_SCHEDULED', 'DECISION_PENDING'].includes(b.status)
    );

    if (duplicate) {
      const detailed = await bookingRepository.findDetailedById(duplicate.id);
      return detailed!;
    }

    const booking = await bookingRepository.create({
      studentId: input.studentId,
      propertyId: input.propertyId,
      bedId: input.bedId,
      bookingFeeAmount: 150.0,
      status: BookingStatus.PAYMENT_PENDING,
      paymentStatus: BookingPaymentStatus.UNPAID,
    });

    // Enqueue notification fire-and-forget
    try {
      const studentEmail = student.user?.email;
      if (studentEmail) {
        const template = renderBookingConfirmationEmail({
          studentName: student.user?.profile?.firstName || 'Student',
          propertyName: property.name,
          bookingId: booking.id,
        });
        await emailOutboxService.enqueueEmail({
          recipientEmail: studentEmail,
          recipientName: student.user?.profile?.firstName || 'Student',
          subject: template.subject,
          htmlBody: template.htmlBody,
          textBody: template.textBody,
          templateName: 'booking_confirmation',
          referenceType: 'booking',
          referenceId: booking.id,
        });
      }
    } catch {
      // Notification failure must not block business transaction
    }

    const detailed = await bookingRepository.findDetailedById(booking.id);
    return detailed!;
  }

  /**
   * 2. Processes simulated ₹150 visit pass payment and posts balanced double-entry ledger transaction.
   */
  async processPayment(bookingId: string, studentId: string, paymentInput: ProcessPaymentInput): Promise<BookingDetailedView> {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new RecordNotFoundError(`Booking request ${bookingId} not found.`, 'BookingRequest');
    }

    if (booking.studentId !== studentId) {
      throw new AuthorizationError('Access denied: You do not own this booking request.');
    }

    // Idempotent return if already paid
    if (booking.status === BookingStatus.FEE_PAID || booking.paymentStatus === BookingPaymentStatus.PAID) {
      const detailed = await bookingRepository.findDetailedById(bookingId);
      return detailed!;
    }

    if (!['PAYMENT_PENDING', 'DRAFT'].includes(booking.status)) {
      throw new ValidationConstraintError(`Cannot process payment for booking in state: ${booking.status}`);
    }

    // Verify simulated payment
    const paymentResult = await simulatedPaymentProvider.verifyPayment({
      orderId: booking.id,
      idempotencyKey: paymentInput.idempotencyKey,
      simulateFailure: paymentInput.simulateFailure,
    });

    const prisma = getAppPrismaClient();

    if (!paymentResult.success) {
      // Record failed payment attempt
      await prisma.financialPayment.create({
        data: {
          bookingId: booking.id,
          payerUserId: studentId,
          paymentType: PaymentType.BOOKING_VISIT_FEE,
          amount: new Prisma.Decimal(150.0),
          currency: 'INR',
          gateway: PaymentGateway.MANUAL_BANK_TRANSFER, // mapped fallback
          status: PaymentStatus.FAILED,
          idempotencyKey: paymentInput.idempotencyKey,
        },
      });

      throw new ValidationConstraintError(paymentResult.errorMessage || 'SIMULATED: Test card declined by simulated bank.');
    }

    // Execute atomic transaction for payment and balanced ledger entry
    await prisma.$transaction(async (tx) => {
      // 1. Create FinancialPayment
      const paymentRecord = await tx.financialPayment.create({
        data: {
          bookingId: booking.id,
          payerUserId: studentId,
          paymentType: PaymentType.BOOKING_VISIT_FEE,
          amount: new Prisma.Decimal(150.0),
          currency: 'INR',
          gateway: PaymentGateway.MANUAL_BANK_TRANSFER,
          gatewayOrderId: paymentResult.gatewayOrderId,
          gatewayPaymentId: paymentResult.paymentId,
          status: PaymentStatus.SUCCESS,
          idempotencyKey: paymentInput.idempotencyKey,
        },
      });

      // 2. Ensure ledger accounts exist
      const accounts = await this.ensureLedgerAccounts(tx);

      // 3. Create balanced double-entry transaction (Debits = Credits = 150.00)
      const txNumber = `TX-FEE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const draftTx = await ledgerRepository.createDraftTransaction(
        {
          transactionNumber: txNumber,
          transactionType: JournalTransactionType.VISIT_FEE_COLLECTION,
          description: `Visit fee collection for booking ${booking.id} (TEST/SIMULATED)`,
          idempotencyKey: `idemp-fee-${booking.id}-${paymentInput.idempotencyKey}`,
          currency: 'INR',
          bookingId: booking.id,
          paymentId: paymentRecord.id,
          entries: [
            {
              accountId: accounts.clearing.id,
              entryType: LedgerEntryType.DEBIT,
              amount: new Prisma.Decimal(150.0),
              currency: 'INR',
            },
            {
              accountId: accounts.escrow.id,
              entryType: LedgerEntryType.CREDIT,
              amount: new Prisma.Decimal(150.0),
              currency: 'INR',
            },
          ],
        },
        tx
      );

      // 4. Post ledger transaction (PostgreSQL trigger enforces balance)
      await ledgerRepository.postTransaction(draftTx.id, tx);

      // 5. Update booking status
      await bookingRepository.recordPaymentSuccess(
        booking.id,
        {
          amountPaid: 150.0,
          paymentReference: paymentResult.paymentId,
          paymentVerifiedAt: new Date(),
        },
        tx
      );
    });

    const detailed = await bookingRepository.findDetailedById(bookingId);

    // Enqueue payment confirmation notification
    try {
      const studentEmail = detailed?.student?.user?.email;
      if (studentEmail && detailed?.property) {
        const template = renderPaymentConfirmationEmail({
          studentName: detailed.student.user.profile?.firstName || 'Student',
          propertyName: detailed.property.name,
          amount: 150.0,
          paymentReference: paymentResult.paymentId,
        });
        await emailOutboxService.enqueueEmail({
          recipientEmail: studentEmail,
          recipientName: detailed.student.user.profile?.firstName || 'Student',
          subject: template.subject,
          htmlBody: template.htmlBody,
          textBody: template.textBody,
          templateName: 'payment_confirmation',
          referenceType: 'booking',
          referenceId: booking.id,
        });
      }
    } catch {}

    return detailed!;
  }

  /**
   * 3. COLIN Admin schedules an in-person visit.
   */
  async scheduleVisit(bookingId: string, adminId: string, input: ScheduleVisitInput): Promise<BookingDetailedView> {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new RecordNotFoundError(`Booking request ${bookingId} not found.`, 'BookingRequest');
    }

    if (!['FEE_PAID', 'VISIT_SCHEDULED'].includes(booking.status)) {
      throw new ValidationConstraintError(`Cannot schedule visit for booking in state: ${booking.status}. Fee must be paid first.`);
    }

    const start = new Date(input.scheduledStartTime);
    const end = new Date(input.scheduledEndTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      throw new ValidationConstraintError('Invalid visit schedule window.');
    }

    await bookingRepository.scheduleVisitSlot(bookingId, {
      scheduledStartTime: start,
      scheduledEndTime: end,
      adminId,
      volunteerId: input.volunteerId,
    });

    const detailed = await bookingRepository.findDetailedById(bookingId);

    // Enqueue notification
    try {
      const studentEmail = detailed?.student?.user?.email;
      if (studentEmail && detailed?.property) {
        const template = renderVisitScheduledEmail({
          studentName: detailed.student.user.profile?.firstName || 'Student',
          propertyName: detailed.property.name,
          scheduledTime: start.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
          address: detailed.property.addressLine1 || detailed.property.city,
        });
        await emailOutboxService.enqueueEmail({
          recipientEmail: studentEmail,
          recipientName: detailed.student.user.profile?.firstName || 'Student',
          subject: template.subject,
          htmlBody: template.htmlBody,
          textBody: template.textBody,
          templateName: 'visit_scheduled',
          referenceType: 'booking',
          referenceId: booking.id,
        });
      }
    } catch {}

    return detailed!;
  }

  /**
   * 4. Authorized COLIN Admin records visit completion, establishing the 12-hour decision window.
   */
  async completeVisit(bookingId: string, adminId: string): Promise<BookingDetailedView> {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new RecordNotFoundError(`Booking request ${bookingId} not found.`, 'BookingRequest');
    }

    if (booking.status !== BookingStatus.VISIT_SCHEDULED) {
      throw new ValidationConstraintError(`Cannot complete visit for booking in state: ${booking.status}. Visit must be in VISIT_SCHEDULED.`);
    }

    const serverNow = new Date();
    await bookingRepository.recordVisitCompletion(bookingId, adminId, serverNow);

    const detailed = await bookingRepository.findDetailedById(bookingId);

    // Enqueue notification with decision deadline
    try {
      const studentEmail = detailed?.student?.user?.email;
      if (studentEmail && detailed?.property && detailed.decisionDeadline) {
        const template = renderVisitCompletedEmail({
          studentName: detailed.student.user.profile?.firstName || 'Student',
          propertyName: detailed.property.name,
          deadlineTime: new Date(detailed.decisionDeadline).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
        });
        await emailOutboxService.enqueueEmail({
          recipientEmail: studentEmail,
          recipientName: detailed.student.user.profile?.firstName || 'Student',
          subject: template.subject,
          htmlBody: template.htmlBody,
          textBody: template.textBody,
          templateName: 'visit_completed',
          referenceType: 'booking',
          referenceId: booking.id,
        });
      }
    } catch {}

    return detailed!;
  }

  /**
   * 5. Student submits decision: ACCEPTED or REJECTED.
   * Enforces exact policy:
   * - ACCEPTED: ₹0 refund, ₹150 retained -> Debit Escrow ₹150, Credit Platform Revenue ₹150
   * - REJECTED: ₹82.50 refund (55%), ₹67.50 retained (45%) -> Debit Escrow ₹150, Credit Student Wallet ₹82.50, Credit Platform Revenue ₹67.50
   */
  async submitDecision(
    bookingId: string,
    studentId: string,
    input: SubmitDecisionInput
  ): Promise<BookingDetailedView> {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new RecordNotFoundError(`Booking request ${bookingId} not found.`, 'BookingRequest');
    }

    if (booking.studentId !== studentId) {
      throw new AuthorizationError('Access denied: You do not own this booking request.');
    }

    if (booking.status !== BookingStatus.DECISION_PENDING) {
      throw new ValidationConstraintError(`Cannot submit decision for booking in state: ${booking.status}. Booking must be in DECISION_PENDING.`);
    }

    const now = new Date();
    if (booking.decisionDeadline && now > booking.decisionDeadline) {
      throw new ValidationConstraintError('Authoritative 12-hour decision window has expired. Booking has expired.');
    }

    const prisma = getAppPrismaClient();

    const isAccepted = input.decision === 'ACCEPTED';
    const refundAmount = isAccepted ? 0.0 : 82.5;
    const retainedAmount = isAccepted ? 150.0 : 67.5;
    const toStatus = isAccepted ? BookingStatus.ACCEPTED : BookingStatus.REJECTED_REFUND_DUE;
    const decisionEnum = isAccepted ? StudentDecision.ACCEPTED : StudentDecision.REJECTED;

    await prisma.$transaction(async (tx) => {
      const accounts = await this.ensureLedgerAccounts(tx);
      const txNumber = `TX-DEC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      if (isAccepted) {
        // Acceptance settlement: Debit Escrow ₹150, Credit Revenue ₹150
        const draftTx = await ledgerRepository.createDraftTransaction(
          {
            transactionNumber: txNumber,
            transactionType: JournalTransactionType.VISIT_ACCEPTANCE_SETTLEMENT,
            description: `Visit acceptance settlement for booking ${booking.id}`,
            idempotencyKey: `idemp-acc-${booking.id}`,
            currency: 'INR',
            bookingId: booking.id,
            entries: [
              {
                accountId: accounts.escrow.id,
                entryType: LedgerEntryType.DEBIT,
                amount: new Prisma.Decimal(150.0),
                currency: 'INR',
              },
              {
                accountId: accounts.revenue.id,
                entryType: LedgerEntryType.CREDIT,
                amount: new Prisma.Decimal(150.0),
                currency: 'INR',
              },
            ],
          },
          tx
        );
        await ledgerRepository.postTransaction(draftTx.id, tx);
      } else {
        // Rejection settlement: Debit Escrow ₹150, Credit Student Wallet ₹82.50, Credit Revenue ₹67.50
        // Balanced: 150.00 = 82.50 + 67.50
        const draftTx = await ledgerRepository.createDraftTransaction(
          {
            transactionNumber: txNumber,
            transactionType: JournalTransactionType.VISIT_REJECTION_REFUND,
            description: `Visit rejection refund for booking ${booking.id} (55% refund, 45% retained)`,
            idempotencyKey: `idemp-rej-${booking.id}`,
            currency: 'INR',
            bookingId: booking.id,
            entries: [
              {
                accountId: accounts.escrow.id,
                entryType: LedgerEntryType.DEBIT,
                amount: new Prisma.Decimal(150.0),
                currency: 'INR',
              },
              {
                accountId: accounts.studentWallet.id,
                entryType: LedgerEntryType.CREDIT,
                amount: new Prisma.Decimal(82.5),
                currency: 'INR',
              },
              {
                accountId: accounts.revenue.id,
                entryType: LedgerEntryType.CREDIT,
                amount: new Prisma.Decimal(67.5),
                currency: 'INR',
              },
            ],
          },
          tx
        );
        await ledgerRepository.postTransaction(draftTx.id, tx);
      }

      // Record decision and update booking status
      await bookingRepository.recordDecision(
        booking.id,
        {
          studentId,
          decision: decisionEnum,
          rejectionReason: input.rejectionReason,
          refundAmount,
          platformFeeRetained: retainedAmount,
          decisionSubmittedAt: now,
          isWithinDeadline: true,
          toStatus,
        },
        tx
      );
    });

    const detailed = await bookingRepository.findDetailedById(bookingId);

    // Enqueue decision outcome notification
    try {
      const studentEmail = detailed?.student?.user?.email;
      if (studentEmail && detailed?.property) {
        const template = renderBookingDecisionEmail({
          studentName: detailed.student.user.profile?.firstName || 'Student',
          propertyName: detailed.property.name,
          decision: decisionEnum,
          refundAmount,
        });
        await emailOutboxService.enqueueEmail({
          recipientEmail: studentEmail,
          recipientName: detailed.student.user.profile?.firstName || 'Student',
          subject: template.subject,
          htmlBody: template.htmlBody,
          textBody: template.textBody,
          templateName: 'booking_decision',
          referenceType: 'booking',
          referenceId: booking.id,
        });
      }
    } catch {}

    return detailed!;
  }

  /**
   * 6. Reliable expiration worker routine:
   * Finds bookings in DECISION_PENDING past deadline, transitions them to AUTO_EXPIRED,
   * and posts balanced ledger settlement (Debit Escrow ₹150, Credit Revenue ₹150).
   */
  async expireOverdueDecisions(cutoffTime: Date = new Date()): Promise<number> {
    const overdueBookings = await bookingRepository.findOverduePendingDecisions(cutoffTime);
    if (overdueBookings.length === 0) return 0;

    const prisma = getAppPrismaClient();
    let expiredCount = 0;

    for (const booking of overdueBookings) {
      try {
        await prisma.$transaction(async (tx) => {
          const accounts = await this.ensureLedgerAccounts(tx);
          const txNumber = `TX-EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          // Expiration settlement: Debit Escrow ₹150, Credit Revenue ₹150 (₹0 refund)
          const draftTx = await ledgerRepository.createDraftTransaction(
            {
              transactionNumber: txNumber,
              transactionType: JournalTransactionType.VISIT_EXPIRATION_SETTLEMENT,
              description: `Automatic expiration settlement for booking ${booking.id}`,
              idempotencyKey: `idemp-exp-${booking.id}`,
              currency: 'INR',
              bookingId: booking.id,
              entries: [
                {
                  accountId: accounts.escrow.id,
                  entryType: LedgerEntryType.DEBIT,
                  amount: new Prisma.Decimal(150.0),
                  currency: 'INR',
                },
                {
                  accountId: accounts.revenue.id,
                  entryType: LedgerEntryType.CREDIT,
                  amount: new Prisma.Decimal(150.0),
                  currency: 'INR',
                },
              ],
            },
            tx
          );
          await ledgerRepository.postTransaction(draftTx.id, tx);

          await bookingRepository.recordDecision(
            booking.id,
            {
              studentId: booking.studentId,
              decision: StudentDecision.EXPIRED,
              rejectionReason: '12-hour decision deadline expired automatically without student submission.',
              refundAmount: 0.0,
              platformFeeRetained: 150.0,
              decisionSubmittedAt: cutoffTime,
              isWithinDeadline: false,
              toStatus: BookingStatus.AUTO_EXPIRED,
            },
            tx
          );
        });

        expiredCount++;
      } catch (err) {
        console.error(`Failed to expire booking ${booking.id}:`, err);
      }
    }

    return expiredCount;
  }

  /**
   * Retrieves booking details by ID.
   */
  async getBookingDetail(bookingId: string): Promise<BookingDetailedView> {
    const booking = await bookingRepository.findDetailedById(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found.`);
    }
    return booking;
  }

  /**
   * Lists bookings for a student.
   */
  async listStudentBookings(studentId: string, options: { page?: number; limit?: number } = {}) {
    return bookingRepository.findByStudentId(studentId, options);
  }

  /**
   * Lists all bookings across the platform for Admin.
   */
  async listAllBookingsForAdmin(options: { page?: number; limit?: number; status?: BookingStatus } = {}) {
    return bookingRepository.findAll(options);
  }

  /**
   * Generates financial and double-entry ledger reconciliation summary for admin dashboard.
   */
  async getFinanceSummary(): Promise<{
    totalBookings: number;
    feePaidCount: number;
    acceptedCount: number;
    rejectedCount: number;
    expiredCount: number;
    totalCollected: number;
    escrowBalance: number;
    revenueRetained: number;
    refundsPaid: number;
    isBalanced: boolean;
  }> {
    const prisma = getAppPrismaClient();
    const [bookings, transactions] = await Promise.all([
      prisma.bookingRequest.findMany(),
      prisma.ledgerTransaction.findMany({ where: { status: 'POSTED' }, include: { entries: true } }),
    ]);

    let totalCollected = 0;
    let escrowBalance = 0;
    let revenueRetained = 0;
    let refundsPaid = 0;
    let feePaidCount = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;
    let expiredCount = 0;

    for (const b of bookings) {
      const paid = Number(b.amountPaid);
      const ref = Number(b.refundAmount);
      const ret = Number(b.platformFeeRetained);

      if (['FEE_PAID', 'VISIT_SCHEDULED', 'DECISION_PENDING'].includes(b.status)) {
        feePaidCount++;
        escrowBalance += paid;
      } else if (b.status === 'ACCEPTED') {
        acceptedCount++;
        revenueRetained += ret;
      } else if (['REJECTED_REFUND_DUE', 'REJECTED_REFUNDED'].includes(b.status)) {
        rejectedCount++;
        refundsPaid += ref;
        revenueRetained += ret;
      } else if (b.status === 'AUTO_EXPIRED') {
        expiredCount++;
        revenueRetained += ret;
      }
      totalCollected += paid;
    }

    let totalDebits = 0;
    let totalCredits = 0;
    for (const tx of transactions) {
      for (const entry of tx.entries) {
        if (entry.entryType === 'DEBIT') totalDebits += Number(entry.amount);
        else totalCredits += Number(entry.amount);
      }
    }

    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.001;

    return {
      totalBookings: bookings.length,
      feePaidCount,
      acceptedCount,
      rejectedCount,
      expiredCount,
      totalCollected,
      escrowBalance,
      revenueRetained,
      refundsPaid,
      isBalanced,
    };
  }
}

export const bookingService = new BookingService();
