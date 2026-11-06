/**
 * COLIN Authentication & Authorization API Routes
 * Phase 4A.2.3: Authentication & Authorization Integration
 * 
 * Defines routing table for identity, session lifecycle, password recovery,
 * token rotation, and RBAC-protected user self-service actions.
 */

import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateRequest } from '../../../middleware/validateRequest';
import { requireAuth } from '../../../middleware/authContext';
import { authSensitiveRateLimiter, passwordResetRateLimiter } from '../../../middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../schemas/auth.schemas';

const router = Router();

// Public Authentication & Onboarding
router.post(
  '/register',
  authSensitiveRateLimiter.middleware(),
  validateRequest({ body: registerSchema }),
  authController.register
);

router.post(
  '/login',
  authSensitiveRateLimiter.middleware(),
  validateRequest({ body: loginSchema }),
  authController.login
);

// Token Refresh & Session Termination
router.post(
  '/refresh',
  validateRequest({ body: refreshTokenSchema }),
  authController.refresh
);

router.post('/logout', authController.logout);

// Authenticated Self-Service Profile
router.get('/me', requireAuth(), authController.me);

// Password Management Workflows
router.post(
  '/password/change',
  requireAuth(),
  validateRequest({ body: changePasswordSchema }),
  authController.changePassword
);

router.post(
  '/password/forgot',
  passwordResetRateLimiter.middleware(),
  validateRequest({ body: forgotPasswordSchema }),
  authController.forgotPassword
);

router.post(
  '/password/reset',
  passwordResetRateLimiter.middleware(),
  validateRequest({ body: resetPasswordSchema }),
  authController.resetPassword
);

// Email Verification Workflows
router.post(
  '/email/verify',
  validateRequest({ body: verifyEmailSchema }),
  authController.verifyEmail
);

router.post(
  '/email/resend-verification',
  requireAuth(),
  authController.resendVerification
);

// Active Session Audit & Revocation
router.get('/sessions', requireAuth(), authController.listSessions);
router.delete('/sessions/:sessionId', requireAuth(), authController.revokeSession);

export default router;
