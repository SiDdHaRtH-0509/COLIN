/**
 * COLIN System Diagnostics & Documentation Routes
 * Phase 4A.2.2.3: Backend Core Service & API Architecture
 */

import { Router } from 'express';
import { z } from 'zod';
import { systemController } from '../controllers/system.controller';
import { validateRequest } from '../../../middleware/validateRequest';
import { requireAdmin } from '../../../middleware/authContext';
import {
  UniqueConstraintViolationError,
  RecordNotFoundError,
  ForeignKeyViolationError,
  DatabaseUnavailableError,
  ValidationConstraintError,
} from '../../../database/errors';

const router = Router();

const echoValidationSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long').max(50, 'Title cannot exceed 50 characters'),
  category: z.enum(['PG', 'HOSTEL', 'COLIVING'], {
    message: "Category must be one of 'PG', 'HOSTEL', or 'COLIVING'",
  }),
  slots: z.number().int().min(1).max(100).optional(),
});

const systemInfoQuerySchema = z.object({
  format: z.enum(['json', 'standard']).optional(),
});

router.get('/info', validateRequest({ query: systemInfoQuerySchema }), systemController.getInfo);
router.get('/openapi.json', systemController.getOpenApiSpec);
router.post('/validate-test', validateRequest({ body: echoValidationSchema }), systemController.validateEcho);
router.get('/admin-test', requireAdmin(), systemController.adminOnlyDemo);

// Development and test route for verifying error pipeline mapping
if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
  router.get('/error-test/:type', (req, _res, next) => {
    switch (req.params.type) {
      case 'unique':
        return next(new UniqueConstraintViolationError('Duplicate email detected.', 'email'));
      case 'notfound':
        return next(new RecordNotFoundError('Property stay-123 does not exist.'));
      case 'foreignkey':
        return next(new ForeignKeyViolationError('Owner does not exist.'));
      case 'unavailable':
        return next(new DatabaseUnavailableError());
      case 'validation':
        return next(new ValidationConstraintError('Validation check failed.'));
      default:
        return next(new Error('Simulated generic failure'));
    }
  });
}

export default router;
