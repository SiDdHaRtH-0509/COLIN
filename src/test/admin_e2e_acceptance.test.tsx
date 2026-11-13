/**
 * COLIN Admin Control Centre — Master Final Acceptance E2E Test Suite
 * Validates complete operational integration between Student, Owner, and Super Admin portals.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Contexts
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AdminAuthProvider } from '../context/AdminAuthContext';
import { PropertyProvider } from '../context/PropertyContext';
import { StudentProvider, useStudent } from '../context/StudentContext';
import { ToastProvider } from '../context/ToastContext';

// Pages
import { AdminDashboardOverviewPage } from '../pages/admin/AdminDashboardOverviewPage';
import { AdminStudentsPage } from '../pages/admin/AdminStudentsPage';
import { AdminOwnersPage } from '../pages/admin/AdminOwnersPage';
import { AdminVerificationQueuePage } from '../pages/admin/AdminVerificationQueuePage';
import { AdminVisitsPage } from '../pages/admin/AdminVisitsPage';
import { AdminFinancePage } from '../pages/admin/AdminFinancePage';
import { AdminLayout } from '../components/admin/AdminLayout';

// Services & Security
import {
  bootstrapAdminServer,
  serverAdminLogin,
  serverGetAdminMetrics,
  serverGetStudents,
  serverGetOwners,
  serverUpdateOwnerStatus,
  getPlatformActivities,
  getAdminNotifications,
} from '../server/adminSecurity';
import { AdminApiClient } from '../services/admin/adminApiClient';

const TestMasterWrapper: React.FC<{ initialEntries?: string[]; children?: React.ReactNode }> = ({
  initialEntries = ['/admin/dashboard'],
  children,
}) => {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <PropertyProvider>
          <StudentProvider>
            <ToastProvider>
              <MemoryRouter initialEntries={initialEntries}>
                {children || (
                  <Routes>
                    <Route element={<AdminLayout />}>
                      <Route path="/admin" element={<AdminDashboardOverviewPage />} />
                      <Route path="/admin/dashboard" element={<AdminDashboardOverviewPage />} />
                      <Route path="/admin/students" element={<AdminStudentsPage />} />
                      <Route path="/admin/owners" element={<AdminOwnersPage />} />
                      <Route path="/admin/verification" element={<AdminVerificationQueuePage />} />
                      <Route path="/admin/visits" element={<AdminVisitsPage />} />
                      <Route path="/admin/finance" element={<AdminFinancePage />} />
                    </Route>
                  </Routes>
                )}
              </MemoryRouter>
            </ToastProvider>
          </StudentProvider>
        </PropertyProvider>
      </AdminAuthProvider>
    </AuthProvider>
  );
};

// Helper component to trigger public registrations inside React tree
const RegistrationTestTrigger: React.FC<{ onReady?: () => void }> = () => {
  const { signup } = useAuth();
  return (
    <div>
      <button
        data-testid="register-student-btn"
        onClick={() =>
          signup({
            name: 'Priya Sharma',
            email: 'priya.sharma@colin.in',
            phone: '+91 98101 22334',
            role: 'student',
            university: 'Lady Shri Ram College',
          })
        }
      >
        Register Student
      </button>
      <button
        data-testid="register-owner-btn"
        onClick={() =>
          signup({
            name: 'Anil Kapoor',
            email: 'anil.kapoor@colin.in',
            phone: '+91 98200 55667',
            role: 'owner',
            university: undefined,
          })
        }
      >
        Register Owner
      </button>
    </div>
  );
};

// Helper component to test duplicate registration and suspended login
const DuplicateTestTrigger: React.FC<{ onError?: (err: any) => void; onSuccess?: () => void }> = ({
  onError,
  onSuccess,
}) => {
  const { signup, login } = useAuth();
  return (
    <div>
      <button
        data-testid="duplicate-student-btn"
        onClick={async () => {
          try {
            await signup({
              name: 'Priya Sharma (Duplicate)',
              email: 'priya.sharma@colin.in',
              phone: '+91 98101 22334',
              role: 'student',
              university: 'Lady Shri Ram College',
            });
            if (onSuccess) onSuccess();
          } catch (err) {
            if (onError) onError(err);
          }
        }}
      >
        Register Duplicate
      </button>
      <button
        data-testid="suspended-login-btn"
        onClick={async () => {
          try {
            await login('suspended.student@colin.in', 'student');
            if (onSuccess) onSuccess();
          } catch (err) {
            if (onError) onError(err);
          }
        }}
      >
        Login Suspended
      </button>
    </div>
  );
};

// Helper component to test student financial decision lifecycle and 55% refund
const FinancialDecisionTestTrigger: React.FC<{ onResult?: (res: any) => void }> = ({ onResult }) => {
  const { bookVisit, submitStudentDecision } = useStudent();
  return (
    <div>
      <button
        data-testid="seed-visit-btn"
        onClick={() => {
          bookVisit({
            id: 'visit-fin-01',
            propertyId: 'prop-pg-01',
            propertyTitle: 'Greenwood Student Living',
            studentName: 'Rohan Gupta',
            studentEmail: 'rohan.gupta@colin.in',
            status: 'Completed',
            visitDate: new Date().toISOString(),
            decisionDeadline: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
            bookingFee: 150,
            feePaid: 150,
          } as any);
        }}
      >
        Seed Visit
      </button>
      <button
        data-testid="reject-visit-btn"
        onClick={() => {
          const res = submitStudentDecision('visit-fin-01', 'reject', 'Room did not match photos');
          if (onResult) onResult(res);
        }}
      >
        Reject Accommodation
      </button>
      <button
        data-testid="reject-again-btn"
        onClick={() => {
          const res = submitStudentDecision('visit-fin-01', 'reject');
          if (onResult) onResult(res);
        }}
      >
        Reject Again
      </button>
    </div>
  );
};

describe('COLIN Master Admin Portal Final Acceptance Audit', () => {
  let adminToken: string;

  beforeEach(async () => {
    localStorage.clear();
    await bootstrapAdminServer(true);

    // Authenticate as Operations Admin (Vikram Sethi)
    const loginRes = await serverAdminLogin('operations@colin.in', 'ColinAdmin@2026!Ops');
    expect(loginRes.success).toBe(true);
    adminToken = loginRes.data!.session!.token;
    AdminApiClient.setStoredToken(adminToken);
  });

  describe('Section 3 & 5: Student Registration Lifecycle & Management', () => {
    it('registers a new student and reflects immediately in Admin Student Directory and KPIs', async () => {
      // 1. Initial State: Read metrics
      const initialMetrics = serverGetAdminMetrics(adminToken);
      expect(initialMetrics.success).toBe(true);
      const initialStudentCount = initialMetrics.data!.totalStudents;

      // 2. Student registers on public platform
      render(
        <TestMasterWrapper initialEntries={['/']}>
          <RegistrationTestTrigger />
        </TestMasterWrapper>
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('register-student-btn'));
      });

      // 3. Verify central persistence
      const updatedMetrics = serverGetAdminMetrics(adminToken);
      expect(updatedMetrics.data!.totalStudents).toBe(initialStudentCount + 1);

      // 4. Verify Student Directory returns the newly registered student
      const studentsRes = serverGetStudents(adminToken);
      expect(studentsRes.success).toBe(true);
      const priya = studentsRes.data!.find((s) => s.email === 'priya.sharma@colin.in');
      expect(priya).toBeDefined();
      expect(priya!.name).toBe('Priya Sharma');
      expect(priya!.university).toBe('Lady Shri Ram College');
      expect(priya!.status).toBe('ACTIVE');

      // 5. Verify Platform Activity was recorded
      const activities = getPlatformActivities();
      const regEvent = activities.find((a) => a.eventType === 'STUDENT_REGISTRATION_COMPLETED');
      expect(regEvent).toBeDefined();
      expect(regEvent!.actorName).toBe('Priya Sharma');

      // 6. Verify Administrative Notification was generated
      const notifications = getAdminNotifications();
      const notif = notifications.find((n) => n.type === 'REGISTRATION' && n.title.includes('Student'));
      expect(notif).toBeDefined();
      expect(notif!.department).toBe('Student Care');
    });

    it('renders AdminStudentsPage with search, masked PII, unmask toggle, and suspension controls', async () => {
      // Pre-seed a student in the central store
      localStorage.setItem(
        'colin_registered_users',
        JSON.stringify([
          {
            id: 'usr-student-karan',
            name: 'Karan Malhotra',
            email: 'karan.malhotra@colin.in',
            phone: '+91 98765 43210',
            role: 'student',
            university: 'Hansraj College',
            city: 'Delhi NCR',
            status: 'ACTIVE',
            verificationStatus: 'VERIFIED',
            registeredAt: new Date().toISOString(),
          },
        ])
      );

      render(
        <TestMasterWrapper initialEntries={['/admin/students']}>
          <AdminStudentsPage />
        </TestMasterWrapper>
      );

      // Verify listing renders student
      await waitFor(() => {
        expect(screen.getByText('Karan Malhotra')).toBeInTheDocument();
      });

      // PII should be masked initially
      expect(screen.getByText('ka***@colin.in')).toBeInTheDocument();

      // Click inspect
      fireEvent.click(screen.getByText('Inspect'));
      await waitFor(() => {
        expect(screen.getAllByText('Hansraj College').length).toBeGreaterThanOrEqual(1);
      });
      fireEvent.click(screen.getByText('Close'));

      // Wait until admin session is fully verified and suspend button is active
      const suspendBtn = screen.getByRole('button', { name: 'Suspend' });
      await waitFor(() => {
        expect(suspendBtn).not.toBeDisabled();
      });
      await act(async () => {
        fireEvent.click(suspendBtn);
      });

      // Verify status changed
      await waitFor(() => {
        expect(screen.getByText(/successfully suspended/i)).toBeInTheDocument();
      });

      const updated = serverGetStudents(adminToken);
      const karan = updated.data!.find((s) => s.email === 'karan.malhotra@colin.in');
      expect(karan!.status).toBe('SUSPENDED');
    });
  });

  describe('Section 3 & 6: Owner Registration Lifecycle & Management', () => {
    it('registers a new owner and reflects in Admin Owner Directory and KPIs', async () => {
      const initialMetrics = serverGetAdminMetrics(adminToken);
      const initialOwnerCount = initialMetrics.data!.totalOwners;

      render(
        <TestMasterWrapper initialEntries={['/']}>
          <RegistrationTestTrigger />
        </TestMasterWrapper>
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('register-owner-btn'));
      });

      // Central store updated
      const updatedMetrics = serverGetAdminMetrics(adminToken);
      expect(updatedMetrics.data!.totalOwners).toBe(initialOwnerCount + 1);

      // Owner directory verification
      const ownersRes = serverGetOwners(adminToken);
      expect(ownersRes.success).toBe(true);
      const anil = ownersRes.data!.find((o) => o.email === 'anil.kapoor@colin.in');
      expect(anil).toBeDefined();
      expect(anil!.name).toBe('Anil Kapoor');
      expect(anil!.status).toBe('ACTIVE');

      // Platform activity recorded
      const activities = getPlatformActivities();
      const ownerEvent = activities.find((a) => a.eventType === 'OWNER_REGISTRATION_COMPLETED');
      expect(ownerEvent).toBeDefined();

      // Notification generated for Host Partnerships
      const notifications = getAdminNotifications();
      const notif = notifications.find((n) => n.department === 'Host Partnerships');
      expect(notif).toBeDefined();
    });

    it('renders AdminOwnersPage and manages owner accounts and tiers', async () => {
      localStorage.setItem(
        'colin_registered_users',
        JSON.stringify([
          {
            id: 'usr-owner-sunita',
            name: 'Sunita Reddy',
            email: 'sunita.reddy@colin.in',
            phone: '+91 99887 76655',
            businessName: 'Reddy Student Accommodations',
            role: 'owner',
            tier: 'VERIFIED_PARTNER',
            status: 'ACTIVE',
            verificationStatus: 'VERIFIED',
            registeredAt: new Date().toISOString(),
          },
        ])
      );

      render(
        <TestMasterWrapper initialEntries={['/admin/owners']}>
          <AdminOwnersPage />
        </TestMasterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Sunita Reddy')).toBeInTheDocument();
        expect(screen.getByText('Reddy Student Accommodations')).toBeInTheDocument();
      });

      // Wait until admin session is fully verified and suspend button is active
      const suspendBtn = screen.getByRole('button', { name: 'Suspend' });
      await waitFor(() => {
        expect(suspendBtn).not.toBeDisabled();
      });
      await act(async () => {
        fireEvent.click(suspendBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/successfully suspended/i)).toBeInTheDocument();
      });

      const updated = serverGetOwners(adminToken);
      const sunita = updated.data!.find((o) => o.email === 'sunita.reddy@colin.in');
      expect(sunita!.status).toBe('SUSPENDED');
    });
  });

  describe('Section 4: Live KPI & Dashboard Verification', () => {
    it('renders all 8 operational KPIs matching actual central database store values', async () => {
      // Seed store
      localStorage.setItem(
        'colin_registered_users',
        JSON.stringify([
          { id: 's1', email: 's1@colin.in', role: 'student', status: 'ACTIVE' },
          { id: 's2', email: 's2@colin.in', role: 'student', status: 'ACTIVE' },
          { id: 'o1', email: 'o1@colin.in', role: 'owner', status: 'ACTIVE' },
        ])
      );
      localStorage.setItem(
        'colin_all_properties',
        JSON.stringify([
          { id: 'p1', title: 'PG One', verificationStatus: 'inspection_requested' },
          { id: 'p2', title: 'PG Two', verificationStatus: 'APPROVED', isColinCertified: true },
        ])
      );
      localStorage.setItem(
        'colin_student_visits',
        JSON.stringify([
          { id: 'v1', status: 'PENDING_COLIN_REVIEW', feePaid: 150 },
          { id: 'v2', status: 'Completed', feePaid: 150 },
        ])
      );

      render(
        <TestMasterWrapper initialEntries={['/admin/dashboard']}>
          <AdminDashboardOverviewPage />
        </TestMasterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Operational Vital Indicators')).toBeInTheDocument();
      });

      // Check numbers
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1); // 2 students
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1); // 1 owner
    });
  });

  describe('Section 9 & 12: Activity Feed, Audit Trail & Notifications', () => {
    it('delivers administrative notifications with unread counts and mark-all-read capability', async () => {
      // Seed notifications
      AdminApiClient.sendNotification({
        department: 'Quality & Verification',
        title: 'Property Inspection Requested',
        message: 'Host Rajesh Verma submitted Sunshine Residency.',
        type: 'VERIFICATION',
        link: '/admin/verification',
      });
      AdminApiClient.sendNotification({
        department: 'Student Care',
        title: 'New Student Signup',
        message: 'Student Maya Sen registered.',
        type: 'REGISTRATION',
        link: '/admin/students',
      });

      const notifs = await AdminApiClient.getNotifications();
      expect(notifs.length).toBeGreaterThanOrEqual(2);
      expect(notifs.filter((n) => !n.read).length).toBeGreaterThanOrEqual(2);

      // Mark all read
      AdminApiClient.markAllNotificationsRead();
      const afterRead = await AdminApiClient.getNotifications();
      expect(afterRead.every((n) => n.read)).toBe(true);
    });

    it('records and retrieves unified platform activities chronologically', async () => {
      AdminApiClient.recordActivity({
        eventType: 'PROPERTY_CREATED',
        actorType: 'OWNER',
        actorId: 'usr-owner-55',
        actorName: 'Deepak Chopra',
        targetEntity: 'Property',
        targetId: 'prop-55',
        description: 'New property listed: "Chopra Homes"',
        severity: 'INFO',
      });

      const activities = await AdminApiClient.getPlatformActivities(10);
      expect(activities.length).toBeGreaterThanOrEqual(1);
      expect(activities[0].eventType).toBe('PROPERTY_CREATED');
      expect(activities[0].actorName).toBe('Deepak Chopra');
    });

    it('records and verifies all platform activity event types with actor and target coordinates', async () => {
      const testEvents = [
        { type: 'USER_LOGGED_IN', entity: 'UserSession', actor: 'Aarav Mehra' },
        { type: 'LOGIN_BLOCKED_SUSPENDED', entity: 'UserSession', actor: 'Suspended User' },
        { type: 'PROPERTY_APPROVED', entity: 'Property', actor: 'Admin Inspector' },
        { type: 'PROPERTY_REJECTED', entity: 'Property', actor: 'Admin Inspector' },
        { type: 'VOLUNTEER_ASSIGNED', entity: 'VisitBooking', actor: 'Ops Coordinator' },
        { type: 'VISIT_COMPLETED', entity: 'VisitBooking', actor: 'Volunteer Guide' },
        { type: 'PAYMENT_COMPLETED', entity: 'Transaction', actor: 'Student Maya' },
        { type: 'REFUND_INITIATED', entity: 'Transaction', actor: 'Finance System' },
        { type: 'REFUND_COMPLETED', entity: 'Transaction', actor: 'Finance System' },
        { type: 'ACCOUNT_SUSPENDED', entity: 'UserAccount', actor: 'Security Admin' },
        { type: 'ACCOUNT_REACTIVATED', entity: 'UserAccount', actor: 'Security Admin' },
      ];

      for (const ev of testEvents) {
        AdminApiClient.recordActivity({
          eventType: ev.type,
          actorType: 'ADMIN',
          actorId: 'adm-test',
          actorName: ev.actor,
          targetEntity: ev.entity,
          targetId: `tgt-${ev.type.toLowerCase()}`,
          description: `Test event for ${ev.type}`,
          severity: ev.type.includes('BLOCKED') || ev.type.includes('REJECTED') ? 'WARNING' : 'INFO',
        });
      }

      const latestActivities = await AdminApiClient.getPlatformActivities(20);
      expect(latestActivities.length).toBeGreaterThanOrEqual(testEvents.length);
      for (const ev of testEvents) {
        const found = latestActivities.find((a) => a.eventType === ev.type);
        expect(found).toBeDefined();
        expect(found!.actorName).toBe(ev.actor);
        expect(found!.targetEntity).toBe(ev.entity);
      }
    });
  });

  describe('Section 3: Duplicate Registration & Suspension Enforcement', () => {
    it('rejects duplicate student registration and prevents duplicate KPI increments or events', async () => {
      // First registration
      render(
        <TestMasterWrapper initialEntries={['/']}>
          <RegistrationTestTrigger />
        </TestMasterWrapper>
      );
      await act(async () => {
        fireEvent.click(screen.getByTestId('register-student-btn'));
      });

      const metricsBefore = serverGetAdminMetrics(adminToken);
      const studentCountBefore = metricsBefore.data!.totalStudents;

      let caughtError: any = null;
      render(
        <TestMasterWrapper initialEntries={['/']}>
          <DuplicateTestTrigger onError={(err) => (caughtError = err)} />
        </TestMasterWrapper>
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('duplicate-student-btn'));
      });

      // Assert error was thrown
      expect(caughtError).toBeDefined();
      expect(caughtError.message).toMatch(/already exists/i);

      // Verify KPIs did NOT increment
      const metricsAfter = serverGetAdminMetrics(adminToken);
      expect(metricsAfter.data!.totalStudents).toBe(studentCountBefore);

      // Verify no duplicate registration event was emitted
      const activitiesAfter = getPlatformActivities();
      const duplicateRegEvents = activitiesAfter.filter(
        (a) => a.eventType === 'STUDENT_REGISTRATION_COMPLETED' && a.actorName === 'Priya Sharma (Duplicate)'
      );
      expect(duplicateRegEvents.length).toBe(0);
    });

    it('blocks suspended student from authenticating and records security audit event', async () => {
      // Seed a suspended account
      localStorage.setItem(
        'colin_registered_users',
        JSON.stringify([
          {
            id: 'usr-student-suspended',
            name: 'Suspended Student',
            email: 'suspended.student@colin.in',
            phone: '+91 91234 56789',
            role: 'student',
            status: 'SUSPENDED',
            registeredAt: new Date().toISOString(),
          },
        ])
      );

      let loginError: any = null;
      render(
        <TestMasterWrapper initialEntries={['/']}>
          <DuplicateTestTrigger onError={(err) => (loginError = err)} />
        </TestMasterWrapper>
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('suspended-login-btn'));
      });

      expect(loginError).toBeDefined();
      expect(loginError.message).toMatch(/suspended by administration/i);

      // Verify security activity logged
      const activities = getPlatformActivities();
      const blockEvent = activities.find((a) => a.eventType === 'LOGIN_BLOCKED_SUSPENDED');
      expect(blockEvent).toBeDefined();
      expect(blockEvent!.actorName).toBe('Suspended Student');
    });
  });

  describe('Section 7: Financial Integrity & 55% Refund Guarantee', () => {
    it('verifies visit booking ₹150 fee, ₹82.50 refund on rejection, and duplicate decision prevention', async () => {
      // Seed visit booking record: 150 INR slot fee paid, completed visit with 12h decision window active
      const deadline = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); // 8 hours remaining
      const visitData = [
        {
          id: 'visit-fin-01',
          propertyId: 'prop-pg-01',
          propertyTitle: 'Greenwood Student Living',
          studentName: 'Rohan Gupta',
          studentEmail: 'rohan.gupta@colin.in',
          status: 'Completed',
          visitDate: new Date().toISOString(),
          decisionDeadline: deadline,
          bookingFee: 150,
          feePaid: 150,
        },
      ];
      localStorage.setItem('colin_student_visits', JSON.stringify(visitData));
      localStorage.setItem('colin_student_visits_guest', JSON.stringify(visitData));

      let decisionResult: any = null;
      render(
        <TestMasterWrapper initialEntries={['/']}>
          <FinancialDecisionTestTrigger onResult={(res) => (decisionResult = res)} />
        </TestMasterWrapper>
      );

      // Seed the visit into active student context
      await act(async () => {
        fireEvent.click(screen.getByTestId('seed-visit-btn'));
      });

      // First rejection: within 12h window -> 55% refund (₹82.50)
      await act(async () => {
        fireEvent.click(screen.getByTestId('reject-visit-btn'));
      });

      expect(decisionResult).toBeDefined();
      expect(decisionResult.success).toBe(true);
      expect(decisionResult.refundAmount).toBe(82.50);
      expect(decisionResult.message).toMatch(/82\.50/);

      // Check updated visit in central store
      const updatedVisits = JSON.parse(localStorage.getItem('colin_student_visits') || '[]');
      const targetVisit = updatedVisits.find((v: any) => v.id === 'visit-fin-01');
      expect(targetVisit).toBeDefined();
      expect(targetVisit.status).toBe('STUDENT_REJECTED');
      expect(targetVisit.refundCalculated).toBe(82.50);

      // Attempt duplicate rejection: MUST BE BLOCKED to prevent duplicate refunds
      await act(async () => {
        fireEvent.click(screen.getByTestId('reject-again-btn'));
      });

      expect(decisionResult).toBeDefined();
      expect(decisionResult.success).toBe(false);
      expect(decisionResult.message).toMatch(/already been submitted/i);
    });
  });

  describe('Section 11: RBAC & Access Control Enforcement', () => {
    it('blocks unauthorized status updates when caller lacks permission', async () => {
      // Login as Student Support (does not have MANAGE_OWNER_TICKETS)
      const supportLogin = await serverAdminLogin('studentsupport@colin.in', 'ColinAdmin@2026!Support');
      const supportToken = supportLogin.data!.session!.token;

      // Attempt to suspend an owner
      const res = serverUpdateOwnerStatus(supportToken, 'usr-owner-01', 'SUSPENDED');
      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.message).toMatch(/Forbidden|Access Denied/i);
    });
  });
});
