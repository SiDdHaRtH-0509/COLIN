import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { VisitBooking, PremiumSubscription, TiffinSubscription, Property } from '../types';
import { PROPERTIES, INITIAL_STUDENT_VISITS, STUDENT_PREMIUM_TIERS, TIFFIN_MEAL_PLANS } from '../data/mockData';
import {
  VISIT_REFUND_AMOUNT,
  VISIT_OUTCOME_OPTIONS,
  VisitOutcomeReason
} from '../constants/booking';
import { saveProfilePhoto, getProfilePhoto, deleteProfilePhoto } from '../utils/imageStorage';

export interface StudentPreferences {
  fullName: string;
  email: string;
  phone: string;
  avatar: string;
  gender: string;
  university: string;
  course: string;
  academicYear: string;
  campusLocation: string;
  preferredCity: string;
  maxBudget: number;
  accommodationType: string;
  sharingPreference: string;
  foodPreference: string;
  moveInDate: string;
  acRequired: boolean;
  wifiRequired: boolean;
  laundryRequired: boolean;
  securityRequired: boolean;
  foodIncludedRequired: boolean;
  profileVisibility?: boolean;
  whatsappAlerts?: boolean;
  emailNewsletter?: boolean;
}

interface StudentContextType {
  // Wishlist
  wishlist: string[];
  toggleWishlist: (propertyId: string) => void;
  isInWishlist: (propertyId: string) => boolean;
  clearWishlist: () => void;
  savedProperties: Property[];

  // Comparison (up to 3)
  comparisonList: string[];
  addToComparison: (propertyId: string) => { success: boolean; message?: string };
  removeFromComparison: (propertyId: string) => void;
  clearComparison: () => void;
  isInComparison: (propertyId: string) => boolean;
  comparedProperties: Property[];

  // Recently Viewed
  recentlyViewed: string[];
  addRecentlyViewed: (propertyId: string) => void;
  recentlyViewedProperties: Property[];

  // Visit Bookings
  visits: VisitBooking[];
  upcomingVisitsCount: number;
  bookVisit: (booking: VisitBooking) => void;
  cancelVisit: (visitId: string, reason?: VisitOutcomeReason) => {
    success: boolean;
    refundAmount: number;
    isEligible: boolean;
    explanation: string;
    outcomeReason: string;
  };

  // Premium Subscription
  premiumSubscription: PremiumSubscription | null;
  activatePremium: (tierId: '7-day' | '15-day' | '30-day') => void;
  cancelPremium: () => void;

  // Tiffin Subscription
  tiffinSubscription: TiffinSubscription | null;
  activateTiffin: (planId: string, dietary?: 'pure-veg' | 'non-veg' | 'jain' | 'eggetarian', deliverySlot?: string) => void;
  cancelTiffin: () => void;

  // Preferences & Profile Completion
  studentPreferences: StudentPreferences;
  updateStudentPreferences: (prefs: Partial<StudentPreferences>) => void;
  updateProfilePhoto: (dataUrl: string) => Promise<void>;
  removeProfilePhoto: () => Promise<void>;
  profileCompletionPercent: number;
  missingProfileFields: string[];
}

const STORAGE_KEYS = {
  WISHLIST: 'colin_student_wishlist',
  COMPARISON: 'colin_student_comparison',
  RECENTLY_VIEWED: 'colin_student_recently_viewed',
  VISITS: 'colin_student_visits',
  PREMIUM: 'colin_student_premium',
  TIFFIN: 'colin_student_tiffin',
  PREFERENCES: 'colin_student_preferences',
};

const DEFAULT_PREFERENCES: StudentPreferences = {
  fullName: 'Aarav Mehra',
  email: 'aarav.mehra@colin.in',
  phone: '+91 98765 43210',
  avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
  gender: 'boys',
  university: 'Delhi University (North Campus — SRCC, Hindu, Hansraj)',
  course: 'B.Com (Hons)',
  academicYear: '2nd Year (Undergraduate)',
  campusLocation: 'North Campus (Vishwavidyalaya)',
  preferredCity: 'Delhi NCR',
  maxBudget: 15000,
  accommodationType: 'PG',
  sharingPreference: 'double',
  foodPreference: 'Vegetarian',
  moveInDate: '2026-08-01',
  acRequired: true,
  wifiRequired: true,
  laundryRequired: true,
  securityRequired: true,
  foodIncludedRequired: false,
  profileVisibility: true,
  whatsappAlerts: true,
  emailNewsletter: false,
};

