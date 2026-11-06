/**
 * COLIN — Booking Request Fixture Helper
 * Phase 4A.2.2.1-R2.1.2 Fixture System
 */

import { generateStudentFixtureSql } from './student.fixture';
import { generatePropertyFixtureSql } from './property.fixture';

export interface CreateBookingOptions {
  id?: string;
  studentId?: string;
  propertyId?: string;
  bedId?: string;
  status?: 'DRAFT' | 'PAYMENT_PENDING' | 'FEE_PAID' | 'VISIT_SCHEDULED' | 'VISIT_COMPLETED' | 'DECISION_PENDING' | 'ACCEPTED' | 'REJECTED_REFUND_DUE' | 'REJECTED_REFUNDED' | 'AUTO_EXPIRED' | 'CANCELLED';
  bookingFeeAmount?: number;
  amountPaid?: number;
  paymentStatus?: 'UNPAID' | 'PENDING' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'FORFEITED';
  studentDecision?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  refundAmount?: number;
  platformFeeRetained?: number;
}

export function generateBookingFixtureSql(options: CreateBookingOptions = {}) {
  let setupSql = '';
  let cleanupSql = '';
  let studentId = options.studentId;
  let propertyId = options.propertyId;

  if (!studentId) {
    const student = generateStudentFixtureSql();
    studentId = student.studentId;
    setupSql += student.studentSql;
    cleanupSql += student.cleanupSql;
  }

  if (!propertyId) {
    const property = generatePropertyFixtureSql();
    propertyId = property.propertyId;
    setupSql += property.propertySql;
    cleanupSql += property.cleanupSql;
  }

  const id = options.id || `00000000-0000-0000-0006-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
  const status = options.status || 'FEE_PAID';
  const bookingFeeAmount = options.bookingFeeAmount ?? 150.00;
  const amountPaid = options.amountPaid ?? 150.00;
  const paymentStatus = options.paymentStatus || 'PAID';
  const studentDecision = options.studentDecision || 'PENDING';
  const refundAmount = options.refundAmount ?? 0.00;
  const platformFeeRetained = options.platformFeeRetained ?? 0.00;
  const bedIdVal = options.bedId ? `'${options.bedId}'` : 'NULL';

  const bookingSql = `
    ${setupSql}
    INSERT INTO booking_requests (
      id, student_id, property_id, bed_id, status, booking_fee_amount, amount_paid,
      payment_status, student_decision, refund_amount, platform_fee_retained,
      decision_deadline, created_at, updated_at
    ) VALUES (
      '${id}', '${studentId}', '${propertyId}', ${bedIdVal}, '${status}', ${bookingFeeAmount}, ${amountPaid},
      '${paymentStatus}', '${studentDecision}', ${refundAmount}, ${platformFeeRetained},
      NOW() + INTERVAL '12 hours', NOW(), NOW()
    ) ON CONFLICT (id) DO NOTHING;
  `;

  const finalCleanupSql = `
    DELETE FROM booking_requests WHERE id = '${id}';
    ${cleanupSql}
  `;

  return { bookingId: id, studentId, propertyId, bookingSql, cleanupSql: finalCleanupSql };
}
