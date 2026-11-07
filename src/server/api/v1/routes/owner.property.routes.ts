/**
 * COLIN Owner Property Management API Routes
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 */

import { Router } from 'express';
import { UserRoleType } from '@prisma/client';
import { requireRole } from '../../../middleware/authContext';
import { validateRequest } from '../../../middleware/validateRequest';
import { ownerPropertyController } from '../controllers/owner.property.controller';
import {
  createPropertySchema,
  updatePropertySchema,
  addPhotoSchema,
  reorderPhotosSchema,
  propertyIdParamSchema,
  propertyPhotoParamsSchema,
} from '../schemas/property.schemas';

const router = Router();

// Enforce OWNER role across all property management endpoints
router.use(requireRole([UserRoleType.OWNER]));

// Property CRUD & lifecycle
router.post('/', validateRequest({ body: createPropertySchema }), ownerPropertyController.create);
router.get('/', ownerPropertyController.list);
router.get('/:propertyId', validateRequest({ params: propertyIdParamSchema }), ownerPropertyController.getOne);
router.patch(
  '/:propertyId',
  validateRequest({ params: propertyIdParamSchema, body: updatePropertySchema }),
  ownerPropertyController.update
);
router.delete('/:propertyId', validateRequest({ params: propertyIdParamSchema }), ownerPropertyController.archive);
router.post('/:propertyId/submit', validateRequest({ params: propertyIdParamSchema }), ownerPropertyController.submit);
router.get('/:propertyId/status', validateRequest({ params: propertyIdParamSchema }), ownerPropertyController.getStatus);

// Photo gallery management
router.post(
  '/:propertyId/photos',
  validateRequest({ params: propertyIdParamSchema, body: addPhotoSchema }),
  ownerPropertyController.addPhoto
);
router.delete(
  '/:propertyId/photos/:photoId',
  validateRequest({ params: propertyPhotoParamsSchema }),
  ownerPropertyController.deletePhoto
);
router.put(
  '/:propertyId/photos/reorder',
  validateRequest({ params: propertyIdParamSchema, body: reorderPhotosSchema }),
  ownerPropertyController.reorderPhotos
);
router.put(
  '/:propertyId/photos/:photoId/cover',
  validateRequest({ params: propertyPhotoParamsSchema }),
  ownerPropertyController.setCoverPhoto
);

export default router;
