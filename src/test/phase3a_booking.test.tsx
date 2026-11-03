import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { PropertyProvider, useProperties } from '../context/PropertyContext';
import { StudentProvider, useStudent } from '../context/StudentContext';
import { ToastProvider } from '../context/ToastContext';
import { OwnerLayout } from '../components/owner/OwnerLayout';
import { OwnerEnquiriesPage } from '../pages/owner/OwnerEnquiriesPage';
import { OwnerDashboardPage } from '../pages/owner/OwnerDashboardPage';
import { StudentVisitsPage } from '../pages/student/StudentVisitsPage';
import { PROPERTIES } from '../data/mockData';
import {
  VISIT_BOOKING_FEE,
  VISIT_REFUND_AMOUNT,
  DECISION_WINDOW_MS,
} from '../constants/booking';
import { VisitBooking } from '../types';

// Harness component for testing context interactions
const MediatedHarness: React.FC<{
  onReady?: (actions: {
    propertyContext: ReturnType<typeof useProperties>;
    studentContext: ReturnType<typeof useStudent>;
  }) => void;
}> = ({ onReady }) => {
  const propertyContext = useProperties();
  const studentContext = useStudent();

  React.useEffect(() => {
    if (onReady) {
      onReady({ propertyContext, studentContext });
    }
  }, [onReady, propertyContext, studentContext]);

  return (
    <div data-testid="mediated-harness">
      <div data-testid="prop-visits-count">{propertyContext.visits.length}</div>
      <div data-testid="student-visits-count">{studentContext.visits.length}</div>
    </div>
  );
};

const TestProviderWrapper: React.FC<{
  children: React.ReactNode;
  initialRoute?: string;
  initialAuthUser?: { id: string; name: string; email: string; role: 'student' | 'owner'; phone?: string };
}> = ({ children, initialRoute = '/', initialAuthUser }) => {
  if (initialAuthUser) {
    localStorage.setItem('colin_auth_session', JSON.stringify(initialAuthUser));
  }

  return (
    <AuthProvider>
      <PropertyProvider>
        <StudentProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={[initialRoute]}>{children}</MemoryRouter>
          </ToastProvider>
        </StudentProvider>
      </PropertyProvider>
    </AuthProvider>
  );
};

