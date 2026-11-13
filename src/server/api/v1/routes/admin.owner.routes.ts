/**
 * COLIN Admin Owner Directory API Routes
 * Phase 4A/B: Complete Centralized Owner Management
 */

import { Router } from 'express';
import { requireAdmin } from '../../../middleware/authContext';
import { adminUserController } from '../controllers/admin.user.controller';

const router = Router();

router.use(requireAdmin());

router.get('/', adminUserController.listOwners);
router.post('/:id/unmask', adminUserController.unmaskOwnerPii);
router.patch('/:id/status', adminUserController.updateUserStatus);

export default router;
