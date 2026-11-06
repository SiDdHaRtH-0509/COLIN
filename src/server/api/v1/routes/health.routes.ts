/**
 * COLIN Health & Readiness Routes
 * Phase 4A.2.2.3: Backend Core Service & API Architecture
 */

import { Router } from 'express';
import { healthController } from '../controllers/health.controller';

const router = Router();

router.get('/live', healthController.getLive);
router.get('/ready', healthController.getReady);

export default router;
