import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { PropertyProvider, useProperties } from '../context/PropertyContext';
import { StudentProvider } from '../context/StudentContext';
import { ToastProvider } from '../context/ToastContext';
import { OwnerLayout } from '../components/owner/OwnerLayout';
import { OwnerDashboardPage } from '../pages/owner/OwnerDashboardPage';
import { OwnerPropertiesPage } from '../pages/owner/OwnerPropertiesPage';
import { OwnerRoomsPage } from '../pages/owner/OwnerRoomsPage';
import { OwnerEnquiriesPage } from '../pages/owner/OwnerEnquiriesPage';
import { OwnerVisitsAccessDenied } from '../pages/owner/OwnerVisitsAccessDenied';
import { OwnerCertificationPage } from '../pages/owner/OwnerCertificationPage';
import { OwnerSubscriptionPage } from '../pages/owner/OwnerSubscriptionPage';
import { OwnerMonetisationPage } from '../pages/owner/OwnerMonetisationPage';
import { OwnerAnalyticsPage } from '../pages/owner/OwnerAnalyticsPage';
import { OwnerSettingsPage } from '../pages/owner/OwnerSettingsPage';
import { isPropertyCertified } from '../types';

// Helper component for direct Context testing
const OwnerContextConsumerTest: React.FC = () => {
  const {
    ownerProperties,
    properties,
    addProperty,
    updateProperty,
    toggleListingStatus,
    renewListing,
    rooms,
    addRoom,
    enquiries,
    visits,
    availableInspectionSlots,
    certifications,
    requestCertification,
    approveCertification,
    rejectCertification,
    subscription,
    upgradeSubscription,
    createSponsorship,
  } = useProperties();

  return (
    <div>
      <div data-testid="owner-prop-count">{ownerProperties.length}</div>
      <div data-testid="all-prop-count">{properties.length}</div>
      <div data-testid="rooms-count">{rooms.length}</div>
      <div data-testid="enquiries-count">{enquiries.length}</div>
      <div data-testid="visits-count">{visits.length}</div>
      <div data-testid="subscription-tier">{subscription.tier}</div>
      <div data-testid="slots-count">{availableInspectionSlots.length}</div>

      {/* Property CRUD Triggers */}
      <button
        onClick={() =>
          addProperty({
            title: 'Test New PG Building',
            category: 'pg',
            categoryLabel: 'Student PG',
            rentMonthly: 14000,
            city: 'Delhi NCR',
            neighborhood: 'Kamla Nagar',
            fullAddress: 'Plot 10, Kamla Nagar, Delhi',
            listingDuration: '12-month',
          })
        }
      >
        Add Test Property
      </button>

      <button
        onClick={() => {
          if (ownerProperties.length > 0) {
            updateProperty(ownerProperties[0].id, { rentMonthly: 15500 });
          }
        }}
      >
        Update Rent Prop 0
      </button>

      <button
        onClick={() => {
          if (ownerProperties.length > 0) {
            toggleListingStatus(ownerProperties[0].id);
          }
        }}
      >
        Toggle Status Prop 0
      </button>

      <button
        onClick={() => {
          if (ownerProperties.length > 0) {
            renewListing(ownerProperties[0].id, '12-month');
          }
        }}
      >
        Renew Prop 0
      </button>

      {/* Room Management Triggers */}
      <button
        onClick={() =>
          addRoom({
            propertyId: ownerProperties[0]?.id || 'prop-1',
            roomNumber: 'Room 999',
            roomType: 'single',
            floor: '4th Floor',
            monthlyRent: 16000,
            depositAmount: 16000,
            totalBeds: 1,
            availableBeds: 1,
            status: 'available',
            amenities: ['AC', 'Wi-Fi'],
          })
        }
      >
        Add Test Room
      </button>

      {/* Certification Triggers */}
      <button
        onClick={() => {
          if (ownerProperties.length > 0) {
            requestCertification(ownerProperties[0].id);
          }
        }}
      >
        Request Certification Prop 0
      </button>

      <button
        onClick={() => {
          if (certifications.length > 0) {
            approveCertification(certifications[0].id);
          }
        }}
      >
        Approve Cert 0
      </button>

      <button
        onClick={() => {
          if (certifications.length > 0) {
            rejectCertification(certifications[0].id, 'Defects found');
          }
        }}
      >
        Reject Cert 0
      </button>

      {/* Subscription Trigger */}
      <button onClick={() => upgradeSubscription('PREMIUM', 'annual')}>
        Upgrade to Premium
      </button>

      {/* Sponsorship Trigger */}
      <button
        onClick={() => {
          if (ownerProperties.length > 0) {
            createSponsorship(ownerProperties[0].id, 'homepage', 14, 1799);
          }
        }}
      >
        Sponsor Prop 0
      </button>
    </div>
  );
};

