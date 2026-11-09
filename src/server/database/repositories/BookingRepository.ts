/**
 * COLIN Booking Request Repository
 * Manages database access for Booking Requests, Visit Slots, Visit Coordinations,
 * and Student Decisions using PostgreSQL through Prisma ORM.
 */

import {
  BookingRequest,
  BookingStatus,
  BookingPaymentStatus,
  StudentDecision,
  VisitSlot,
  VisitDecision,
  Prisma,
} from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export interface CreateBookingData {
  studentId: string;
  propertyId: string;
  bedId?: string;
  bookingFeeAmount?: number | Prisma.Decimal;
  status?: BookingStatus;
  paymentStatus?: BookingPaymentStatus;
}

export interface BookingDetailedView extends BookingRequest {
  property: {
    id: string;
    name: string;
    propertyType: string;
    city: string;
    locality: string | null;
    addressLine1: string;
    landmark: string | null;
    photos: Array<{ id: string; photoStorageUrl: string; thumbnailUrl: string | null; isCover: boolean }>;
    owner: {
      userId: string;
      businessName: string | null;
    };
  };
  student: {
    userId: string;
    collegeName: string | null;
    course: string | null;
    user: {
      id: string;
      email: string;
      phone: string | null;
      profile: {
        firstName: string;
        lastName: string;
      } | null;
    };
  };
  visitSlot: VisitSlot | null;
  decision: VisitDecision | null;
}

export interface FindBookingsOptions {
  status?: BookingStatus;
  page?: number;
  limit?: number;
}

export class BookingRepository extends BaseRepository {
  constructor() {
    super('app');
  }

  /**
   * Creates a new booking request in the database.
   */
  async create(data: CreateBookingData, tx?: Prisma.TransactionClient): Promise<BookingRequest> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const fee = data.bookingFeeAmount !== undefined ? new Prisma.Decimal(data.bookingFeeAmount.toString()) : new Prisma.Decimal(150.0);

      const booking = await client.bookingRequest.create({
        data: {
          studentId: data.studentId,
          propertyId: data.propertyId,
          bedId: data.bedId,
          status: data.status || BookingStatus.PAYMENT_PENDING,
          bookingFeeAmount: fee,
          amountPaid: new Prisma.Decimal(0.0),
          paymentStatus: data.paymentStatus || BookingPaymentStatus.UNPAID,
          refundAmount: new Prisma.Decimal(0.0),
          platformFeeRetained: new Prisma.Decimal(0.0),
          studentDecision: StudentDecision.PENDING,
        },
      });

