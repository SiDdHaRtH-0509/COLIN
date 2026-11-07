/**
 * COLIN Public Accommodation Discovery API Routes
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 */

import { Router } from 'express';
import { validateRequest } from '../../../middleware/validateRequest';
import { publicPropertyController } from '../controllers/public.property.controller';
import { publicSearchQuerySchema } from '../schemas/property.schemas';

const router = Router();

// Public routes: No authentication required for browsing and discovery
router.get('/', validateRequest({ query: publicSearchQuerySchema }), publicPropertyController.search);
router.get('/metadata/filters', publicPropertyController.getFilterMetadata);
router.get('/:idOrSlug', publicPropertyController.getDetail);

export default router;
