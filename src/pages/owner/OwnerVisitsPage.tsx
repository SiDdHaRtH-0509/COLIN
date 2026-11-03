import React, { useState, useMemo } from 'react';
import { useProperties } from '../../context/PropertyContext';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  ShieldCheck,
  SlidersHorizontal,
  X,
  Trash2,
  Calendar,
} from 'lucide-react';
import { Button } from '../../components/common/Button';

export const OwnerVisitsPage: React.FC = () => {
  const {
    visits,
    updateVisitStatus,
    approveVisit,
    rejectVisit,
    availableInspectionSlots,
    updateAvailableInspectionSlots,
  } = useProperties();

  // Tabs: Upcoming, Completed, Cancelled
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');

  // Slots Management Modal
  const [isSlotsModalOpen, setIsSlotsModalOpen] = useState(false);
  const [newSlotText, setNewSlotText] = useState('');

  // Rejection Dialog
  const [rejectingVisitId, setRejectingVisitId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Owner unavailable for requested time slot');

  // Filtered Visits
  const upcomingVisits = useMemo(() => {
    return visits.filter((v) => v.status === 'Confirmed' || v.status === 'Pending');
  }, [visits]);

  const completedVisits = useMemo(() => {
    return visits.filter((v) => v.status === 'Completed');
  }, [visits]);

  const cancelledVisits = useMemo(() => {
    return visits.filter((v) => v.status === 'Cancelled' || v.status === 'Visited - Rejected');
  }, [visits]);

  const currentList = activeTab === 'upcoming' ? upcomingVisits : activeTab === 'completed' ? completedVisits : cancelledVisits;

  // Add a new slot
  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotText.trim()) return;
    updateAvailableInspectionSlots([...availableInspectionSlots, newSlotText.trim()]);
    setNewSlotText('');
  };

  // Remove a slot
  const handleRemoveSlot = (slot: string) => {
    updateAvailableInspectionSlots(availableInspectionSlots.filter((s) => s !== slot));
  };

  // Confirm Rejection
  const handleConfirmRejection = () => {
    if (!rejectingVisitId) return;
    rejectVisit(rejectingVisitId, rejectionReason);
    setRejectingVisitId(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-colin-navy font-display flex items-center gap-2">
            <CalendarCheck size={28} className="text-emerald-600" />
            <span>Visit Management</span>
          </h1>
          <p className="text-xs text-colin-charcoal-500 mt-1">
            Review student in-person inspection appointments, approve visit passes, and set verified property inspection windows.
          </p>
        </div>

        <Button
          variant="outline"
          size="md"
          onClick={() => setIsSlotsModalOpen(true)}
          className="text-xs font-bold self-start sm:self-auto border-colin-charcoal-300"
          leftIcon={<SlidersHorizontal size={14} />}
        >
          Manage Inspection Slots ({availableInspectionSlots.length})
        </Button>
      </div>

      {/* Trust & Policy Ribbon */}
      <div className="bg-gradient-to-r from-colin-navy to-colin-navy-900 rounded-3xl p-5 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-colin-orange shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-colin-orange">
              COLIN Guaranteed Visit Policy
            </h2>
            <p className="text-xs text-colin-charcoal-200">
              Students pay a <strong>₹150.00 Visit Booking Fee</strong> upfront. If the student physically inspects and decides not to proceed, COLIN guarantees a <strong>55% (₹82.50) refund</strong>, retaining ₹67.50 for student accompaniment expenses.
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-bold text-colin-teal-300 shrink-0">
          Zero Fake Leads Guarantee
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-colin-charcoal-200 pb-2">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`text-xs font-extrabold px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
            activeTab === 'upcoming'
              ? 'bg-colin-navy text-white shadow-sm'
              : 'text-colin-charcoal-600 hover:bg-colin-charcoal-100'
          }`}
        >
          <span>Upcoming Visits</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-600 text-white">
            {upcomingVisits.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`text-xs font-extrabold px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
            activeTab === 'completed'
              ? 'bg-colin-navy text-white shadow-sm'
              : 'text-colin-charcoal-600 hover:bg-colin-charcoal-100'
          }`}
        >
          <span>Completed ({completedVisits.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cancelled')}
          className={`text-xs font-extrabold px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
            activeTab === 'cancelled'
              ? 'bg-colin-navy text-white shadow-sm'
              : 'text-colin-charcoal-600 hover:bg-colin-charcoal-100'
          }`}
        >
          <span>Cancelled / Rejected ({cancelledVisits.length})</span>
        </button>
      </div>

      {/* Visits List */}
      {currentList.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-colin-charcoal-200 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-colin-navy-50 text-colin-navy flex items-center justify-center mx-auto">
            <CalendarCheck size={32} className="text-colin-charcoal-400" />
          </div>
          <h3 className="text-base font-extrabold text-colin-navy">No {activeTab} visits</h3>
          <p className="text-xs text-colin-charcoal-500 max-w-sm mx-auto">
            {activeTab === 'upcoming'
              ? 'No student visit bookings are currently pending or confirmed.'
              : `There are no ${activeTab} visits in your appointment records.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {currentList.map((visit) => {
            const isPending = visit.status === 'Pending';
            const isConfirmed = visit.status === 'Confirmed';
            const isCompleted = visit.status === 'Completed';

            return (
              <div
                key={visit.id}
                className="bg-white rounded-3xl border border-colin-charcoal-200 shadow-sm p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top: Student Name & Status */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-colin-navy">
                        {visit.studentName}
                      </h3>
                      <span className="text-xs text-colin-charcoal-500 font-semibold">
                        {visit.studentPhone}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        isConfirmed
                          ? 'bg-emerald-100 text-emerald-800'
                          : isPending
                          ? 'bg-amber-100 text-amber-800'
                          : isCompleted
                          ? 'bg-colin-teal/15 text-colin-teal-700'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {visit.status}
                    </span>
                  </div>

                  {/* Property & Appointment Box */}
                  <div className="p-3 bg-colin-offwhite rounded-2xl border border-colin-charcoal-100 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-colin-navy">
                      <Building2 size={13} className="text-colin-teal shrink-0" />
                      <span className="truncate">{visit.propertyTitle}</span>
                    </div>

                    <div className="flex items-center justify-between text-colin-charcoal-600 text-[11px] pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {visit.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {visit.timeSlot}
                      </span>
                    </div>
                  </div>

                  {/* Commercial Policy Note */}
                  <div className="text-[11px] text-colin-charcoal-500 flex items-center justify-between pt-1">
                    <span>Visit Pass Fee: <strong className="text-colin-navy">₹{visit.feePaid}</strong></span>
                    <span className="text-emerald-700 font-bold">55% Refund Guard</span>
                  </div>

                  {visit.outcomeReason && (
                    <div className="p-2.5 bg-rose-50 rounded-xl text-xs text-rose-700 border border-rose-100">
                      <strong>Cancellation Reason:</strong> {visit.outcomeReason}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                {activeTab === 'upcoming' && (
                  <div className="pt-3 border-t border-colin-charcoal-100 flex items-center justify-between gap-2">
                    {isPending && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => approveVisit(visit.id)}
                          leftIcon={<CheckCircle2 size={13} />}
                        >
                          Approve Visit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200"
                          onClick={() => setRejectingVisitId(visit.id)}
                        >
                          Reject
                        </Button>
                      </>
                    )}

                    {isConfirmed && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1 text-xs font-bold bg-colin-navy hover:bg-colin-navy-800"
                          onClick={() => updateVisitStatus(visit.id, 'Completed')}
                          leftIcon={<CheckCircle2 size={13} />}
                        >
                          Mark Visited / Done
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs font-bold text-rose-600 hover:bg-rose-50"
                          onClick={() => setRejectingVisitId(visit.id)}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MANAGE INSPECTION SLOTS MODAL ================= */}
      {isSlotsModalOpen && (
        <div className="fixed inset-0 z-50 bg-colin-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-colin-charcoal-200 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-colin-charcoal-100">
              <div className="flex items-center gap-2 text-colin-navy">
                <Clock size={18} className="text-colin-teal" />
                <h3 className="text-base font-black">Available Visit Time Slots</h3>
              </div>
              <button onClick={() => setIsSlotsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-colin-charcoal-500">
              Configure daily inspection windows when student visitors and COLIN student guides can tour your properties.
            </p>

            {/* Existing Slots */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableInspectionSlots.map((slot) => (
                <div
                  key={slot}
                  className="flex items-center justify-between p-2.5 bg-colin-offwhite rounded-xl border border-colin-charcoal-200 text-xs font-bold text-colin-navy"
                >
                  <span className="flex items-center gap-2">
                    <Clock size={13} className="text-colin-charcoal-400" />
                    {slot}
                  </span>
                  <button
                    onClick={() => handleRemoveSlot(slot)}
                    className="text-rose-500 hover:text-rose-700 p-1"
                    title="Remove Slot"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Slot Form */}
            <form onSubmit={handleAddSlot} className="pt-2 border-t border-colin-charcoal-100 space-y-2">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                Add Custom Time Window
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 06:00 PM - 08:00 PM"
                  value={newSlotText}
                  onChange={(e) => setNewSlotText(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy"
                />
                <Button type="submit" variant="primary" size="sm" className="bg-colin-navy hover:bg-colin-navy-800">
                  Add Slot
                </Button>
              </div>
            </form>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setIsSlotsModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= REJECT VISIT MODAL ================= */}
      {rejectingVisitId && (
        <div className="fixed inset-0 z-50 bg-colin-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-colin-charcoal-200 shadow-2xl space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle size={24} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-colin-navy">Decline Visit Request?</h3>
              <p className="text-xs text-colin-charcoal-500">
                The student will receive an instant notification and full refund of their ₹150 visit fee.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                Reason for Rejection
              </label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none bg-white font-medium"
              >
                <option value="Owner unavailable for requested time slot">Owner unavailable for requested slot</option>
                <option value="All beds currently filled">All beds currently filled</option>
                <option value="Maintenance ongoing in selected wing">Maintenance ongoing in selected wing</option>
                <option value="Other mutual rescheduling required">Other mutual rescheduling required</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setRejectingVisitId(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                onClick={handleConfirmRejection}
              >
                Confirm Decline
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
