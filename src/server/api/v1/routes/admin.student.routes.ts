/**
 * COLIN Admin Student Directory API Routes
 * Phase 4A/B: Complete Centralized Student Management
 */

import { Router } from 'express';
import { requireAdmin } from '../../../middleware/authContext';
import { adminUserController } from '../controllers/admin.user.controller';

const router = Router();

router.use(requireAdmin());

router.get('/', adminUserController.listStudents);
router.patch('/:id/status', adminUserController.updateUserStatus);

export default router;
