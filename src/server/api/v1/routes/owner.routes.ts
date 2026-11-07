/**
 * COLIN Owner API Routes
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 */

import { Router } from 'express';
import { UserRoleType } from '@prisma/client';
import { requireRole } from '../../../middleware/authContext';
import { validateRequest } from '../../../middleware/validateRequest';
import { ownerController } from '../controllers/owner.controller';
import { updateOwnerProfileSchema } from '../schemas/owner.schemas';

const router = Router();

// Enforce OWNER role across all owner profile routes
router.use(requireRole([UserRoleType.OWNER]));

router.get('/me', ownerController.getMe);
router.patch('/me', validateRequest({ body: updateOwnerProfileSchema }), ownerController.updateMe);
router.get('/me/dashboard-summary', ownerController.getDashboardSummary);

export default router;
