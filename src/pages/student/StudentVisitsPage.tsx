import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStudent } from '../../context/StudentContext';
import { PROPERTIES } from '../../data/mockData';
import {
  VISIT_BOOKING_FEE,
  VISIT_REFUND_AMOUNT,
  VISIT_NON_REFUNDABLE_AMOUNT,
  VISIT_OUTCOME_OPTIONS,
  VisitOutcomeReason,
  DECISION_REMINDER_SCHEDULE,
} from '../../constants/booking';
import {
  CalendarCheck2,
  Clock,
  ShieldCheck,
  User,
  Calendar,
  CheckCircle2,
  RotateCcw,
  X,
  Timer,
  Sparkles,
  XCircle,
  Bell,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../components/common/Button';

export const StudentVisitsPage: React.FC = () => {
  const { visits, cancelVisit, submitStudentDecision } = useStudent();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  // Cancel / Outcome Modal State (Phase 2 legacy support)
  const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<VisitOutcomeReason>('visited_rejected');

  // Refund Result Modal
  const [resultModal, setResultModal] = useState<{
    open: boolean;
    visitId?: string;
    refundAmount: number;
    isEligible: boolean;
    explanation: string;
    outcomeReason: string;
  }>({
    open: false,
    refundAmount: 0,
    isEligible: false,
    explanation: '',
    outcomeReason: '',
  });

  // Phase 3A: 12-Hour Decision Modal State
  const [decisionModal, setDecisionModal] = useState<{
    open: boolean;
    visitId: string;
    type: 'accept' | 'reject';
    propertyTitle: string;
  } | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');

  // Decision Success / Feedback Alert
  const [decisionFeedback, setDecisionFeedback] = useState<{
    open: boolean;
    isAccepted: boolean;
    title: string;
    message: string;
    refundAmount: number;
  } | null>(null);

  // Ticking state for live 12-hour countdown
  const [, setTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter pending decision visits (12-hour window active)
  const pendingDecisionVisits = useMemo(() => {
    return visits.filter((v) => v.status === 'VISIT_COMPLETED_DECISION_PENDING');
  }, [visits]);

  // Upcoming Visits (Active / Scheduled / Pending Decision)
  const upcomingVisits = useMemo(() => {
    return visits.filter(
      (v) =>
        v.status === 'Confirmed' ||
        v.status === 'Pending' ||
        v.status === 'VISIT_CONFIRMED' ||
        v.status === 'PENDING_COLIN_REVIEW' ||
        v.status === 'AWAITING_OWNER_AVAILABILITY' ||
        v.status === 'AWAITING_COLIN_CONFIRMATION' ||
        v.status === 'VISIT_COMPLETED_DECISION_PENDING'
    );
  }, [visits]);

  // Past / History Visits
  const pastVisits = useMemo(() => {
    return visits.filter(
      (v) =>
        v.status === 'Completed' ||
        v.status === 'Cancelled' ||
        v.status === 'Visited - Rejected' ||
        v.status === 'STUDENT_ACCEPTED' ||
        v.status === 'STUDENT_REJECTED' ||
        v.status === 'DECISION_EXPIRED'
    );
  }, [visits]);

  // Countdown time formatter
  const getRemainingTimeDetails = (deadlineStr?: string) => {
    if (!deadlineStr) return { formatted: '12h 00m 00s remaining', isExpired: false, percent: 100 };
    const diff = new Date(deadlineStr).getTime() - Date.now();
    if (diff <= 0) return { formatted: '00h 00m 00s (Expired)', isExpired: true, percent: 0 };

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const totalWindowMs = 12 * 60 * 60 * 1000;
    const percentRemaining = Math.max(0, Math.min(100, Math.round((diff / totalWindowMs) * 100)));

    return {
      formatted: `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s remaining`,
      isExpired: false,
      percent: percentRemaining,
    };
  };

  // Automated notification scheduler status evaluator
  const getTriggeredReminders = (visitCompletedAt?: string) => {
    if (!visitCompletedAt) return [];
    const elapsedMs = Date.now() - new Date(visitCompletedAt).getTime();
    return DECISION_REMINDER_SCHEDULE.map((m) => ({
      ...m,
      isTriggered: elapsedMs >= m.afterMs,
    }));
  };

  // Submit Decision Handler
  const handleConfirmDecision = () => {
    if (!decisionModal) return;

    const res = submitStudentDecision(
      decisionModal.visitId,
      decisionModal.type,
      decisionModal.type === 'reject' ? rejectionReasonText || 'Room did not match scholar criteria' : undefined
    );

    setDecisionModal(null);
    setRejectionReasonText('');

    setDecisionFeedback({
      open: true,
      isAccepted: decisionModal.type === 'accept',
      title: decisionModal.type === 'accept' ? 'Accommodation Confirmed!' : 'Stay Rejected — Refund Initiated',
      message: res.message,
      refundAmount: res.refundAmount,
    });
  };

  // Legacy Cancel Outcome Handler
  const handleOpenOutcomeModal = (visitId: string) => {
    setSelectedVisitId(visitId);
    setSelectedReason('visited_rejected');
    setOutcomeModalOpen(true);
  };

  const handleConfirmOutcome = () => {
    if (!selectedVisitId) return;

    const result = cancelVisit(selectedVisitId, selectedReason);
    setOutcomeModalOpen(false);

    if (result.success) {
      setResultModal({
        open: true,
        visitId: selectedVisitId,
        refundAmount: result.refundAmount,
        isEligible: result.isEligible,
        explanation: result.explanation,
        outcomeReason: result.outcomeReason,
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-colin-charcoal-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-colin-teal bg-colin-teal/10 px-2.5 py-0.5 rounded-full border border-colin-teal/20">
              Guided Slot Passes
            </span>
            <span className="text-xs text-colin-charcoal-500 font-medium">
              100% In-Person Physical Verification
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-colin-navy tracking-tight font-display">
            My Visit Passes & Inspections
          </h1>
          <p className="text-xs text-colin-charcoal-500 max-w-xl leading-relaxed">
            Manage your scheduled in-person property inspection slots. After your on-site physical visit with a COLIN ambassador, you have a mandatory 12-hour window to submit your final Accept or Reject decision.
          </p>
        </div>

        {/* 55% Centralized Policy Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/70 p-4 rounded-2xl border border-emerald-200/80 text-xs text-emerald-950 space-y-1.5 shrink-0 max-w-sm">
          <div className="flex items-center gap-1.5 font-black text-emerald-900">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>COLIN 55% Visit Refund Guarantee</span>
          </div>
          <div className="text-[11px] text-emerald-800 space-y-0.5 leading-tight">
            <div>
              Visit Booking Fee: <strong>₹{VISIT_BOOKING_FEE.toFixed(2)}</strong>
            </div>
            <div>
              Eligible 55% Refund:{' '}
              <strong className="text-emerald-900">₹{VISIT_REFUND_AMOUNT.toFixed(2)}</strong> (if rejected within 12h)
            </div>
            <div className="text-colin-charcoal-500 text-[10px]">
              Retained Ambassador Escort Allowance: ₹{VISIT_NON_REFUNDABLE_AMOUNT.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PHASE 3A: PROMINENT 12-HOUR DECISION HERO CARD                           */}
      {/* ========================================================================= */}
      {pendingDecisionVisits.length > 0 &&
        pendingDecisionVisits.map((pendingVisit) => {
          const timeDetails = getRemainingTimeDetails(pendingVisit.decisionDeadline);
          const reminders = getTriggeredReminders(pendingVisit.visitCompletedAt);

          return (
            <div
              key={`decision-${pendingVisit.id}`}
              className="bg-gradient-to-br from-colin-navy-950 via-colin-navy to-[#1a385c] rounded-3xl p-6 sm:p-8 text-white shadow-2xl border-2 border-colin-orange/60 space-y-6 relative overflow-hidden animate-scaleUp"
            >
              {/* Decorative Glow */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-colin-orange/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/15">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-colin-orange/20 border border-colin-orange/40 text-colin-orange text-xs font-black uppercase tracking-wider">
                    <Timer size={14} className="animate-spin text-colin-orange" />
                    <span>Decision Required: 12-Hour Final Choice</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white font-display">
                    YOUR PROPERTY VISIT IS COMPLETE
                  </h2>
                  <p className="text-xs sm:text-sm text-colin-charcoal-200 max-w-2xl leading-relaxed">
                    You physically toured <strong>{pendingVisit.propertyTitle}</strong> with your assigned ambassador (
                    {pendingVisit.completedByVolunteer?.name || 'COLIN Ambassador'}). Please make your final decision
                    within the 12-hour window.
                  </p>
                </div>

                {/* Ticking Countdown HUD */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center space-y-1 shrink-0">
                  <div className="text-[10px] font-bold text-colin-charcoal-300 uppercase tracking-wider">
                    Time Remaining to Choose
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-colin-orange">
                    {timeDetails.formatted}
                  </div>
                  <div className="text-[10px] text-colin-teal-300 font-semibold">
                    {timeDetails.percent}% of decision window remaining
                  </div>
                </div>
              </div>

              {/* Property & Refund Safeguard Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                  <span className="text-colin-charcoal-400 font-semibold uppercase text-[10px]">Property & Date</span>
                  <div className="font-bold text-white text-sm truncate">{pendingVisit.propertyTitle}</div>
                  <div className="text-colin-charcoal-300 text-[11px]">
                    Completed: {new Date(pendingVisit.visitCompletedAt || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                  <span className="text-colin-charcoal-400 font-semibold uppercase text-[10px]">Booking Fee Paid</span>
                  <div className="font-bold text-white text-sm">₹{(pendingVisit.feePaid || 150).toFixed(2)}</div>
                  <div className="text-colin-charcoal-300 text-[11px]">Zero-brokerage guaranteed stay pass</div>
                </div>

                <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                  <span className="text-colin-charcoal-400 font-semibold uppercase text-[10px]">Applicable Refund</span>
                  <div className="font-black text-emerald-400 text-sm">₹82.50 (55% Guaranteed)</div>
                  <div className="text-colin-charcoal-300 text-[11px]">If you reject within the 12-hour timer</div>
                </div>
              </div>

              {/* Decision Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <Button
                  size="lg"
                  variant="primary"
                  className="w-full sm:w-auto flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3.5 shadow-lg shadow-emerald-900/30"
                  leftIcon={<Sparkles size={16} />}
                  onClick={() =>
                    setDecisionModal({
                      open: true,
                      visitId: pendingVisit.id,
                      type: 'accept',
                      propertyTitle: pendingVisit.propertyTitle,
                    })
                  }
                >
                  ACCEPT PROPERTY (Confirm Stay)
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto flex-1 bg-rose-950/40 border-rose-400/60 hover:bg-rose-900/40 text-rose-200 font-black text-sm py-3.5 shadow-lg"
                  leftIcon={<XCircle size={16} />}
                  onClick={() =>
                    setDecisionModal({
                      open: true,
                      visitId: pendingVisit.id,
                      type: 'reject',
                      propertyTitle: pendingVisit.propertyTitle,
                    })
                  }
                >
                  REJECT PROPERTY (Claim 55% Refund)
                </Button>
              </div>

              {/* Scheduled Reminder Log History */}
              <div className="pt-2 border-t border-white/10">
                <div className="text-[11px] font-bold text-colin-charcoal-300 flex items-center gap-1.5 uppercase tracking-wider mb-2">
                  <Bell size={12} className="text-colin-orange" />
                  <span>Decision Reminder Alerts Timeline</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px]">
                  {reminders.map((r) => (
                    <div
                      key={r.id}
                      className={`px-3 py-1.5 rounded-xl border whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                        r.isTriggered
                          ? 'bg-colin-orange/20 border-colin-orange/40 text-colin-orange'
                          : 'bg-white/5 border-white/10 text-colin-charcoal-400'
                      }`}
                    >
                      {r.isTriggered ? <Check size={11} /> : <Clock size={11} />}
                      <span className="font-semibold">{r.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

      {/* Decision Feedback Modal */}
      {decisionFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-colin-navy-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 border border-colin-charcoal-200 shadow-2xl text-center space-y-4 animate-scaleUp">
            <div
              className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                decisionFeedback.isAccepted ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
              }`}
            >
              {decisionFeedback.isAccepted ? <CheckCircle2 size={36} /> : <ShieldCheck size={36} />}
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-colin-navy font-display">{decisionFeedback.title}</h3>
              <p className="text-xs text-colin-charcoal-600 leading-relaxed">{decisionFeedback.message}</p>
            </div>

            {!decisionFeedback.isAccepted && (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 font-bold">
                Refund Amount Credited: ₹{decisionFeedback.refundAmount.toFixed(2)} (Simulated)
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              className="w-full font-bold"
              onClick={() => setDecisionFeedback(null)}
            >
              Continue to Stays
            </Button>
          </div>
        </div>
      )}

      {/* Decision Modal (Accept Confirmation / Reject Reason) */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-colin-navy-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 border border-colin-charcoal-200 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-colin-charcoal-100">
              <h3 className="text-lg font-black text-colin-navy">
                {decisionModal.type === 'accept' ? 'Confirm Property Acceptance' : 'Reject Property & Claim 55% Refund'}
              </h3>
              <button
                onClick={() => setDecisionModal(null)}
                className="p-1 rounded-full text-colin-charcoal-400 hover:text-colin-navy"
              >
                <X size={18} />
              </button>
            </div>

            {decisionModal.type === 'accept' ? (
              <div className="space-y-3 text-xs text-colin-charcoal-700">
                <p>
                  You are finalizing your acceptance for <strong>{decisionModal.propertyTitle}</strong>.
                </p>
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
                  <div className="font-bold text-emerald-900">What happens next:</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-emerald-800 text-[11px]">
                    <li>The owner is immediately notified to block your bed.</li>
                    <li>The full ₹150 booking charge is retained by COLIN.</li>
                    <li>Your COLIN campus coordinator assists with the rental agreement.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-colin-charcoal-700">
                <p>
                  Rejecting <strong>{decisionModal.propertyTitle}</strong> within the 12-hour window activates your{' '}
                  <strong>55% (₹82.50) refund guarantee</strong>.
                </p>

                <div className="space-y-1">
                  <label className="font-bold text-colin-charcoal-700 uppercase tracking-wide text-[10px]">
                    Reason for Rejection (Optional):
                  </label>
                  <textarea
                    value={rejectionReasonText}
                    onChange={(e) => setRejectionReasonText(e.target.value)}
                    placeholder="e.g. Room was smaller than expected, balcony was noisy..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none resize-none h-20 text-xs"
                  />
                </div>

                <div className="p-3 bg-colin-navy-50 rounded-2xl border border-colin-navy-100 flex items-center justify-between font-bold">
                  <span>Refund Return:</span>
                  <span className="text-emerald-700 font-black">₹{VISIT_REFUND_AMOUNT.toFixed(2)} (55%)</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDecisionModal(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className={
                  decisionModal.type === 'accept'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
                    : 'bg-rose-600 hover:bg-rose-700 text-white font-bold'
                }
                onClick={handleConfirmDecision}
              >
                {decisionModal.type === 'accept' ? 'Yes, Accept Property' : 'Submit Rejection & Claim Refund'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-colin-charcoal-200 pb-3">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'upcoming'
              ? 'bg-colin-navy text-white shadow-sm font-black'
              : 'bg-white text-colin-charcoal-600 hover:bg-slate-100'
          }`}
        >
          <CalendarCheck2 size={14} />
          <span>Upcoming Visits ({upcomingVisits.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-colin-navy text-white shadow-sm font-black'
              : 'bg-white text-colin-charcoal-600 hover:bg-slate-100'
          }`}
        >
          <RotateCcw size={14} />
          <span>Past / History ({pastVisits.length})</span>
        </button>
      </div>

      {/* Tab Content: Upcoming Visits */}
      {activeTab === 'upcoming' && (
        <div className="space-y-5">
          {upcomingVisits.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-colin-charcoal-200 max-w-md mx-auto my-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-colin-navy-50 text-colin-navy flex items-center justify-center mx-auto">
                <CalendarCheck2 size={26} className="text-colin-teal" />
              </div>
              <h3 className="text-lg font-bold text-colin-navy">No Upcoming Visits Scheduled</h3>
              <p className="text-xs text-colin-charcoal-500 leading-relaxed">
                You do not have any active guided inspection visits. Explore verified accommodations near your campus and reserve an inspection slot with 55% refund assurance.
              </p>
              <Link to="/student/explore" className="inline-block pt-1">
                <Button variant="primary" size="sm">
                  Find Accommodations Near Campus
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {upcomingVisits.map((visit) => {
                const property = PROPERTIES.find((p) => p.id === visit.propertyId);
                const feePaid = visit.feePaid || property?.visitSlotFee || VISIT_BOOKING_FEE;
                const isDecisionPending = visit.status === 'VISIT_COMPLETED_DECISION_PENDING';

                return (
                  <div
                    key={visit.id}
                    className="bg-white rounded-3xl border border-colin-charcoal-200/90 shadow-brand overflow-hidden flex flex-col justify-between"
                  >
                    {/* Digital Pass Header */}
                    <div className="bg-gradient-to-r from-colin-navy to-colin-navy-900 text-white p-5 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-colin-teal-200 block">
                          COLIN Guided Visit Pass
                        </span>
                        <div className="text-base font-black font-display tracking-tight text-white flex items-center gap-2">
                          <span>Ref:</span>
                          <span className="text-colin-orange font-mono">
                            {visit.bookingReference || visit.id}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 ${
                          isDecisionPending
                            ? 'text-purple-300 bg-purple-950/80 border border-purple-500/40 animate-pulse'
                            : visit.status === 'AWAITING_OWNER_AVAILABILITY' || visit.status === 'PENDING_COLIN_REVIEW'
                            ? 'text-amber-300 bg-amber-950/60 border border-amber-500/40'
                            : 'text-emerald-300 bg-emerald-950/60 border border-emerald-500/40'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isDecisionPending
                              ? 'bg-purple-400'
                              : visit.status === 'AWAITING_OWNER_AVAILABILITY' || visit.status === 'PENDING_COLIN_REVIEW'
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          } animate-pulse`}
                        />
                        <span>
                          {isDecisionPending
                            ? 'Decision Pending (12h)'
                            : visit.status === 'AWAITING_OWNER_AVAILABILITY'
                            ? 'Awaiting Host Availability'
                            : visit.status === 'PENDING_COLIN_REVIEW'
                            ? 'Under COLIN Review'
                            : visit.status === 'AWAITING_COLIN_CONFIRMATION'
                            ? 'Coordinating Ambassador'
                            : 'Confirmed Visit'}
                        </span>
                      </span>
                    </div>

                    {/* Pass Body */}
                    <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3.5">
                          {property && (
                            <img
                              src={property.featuredImage}
                              alt={property.title}
                              className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-colin-charcoal-200"
                            />
                          )}
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-colin-teal uppercase block">
                              {property?.categoryLabel || 'Student Stay'} • {visit.propertyCity || property?.city}
                            </span>
                            <Link to={`/student/property/${visit.propertyId}`}>
                              <h3 className="font-extrabold text-sm sm:text-base text-colin-navy hover:text-colin-teal transition-colors line-clamp-1">
                                {visit.propertyTitle}
                              </h3>
                            </Link>
                            <p className="text-xs text-colin-charcoal-500 truncate mt-0.5">
                              {property?.neighborhood}, {property?.landmark}
                            </p>
                          </div>
                        </div>

                        {/* Timing and Meeting Details */}
                        <div className="bg-colin-offwhite rounded-2xl p-4 border border-colin-charcoal-200/80 space-y-2 text-xs">
                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-colin-charcoal-500 font-semibold flex items-center gap-1.5">
                              <Calendar size={13} className="text-colin-teal" />
                              <span>Scheduled Date:</span>
                            </span>
                            <span className="font-extrabold text-colin-navy">{visit.date}</span>
                          </div>

                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-colin-charcoal-500 font-semibold flex items-center gap-1.5">
                              <Clock size={13} className="text-colin-teal" />
                              <span>Slot Window:</span>
                            </span>
                            <span className="font-extrabold text-colin-navy">{visit.timeSlot}</span>
                          </div>

                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-colin-charcoal-500 font-semibold flex items-center gap-1.5">
                              <User size={13} className="text-colin-teal" />
                              <span>Assigned Ambassador:</span>
                            </span>
                            <span className="font-bold text-colin-navy">
                              {visit.assignedVolunteer?.name || visit.meetingGuideName || 'COLIN Ambassador'}
                            </span>
                          </div>

                          <div className="flex justify-between items-center py-0.5 border-t border-colin-charcoal-200/60 pt-1.5">
                            <span className="text-colin-charcoal-500 font-semibold">Visit Booking Fee:</span>
                            <span className="font-extrabold text-colin-navy">₹{feePaid.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* 55% Refund Policy Banner */}
                        <div className="p-3 bg-colin-teal/10 rounded-2xl border border-colin-teal/20 text-[11px] text-colin-teal-950 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-colin-teal-900">
                            <ShieldCheck size={14} className="text-colin-teal shrink-0" />
                            <span>55% Refund Policy Active:</span>
                          </div>
                          <p className="text-colin-charcoal-700 leading-snug">
                            If you physically visit this property and the room does not meet your expectations,{' '}
                            <strong>₹{VISIT_REFUND_AMOUNT.toFixed(2)} (55%)</strong> will be refunded within your
                            12-hour decision window.
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-3 border-t border-colin-charcoal-100 flex items-center gap-2">
                        <Link to={`/student/property/${visit.propertyId}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full justify-center text-xs">
                            View Property Specs
                          </Button>
                        </Link>

                        <button
                          onClick={() => handleOpenOutcomeModal(visit.id)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                        >
                          Cancel / Visit Outcome
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {pastVisits.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-colin-charcoal-200 max-w-md mx-auto my-6 text-xs text-colin-charcoal-500">
              No previous visit passes recorded.
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-colin-charcoal-200/90 shadow-sm overflow-hidden">
              <div className="divide-y divide-colin-charcoal-100">
                {pastVisits.map((visit) => {
                  const isAccepted = visit.status === 'STUDENT_ACCEPTED';
                  const isRejected = visit.status === 'STUDENT_REJECTED' || visit.status === 'Visited - Rejected';
                  const isExpired = visit.status === 'DECISION_EXPIRED';
                  const isCancelled = visit.status === 'Cancelled';

                  return (
                    <div
                      key={visit.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-colin-navy font-mono">
                            {visit.bookingReference || visit.id}
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                              isAccepted
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : isRejected
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : isExpired
                                ? 'bg-slate-100 text-slate-800 border border-slate-300'
                                : isCancelled
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {isAccepted
                              ? 'Booking Finalized'
                              : isRejected
                              ? 'Stay Rejected'
                              : isExpired
                              ? 'Decision Expired'
                              : visit.status}
                          </span>

                          {visit.outcomeReason && (
                            <span className="text-[10px] text-colin-charcoal-600 bg-colin-offwhite px-2 py-0.5 rounded border border-colin-charcoal-200">
                              {visit.outcomeReason}
                            </span>
                          )}

                          {isRejected ? (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              ₹{VISIT_REFUND_AMOUNT.toFixed(2)} Refunded (55% Guaranteed Policy)
                            </span>
                          ) : isExpired ? (
                            <span className="text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              ₹150.00 Non-Refundable (12h Expiration)
                            </span>
                          ) : null}
                        </div>

                        <h4 className="font-bold text-sm text-colin-navy">{visit.propertyTitle}</h4>
                        <p className="text-colin-charcoal-500">
                          {visit.date} • {visit.timeSlot} • Booking Fee: ₹{(visit.feePaid || VISIT_BOOKING_FEE).toFixed(2)}
                        </p>
                      </div>

                      <Link to={`/student/property/${visit.propertyId}`}>
                        <Button variant="outline" size="sm" className="text-xs">
                          View Stay Again
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Outcome / Cancellation Selection Modal (Phase 2 legacy) */}
      {outcomeModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-colin-navy-950/75 backdrop-blur-sm animate-fadeIn"
          onClick={() => setOutcomeModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 border border-colin-charcoal-200 shadow-2xl space-y-5 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-colin-charcoal-100">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-colin-teal" />
                <h3 className="text-lg font-black text-colin-navy font-display">Manage Visit & Refund Eligibility</h3>
              </div>
              <button
                onClick={() => setOutcomeModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-colin-charcoal-600 leading-relaxed">
                COLIN provides a structured <strong>55% refund guarantee</strong> when a student completes an on-site
                physical inspection and decides not to proceed. Please indicate your visit outcome:
              </p>
            </div>

            {/* 4 Outcome Options */}
            <div className="space-y-2.5">
              {(Object.keys(VISIT_OUTCOME_OPTIONS) as VisitOutcomeReason[]).map((key) => {
                const opt = VISIT_OUTCOME_OPTIONS[key];
                const isSelected = selectedReason === key;

                return (
                  <div
                    key={key}
                    onClick={() => setSelectedReason(key)}
                    className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? opt.isEligibleForRefund
                          ? 'bg-emerald-50/80 border-emerald-400 shadow-sm ring-1 ring-emerald-400'
                          : 'bg-colin-navy-50/80 border-colin-navy-300 shadow-sm ring-1 ring-colin-navy'
                        : 'bg-colin-offwhite/60 border-colin-charcoal-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-colin-navy bg-colin-navy' : 'border-slate-400'
                            }`}
                          >
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                          <span className="font-extrabold text-colin-navy text-xs">{opt.label}</span>
                        </div>
                        <p className="text-[11px] text-colin-charcoal-600 pl-5.5 leading-snug">{opt.explanation}</p>
                      </div>

                      {opt.isEligibleForRefund ? (
                        <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0 border border-emerald-300">
                          55% Refund (₹{opt.refundAmount.toFixed(2)})
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full shrink-0">
                          ₹0.00 Refund
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Refund Math Breakdown Box */}
            <div className="bg-colin-offwhite rounded-2xl p-4 border border-colin-charcoal-200 space-y-2 text-xs">
              <div className="flex justify-between text-colin-charcoal-600 font-semibold">
                <span>Total Visit Booking Fee:</span>
                <span className="font-bold text-colin-navy">₹{VISIT_BOOKING_FEE.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-colin-charcoal-600 font-semibold">
                <span>Applicable Refund Percentage:</span>
                <span className="font-bold text-colin-navy">
                  {VISIT_OUTCOME_OPTIONS[selectedReason].isEligibleForRefund ? '55%' : '0%'}
                </span>
              </div>
              <div className="flex justify-between border-t border-colin-charcoal-200 pt-1.5 font-bold">
                <span className="text-colin-navy">Calculated Refund Return:</span>
                <span
                  className={`text-sm font-black ${
                    VISIT_OUTCOME_OPTIONS[selectedReason].isEligibleForRefund
                      ? 'text-emerald-700'
                      : 'text-colin-charcoal-500'
                  }`}
                >
                  ₹{VISIT_OUTCOME_OPTIONS[selectedReason].refundAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setOutcomeModalOpen(false)}>
                Dismiss
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmOutcome}>
                Confirm Cancellation & Policy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Result Modal */}
      {resultModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-colin-navy-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 border border-colin-charcoal-200 shadow-2xl text-center space-y-4 animate-scaleUp">
            <div
              className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                resultModal.isEligible ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {resultModal.isEligible ? <CheckCircle2 size={36} /> : <AlertTriangle size={36} />}
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-colin-navy font-display">
                {resultModal.isEligible ? '55% Refund Approved' : 'Slot Cancelled'}
              </h3>
              <p className="text-xs text-colin-charcoal-600 leading-relaxed">{resultModal.explanation}</p>
            </div>

            {resultModal.isEligible && (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 font-bold">
                Simulated Credit: ₹{resultModal.refundAmount.toFixed(2)} (55% Guarantee)
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              className="w-full font-bold"
              onClick={() => setResultModal({ ...resultModal, open: false })}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
