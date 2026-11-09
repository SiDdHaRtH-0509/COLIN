/**
 * COLIN Booking & Guided Visit Controller
 */

import { Request, Response, NextFunction } from 'express';
import { bookingService } from '../../../services/BookingService';
import { ApiResponse } from '../../../types/api';

export class BookingController {
  /**
   * POST /api/v1/bookings
   * Student requests a guided visit for a property.
   */
  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.context?.userId;
      if (!studentId) {
        return next(new Error('Unauthenticated user'));
      }

      const booking = await bookingService.createBooking({
        studentId,
        propertyId: req.body.propertyId,
        bedId: req.body.bedId,
      });

      const response: ApiResponse<typeof booking> = {
        success: true,
        message: 'Visit request created successfully.',
        data: booking,
        meta: {
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/bookings
   * Lists authenticated student's bookings.
   */
  public listMyBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.context?.userId;
      if (!studentId) {
        return next(new Error('Unauthenticated user'));
      }

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const result = await bookingService.listStudentBookings(studentId, { page, limit });

      const response: ApiResponse<typeof result.items> = {
        success: true,
        message: 'Student bookings retrieved successfully.',
        data: result.items,
        meta: {
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
          pagination: {
            page: result.page,
            limit: result.limit,
            totalItems: result.total,
            totalPages: result.totalPages,
            hasNextPage: result.page < result.totalPages,
            hasPreviousPage: result.page > 1,
          },
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/bookings/:bookingId
   * Retrieves single booking details.
   */
  public getDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.context?.userId;
      const booking = await bookingService.getBookingDetail(req.params.bookingId as string);

      if (req.context?.role !== 'ADMIN' && booking.studentId !== studentId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied: You do not have permission to view this booking.',
          },
        });
        return;
      }

      const response: ApiResponse<typeof booking> = {
        success: true,
        message: 'Booking details retrieved successfully.',
        data: booking,
        meta: {
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/bookings/:bookingId/pay
   * Student pays the simulated ₹150 visit fee.
   */
  public pay = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.context?.userId;
      if (!studentId) {
        return next(new Error('Unauthenticated user'));
      }

      const booking = await bookingService.processPayment(req.params.bookingId as string, studentId, {
        idempotencyKey: req.body.idempotencyKey,
        simulateFailure: req.body.simulateFailure,
      });

      const response: ApiResponse<typeof booking> = {
        success: true,
        message: 'Visit pass fee payment verified successfully.',
        data: booking,
        meta: {
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/bookings/:bookingId/decision
   * Student submits acceptance or rejection within 12-hour window.
   */
  public decision = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.context?.userId;
      if (!studentId) {
        return next(new Error('Unauthenticated user'));
      }

      const booking = await bookingService.submitDecision(req.params.bookingId as string, studentId, {
        decision: req.body.decision,
        rejectionReason: req.body.rejectionReason,
      });

      const response: ApiResponse<typeof booking> = {
        success: true,
        message: `Decision (${req.body.decision}) processed successfully.`,
        data: booking,
        meta: {
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/admin/bookings
   * Admin lists all platform bookings.
   */
  public adminListAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const status = req.query.status as any;

      const result = await bookingService.listAllBookingsForAdmin({ page, limit, status });

      const response: ApiResponse<typeof result.items> = {
        success: true,
        message: 'All platform bookings retrieved successfully.',
        data: result.items,
        meta: {
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
          pagination: {
            page: result.page,
            limit: result.limit,
            totalItems: result.total,
            totalPages: result.totalPages,
            hasNextPage: result.page < result.totalPages,
            hasPreviousPage: result.page > 1,
          },
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/admin/bookings/:bookingId/schedule
   * Admin schedules a visit slot.
   */
  public adminSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.context?.userId;

      const booking = await bookingService.scheduleVisit(req.params.bookingId as string, adminId || '', {
        scheduledStartTime: req.body.scheduledStartTime,
        scheduledEndTime: req.body.scheduledEndTime,
        volunteerId: req.body.volunteerId,
      });

      const response: ApiResponse<typeof booking> = {
        success: true,
        message: 'Visit slot scheduled successfully.',
        data: booking,
        meta: {
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/admin/bookings/:bookingId/complete-visit
   * Admin records physical visit completion and starts 12-hour decision deadline.
   */
  public adminCompleteVisit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.context?.userId;

      const booking = await bookingService.completeVisit(req.params.bookingId as string, adminId || '');

      const response: ApiResponse<typeof booking> = {
        success: true,
        message: 'Visit completion recorded. 12-hour student decision window active.',
        data: booking,
        meta: {
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/admin/bookings/process-expirations
   * Admin / worker triggers auto-expiration of overdue decisions.
   */
  public adminProcessExpirations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const expiredCount = await bookingService.expireOverdueDecisions();

      const response: ApiResponse<{ expiredCount: number }> = {
        success: true,
        message: `Processed automatic decision expirations. ${expiredCount} booking(s) expired.`,
        data: { expiredCount },
        meta: {
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/admin/bookings/finance-summary
   * Provides platform financial totals and double-entry ledger verification.
   */
  public adminFinanceSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await bookingService.getFinanceSummary();
      const response: ApiResponse<typeof summary> = {
        success: true,
        message: 'Platform financial summary retrieved successfully.',
        data: summary,
        meta: {
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };
}

export const bookingController = new BookingController();
