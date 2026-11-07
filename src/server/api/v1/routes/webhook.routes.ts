/**
 * COLIN Transactional Email Webhook Routes
 * Phase 4A.2.5.3: Transactional Email Integration
 */

import { Router } from 'express';
import { emailWebhookController } from '../../../email';

const router = Router();

// Provider-specific webhook delivery event endpoints (Gates E20, E21, E22, E23, E24)
router.post('/email/sendgrid', emailWebhookController.handleSendGrid);
router.post('/email/postmark', emailWebhookController.handlePostmark);

export default router;
