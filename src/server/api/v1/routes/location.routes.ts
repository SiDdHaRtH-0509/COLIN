/**
 * COLIN Location & Geolocation Routes
 * Phase 4A.2.5.2: Google Maps & Geolocation Infrastructure
 */

import { Router } from 'express';
import { locationController } from '../controllers/location.controller';

const router = Router();

// Public location helpers (available to student and owner discovery workflows)
router.get('/autocomplete', locationController.autocomplete);
router.get('/places/:placeId', locationController.getPlaceDetails);
router.post('/geocode', locationController.geocode);
router.post('/reverse-geocode', locationController.reverseGeocode);
router.get('/campuses', locationController.getCampuses);

export default router;
