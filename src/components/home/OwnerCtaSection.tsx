import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Building, 
  Award, 
  Sparkles, 
  ArrowRight, 
  TrendingUp, 
  ShieldCheck,
  Check
} from 'lucide-react';
import { Button } from '../common/Button';

export const OwnerCtaSection: React.FC = () => {
  const { demoLogin } = useAuth();
  const [inquirySent, setInquirySent] = useState(false);
  const [ownerCity, setOwnerCity] = useState('Delhi NCR');
  const [propertyType, setPropertyType] = useState('PG');

  const handleInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setInquirySent(true);
    setTimeout(() => setInquirySent(false), 5000);
  };

  return (
    <section id="owner-cta" className="py-20 bg-gradient-to-br from-colin-navy-950 via-colin-navy to-colin-navy-900 text-white relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-colin-orange/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-colin-teal/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Owner Value Proposition */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-colin-orange text-xs font-bold uppercase tracking-wider border border-colin-orange/30">
              <Building size={14} />
              <span>For Property Owners, Landlords & Hostel Chains</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight font-display">
              List Your Property & <br />
              <span className="text-colin-orange">Earn Trust with COLIN Certified.</span>
            </h2>

            <p className="text-base text-colin-charcoal-200 leading-relaxed max-w-xl">
              Reach thousands of verified college students. Get an official in-person inspection audit, display the coveted COLIN Certified badge, and fill 100% of your beds before the academic semester starts.
            </p>

            {/* Monetization Model Pillars from Business Spec */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-colin-teal-300 font-bold text-xs">
                  <Award size={16} />
                  <span>COLIN Certified Badge</span>
                </div>
                <p className="text-[11px] text-colin-charcoal-300">
                  Our campus volunteers physically inspect your property, verifying amenities and awarding high-trust ranking.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-colin-orange font-bold text-xs">
                  <TrendingUp size={16} />
                  <span>Homepage & Search Spotlight</span>
                </div>
                <p className="text-[11px] text-colin-charcoal-300">
                  Featured placement across Delhi, Bengaluru, Pune, and Kota student search queries.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-colin-teal-300 font-bold text-xs">
                  <ShieldCheck size={16} />
                  <span>100% Verified Student Leads</span>
                </div>
                <p className="text-[11px] text-colin-charcoal-300">
                  No time-wasters. Students pay a visit deposit with pre-verified college ID before visiting.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-colin-orange font-bold text-xs">
                  <Sparkles size={16} />
                  <span>Pro & Premium Owner Tiers</span>
                </div>
                <p className="text-[11px] text-colin-charcoal-300">
                  Manage multiple hostel buildings with an exclusive occupancy and rent management dashboard.
                </p>
              </div>
            </div>

            {/* Quick Demo Owner Switcher */}
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => demoLogin('owner')}
                className="text-xs font-bold text-white bg-colin-teal hover:bg-colin-teal-600 px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <span>⚡ Test as Demo Property Owner</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Right Column: Listing Request Card */}
          <div className="lg:col-span-5">
            <div className="bg-white text-colin-charcoal rounded-3xl p-6 sm:p-8 shadow-2xl border border-colin-charcoal-200">
              <div className="space-y-2 mb-6">
                <h3 className="text-xl font-extrabold text-colin-navy">
                  Request In-Person Certification
                </h3>
                <p className="text-xs text-colin-charcoal-500">
                  Schedule an on-site visit by the COLIN student volunteer team in your campus zone.
                </p>
              </div>

              {inquirySent ? (
                <div className="p-6 bg-colin-teal/10 border border-colin-teal/40 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-colin-teal text-white mx-auto flex items-center justify-center">
                    <Check size={24} />
                  </div>
                  <h4 className="font-extrabold text-sm text-colin-navy">Audit Request Received!</h4>
                  <p className="text-xs text-colin-charcoal-600">
                    A COLIN campus partner will reach out within 2 hours to confirm your property inspection slot.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleInquiry} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                      Property Name / Building:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Royal Greens PG"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                        City:
                      </label>
                      <select
                        value={ownerCity}
                        onChange={(e) => setOwnerCity(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none bg-white"
                      >
                        <option>Delhi NCR</option>
                        <option>Bengaluru</option>
                        <option>Pune</option>
                        <option>Mumbai</option>
                        <option>Kota</option>
                        <option>Hyderabad</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                        Property Type:
                      </label>
                      <select
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none bg-white"
                      >
                        <option>PG (Paying Guest)</option>
                        <option>Student Hostel</option>
                        <option>Rental Room</option>
                        <option>Shared Flat</option>
                        <option>Co-Living Space</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                      Owner Contact Phone:
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98XXX XXXXX"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full"
                      rightIcon={<ArrowRight size={14} />}
                    >
                      Submit For Free Inspection
                    </Button>
                  </div>

                  <p className="text-[10px] text-colin-charcoal-400 text-center">
                    Zero upfront fees for initial campus volunteer inspection.
                  </p>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
