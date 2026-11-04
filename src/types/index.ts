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

  // Phase 3 Owner & Property Management extensions
  ownerId?: string;
  listingStatus?: 'active' | 'paused' | 'draft' | 'expired';
  listingDuration?: '6-month' | '12-month';
  listingStartedAt?: string;
  listingExpiresAt?: string;
  brokerage?: number;
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

export type MediatedBookingStatus =
  | 'PENDING_COLIN_REVIEW'             // 1. New Visit Requests
  | 'AWAITING_OWNER_AVAILABILITY'      // 2. Awaiting Owner Availability
  | 'AWAITING_COLIN_CONFIRMATION'      // 3. Availability Submitted to COLIN
  | 'VISIT_CONFIRMED'                  // 4. Visit Confirmed by COLIN
  | 'VISIT_COMPLETED_DECISION_PENDING' // 7. Student Decision Pending (12-hour timer active)
  | 'STUDENT_ACCEPTED'                 // 8. Accepted Bookings
  | 'STUDENT_REJECTED'                 // 9. Rejected Bookings
  | 'DECISION_EXPIRED'                 // 10. Expired Decisions
  | 'Confirmed'                        // Phase 1/2 legacy
  | 'Pending'                          // Phase 1/2 legacy
  | 'Completed'                        // 6. Completed Visits / Phase 1/2 legacy
  | 'Cancelled'                        // Phase 1/2 legacy
  | 'Visited - Rejected';              // Phase 1/2 legacy

export interface DecisionNotification {
  id: string;
  milestone: string;
  message: string;
  timestamp: string;
}

export interface OwnerAvailabilityProposal {
  date: string;
  timeSlot: string;
  isAlternative?: boolean;
  notes?: string;
  submittedAt: string;
  declined?: boolean;
  declineReason?: string;
}

export interface VisitBooking {
  id: string;
  bookingReference?: string; // e.g. "COLIN-VIS-2026-0001"
  propertyId: string;
  propertyTitle: string;
  propertyName?: string;
  propertyImage?: string;
  propertyCity?: string;
  propertyNeighborhood?: string;
  date: string;
  timeSlot: string;
  studentName: string;
  studentPhone?: string; // Kept private from owner; restricted by coordination architecture
  studentAge?: number;
  roomTypeInterested?: string;
  status: MediatedBookingStatus;
  outcomeReason?: string;
  feePaid: number;
  refundPolicy?: string;
  refundedAmount?: number;
  meetingGuideName?: string;
  meetingGuideContact?: string;
  createdAt?: string;

  // Phase 3A Mediated Coordination Extensions
  ownerAvailability?: OwnerAvailabilityProposal;
  assignedVolunteer?: {
    id: string;
    name: string;
    role: string;
    phone: string;
    assignedAt?: string;
  };
  visitCompletedAt?: string;
  completedByVolunteer?: {
    id: string;
    name: string;
    timestamp: string;
  };
  decisionDeadline?: string;
  decisionTimestamp?: string;
  decisionStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  rejectionReason?: string;
  refundCalculated?: number;
  refundStatus?: 'PROCESSED_SIMULATED' | 'FORFEITED_FULL' | 'RETAINED_ACCEPTED' | 'NONE';
  notificationsSent?: DecisionNotification[];
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

// ==========================================
// Phase 3 — Owner Portal & Property Management
// ==========================================

export type RoomStatus = 'available' | 'occupied' | 'maintenance';

export interface Room {
  id: string;
  propertyId: string;
  roomNumber: string;
  roomType: SharingType;
  floor: string;
  monthlyRent: number;
  depositAmount: number;
  totalBeds: number;
  availableBeds: number;
  status: RoomStatus;
  amenities: string[];
  description?: string;
  updatedAt?: string;
}

export type EnquiryStatus =
  | 'New'
  | 'Contacted'
  | 'Interested'
  | 'Visit Scheduled'
  | 'Converted'
  | 'Closed';

export interface Enquiry {
  id: string;
  propertyId: string;
  propertyTitle: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentUniversity?: string;
  message: string;
  date: string;
  status: EnquiryStatus;
  internalNotes?: string[];
  preferredMoveIn?: string;
  roomTypeInterested?: string;
  privacyRestricted?: boolean;
}

export type CertificationStage =
  | 'Not Requested'
  | 'Payment Pending'
  | 'Inspection Requested'
  | 'Inspector Assigned'
  | 'Inspection Scheduled'
  | 'Inspection Completed'
  | 'Under Review'
  | 'Certified'
  | 'Rejected';

export interface CertificationRequest {
  id: string;
  propertyId: string;
  propertyTitle: string;
  ownerId: string;
  status: CertificationStage;
  requestedAt: string;
  inspectionFeePaid: number;
  inspectionFeeStatus: 'Paid' | 'Pending';
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  inspectorName?: string;
  inspectorContact?: string;
  inspectorAvatar?: string;
  inspectionScore?: number;
  inspectionChecklist?: InspectionChecklist;
  inspectionRemarks?: string;
  certifiedAt?: string;
  rejectionReason?: string;
}

export type OwnerSubscriptionTier = 'FREE' | 'PRO' | 'PREMIUM';

export interface OwnerSubscriptionPayment {
  id: string;
  date: string;
  plan: string;
  amount: number;
  status: 'Paid' | 'Pending';
  invoiceNumber: string;
}

export interface OwnerSubscription {
  tier: OwnerSubscriptionTier;
  billingCycle: 'monthly' | 'annual';
  price: number;
  startedAt: string;
  expiresAt: string;
  propertyLimit: number;
  features: string[];
  paymentHistory: OwnerSubscriptionPayment[];
}

export type PhotographyPackage = 'HDR Essentials' | '360° Virtual Tour & HDR' | 'Full Studio & Drone Shoot';

export interface PhotographyBooking {
  id: string;
  propertyId: string;
  propertyTitle: string;
  package: PhotographyPackage;
  price: number;
  scheduledDate: string;
  timeSlot: string;
  status: 'Booked' | 'Shoot Completed' | 'Processing Photos' | 'Delivered';
  photographerName?: string;
  photographerPhone?: string;
  requestedAt: string;
}

export interface SponsorshipCampaign {
  id: string;
  propertyId: string;
  propertyTitle: string;
  type: 'homepage' | 'search_boost';
  durationDays: number;
  startDate: string;
  endDate: string;
  price: number;
  status: 'Active' | 'Scheduled' | 'Completed';
  impressions: number;
  clicks: number;
  leadsGenerated: number;
}

export interface OwnerProfile {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  avatar: string;
  isVerified?: boolean;
  gstin?: string;
  pan?: string;
  bankAccount?: {
    accountNumber: string;
    ifsc: string;
    beneficiaryName: string;
    bankName: string;
  };
  notificationPreferences: {
    whatsapp: boolean;
    email: boolean;
    sms: boolean;
    instantEnquiryAlerts: boolean;
  };
}
