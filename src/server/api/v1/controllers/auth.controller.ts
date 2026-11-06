/**
 * COLIN Authentication & Identity Controller
 * Phase 4A.2.3: Authentication & Authorization Integration
 * 
 * Standardized HTTP handlers for registration, authentication, token rotation,
 * password recovery, session auditing, and cookie orchestration.
 */

import { Request, Response, NextFunction } from 'express';
import { authService, RequestMeta } from '../../../services/AuthService';
import { ApiResponse } from '../../../types/api';

const isProduction = process.env.NODE_ENV === 'production';

export class AuthController {
  /**
   * Helper to set secure auth cookies.
   */
  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 mins
      path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth',
    });
  }

  /**
   * Helper to clear auth cookies on logout.
   */
  private clearAuthCookies(res: Response): void {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/api/v1/auth',
    });
  }

  /**
   * Extracts client metadata for security auditing.
   */
  private extractMeta(req: Request): RequestMeta {
    return {
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown Client',
    };
  }

  /**
   * POST /api/v1/auth/register
   */
  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const meta = this.extractMeta(req);
      const result = await authService.register(req.body, meta);

      this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

      const response: ApiResponse<typeof result> = {
        success: true,
        message: 'Account successfully registered and authenticated.',
        data: result,
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
   * POST /api/v1/auth/login
   */
  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const meta = this.extractMeta(req);
      const result = await authService.login(req.body, meta);

      this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

      const response: ApiResponse<typeof result> = {
        success: true,
        message: 'Authentication successful.',
        data: result,
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
   * POST /api/v1/auth/refresh
   */
  public refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const meta = this.extractMeta(req);
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

      const tokens = await authService.refresh(refreshToken, meta);

      this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      const response: ApiResponse<{ tokens: typeof tokens }> = {
        success: true,
        message: 'Access token rotated successfully.',
        data: { tokens },
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
   * POST /api/v1/auth/logout
   */
  public logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = req.context?.sessionId;
      const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;

      await authService.logout(sessionId, refreshToken);
      this.clearAuthCookies(res);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        message: 'Session terminated successfully.',
        data: { message: 'Logged out successfully.' },
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
   * GET /api/v1/auth/me
   */
  public me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.context?.userId;
      if (!userId) {
        return next(new Error('Unauthenticated user context in controller'));
      }

      const user = await authService.getCurrentUser(userId);

      const response: ApiResponse<{ user: typeof user; sessionId: string }> = {
        success: true,
        message: 'Authenticated user profile retrieved successfully.',
        data: {
          user,
          sessionId: req.context?.sessionId || '',
        },
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
   * POST /api/v1/auth/password/change
   */
  public changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.context?.userId;
      if (!userId) {
        return next(new Error('Unauthenticated user context'));
      }

      await authService.changePassword(userId, req.body.currentPassword, req.body.newPassword);
      this.clearAuthCookies(res);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        message: 'Password updated successfully.',
        data: { message: 'Password updated successfully. All existing sessions have been terminated. Please log in again.' },
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
   * POST /api/v1/auth/password/forgot
   */
  public forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.forgotPassword(req.body.email);

      const response: ApiResponse<typeof result> = {
        success: true,
        message: 'Password reset request processed.',
        data: result,
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
   * POST /api/v1/auth/password/reset
   */
  public resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await authService.resetPassword(req.body.token, req.body.newPassword);
      this.clearAuthCookies(res);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        message: 'Password reset completed.',
        data: { message: 'Password has been reset successfully. You may now log in.' },
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
   * POST /api/v1/auth/email/verify
   */
  public verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await authService.verifyEmail(req.body.token, req.context?.userId);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        message: 'Email verified.',
        data: { message: 'Email address verified successfully.' },
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
   * POST /api/v1/auth/email/resend-verification
   */
  public resendVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.context?.userId;
      if (!userId) {
        return next(new Error('Unauthenticated user context'));
      }

      const result = await authService.resendVerification(userId);

      const response: ApiResponse<typeof result> = {
        success: true,
        message: 'Verification email resent.',
        data: result,
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
   * GET /api/v1/auth/sessions
   */
  public listSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.context?.userId;
      if (!userId) {
        return next(new Error('Unauthenticated user context'));
      }

      const sessions = await authService.listUserSessions(userId, req.context?.sessionId);

      const response: ApiResponse<{ sessions: typeof sessions }> = {
        success: true,
        message: 'Active sessions retrieved.',
        data: { sessions },
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
   * DELETE /api/v1/auth/sessions/:sessionId
   */
  public revokeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.context?.userId;
      if (!userId) {
        return next(new Error('Unauthenticated user context'));
      }

      const rawSessionId = req.params.sessionId;
      const targetSessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;

      await authService.revokeUserSession(userId, targetSessionId);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        message: 'Session revoked.',
        data: { message: 'Session revoked successfully.' },
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

export const authController = new AuthController();
