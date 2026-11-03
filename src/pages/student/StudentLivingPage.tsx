import React, { useState } from 'react';
import { COLIN_LIVING_SERVICES } from '../../data/mockData';
import { LivingService } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  X,
  Info,
} from 'lucide-react';
import { Button } from '../../components/common/Button';

export const StudentLivingPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<LivingService | null>(null);
  const [bookingDate, setBookingDate] = useState('Tomorrow');
  const [roomAddress, setRoomAddress] = useState('Plot 42-B, Hudson Lane, Room 204');
  const [studentContact, setStudentContact] = useState(user?.phone || '+91 98765 43210');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState('');

  const categories = [
    { id: 'all', label: 'All Services' },
    { id: 'laundry', label: 'Laundry Care' },
    { id: 'cleaning', label: 'Deep Cleaning' },
    { id: 'transport', label: 'Campus Transit' },
    { id: 'internet', label: 'Internet Boost' },
    { id: 'repairs', label: 'Room Repairs' },
    { id: 'moving', label: 'Moving & Shifting' },
  ];

  const filteredServices = selectedCategory === 'all'
    ? COLIN_LIVING_SERVICES
    : COLIN_LIVING_SERVICES.filter((s) => s.category === selectedCategory);

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `SRV-${Math.floor(100000 + Math.random() * 900000)}`;
    setConfirmedBookingId(id);
    setBookingConfirmed(true);
  };

  const handleResetModal = () => {
    setSelectedService(null);
    setBookingConfirmed(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* 1. Hero Header */}
      <div className="relative bg-gradient-to-r from-colin-navy-950 via-colin-navy to-purple-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl overflow-hidden border border-colin-navy-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-colin-teal/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-200 border border-purple-400/40 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            <Sparkles size={14} className="text-colin-orange" />
            <span>Campus Lifestyle & Student Living Services</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-display text-white">
            Everything You Need Outside the Classroom
          </h1>

          <p className="text-xs sm:text-sm text-colin-charcoal-200 leading-relaxed">
            From doorstep express laundry and room sanitization to metro shuttle passes and luggage relocation. Curated partner services exclusively verified for COLIN student residents.
          </p>

          <div className="flex items-center gap-2 pt-2 text-xs text-purple-200 font-semibold">
            <Info size={14} className="shrink-0" />
            <span>All partner profiles and booking actions are simulated prototype integrations.</span>
          </div>
        </div>
      </div>

      {/* 2. Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all border ${
              selectedCategory === c.id
                ? 'bg-colin-navy text-white border-colin-navy shadow-brand scale-102'
                : 'bg-white text-colin-charcoal-700 border-colin-charcoal-200 hover:bg-slate-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 3. Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => (
          <div
            key={service.id}
            className="bg-white rounded-3xl border border-colin-charcoal-200/90 shadow-brand hover:shadow-brand-hover transition-all duration-300 overflow-hidden flex flex-col justify-between group"
          >
            {/* Image */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
              <img
                src={service.image}
                alt={service.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                <span className="text-[10px] font-black uppercase text-colin-navy-950 bg-colin-teal px-2.5 py-1 rounded-lg shadow-sm">
                  {service.categoryLabel}
                </span>

                {service.isPopular && (
                  <span className="text-[10px] font-black uppercase text-colin-navy-950 bg-colin-orange px-2.5 py-1 rounded-lg shadow-sm">
                    Popular
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <h3 className="font-extrabold text-lg text-colin-navy group-hover:text-colin-teal transition-colors leading-snug">
                  {service.title}
                </h3>
                <p className="text-xs text-colin-charcoal-600 leading-relaxed">
                  {service.description}
                </p>

                {/* Features List */}
                <div className="pt-2 flex flex-wrap gap-1.5 text-[11px]">
                  {service.features.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium">
                      <CheckCircle2 size={11} className="text-colin-teal" />
                      <span>{f}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Partner Info Box */}
              <div className="pt-3 border-t border-colin-charcoal-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-colin-charcoal-500 font-medium">Verified Partner:</span>
                  <span className="font-bold text-colin-navy">{service.partnerName}</span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-colin-charcoal-500 font-medium">Turnaround / Timing:</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <Clock size={11} /> {service.availability}
                  </span>
                </div>

                {/* Pricing & Booking Action */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-colin-charcoal-400 block">Indicative Rate</span>
                    <span className="text-base font-black text-colin-navy">{service.priceIndicative}</span>
                  </div>

                  <Button
                    variant="accent"
                    size="sm"
                    className="text-colin-navy-950 font-black text-xs px-3.5 py-2"
                    onClick={() => setSelectedService(service)}
                  >
                    Book Service (Demo)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Service Booking Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-colin-navy-950/75 backdrop-blur-sm animate-fadeIn" onClick={handleResetModal}>
          <div
            className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 border border-colin-charcoal-200 shadow-2xl space-y-5 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {bookingConfirmed ? (
              /* Confirmation Receipt */
              <div className="text-center space-y-4 py-2">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
                  <CheckCircle2 size={36} />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                    Enquiry & Booking Confirmed
                  </span>
                  <h3 className="text-xl font-extrabold text-colin-navy">
                    Booking ID: {confirmedBookingId}
                  </h3>
                  <p className="text-xs text-colin-charcoal-600 max-w-sm mx-auto leading-relaxed">
                    <strong>{selectedService.partnerName}</strong> has received your simulated booking for {selectedService.title}. A representative will contact you on WhatsApp.
                  </p>
                </div>

                <div className="p-4 bg-colin-offwhite rounded-2xl border border-colin-charcoal-200 text-left text-xs space-y-2">
                  <div className="flex justify-between py-0.5 border-b border-colin-charcoal-100">
                    <span className="text-colin-charcoal-500">Service:</span>
                    <span className="font-bold text-colin-navy">{selectedService.title}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-colin-charcoal-100">
                    <span className="text-colin-charcoal-500">Scheduled Date:</span>
                    <span className="font-bold text-colin-navy">{bookingDate}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-colin-charcoal-100">
                    <span className="text-colin-charcoal-500">Room Address:</span>
                    <span className="font-bold text-colin-navy truncate max-w-[220px]">{roomAddress}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-colin-charcoal-500">Rate:</span>
                    <span className="font-bold text-colin-navy">{selectedService.priceIndicative}</span>
                  </div>
                </div>

                <Button variant="primary" className="w-full justify-center" onClick={handleResetModal}>
                  Done & Return to Services
                </Button>
              </div>
            ) : (
              /* Booking Form */
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-colin-charcoal-100">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-colin-teal" />
                    <h3 className="font-extrabold text-colin-navy text-base">Book Lifestyle Service</h3>
                  </div>
                  <button type="button" onClick={handleResetModal} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                    <X size={18} />
                  </button>
                </div>

                <div className="p-3.5 bg-colin-navy-50 rounded-2xl border border-colin-navy-100 text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-colin-teal">Selected Service</span>
                  <h4 className="font-extrabold text-colin-navy text-sm">{selectedService.title}</h4>
                  <p className="text-colin-charcoal-600 font-medium">Rate: <strong>{selectedService.priceIndicative}</strong></p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase">Preferred Service Day:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Today (Urgent)', 'Tomorrow', 'This Weekend'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setBookingDate(d)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                          bookingDate === d
                            ? 'bg-colin-navy text-white border-colin-navy shadow-sm'
                            : 'bg-colin-offwhite text-colin-charcoal-600 border-colin-charcoal-200'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase">Accommodation Room / Address:</label>
                  <input
                    type="text"
                    value={roomAddress}
                    onChange={(e) => setRoomAddress(e.target.value)}
                    required
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-teal focus:outline-none"
                    placeholder="e.g. COLIN Heights, Room 204"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase">Student Mobile / WhatsApp:</label>
                  <input
                    type="tel"
                    value={studentContact}
                    onChange={(e) => setStudentContact(e.target.value)}
                    required
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-teal focus:outline-none"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="accent"
                    className="w-full text-colin-navy-950 font-black justify-center"
                  >
                    Confirm Demo Service Request ({selectedService.priceIndicative})
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
