export type UserRole = 'student' | 'owner';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  university?: string;
  city?: string;
  avatar?: string;
  memberSince: string;
}

export type AccommodationType = 'all' | 'pg' | 'hostel' | 'rental-room' | 'shared-flat' | 'co-living';

export type GenderPreference = 'boys' | 'girls' | 'unisex';

export type SharingType = 'single' | 'double' | 'triple' | 'multi';

export interface TourHotspot {
  label: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  info: string;
}

export interface TourArea {
  id: string;
  name: string;
  image: string;
  description: string;
  dimensions?: string;
  hotspots?: TourHotspot[];
}

export interface InspectionChecklist {
  fireSafetyApproved: boolean;
  biometricSecurityActive: boolean;
  wifiSpeedMbps: number;
  foodHygieneAuditScore: number; // out of 100
  cleanLinenCertified: boolean;
  roomVentilationPassed: boolean;
}

export type VerificationStatus =
  | 'not_requested'
  | 'inspection_requested'
  | 'payment_pending'
  | 'inspection_scheduled'
  | 'inspection_in_progress'
  | 'inspection_completed'
  | 'approved'
  | 'rejected';

export interface Property {
  id: string;
  title: string;
  category: AccommodationType;
  categoryLabel: string;
  gender: GenderPreference;
  city: string;
  neighborhood: string;
  // Protected fields visible only when authenticated
  fullAddress?: string;
  ownerName?: string;
  ownerContact?: string;
  ownerEmail?: string;
  
  landmark: string;
  nearbyUniversity: string;
  distanceToUniversity: string; // e.g. "450m from North Campus gate"
  distanceToMetro: string; // e.g. "3 mins walk to Vishwavidyalaya Metro"
  latitude?: number;
  longitude?: number;
  
  rentMonthly: number;
  depositAmount: number;
  foodIncluded: boolean;
  roomType: string; // e.g. "Double Sharing Room with Balcony"
  
  amenities: string[];
  isColinCertified: boolean;
  certificationScore?: number; // e.g. 98/100
  certificationDate?: string;
  verificationStatus?: VerificationStatus;
  inspectionRequested?: boolean;
  inspectionPaid?: boolean;
  inspectionCompleted?: boolean;
  inspectionApproved?: boolean;
  
  rating: number;
  reviewsCount: number;
  featuredImage: string;
  galleryImages: string[];
  
  availableFrom: string;
  occupancyStatus: 'Available' | 'Few Beds Left' | 'Filling Fast';
  description: string;
  highlights: string[];
  houseRules: string[];
  visitSlotFee: number; // e.g. 150 INR
  refundGuaranteePercent: number; // 55%
  isSponsored?: boolean;
  sponsorshipTier?: 'Homepage Sponsored' | 'Featured Partner';
  sponsoredBadge?: string;

  // Phase 2 extensions
  sharingType?: SharingType;
  availableRooms?: number;
  availableBeds?: number;
  virtualTourAvailable?: boolean;
  tourAreas?: TourArea[];
  inspectionChecklist?: InspectionChecklist;
  mealOptions?: string[];
  createdAt?: string;
}

export interface SearchFilterState {
  city: string;
  category: AccommodationType;
  gender: 'all' | GenderPreference;
  maxBudget: number;
  certifiedOnly: boolean;
  foodIncludedOnly: boolean;
  searchQuery: string;
  // Phase 2 additions
  university?: string;
  sharingType?: 'all' | SharingType;
  acOnly?: boolean;
  wifiOnly?: boolean;
  laundryOnly?: boolean;
  securityOnly?: boolean;
  sortBy?: 'rent-asc' | 'rent-desc' | 'distance' | 'rating' | 'recent';
}

export interface VisitBooking {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage?: string;
  propertyCity?: string;
  propertyNeighborhood?: string;
  date: string;
  timeSlot: string;
  studentName: string;
  studentPhone: string;
  status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled' | 'Visited - Rejected';
  outcomeReason?: string;
  feePaid: number;
  refundPolicy: string;
  refundedAmount?: number;
  meetingGuideName?: string;
  meetingGuideContact?: string;
  createdAt?: string;
}

export interface PremiumSubscription {
  active: boolean;
  planId: '7-day' | '15-day' | '30-day';
  planName: string;
  price: number;
  startedAt: string;
  expiresAt: string;
  dedicatedPartnerName: string;
  dedicatedPartnerPhone: string;
}

export interface TiffinSubscription {
  active: boolean;
  planId: string;
  planName: string;
  priceMonthly: number;
  dietaryPreference: 'pure-veg' | 'non-veg' | 'jain' | 'eggetarian';
  deliverySlot: string;
  partnerName: string;
  mealsIncluded: string[];
  startedAt: string;
}

export interface LivingService {
  id: string;
  title: string;
  category: 'laundry' | 'cleaning' | 'transport' | 'internet' | 'repairs' | 'moving' | 'furniture';
  categoryLabel: string;
  description: string;
  priceIndicative: string;
  priceNumber: number;
  partnerName: string;
  partnerRating: number;
  partnerReviews: number;
  availability: string;
  image: string;
  features: string[];
  isPopular?: boolean;
}

export const isPropertyCertified = (property: Property): boolean => {
  return (
    property.isColinCertified === true &&
    property.verificationStatus === 'approved' &&
    property.inspectionPaid === true &&
    property.inspectionCompleted === true &&
    property.inspectionApproved === true
  );
};
