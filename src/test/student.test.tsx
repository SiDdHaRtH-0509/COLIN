import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { StudentProvider, useStudent } from '../context/StudentContext';
import { StudentDashboardPage } from '../pages/student/StudentDashboardPage';
import { StudentExplorePage } from '../pages/student/StudentExplorePage';
import { StudentWishlistPage } from '../pages/student/StudentWishlistPage';
import { StudentComparePage } from '../pages/student/StudentComparePage';
import { StudentVisitsPage } from '../pages/student/StudentVisitsPage';
import { StudentProfilePage } from '../pages/student/StudentProfilePage';
import { StudentPremiumPage } from '../pages/student/StudentPremiumPage';
import { StudentLivingPage } from '../pages/student/StudentLivingPage';
import { StudentTiffinConnectPage } from '../pages/student/StudentTiffinConnectPage';
import { StudentPropertyDetailPage } from '../pages/student/StudentPropertyDetailPage';
import { StudentVirtualTourPage } from '../pages/student/StudentVirtualTourPage';
import { StudentLayout } from '../components/student/StudentLayout';
import { PROPERTIES } from '../data/mockData';
import { isPropertyCertified } from '../types';
import { FloatingJourneyWidget } from '../components/student/FloatingJourneyWidget';
import {
  VISIT_BOOKING_FEE,
  VISIT_REFUND_AMOUNT,
  VISIT_NON_REFUNDABLE_AMOUNT
} from '../constants/booking';
import { calculateHaversineDistance, formatDistance } from '../services/locationService';
import { validateProfilePhotoFile } from '../utils/imageStorage';
import { ToastProvider } from '../context/ToastContext';
import { StudentPropertyCard } from '../components/student/StudentPropertyCard';

// Helper component for testing StudentContext logic directly
const StudentContextConsumerTest: React.FC = () => {
  const {
    wishlist,
    toggleWishlist,
    comparisonList,
    addToComparison,
    clearComparison,
    visits,
    cancelVisit,
    premiumSubscription,
    activatePremium,
    tiffinSubscription,
    activateTiffin,
    profileCompletionPercent,
    updateStudentPreferences,
  } = useStudent();

  return (
    <div>
      <div data-testid="wishlist-count">{wishlist.length}</div>
      <div data-testid="comparison-count">{comparisonList.length}</div>
      <div data-testid="visits-count">{visits.length}</div>
      <div data-testid="premium-active">{premiumSubscription?.active ? 'Active' : 'Inactive'}</div>
      <div data-testid="tiffin-active">{tiffinSubscription?.active ? 'Active' : 'Inactive'}</div>
      <div data-testid="profile-completion">{profileCompletionPercent}</div>

      <button onClick={() => toggleWishlist('prop-5')}>Toggle Prop-5 Wishlist</button>
      <button onClick={() => addToComparison('prop-4')}>Add Prop-4 to Comparison</button>
      <button onClick={() => addToComparison('prop-5')}>Add Prop-5 to Comparison</button>
      <button onClick={() => addToComparison('prop-6')}>Add Prop-6 to Comparison</button>
      <button onClick={() => addToComparison('prop-7')}>Add Prop-7 to Comparison</button>
      <button onClick={clearComparison}>Clear Comparison</button>
      <button onClick={() => cancelVisit(visits[0]?.id, 'visited_rejected')}>Cancel First Visit Rejected</button>
      <button onClick={() => cancelVisit(visits[0]?.id, 'cancelled_prior')}>Cancel First Visit Prior</button>
      <button onClick={() => activatePremium('15-day')}>Activate 15-Day Premium</button>
      <button onClick={() => activateTiffin('tiffin-full', 'pure-veg')}>Activate Full Tiffin</button>
      <button onClick={() => updateStudentPreferences({ moveInDate: '' })}>Clear Move In Date</button>
    </div>
  );
};

