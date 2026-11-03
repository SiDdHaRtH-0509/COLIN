import React, { useState, useMemo, useEffect } from 'react';
import { useProperties } from '../../context/PropertyContext';
import { VisitBooking } from '../../types';
import {
  ShieldCheck,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  X,
  PlusCircle,
  Lock,
  UserCheck,
  Timer,
  Check,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../components/common/Button';

// The 10 canonical Mediated Statuses mandated by Section 4
export interface StatusTabOption {
  key: string;
  label: string;
  badgeCount?: number;
}

export const OwnerEnquiriesPage: React.FC = () => {
  const {
    visits,
    proposeOwnerAvailability,
    declineVisitByOwner,
    confirmVisitByColin,
    markVisitCompletedByVolunteer,
    checkAndExpireDecisions,
  } = useProperties();

  // Search & Active Tab
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('all');

  // Modal State for Providing Host Availability
  const [availabilityModalBooking, setAvailabilityModalBooking] = useState<VisitBooking | null>(null);
  const [proposedDate, setProposedDate] = useState('');
  const [proposedSlot, setProposedSlot] = useState('11:00 AM - 12:30 PM');
  const [isAlternative, setIsAlternative] = useState(false);
  const [availabilityNotes, setAvailabilityNotes] = useState('');
  const [isDeclining, setIsDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  // Modal State for Internal Notes
  const [notesModalBooking, setNotesModalBooking] = useState<VisitBooking | null>(null);
  const [newNoteText, setNewNoteText] = useState('');

  // Internal Notes storage mapped by booking ID
  const [internalNotesMap, setInternalNotesMap] = useState<Record<string, string[]>>(() => {
    try {
      const stored = localStorage.getItem('colin_booking_internal_notes');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Ticking timer state for countdown re-rendering every second
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      checkAndExpireDecisions();
    }, 1000);
    return () => clearInterval(timer);
  }, [checkAndExpireDecisions]);

  // Save internal notes map
  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesModalBooking || !newNoteText.trim()) return;

    const bId = notesModalBooking.id;
    const existing = internalNotesMap[bId] || [];
    const updated = [...existing, `${new Date().toLocaleDateString('en-IN')}: ${newNoteText.trim()}`];
    const newMap = { ...internalNotesMap, [bId]: updated };

    setInternalNotesMap(newMap);
    try {
      localStorage.setItem('colin_booking_internal_notes', JSON.stringify(newMap));
    } catch {}

    setNewNoteText('');
  };

  // Helper to calculate countdown time remaining
  const getRemainingTime = (deadlineStr?: string) => {
    if (!deadlineStr) return null;
    const diff = new Date(deadlineStr).getTime() - Date.now();
    if (diff <= 0) return '00h 00m 00s (Expired)';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s remaining`;
  };

  // Canonical tab filters
  const statusTabs: StatusTabOption[] = useMemo(() => {
    return [
      { key: 'all', label: 'All Requests' },
      {
        key: 'PENDING_COLIN_REVIEW',
        label: 'New Enquiries',
        badgeCount: visits.filter((v) => v.status === 'PENDING_COLIN_REVIEW' || v.status === 'Pending').length,
      },
      {
        key: 'AWAITING_OWNER_AVAILABILITY',
        label: 'Awaiting Owner Availability',
        badgeCount: visits.filter((v) => v.status === 'AWAITING_OWNER_AVAILABILITY').length,
      },
      {
        key: 'AWAITING_COLIN_CONFIRMATION',
        label: 'Availability Submitted to COLIN',
        badgeCount: visits.filter((v) => v.status === 'AWAITING_COLIN_CONFIRMATION').length,
      },
      {
        key: 'VISIT_CONFIRMED',
        label: 'Visit Scheduled',
        badgeCount: visits.filter((v) => v.status === 'VISIT_CONFIRMED' || v.status === 'Confirmed').length,
      },
      {
        key: 'UPCOMING_VISITS',
        label: 'Upcoming Visits',
        badgeCount: visits.filter(
          (v) => v.status === 'VISIT_CONFIRMED' || v.status === 'Confirmed' || v.status === 'PENDING_COLIN_REVIEW'
        ).length,
      },
      {
        key: 'COMPLETED_VISITS',
        label: 'Completed Visits',
        badgeCount: visits.filter((v) => v.status === 'Completed' || v.visitCompletedAt !== undefined).length,
      },
      {
        key: 'VISIT_COMPLETED_DECISION_PENDING',
        label: 'Student Decision Pending',
        badgeCount: visits.filter((v) => v.status === 'VISIT_COMPLETED_DECISION_PENDING').length,
      },
      {
        key: 'STUDENT_ACCEPTED',
        label: 'Converted',
        badgeCount: visits.filter((v) => v.status === 'STUDENT_ACCEPTED').length,
      },
      {
        key: 'STUDENT_REJECTED',
        label: 'Rejected Bookings',
        badgeCount: visits.filter((v) => v.status === 'STUDENT_REJECTED' || v.status === 'Visited - Rejected').length,
      },
      {
        key: 'DECISION_EXPIRED',
        label: 'Expired Decisions',
        badgeCount: visits.filter((v) => v.status === 'DECISION_EXPIRED').length,
      },
    ];
  }, [visits]);

  // Filtered requests
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      // Tab matching
      if (selectedStatusTab !== 'all') {
        if (selectedStatusTab === 'UPCOMING_VISITS') {
          if (
            v.status !== 'VISIT_CONFIRMED' &&
            v.status !== 'Confirmed' &&
            v.status !== 'PENDING_COLIN_REVIEW' &&
            v.status !== 'AWAITING_OWNER_AVAILABILITY'
          ) {
            return false;
          }
        } else if (selectedStatusTab === 'COMPLETED_VISITS') {
          if (
            v.status !== 'Completed' &&
            v.status !== 'VISIT_COMPLETED_DECISION_PENDING' &&
            v.status !== 'STUDENT_ACCEPTED' &&
            v.status !== 'STUDENT_REJECTED' &&
            v.status !== 'DECISION_EXPIRED'
          ) {
            return false;
          }
        } else if (selectedStatusTab === 'PENDING_COLIN_REVIEW') {
          if (v.status !== 'PENDING_COLIN_REVIEW' && v.status !== 'Pending') return false;
        } else if (selectedStatusTab === 'VISIT_CONFIRMED') {
          if (v.status !== 'VISIT_CONFIRMED' && v.status !== 'Confirmed') return false;
        } else if (selectedStatusTab === 'STUDENT_REJECTED') {
          if (v.status !== 'STUDENT_REJECTED' && v.status !== 'Visited - Rejected') return false;
        } else if (v.status !== selectedStatusTab) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const ref = (v.bookingReference || v.id).toLowerCase();
        const student = (v.studentName || '').toLowerCase();
        const property = (v.propertyTitle || v.propertyName || '').toLowerCase();
        return ref.includes(q) || student.includes(q) || property.includes(q);
      }

      return true;
    });
  }, [visits, selectedStatusTab, searchQuery]);

  // Submit availability form
  const handleSubmitAvailability = (e: React.FormEvent) => {
    e.preventDefault();
    if (!availabilityModalBooking) return;

    if (isDeclining) {
      declineVisitByOwner(availabilityModalBooking.id, declineReason || 'Host unavailable for requested slot');
    } else {
      proposeOwnerAvailability(availabilityModalBooking.id, {
        date: proposedDate || availabilityModalBooking.date,
        timeSlot: proposedSlot,
        isAlternative,
        notes: availabilityNotes,
        submittedAt: new Date().toISOString(),
      });
    }

    setAvailabilityModalBooking(null);
    setIsDeclining(false);
    setDeclineReason('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              COLIN Mediated Coordination
            </span>
            <span className="text-xs text-colin-charcoal-500 font-medium">
              Privacy-Protected Student In-Person Visits
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-colin-navy tracking-tight font-display">
            Student Enquiry Management
          </h1>
          <p className="text-xs text-colin-charcoal-500 max-w-2xl leading-relaxed">
            All student communications and property inspections are coordinated exclusively through verified COLIN campus coordinators. Student contact details are shielded to preserve platform integrity and verified zero-brokerage guarantees.
          </p>
        </div>

        {/* Privacy Shield Badge Card */}
        <div className="bg-colin-navy-50/70 border border-colin-navy-100 rounded-2xl p-4 text-xs space-y-1 shrink-0 max-w-xs">
          <div className="flex items-center gap-1.5 font-bold text-colin-navy">
            <Lock size={14} className="text-colin-teal" />
            <span>Zero Direct Contact Policy</span>
          </div>
          <p className="text-[11px] text-colin-charcoal-600">
            No personal phone, email, or WhatsApp numbers are shared. A verified COLIN ambassador physically accompanies every student visit.
          </p>
        </div>
      </div>

      {/* Strict Privacy Protection Notice Banner */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
        <ShieldCheck size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold">COLIN Safe Intermediary Architecture</span>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Owners review student request criteria (name, age, requested stay, room tier) and provide available time slots to COLIN. COLIN assigns an authorized campus leader to escort the student on-site and verify physical visit completion.
          </p>
        </div>
      </div>

      {/* Search & 10 Canonical Status Tabs */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-colin-charcoal-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, property, or booking reference (e.g. COLIN-VIS-2026-0001)..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-colin-charcoal-200/90 rounded-2xl text-xs text-colin-charcoal focus:ring-2 focus:ring-colin-navy focus:outline-none shadow-sm"
          />
        </div>

        {/* 10 Status Tabs (Scrollable pill row) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 no-scrollbar">
          {statusTabs.map((tab) => {
            const isActive = selectedStatusTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedStatusTab(tab.key)}
                className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  isActive
                    ? 'bg-colin-navy text-white shadow-sm'
                    : 'bg-white hover:bg-colin-navy-50/70 text-colin-charcoal-600 border border-colin-charcoal-200/90'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {tab.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Booking Requests List */}
      <div className="space-y-4">
        {filteredVisits.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-colin-charcoal-200/90 space-y-3">
            <Building2 size={36} className="text-colin-charcoal-300 mx-auto" />
            <h3 className="text-base font-bold text-colin-navy">No visit coordination requests found</h3>
            <p className="text-xs text-colin-charcoal-500 max-w-sm mx-auto">
              There are currently no student requests matching your selected filter. All incoming booking requests mediated by COLIN will appear here.
            </p>
          </div>
        ) : (
          filteredVisits.map((v) => {
            const notes = internalNotesMap[v.id] || [];
            const remainingTimeStr =
              v.status === 'VISIT_COMPLETED_DECISION_PENDING' ? getRemainingTime(v.decisionDeadline) : null;

            return (
              <div
                key={v.id}
                className="bg-white rounded-3xl border border-colin-charcoal-200/90 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow space-y-4"
              >
                {/* Card Top Row: Booking Ref, Status, and Fee Info */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-colin-charcoal-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black tracking-wider text-colin-navy bg-colin-navy-50 px-2.5 py-1 rounded-lg border border-colin-navy-100 font-mono">
                      {v.bookingReference || v.id}
                    </span>
                    <span className="text-[11px] font-bold text-colin-charcoal-400">
                      Created {v.createdAt || 'Recent'}
                    </span>
                  </div>

                  {/* Status Indicator Badge */}
                  <div className="flex items-center gap-2">
                    {v.status === 'PENDING_COLIN_REVIEW' || v.status === 'Pending' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1.5">
                        <AlertCircle size={13} />
                        <span>1. New Visit Request (Action Required)</span>
                      </span>
                    ) : v.status === 'AWAITING_OWNER_AVAILABILITY' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1.5">
                        <Clock size={13} />
                        <span>2. Awaiting Owner Availability</span>
                      </span>
                    ) : v.status === 'AWAITING_COLIN_CONFIRMATION' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 flex items-center gap-1.5">
                        <Check size={13} />
                        <span>3. Availability Submitted to COLIN</span>
                      </span>
                    ) : v.status === 'VISIT_CONFIRMED' || v.status === 'Confirmed' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 size={13} />
                        <span>4. Visit Confirmed by COLIN</span>
                      </span>
                    ) : v.status === 'VISIT_COMPLETED_DECISION_PENDING' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 flex items-center gap-1.5 animate-pulse">
                        <Timer size={13} />
                        <span>7. Student Decision Pending (12h Timer)</span>
                      </span>
                    ) : v.status === 'STUDENT_ACCEPTED' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
                        <Sparkles size={13} />
                        <span>8. Booking Finalized (Student Accepted)</span>
                      </span>
                    ) : v.status === 'STUDENT_REJECTED' || v.status === 'Visited - Rejected' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1.5">
                        <XCircle size={13} />
                        <span>9. Student Rejected Stay</span>
                      </span>
                    ) : v.status === 'DECISION_EXPIRED' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 flex items-center gap-1.5">
                        <Clock size={13} />
                        <span>10. Decision Expired (Non-Refundable)</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-colin-charcoal-100 text-colin-charcoal-700">
                        {v.status}
                      </span>
                    )}

                    <span className="text-xs font-bold text-colin-teal bg-colin-teal/10 px-2.5 py-1 rounded-full border border-colin-teal/20">
                      ₹{v.feePaid || 150} Paid Pass
                    </span>
                  </div>
                </div>

                {/* Card Main Grid: Student & Property Specs (Strictly Zero Private Phone/Email) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Column 1: Student Information (Restricted to Name, Age, University) */}
                  <div className="space-y-1.5 p-3.5 bg-colin-navy-50/50 rounded-2xl border border-colin-navy-100/60">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-colin-charcoal-500 flex items-center gap-1">
                      <Lock size={11} className="text-colin-teal" />
                      <span>Student Scholar (Shielded)</span>
                    </div>
                    <div className="text-sm font-black text-colin-navy">{v.studentName}</div>
                    <div className="text-colin-charcoal-600">
                      Age: <span className="font-semibold text-colin-navy">{v.studentAge || 20} years</span>
                    </div>
                    <div className="text-[11px] text-colin-charcoal-500">
                      Room Interest: <span className="font-semibold text-colin-navy">{v.roomTypeInterested || 'Standard Sharing'}</span>
                    </div>
                  </div>

                  {/* Column 2: Property & Inspection Slot */}
                  <div className="space-y-1.5 p-3.5 bg-colin-navy-50/50 rounded-2xl border border-colin-navy-100/60">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-colin-charcoal-500">
                      Requested Property & Slot
                    </div>
                    <div className="text-sm font-black text-colin-navy truncate">
                      {v.propertyTitle || v.propertyName}
                    </div>
                    <div className="text-colin-charcoal-600 flex items-center gap-1">
                      <Calendar size={12} className="text-colin-teal" />
                      <span>{v.date}</span>
                    </div>
                    <div className="text-[11px] text-colin-charcoal-500 flex items-center gap-1">
                      <Clock size={12} className="text-colin-teal" />
                      <span>{v.timeSlot}</span>
                    </div>
                  </div>

                  {/* Column 3: COLIN Coordination & Escort Status */}
                  <div className="space-y-1.5 p-3.5 bg-colin-navy-50/50 rounded-2xl border border-colin-navy-100/60">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-colin-charcoal-500">
                      COLIN Coordination Desk
                    </div>
                    <div className="text-sm font-bold text-colin-navy flex items-center gap-1.5">
                      <UserCheck size={14} className="text-emerald-600" />
                      <span>{v.assignedVolunteer?.name || v.meetingGuideName || 'Ambassador Pending'}</span>
                    </div>
                    <div className="text-[11px] text-colin-charcoal-500">
                      {v.assignedVolunteer?.role || 'Campus Inspection Guide'}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-semibold">
                      55% (₹82.50) refund policy protected
                    </div>
                  </div>
                </div>

                {/* 12-Hour Decision Countdown Banner (when status is VISIT_COMPLETED_DECISION_PENDING) */}
                {v.status === 'VISIT_COMPLETED_DECISION_PENDING' && (
                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-black text-purple-950 flex items-center gap-1.5 uppercase tracking-wide">
                        <Timer size={16} className="text-purple-700 animate-spin" />
                        <span>12-Hour Decision Window In Progress</span>
                      </div>
                      <p className="text-[11px] text-purple-800">
                        Physical visit completed by {v.completedByVolunteer?.name || 'COLIN Ambassador'}. Student decision countdown is active.
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-black text-purple-900 bg-white px-3 py-1.5 rounded-xl border border-purple-200 shadow-sm block">
                        {remainingTimeStr || '12h 00m 00s remaining'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Decision Finalized Result Banner */}
                {v.status === 'STUDENT_ACCEPTED' && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900 flex items-center gap-2">
                    <Sparkles size={16} className="text-emerald-700 shrink-0" />
                    <span>
                      <strong>Booking Finalized:</strong> Student accepted accommodation. Full ₹150 booking fee retained by COLIN. Room bed marked reserved.
                    </span>
                  </div>
                )}

                {v.status === 'STUDENT_REJECTED' && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-900 flex items-center gap-2">
                    <XCircle size={16} className="text-rose-700 shrink-0" />
                    <span>
                      <strong>Student Rejected Stay:</strong> Reason: "{v.rejectionReason || 'Did not meet requirements'}". 55% refund (₹82.50) credited to student. ₹67.50 retained for volunteer accompaniment.
                    </span>
                  </div>
                )}

                {v.status === 'DECISION_EXPIRED' && (
                  <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 flex items-center gap-2">
                    <Clock size={16} className="text-slate-600 shrink-0" />
                    <span>
                      <strong>Decision Window Expired:</strong> Student did not submit accept/reject within 12 hours. ₹150 booking fee is fully non-refundable. Room released to market.
                    </span>
                  </div>
                )}

                {/* Host Action Buttons (Mediated through COLIN) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  {/* Left: Internal Notes trigger */}
                  <button
                    onClick={() => setNotesModalBooking(v)}
                    className="text-xs font-bold text-colin-charcoal-600 hover:text-colin-navy flex items-center gap-1.5 hover:underline"
                  >
                    <span>Internal Notes ({notes.length})</span>
                    <PlusCircle size={14} className="text-colin-teal" />
                  </button>

                  {/* Right: State Transition Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Step 2 Owner Availability Actions */}
                    {(v.status === 'PENDING_COLIN_REVIEW' ||
                      v.status === 'Pending' ||
                      v.status === 'AWAITING_OWNER_AVAILABILITY') && (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5"
                          onClick={() => {
                            setAvailabilityModalBooking(v);
                            setProposedDate(v.date);
                            setProposedSlot(v.timeSlot);
                            setIsAlternative(false);
                            setIsDeclining(false);
                          }}
                        >
                          Confirm Availability to COLIN
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs font-bold border-amber-300 text-amber-800 hover:bg-amber-50 px-3 py-1.5"
                          onClick={() => {
                            setAvailabilityModalBooking(v);
                            setProposedDate(v.date);
                            setProposedSlot(v.timeSlot);
                            setIsAlternative(true);
                            setIsDeclining(false);
                          }}
                        >
                          Suggest Alternative Slot
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-1.5"
                          onClick={() => {
                            setAvailabilityModalBooking(v);
                            setIsDeclining(true);
                          }}
                        >
                          Decline Request
                        </Button>
                      </>
                    )}

                    {/* Step 3: Simulation Helper for COLIN Coordination Confirmation */}
                    {v.status === 'AWAITING_COLIN_CONFIRMATION' && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5"
                        onClick={() => confirmVisitByColin(v.id)}
                      >
                        [COLIN Desk Simulation: Assign Ambassador & Confirm Visit]
                      </Button>
                    )}

                    {/* Step 4: Simulation Helper for Authorized COLIN Volunteer Physical Visit Completion */}
                    {(v.status === 'VISIT_CONFIRMED' || v.status === 'Confirmed') && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5"
                        onClick={() => markVisitCompletedByVolunteer(v.id)}
                      >
                        [Volunteer Simulation: Mark Visit as Completed (Starts 12h Timer)]
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Submit Availability to COLIN */}
      {availabilityModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-colin-navy-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-colin-charcoal-200 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-colin-charcoal-100">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">
                  COLIN Coordination Desk
                </span>
                <h3 className="text-lg font-black text-colin-navy">
                  {isDeclining
                    ? 'Decline Visit Request'
                    : isAlternative
                    ? 'Suggest Alternative Slot to COLIN'
                    : 'Confirm Availability to COLIN'}
                </h3>
              </div>
              <button
                onClick={() => setAvailabilityModalBooking(null)}
                className="p-1 rounded-full text-colin-charcoal-400 hover:text-colin-navy"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitAvailability} className="space-y-4 text-xs">
              <div className="p-3 bg-colin-navy-50 rounded-2xl space-y-1">
                <div className="font-bold text-colin-navy">
                  Student: {availabilityModalBooking.studentName} ({availabilityModalBooking.studentAge || 20} yrs)
                </div>
                <div className="text-colin-charcoal-600">
                  {availabilityModalBooking.propertyTitle || availabilityModalBooking.propertyName}
                </div>
                <div className="text-colin-charcoal-500 font-mono text-[11px]">
                  Ref: {availabilityModalBooking.bookingReference || availabilityModalBooking.id}
                </div>
              </div>

              {!isDeclining ? (
                <>
                  <div className="space-y-1">
                    <label className="font-bold text-colin-charcoal-700 uppercase tracking-wide">
                      Available Inspection Date:
                    </label>
                    <input
                      type="text"
                      value={proposedDate}
                      onChange={(e) => setProposedDate(e.target.value)}
                      placeholder="e.g. Tomorrow, Nov 4"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-colin-charcoal-700 uppercase tracking-wide">
                      Available Time Window:
                    </label>
                    <select
                      value={proposedSlot}
                      onChange={(e) => setProposedSlot(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none"
                    >
                      <option value="10:00 AM - 11:30 AM">10:00 AM - 11:30 AM</option>
                      <option value="11:30 AM - 01:00 PM">11:30 AM - 01:00 PM</option>
                      <option value="02:30 PM - 04:00 PM">02:30 PM - 04:00 PM</option>
                      <option value="05:00 PM - 06:30 PM">05:00 PM - 06:30 PM</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-colin-charcoal-700 uppercase tracking-wide">
                      Internal Host Notes for COLIN Coordinator (Optional):
                    </label>
                    <textarea
                      value={availabilityNotes}
                      onChange={(e) => setAvailabilityNotes(e.target.value)}
                      placeholder="e.g. Caretaker Ramesh will facilitate gate biometric access..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none resize-none h-20"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="font-bold text-colin-charcoal-700 uppercase tracking-wide">
                    Reason for Declining Slot:
                  </label>
                  <textarea
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="e.g. Full occupancy expected or deep renovation in progress..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none resize-none h-24"
                    required
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAvailabilityModalBooking(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  className={isDeclining ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
                >
                  {isDeclining ? 'Confirm Decline' : 'Submit Availability to COLIN'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Internal Host Notes */}
      {notesModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-colin-navy-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-colin-charcoal-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-colin-charcoal-100">
              <h3 className="text-base font-black text-colin-navy">
                Internal Notes: {notesModalBooking.bookingReference || notesModalBooking.id}
              </h3>
              <button
                onClick={() => setNotesModalBooking(null)}
                className="p-1 rounded-full text-colin-charcoal-400 hover:text-colin-navy"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(internalNotesMap[notesModalBooking.id] || []).length === 0 ? (
                <div className="text-xs text-colin-charcoal-400 text-center py-4">No internal notes added yet.</div>
              ) : (
                (internalNotesMap[notesModalBooking.id] || []).map((n, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-colin-navy-50 text-xs text-colin-charcoal-700">
                    {n}
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSaveNote} className="space-y-3">
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Log internal note (e.g. Student prefers quiet corner bed; family arriving Friday)..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-colin-charcoal-300 text-xs focus:ring-2 focus:ring-colin-navy focus:outline-none resize-none h-20"
                required
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setNotesModalBooking(null)}>
                  Close
                </Button>
                <Button type="submit" size="sm" variant="primary">
                  Save Note
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
