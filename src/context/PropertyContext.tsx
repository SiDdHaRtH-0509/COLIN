import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Property,
  Room,
  Enquiry,
  EnquiryStatus,
  CertificationRequest,
  OwnerSubscription,
  OwnerSubscriptionTier,
  PhotographyBooking,
  PhotographyPackage,
  SponsorshipCampaign,
  OwnerProfile,
  VisitBooking,
  InspectionChecklist,
  RoomStatus,
} from '../types';
import { PROPERTIES, INITIAL_STUDENT_VISITS } from '../data/mockData';
import {
  INITIAL_ROOMS,
  INITIAL_ENQUIRIES,
  INITIAL_CERTIFICATIONS,
  INITIAL_SUBSCRIPTION,
  INITIAL_SPONSORSHIPS,
  INITIAL_PHOTOGRAPHY,
  INITIAL_OWNER_PROFILE,
} from '../data/mockOwnerData';
import { useAuth } from './AuthContext';

const STORAGE_KEYS = {
  PROPERTIES: 'colin_all_properties',
  ROOMS: 'colin_property_rooms',
  ENQUIRIES: 'colin_owner_enquiries',
  CERTIFICATIONS: 'colin_certifications',
  SUBSCRIPTION: 'colin_owner_subscription',
  SPONSORSHIPS: 'colin_sponsorships',
  PHOTOGRAPHY: 'colin_photography',
  OWNER_PROFILE: 'colin_owner_profile',
  VISITS: 'colin_student_visits',
  INSPECTION_SLOTS: 'colin_owner_inspection_slots',
};

const DEFAULT_INSPECTION_SLOTS = [
  '10:00 AM - 12:00 PM',
  '12:00 PM - 02:00 PM',
  '03:00 PM - 05:00 PM',
  '05:00 PM - 07:00 PM',
];

interface PropertyContextType {
  // Properties
  properties: Property[];
  ownerProperties: Property[];
  addProperty: (propertyData: Partial<Property>) => Property;
  updateProperty: (id: string, updates: Partial<Property>) => void;
  deleteProperty: (id: string) => void;
  toggleListingStatus: (id: string) => void;
  renewListing: (id: string, duration: '6-month' | '12-month') => void;
  getPropertyById: (id: string) => Property | undefined;

