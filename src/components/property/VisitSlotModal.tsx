import React, { useState } from 'react';
import { Property, VisitBooking } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  X, 
  CheckCircle2, 
  CreditCard
} from 'lucide-react';
import { Button } from '../common/Button';

interface VisitSlotModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
}

export const VisitSlotModal: React.FC<VisitSlotModalProps> = ({ property, isOpen, onClose }) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState('Tomorrow, Nov 2');
  const [selectedSlot, setSelectedSlot] = useState('11:00 AM - 12:30 PM');
  const [studentPhone, setStudentPhone] = useState(user?.phone || '+91 98765 43210');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<VisitBooking | null>(null);

  if (!isOpen) return null;

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((res) => setTimeout(res, 800));

    const booking: VisitBooking = {
      id: `VSLOT-${Math.floor(100000 + Math.random() * 900000)}`,
      propertyId: property.id,
      propertyTitle: property.title,
      date: selectedDate,
      timeSlot: selectedSlot,
      studentName: user?.name || 'Student Scholar',
      studentPhone: studentPhone,
      status: 'Confirmed',
      feePaid: property.visitSlotFee,
      refundPolicy: '55% guaranteed instant refund if you do not finalize this property after your in-person visit.',
    };

    setConfirmedBooking(booking);
    setIsSubmitting(false);
  };

  const handleReset = () => {
    setConfirmedBooking(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-colin-navy-950/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-colin-charcoal-200 overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-colin-navy to-colin-teal p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-white/70 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-colin-orange">
            <Sparkles size={14} />
            <span>COLIN In-Person Visit Slot</span>
          </div>

          <h3 className="text-xl font-extrabold text-white leading-tight">
            Book Guided Visit & Inspection
          </h3>
          <p className="text-xs text-colin-teal-100 mt-1 truncate">
            {property.title} • {property.neighborhood}
          </p>
        </div>

        {confirmedBooking ? (
          /* Confirmation Receipt View */
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-colin-teal/15 text-colin-teal rounded-full mx-auto flex items-center justify-center">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-colin-teal uppercase tracking-wider">
                Visit Slot Confirmed!
              </span>
              <h4 className="text-xl font-extrabold text-colin-navy">
                Slot Pass ID: {confirmedBooking.id}
              </h4>
              <p className="text-xs text-colin-charcoal-600 max-w-sm mx-auto">
                A verified COLIN student ambassador will meet you at the property. The owner ({property.ownerName}) has been notified.
              </p>
            </div>

            <div className="bg-colin-navy-50/70 border border-colin-navy-100 rounded-2xl p-4 text-left text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-colin-navy-100">
                <span className="text-colin-charcoal-500 font-medium">Slot Timing:</span>
                <span className="font-bold text-colin-navy">{confirmedBooking.date} • {confirmedBooking.timeSlot}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-colin-navy-100">
                <span className="text-colin-charcoal-500 font-medium">Meeting Point:</span>
                <span className="font-bold text-colin-navy">{property.landmark}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-colin-navy-100">
                <span className="text-colin-charcoal-500 font-medium">Slot Fee:</span>
                <span className="font-bold text-colin-navy">₹{confirmedBooking.feePaid} (Simulated Demo)</span>
              </div>
              <div className="pt-1 text-[11px] text-colin-teal-800 font-semibold flex items-start gap-1.5">
                <ShieldCheck size={14} className="shrink-0 text-colin-teal mt-0.5" />
                <span>55% Refund Guarantee Active: If you choose not to proceed after your visit, ₹165 will be refunded instantly to your original payment method.</span>
              </div>
            </div>

            <Button variant="primary" className="w-full" onClick={handleReset}>
              Done & Return to Property
            </Button>
          </div>
        ) : (
          /* Slot Booking Form */
          <form onSubmit={handleBooking} className="p-6 sm:p-8 space-y-5">
            {/* Slot Dates */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-colin-charcoal-700 flex items-center gap-1.5 uppercase tracking-wider">
                <Calendar size={14} className="text-colin-teal" />
                <span>Select Visit Date:</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Today, Nov 1', 'Tomorrow, Nov 2', 'Mon, Nov 3'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDate(d)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      selectedDate === d
                        ? 'bg-colin-navy text-white border-colin-navy shadow-sm'
                        : 'bg-colin-charcoal-50 text-colin-charcoal-700 border-colin-charcoal-200 hover:bg-colin-charcoal-100'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slots */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-colin-charcoal-700 flex items-center gap-1.5 uppercase tracking-wider">
                <Clock size={14} className="text-colin-teal" />
                <span>Select Time Slot:</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  '10:00 AM - 11:30 AM',
                  '11:30 AM - 01:00 PM',
                  '02:30 PM - 04:00 PM',
                  '05:00 PM - 06:30 PM',
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSlot(s)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border text-center ${
                      selectedSlot === s
                        ? 'bg-colin-teal text-white border-colin-teal shadow-sm'
                        : 'bg-colin-charcoal-50 text-colin-charcoal-700 border-colin-charcoal-200 hover:bg-colin-charcoal-100'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Student Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                Confirmation WhatsApp / Mobile:
              </label>
              <input
                type="tel"
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
                required
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none"
                placeholder="+91 98765 43210"
              />
            </div>

            {/* 55% Refund Policy Banner (from Business Model Doc) */}
            <div className="bg-colin-orange/10 border border-colin-orange/40 rounded-2xl p-3.5 text-xs text-colin-charcoal-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-colin-orange-900">
                <ShieldCheck size={16} className="text-colin-orange-700" />
                <span>COLIN Visit Commitment & 55% Refund Guarantee:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-colin-charcoal-700 pl-5">
                A nominal ₹{property.visitSlotFee} slot deposit connects you directly with the verified owner and a COLIN visit guide. <strong>If you decide not to rent this accommodation after visiting, 55% (₹165) will be refunded immediately</strong> to your UPI / card. If you rent it, the full deposit applies towards your booking.
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="accent"
                className="w-full text-colin-navy-950 font-extrabold"
                isLoading={isSubmitting}
                rightIcon={<CreditCard size={16} />}
              >
                Confirm Slot (₹{property.visitSlotFee} Demo Checkout)
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
