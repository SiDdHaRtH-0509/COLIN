/**
 * COLIN Student API Routes
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 */

import { Router } from 'express';
import { UserRoleType } from '@prisma/client';
import { requireRole } from '../../../middleware/authContext';
import { validateRequest } from '../../../middleware/validateRequest';
import { studentController } from '../controllers/student.controller';
import { updateStudentProfileSchema } from '../schemas/student.schemas';

const router = Router();

// Enforce STUDENT role across all student routes
router.use(requireRole([UserRoleType.STUDENT]));

router.get('/me', studentController.getMe);
router.patch('/me', validateRequest({ body: updateStudentProfileSchema }), studentController.updateMe);
router.get('/me/completion', studentController.getCompletion);

export default router;