  // Rooms
  rooms: Room[];
  getPropertyRooms: (propertyId: string) => Room[];
  addRoom: (roomData: Omit<Room, 'id' | 'updatedAt'>) => Room;
  updateRoom: (id: string, updates: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  updateRoomOccupancy: (id: string, status: RoomStatus, availableBeds: number) => void;

  // Enquiries
  enquiries: Enquiry[];
  addEnquiry: (enquiryData: Omit<Enquiry, 'id' | 'date'>) => Enquiry;
  updateEnquiryStatus: (id: string, status: EnquiryStatus) => void;
  addEnquiryNote: (id: string, note: string) => void;

  // Visits
  visits: VisitBooking[];
  updateVisitStatus: (visitId: string, status: VisitBooking['status'], outcomeReason?: string) => void;
  approveVisit: (visitId: string) => void;
  rejectVisit: (visitId: string, reason?: string) => void;
  availableInspectionSlots: string[];
  updateAvailableInspectionSlots: (slots: string[]) => void;

  // Certification
  certifications: CertificationRequest[];
  requestCertification: (propertyId: string, scheduledDate?: string, scheduledTimeSlot?: string) => CertificationRequest;
  assignInspector: (requestId: string, inspectorName: string, inspectorContact: string) => void;
  submitInspectionReport: (requestId: string, score: number, checklist: InspectionChecklist, remarks: string) => void;
  approveCertification: (requestId: string) => void;
  rejectCertification: (requestId: string, reason: string) => void;

  // Subscriptions & Monetisation
  subscription: OwnerSubscription;
  upgradeSubscription: (tier: OwnerSubscriptionTier, cycle?: 'monthly' | 'annual') => void;
  cancelSubscription: () => void;
  sponsorships: SponsorshipCampaign[];
  createSponsorship: (propertyId: string, type: 'homepage' | 'search_boost', durationDays: number, price: number) => SponsorshipCampaign;
  photographyBookings: PhotographyBooking[];
  bookPhotography: (propertyId: string, packageType: PhotographyPackage, date: string, slot: string, price: number) => PhotographyBooking;

  // Owner Profile
  ownerProfile: OwnerProfile;
  updateOwnerProfile: (updates: Partial<OwnerProfile>) => void;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

// Helper to compute expiration date
const calculateExpirationDate = (duration: '6-month' | '12-month', fromDate = new Date()): string => {
  const d = new Date(fromDate);
  const monthsToAdd = duration === '6-month' ? 6 : 12;
  d.setMonth(d.getMonth() + monthsToAdd);
  return d.toISOString().split('T')[0];
};

export const PropertyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // 1. All Properties State
  const [properties, setProperties] = useState<Property[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROPERTIES);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    // Enrich default properties with Phase 3 attributes
    return PROPERTIES.map((prop, idx) => {
      const isOwner1 = prop.id === 'prop-1' || prop.id === 'prop-7';
      return {
        ...prop,
        ownerId: isOwner1 ? 'usr-owner-01' : `usr-owner-${idx + 1}`,
        listingStatus: 'active' as const,
        listingDuration: '12-month' as const,
        listingStartedAt: '2026-10-01',
        listingExpiresAt: '2027-10-01',
        brokerage: 0,
      };
    });
  });

  // 2. Rooms State
  const [rooms, setRooms] = useState<Room[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ROOMS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_ROOMS;
  });

  // 3. Enquiries State
  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ENQUIRIES);
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_ENQUIRIES;
  });

  // 4. Certifications State
  const [certifications, setCertifications] = useState<CertificationRequest[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CERTIFICATIONS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_CERTIFICATIONS;
  });

  // 5. Subscription State
  const [subscription, setSubscription] = useState<OwnerSubscription>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_SUBSCRIPTION;
  });

  // 6. Sponsorships State
  const [sponsorships, setSponsorships] = useState<SponsorshipCampaign[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SPONSORSHIPS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_SPONSORSHIPS;
  });

  // 7. Photography Bookings State
  const [photographyBookings, setPhotographyBookings] = useState<PhotographyBooking[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PHOTOGRAPHY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_PHOTOGRAPHY;
  });

  // 8. Owner Profile State
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.OWNER_PROFILE);
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_OWNER_PROFILE;
  });

  // 9. Visits State (Synced with Student Visits storage key)
  const [visits, setVisits] = useState<VisitBooking[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.VISITS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_STUDENT_VISITS;
  });

  // 10. Inspection Slots State
  const [availableInspectionSlots, setAvailableInspectionSlots] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.INSPECTION_SLOTS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_INSPECTION_SLOTS;
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(properties));
    } catch {}
  }, [properties]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
    } catch {}
  }, [rooms]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ENQUIRIES, JSON.stringify(enquiries));
    } catch {}
  }, [enquiries]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CERTIFICATIONS, JSON.stringify(certifications));
    } catch {}
  }, [certifications]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(subscription));
    } catch {}
  }, [subscription]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SPONSORSHIPS, JSON.stringify(sponsorships));
    } catch {}
  }, [sponsorships]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PHOTOGRAPHY, JSON.stringify(photographyBookings));
    } catch {}
  }, [photographyBookings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.OWNER_PROFILE, JSON.stringify(ownerProfile));
    } catch {}
  }, [ownerProfile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(visits));
    } catch {}
  }, [visits]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.INSPECTION_SLOTS, JSON.stringify(availableInspectionSlots));
    } catch {}
  }, [availableInspectionSlots]);

  // Listen to cross-tab storage changes (e.g. if student books a visit)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.VISITS && e.newValue) {
        try {
          setVisits(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === STORAGE_KEYS.PROPERTIES && e.newValue) {
        try {
          setProperties(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Filter properties owned by current user (defaults to Col. Rajesh Sharma if in demo owner mode)
  const ownerProperties = useMemo(() => {
    const currentOwnerId = user?.id || 'usr-owner-01';
    return properties.filter((p) => {
      if (p.ownerId === currentOwnerId) return true;
      if (user?.email && p.ownerEmail === user.email) return true;
      // Default demo owner has prop-1, prop-7, and any user-created properties
      if (currentOwnerId === 'usr-owner-01' && (p.id === 'prop-1' || p.id === 'prop-7' || p.id.startsWith('prop-owner-'))) {
        return true;
      }
      return false;
    });
  }, [properties, user]);

  // Helper to re-derive a property's available rooms, beds, and occupancy status from rooms list
  const syncPropertyAvailability = useCallback((propertyId: string, currentRooms: Room[]) => {
    const propRooms = currentRooms.filter((r) => r.propertyId === propertyId);
    if (propRooms.length === 0) return;

    const availableRoomsCount = propRooms.filter((r) => r.status === 'available').length;
    const availableBedsCount = propRooms.reduce((acc, r) => acc + (r.status === 'available' ? r.availableBeds : 0), 0);
    const totalBedsCount = propRooms.reduce((acc, r) => acc + r.totalBeds, 0);

    let occupancyStatus: 'Available' | 'Few Beds Left' | 'Filling Fast' = 'Available';
    if (availableBedsCount === 0) {
      occupancyStatus = 'Filling Fast';
    } else if (availableBedsCount <= 2 || (totalBedsCount > 0 && availableBedsCount / totalBedsCount <= 0.3)) {
      occupancyStatus = 'Few Beds Left';
    }

    setProperties((prev) =>
      prev.map((p) =>
        p.id === propertyId
          ? {
              ...p,
              availableRooms: availableRoomsCount,
              availableBeds: availableBedsCount,
              occupancyStatus,
            }
          : p
      )
    );
  }, []);

  // Add Property
  const addProperty = useCallback(
    (propertyData: Partial<Property>): Property => {
      const newId = `prop-owner-${Date.now()}`;
      const duration = propertyData.listingDuration || '12-month';
      const todayStr = new Date().toISOString().split('T')[0];

      const newProperty: Property = {
        id: newId,
        title: propertyData.title || 'Untitled Property',
        category: propertyData.category || 'pg',
        categoryLabel: propertyData.categoryLabel || 'Student PG',
        gender: propertyData.gender || 'unisex',
        city: propertyData.city || 'Delhi NCR',
        neighborhood: propertyData.neighborhood || 'North Campus',
        fullAddress: propertyData.fullAddress || '',
        ownerName: user?.name || ownerProfile.ownerName,
        ownerContact: user?.phone || ownerProfile.phone,
        ownerEmail: user?.email || ownerProfile.email,
        ownerId: user?.id || ownerProfile.id,
        landmark: propertyData.landmark || '',
        nearbyUniversity: propertyData.nearbyUniversity || 'Delhi University (North Campus)',
        distanceToUniversity: propertyData.distanceToUniversity || '500m from campus',
        distanceToMetro: propertyData.distanceToMetro || '5 mins walk to metro',
        rentMonthly: propertyData.rentMonthly || 10000,
        depositAmount: propertyData.depositAmount || propertyData.rentMonthly || 10000,
        foodIncluded: propertyData.foodIncluded ?? true,
        roomType: propertyData.roomType || 'Double Sharing Room',
        sharingType: propertyData.sharingType || 'double',
        amenities: propertyData.amenities && propertyData.amenities.length > 0 ? propertyData.amenities : [
          'High-Speed Wi-Fi',
          'Attached Bath',
          'Clean Water RO',
          'Biometric Security',
        ],
        isColinCertified: false,
        verificationStatus: 'not_requested',
        inspectionRequested: false,
        inspectionPaid: false,
        inspectionCompleted: false,
        inspectionApproved: false,
        rating: 5.0,
        reviewsCount: 0,
        featuredImage:
          propertyData.featuredImage ||
          'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
        galleryImages: propertyData.galleryImages && propertyData.galleryImages.length > 0
          ? propertyData.galleryImages
          : [
              'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
              'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
            ],
        availableFrom: propertyData.availableFrom || 'Immediate',
        occupancyStatus: 'Available',
        description: propertyData.description || 'Verified student accommodation listed on COLIN.',
        highlights: propertyData.highlights || ['Zero Brokerage', 'Student Community', 'Safety Verified'],
        houseRules: propertyData.houseRules || ['No Smoking inside rooms', 'Curfew 10:30 PM', 'Guest registration required'],
        visitSlotFee: 150,
        refundGuaranteePercent: 55,
        availableRooms: propertyData.availableRooms ?? 2,
        availableBeds: propertyData.availableBeds ?? 4,
        virtualTourAvailable: false,
        mealOptions: propertyData.mealOptions || ['Breakfast', 'Dinner'],
        createdAt: todayStr,
        listingStatus: 'active',
        listingDuration: duration,
        listingStartedAt: todayStr,
        listingExpiresAt: calculateExpirationDate(duration),
        brokerage: 0,
      };

      setProperties((prev) => [newProperty, ...prev]);

      // Create initial rooms for this new property
      const room1: Room = {
        id: `room-${newId}-101`,
        propertyId: newId,
        roomNumber: 'Room 101',
        roomType: newProperty.sharingType || 'double',
        floor: '1st Floor',
        monthlyRent: newProperty.rentMonthly,
        depositAmount: newProperty.depositAmount,
        totalBeds: 2,
        availableBeds: 2,
        status: 'available',
        amenities: newProperty.amenities.slice(0, 3),
        description: 'Standard student bedroom with study desks.',
        updatedAt: todayStr,
      };
      const room2: Room = {
        id: `room-${newId}-102`,
        propertyId: newId,
        roomNumber: 'Room 102',
        roomType: newProperty.sharingType || 'double',
        floor: '1st Floor',
        monthlyRent: newProperty.rentMonthly,
        depositAmount: newProperty.depositAmount,
        totalBeds: 2,
        availableBeds: 2,
        status: 'available',
        amenities: newProperty.amenities.slice(0, 3),
        description: 'Sunny student bedroom with exterior view.',
        updatedAt: todayStr,
      };

      setRooms((prev) => [...prev, room1, room2]);
      return newProperty;
    },
    [user, ownerProfile]
  );

  // Update Property
  const updateProperty = useCallback((id: string, updates: Partial<Property>) => {
    setProperties((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return { ...p, ...updates };
        }
        return p;
      })
    );
  }, []);

  // Delete Property
  const deleteProperty = useCallback((id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
    setRooms((prev) => prev.filter((r) => r.propertyId !== id));
    setEnquiries((prev) => prev.filter((e) => e.propertyId !== id));
    setCertifications((prev) => prev.filter((c) => c.propertyId !== id));
  }, []);

  // Toggle listing active/paused
  const toggleListingStatus = useCallback((id: string) => {
    setProperties((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const nextStatus = p.listingStatus === 'active' ? 'paused' : 'active';
          return { ...p, listingStatus: nextStatus };
        }
        return p;
      })
    );
  }, []);

  // Renew Listing (6 or 12 months)
  const renewListing = useCallback((id: string, duration: '6-month' | '12-month') => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newExpiresAt = calculateExpirationDate(duration);
    setProperties((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            listingStatus: 'active',
            listingDuration: duration,
            listingStartedAt: todayStr,
            listingExpiresAt: newExpiresAt,
          };
        }
        return p;
      })
    );
  }, []);

  // Get Property by Id
  const getPropertyById = useCallback(
    (id: string) => {
      return properties.find((p) => p.id === id);
    },
    [properties]
  );

  // Rooms Management
  const getPropertyRooms = useCallback(
    (propertyId: string) => {
      return rooms.filter((r) => r.propertyId === propertyId);
    },
    [rooms]
  );

  const addRoom = useCallback(
    (roomData: Omit<Room, 'id' | 'updatedAt'>): Room => {
      // Validate available beds <= total beds
      const totalBeds = Math.max(1, roomData.totalBeds);
      const availableBeds = Math.min(totalBeds, Math.max(0, roomData.availableBeds));

      const newRoom: Room = {
        ...roomData,
        id: `room-${Date.now()}`,
        totalBeds,
        availableBeds,
        status: availableBeds === 0 ? 'occupied' : roomData.status || 'available',
        updatedAt: new Date().toISOString().split('T')[0],
      };

      setRooms((prev) => {
        const next = [...prev, newRoom];
        syncPropertyAvailability(newRoom.propertyId, next);
        return next;
      });

      return newRoom;
    },
    [syncPropertyAvailability]
  );

  const updateRoom = useCallback(
    (id: string, updates: Partial<Room>) => {
      setRooms((prev) => {
        const next = prev.map((r) => {
          if (r.id === id) {
            const totalBeds = updates.totalBeds !== undefined ? Math.max(1, updates.totalBeds) : r.totalBeds;
            let availableBeds = updates.availableBeds !== undefined ? updates.availableBeds : r.availableBeds;
            availableBeds = Math.min(totalBeds, Math.max(0, availableBeds));

            let status = updates.status || r.status;
            if (availableBeds === 0 && status === 'available') {
              status = 'occupied';
            } else if (availableBeds > 0 && status === 'occupied' && updates.availableBeds !== undefined) {
              status = 'available';
            }

            return {
              ...r,
              ...updates,
              totalBeds,
              availableBeds,
              status,
              updatedAt: new Date().toISOString().split('T')[0],
            };
          }
          return r;
        });

        const target = next.find((r) => r.id === id);
        if (target) {
          syncPropertyAvailability(target.propertyId, next);
        }
        return next;
      });
    },
    [syncPropertyAvailability]
  );

  const deleteRoom = useCallback(
    (id: string) => {
      setRooms((prev) => {
        const target = prev.find((r) => r.id === id);
        const next = prev.filter((r) => r.id !== id);
        if (target) {
          syncPropertyAvailability(target.propertyId, next);
        }
        return next;
      });
    },
    [syncPropertyAvailability]
  );

  const updateRoomOccupancy = useCallback(
    (id: string, status: RoomStatus, availableBeds: number) => {
      updateRoom(id, { status, availableBeds });
    },
    [updateRoom]
  );

  // Enquiries Management
  const addEnquiry = useCallback((enquiryData: Omit<Enquiry, 'id' | 'date'>): Enquiry => {
    const newEnquiry: Enquiry = {
      ...enquiryData,
      id: `enq-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      status: enquiryData.status || 'New',
    };
    setEnquiries((prev) => [newEnquiry, ...prev]);
    return newEnquiry;
  }, []);

  const updateEnquiryStatus = useCallback((id: string, status: EnquiryStatus) => {
    setEnquiries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status } : e))
    );
  }, []);

  const addEnquiryNote = useCallback((id: string, note: string) => {
    setEnquiries((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          const notes = e.internalNotes ? [...e.internalNotes, note] : [note];
          return { ...e, internalNotes: notes };
        }
        return e;
      })
    );
  }, []);

  // Visits Management
  const updateVisitStatus = useCallback((visitId: string, status: VisitBooking['status'], outcomeReason?: string) => {
    setVisits((prev) =>
      prev.map((v) => {
        if (v.id === visitId) {
          return { ...v, status, outcomeReason: outcomeReason || v.outcomeReason };
        }
        return v;
      })
    );
  }, []);

  const approveVisit = useCallback(
    (visitId: string) => {
      updateVisitStatus(visitId, 'Confirmed');
    },
    [updateVisitStatus]
  );

  const rejectVisit = useCallback(
    (visitId: string, reason?: string) => {
      updateVisitStatus(visitId, 'Cancelled', reason || 'Owner unavailable for requested time slot');
    },
    [updateVisitStatus]
  );

  const updateAvailableInspectionSlots = useCallback((slots: string[]) => {
    setAvailableInspectionSlots(slots);
  }, []);

  // Certification Workflow
  const requestCertification = useCallback(
    (propertyId: string, scheduledDate?: string, scheduledTimeSlot?: string): CertificationRequest => {
      const prop = properties.find((p) => p.id === propertyId);
      const title = prop?.title || 'Selected Property';
      const todayStr = new Date().toISOString().split('T')[0];

      const newRequest: CertificationRequest = {
        id: `cert-req-${Date.now()}`,
        propertyId,
        propertyTitle: title,
        ownerId: user?.id || ownerProfile.id,
        status: 'Inspection Requested',
        requestedAt: todayStr,
        inspectionFeePaid: 999,
        inspectionFeeStatus: 'Paid',
        scheduledDate: scheduledDate || todayStr,
        scheduledTimeSlot: scheduledTimeSlot || '11:00 AM - 01:00 PM',
        inspectorName: 'Kunal Singhania (COLIN Audit Lead)',
        inspectorContact: '+91 98104 55120',
        inspectorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      };

      setCertifications((prev) => [newRequest, ...prev.filter((c) => c.propertyId !== propertyId)]);

      // Update property flags: payment recorded, inspection requested, but NOT certified yet!
      setProperties((prev) =>
        prev.map((p) =>
          p.id === propertyId
            ? {
                ...p,
                verificationStatus: 'inspection_requested',
                inspectionRequested: true,
                inspectionPaid: true,
                inspectionCompleted: false,
                inspectionApproved: false,
                isColinCertified: false,
              }
            : p
        )
      );

      return newRequest;
    },
    [properties, user, ownerProfile]
  );

  const assignInspector = useCallback(
    (requestId: string, inspectorName: string, inspectorContact: string) => {
      setCertifications((prev) =>
        prev.map((c) => {
          if (c.id === requestId) {
            return {
              ...c,
              status: 'Inspector Assigned',
              inspectorName,
              inspectorContact,
            };
          }
          return c;
        })
      );
    },
    []
  );

  const submitInspectionReport = useCallback(
    (requestId: string, score: number, checklist: InspectionChecklist, remarks: string) => {
      setCertifications((prev) =>
        prev.map((c) => {
          if (c.id === requestId) {
            return {
              ...c,
              status: 'Inspection Completed',
              inspectionScore: score,
              inspectionChecklist: checklist,
              inspectionRemarks: remarks,
            };
          }
          return c;
        })
      );

      // Reflect in property that inspection is completed, awaiting review
      const req = certifications.find((c) => c.id === requestId);
      if (req) {
        setProperties((prev) =>
          prev.map((p) =>
            p.id === req.propertyId
              ? {
                  ...p,
                  verificationStatus: 'inspection_completed',
                  inspectionCompleted: true,
                  inspectionChecklist: checklist,
                  certificationScore: score,
                }
              : p
          )
        );
      }
    },
    [certifications]
  );

  const approveCertification = useCallback(
    (requestId: string) => {
      const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      let targetPropertyId = '';
      let targetScore = 98;
      let targetChecklist: InspectionChecklist = {
        fireSafetyApproved: true,
        biometricSecurityActive: true,
        wifiSpeedMbps: 300,
        foodHygieneAuditScore: 95,
        cleanLinenCertified: true,
        roomVentilationPassed: true,
      };

      setCertifications((prev) =>
        prev.map((c) => {
          if (c.id === requestId) {
            targetPropertyId = c.propertyId;
            targetScore = c.inspectionScore || 98;
            if (c.inspectionChecklist) targetChecklist = c.inspectionChecklist;
            return {
              ...c,
              status: 'Certified',
              certifiedAt: todayStr,
            };
          }
          return c;
        })
      );

      if (targetPropertyId) {
        setProperties((prev) =>
          prev.map((p) =>
            p.id === targetPropertyId
              ? {
                  ...p,
                  isColinCertified: true,
                  verificationStatus: 'approved',
                  inspectionPaid: true,
                  inspectionCompleted: true,
                  inspectionApproved: true,
                  certificationDate: todayStr,
                  certificationScore: targetScore,
                  inspectionChecklist: targetChecklist,
                }
              : p
          )
        );
      }
    },
    []
  );

  const rejectCertification = useCallback((requestId: string, reason: string) => {
    let targetPropertyId = '';
    setCertifications((prev) =>
      prev.map((c) => {
        if (c.id === requestId) {
          targetPropertyId = c.propertyId;
          return {
            ...c,
            status: 'Rejected',
            rejectionReason: reason,
          };
        }
        return c;
      })
    );

    if (targetPropertyId) {
      setProperties((prev) =>
        prev.map((p) =>
          p.id === targetPropertyId
            ? {
                ...p,
                isColinCertified: false,
                verificationStatus: 'rejected',
                inspectionApproved: false,
              }
            : p
        )
      );
    }
  }, []);

  // Subscriptions & Monetisation
  const upgradeSubscription = useCallback(
    (tier: OwnerSubscriptionTier, cycle: 'monthly' | 'annual' = 'monthly') => {
      const priceMap: Record<OwnerSubscriptionTier, number> = {
        FREE: 0,
        PRO: cycle === 'monthly' ? 1999 : 19990,
        PREMIUM: cycle === 'monthly' ? 4999 : 49990,
      };
      const limitMap: Record<OwnerSubscriptionTier, number> = {
        FREE: 1,
        PRO: 5,
        PREMIUM: 999,
      };
      const featureMap: Record<OwnerSubscriptionTier, string[]> = {
        FREE: [
          'List 1 property on COLIN',
          'Standard search results placement',
          'Basic student enquiry management',
          'Community support',
        ],
        PRO: [
          'List up to 5 properties simultaneously',
          'COLIN Certified badge eligibility',
          'Priority search result ranking',
          'Real-time student enquiry alerts (WhatsApp & SMS)',
          'Room-level bed inventory & occupancy tracker',
          '1 free physical verification audit included',
        ],
        PREMIUM: [
          'Unlimited property listings',
          'Guaranteed Top 3 Homepage & Search Spotlight',
          'Dedicated COLIN Account Manager',
          'Free 360° Virtual Tour capture for all listings',
          'Advance student move-in deposit processing',
          'Multi-property chain occupancy analytics & reporting',
        ],
      };

      const todayStr = new Date().toISOString().split('T')[0];
      const expiryStr = calculateExpirationDate(cycle === 'monthly' ? '6-month' : '12-month');

      const paymentRecord = {
        id: `inv-${Date.now()}`,
        date: todayStr,
        plan: `COLIN ${tier} Host (${cycle})`,
        amount: priceMap[tier],
        status: 'Paid' as const,
        invoiceNumber: `INV-COLIN-${Date.now().toString().slice(-6)}`,
      };

      setSubscription((prev) => ({
        tier,
        billingCycle: cycle,
        price: priceMap[tier],
        startedAt: todayStr,
        expiresAt: expiryStr,
        propertyLimit: limitMap[tier],
        features: featureMap[tier],
        paymentHistory: priceMap[tier] > 0 ? [paymentRecord, ...prev.paymentHistory] : prev.paymentHistory,
      }));
    },
    []
  );

  const cancelSubscription = useCallback(() => {
    upgradeSubscription('FREE', 'monthly');
  }, [upgradeSubscription]);

  const createSponsorship = useCallback(
    (propertyId: string, type: 'homepage' | 'search_boost', durationDays: number, price: number): SponsorshipCampaign => {
      const prop = properties.find((p) => p.id === propertyId);
      const title = prop?.title || 'Promoted Property';
      const today = new Date();
      const end = new Date(today);
      end.setDate(end.getDate() + durationDays);

      const newCampaign: SponsorshipCampaign = {
        id: `spon-${Date.now()}`,
        propertyId,
        propertyTitle: title,
        type,
        durationDays,
        startDate: today.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        price,
        status: 'Active',
        impressions: 0,
        clicks: 0,
        leadsGenerated: 0,
      };

      setSponsorships((prev) => [newCampaign, ...prev]);

      // Update property sponsorship badge
      setProperties((prev) =>
        prev.map((p) =>
          p.id === propertyId
            ? {
                ...p,
                isSponsored: true,
                sponsorshipTier: type === 'homepage' ? 'Homepage Sponsored' : 'Featured Partner',
                sponsoredBadge: type === 'homepage' ? 'Sponsored' : 'Featured',
              }
            : p
        )
      );

      return newCampaign;
    },
    [properties]
  );

  const bookPhotography = useCallback(
    (propertyId: string, packageType: PhotographyPackage, date: string, slot: string, price: number): PhotographyBooking => {
      const prop = properties.find((p) => p.id === propertyId);
      const title = prop?.title || 'Selected Property';
      const todayStr = new Date().toISOString().split('T')[0];

      const newBooking: PhotographyBooking = {
        id: `photo-${Date.now()}`,
        propertyId,
        propertyTitle: title,
        package: packageType,
        price,
        scheduledDate: date,
        timeSlot: slot,
        status: 'Booked',
        photographerName: 'Vikram Sethi (COLIN Photography Specialist)',
        photographerPhone: '+91 98115 67890',
        requestedAt: todayStr,
      };

      setPhotographyBookings((prev) => [newBooking, ...prev]);
      return newBooking;
    },
    [properties]
  );

  // Owner Profile
  const updateOwnerProfile = useCallback((updates: Partial<OwnerProfile>) => {
    setOwnerProfile((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <PropertyContext.Provider
      value={{
        properties,
        ownerProperties,
        addProperty,
        updateProperty,
        deleteProperty,
        toggleListingStatus,
        renewListing,
        getPropertyById,
        rooms,
        getPropertyRooms,
        addRoom,
        updateRoom,
        deleteRoom,
        updateRoomOccupancy,
        enquiries,
        addEnquiry,
        updateEnquiryStatus,
        addEnquiryNote,
        visits,
        updateVisitStatus,
        approveVisit,
        rejectVisit,
        availableInspectionSlots,
        updateAvailableInspectionSlots,
        certifications,
        requestCertification,
        assignInspector,
        submitInspectionReport,
        approveCertification,
        rejectCertification,
        subscription,
        upgradeSubscription,
        cancelSubscription,
        sponsorships,
        createSponsorship,
        photographyBookings,
        bookPhotography,
        ownerProfile,
        updateOwnerProfile,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
};

export const useProperties = () => {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error('useProperties must be used within a PropertyProvider');
  }
  return context;
};
