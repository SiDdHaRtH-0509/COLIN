/**
 * COLIN Bed Reservation Repository
 * Phase 4A.2.2.2: Backend Database Connectivity & ORM Integration
 * 
 * Handles bed holding, reservation confirmation, expiration workers, and concurrency guards.
 */

import { BedReservation, Prisma, BedReservationStatus } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export interface CreateHoldInput {
  bedId: string;
  studentId: string;
  bookingId?: string;
  holdDurationHours?: number;
}

export class BedReservationRepository extends BaseRepository {
  constructor() {
    super('app');
  }

  /**
   * Creates a temporary hold on a bed.
   * If the bed is already actively held or confirmed, PostgreSQL throws uq_active_bed_reservation.
   */
  async createHold(input: CreateHoldInput, tx?: Prisma.TransactionClient): Promise<BedReservation> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const hours = input.holdDurationHours || 2;
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

      return client.bedReservation.create({
        data: {
          bedId: input.bedId,
          studentId: input.studentId,
          bookingId: input.bookingId,
          status: BedReservationStatus.TEMPORARY_HOLD,
          holdExpiresAt: expiresAt,
        },
      });
    });
  }

  /**
   * Confirms an active temporary hold, making the reservation final.
   */
  async confirmReservation(reservationId: string, tx?: Prisma.TransactionClient): Promise<BedReservation> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.bedReservation.update({
        where: { id: reservationId },
        data: {
          status: BedReservationStatus.CONFIRMED,
          confirmedAt: new Date(),
          holdExpiresAt: null,
        },
      });
    });
  }

  /**
   * Retrieves any active reservation (HOLD or CONFIRMED) on a specific bed.
   */
  async findActiveByBedId(bedId: string, tx?: Prisma.TransactionClient): Promise<BedReservation | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.bedReservation.findFirst({
        where: {
          bedId,
          status: {
            in: [BedReservationStatus.TEMPORARY_HOLD, BedReservationStatus.CONFIRMED],
          },
        },
      });
    });
  }

  /**
   * Invokes the PostgreSQL stored procedure `expire_stale_bed_reservations()`
   * to transition past-due holds to EXPIRED status.
   */
  async expireStaleReservations(tx?: Prisma.TransactionClient): Promise<number> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const result = await client.$queryRaw<[{ count: number }]>`SELECT expire_stale_bed_reservations() AS count;`;
      return result[0]?.count ? Number(result[0].count) : 0;
    });
  }
}