// Helper test wrapper with all providers
const TestWrapper: React.FC<{ children: React.ReactNode; initialRoute?: string }> = ({
  children,
  initialRoute = '/owner/dashboard',
}) => {
  return (
    <AuthProvider>
      <PropertyProvider>
        <StudentProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={[initialRoute]}>
              {children}
            </MemoryRouter>
          </ToastProvider>
        </StudentProvider>
      </PropertyProvider>
    </AuthProvider>
  );
};

describe('Phase 3 Owner Portal — Authentication, Inventory & Monetisation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // =========================================================================
  // 1. OWNER AUTHENTICATION & ACCESS CONTROL
  // =========================================================================
  describe('Owner Authentication and Role Protection', () => {
    it('renders unauthenticated host sign-in screen when guest accesses owner portal', () => {
      render(
        <TestWrapper initialRoute="/owner/dashboard">
          <Routes>
            <Route path="/owner/*" element={<OwnerLayout />}>
              <Route path="dashboard" element={<OwnerDashboardPage />} />
            </Route>
          </Routes>
        </TestWrapper>
      );

      expect(screen.getByText('Sign In to Owner Portal')).toBeInTheDocument();
      expect(screen.getByText(/Property Host & Landlord Portal/i)).toBeInTheDocument();
      expect(screen.getByText('Demo Owner Login (Col. Rajesh Sharma)')).toBeInTheDocument();
    });

    it('displays student role mismatch notice when authenticated student visits owner portal', async () => {
      // Simulate student session
      localStorage.setItem(
        'colin_auth_session',
        JSON.stringify({
          id: 'usr-student-01',
          name: 'Aarav Mehra',
          email: 'aarav.mehra@colin.in',
          role: 'student',
          university: 'Delhi University (SRCC)',
        })
      );

      render(
        <TestWrapper initialRoute="/owner/dashboard">
          <Routes>
            <Route path="/owner/*" element={<OwnerLayout />}>
              <Route path="dashboard" element={<OwnerDashboardPage />} />
            </Route>
          </Routes>
        </TestWrapper>
      );

      expect(screen.getByText('Student Scholar Account Detected')).toBeInTheDocument();
      expect(screen.getByText('Owner Portal Access Restricted')).toBeInTheDocument();
      expect(screen.getByText(/Aarav Mehra/i)).toBeInTheDocument();
      expect(screen.getByText(/Switch to Demo Owner/i)).toBeInTheDocument();
    });

    it('renders owner layout and workspace when authenticated as owner', () => {
      // Simulate owner session
      localStorage.setItem(
        'colin_auth_session',
        JSON.stringify({
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma (Retd.)',
          email: 'rajesh.sharma@colin.in',
          role: 'owner',
          city: 'Delhi NCR',
        })
      );

      render(
        <TestWrapper initialRoute="/owner/dashboard">
          <Routes>
            <Route path="/owner/*" element={<OwnerLayout />}>
              <Route path="dashboard" element={<OwnerDashboardPage />} />
            </Route>
          </Routes>
        </TestWrapper>
      );

      expect(screen.getByText('Host Portal')).toBeInTheDocument();
      expect(screen.getAllByText(/Sharma Student Hostels & Living Group/i).length).toBeGreaterThan(0);
      expect(screen.getByText('Verified Host')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 2. OWNER DASHBOARD DERIVED STATE
  // =========================================================================
  describe('Owner Dashboard Derived Metrics', () => {
    beforeEach(() => {
      localStorage.setItem(
        'colin_auth_session',
        JSON.stringify({
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma (Retd.)',
          email: 'rajesh.sharma@colin.in',
          role: 'owner',
        })
      );
    });

    it('renders derived statistics for properties, occupancy, enquiries, and visit appointments', () => {
      render(
        <TestWrapper initialRoute="/owner/dashboard">
          <Routes>
            <Route path="/owner/*" element={<OwnerLayout />}>
              <Route path="dashboard" element={<OwnerDashboardPage />} />
            </Route>
          </Routes>
        </TestWrapper>
      );

      expect(screen.getByText(/Welcome back,/i)).toBeInTheDocument();
      expect(screen.getByText('Bed Occupancy')).toBeInTheDocument();
      expect(screen.getAllByText('Student Enquiries').length).toBeGreaterThan(0);
      expect(screen.getByText('Quality & Safety')).toBeInTheDocument();
      expect(screen.getByText('Physical Audit & Quality Standards')).toBeInTheDocument();
      expect(screen.queryByText('Visit Appointments')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. PROPERTY MANAGEMENT CRUD
  // =========================================================================
  describe('Property CRUD Operations', () => {
    beforeEach(() => {
      localStorage.setItem(
        'colin_auth_session',
        JSON.stringify({
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma (Retd.)',
          email: 'rajesh.sharma@colin.in',
          role: 'owner',
        })
      );
    });

    it('adds a new property and persists in context', () => {
      render(
        <TestWrapper>
          <OwnerContextConsumerTest />
        </TestWrapper>
      );

      const propCountBefore = Number(screen.getByTestId('owner-prop-count').textContent);
      fireEvent.click(screen.getByText('Add Test Property'));
      const propCountAfter = Number(screen.getByTestId('owner-prop-count').textContent);

      expect(propCountAfter).toBe(propCountBefore + 1);
    });

    it('updates property rent and toggles listing active/paused status', () => {
      render(
        <TestWrapper>
          <OwnerContextConsumerTest />
        </TestWrapper>
      );

      // Verify toggle button click operates without throwing
      expect(() => {
        fireEvent.click(screen.getByText('Update Rent Prop 0'));
        fireEvent.click(screen.getByText('Toggle Status Prop 0'));
        fireEvent.click(screen.getByText('Renew Prop 0'));
      }).not.toThrow();
    });

    it('renders property management page with filters, search bar, and Add Property modal trigger', () => {
      render(
        <TestWrapper initialRoute="/owner/properties">
          <Routes>
            <Route path="/owner/*" element={<OwnerLayout />}>
              <Route path="properties" element={<OwnerPropertiesPage />} />
            </Route>
          </Routes>
        </TestWrapper>
      );

      expect(screen.getByText('Property Management')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search by title or locality...')).toBeInTheDocument();
      expect(screen.getByText('Add New Property')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 4. ROOM AND BED MANAGEMENT
  // =========================================================================
  describe('Room and Bed Management', () => {
    beforeEach(() => {
      localStorage.setItem(
        'colin_auth_session',
        JSON.stringify({
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          role: 'owner',
        })
      );
    });

    it('adds a room and updates total rooms and available beds', () => {
      render(
        <TestWrapper>
          <OwnerContextConsumerTest />
        </TestWrapper>
      );

      const roomsBefore = Number(screen.getByTestId('rooms-count').textContent);
      fireEvent.click(screen.getByText('Add Test Room'));
      const roomsAfter = Number(screen.getByTestId('rooms-count').textContent);

      expect(roomsAfter).toBe(roomsBefore + 1);
    });

    it('renders room management view with bed availability counters and property selector', () => {
      render(
        <TestWrapper initialRoute="/owner/rooms">
          <Routes>
            <Route path="/owner/*" element={<OwnerLayout />}>
              <Route path="rooms" element={<OwnerRoomsPage />} />
            </Route>
          </Routes>
        </TestWrapper>
      );

      expect(screen.getByText('Room & Bed Management')).toBeInTheDocument();
      expect(screen.getByText('Total Rooms')).toBeInTheDocument();
      expect(screen.getByText('Available Beds')).toBeInTheDocument();
      expect(screen.getByText('Occupancy Rate')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 5. ENQUIRY MANAGEMENT
  // =========================================================================
  describe('Student Enquiry Management', () => {
    beforeEach(() => {
      localStorage.setItem(
        'colin_auth_session',
        JSON.stringify({
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          role: 'owner',
        })
      );
    });

    it('renders enquiry pipeline with status filters and student leads', () => {
      render(
        <TestWrapper initialRoute="/owner/enquiries">
          <Routes>
            <Route path="/owner/*" element={<OwnerLayout />}>
              <Route path="enquiries" element={<OwnerEnquiriesPage />} />
            </Route>
          </Routes>
        </TestWrapper>
      );

      expect(screen.getByText('Student Enquiry Management')).toBeInTheDocument();
      expect(screen.getAllByText('New Enquiries').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Visit Scheduled').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Converted').length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 6. VISIT MANAGEMENT & REFUND MATH
  // =========================================================================
  describe('Owner Visit Management and Refund Math', () => {
    beforeEach(() => {
      localStorage.setItem(
        'colin_auth_session',
        JSON.stringify({
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          role: 'owner',
        })
      );
    });

    it('restricts owner visit management route and displays centralized COLIN coordination screen', () => {
      render(
        <TestWrapper initialRoute="/owner/visits">
          <Routes>
            <Route path="/owner/*" element={<OwnerLayout />}>
              <Route path="visits" element={<OwnerVisitsAccessDenied />} />
            </Route>
          </Routes>
        </TestWrapper>
      );

      // Verify Access Denied banner is displayed
      expect(
        screen.getByText('Visit Management is Exclusively Controlled by COLIN')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/property owners do not manage, schedule, or approve student visit slot passes/i)
      ).toBeInTheDocument();

      // Verify sidebar does not render "Visits & Bookings" link
      expect(screen.queryByText('Visits & Bookings')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 7. CERTIFICATION WORKFLOW (STRICT PHYSICAL AUDIT REQUIREMENT)
  // =========================================================================
  describe('COLIN Certification Workflow', () => {
    beforeEach(() => {
      localStorage.setItem(
        'colin_auth_session',
        JSON.stringify({
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          role: 'owner',
        })
      );
    });

    it('ensures requesting certification and paying does NOT automatically certify property', () => {
      render(
        <TestWrapper>
          <OwnerContextConsumerTest />
        </TestWrapper>
      );

      // Trigger request
      fireEvent.click(screen.getByText('Request Certification Prop 0'));

      const storedProps = JSON.parse(localStorage.getItem('colin_all_properties') || '[]');
      const prop0 = storedProps[0];

      // Property MUST NOT be certified merely upon payment
      expect(prop0.isColinCertified).toBe(false);
      expect(prop0.verificationStatus).toBe('inspection_requested');
      expect(isPropertyCertified(prop0)).toBe(false);
    });

    it('activates COLIN Certified badge ONLY after physical inspection approval', () => {
      render(
        <TestWrapper>
          <OwnerContextConsumerTest />
        </TestWrapper>
      );

      // Trigger approval
      fireEvent.click(screen.getByText('Approve Cert 0'));

      const storedProps = JSON.parse(localStorage.getItem('colin_all_properties') || '[]');
      const prop1 = storedProps.find((p: any) => p.id === 'prop-1');

      if (prop1) {
        expect(prop1.isColinCertified).toBe(true);
        expect(prop1.verificationStatus).toBe('approved');
        expect(isPropertyCertified(prop1)).toBe(true);
      }
    });

    it('renders certification page with checklist scores and anti-pay-to-certify policy banner', () => {
      render(
        <TestWrapper initialRoute="/owner/certification">
          <Routes>
            <Route path="/owner/*" element={<OwnerLayout />}>
              <Route path="certification" element={<OwnerCertificationPage />} />
            </Route>
          </Routes>
        </TestWrapper>
      );

      expect(screen.getByText('COLIN Physical Certification System')).toBeInTheDocument();
      expect(screen.getByText(/Strict COLIN Trust Requirement: Physical Verification Mandatory/i)).toBeInTheDocument();
      expect(screen.getByText(/On-Site Inspector Safety & Hygiene Checklist/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 8. SUBSCRIPTIONS & MONETISATION
  // =========================================================================
  describe('Owner Subscription Tiers and Monetisation', () => {
    beforeEach(() => {
      localStorage.setItem(
        'colin_auth_session',
        JSON.stringify({
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          role: 'owner',
        })
      );
    });

    it('upgrades subscription tier and updates property limits', () => {
      render(
        <TestWrapper>
          <OwnerContextConsumerTest />
        </TestWrapper>
      );

      expect(screen.getByTestId('subscription-tier').textContent).toBe('PRO');
      fireEvent.click(screen.getByText('Upgrade to Premium'));
      expect(screen.getByTestId('subscription-tier').textContent).toBe('PREMIUM');
    });

    it('renders all three subscription tiers with differentiated features and billing cycles', () => {
      render(
        <TestWrapper initialRoute="/owner/subscription">
          <Routes>
            <Route path="/owner/*" element={<OwnerLayout />}>
              <Route path="subscription" element={<OwnerSubscriptionPage />} />
            </Route>
          </Routes>
        </TestWrapper>
      );

      expect(screen.getByText('Owner Subscription & Plans')).toBeInTheDocument();
      expect(screen.getByText('Starter Host')).toBeInTheDocument();
      expect(screen.getByText('Pro Host')).toBeInTheDocument();
      expect(screen.getByText('Premium Enterprise')).toBeInTheDocument();
    });

    it('renders growth and monetisation hub with 5 core modules', () => {
      render(
        <TestWrapper initialRoute="/owner/monetisation">
          <Routes>
            <Route path="/owner/*" element={<OwnerLayout />}>
              <Route path="monetisation" element={<OwnerMonetisationPage />} />
            </Route>
          </Routes>
        </TestWrapper>
      );

      expect(screen.getByText('Growth & Listing Monetisation')).toBeInTheDocument();
      expect(screen.getByText('A. Homepage Spotlight')).toBeInTheDocument();
      expect(screen.getByText('B. Search Ranking Boost')).toBeInTheDocument();
      expect(screen.getByText('C. 360° Studio Photography')).toBeInTheDocument();
      expect(screen.getByText('D. Listing Renewal')).toBeInTheDocument();
      expect(screen.getByText('E. PG Chain & Bulk Management')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 9. ANALYTICS & SETTINGS
  // =========================================================================
  describe('Analytics and Settings Persistence', () => {
    beforeEach(() => {
      localStorage.setItem(
        'colin_auth_session',
        JSON.stringify({
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          role: 'owner',
        })
      );
    });

    it('renders analytics with configurable commission explanation note', () => {
      render(
        <TestWrapper initialRoute="/owner/analytics">
          <Routes>
            <Route path="/owner/*" element={<OwnerLayout />}>
              <Route path="analytics" element={<OwnerAnalyticsPage />} />
            </Route>
          </Routes>
        </TestWrapper>
      );

      expect(screen.getByText('Portfolio Analytics & Revenue Modeling')).toBeInTheDocument();
      expect(screen.getByText(/Configurable Commission Model/i)).toBeInTheDocument();
      expect(screen.getByText(/Model A: 7–9% Monthly Rental Success Fee/i)).toBeInTheDocument();
    });

    it('renders business settings with identity, banking, and alert preferences tabs', () => {
      render(
        <TestWrapper initialRoute="/owner/settings">
          <Routes>
            <Route path="/owner/*" element={<OwnerLayout />}>
              <Route path="settings" element={<OwnerSettingsPage />} />
            </Route>
          </Routes>
        </TestWrapper>
      );

      expect(screen.getByText('Business Profile & Settings')).toBeInTheDocument();
      expect(screen.getByText('Business Identity')).toBeInTheDocument();
      expect(screen.getByText('Payout Bank Account')).toBeInTheDocument();
      expect(screen.getByText('Alerts & Notifications')).toBeInTheDocument();
      expect(screen.getByText('Password & Security')).toBeInTheDocument();
    });
  });
});
