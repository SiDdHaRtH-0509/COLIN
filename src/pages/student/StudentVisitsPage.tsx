import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudent } from '../../context/StudentContext';
import { PROPERTIES } from '../../data/mockData';
import {
  VISIT_BOOKING_FEE,
  VISIT_REFUND_AMOUNT,
  VISIT_NON_REFUNDABLE_AMOUNT,
  VISIT_OUTCOME_OPTIONS,
  VisitOutcomeReason
} from '../../constants/booking';
import {
  CalendarCheck2,
  Clock,
  ShieldCheck,
  User,
  Calendar,
  CheckCircle2,
  RotateCcw,
  Info,
  X
} from 'lucide-react';
import { Button } from '../../components/common/Button';

export const StudentVisitsPage: React.FC = () => {
  const { visits, cancelVisit } = useStudent();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  // Cancel / Outcome Modal State
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

  const upcomingVisits = visits.filter((v) => v.status === 'Confirmed' || v.status === 'Pending');
  const pastVisits = visits.filter(
    (v) => v.status === 'Completed' || v.status === 'Cancelled' || v.status === 'Visited - Rejected'
  );

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
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
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
            Manage your scheduled in-person property inspection slots. If you complete your on-site visit and decide not to take the room, COLIN guarantees an eligible 55% refund.
          </p>
        </div>

        {/* 55% Centralized Policy Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/70 p-4 rounded-2xl border border-emerald-200/80 text-xs text-emerald-950 space-y-1.5 shrink-0 max-w-sm">
          <div className="flex items-center gap-1.5 font-black text-emerald-900">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>COLIN 55% Visit Refund Guarantee</span>
          </div>
          <div className="text-[11px] text-emerald-800 space-y-0.5 leading-tight">
            <div>Visit Booking Fee: <strong>₹{VISIT_BOOKING_FEE.toFixed(2)}</strong></div>
            <div>Eligible 55% Refund: <strong className="text-emerald-900">₹{VISIT_REFUND_AMOUNT.toFixed(2)}</strong></div>
            <div className="text-colin-charcoal-500 text-[10px]">Remaining Ambassador Allowance: ₹{VISIT_NON_REFUNDABLE_AMOUNT.toFixed(2)}</div>
          </div>
        </div>
      </div>

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
                          <span>Pass ID:</span>
                          <span className="text-colin-orange">{visit.id}</span>
                        </div>
                      </div>

                      <span className="text-xs font-black text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Confirmed</span>
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
                              <span>Guide / Host:</span>
                            </span>
                            <span className="font-bold text-colin-navy">
                              {visit.meetingGuideName || property?.ownerName || 'COLIN Ambassador'}
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
                            If you physically visit this property and the room does not meet your expectations, <strong>₹{VISIT_REFUND_AMOUNT.toFixed(2)} (55%)</strong> will be refunded. (Remaining ₹{VISIT_NON_REFUNDABLE_AMOUNT.toFixed(2)} covers ambassador on-site coordination).
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
                  const isRejected55 = visit.status === 'Visited - Rejected';
                  const isCancelled = visit.status === 'Cancelled';

                  return (
                    <div key={visit.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-colin-navy">{visit.id}</span>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                              isRejected55
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : isCancelled
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {visit.status}
                          </span>

                          {visit.outcomeReason && (
                            <span className="text-[10px] text-colin-charcoal-600 bg-colin-offwhite px-2 py-0.5 rounded border border-colin-charcoal-200">
                              {visit.outcomeReason}
                            </span>
                          )}

                          {visit.refundedAmount && visit.refundedAmount > 0 ? (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              ₹{visit.refundedAmount.toFixed(2)} Refunded (55% Eligible Policy)
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              Non-Refundable under Policy
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-sm text-colin-navy">
                          {visit.propertyTitle}
                        </h4>
                        <p className="text-colin-charcoal-500">
                          {visit.date} • {visit.timeSlot} • Booking Fee Paid: ₹{(visit.feePaid || VISIT_BOOKING_FEE).toFixed(2)}
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

      {/* Outcome / Cancellation Selection Modal */}
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
                <h3 className="text-lg font-black text-colin-navy font-display">
                  Manage Visit & Refund Eligibility
                </h3>
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
                COLIN provides a structured <strong>55% refund guarantee</strong> when a student completes an on-site physical inspection and decides not to proceed. Please indicate your visit outcome:
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
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-colin-navy bg-colin-navy' : 'border-slate-400'
                          }`}>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                          <span className="font-extrabold text-colin-navy text-xs">
                            {opt.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-colin-charcoal-600 pl-5.5 leading-snug">
                          {opt.explanation}
                        </p>
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
                <span className={`text-sm font-black ${
                  VISIT_OUTCOME_OPTIONS[selectedReason].isEligibleForRefund ? 'text-emerald-700' : 'text-colin-charcoal-700'
                }`}>
                  ₹{VISIT_OUTCOME_OPTIONS[selectedReason].refundAmount.toFixed(2)}
                </span>
              </div>
              {VISIT_OUTCOME_OPTIONS[selectedReason].isEligibleForRefund && (
                <div className="text-[10px] text-colin-charcoal-500 flex items-center justify-between pt-0.5">
                  <span>Non-Refundable Ambassador Fee:</span>
                  <span className="font-bold">₹{VISIT_NON_REFUNDABLE_AMOUNT.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Dialog Actions */}
            <div className="flex items-center gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 justify-center"
                onClick={() => setOutcomeModalOpen(false)}
              >
                Keep Visit Active
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1 justify-center"
                onClick={handleConfirmOutcome}
              >
                Confirm & Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Outcome Result Confirmation Modal */}
      {resultModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-colin-navy-950/75 backdrop-blur-sm animate-fadeIn"
          onClick={() => setResultModal((prev) => ({ ...prev, open: false }))}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 border border-colin-charcoal-200 shadow-2xl space-y-5 text-center animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                resultModal.isEligible ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {resultModal.isEligible ? <CheckCircle2 size={36} /> : <Info size={36} />}
            </div>

            <div className="space-y-1.5">
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                  resultModal.isEligible
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                    : 'text-slate-700 bg-slate-100'
                }`}
              >
                {resultModal.isEligible ? '55% Refund Applied (₹82.50)' : 'Visit Updated (₹0.00 Refund)'}
              </span>
              <h3 className="text-xl font-extrabold text-colin-navy">
                {resultModal.isEligible ? 'Visit Slot Guarantee Processed' : 'Slot Pass Cancelled'}
              </h3>
              <p className="text-xs text-colin-charcoal-600 max-w-sm mx-auto leading-relaxed">
                {resultModal.explanation}
              </p>
            </div>

            <div className="p-3 bg-colin-offwhite rounded-2xl border border-colin-charcoal-200 text-left text-xs space-y-1.5">
              <div className="flex justify-between py-0.5">
                <span className="text-colin-charcoal-500">Visit Pass Ref:</span>
                <span className="font-bold text-colin-navy">{resultModal.visitId}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-colin-charcoal-500">Recorded Reason:</span>
                <span className="font-bold text-colin-navy">{resultModal.outcomeReason}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-colin-charcoal-500">Original Fee Paid:</span>
                <span className="font-bold text-colin-navy">₹{VISIT_BOOKING_FEE.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-0.5 border-t border-colin-charcoal-200 pt-1">
                <span className="text-colin-charcoal-500 font-bold">Simulated Refund Return:</span>
                <span className="font-black text-emerald-700 text-sm">
                  ₹{resultModal.refundAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => setResultModal((prev) => ({ ...prev, open: false }))}
            >
              Done & Return to Passes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