const StudentContext = createContext<StudentContextType | undefined>(undefined);

export const StudentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Wishlist state
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.WISHLIST);
      return stored ? JSON.parse(stored) : ['prop-1', 'prop-3'];
    } catch {
      return ['prop-1', 'prop-3'];
    }
  });

  // 2. Comparison state
  const [comparisonList, setComparisonList] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.COMPARISON);
      return stored ? JSON.parse(stored) : ['prop-1', 'prop-2'];
    } catch {
      return ['prop-1', 'prop-2'];
    }
  });

  // 3. Recently viewed state
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RECENTLY_VIEWED);
      return stored ? JSON.parse(stored) : ['prop-1', 'prop-2', 'prop-3', 'prop-4'];
    } catch {
      return ['prop-1', 'prop-2', 'prop-3', 'prop-4'];
    }
  });

  // 4. Visit bookings state
  const [visits, setVisits] = useState<VisitBooking[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.VISITS);
      return stored ? JSON.parse(stored) : INITIAL_STUDENT_VISITS;
    } catch {
      return INITIAL_STUDENT_VISITS;
    }
  });

  // 5. Premium subscription state
  const [premiumSubscription, setPremiumSubscription] = useState<PremiumSubscription | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PREMIUM);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // 6. Tiffin subscription state
  const [tiffinSubscription, setTiffinSubscription] = useState<TiffinSubscription | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TIFFIN);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // 7. Student preferences state
  const [studentPreferences, setStudentPreferences] = useState<StudentPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      return stored ? JSON.parse(stored) : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(wishlist));
    } catch {}
  }, [wishlist]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COMPARISON, JSON.stringify(comparisonList));
    } catch {}
  }, [comparisonList]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RECENTLY_VIEWED, JSON.stringify(recentlyViewed));
    } catch {}
  }, [recentlyViewed]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(visits));
    } catch {}
  }, [visits]);

  useEffect(() => {
    try {
      if (premiumSubscription) {
        localStorage.setItem(STORAGE_KEYS.PREMIUM, JSON.stringify(premiumSubscription));
      } else {
        localStorage.removeItem(STORAGE_KEYS.PREMIUM);
      }
    } catch {}
  }, [premiumSubscription]);

  useEffect(() => {
    try {
      if (tiffinSubscription) {
        localStorage.setItem(STORAGE_KEYS.TIFFIN, JSON.stringify(tiffinSubscription));
      } else {
        localStorage.removeItem(STORAGE_KEYS.TIFFIN);
      }
    } catch {}
  }, [tiffinSubscription]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(studentPreferences));
    } catch {}
  }, [studentPreferences]);

  // Load persisted custom photo from IndexedDB if available
  useEffect(() => {
    let isMounted = true;
    getProfilePhoto().then((storedPhoto) => {
      if (isMounted && storedPhoto) {
        setStudentPreferences((prev) => ({ ...prev, avatar: storedPhoto }));
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const updateProfilePhoto = async (dataUrl: string) => {
    await saveProfilePhoto(dataUrl);
    setStudentPreferences((prev) => ({ ...prev, avatar: dataUrl }));
  };

  const removeProfilePhoto = async () => {
    await deleteProfilePhoto();
    setStudentPreferences((prev) => ({
      ...prev,
      avatar: DEFAULT_PREFERENCES.avatar,
    }));
  };

  // Wishlist actions
  const toggleWishlist = useCallback((propertyId: string) => {
    setWishlist((prev) =>
      prev.includes(propertyId) ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]
    );
  }, []);

  const isInWishlist = useCallback((propertyId: string) => wishlist.includes(propertyId), [wishlist]);

  const clearWishlist = useCallback(() => setWishlist([]), []);

  const savedProperties = PROPERTIES.filter((p) => wishlist.includes(p.id));

  // Comparison actions
  const addToComparison = useCallback((propertyId: string): { success: boolean; message?: string } => {
    if (comparisonList.includes(propertyId)) {
      return { success: false, message: 'Property is already in your comparison table.' };
    }
    if (comparisonList.length >= 3) {
      return { success: false, message: 'Maximum 3 properties can be compared simultaneously. Please remove one first.' };
    }
    setComparisonList((prev) => [...prev, propertyId]);
    return { success: true };
  }, [comparisonList]);

  const removeFromComparison = useCallback((propertyId: string) => {
    setComparisonList((prev) => prev.filter((id) => id !== propertyId));
  }, []);

  const clearComparison = useCallback(() => setComparisonList([]), []);

  const isInComparison = useCallback((propertyId: string) => comparisonList.includes(propertyId), [comparisonList]);

  const comparedProperties = PROPERTIES.filter((p) => comparisonList.includes(p.id));

  // Recently Viewed actions
  const addRecentlyViewed = useCallback((propertyId: string) => {
    setRecentlyViewed((prev) => {
      if (prev[0] === propertyId) return prev; // Avoid unnecessary re-render if already most recent
      const filtered = prev.filter((id) => id !== propertyId);
      return [propertyId, ...filtered].slice(0, 8);
    });
  }, []);

  const recentlyViewedProperties = PROPERTIES.filter((p) => recentlyViewed.includes(p.id));

  // Visit bookings actions
  const bookVisit = (booking: VisitBooking) => {
    setVisits((prev) => [booking, ...prev]);
  };

  const cancelVisit = (
    visitId: string,
    reason: VisitOutcomeReason = 'visited_rejected'
  ): {
    success: boolean;
    refundAmount: number;
    isEligible: boolean;
    explanation: string;
    outcomeReason: string;
  } => {
    const target = visits.find((v) => v.id === visitId);
    if (!target) {
      return {
        success: false,
        refundAmount: 0,
        isEligible: false,
        explanation: 'Visit record not found.',
        outcomeReason: 'Record Not Found',
      };
    }

    const outcome = VISIT_OUTCOME_OPTIONS[reason] || VISIT_OUTCOME_OPTIONS.visited_rejected;
    const isEligible = outcome.isEligibleForRefund;
    const calculatedRefund = isEligible
      ? (target.feePaid === 150 ? VISIT_REFUND_AMOUNT : Math.round(target.feePaid * 0.55 * 100) / 100)
      : 0.00;

    const newStatus: VisitBooking['status'] = isEligible ? 'Visited - Rejected' : 'Cancelled';

    setVisits((prev) =>
      prev.map((v) =>
        v.id === visitId
          ? {
              ...v,
              status: newStatus,
              outcomeReason: outcome.label,
              refundedAmount: calculatedRefund,
            }
          : v
      )
    );

    return {
      success: true,
      refundAmount: calculatedRefund,
      isEligible,
      explanation: outcome.explanation,
      outcomeReason: outcome.label,
    };
  };

  const upcomingVisitsCount = visits.filter((v) => v.status === 'Confirmed').length;

  // Premium actions
  const activatePremium = (tierId: '7-day' | '15-day' | '30-day') => {
    const tier = STUDENT_PREMIUM_TIERS.find((t) => t.id === tierId) || STUDENT_PREMIUM_TIERS[0];
    const durationDays = tierId === '7-day' ? 7 : tierId === '15-day' ? 15 : 30;
    const now = new Date();
    const expiry = new Date();
    expiry.setDate(now.getDate() + durationDays);

    const subscription: PremiumSubscription = {
      active: true,
      planId: tierId,
      planName: tier.name,
      price: tier.price,
      startedAt: now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      expiresAt: expiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      dedicatedPartnerName: 'Rohan Deshmukh (Senior Campus Partner)',
      dedicatedPartnerPhone: '+91 98200 44102',
    };

    setPremiumSubscription(subscription);
  };

  const cancelPremium = () => {
    setPremiumSubscription(null);
  };

  // Tiffin actions
  const activateTiffin = (
    planId: string,
    dietary: 'pure-veg' | 'non-veg' | 'jain' | 'eggetarian' = 'pure-veg',
    deliverySlot: string = 'Daily (Lunch: 12:30 PM & Dinner: 8:15 PM)'
  ) => {
    const plan = TIFFIN_MEAL_PLANS.find((p) => p.id === planId) || TIFFIN_MEAL_PLANS[0];
    const now = new Date();

    const subscription: TiffinSubscription = {
      active: true,
      planId: plan.id,
      planName: plan.title,
      priceMonthly: plan.priceMonthly,
      dietaryPreference: dietary,
      deliverySlot: deliverySlot,
      partnerName: plan.partnerName,
      mealsIncluded: plan.mealsIncluded,
      startedAt: now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    };

    setTiffinSubscription(subscription);
  };

  const cancelTiffin = () => {
    setTiffinSubscription(null);
  };

  // Profile preferences
  const updateStudentPreferences = (prefs: Partial<StudentPreferences>) => {
    setStudentPreferences((prev) => ({ ...prev, ...prefs }));
  };

  // Dynamic profile completion calculation based on actual completed fields
  const calculateProfileStatus = (): { percent: number; missing: string[] } => {
    let score = 0;
    const missing: string[] = [];

    if (studentPreferences.fullName && studentPreferences.fullName.trim().length > 2) {
      score += 10;
    } else {
      missing.push('Full Name');
    }

    if (studentPreferences.email && studentPreferences.email.includes('@')) {
      score += 10;
    } else {
      missing.push('Email Address');
    }

    if (studentPreferences.phone && studentPreferences.phone.trim().length >= 10) {
      score += 10;
    } else {
      missing.push('Mobile Number');
    }

    if (studentPreferences.university && studentPreferences.university.trim().length > 0) {
      score += 15;
    } else {
      missing.push('College / University');
    }

    if (studentPreferences.course && studentPreferences.course.trim().length > 0) {
      score += 10;
    } else {
      missing.push('Course / Degree');
    }

    if (studentPreferences.academicYear && studentPreferences.academicYear.trim().length > 0) {
      score += 10;
    } else {
      missing.push('Academic Year');
    }

    if (studentPreferences.campusLocation && studentPreferences.campusLocation.trim().length > 0) {
      score += 5;
    } else {
      missing.push('Campus Location');
    }

    if (studentPreferences.preferredCity && studentPreferences.preferredCity.trim().length > 0) {
      score += 10;
    } else {
      missing.push('Target City Hub');
    }

    if (studentPreferences.maxBudget && studentPreferences.maxBudget >= 5000) {
      score += 10;
    } else {
      missing.push('Monthly Budget');
    }

    if (studentPreferences.moveInDate && studentPreferences.moveInDate.trim().length > 0) {
      score += 10;
    } else {
      missing.push('Preferred Move-In Date');
    }

    return { percent: Math.min(score, 100), missing };
  };

  const { percent: profileCompletionPercent, missing: missingProfileFields } = calculateProfileStatus();

  return (
    <StudentContext.Provider
      value={{
        wishlist,
        toggleWishlist,
        isInWishlist,
        clearWishlist,
        savedProperties,

        comparisonList,
        addToComparison,
        removeFromComparison,
        clearComparison,
        isInComparison,
        comparedProperties,

        recentlyViewed,
        addRecentlyViewed,
        recentlyViewedProperties,

        visits,
        upcomingVisitsCount,
        bookVisit,
        cancelVisit,

        premiumSubscription,
        activatePremium,
        cancelPremium,

        tiffinSubscription,
        activateTiffin,
        cancelTiffin,

        studentPreferences,
        updateStudentPreferences,
        updateProfilePhoto,
        removeProfilePhoto,
        profileCompletionPercent,
        missingProfileFields,
      }}
    >
      {children}
    </StudentContext.Provider>
  );
};

export const useStudent = () => {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
};
