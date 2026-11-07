/**
 * COLIN Student API Controller
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 */

import { Request, Response, NextFunction } from 'express';
import { studentService } from '../../../services/StudentService';
import { ApiResponse } from '../../../types/api';

export class StudentController {
  /**
   * GET /api/v1/students/me
   */
  public getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await studentService.getProfile(req.context!.userId);

      const response: ApiResponse<typeof profile> = {
        success: true,
        message: 'Student profile retrieved successfully.',
        data: profile,
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
   * PATCH /api/v1/students/me
   */
  public updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await studentService.updateProfile(req.context!.userId, req.body);

      const response: ApiResponse<typeof updated> = {
        success: true,
        message: 'Student profile updated successfully.',
        data: updated,
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
   * GET /api/v1/students/me/completion
   */
  public getCompletion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = await studentService.getCompletionStatus(req.context!.userId);

      const response: ApiResponse<typeof status> = {
        success: true,
        message: 'Student profile completion status retrieved successfully.',
        data: status,
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

export const studentController = new StudentController();
