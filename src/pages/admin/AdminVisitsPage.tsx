/**
 * COLIN Admin Control Centre — Visit Coordination Headquarters
 * Phase 4A / Sprint Completion: Live Dispatching & In-Person Visit Lifecycle
 */

import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  Calendar,
  Timer,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { Button } from '../../components/common/Button';

interface AdminBooking {
  id: string;
  studentId: string;
  propertyId: string;
  status: string;
  bookingFeeAmount: string | number;
  amountPaid: string | number;
  paymentStatus: string;
  studentDecision: string;
  refundAmount: string | number;
  platformFeeRetained: string | number;
  decisionDeadline?: string;
  visitCompletedAt?: string;
  createdAt: string;
  property?: {
    id: string;
    name: string;
    city: string;
    addressLine1?: string;
  };
  student?: {
    userId: string;
    collegeName: string;
    user?: {
      email: string;
      profile?: {
        firstName: string;
        lastName: string;
      };
    };
  };
  visitSlot?: {
    id: string;
    scheduledStartTime: string;
    scheduledEndTime: string;
    volunteerId?: string;
  };
}

export const AdminVisitsPage: React.FC = () => {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Scheduling Modal
  const [scheduleModalBooking, setScheduleModalBooking] = useState<AdminBooking | null>(null);
  const [scheduledStartTime, setScheduledStartTime] = useState('');
  const [scheduledEndTime, setScheduledEndTime] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBookings = async () => {
    setIsLoading(true);
    setFeedbackMessage(null);
    try {
      const res = await apiClient.get<AdminBooking[] | { items: AdminBooking[] }>('/api/v1/admin/bookings?limit=50');
      if (res.success && res.data) {
        const items = Array.isArray(res.data) ? res.data : (res.data as any).items || [];
        setBookings(items);
      } else {
        setBookings([]);
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to fetch bookings.' });
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleOpenSchedule = (booking: AdminBooking) => {
    setScheduleModalBooking(booking);
    // Default to tomorrow 11:00 AM - 12:30 PM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);
    const endTomorrow = new Date(tomorrow);
    endTomorrow.setHours(12, 30, 0, 0);

    setScheduledStartTime(tomorrow.toISOString().slice(0, 16));
    setScheduledEndTime(endTomorrow.toISOString().slice(0, 16));
  };

  const handleConfirmSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleModalBooking) return;

    setActionLoading(true);
    try {
      const res = await apiClient.post(`/api/v1/admin/bookings/${scheduleModalBooking.id}/schedule`, {
        scheduledStartTime: new Date(scheduledStartTime).toISOString(),
        scheduledEndTime: new Date(scheduledEndTime).toISOString(),
      });

      if (res.success) {
        setFeedbackMessage({
          type: 'success',
          text: `Visit slot scheduled for ${scheduleModalBooking.property?.name || 'booking'}! Status updated to VISIT_SCHEDULED.`,
        });
        setScheduleModalBooking(null);
        fetchBookings();
      } else {
        setFeedbackMessage({ type: 'error', text: res.message || 'Failed to schedule slot.' });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Scheduling request failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteVisit = async (bookingId: string) => {
    setActionLoading(true);
    try {
      const res = await apiClient.post(`/api/v1/admin/bookings/${bookingId}/complete-visit`);
      if (res.success) {
        setFeedbackMessage({
          type: 'success',
          text: 'Visit completion recorded! Authoritative 12-hour server decision countdown is now active for the student.',
        });
        fetchBookings();
      } else {
        setFeedbackMessage({ type: 'error', text: res.message || 'Failed to record completion.' });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Completion request failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessExpirations = async () => {
    setActionLoading(true);
    try {
      const res = await apiClient.post<{ expiredCount: number }>('/api/v1/admin/bookings/process-expirations');
      if (res.success) {
        setFeedbackMessage({
          type: 'success',
          text: `Processed automatic decision expirations. ${res.data?.expiredCount ?? 0} overdue booking(s) transitioned to AUTO_EXPIRED with balanced settlement entries.`,
        });
        fetchBookings();
      } else {
        setFeedbackMessage({ type: 'error', text: res.message || 'Failed to process expirations.' });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Expiration processing failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAYMENT_PENDING':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Payment Pending</span>;
      case 'FEE_PAID':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Fee Paid (Ready to Schedule)</span>;
      case 'VISIT_SCHEDULED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Visit Scheduled</span>;
      case 'DECISION_PENDING':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 animate-pulse">12h Decision Pending</span>;
      case 'ACCEPTED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">Accepted (₹150 Retained)</span>;
      case 'REJECTED_REFUND_DUE':
      case 'REJECTED_REFUNDED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300">Rejected (55% Refund: ₹82.50)</span>;
      case 'AUTO_EXPIRED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">Auto-Expired (₹0 Refund)</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchProperty = b.property?.name?.toLowerCase().includes(q);
      const matchStudent = b.student?.user?.profile?.firstName?.toLowerCase().includes(q) || b.student?.user?.email?.toLowerCase().includes(q);
      const matchId = b.id.toLowerCase().includes(q);
      return matchProperty || matchStudent || matchId;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-colin-charcoal-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-colin-teal/10 text-colin-teal rounded-lg">
              <CalendarCheck size={18} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-colin-teal">Central Operations</span>
          </div>
          <h1 className="text-2xl font-black text-colin-navy font-display">Visit Coordination Headquarters</h1>
          <p className="text-xs text-colin-charcoal-500 mt-1">
            Dispatch in-person student accommodation tours, schedule inspection slots, record completions, and enforce the 12-hour decision deadline.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleProcessExpirations}
            disabled={actionLoading}
            leftIcon={<Timer size={14} />}
          >
            Run Expiry Worker
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={fetchBookings}
            disabled={isLoading}
            leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button onClick={() => setFeedbackMessage(null)} className="text-xs font-bold underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-colin-charcoal-200">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400" />
          <input
            type="text"
            placeholder="Search bookings by student, property, or booking ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-colin-charcoal-200 focus:outline-none focus:ring-2 focus:ring-colin-teal/30 focus:border-colin-teal"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'FEE_PAID', 'VISIT_SCHEDULED', 'DECISION_PENDING', 'ACCEPTED', 'REJECTED_REFUND_DUE', 'AUTO_EXPIRED'].map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  statusFilter === status
                    ? 'bg-colin-navy text-white shadow-sm'
                    : 'bg-slate-100 text-colin-charcoal-600 hover:bg-slate-200'
                }`}
              >
                {status.replace(/_/g, ' ')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Bookings Coordination Table */}
      <div className="bg-white rounded-3xl border border-colin-charcoal-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-colin-charcoal-400">
            <RefreshCw size={32} className="animate-spin mx-auto mb-3 text-colin-teal" />
            <p className="text-sm font-semibold">Loading visit coordination requests from database...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center">
              <Calendar size={32} />
            </div>
            <h3 className="text-lg font-bold text-colin-navy">No Booking Requests Found</h3>
            <p className="text-xs text-colin-charcoal-500 max-w-sm mx-auto mt-1">
              There are no visit bookings matching the selected filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-colin-charcoal-200 text-colin-charcoal-600 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Booking Details</th>
                  <th className="py-3.5 px-4">Student Scholar</th>
                  <th className="py-3.5 px-4">Accommodation Listing</th>
                  <th className="py-3.5 px-4">Status & Ledger</th>
                  <th className="py-3.5 px-4">Visit Schedule / 12h Deadline</th>
                  <th className="py-3.5 px-6 text-right">Coordination Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-colin-charcoal-100">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-mono font-bold text-colin-navy text-xs">{b.id.substring(0, 8)}...</div>
                      <div className="text-[10px] text-colin-charcoal-400">
                        {new Date(b.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-colin-navy">
                        {b.student?.user?.profile?.firstName
                          ? `${b.student.user.profile.firstName} ${b.student.user.profile.lastName || ''}`
                          : 'Student'}
                      </div>
                      <div className="text-colin-charcoal-500">{b.student?.user?.email || 'N/A'}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-colin-navy">{b.property?.name || 'Verified PG'}</div>
                      <div className="text-colin-charcoal-500">{b.property?.city || 'Delhi NCR'}</div>
                    </td>
                    <td className="py-4 px-4 space-y-1">
                      <div>{getStatusBadge(b.status)}</div>
                      <div className="text-[10px] font-mono text-colin-charcoal-500">
                        Paid: ₹{Number(b.amountPaid).toFixed(2)} | Ref: ₹{Number(b.refundAmount).toFixed(2)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {b.visitSlot?.scheduledStartTime ? (
                        <div className="font-semibold text-colin-navy">
                          {new Date(b.visitSlot.scheduledStartTime).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </div>
                      ) : (
                        <span className="text-colin-charcoal-400 italic">Not scheduled</span>
                      )}

                      {b.decisionDeadline && b.status === 'DECISION_PENDING' && (
                        <div className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded mt-1 inline-flex items-center gap-1">
                          <Clock size={10} />
                          <span>Deadline: {new Date(b.decisionDeadline).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      {b.status === 'FEE_PAID' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenSchedule(b)}
                          leftIcon={<Calendar size={13} />}
                        >
                          Schedule Visit Slot
                        </Button>
                      )}

                      {b.status === 'VISIT_SCHEDULED' && (
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => handleCompleteVisit(b.id)}
                          disabled={actionLoading}
                          leftIcon={<CheckCircle2 size={13} />}
                        >
                          Record Completion
                        </Button>
                      )}

                      {b.status === 'DECISION_PENDING' && (
                        <span className="text-xs text-purple-700 font-bold bg-purple-50 px-2.5 py-1 rounded-xl">
                          Awaiting Student
                        </span>
                      )}

                      {['ACCEPTED', 'REJECTED_REFUND_DUE', 'REJECTED_REFUNDED', 'AUTO_EXPIRED'].includes(b.status) && (
                        <span className="text-xs text-slate-500 font-semibold">
                          Lifecycle Closed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Slot Modal */}
      {scheduleModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-colin-navy-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-colin-charcoal-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-colin-teal font-bold">
              <CalendarCheck size={20} />
              <h4 className="text-base font-black text-colin-navy">Schedule Guided Visit Slot</h4>
            </div>

            <p className="text-xs text-colin-charcoal-600">
              Set the authoritative start and end time window for{' '}
              <strong className="text-colin-navy">{scheduleModalBooking.property?.name}</strong> tour.
            </p>

            <form onSubmit={handleConfirmSchedule} className="space-y-3 pt-2">
              <div>
                <label className="text-[10px] font-bold text-colin-charcoal-500 uppercase">Start Time</label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledStartTime}
                  onChange={(e) => setScheduledStartTime(e.target.value)}
                  className="w-full mt-1 p-2.5 text-xs rounded-xl border border-colin-charcoal-200 focus:outline-none focus:ring-2 focus:ring-colin-teal"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-colin-charcoal-500 uppercase">End Time</label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledEndTime}
                  onChange={(e) => setScheduledEndTime(e.target.value)}
                  className="w-full mt-1 p-2.5 text-xs rounded-xl border border-colin-charcoal-200 focus:outline-none focus:ring-2 focus:ring-colin-teal"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <Button variant="outline" size="sm" onClick={() => setScheduleModalBooking(null)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={actionLoading}>
                  {actionLoading ? 'Scheduling...' : 'Confirm Visit Slot'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
