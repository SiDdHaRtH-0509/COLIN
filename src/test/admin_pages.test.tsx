/**
 * COLIN Admin Control Centre — Page Verification Tests
 * Tests AdminVerificationQueuePage, AdminVisitsPage, and AdminFinancePage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { PropertyProvider } from '../context/PropertyContext';
import { AdminVerificationQueuePage } from '../pages/admin/AdminVerificationQueuePage';
import { AdminVisitsPage } from '../pages/admin/AdminVisitsPage';
import { AdminFinancePage } from '../pages/admin/AdminFinancePage';
import { apiClient } from '../services/apiClient';

vi.mock('../services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('COLIN Admin Pages Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('AdminVerificationQueuePage', () => {
    it('renders empty queue state when no pending properties exist', async () => {
      vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
        if (url === '/api/v1/admin/properties/pending') {
          return { success: true, data: [] };
        }
        return { success: true, data: [] };
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <PropertyProvider>
              <AdminVerificationQueuePage />
            </PropertyProvider>
          </AuthProvider>
        </BrowserRouter>
      );

      expect(screen.getByText(/Property Verification Queue/i)).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText(/Verification Queue is Empty/i)).toBeInTheDocument();
      });
    });

    it('renders pending properties and opens inspect drawer', async () => {
      vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
        if (url === '/api/v1/admin/properties/pending') {
          return {
            success: true,
            data: [
              {
                id: 'prop-101',
                name: 'Green View Residency',
                slug: 'green-view-residency',
                propertyType: 'PG',
                genderPolicy: 'COED',
                city: 'Bengaluru',
                addressLine1: 'Koramangala 4th Block',
                totalRooms: 10,
                totalBeds: 20,
                availableBeds: 5,
                verificationStatus: 'PENDING_VERIFICATION',
                createdAt: new Date().toISOString(),
                owner: {
                  userId: 'owner-1',
                  businessName: 'Green View Stays',
                  user: {
                    email: 'owner@greenview.in',
                    profile: { firstName: 'Ramesh', lastName: 'Kumar' },
                  },
                },
                photos: [
                  {
                    id: 'photo-1',
                    photoStorageUrl: 'https://cdn.colin.in/p1.jpg',
                    thumbnailUrl: 'https://cdn.colin.in/t1.jpg',
                    isCover: true,
                  },
                ],
              },
            ],
          };
        }
        return { success: true, data: [] };
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <PropertyProvider>
              <AdminVerificationQueuePage />
            </PropertyProvider>
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Green View Residency/i)).toBeInTheDocument();
        expect(screen.getByText(/Koramangala 4th Block/i)).toBeInTheDocument();
      });

      // Click Inspect & Verify button
      const inspectBtn = screen.getByRole('button', { name: /Inspect & Verify/i });
      fireEvent.click(inspectBtn);

      await waitFor(() => {
        expect(screen.getByText(/Owner Account/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Green View Stays/i).length).toBeGreaterThan(0);
      });
    });

    it('approves a property from the queue', async () => {
      vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
        if (url === '/api/v1/admin/properties/pending') {
          return {
            success: true,
            data: [
              {
                id: 'prop-102',
                name: 'Sunrise PG',
                slug: 'sunrise-pg',
                propertyType: 'PG',
                genderPolicy: 'FEMALE_ONLY',
                city: 'New Delhi',
                addressLine1: 'South Extension',
                totalRooms: 5,
                totalBeds: 10,
                availableBeds: 2,
                verificationStatus: 'PENDING_VERIFICATION',
                createdAt: new Date().toISOString(),
              },
            ],
          };
        }
        return { success: true, data: [] };
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        success: true,
        data: { id: 'prop-102', verificationStatus: 'VERIFIED' },
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <PropertyProvider>
              <AdminVerificationQueuePage />
            </PropertyProvider>
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Sunrise PG/i)).toBeInTheDocument();
      });

      // Open inspection drawer
      const inspectBtn = screen.getByRole('button', { name: /Inspect & Verify/i });
      fireEvent.click(inspectBtn);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Approve & Issue COLIN Verified Badge/i })).toBeInTheDocument();
      });

      const approveBtn = screen.getByRole('button', { name: /Approve & Issue COLIN Verified Badge/i });
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          '/api/v1/admin/properties/prop-102/approve',
          expect.anything()
        );
      });
    });
  });

  describe('AdminVisitsPage', () => {
    it('renders empty visits coordination state', async () => {
      vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
        if (url.startsWith('/api/v1/admin/bookings')) {
          return { success: true, data: { items: [] } };
        }
        return { success: true, data: [] };
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <AdminVisitsPage />
          </AuthProvider>
        </BrowserRouter>
      );

      expect(screen.getByText(/Visit Coordination Headquarters/i)).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText(/No Booking Requests Found/i)).toBeInTheDocument();
      });
    });

    it('renders visit booking with schedule and complete actions', async () => {
      vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
        if (url.startsWith('/api/v1/admin/bookings')) {
          return {
            success: true,
            data: {
              items: [
                {
                  id: 'booking-201',
                  status: 'FEE_PAID',
                  bookingFeeAmount: 150.0,
                  amountPaid: 150.0,
                  paymentStatus: 'PAID',
                  studentDecision: 'PENDING',
                  refundAmount: 0.0,
                  platformFeeRetained: 0.0,
                  createdAt: new Date().toISOString(),
                  property: {
                    id: 'prop-1',
                    name: 'Royal Heritage PG',
                    city: 'Bengaluru',
                  },
                  student: {
                    userId: 'student-1',
                    collegeName: 'IISc Bangalore',
                    user: {
                      email: 'student@iisc.ac.in',
                      profile: { firstName: 'Aarav', lastName: 'Sharma' },
                    },
                  },
                },
              ],
            },
          };
        }
        return { success: true, data: [] };
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <AdminVisitsPage />
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Royal Heritage PG/i)).toBeInTheDocument();
        expect(screen.getByText(/Aarav Sharma/i)).toBeInTheDocument();
        expect(screen.getByText(/Fee Paid \(Ready to Schedule\)/i)).toBeInTheDocument();
      });

      // Schedule Visit button should be visible
      const scheduleBtn = screen.getByRole('button', { name: /Schedule Visit Slot/i });
      expect(scheduleBtn).toBeInTheDocument();
      fireEvent.click(scheduleBtn);

      expect(screen.getByText(/Schedule Guided Visit Slot/i)).toBeInTheDocument();
    });
  });

  describe('AdminFinancePage', () => {
    it('renders IAS-1 balanced double-entry ledger totals', async () => {
      vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
        if (url.startsWith('/api/v1/admin/bookings/finance-summary')) {
          return {
            success: true,
            data: {
              totalBookings: 10,
              feePaidCount: 4,
              acceptedCount: 3,
              rejectedCount: 2,
              expiredCount: 1,
              totalCollected: 1500.0,
              escrowBalance: 600.0,
              revenueRetained: 685.0,
              refundsPaid: 215.0,
              isBalanced: true,
            },
          };
        }
        return { success: true, data: null };
      });

      render(
        <BrowserRouter>
          <AuthProvider>
            <AdminFinancePage />
          </AuthProvider>
        </BrowserRouter>
      );

      expect(screen.getByText(/Financial Operations & Ledgers/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/Double-Entry Invariant Verified: Balanced/i)).toBeInTheDocument();
        expect(screen.getAllByText((content) => content.includes('1500.00')).length).toBeGreaterThan(0);
        expect(screen.getAllByText((content) => content.includes('600.00')).length).toBeGreaterThan(0);
      });
    });
  });
});
