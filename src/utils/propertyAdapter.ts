/**
 * COLIN Property Adapter
 * Transforms backend PublicPropertyDto and Owner Property models into Frontend Property interfaces.
 */

import { Property, AccommodationType, GenderPreference } from '../types';

export function adaptBackendPropertyToFrontend(backendProp: any): Property {
  const address = backendProp.address || {};
  const pricing = backendProp.pricing || {};
  const inventory = backendProp.inventory || {};
  const photos = backendProp.photos || [];
  const coverPhoto = backendProp.coverPhoto || photos.find((p: any) => p.isCover) || photos[0];

  const categoryMap: Record<string, AccommodationType> = {
    PG: 'pg',
    HOSTEL: 'hostel',
    RENTAL_ROOM: 'rental-room',
    SHARED_FLAT: 'shared-flat',
    COLIVING: 'co-living',
  };

  const categoryLabelMap: Record<string, string> = {
    PG: 'Premium PG',
    HOSTEL: 'Student Hostel',
    RENTAL_ROOM: 'Private Room',
    SHARED_FLAT: 'Shared Flat',
    COLIVING: 'Co-Living Space',
  };

  const genderMap: Record<string, GenderPreference> = {
    BOYS_ONLY: 'boys',
    GIRLS_ONLY: 'girls',
    COED: 'unisex',
  };

  const category = categoryMap[backendProp.propertyType] || 'pg';
  const categoryLabel = categoryLabelMap[backendProp.propertyType] || 'Verified Living';
  const gender = genderMap[backendProp.genderPolicy] || 'unisex';

  const defaultImage =
    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80';

  const featuredImage = coverPhoto?.url || coverPhoto?.photoStorageUrl || defaultImage;
  const galleryImages =
    photos.length > 0
      ? photos.map((p: any) => p.url || p.photoStorageUrl).filter(Boolean)
      : [featuredImage];

  const amenitiesList = (backendProp.amenities || []).map((a: any) => (typeof a === 'string' ? a : a.name || a.code));

  const hasFood = amenitiesList.some(
    (a: string) =>
      a.toLowerCase().includes('mess') ||
      a.toLowerCase().includes('food') ||
      a.toLowerCase().includes('meal') ||
      a.toLowerCase().includes('tiffin')
  );

  const rentMonthly = pricing.startingMonthlyRent || Number(backendProp.startingMonthlyRent) || 8500;
  const depositAmount = pricing.securityDeposit || Number(backendProp.securityDeposit) || rentMonthly;

  const isVerified = backendProp.verificationStatus === 'VERIFIED';

  return {
    id: backendProp.id,
    title: backendProp.name || 'COLIN Verified Stay',
    category,
    categoryLabel,
    gender,
    city: address.city || backendProp.city || 'Delhi NCR',
    neighborhood: address.locality || address.landmark || backendProp.locality || 'Campus Hub',
    fullAddress: [
      address.addressLine1 || backendProp.addressLine1,
      address.addressLine2 || backendProp.addressLine2,
      address.city || backendProp.city,
      address.pincode || backendProp.pincode,
    ]
      .filter(Boolean)
      .join(', '),
    landmark: address.landmark || backendProp.landmark || '',
    nearbyUniversity: address.nearestCampus || backendProp.nearestCampus || 'Delhi University',
    distanceToUniversity: address.distanceToCampusKm
      ? `${address.distanceToCampusKm} km from campus`
      : 'Near university',
    distanceToMetro: '5 mins to nearest Metro',
    latitude: address.latitude ? Number(address.latitude) : backendProp.latitude ? Number(backendProp.latitude) : undefined,
    longitude: address.longitude ? Number(address.longitude) : backendProp.longitude ? Number(backendProp.longitude) : undefined,

    rentMonthly,
    depositAmount,
    foodIncluded: hasFood,
    roomType: backendProp.rooms?.[0]?.roomType || 'Single & Double Sharing',

    amenities: amenitiesList,
    isColinCertified: isVerified,
    certificationScore: isVerified ? 96 : undefined,
    certificationDate: isVerified ? 'Verified 2026' : undefined,
    verificationStatus: isVerified
      ? 'approved'
      : backendProp.verificationStatus === 'REJECTED'
      ? 'rejected'
      : backendProp.verificationStatus === 'SUBMITTED'
      ? 'inspection_scheduled'
      : 'not_requested',

    rating: 4.8,
    reviewsCount: 14,
    featuredImage,
    galleryImages,

    availableFrom: 'Available Now',
    occupancyStatus:
      inventory.occupancyStatus === 'AVAILABLE'
        ? 'Available'
        : inventory.occupancyStatus === 'PARTIALLY_BOOKED'
        ? 'Few Beds Left'
        : 'Filling Fast',
    description:
      backendProp.description ||
      'Verified student living accommodation inspected for safety, security, and verified amenities.',
    highlights: ['Zero Brokerage', '55% Visit Refund Guarantee', 'COLIN Verified Host'],

    ownerId: backendProp.ownerId || backendProp.owner?.userId || 'usr-owner-01',
    ownerName: backendProp.owner?.businessName || 'Verified Host',
    ownerContact: '+91 98XXX XXXXX (Protected)',
    ownerEmail: 'host.verified@colin.in',
  };
}