describe('Phase 2 UI/UX Redesign — Student Portal & Accommodation Discovery', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Centralized Visit Booking Constants & Math', () => {
    it('enforces ₹150 booking fee with exact ₹82.50 55% refund calculation', () => {
      expect(VISIT_BOOKING_FEE).toBe(150.00);
      expect(VISIT_REFUND_AMOUNT).toBe(82.50);
      expect(VISIT_NON_REFUNDABLE_AMOUNT).toBe(67.50);
      expect(VISIT_REFUND_AMOUNT + VISIT_NON_REFUNDABLE_AMOUNT).toBe(VISIT_BOOKING_FEE);
    });
  });

  describe('StudentContext State & Persistence', () => {
    it('manages wishlist toggling and localStorage persistence', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <StudentContextConsumerTest />
          </StudentProvider>
        </AuthProvider>
      );

      // Initial mock wishlist has 2 items
      expect(screen.getByTestId('wishlist-count').textContent).toBe('2');

      // Add prop-5
      fireEvent.click(screen.getByText('Toggle Prop-5 Wishlist'));
      expect(screen.getByTestId('wishlist-count').textContent).toBe('3');
      expect(localStorage.getItem('colin_student_wishlist')).toContain('prop-5');

      // Toggle off prop-5
      fireEvent.click(screen.getByText('Toggle Prop-5 Wishlist'));
      expect(screen.getByTestId('wishlist-count').textContent).toBe('2');
      expect(localStorage.getItem('colin_student_wishlist')).not.toContain('prop-5');
    });

    it('enforces a maximum of THREE properties in comparison simultaneously', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <StudentContextConsumerTest />
          </StudentProvider>
        </AuthProvider>
      );

      // Initial comparison has 2 items ('prop-1', 'prop-2')
      expect(screen.getByTestId('comparison-count').textContent).toBe('2');

      // Add 3rd property
      fireEvent.click(screen.getByText('Add Prop-4 to Comparison'));
      expect(screen.getByTestId('comparison-count').textContent).toBe('3');

      // Attempt adding 4th property — should be blocked at 3
      fireEvent.click(screen.getByText('Add Prop-5 to Comparison'));
      expect(screen.getByTestId('comparison-count').textContent).toBe('3');
    });

    it('processes 55% refund guarantee (₹82.50) when visit is rejected on-site', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <StudentContextConsumerTest />
          </StudentProvider>
        </AuthProvider>
      );

      expect(screen.getByTestId('visits-count').textContent).toBe('2');

      // Cancel first visit with on-site rejection
      fireEvent.click(screen.getByText('Cancel First Visit Rejected'));

      const storedVisits = JSON.parse(localStorage.getItem('colin_student_visits') || '[]');
      expect(storedVisits[0].status).toBe('Visited - Rejected');
      expect(storedVisits[0].refundedAmount).toBe(VISIT_REFUND_AMOUNT); // ₹82.50
    });

    it('dynamically computes profile completion percentage based on completed fields', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <StudentContextConsumerTest />
          </StudentProvider>
        </AuthProvider>
      );

      // Default preferences have all fields filled = 100%
      expect(screen.getByTestId('profile-completion').textContent).toBe('100');

      // Clearing move-in date drops completion by 10%
      fireEvent.click(screen.getByText('Clear Move In Date'));
      expect(screen.getByTestId('profile-completion').textContent).toBe('90');
    });

    it('activates Student Premium demo subscription', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <StudentContextConsumerTest />
          </StudentProvider>
        </AuthProvider>
      );

      expect(screen.getByTestId('premium-active').textContent).toBe('Inactive');
      fireEvent.click(screen.getByText('Activate 15-Day Premium'));
      expect(screen.getByTestId('premium-active').textContent).toBe('Active');

      const storedPremium = JSON.parse(localStorage.getItem('colin_student_premium') || '{}');
      expect(storedPremium.planId).toBe('15-day');
      expect(storedPremium.dedicatedPartnerName).toBeTruthy();
    });

    it('activates TiffinConnect demo meal subscription', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <StudentContextConsumerTest />
          </StudentProvider>
        </AuthProvider>
      );

      expect(screen.getByTestId('tiffin-active').textContent).toBe('Inactive');
      fireEvent.click(screen.getByText('Activate Full Tiffin'));
      expect(screen.getByTestId('tiffin-active').textContent).toBe('Active');

      const storedTiffin = JSON.parse(localStorage.getItem('colin_student_tiffin') || '{}');
      expect(storedTiffin.planId).toBe('tiffin-full');
      expect(storedTiffin.dietaryPreference).toBe('pure-veg');
    });
  });

  describe('Student Dashboard Page', () => {
    it('renders live ticking clock, greeting, university info, profile completion, 6 workspace services, and summary cards', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <BrowserRouter>
              <StudentDashboardPage />
            </BrowserRouter>
          </StudentProvider>
        </AuthProvider>
      );

      expect(screen.getByText(/COLIN Student Living Workspace/i)).toBeInTheDocument();
      expect(screen.getByTestId('live-clock')).toBeInTheDocument();
      expect(screen.getByText(/Profile Completion/i)).toBeInTheDocument();
      expect(screen.getByText('Explore Student Workspace Services')).toBeInTheDocument();
      expect(screen.getByText('Find Stays')).toBeInTheDocument();
      expect(screen.getByText('Saved Stays')).toBeInTheDocument();
      expect(screen.getByText('Compare')).toBeInTheDocument();
      expect(screen.getByText('Book a Visit')).toBeInTheDocument();
      expect(screen.getByText('COLIN Living')).toBeInTheDocument();
      expect(screen.getByText('TiffinConnect')).toBeInTheDocument();
      expect(screen.getByText(/Recommended Stays for You/i)).toBeInTheDocument();
    });
  });

  describe('Floating Accommodation Journey Widget', () => {
    it('renders collapsed floating journey button and expands on click with 5 journey steps', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <BrowserRouter>
              <FloatingJourneyWidget />
            </BrowserRouter>
          </StudentProvider>
        </AuthProvider>
      );

      const triggerBtn = screen.getByRole('button', { name: /Open Accommodation Journey/i });
      expect(triggerBtn).toBeInTheDocument();
      expect(screen.getByText(/Step \d\/5/i)).toBeInTheDocument();

      // Open the widget
      fireEvent.click(triggerBtn);
      expect(screen.getByRole('dialog', { name: /Accommodation Journey Progress/i })).toBeInTheDocument();
      expect(screen.getByText('Profile & Preferences')).toBeInTheDocument();
      expect(screen.getByText('Explore Accommodations')).toBeInTheDocument();
      expect(screen.getByText('Shortlist Properties')).toBeInTheDocument();
      expect(screen.getByText('Schedule In-Person Visits')).toBeInTheDocument();
      expect(screen.getByText('Finalize & Move In')).toBeInTheDocument();

      // Close the widget via close button
      const closeBtn = screen.getByRole('button', { name: /Close Journey dialog/i });
      fireEvent.click(closeBtn);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('COLIN Certified Verification Logic', () => {
    it('strictly verifies both paid inspection and volunteer completion before certifying', () => {
      // Certified property (prop-1)
      const certifiedProp = PROPERTIES.find((p) => p.id === 'prop-1');
      expect(certifiedProp).toBeDefined();
      expect(isPropertyCertified(certifiedProp!)).toBe(true);

      // Uncertified property (prop-3 has inspection_scheduled, not approved)
      const uncertifiedProp = PROPERTIES.find((p) => p.id === 'prop-3');
      expect(uncertifiedProp).toBeDefined();
      expect(isPropertyCertified(uncertifiedProp!)).toBe(false);

      // Decoupled Sponsored vs Certified: prop-3 is sponsored but not certified
      expect(uncertifiedProp?.isSponsored).toBe(true);
      expect(isPropertyCertified(uncertifiedProp!)).toBe(false);
    });
  });

  describe('Accommodation Discovery Engine', () => {
    it('displays both sponsored and eligible non-sponsored listings with collapsed filters by default', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <BrowserRouter>
              <StudentExplorePage />
            </BrowserRouter>
          </StudentProvider>
        </AuthProvider>
      );

      expect(screen.getByText(/Find Your Next Stay/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Filters/i })).toBeInTheDocument();

      // Verify that non-sponsored listings are present in the directory
      const nonSponsoredProp = PROPERTIES.find((p) => !p.isSponsored);
      expect(nonSponsoredProp).toBeDefined();
      if (nonSponsoredProp) {
        expect(screen.getAllByText(nonSponsoredProp.title).length).toBeGreaterThan(0);
      }

      // Verify that sponsored listings are also present
      const sponsoredProp = PROPERTIES.find((p) => p.isSponsored);
      expect(sponsoredProp).toBeDefined();
      if (sponsoredProp) {
        expect(screen.getAllByText(sponsoredProp.title).length).toBeGreaterThan(0);
      }
    });

    it('filters accommodation by category tab', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <BrowserRouter>
              <StudentExplorePage />
            </BrowserRouter>
          </StudentProvider>
        </AuthProvider>
      );

      // Click Student Hostels tab
      const hostelsTab = screen.getByRole('button', { name: /^Student Hostels$/i });
      fireEvent.click(hostelsTab);

      // Should show filtered stays count
      expect(screen.getAllByText(/Showing/i).length).toBeGreaterThan(0);
    });

    it('opens slide-over filter drawer when clicking Filters button', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <BrowserRouter>
              <StudentExplorePage />
            </BrowserRouter>
          </StudentProvider>
        </AuthProvider>
      );

      const filterBtn = screen.getByRole('button', { name: /^Filters/i });
      fireEvent.click(filterBtn);

      expect(screen.getByText(/Filter Accommodations/i)).toBeInTheDocument();
      expect(screen.getByText(/College \/ University Campus:/i)).toBeInTheDocument();
      expect(screen.getByText(/Target City Hub:/i)).toBeInTheDocument();
    });
  });

  describe('Student Profile Page', () => {
    it('renders two-column layout with student identity card and editable tabs', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <BrowserRouter>
              <StudentProfilePage />
            </BrowserRouter>
          </StudentProvider>
        </AuthProvider>
      );

      expect(screen.getByText(/Student Profile Management/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Personal & Academic/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Accommodation & Budget/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Lifestyle & Amenities/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Account & Privacy/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
    });
  });

  describe('Student Wishlist Page', () => {
    it('renders saved properties and provides remove and visit actions', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <BrowserRouter>
              <StudentWishlistPage />
            </BrowserRouter>
          </StudentProvider>
        </AuthProvider>
      );

      expect(screen.getByText(/Saved Accommodations/i)).toBeInTheDocument();
      expect(screen.getByText(/Clear Wishlist/i)).toBeInTheDocument();
      expect(screen.getAllByText(/View Property Specs/i)[0]).toBeInTheDocument();
    });
  });

  describe('Property Comparison Matrix', () => {
    it('renders comparison matrix comparing up to 3 stays with best value indicators', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <BrowserRouter>
              <StudentComparePage />
            </BrowserRouter>
          </StudentProvider>
        </AuthProvider>
      );

      expect(screen.getByText(/Compare Accommodations/i)).toBeInTheDocument();
      expect(screen.getByText('Monthly Indicative Rent')).toBeInTheDocument();
      expect(screen.getByText('Security Deposit')).toBeInTheDocument();
      expect(screen.getByText('Distance to College')).toBeInTheDocument();
      expect(screen.getByText('Food & Meals')).toBeInTheDocument();
      expect(screen.getByText('COLIN Audit Score')).toBeInTheDocument();
    });
  });

  describe('Visit Passes & 55% Refund Guarantee', () => {
    it('renders scheduled visit passes with pass ID and 55% refund clause', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <BrowserRouter>
              <StudentVisitsPage />
            </BrowserRouter>
          </StudentProvider>
        </AuthProvider>
      );

      expect(screen.getByText(/My Visit Passes & Inspections/i)).toBeInTheDocument();
      expect(screen.getByText(/COLIN 55% Visit Refund Guarantee/i)).toBeInTheDocument();
      expect(screen.getByText(/Upcoming Visits/i)).toBeInTheDocument();
    });
  });

  describe('Student Premium, COLIN Living & TiffinConnect', () => {
    it('renders Student Premium subscription tiers with illustrative pricing', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <BrowserRouter>
              <StudentPremiumPage />
            </BrowserRouter>
          </StudentProvider>
        </AuthProvider>
      );

      expect(screen.getByText(/COLIN Student Premium Concierge/i)).toBeInTheDocument();
      expect(screen.getByText('7-Day Fast Placement Pass')).toBeInTheDocument();
      expect(screen.getByText('15-Day Semester Placement Pro')).toBeInTheDocument();
      expect(screen.getByText('30-Day VIP Campus Living Partner')).toBeInTheDocument();
    });

    it('renders COLIN Living service cards with indicative pricing', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <BrowserRouter>
              <StudentLivingPage />
            </BrowserRouter>
          </StudentProvider>
        </AuthProvider>
      );

      expect(screen.getByText(/Everything You Need Outside the Classroom/i)).toBeInTheDocument();
      expect(screen.getByText('Express Campus Wash & Steam Iron')).toBeInTheDocument();
      expect(screen.getByText('Room Deep Sanitization & Dusting')).toBeInTheDocument();
    });

    it('renders TiffinConnect meal plans and rotational menu', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <BrowserRouter>
              <StudentTiffinConnectPage />
            </BrowserRouter>
          </StudentProvider>
        </AuthProvider>
      );

      expect(screen.getByText(/TiffinConnect Meal Subscriptions/i)).toBeInTheDocument();
      expect(screen.getByText('Full Board Scholar Plan')).toBeInTheDocument();
      expect(screen.getByText(/Sample Weekly Rotational Menu/i)).toBeInTheDocument();
    });
  });

  describe('Phase 2 V3 Premium UI/UX & Location Services', () => {
    it('calculates Haversine distance and formats distance strings accurately', () => {
      const dist = calculateHaversineDistance(
        { latitude: 28.6315, longitude: 77.2167 },
        { latitude: 28.6890, longitude: 77.2100 }
      );
      expect(dist).toBeGreaterThan(5);
      expect(dist).toBeLessThan(8);

      expect(formatDistance(0.45)).toMatch(/450 m/i);
      expect(formatDistance(3.72)).toMatch(/3.7 km/i);
    });

    it('validates profile photo upload constraints (types and 5MB limit)', () => {
      const validJpeg = new File(['valid'], 'avatar.jpg', { type: 'image/jpeg' });
      expect(validateProfilePhotoFile(validJpeg).valid).toBe(true);

      const validPng = new File(['valid'], 'avatar.png', { type: 'image/png' });
      expect(validateProfilePhotoFile(validPng).valid).toBe(true);

      const invalidPdf = new File(['invalid'], 'document.pdf', { type: 'application/pdf' });
      const pdfValidation = validateProfilePhotoFile(invalidPdf);
      expect(pdfValidation.valid).toBe(false);
      expect(pdfValidation.error).toMatch(/JPEG, PNG, or WebP/i);

      const oversizedBlob = new Array(5 * 1024 * 1024 + 100).fill('a').join('');
      const oversizedFile = new File([oversizedBlob], 'large.png', { type: 'image/png' });
      const sizeValidation = validateProfilePhotoFile(oversizedFile);
      expect(sizeValidation.valid).toBe(false);
      expect(sizeValidation.error).toMatch(/exceeds.*5 MB/i);
    });

    it('renders centralized StudentPropertyCard with truthful badge and fee callouts', () => {
      const certifiedProp = PROPERTIES.find((p) => isPropertyCertified(p) && p.isSponsored)!;
      render(
        <AuthProvider>
          <StudentProvider>
            <BrowserRouter>
              <StudentPropertyCard property={certifiedProp} />
            </BrowserRouter>
          </StudentProvider>
        </AuthProvider>
      );

      expect(screen.getByText(/Sponsored/i)).toBeInTheDocument();
      expect(screen.getByText(/CERTIFIED/i)).toBeInTheDocument();
      expect(screen.getByText(/Slot Pass: ₹150.00/i)).toBeInTheDocument();
      expect(screen.getByText(/55% Refund: ₹82.50/i)).toBeInTheDocument();
    });

    it('renders profile photo upload input and actions on StudentProfilePage', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <ToastProvider>
              <BrowserRouter>
                <StudentProfilePage />
              </BrowserRouter>
            </ToastProvider>
          </StudentProvider>
        </AuthProvider>
      );

      const fileInput = screen.getByTestId('profile-photo-input');
      expect(fileInput).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Upload Photo/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();
    });
  });

  describe('Phase 2 V4 Navigation, Sticky Booking Panel, & Virtual Tour Experience', () => {
    beforeEach(() => {
      localStorage.setItem(
        'colin_auth_session',
        JSON.stringify({
          id: 'usr-student-01',
          name: 'Aarav Mehra',
          email: 'aarav.mehra@colin.in',
          role: 'student',
          university: 'Delhi University (SRCC)',
          city: 'Delhi NCR',
        })
      );
    });

    it('renders student navigation layout with distinctive section identity icons and labels', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <ToastProvider>
              <BrowserRouter>
                <StudentLayout />
              </BrowserRouter>
            </ToastProvider>
          </StudentProvider>
        </AuthProvider>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Explore Stays')).toBeInTheDocument();
      expect(screen.getByText('Saved Stays')).toBeInTheDocument();
      expect(screen.getByText('Compare')).toBeInTheDocument();
      expect(screen.getByText('My Visits')).toBeInTheDocument();
      expect(screen.getByText('My Profile')).toBeInTheDocument();
      expect(screen.getByText('Public Homepage')).toBeInTheDocument();
    });

    it('renders property detail page with 2-column layout, gallery action toolbar, sticky booking panel, reviews, and mobile bar', () => {
      const targetProperty = PROPERTIES[0];

      render(
        <AuthProvider>
          <StudentProvider>
            <ToastProvider>
              <MemoryRouter initialEntries={[`/student/property/${targetProperty.id}`]}>
                <Routes>
                  <Route path="/student/property/:id" element={<StudentPropertyDetailPage />} />
                </Routes>
              </MemoryRouter>
            </ToastProvider>
          </StudentProvider>
        </AuthProvider>
      );

      // Verify gallery action toolbar exists below images
      const galleryToolbar = screen.getByTestId('gallery-action-toolbar');
      expect(galleryToolbar).toBeInTheDocument();
      expect(screen.getByText(/Saved in Wishlist|Save to Wishlist/i)).toBeInTheDocument();
      expect(screen.getByText(/Add to Compare|In Comparison Matrix/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Share Stay/i })).toBeInTheDocument();

      // Verify desktop simplified sticky booking panel
      const stickyPanel = screen.getByTestId('sticky-booking-panel');
      expect(stickyPanel).toBeInTheDocument();
      expect(screen.getByText(/55% Eligible Refund/i)).toBeInTheDocument();
      expect(screen.getByText(/₹82.50 Refundable/i)).toBeInTheDocument();
      expect(screen.getByText(/The 55% refund is applicable if you physically visit the property and decide not to accept it\./i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Book Guided Visit/i })).toBeInTheDocument();

      // Verify physical audit report is in left column
      expect(screen.getByTestId('physical-audit-report')).toBeInTheDocument();
      expect(screen.getByText(/Physical Property Inspection Report/i)).toBeInTheDocument();

      // Verify host records are in left column
      expect(screen.getByText(/Verified Host & Building Records/i)).toBeInTheDocument();
      expect(screen.getByText(/Verified Building Address:/i)).toBeInTheDocument();

      // Verify mobile bottom booking bar
      const mobileBar = screen.getByTestId('mobile-bottom-booking-bar');
      expect(mobileBar).toBeInTheDocument();

      // Verify student reviews section
      expect(screen.getAllByText(/Verified Student Reviews/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Aarav Mehta/i)).toBeInTheDocument();

      // Verify similar accommodations
      expect(screen.getByText(new RegExp(`Similar Accommodations in ${targetProperty.city}`, 'i'))).toBeInTheDocument();
    });

    it('handles wishlist toggle and comparison toggle with toast notifications on property detail page', () => {
      const targetProperty = PROPERTIES[0];

      render(
        <AuthProvider>
          <StudentProvider>
            <ToastProvider>
              <MemoryRouter initialEntries={[`/student/property/${targetProperty.id}`]}>
                <Routes>
                  <Route path="/student/property/:id" element={<StudentPropertyDetailPage />} />
                </Routes>
              </MemoryRouter>
            </ToastProvider>
          </StudentProvider>
        </AuthProvider>
      );

      // Target property is initially in wishlist
      const initialWishlistBtn = screen.getByText('Saved in Wishlist');
      expect(initialWishlistBtn).toBeInTheDocument();
      fireEvent.click(initialWishlistBtn);

      // After toggle, it changes to Save to Wishlist
      expect(screen.getByText('Save to Wishlist')).toBeInTheDocument();

      // Target property is initially in comparison matrix
      const initialCompareBtn = screen.getByText('In Comparison Matrix');
      expect(initialCompareBtn).toBeInTheDocument();
      fireEvent.click(initialCompareBtn);

      // Now it should show Add to Compare
      expect(screen.getByText('Add to Compare')).toBeInTheDocument();
    });

    it('renders virtual tour with 6 room categories, user-controlled zoom & pan, and hotspot details', () => {
      const targetProperty = PROPERTIES[0];

      render(
        <AuthProvider>
          <StudentProvider>
            <ToastProvider>
              <MemoryRouter initialEntries={[`/student/property/${targetProperty.id}/tour`]}>
                <Routes>
                  <Route path="/student/property/:id/tour" element={<StudentVirtualTourPage />} />
                </Routes>
              </MemoryRouter>
            </ToastProvider>
          </StudentProvider>
        </AuthProvider>
      );

      // Verify viewer canvas
      const viewer = screen.getByTestId('virtual-tour-viewer');
      expect(viewer).toBeInTheDocument();

      // Verify virtual tour room category tabs
      expect(screen.getByRole('button', { name: /Deluxe Twin Bedroom|Student Bedroom/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Ensuite/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Silent Library/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Dining/i })).toBeInTheDocument();

      // Verify zoom controls
      const zoomInBtn = screen.getByRole('button', { name: /Zoom In/i });
      expect(screen.getByText('100%')).toBeInTheDocument();
      fireEvent.click(zoomInBtn);
      expect(screen.getByText('125%')).toBeInTheDocument();

      // Verify hotspot clicking
      const hotspotButton = screen.getByRole('button', { name: /\+ Ergonomic Study Station/i });
      expect(hotspotButton).toBeInTheDocument();
      fireEvent.click(hotspotButton);

      // Check that audited feature popup appears
      expect(screen.getByText(/Audited Room Feature/i)).toBeInTheDocument();
    });

    it('renders Accommodation Journey widget with step count and percentage progress', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <ToastProvider>
              <BrowserRouter>
                <FloatingJourneyWidget />
              </BrowserRouter>
            </ToastProvider>
          </StudentProvider>
        </AuthProvider>
      );

      expect(screen.getByText(/Step \d\/5/i)).toBeInTheDocument();
    });
  });

  describe('Phase 2 V5 Discovery Experience, Booking, Audit Report & Journey', () => {
    beforeEach(() => {
      localStorage.setItem(
        'colin_auth_session',
        JSON.stringify({
          id: 'usr-student-01',
          name: 'Aarav Mehra',
          email: 'aarav.mehra@colin.in',
          role: 'student',
          university: 'Delhi University (SRCC)',
          city: 'Delhi NCR',
        })
      );
    });

    it('renders Accommodation Journey widget collapsed and opens opaque modal with 5 steps', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <ToastProvider>
              <BrowserRouter>
                <FloatingJourneyWidget />
              </BrowserRouter>
            </ToastProvider>
          </StudentProvider>
        </AuthProvider>
      );

      // Collapsed state
      const toggleBtn = screen.getByRole('button', { name: /Toggle Accommodation Journey/i });
      expect(toggleBtn).toBeInTheDocument();
      expect(screen.getByText('Accommodation Journey')).toBeInTheDocument();

      // Click to open expanded panel
      fireEvent.click(toggleBtn);

      const dialog = screen.getByRole('dialog', { name: /Accommodation Journey Progress/i });
      expect(dialog).toBeInTheDocument();

      // Verify all 5 steps in expanded panel
      expect(screen.getByText('Complete Profile')).toBeInTheDocument();
      expect(screen.getByText('Discover Stays')).toBeInTheDocument();
      expect(screen.getByText('Shortlist Properties')).toBeInTheDocument();
      expect(screen.getByText('Schedule Visits')).toBeInTheDocument();
      expect(screen.getByText('Finalize Stay')).toBeInTheDocument();

      // Dismiss dialog
      const closeBtn = screen.getByRole('button', { name: /Close Journey dialog/i });
      fireEvent.click(closeBtn);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders neutral uninspected notice and no audit report for uncertified stays', () => {
      const uncertifiedProp = PROPERTIES.find((p) => !isPropertyCertified(p))!;

      render(
        <AuthProvider>
          <StudentProvider>
            <ToastProvider>
              <MemoryRouter initialEntries={[`/student/property/${uncertifiedProp.id}`]}>
                <Routes>
                  <Route path="/student/property/:id" element={<StudentPropertyDetailPage />} />
                </Routes>
              </MemoryRouter>
            </ToastProvider>
          </StudentProvider>
        </AuthProvider>
      );

      expect(screen.getByText(/This property does not currently have an approved COLIN inspection report/i)).toBeInTheDocument();
      expect(screen.queryByTestId('physical-audit-report')).not.toBeInTheDocument();
    });

    it('renders Find Stays with multiple viewing modes (Grid, List, Map) and quick discovery filters', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <ToastProvider>
              <BrowserRouter>
                <StudentExplorePage />
              </BrowserRouter>
            </ToastProvider>
          </StudentProvider>
        </AuthProvider>
      );

      // Controls Bar
      const controlsBar = screen.getByTestId('discovery-controls-bar');
      expect(controlsBar).toBeInTheDocument();

      // View mode buttons
      const gridBtn = screen.getByRole('button', { name: /^Grid View$/i });
      const listBtn = screen.getByRole('button', { name: /^List View$/i });
      const mapBtn = screen.getByRole('button', { name: /^Map View$/i });

      expect(gridBtn).toBeInTheDocument();
      expect(listBtn).toBeInTheDocument();
      expect(mapBtn).toBeInTheDocument();

      // Switch to List View
      fireEvent.click(listBtn);
      const firstProp = PROPERTIES[0];
      expect(screen.getByTestId(`property-list-item-${firstProp.id}`)).toBeInTheDocument();

      // Switch to Map View
      fireEvent.click(mapBtn);
      expect(screen.getByText(/Google Maps Interactive Discovery/i)).toBeInTheDocument();

      // Switch back to Grid View
      fireEvent.click(gridBtn);
      expect(screen.getAllByText(firstProp.title).length).toBeGreaterThan(0);

      // Quick discovery shortcuts
      expect(screen.getByRole('button', { name: /Near My Campus/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Under My Budget/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Girls Only/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Boys Only/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /COLIN Certified/i })).toBeInTheDocument();

      // Pagination load more button
      expect(screen.getByText(/Showing \d+ of \d+ verified stays/i)).toBeInTheDocument();
    });
  });

  describe('Phase 2 Final Refinement — Student Dashboard, Location-First Discovery & Stable Booking', () => {
    beforeEach(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem(
        'colin_auth_session',
        JSON.stringify({
          id: 'usr-student-01',
          name: 'Aarav Mehra',
          email: 'aarav.mehra@colin.in',
          role: 'student',
          university: 'Delhi University (SRCC)',
          city: 'Delhi NCR',
        })
      );
    });

    it('renders redesigned Student Dashboard with vibrant brand hero banner and workspace services', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <BrowserRouter>
              <StudentDashboardPage />
            </BrowserRouter>
          </StudentProvider>
        </AuthProvider>
      );

      // Vibrant Brand Hero Banner
      expect(screen.getByText(/COLIN Student Living Workspace/i)).toBeInTheDocument();
      expect(screen.getByTestId('live-clock')).toBeInTheDocument();
      expect(screen.getByText(/Profile Completion/i)).toBeInTheDocument();
      expect(screen.getByText(/100% In-Person Inspected/i)).toBeInTheDocument();

      // Workspace Services & Recommended Stays
      expect(screen.getByText('Explore Student Workspace Services')).toBeInTheDocument();
      expect(screen.getByText('Find Stays')).toBeInTheDocument();
      expect(screen.getByText(/Recommended Stays for You/i)).toBeInTheDocument();
    });

    it('renders Find Stays minimal standard-grade search bar with inputs and geolocation trigger', () => {
      render(
        <AuthProvider>
          <StudentProvider>
            <ToastProvider>
              <BrowserRouter>
                <StudentExplorePage />
              </BrowserRouter>
            </ToastProvider>
          </StudentProvider>
        </AuthProvider>
      );

      // Location-First Minimal Search Bar
      const searchBar = screen.getByTestId('location-first-search-bar');
      expect(searchBar).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search by city, campus, locality, or landmark/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Use Current Location/i })).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Search Stays/i })[0]).toBeInTheDocument();
    });

    it('renders property details with independently scrollable left column and stable sticky booking panel', () => {
      const targetProperty = PROPERTIES[0];

      render(
        <AuthProvider>
          <StudentProvider>
            <ToastProvider>
              <MemoryRouter initialEntries={[`/student/property/${targetProperty.id}`]}>
                <Routes>
                  <Route path="/student/property/:id" element={<StudentPropertyDetailPage />} />
                </Routes>
              </MemoryRouter>
            </ToastProvider>
          </StudentProvider>
        </AuthProvider>
      );

      // Independently scrollable left column
      const leftColumn = screen.getByTestId('property-details-left-column');
      expect(leftColumn).toBeInTheDocument();
      expect(leftColumn.className).toContain('overflow-y-auto');

      // Stable right booking panel
      const bookingPanel = screen.getByTestId('sticky-booking-panel');
      expect(bookingPanel).toBeInTheDocument();
      expect(screen.getByText(/Monthly Indicative Rent/i)).toBeInTheDocument();
      expect(screen.getByText(/₹0 \(Zero Brokerage\)/i)).toBeInTheDocument();
      expect(screen.getByText(/₹82\.50 Refundable/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Book Guided Visit/i })).toBeInTheDocument();
    });
  });
});
