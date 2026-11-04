import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { PropertyProvider, useProperties } from '../context/PropertyContext';
import { StudentProvider, useStudent } from '../context/StudentContext';
import { ToastProvider } from '../context/ToastContext';
import { OwnerLayout } from '../components/owner/OwnerLayout';
import { OwnerDashboardPage } from '../pages/owner/OwnerDashboardPage';
import { OwnerVisitsAccessDenied } from '../pages/owner/OwnerVisitsAccessDenied';
import { VisitBooking } from '../types';

// Test harness wrapper
const TestIsolationWrapper: React.FC<{
  initialRoute?: string;
  children: React.ReactNode;
}> = ({ initialRoute = '/', children }) => {
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <PropertyProvider>
          <StudentProvider>
            <ToastProvider>{children}</ToastProvider>
          </StudentProvider>
        </PropertyProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

// Test controller component for programmatic auth and context inspections
const AuthContextInspector: React.FC<{
  onInspect: (ctx: {
    auth: ReturnType<typeof useAuth>;
    student: ReturnType<typeof useStudent>;
    property: ReturnType<typeof useProperties>;
  }) => void;
}> = ({ onInspect }) => {
  const auth = useAuth();
  const student = useStudent();
  const property = useProperties();

  React.useEffect(() => {
    onInspect({ auth, student, property });
  }, [auth, student, property, onInspect]);

  return <div data-testid="inspector-ready" />;
};

describe('COLIN Phase 3B — Account Isolation & Centralized Visit Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // =========================================================================
  // 1. FRESH STUDENT REGISTRATION & ZERO INHERITANCE
  // =========================================================================
  describe('Fresh Student Account Isolation', () => {
    it('initializes newly registered student with completely empty profile and zero demo data', async () => {
      let captured: any = null;

      render(
        <TestIsolationWrapper initialRoute="/signup">
          <AuthContextInspector
            onInspect={(ctx) => {
              captured = ctx;
            }}
          />
        </TestIsolationWrapper>
      );

      // Register new student Riya Sen (Must await async signup)
      await React.act(async () => {
        await captured.auth.signup({
          name: 'Riya Sen',
          email: 'riya.sen@mirandahouse.ac.in',
          role: 'student',
          phone: '+91 98111 22334',
        });
      });

      // Verify authenticated user identity
      expect(captured.auth.user).toBeTruthy();
      expect(captured.auth.user.name).toBe('Riya Sen');
      expect(captured.auth.user.email).toBe('riya.sen@mirandahouse.ac.in');
      expect(captured.auth.user.role).toBe('student');
      expect(captured.auth.user.avatar).toBeUndefined();

      // Verify zero inheritance of demo Aarav Mehra profile
      expect(captured.student.studentPreferences.fullName).toBe('Riya Sen');
      expect(captured.student.studentPreferences.email).toBe('riya.sen@mirandahouse.ac.in');
      expect(captured.student.studentPreferences.phone).toBe('+91 98111 22334');
      expect(captured.student.studentPreferences.avatar).toBe('');
      expect(captured.student.studentPreferences.university).toBe('');
      expect(captured.student.studentPreferences.course).toBe('');

      // Verify empty initial collections (zero items from demo)
      expect(captured.student.wishlist).toEqual([]);
      expect(captured.student.comparisonList).toEqual([]);
      expect(captured.student.recentlyViewed).toEqual([]);
      expect(captured.student.visits).toEqual([]);
      expect(captured.student.premiumSubscription).toBeNull();
      expect(captured.student.tiffinSubscription).toBeNull();
    });

    it('isolates data between two distinct student registrations and restores upon login', async () => {
      let captured: any = null;

      const { unmount } = render(
        <TestIsolationWrapper>
          <AuthContextInspector
            onInspect={(ctx) => {
              captured = ctx;
            }}
          />
        </TestIsolationWrapper>
      );

      // 1. Student A (Riya) registers and adds property to wishlist
      await React.act(async () => {
        await captured.auth.signup({
          name: 'Riya Sen',
          email: 'riya@example.com',
          role: 'student',
          phone: '9811111111',
        });
      });
      const riyaId = captured.auth.user.id;

      await React.act(async () => {
        captured.student.toggleWishlist('prop-3');
        captured.student.addToComparison('prop-4');
      });

      expect(captured.student.wishlist).toContain('prop-3');
      expect(captured.student.comparisonList).toContain('prop-4');

      // 2. Student A logs out
      await React.act(async () => {
        captured.auth.logout();
      });

      // 3. Student B (Kabir) registers
      await React.act(async () => {
        await captured.auth.signup({
          name: 'Kabir Verma',
          email: 'kabir@example.com',
          role: 'student',
          phone: '9822222222',
        });
      });

      // Kabir MUST see empty collections, NOT Riya's
      expect(captured.auth.user.name).toBe('Kabir Verma');
      expect(captured.student.wishlist).toEqual([]);
      expect(captured.student.comparisonList).toEqual([]);
      expect(captured.student.studentPreferences.fullName).toBe('Kabir Verma');

      // 4. Student B logs out
      await React.act(async () => {
        captured.auth.logout();
      });

      // 5. Student A (Riya) logs back in with same credentials
      await React.act(async () => {
        await captured.auth.login('riya@example.com', 'Pass123!', 'student');
      });

      // Riya's persistent data MUST be restored
      expect(captured.auth.user.id).toBe(riyaId);
      expect(captured.auth.user.name).toBe('Riya Sen');
      expect(captured.student.wishlist).toContain('prop-3');
      expect(captured.student.comparisonList).toContain('prop-4');

      unmount();
    });
  });

  // =========================================================================
  // 2. FRESH OWNER REGISTRATION & COMPLETE ISOLATION
  // =========================================================================
  describe('Fresh Owner Account Isolation', () => {
    it('initializes newly registered owner with clean profile, FREE plan, and zero listings', async () => {
      let captured: any = null;

      render(
        <TestIsolationWrapper initialRoute="/signup">
          <AuthContextInspector
            onInspect={(ctx) => {
              captured = ctx;
            }}
          />
        </TestIsolationWrapper>
      );

      // Register new property owner Neha Patel
      await React.act(async () => {
        await captured.auth.signup({
          name: 'Neha Patel',
          email: 'neha.patel@delhistays.in',
          role: 'owner',
          phone: '+91 98444 55667',
        });
      });

      // Verify owner identity
      expect(captured.auth.user.name).toBe('Neha Patel');
      expect(captured.auth.user.role).toBe('owner');

      // Verify clean profile (no Col. Rajesh Sharma data)
      expect(captured.property.ownerProfile.ownerName).toBe('Neha Patel');
      expect(captured.property.ownerProfile.email).toBe('neha.patel@delhistays.in');
      expect(captured.property.ownerProfile.phone).toBe('+91 98444 55667');
      expect(captured.property.ownerProfile.isVerified).toBe(false);

      // Verify FREE starter subscription plan
      expect(captured.property.subscription.tier).toBe('FREE');
      expect(captured.property.subscription.propertyLimit).toBe(1);

      // Verify strictly ZERO properties, rooms, enquiries, sponsorships, or certifications
      expect(captured.property.ownerProperties).toEqual([]);
      expect(captured.property.enquiries).toEqual([]);
      expect(captured.property.certifications).toEqual([]);
      expect(captured.property.sponsorships).toEqual([]);
      expect(captured.property.photographyBookings).toEqual([]);
    });

    it('isolates listings between two owners and prevents cross-owner access', async () => {
      let captured: any = null;

      const { unmount } = render(
        <TestIsolationWrapper>
          <AuthContextInspector
            onInspect={(ctx) => {
              captured = ctx;
            }}
          />
        </TestIsolationWrapper>
      );

      // Owner 1 (Neha) registers and adds a property
      await React.act(async () => {
        await captured.auth.signup({
          name: 'Neha Patel',
          email: 'neha@example.com',
          role: 'owner',
          phone: '9844455667',
        });
      });
      const nehaId = captured.auth.user.id;

      let createdProp: any = null;
      await React.act(async () => {
        createdProp = captured.property.addProperty({
          title: 'Neha Comfort Stays',
          city: 'Delhi NCR',
          neighborhood: 'Vijay Nagar',
          rentMonthly: 14000,
        });
      });

      expect(captured.property.ownerProperties.length).toBe(1);
      expect(captured.property.ownerProperties[0].title).toBe('Neha Comfort Stays');
      expect(captured.property.ownerProperties[0].ownerId).toBe(nehaId);

      // Owner 1 logs out
      await React.act(async () => {
        captured.auth.logout();
      });

      // Owner 2 (Vikram) registers
      await React.act(async () => {
        await captured.auth.signup({
          name: 'Vikram Singh',
          email: 'vikram@example.com',
          role: 'owner',
          phone: '9855566778',
        });
      });

      // Vikram MUST have 0 properties (cannot see Neha's property in his owner list)
      expect(captured.property.ownerProperties).toEqual([]);
      expect(captured.property.ownerProfile.ownerName).toBe('Vikram Singh');

      // Cross-user modification check: Vikram attempts to delete Neha's property
      await React.act(async () => {
        captured.property.deleteProperty(createdProp.id);
      });

      // Global property MUST remain intact because Vikram is not the owner
      expect(captured.property.getPropertyById(createdProp.id)).toBeDefined();

      // Vikram logs out, Neha logs back in
      await React.act(async () => {
        captured.auth.logout();
      });
      await React.act(async () => {
        await captured.auth.login('neha@example.com', 'Pass123!', 'owner');
      });

      // Neha's property is still intact in her portfolio
      expect(captured.property.ownerProperties.length).toBe(1);
      expect(captured.property.ownerProperties[0].title).toBe('Neha Comfort Stays');

      unmount();
    });
  });

  // =========================================================================
  // 3. DEMO ACCOUNT ISOLATION
  // =========================================================================
  describe('Demo Account Isolation', () => {
    it('preserves demo student (Aarav Mehra) data without leaking into fresh student registrations', async () => {
      let captured: any = null;

      render(
        <TestIsolationWrapper>
          <AuthContextInspector
            onInspect={(ctx) => {
              captured = ctx;
            }}
          />
        </TestIsolationWrapper>
      );

      // Log in as demo student
      await React.act(async () => {
        await captured.auth.login('student.demo@colin.in', 'DemoStudent123!', 'student');
      });

      expect(captured.auth.user.name).toBe('Aarav Mehra');
      expect(captured.student.wishlist.length).toBeGreaterThan(0);
      expect(captured.student.studentPreferences.university).toContain('Delhi University');

      // Logout and register fresh student
      await React.act(async () => {
        captured.auth.logout();
      });
      await React.act(async () => {
        await captured.auth.signup({
          name: 'Pooja Nair',
          email: 'pooja@example.com',
          role: 'student',
          phone: '9877711223',
        });
      });

      // Pooja MUST NOT have Aarav's university or wishlist
      expect(captured.auth.user.name).toBe('Pooja Nair');
      expect(captured.student.studentPreferences.fullName).toBe('Pooja Nair');
      expect(captured.student.studentPreferences.university).toBe('');
      expect(captured.student.wishlist).toEqual([]);
    });

    it('preserves demo owner (Col. Rajesh Sharma) listings without leaking into fresh owner registrations', async () => {
      let captured: any = null;

      render(
        <TestIsolationWrapper>
          <AuthContextInspector
            onInspect={(ctx) => {
              captured = ctx;
            }}
          />
        </TestIsolationWrapper>
      );

      // Log in as demo owner
      await React.act(async () => {
        await captured.auth.login('owner.demo@colin.in', 'DemoOwner123!', 'owner');
      });

      expect(captured.auth.user.name).toBe('Col. Rajesh Sharma');
      expect(captured.property.ownerProperties.length).toBeGreaterThan(0);
      expect(captured.property.subscription.tier).toBe('PRO');

      // Logout and register fresh owner
      await React.act(async () => {
        captured.auth.logout();
      });
      await React.act(async () => {
        await captured.auth.signup({
          name: 'Anil Mehta',
          email: 'anil@example.com',
          role: 'owner',
          phone: '9899988776',
        });
      });

      // Anil MUST have 0 properties and FREE plan
      expect(captured.auth.user.name).toBe('Anil Mehta');
      expect(captured.property.ownerProperties).toEqual([]);
      expect(captured.property.subscription.tier).toBe('FREE');
    });
  });

  // =========================================================================
  // 4. CENTRALIZED VISIT MANAGEMENT & OWNER PORTAL REMOVAL
  // =========================================================================
  describe('Centralized Visit Management & Route Protection', () => {
    it('does not display Visits & Bookings in Owner Portal sidebar', () => {
      localStorage.setItem(
        'colin_auth_session',
        JSON.stringify({
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          role: 'owner',
        })
      );

      render(
        <TestIsolationWrapper initialRoute="/owner/dashboard">
          <Routes>
            <Route path="/owner/*" element={<OwnerLayout />}>
              <Route path="dashboard" element={<OwnerDashboardPage />} />
            </Route>
          </Routes>
        </TestIsolationWrapper>
      );

      // Verify "Visits & Bookings" is completely removed from navigation
      expect(screen.queryByText('Visits & Bookings')).not.toBeInTheDocument();
      expect(screen.queryByText('Manage Inspection Slots')).not.toBeInTheDocument();
    });

    it('blocks direct navigation to /owner/visits and displays centralized coordination access-denied screen', () => {
      localStorage.setItem(
        'colin_auth_session',
        JSON.stringify({
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          role: 'owner',
        })
      );

      render(
        <TestIsolationWrapper initialRoute="/owner/visits">
          <Routes>
            <Route path="/owner/*" element={<OwnerLayout />}>
              <Route path="visits" element={<OwnerVisitsAccessDenied />} />
            </Route>
          </Routes>
        </TestIsolationWrapper>
      );

      // Verify access denied screen
      expect(
        screen.getByText('Visit Management is Exclusively Controlled by COLIN')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/property owners do not manage, schedule, or approve student visit slot passes/i)
      ).toBeInTheDocument();
      expect(screen.getByText('Return to Dashboard')).toBeInTheDocument();
    });

    it('removes visit appointments metric card and visit schedule from Owner Dashboard', () => {
      localStorage.setItem(
        'colin_auth_session',
        JSON.stringify({
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          role: 'owner',
        })
      );

      render(
        <TestIsolationWrapper initialRoute="/owner/dashboard">
          <Routes>
            <Route path="/owner/*" element={<OwnerLayout />}>
              <Route path="dashboard" element={<OwnerDashboardPage />} />
            </Route>
          </Routes>
        </TestIsolationWrapper>
      );

      // Metric card 4 is now Quality & Safety / COLIN Verification
      expect(screen.getByText('Quality & Safety')).toBeInTheDocument();
      expect(screen.queryByText('Visit Appointments')).not.toBeInTheDocument();

      // Module 5 is Physical Audit & Quality Standards
      expect(screen.getByText('Physical Audit & Quality Standards')).toBeInTheDocument();
      expect(screen.queryByText('Upcoming Visits')).not.toBeInTheDocument();
    });

    it('preserves student visit booking and 12-hour decision workflow', async () => {
      let captured: any = null;

      render(
        <TestIsolationWrapper>
          <AuthContextInspector
            onInspect={(ctx) => {
              captured = ctx;
            }}
          />
        </TestIsolationWrapper>
      );

      // Authenticate as demo student
      await React.act(async () => {
        await captured.auth.login('student.demo@colin.in', 'DemoStudent123!', 'student');
      });

      // Reserve an in-person inspection visit
      const visitData: VisitBooking = {
        id: `vis-test-${Date.now()}`,
        bookingReference: 'COLIN-VIS-2026-TEST',
        propertyId: 'prop-1',
        propertyTitle: 'Stanza Living North Campus',
        propertyCity: 'Delhi',
        propertyNeighborhood: 'Hudson Lane',
        date: '2026-11-20',
        timeSlot: '11:00 AM - 01:00 PM',
        studentName: 'Aarav Mehra',
        studentAge: 20,
        roomTypeInterested: 'Double Sharing Room',
        status: 'PENDING_COLIN_REVIEW',
        feePaid: 150,
        createdAt: '2026-11-03',
      };

      await React.act(async () => {
        captured.student.bookVisit(visitData);
      });

      const initialVisits = captured.student.visits;
      const foundVisit = initialVisits.find((v: any) => v.bookingReference === 'COLIN-VIS-2026-TEST');
      expect(foundVisit).toBeDefined();
      expect(foundVisit.status).toBe('PENDING_COLIN_REVIEW');
      expect(foundVisit.feePaid).toBe(150);

      // Ambassador completes physical visit -> triggers 12-hour timer
      await React.act(async () => {
        captured.property.markVisitCompletedByVolunteer(
          'VSLOT-842910',
          { id: 'vol-test', name: 'Tanvi Mehra', role: 'Ambassador' },
          'volunteer'
        );
      });

      const updatedVisits = captured.property.visits;
      const targetVisit = updatedVisits.find((v: any) => v.id === 'VSLOT-842910');
      expect(targetVisit?.status).toBe('VISIT_COMPLETED_DECISION_PENDING');
      expect(targetVisit?.decisionDeadline).toBeDefined();

      // Student accepts the room within 12 hours
      await React.act(async () => {
        const result = captured.property.submitStudentDecision('VSLOT-842910', 'accept');
        expect(result.success).toBe(true);
      });

      const finalVisits = captured.property.visits;
      const acceptedVisit = finalVisits.find((v: any) => v.id === 'VSLOT-842910');
      expect(acceptedVisit?.status).toBe('STUDENT_ACCEPTED');
      expect(acceptedVisit?.decisionStatus).toBe('ACCEPTED');
    });
  });
});
