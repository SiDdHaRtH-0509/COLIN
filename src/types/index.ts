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
  
  rentMonthly: number;
  depositAmount: number;
  foodIncluded: boolean;
  roomType: string; // e.g. "Double Sharing Room with Balcony"
  
  amenities: string[];
  isColinCertified: boolean;
  certificationScore?: number; // e.g. 98/100
  certificationDate?: string;
  
  rating: number;
  reviewsCount: number;
  featuredImage: string;
  galleryImages: string[];
  
  availableFrom: string;
  occupancyStatus: 'Available' | 'Few Beds Left' | 'Filling Fast';
  description: string;
  highlights: string[];
  houseRules: string[];
  visitSlotFee: number; // e.g. 299 INR
  refundGuaranteePercent: number; // 55%
  isSponsored?: boolean;
  sponsorshipTier?: 'Homepage Sponsored' | 'Featured Partner';
  sponsoredBadge?: string;
}

export interface SearchFilterState {
  city: string;
  category: AccommodationType;
  gender: 'all' | GenderPreference;
  maxBudget: number;
  certifiedOnly: boolean;
  foodIncludedOnly: boolean;
  searchQuery: string;
}

export interface VisitBooking {
  id: string;
  propertyId: string;
  propertyTitle: string;
  date: string;
  timeSlot: string;
  studentName: string;
  studentPhone: string;
  status: 'Confirmed' | 'Pending' | 'Completed';
  feePaid: number;
  refundPolicy: string;
}