describe('Phase 3A: COLIN-Mediated Booking & 12-Hour Decision System', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Student creates booking request with PENDING_COLIN_REVIEW and unique reference
  // =========================================================================
  it('1. Student creates booking request with PENDING_COLIN_REVIEW status and unique reference', () => {
    let capturedStudentContext: ReturnType<typeof useStudent> | null = null;

    render(
      <TestProviderWrapper
        initialAuthUser={{
          id: 'usr-student-01',
          name: 'Aarav Sharma',
          email: 'aarav@du.ac.in',
          role: 'student',
          phone: '+91 98111 22233',
        }}
      >
        <MediatedHarness
          onReady={({ studentContext }) => {
            capturedStudentContext = studentContext;
          }}
        />
      </TestProviderWrapper>
    );

    expect(capturedStudentContext).not.toBeNull();

    const uniqueRef = `COLIN-VIS-${Date.now()}`;
    const newBooking: VisitBooking = {
      id: `booking-test-${Date.now()}`,
      bookingReference: uniqueRef,
      propertyId: 'prop-1',
      propertyTitle: 'Stanza Living North Campus',
      propertyImage: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5',
      propertyCity: 'Delhi',
      propertyNeighborhood: 'Hudson Lane',
      date: '2026-11-15',
      timeSlot: '11:00 AM - 01:00 PM',
      studentName: 'Aarav Sharma',
      studentPhone: '+91 98111 22233',
      studentAge: 20,
      roomTypeInterested: 'Double Sharing Room',
      status: 'PENDING_COLIN_REVIEW',
      feePaid: VISIT_BOOKING_FEE,
      meetingGuideName: 'Verified COLIN Ambassador (Assigned upon review)',
      meetingGuideContact: 'COLIN Coordination Desk',
      createdAt: '2026-11-03',
    };

    act(() => {
      capturedStudentContext!.bookVisit(newBooking);
    });

    const studentVisits = capturedStudentContext!.visits;
    const added = studentVisits.find((v) => v.bookingReference === uniqueRef);

    expect(added).toBeDefined();
    expect(added?.status).toBe('PENDING_COLIN_REVIEW');
    expect(added?.bookingReference).toBe(uniqueRef);
    expect(added?.feePaid).toBe(150);
  });

  // =========================================================================
  // 2. Owner receives booking request in coordination pipeline
  // =========================================================================
  it('2. Owner receives booking request in coordination pipeline', () => {
    const customVisit: VisitBooking = {
      id: 'visit-coord-test-01',
      bookingReference: 'COLIN-VIS-2026-9901',
      propertyId: 'prop-1',
      propertyTitle: 'Heritage Boys Residency',
      propertyCity: 'Delhi',
      propertyNeighborhood: 'Kamla Nagar',
      date: '2026-11-10',
      timeSlot: '10:00 AM - 12:00 PM',
      studentName: 'Rohan Mehra',
      studentAge: 21,
      roomTypeInterested: 'Single Room',
      status: 'PENDING_COLIN_REVIEW',
      feePaid: 150,
      createdAt: '2026-11-03',
    };
    localStorage.setItem('colin_student_visits', JSON.stringify([customVisit]));

    render(
      <TestProviderWrapper
        initialRoute="/owner/enquiries"
        initialAuthUser={{
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          email: 'rajesh.sharma@colinhomes.com',
          role: 'owner',
        }}
      >
        <Routes>
          <Route path="/owner/*" element={<OwnerLayout />}>
            <Route path="enquiries" element={<OwnerEnquiriesPage />} />
          </Route>
        </Routes>
      </TestProviderWrapper>
    );

    // Verify booking reference appears in owner pipeline
    expect(screen.getByText('COLIN-VIS-2026-9901')).toBeInTheDocument();
    expect(screen.getByText('Heritage Boys Residency')).toBeInTheDocument();
    expect(screen.getByText('Rohan Mehra')).toBeInTheDocument();
  });

  // =========================================================================
  // 3. Owner cannot access student contact information (phone, email, WhatsApp shielded)
  // =========================================================================
  it('3. Owner cannot access student contact information (phone, email, WhatsApp shielded)', () => {
    const sensitiveVisit: VisitBooking = {
      id: 'visit-sensitive-01',
      bookingReference: 'COLIN-VIS-2026-PRIVACY',
      propertyId: 'prop-1',
      propertyTitle: 'Heritage Boys Residency',
      date: '2026-11-10',
      timeSlot: '10:00 AM - 12:00 PM',
      studentName: 'Vikram Malhotra',
      studentPhone: '+91 99999 88888', // Sensitive personal phone
      studentAge: 22,
      roomTypeInterested: 'Double Sharing',
      status: 'PENDING_COLIN_REVIEW',
      feePaid: 150,
      createdAt: '2026-11-03',
    };
    localStorage.setItem('colin_student_visits', JSON.stringify([sensitiveVisit]));

    render(
      <TestProviderWrapper
        initialRoute="/owner/enquiries"
        initialAuthUser={{
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          email: 'rajesh.sharma@colinhomes.com',
          role: 'owner',
        }}
      >
        <Routes>
          <Route path="/owner/*" element={<OwnerLayout />}>
            <Route path="enquiries" element={<OwnerEnquiriesPage />} />
          </Route>
        </Routes>
      </TestProviderWrapper>
    );

    // Personal contact information must NOT be rendered
    expect(screen.queryByText('+91 99999 88888')).not.toBeInTheDocument();
    expect(screen.queryByText(/99999 88888/)).not.toBeInTheDocument();

    // Privacy shield badge / notice must be displayed
    expect(screen.getAllByText(/Zero Direct Contact Policy/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Privacy-Protected/i).length).toBeGreaterThan(0);
  });

  // =========================================================================
  // 4. Owner submits available time to COLIN (AWAITING_COLIN_CONFIRMATION)
  // =========================================================================
  it('4. Owner submits available time to COLIN (AWAITING_COLIN_CONFIRMATION)', () => {
    let capturedPropContext: ReturnType<typeof useProperties> | null = null;
    const testVisit: VisitBooking = {
      id: 'visit-avail-01',
      bookingReference: 'COLIN-VIS-2026-AVAIL',
      propertyId: 'prop-1',
      propertyTitle: 'Heritage Boys Residency',
      date: '2026-11-12',
      timeSlot: '10:00 AM - 12:00 PM',
      studentName: 'Priya Iyer',
      studentAge: 20,
      status: 'AWAITING_OWNER_AVAILABILITY',
      feePaid: 150,
      createdAt: '2026-11-03',
    };
    localStorage.setItem('colin_student_visits', JSON.stringify([testVisit]));

    render(
      <TestProviderWrapper
        initialAuthUser={{
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          email: 'rajesh.sharma@colinhomes.com',
          role: 'owner',
        }}
      >
        <MediatedHarness
          onReady={({ propertyContext }) => {
            capturedPropContext = propertyContext;
          }}
        />
      </TestProviderWrapper>
    );

    expect(capturedPropContext).not.toBeNull();

    act(() => {
      capturedPropContext!.proposeOwnerAvailability('visit-avail-01', {
        date: '2026-11-12',
        timeSlot: '03:00 PM - 05:00 PM',
        isAlternative: true,
        notes: 'Room 204 will be vacant and sanitized by 3 PM.',
        submittedAt: new Date().toISOString(),
      });
    });

    const target = capturedPropContext!.visits.find((v) => v.id === 'visit-avail-01');
    expect(target?.status).toBe('AWAITING_COLIN_CONFIRMATION');
    expect(target?.ownerAvailability?.isAlternative).toBe(true);
    expect(target?.ownerAvailability?.timeSlot).toBe('03:00 PM - 05:00 PM');
    expect(target?.ownerAvailability?.notes).toContain('sanitized by 3 PM');
  });

  // =========================================================================
  // 5. COLIN confirms the visit and assigns volunteer (VISIT_CONFIRMED)
  // =========================================================================
  it('5. COLIN confirms the visit and assigns volunteer (VISIT_CONFIRMED)', () => {
    let capturedPropContext: ReturnType<typeof useProperties> | null = null;
    const testVisit: VisitBooking = {
      id: 'visit-confirm-01',
      bookingReference: 'COLIN-VIS-2026-CONFIRM',
      propertyId: 'prop-1',
      propertyTitle: 'Heritage Boys Residency',
      date: '2026-11-12',
      timeSlot: '03:00 PM - 05:00 PM',
      studentName: 'Priya Iyer',
      studentAge: 20,
      status: 'AWAITING_COLIN_CONFIRMATION',
      feePaid: 150,
      createdAt: '2026-11-03',
    };
    localStorage.setItem('colin_student_visits', JSON.stringify([testVisit]));

    render(
      <TestProviderWrapper
        initialAuthUser={{
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          email: 'rajesh.sharma@colinhomes.com',
          role: 'owner',
        }}
      >
        <MediatedHarness
          onReady={({ propertyContext }) => {
            capturedPropContext = propertyContext;
          }}
        />
      </TestProviderWrapper>
    );

    act(() => {
      capturedPropContext!.confirmVisitByColin('visit-confirm-01', {
        id: 'VOL-771',
        name: 'Neha Kapoor',
        role: 'Verified COLIN Campus Ambassador',
        phone: '+91 98111 55443',
      });
    });

    const target = capturedPropContext!.visits.find((v) => v.id === 'visit-confirm-01');
    expect(target?.status).toBe('VISIT_CONFIRMED');
    expect(target?.assignedVolunteer?.name).toBe('Neha Kapoor');
    expect(target?.assignedVolunteer?.role).toBe('Verified COLIN Campus Ambassador');
    expect(target?.meetingGuideName).toContain('Neha Kapoor');
  });

  // =========================================================================
  // 6. Volunteer marks visit completed (VISIT_COMPLETED_DECISION_PENDING)
  // =========================================================================
  it('6. Volunteer marks visit completed (VISIT_COMPLETED_DECISION_PENDING)', () => {
    let capturedPropContext: ReturnType<typeof useProperties> | null = null;
    const testVisit: VisitBooking = {
      id: 'visit-complete-01',
      bookingReference: 'COLIN-VIS-2026-COMPL',
      propertyId: 'prop-1',
      propertyTitle: 'Heritage Boys Residency',
      date: '2026-11-12',
      timeSlot: '03:00 PM - 05:00 PM',
      studentName: 'Priya Iyer',
      studentAge: 20,
      status: 'VISIT_CONFIRMED',
      assignedVolunteer: {
        id: 'VOL-771',
        name: 'Neha Kapoor',
        role: 'Verified COLIN Campus Ambassador',
        phone: '+91 98111 55443',
      },
      feePaid: 150,
      createdAt: '2026-11-03',
    };
    localStorage.setItem('colin_student_visits', JSON.stringify([testVisit]));

    render(
      <TestProviderWrapper
        initialAuthUser={{
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          email: 'rajesh.sharma@colinhomes.com',
          role: 'owner',
        }}
      >
        <MediatedHarness
          onReady={({ propertyContext }) => {
            capturedPropContext = propertyContext;
          }}
        />
      </TestProviderWrapper>
    );

    act(() => {
      const res = capturedPropContext!.markVisitCompletedByVolunteer(
        'visit-complete-01',
        { id: 'VOL-771', name: 'Neha Kapoor' },
        'volunteer'
      );
      expect(res.success).toBe(true);
    });

    const target = capturedPropContext!.visits.find((v) => v.id === 'visit-complete-01');
    expect(target?.status).toBe('VISIT_COMPLETED_DECISION_PENDING');
    expect(target?.visitCompletedAt).toBeDefined();
    expect(target?.decisionDeadline).toBeDefined();
    expect(target?.decisionStatus).toBe('PENDING');
    expect(target?.completedByVolunteer?.name).toBe('Neha Kapoor');
  });

  // =========================================================================
  // 7. 12-hour countdown starts correctly
  // =========================================================================
  it('7. 12-hour countdown starts correctly and deadline is exactly 12 hours from completion', () => {
    let capturedPropContext: ReturnType<typeof useProperties> | null = null;
    const testVisit: VisitBooking = {
      id: 'visit-timer-01',
      bookingReference: 'COLIN-VIS-2026-TIMER',
      propertyId: 'prop-1',
      propertyTitle: 'Heritage Boys Residency',
      date: '2026-11-12',
      timeSlot: '03:00 PM - 05:00 PM',
      studentName: 'Priya Iyer',
      studentAge: 20,
      status: 'VISIT_CONFIRMED',
      feePaid: 150,
      createdAt: '2026-11-03',
    };
    localStorage.setItem('colin_student_visits', JSON.stringify([testVisit]));

    render(
      <TestProviderWrapper
        initialAuthUser={{
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          email: 'rajesh.sharma@colinhomes.com',
          role: 'owner',
        }}
      >
        <MediatedHarness
          onReady={({ propertyContext }) => {
            capturedPropContext = propertyContext;
          }}
        />
      </TestProviderWrapper>
    );

    const beforeMark = Date.now();
    act(() => {
      capturedPropContext!.markVisitCompletedByVolunteer('visit-timer-01', undefined, 'volunteer');
    });

    const target = capturedPropContext!.visits.find((v) => v.id === 'visit-timer-01')!;
    const completedMs = new Date(target.visitCompletedAt!).getTime();
    const deadlineMs = new Date(target.decisionDeadline!).getTime();

    expect(completedMs).toBeGreaterThanOrEqual(beforeMark - 50);
    // Verification: Deadline must be exactly 12 hours (43,200,000 ms) after completion
    expect(deadlineMs - completedMs).toBe(DECISION_WINDOW_MS);
  });

  // =========================================================================
  // 8. Student accepts within 12 hours (STUDENT_ACCEPTED)
  // =========================================================================
  it('8. Student accepts within 12 hours (STUDENT_ACCEPTED)', () => {
    let capturedStudentContext: ReturnType<typeof useStudent> | null = null;
    const now = new Date();
    const completedStr = now.toISOString();
    const deadlineStr = new Date(now.getTime() + DECISION_WINDOW_MS).toISOString();

    const testVisit: VisitBooking = {
      id: 'visit-accept-01',
      bookingReference: 'COLIN-VIS-2026-ACCEPT',
      propertyId: 'prop-1',
      propertyTitle: 'Heritage Boys Residency',
      date: '2026-11-03',
      timeSlot: '11:00 AM - 01:00 PM',
      studentName: 'Aarav Sharma',
      studentAge: 20,
      status: 'VISIT_COMPLETED_DECISION_PENDING',
      visitCompletedAt: completedStr,
      decisionDeadline: deadlineStr,
      decisionStatus: 'PENDING',
      feePaid: 150,
      createdAt: '2026-11-03',
    };
    localStorage.setItem('colin_student_visits', JSON.stringify([testVisit]));

    render(
      <TestProviderWrapper
        initialAuthUser={{
          id: 'usr-student-01',
          name: 'Aarav Sharma',
          email: 'aarav@du.ac.in',
          role: 'student',
        }}
      >
        <MediatedHarness
          onReady={({ studentContext }) => {
            capturedStudentContext = studentContext;
          }}
        />
      </TestProviderWrapper>
    );

    act(() => {
      const result = capturedStudentContext!.submitStudentDecision('visit-accept-01', 'accept');
      expect(result.success).toBe(true);
      expect(result.refundAmount).toBe(0);
    });

    const updated = capturedStudentContext!.visits.find((v) => v.id === 'visit-accept-01');
    expect(updated?.status).toBe('STUDENT_ACCEPTED');
    expect(updated?.decisionStatus).toBe('ACCEPTED');
    expect(updated?.refundStatus).toBe('RETAINED_ACCEPTED');
  });

  // =========================================================================
  // 9. Student rejects within 12 hours (STUDENT_REJECTED)
  // =========================================================================
  it('9. Student rejects within 12 hours (STUDENT_REJECTED)', () => {
    let capturedStudentContext: ReturnType<typeof useStudent> | null = null;
    const now = new Date();
    const completedStr = now.toISOString();
    const deadlineStr = new Date(now.getTime() + DECISION_WINDOW_MS).toISOString();

    const testVisit: VisitBooking = {
      id: 'visit-reject-01',
      bookingReference: 'COLIN-VIS-2026-REJECT',
      propertyId: 'prop-1',
      propertyTitle: 'Heritage Boys Residency',
      date: '2026-11-03',
      timeSlot: '11:00 AM - 01:00 PM',
      studentName: 'Aarav Sharma',
      studentAge: 20,
      status: 'VISIT_COMPLETED_DECISION_PENDING',
      visitCompletedAt: completedStr,
      decisionDeadline: deadlineStr,
      decisionStatus: 'PENDING',
      feePaid: 150,
      createdAt: '2026-11-03',
    };
    localStorage.setItem('colin_student_visits', JSON.stringify([testVisit]));

    render(
      <TestProviderWrapper
        initialAuthUser={{
          id: 'usr-student-01',
          name: 'Aarav Sharma',
          email: 'aarav@du.ac.in',
          role: 'student',
        }}
      >
        <MediatedHarness
          onReady={({ studentContext }) => {
            capturedStudentContext = studentContext;
          }}
        />
      </TestProviderWrapper>
    );

    act(() => {
      const result = capturedStudentContext!.submitStudentDecision(
        'visit-reject-01',
        'reject',
        'Ventilation and natural light insufficient in Room 102'
      );
      expect(result.success).toBe(true);
      expect(result.refundAmount).toBe(82.5);
    });

    const updated = capturedStudentContext!.visits.find((v) => v.id === 'visit-reject-01');
    expect(updated?.status).toBe('STUDENT_REJECTED');
    expect(updated?.decisionStatus).toBe('REJECTED');
    expect(updated?.rejectionReason).toContain('Ventilation and natural light insufficient');
  });

  // =========================================================================
  // 10. Rejection calculates ₹82.50 refund (55%)
  // =========================================================================
  it('10. Rejection calculates exactly ₹82.50 refund (55% of ₹150 slot fee)', () => {
    let capturedPropContext: ReturnType<typeof useProperties> | null = null;
    const now = new Date();

    const testVisit: VisitBooking = {
      id: 'visit-refund-calc',
      bookingReference: 'COLIN-VIS-2026-REFUND',
      propertyId: 'prop-1',
      propertyTitle: 'Heritage Boys Residency',
      date: '2026-11-03',
      timeSlot: '11:00 AM - 01:00 PM',
      studentName: 'Aarav Sharma',
      studentAge: 20,
      status: 'VISIT_COMPLETED_DECISION_PENDING',
      visitCompletedAt: now.toISOString(),
      decisionDeadline: new Date(now.getTime() + DECISION_WINDOW_MS).toISOString(),
      decisionStatus: 'PENDING',
      feePaid: 150,
      createdAt: '2026-11-03',
    };
    localStorage.setItem('colin_student_visits', JSON.stringify([testVisit]));

    render(
      <TestProviderWrapper
        initialAuthUser={{
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          email: 'rajesh.sharma@colinhomes.com',
          role: 'owner',
        }}
      >
        <MediatedHarness
          onReady={({ propertyContext }) => {
            capturedPropContext = propertyContext;
          }}
        />
      </TestProviderWrapper>
    );

    act(() => {
      const res = capturedPropContext!.submitStudentDecision('visit-refund-calc', 'reject', 'Distance too far');
      expect(res.refundAmount).toBe(VISIT_REFUND_AMOUNT);
      expect(res.refundAmount).toBe(82.5);
    });

    const target = capturedPropContext!.visits.find((v) => v.id === 'visit-refund-calc');
    expect(target?.refundCalculated).toBe(82.5);
    expect(target?.feePaid).toBe(150);
    // Verified 55% return
    expect(target?.refundCalculated).toBe(target!.feePaid * 0.55);
  });

  // =========================================================================
  // 11. Expired decision calculates ₹150 non-refundable
  // =========================================================================
  it('11. Expired decision calculates ₹150 non-refundable (full fee forfeited, ₹0 refunded)', () => {
    let capturedPropContext: ReturnType<typeof useProperties> | null = null;
    // Set completion 13 hours ago (deadline expired 1 hour ago)
    const thirteenHoursAgo = new Date(Date.now() - 13 * 3600 * 1000);
    const expiredDeadline = new Date(thirteenHoursAgo.getTime() + DECISION_WINDOW_MS);

    const expiredVisit: VisitBooking = {
      id: 'visit-expired-test',
      bookingReference: 'COLIN-VIS-2026-EXPIRED',
      propertyId: 'prop-1',
      propertyTitle: 'Heritage Boys Residency',
      date: '2026-11-02',
      timeSlot: '11:00 AM - 01:00 PM',
      studentName: 'Aarav Sharma',
      studentAge: 20,
      status: 'VISIT_COMPLETED_DECISION_PENDING',
      visitCompletedAt: thirteenHoursAgo.toISOString(),
      decisionDeadline: expiredDeadline.toISOString(),
      decisionStatus: 'PENDING',
      feePaid: 150,
      createdAt: '2026-11-02',
    };
    localStorage.setItem('colin_student_visits', JSON.stringify([expiredVisit]));

    render(
      <TestProviderWrapper
        initialAuthUser={{
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          email: 'rajesh.sharma@colinhomes.com',
          role: 'owner',
        }}
      >
        <MediatedHarness
          onReady={({ propertyContext }) => {
            capturedPropContext = propertyContext;
          }}
        />
      </TestProviderWrapper>
    );

    act(() => {
      // Trigger decision expiration scan
      capturedPropContext!.checkAndExpireDecisions();
    });

    const target = capturedPropContext!.visits.find((v) => v.id === 'visit-expired-test');
    expect(target?.status).toBe('DECISION_EXPIRED');
    expect(target?.decisionStatus).toBe('EXPIRED');
    expect(target?.refundCalculated).toBe(0);
    expect(target?.refundStatus).toBe('FORFEITED_FULL');
  });

  // =========================================================================
  // 12. Refreshing page does not reset the timer (deterministic from timestamp)
  // =========================================================================
  it('12. Refreshing page does not reset the timer (deterministic calculation from completion timestamp)', () => {
    // 4 hours have elapsed
    const completedTime = new Date(Date.now() - 4 * 3600 * 1000).toISOString();
    const fixedDeadline = new Date(new Date(completedTime).getTime() + DECISION_WINDOW_MS).toISOString();

    const visitWithTimestamp: VisitBooking = {
      id: 'visit-refresh-test',
      bookingReference: 'COLIN-VIS-2026-PERSIST',
      propertyId: 'prop-1',
      propertyTitle: 'Heritage Boys Residency',
      date: '2026-11-03',
      timeSlot: '10:00 AM - 12:00 PM',
      studentName: 'Aarav Sharma',
      studentAge: 20,
      status: 'VISIT_COMPLETED_DECISION_PENDING',
      visitCompletedAt: completedTime,
      decisionDeadline: fixedDeadline,
      decisionStatus: 'PENDING',
      feePaid: 150,
      createdAt: '2026-11-03',
    };

    localStorage.setItem('colin_student_visits', JSON.stringify([visitWithTimestamp]));

    // First mount
    const { unmount } = render(
      <TestProviderWrapper
        initialRoute="/student/visits"
        initialAuthUser={{
          id: 'usr-student-01',
          name: 'Aarav Sharma',
          email: 'aarav@du.ac.in',
          role: 'student',
        }}
      >
        <StudentVisitsPage />
      </TestProviderWrapper>
    );

    // Verify countdown card is visible and displays ~8 hours left (12 - 4 = 8)
    expect(screen.getByText(/Decision Required: 12-Hour Final Choice/i)).toBeInTheDocument();
    expect(screen.getByText(/07h|08h/i)).toBeInTheDocument();

    // Simulate page unmount / refresh
    unmount();

    // Second mount (simulated browser reload from localStorage)
    render(
      <TestProviderWrapper
        initialRoute="/student/visits"
        initialAuthUser={{
          id: 'usr-student-01',
          name: 'Aarav Sharma',
          email: 'aarav@du.ac.in',
          role: 'student',
        }}
      >
        <StudentVisitsPage />
      </TestProviderWrapper>
    );

    // Verify timer continues deterministically from persisted deadline, not reset to 12h
    expect(screen.getByText(/Decision Required: 12-Hour Final Choice/i)).toBeInTheDocument();
    expect(screen.queryByText(/12h 00m/i)).not.toBeInTheDocument();
  });

  // =========================================================================
  // 13. Duplicate decisions are rejected
  // =========================================================================
  it('13. Duplicate decisions are rejected', () => {
    let capturedStudentContext: ReturnType<typeof useStudent> | null = null;
    const now = new Date();

    const visitForDuplicate: VisitBooking = {
      id: 'visit-duplicate-test',
      bookingReference: 'COLIN-VIS-2026-NODUP',
      propertyId: 'prop-1',
      propertyTitle: 'Heritage Boys Residency',
      date: '2026-11-03',
      timeSlot: '11:00 AM - 01:00 PM',
      studentName: 'Aarav Sharma',
      studentAge: 20,
      status: 'VISIT_COMPLETED_DECISION_PENDING',
      visitCompletedAt: now.toISOString(),
      decisionDeadline: new Date(now.getTime() + DECISION_WINDOW_MS).toISOString(),
      decisionStatus: 'PENDING',
      feePaid: 150,
      createdAt: '2026-11-03',
    };
    localStorage.setItem('colin_student_visits', JSON.stringify([visitForDuplicate]));

    render(
      <TestProviderWrapper
        initialAuthUser={{
          id: 'usr-student-01',
          name: 'Aarav Sharma',
          email: 'aarav@du.ac.in',
          role: 'student',
        }}
      >
        <MediatedHarness
          onReady={({ studentContext }) => {
            capturedStudentContext = studentContext;
          }}
        />
      </TestProviderWrapper>
    );

    // First decision: Accept
    act(() => {
      const res1 = capturedStudentContext!.submitStudentDecision('visit-duplicate-test', 'accept');
      expect(res1.success).toBe(true);
    });

    // Second decision attempt on same visit: Reject
    act(() => {
      const res2 = capturedStudentContext!.submitStudentDecision('visit-duplicate-test', 'reject');
      expect(res2.success).toBe(false);
      expect(res2.message).toContain('already been submitted');
    });

    const target = capturedStudentContext!.visits.find((v) => v.id === 'visit-duplicate-test');
    // Status must remain ACCEPTED, not overwritten
    expect(target?.status).toBe('STUDENT_ACCEPTED');
  });

  // =========================================================================
  // 14. Unauthorized users cannot mark visits completed (only volunteer/coordinator)
  // =========================================================================
  it('14. Unauthorized users cannot mark visits completed (only volunteer/coordinator)', () => {
    let capturedPropContext: ReturnType<typeof useProperties> | null = null;

    const uncompletedVisit: VisitBooking = {
      id: 'visit-unauth-test',
      bookingReference: 'COLIN-VIS-2026-AUTH',
      propertyId: 'prop-1',
      propertyTitle: 'Heritage Boys Residency',
      date: '2026-11-05',
      timeSlot: '10:00 AM - 12:00 PM',
      studentName: 'Aarav Sharma',
      studentAge: 20,
      status: 'VISIT_CONFIRMED',
      feePaid: 150,
      createdAt: '2026-11-03',
    };
    localStorage.setItem('colin_student_visits', JSON.stringify([uncompletedVisit]));

    render(
      <TestProviderWrapper
        initialAuthUser={{
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          email: 'rajesh.sharma@colinhomes.com',
          role: 'owner',
        }}
      >
        <MediatedHarness
          onReady={({ propertyContext }) => {
            capturedPropContext = propertyContext;
          }}
        />
      </TestProviderWrapper>
    );

    // 1. Owner attempt to mark completed: Must fail!
    act(() => {
      const ownerAttempt = capturedPropContext!.markVisitCompletedByVolunteer(
        'visit-unauth-test',
        undefined,
        'owner'
      );
      expect(ownerAttempt.success).toBe(false);
      expect(ownerAttempt.message).toContain('Unauthorized');
    });

    let target = capturedPropContext!.visits.find((v) => v.id === 'visit-unauth-test');
    expect(target?.status).toBe('VISIT_CONFIRMED');

    // 2. Student attempt to mark completed: Must fail!
    act(() => {
      const studentAttempt = capturedPropContext!.markVisitCompletedByVolunteer(
        'visit-unauth-test',
        undefined,
        'student'
      );
      expect(studentAttempt.success).toBe(false);
      expect(studentAttempt.message).toContain('Unauthorized');
    });

    target = capturedPropContext!.visits.find((v) => v.id === 'visit-unauth-test');
    expect(target?.status).toBe('VISIT_CONFIRMED');

    // 3. Verified volunteer attempt: Must succeed!
    act(() => {
      const volunteerAttempt = capturedPropContext!.markVisitCompletedByVolunteer(
        'visit-unauth-test',
        { id: 'VOL-99', name: 'Authorized Ambassador' },
        'volunteer'
      );
      expect(volunteerAttempt.success).toBe(true);
    });

    target = capturedPropContext!.visits.find((v) => v.id === 'visit-unauth-test');
    expect(target?.status).toBe('VISIT_COMPLETED_DECISION_PENDING');
  });

  // =========================================================================
  // 15. Owner and student dashboards show consistent booking status
  // =========================================================================
  it('15. Owner and student dashboards show consistent booking status', () => {
    const sharedVisit: VisitBooking = {
      id: 'visit-cross-portal',
      bookingReference: 'COLIN-VIS-SYNC-99',
      propertyId: 'prop-1',
      propertyTitle: 'Stanza Living North Campus',
      propertyCity: 'Delhi',
      propertyNeighborhood: 'Hudson Lane',
      date: '2026-11-18',
      timeSlot: '03:00 PM - 05:00 PM',
      studentName: 'Aarav Sharma',
      studentAge: 20,
      roomTypeInterested: 'Double Sharing Room',
      status: 'AWAITING_OWNER_AVAILABILITY',
      feePaid: 150,
      createdAt: '2026-11-03',
    };
    localStorage.setItem('colin_student_visits', JSON.stringify([sharedVisit]));

    // Render Owner Dashboard
    const { unmount: unmountOwner } = render(
      <TestProviderWrapper
        initialRoute="/owner/dashboard"
        initialAuthUser={{
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          email: 'rajesh.sharma@colinhomes.com',
          role: 'owner',
        }}
      >
        <Routes>
          <Route path="/owner/*" element={<OwnerLayout />}>
            <Route path="dashboard" element={<OwnerDashboardPage />} />
          </Route>
        </Routes>
      </TestProviderWrapper>
    );

    // Verify Owner Dashboard shows the enquiry/visit request
    expect(screen.getByText(/COLIN-VIS-SYNC-99/i)).toBeInTheDocument();
    unmountOwner();

    // Render Student Visits
    render(
      <TestProviderWrapper
        initialRoute="/student/visits"
        initialAuthUser={{
          id: 'usr-student-01',
          name: 'Aarav Sharma',
          email: 'aarav@du.ac.in',
          role: 'student',
        }}
      >
        <StudentVisitsPage />
      </TestProviderWrapper>
    );

    // Verify Student portal displays the same reference and status
    expect(screen.getByText(/COLIN-VIS-SYNC-99/i)).toBeInTheDocument();
    expect(screen.getByText(/Awaiting Host Availability/i)).toBeInTheDocument();
  });

  // =========================================================================
  // 16. Notifications are generated at correct intervals
  // =========================================================================
  it('16. Notifications are generated at correct intervals (Immediate, 3h, 6h, 9h, 11h, 11h45m, 12h)', () => {
    let capturedPropContext: ReturnType<typeof useProperties> | null = null;
    // Set completed 11 hours and 50 minutes ago (should have milestones: immediately, 3h, 6h, 9h, 11h, 11h45m)
    const elapsedMs = (11 * 60 + 50) * 60 * 1000;
    const completedTime = new Date(Date.now() - elapsedMs).toISOString();

    const visitForNotifications: VisitBooking = {
      id: 'visit-notif-schedule',
      bookingReference: 'COLIN-VIS-2026-NOTIF',
      propertyId: 'prop-1',
      propertyTitle: 'Heritage Boys Residency',
      date: '2026-11-03',
      timeSlot: '11:00 AM - 01:00 PM',
      studentName: 'Aarav Sharma',
      studentAge: 20,
      status: 'VISIT_COMPLETED_DECISION_PENDING',
      visitCompletedAt: completedTime,
      decisionDeadline: new Date(new Date(completedTime).getTime() + DECISION_WINDOW_MS).toISOString(),
      decisionStatus: 'PENDING',
      feePaid: 150,
      notificationsSent: [
        {
          id: 'notif-initial',
          milestone: 'immediately',
          message: 'Your visit is complete. Please make your decision within 12 hours.',
          timestamp: completedTime,
        },
      ],
      createdAt: '2026-11-03',
    };
    localStorage.setItem('colin_student_visits', JSON.stringify([visitForNotifications]));

    render(
      <TestProviderWrapper
        initialAuthUser={{
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          email: 'rajesh.sharma@colinhomes.com',
          role: 'owner',
        }}
      >
        <MediatedHarness
          onReady={({ propertyContext }) => {
            capturedPropContext = propertyContext;
          }}
        />
      </TestProviderWrapper>
    );

    act(() => {
      capturedPropContext!.checkAndExpireDecisions();
    });

    const target = capturedPropContext!.visits.find((v) => v.id === 'visit-notif-schedule');
    const sentMilestones = target?.notificationsSent?.map((n) => n.milestone) || [];

    // Verify all milestones through 11h45m have been captured
    expect(sentMilestones).toContain('immediately');
    expect(sentMilestones).toContain('3h');
    expect(sentMilestones).toContain('6h');
    expect(sentMilestones).toContain('9h');
    expect(sentMilestones).toContain('11h');
    expect(sentMilestones).toContain('11h45m');
  });

  // =========================================================================
  // 17. Duplicate notifications are prevented
  // =========================================================================
  it('17. Duplicate notifications are prevented', () => {
    let capturedPropContext: ReturnType<typeof useProperties> | null = null;
    const elapsedMs = 4 * 3600 * 1000; // 4 hours elapsed
    const completedTime = new Date(Date.now() - elapsedMs).toISOString();

    const visitForDedup: VisitBooking = {
      id: 'visit-notif-dedup',
      bookingReference: 'COLIN-VIS-2026-DEDUP',
      propertyId: 'prop-1',
      propertyTitle: 'Heritage Boys Residency',
      date: '2026-11-03',
      timeSlot: '11:00 AM - 01:00 PM',
      studentName: 'Aarav Sharma',
      studentAge: 20,
      status: 'VISIT_COMPLETED_DECISION_PENDING',
      visitCompletedAt: completedTime,
      decisionDeadline: new Date(new Date(completedTime).getTime() + DECISION_WINDOW_MS).toISOString(),
      decisionStatus: 'PENDING',
      feePaid: 150,
      notificationsSent: [
        {
          id: 'notif-1',
          milestone: 'immediately',
          message: 'Initial visit completed',
          timestamp: completedTime,
        },
        {
          id: 'notif-2',
          milestone: '3h',
          message: '3h reminder',
          timestamp: new Date(new Date(completedTime).getTime() + 3 * 3600 * 1000).toISOString(),
        },
      ],
      createdAt: '2026-11-03',
    };
    localStorage.setItem('colin_student_visits', JSON.stringify([visitForDedup]));

    render(
      <TestProviderWrapper
        initialAuthUser={{
          id: 'usr-owner-01',
          name: 'Col. Rajesh Sharma',
          email: 'rajesh.sharma@colinhomes.com',
          role: 'owner',
        }}
      >
        <MediatedHarness
          onReady={({ propertyContext }) => {
            capturedPropContext = propertyContext;
          }}
        />
      </TestProviderWrapper>
    );

    // Call checkAndExpireDecisions multiple times in succession
    act(() => {
      capturedPropContext!.checkAndExpireDecisions();
      capturedPropContext!.checkAndExpireDecisions();
      capturedPropContext!.checkAndExpireDecisions();
    });

    const target = capturedPropContext!.visits.find((v) => v.id === 'visit-notif-dedup');
    const threeHourNotifs = target?.notificationsSent?.filter((n) => n.milestone === '3h') || [];

    // Exactly one 3h notification must exist, duplicates strictly blocked
    expect(threeHourNotifs.length).toBe(1);
  });

  // =========================================================================
  // 18. Existing Phase 2 booking functionality does not regress
  // =========================================================================
  it('18. Existing Phase 2 booking functionality does not regress (fee, refund policy, and modal creation)', () => {
    let capturedStudentContext: ReturnType<typeof useStudent> | null = null;
    const testProp = PROPERTIES[0];

    render(
      <TestProviderWrapper
        initialAuthUser={{
          id: 'usr-student-01',
          name: 'Aarav Sharma',
          email: 'aarav@du.ac.in',
          role: 'student',
        }}
      >
        <MediatedHarness
          onReady={({ studentContext }) => {
            capturedStudentContext = studentContext;
          }}
        />
      </TestProviderWrapper>
    );

    // Test Phase 2 cancelVisit calculation
    const initialVisit: VisitBooking = {
      id: 'visit-phase2-regress',
      bookingReference: 'COLIN-VIS-PHASE2',
      propertyId: testProp.id,
      propertyTitle: testProp.title,
      propertyCity: testProp.city,
      propertyNeighborhood: testProp.neighborhood,
      date: '2026-11-20',
      timeSlot: '10:00 AM - 12:00 PM',
      studentName: 'Aarav Sharma',
      studentAge: 20,
      status: 'Confirmed',
      feePaid: 150,
      createdAt: '2026-11-03',
    };

    act(() => {
      capturedStudentContext!.bookVisit(initialVisit);
    });

    // Test rejection under Phase 2 outcome reason: 55% refund guarantee
    act(() => {
      const cancelRes = capturedStudentContext!.cancelVisit('visit-phase2-regress', 'visited_rejected');
      expect(cancelRes.success).toBe(true);
      expect(cancelRes.refundAmount).toBe(82.5);
      expect(cancelRes.isEligible).toBe(true);
    });

    const target = capturedStudentContext!.visits.find((v) => v.id === 'visit-phase2-regress');
    expect(target?.refundedAmount).toBe(82.5);
    expect(target?.status).toBe('Visited - Rejected');
  });
});