      // Record initial status history
      await client.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: null,
          toStatus: booking.status,
          changedByUserId: data.studentId,
          reason: 'Initial booking request initiated by student.',
        },
      });

      return booking;
    });
  }

  /**
   * Retrieves booking by primary UUID.
   */
  async findById(id: string, tx?: Prisma.TransactionClient): Promise<BookingRequest | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.bookingRequest.findUnique({
        where: { id },
      });
    });
  }

  /**
   * Retrieves detailed booking with relations.
   */
  async findDetailedById(id: string, tx?: Prisma.TransactionClient): Promise<BookingDetailedView | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.bookingRequest.findUnique({
        where: { id },
        include: {
          property: {
            select: {
              id: true,
              name: true,
              propertyType: true,
              city: true,
              state: true,
              addressLine1: true,
              landmark: true,
              photos: {
                where: { isCover: true },
                take: 1,
                select: {
                  id: true,
                  photoStorageUrl: true,
                  thumbnailUrl: true,
                  isCover: true,
                },
              },
              owner: {
                select: {
                  userId: true,
                  businessName: true,
                },
              },
            },
          },
          student: {
            select: {
              userId: true,
              collegeName: true,
              course: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  phone: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
          visitSlot: true,
          decision: true,
        },
      }) as unknown as BookingDetailedView | null;
    });
  }

  /**
   * Retrieves bookings for a specific student.
   */
  async findByStudentId(
    studentId: string,
    options: FindBookingsOptions = {},
    tx?: Prisma.TransactionClient
  ): Promise<{ items: BookingDetailedView[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const page = Math.max(1, options.page || 1);
      const limit = Math.min(50, Math.max(1, options.limit || 10));
      const skip = (page - 1) * limit;

      const where: Prisma.BookingRequestWhereInput = {
        studentId,
        ...(options.status ? { status: options.status } : {}),
      };

      const [total, items] = await Promise.all([
        client.bookingRequest.count({ where }),
        client.bookingRequest.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            property: {
              select: {
                id: true,
                name: true,
                propertyType: true,
                city: true,
                state: true,
                addressLine1: true,
                landmark: true,
                photos: {
                  where: { isCover: true },
                  take: 1,
                  select: {
                    id: true,
                    photoStorageUrl: true,
                    thumbnailUrl: true,
                    isCover: true,
                  },
                },
                owner: {
                  select: {
                    userId: true,
                    businessName: true,
                  },
                },
              },
            },
            student: {
              select: {
                userId: true,
                collegeName: true,
                course: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    phone: true,
                    profile: {
                      select: {
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
            visitSlot: true,
            decision: true,
          },
        }),
      ]);

      return {
        items: items as unknown as BookingDetailedView[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    });
  }

  /**
   * Retrieves bookings across the platform for administrative management.
   */
  async findAll(
    options: FindBookingsOptions = {},
    tx?: Prisma.TransactionClient
  ): Promise<{ items: BookingDetailedView[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const page = Math.max(1, options.page || 1);
      const limit = Math.min(50, Math.max(1, options.limit || 10));
      const skip = (page - 1) * limit;

      const where: Prisma.BookingRequestWhereInput = {
        ...(options.status ? { status: options.status } : {}),
      };

      const [total, items] = await Promise.all([
        client.bookingRequest.count({ where }),
        client.bookingRequest.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            property: {
              select: {
                id: true,
                name: true,
                propertyType: true,
                city: true,
                state: true,
                addressLine1: true,
                landmark: true,
                photos: {
                  where: { isCover: true },
                  take: 1,
                  select: {
                    id: true,
                    photoStorageUrl: true,
                    thumbnailUrl: true,
                    isCover: true,
                  },
                },
                owner: {
                  select: {
                    userId: true,
                    businessName: true,
                  },
                },
              },
            },
            student: {
              select: {
                userId: true,
                collegeName: true,
                course: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    phone: true,
                    profile: {
                      select: {
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
            visitSlot: true,
            decision: true,
          },
        }),
      ]);

      return {
        items: items as unknown as BookingDetailedView[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    });
  }

  /**
   * Updates booking status with status history logging.
   */
  async updateStatus(
    id: string,
    toStatus: BookingStatus,
    meta: {
      changedByUserId?: string;
      changedByAdminId?: string;
      reason?: string;
    } = {},
    tx?: Prisma.TransactionClient
  ): Promise<BookingRequest> {
    return this.execute(async () => {
      const client = this.getClient(tx);

      const existing = await client.bookingRequest.findUniqueOrThrow({
        where: { id },
      });

      const updated = await client.bookingRequest.update({
        where: { id },
        data: {
          status: toStatus,
        },
      });

      await client.bookingStatusHistory.create({
        data: {
          bookingId: id,
          fromStatus: existing.status,
          toStatus,
          changedByUserId: meta.changedByUserId,
          changedByAdminId: meta.changedByAdminId,
          reason: meta.reason,
        },
      });

      return updated;
    });
  }

  /**
   * Records verified payment and transitions status to FEE_PAID.
   */
  async recordPaymentSuccess(
    id: string,
    payment: {
      amountPaid: number | Prisma.Decimal;
      paymentReference: string;
      paymentVerifiedAt: Date;
    },
    tx?: Prisma.TransactionClient
  ): Promise<BookingRequest> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const amount = new Prisma.Decimal(payment.amountPaid.toString());

      const updated = await client.bookingRequest.update({
        where: { id },
        data: {
          status: BookingStatus.FEE_PAID,
          paymentStatus: BookingPaymentStatus.PAID,
          amountPaid: amount,
          paymentReference: payment.paymentReference,
          paymentVerifiedAt: payment.paymentVerifiedAt,
        },
      });

      await client.bookingStatusHistory.create({
        data: {
          bookingId: id,
          fromStatus: BookingStatus.PAYMENT_PENDING,
          toStatus: BookingStatus.FEE_PAID,
          reason: `Verified fee payment of INR ${amount.toFixed(2)} recorded. Reference: ${payment.paymentReference}`,
        },
      });

      return updated;
    });
  }

  /**
   * Admin schedules a visit slot.
   */
  async scheduleVisitSlot(
    bookingId: string,
    slotData: {
      scheduledStartTime: Date;
      scheduledEndTime: Date;
      adminId: string;
      volunteerId?: string;
    },
    tx?: Prisma.TransactionClient
  ): Promise<{ booking: BookingRequest; visitSlot: VisitSlot }> {
    return this.execute(async () => {
      const client = this.getClient(tx);

      const booking = await client.bookingRequest.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.VISIT_SCHEDULED,
        },
      });

      const visitSlot = await client.visitSlot.upsert({
        where: { bookingId },
        create: {
          bookingId,
          scheduledStartTime: slotData.scheduledStartTime,
          scheduledEndTime: slotData.scheduledEndTime,
        },
        update: {
          scheduledStartTime: slotData.scheduledStartTime,
          scheduledEndTime: slotData.scheduledEndTime,
          rescheduleCount: { increment: 1 },
        },
      });

      if (slotData.volunteerId) {
        await client.visitCoordination.upsert({
          where: { bookingId },
          create: {
            bookingId,
            volunteerId: slotData.volunteerId,
            adminApprovedAt: new Date(),
          },
          update: {
            volunteerId: slotData.volunteerId,
            adminApprovedAt: new Date(),
          },
        });
      }

      await client.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: BookingStatus.FEE_PAID,
          toStatus: BookingStatus.VISIT_SCHEDULED,
          changedByAdminId: slotData.adminId,
          reason: `Visit slot confirmed for ${slotData.scheduledStartTime.toISOString()}`,
        },
      });

      return { booking, visitSlot };
    });
  }

  /**
   * Admin records visit completion and establishes authoritative 12-hour decision deadline.
   */
  async recordVisitCompletion(
    bookingId: string,
    adminId: string,
    completedAt: Date,
    tx?: Prisma.TransactionClient
  ): Promise<BookingRequest> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const deadline = new Date(completedAt.getTime() + 12 * 60 * 60 * 1000);

      // Update visit slot status
      await client.visitSlot.updateMany({
        where: { bookingId },
        data: { status: 'COMPLETED' },
      });

      const updated = await client.bookingRequest.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.DECISION_PENDING,
          visitCompletedAt: completedAt,
          decisionDeadline: deadline,
          studentDecision: StudentDecision.PENDING,
        },
      });

      await client.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: BookingStatus.VISIT_SCHEDULED,
          toStatus: BookingStatus.DECISION_PENDING,
          changedByAdminId: adminId,
          reason: `Visit completion recorded by COLIN admin. Authoritative 12-hour decision deadline established until ${deadline.toISOString()}`,
        },
      });

      return updated;
    });
  }

  /**
   * Records student decision with refund/fee calculation.
   */
  async recordDecision(
    bookingId: string,
    decisionData: {
      studentId: string;
      decision: StudentDecision;
      rejectionReason?: string;
      refundAmount: number | Prisma.Decimal;
      platformFeeRetained: number | Prisma.Decimal;
      decisionSubmittedAt: Date;
      isWithinDeadline: boolean;
      toStatus: BookingStatus;
    },
    tx?: Prisma.TransactionClient
  ): Promise<{ booking: BookingRequest; decision: VisitDecision }> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const refund = new Prisma.Decimal(decisionData.refundAmount.toString());
      const retained = new Prisma.Decimal(decisionData.platformFeeRetained.toString());

      let paymentStatus: BookingPaymentStatus = BookingPaymentStatus.PAID;
      if (decisionData.decision === StudentDecision.REJECTED) {
        paymentStatus = BookingPaymentStatus.PARTIALLY_REFUNDED;
      } else if (decisionData.decision === StudentDecision.EXPIRED) {
        paymentStatus = BookingPaymentStatus.FORFEITED;
      }

      const booking = await client.bookingRequest.update({
        where: { id: bookingId },
        data: {
          status: decisionData.toStatus,
          studentDecision: decisionData.decision,
          paymentStatus,
          decisionSubmittedAt: decisionData.decisionSubmittedAt,
          refundAmount: refund,
          platformFeeRetained: retained,
        },
      });

      const decision = await client.visitDecision.create({
        data: {
          bookingId,
          decision: decisionData.decision,
          decisionSubmittedAt: decisionData.decisionSubmittedAt,
          rejectionReason: decisionData.rejectionReason,
          isWithinDeadline: decisionData.isWithinDeadline,
          refundCalculated: refund,
          retainedFeeCalculated: retained,
        },
      });

      await client.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: BookingStatus.DECISION_PENDING,
          toStatus: decisionData.toStatus,
          changedByUserId: decisionData.studentId,
          reason: `Student submitted decision: ${decisionData.decision}. Refund: INR ${refund.toFixed(2)}, Retained: INR ${retained.toFixed(2)}`,
        },
      });

      return { booking, decision };
    });
  }

  /**
   * Finds bookings in DECISION_PENDING that have passed their decision deadline.
   */
  async findOverduePendingDecisions(now: Date = new Date(), tx?: Prisma.TransactionClient): Promise<BookingRequest[]> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.bookingRequest.findMany({
        where: {
          status: BookingStatus.DECISION_PENDING,
          decisionDeadline: {
            lte: now,
          },
        },
      });
    });
  }
}

export const bookingRepository = new BookingRepository();
