/**
 * COLIN Authentication & Identity Controller
 * Phase 4A.2.3.8: Authentication Security Hardening & Independent Acceptance Audit
 * 
 * Standardized HTTP handlers for registration, authentication, token rotation,
 * password recovery, session auditing, cookie orchestration, and CSRF protection.
 */

import { Request, Response, NextFunction } from 'express';
import { authService, RequestMeta } from '../../../services/AuthService';
import { adminAuthService } from '../../../services/AdminAuthService';
import { generateCsrfToken, setCsrfCookie } from '../../../middleware/csrf';
import { ApiResponse } from '../../../types/api';

const isProduction = process.env.NODE_ENV === 'production';

export class AuthController {
  /**
   * Helper to set secure auth cookies and CSRF protection token.
   */
  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): string {
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

    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);
    return csrfToken;
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
    res.clearCookie('csrfToken', {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
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

      const csrfToken = this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

      const response: ApiResponse<typeof result & { csrfToken: string }> = {
        success: true,
        message: 'Account successfully registered and authenticated.',
        data: {
          ...result,
          csrfToken,
        },
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

      const csrfToken = this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

      const response: ApiResponse<typeof result & { csrfToken: string }> = {
        success: true,
        message: 'Authentication successful.',
        data: {
          ...result,
          csrfToken,
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
   * POST /api/v1/auth/admin/login
   */
  public adminLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const meta = this.extractMeta(req);
      const result = await adminAuthService.login(req.body.identifier, req.body.password, meta, req.body.mfaCode);

      if (result.requiresMfa) {
        const response: ApiResponse<{ requiresMfa: true; mfaChallengeToken: string }> = {
          success: true,
          message: result.message,
          data: {
            requiresMfa: true,
            mfaChallengeToken: result.mfaChallengeToken,
          },
          meta: {
            requestId: req.id || 'unknown',
            timestamp: new Date().toISOString(),
          },
        };
        res.status(200).json(response);
        return;
      }

      const authData = result.data;
      const csrfToken = this.setAuthCookies(res, authData.tokens.accessToken, authData.tokens.refreshToken);

      const response: ApiResponse<typeof authData & { csrfToken: string }> = {
        success: true,
        message: 'Administrator authentication successful.',
        data: {
          ...authData,
          csrfToken,
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
   * POST /api/v1/auth/admin/mfa/verify
   */
  public adminVerifyMfa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const meta = this.extractMeta(req);
      const { mfaChallengeToken, code } = req.body;
      const authData = await adminAuthService.verifyMfaChallenge(mfaChallengeToken, code, meta);

      const csrfToken = this.setAuthCookies(res, authData.tokens.accessToken, authData.tokens.refreshToken);

      const response: ApiResponse<typeof authData & { csrfToken: string }> = {
        success: true,
        message: 'MFA verified. Administrator session authenticated.',
        data: {
          ...authData,
          csrfToken,
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
   * POST /api/v1/auth/admin/mfa/setup
   */
  public adminSetupMfa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.context?.userId;
      if (!adminId) {
        return next(new Error('Unauthenticated admin context'));
      }

      const setupData = await adminAuthService.setupMfa(adminId);
      const response: ApiResponse<typeof setupData> = {
        success: true,
        message: 'MFA enrollment initiated. Scan QR code or enter secret into authenticator app.',
        data: setupData,
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
   * POST /api/v1/auth/admin/mfa/confirm
   */
  public adminConfirmMfa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.context?.userId;
      if (!adminId) {
        return next(new Error('Unauthenticated admin context'));
      }

      const meta = this.extractMeta(req);
      const result = await adminAuthService.confirmMfa(adminId, req.body.code, meta);

      const response: ApiResponse<typeof result> = {
        success: true,
        message: result.message,
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
   * POST /api/v1/auth/admin/mfa/disable
   */
  public adminDisableMfa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requestingAdminId = req.context?.userId;
      if (!requestingAdminId) {
        return next(new Error('Unauthenticated admin context'));
      }

      const meta = this.extractMeta(req);
      const result = await adminAuthService.disableMfa(req.body.targetAdminId, requestingAdminId, meta);

      const response: ApiResponse<typeof result> = {
        success: true,
        message: result.message,
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

      const csrfToken = this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      const response: ApiResponse<{ tokens: typeof tokens; csrfToken: string }> = {
        success: true,
        message: 'Access token rotated successfully.',
        data: { tokens, csrfToken },
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
