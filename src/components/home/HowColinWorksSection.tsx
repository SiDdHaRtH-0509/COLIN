import React from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Calendar, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  MapPin, 
  Key, 
  Clock, 
  Sparkles,
  Compass
} from 'lucide-react';
import { Button } from '../common/Button';

export const HowColinWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="py-24 bg-colin-navy-950 text-white relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-colin-teal/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[450px] h-[450px] bg-colin-orange/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-colin-navy-900/30 rounded-full blur-3xl pointer-events-none -z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto space-y-4 mb-20"
        >
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 text-colin-teal-300 text-xs font-bold uppercase tracking-wider border border-white/10">
            <ShieldCheck size={14} />
            <span>Transparent Student Journey</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight font-display">
            How COLIN Works
          </h2>
          <p className="text-sm sm:text-base text-colin-charcoal-300 leading-relaxed">
            Finding safe, verified accommodation near your college takes less than 15 minutes, with zero brokerage and zero pressure.
          </p>
        </motion.div>

        {/* Desktop Animated Connecting Path */}
        <div className="relative mb-16">
          <svg 
            className="hidden lg:block absolute top-[110px] left-[15%] right-[15%] w-[70%] h-8 pointer-events-none z-0 overflow-visible"
            viewBox="0 0 800 24" 
            fill="none"
          >
            {/* Background Track Line */}
            <path 
              d="M 0 12 H 800" 
              stroke="rgba(255, 255, 255, 0.1)" 
              strokeWidth="2" 
              strokeDasharray="6 6"
            />
            {/* Animated Progressive Gradient Path */}
            <motion.path 
              d="M 0 12 H 800" 
              stroke="url(#gradient-path)" 
              strokeWidth="2.5" 
              strokeDasharray="8 6"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 1.6, ease: "easeInOut" }}
            />
            <defs>
              <linearGradient id="gradient-path" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#16A085" />
                <stop offset="50%" stopColor="#F2A01A" />
                <stop offset="100%" stopColor="#16A085" />
              </linearGradient>
            </defs>
          </svg>

          {/* Steps Grid: 3 Distinct Cards with Individual Visual Personalities */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 items-stretch">
            
            {/* ================= STEP 01: DISCOVER (Navy & Teal Visual Identity) ================= */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="bg-colin-navy-900/90 backdrop-blur-xl rounded-3xl p-7 sm:p-8 border border-colin-teal/30 hover:border-colin-teal transition-all duration-300 hover:shadow-2xl flex flex-col justify-between group hover:-translate-y-1.5"
            >
              <div className="space-y-6">
                {/* Step Pill & Step Number */}
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-colin-teal/15 text-colin-teal-300 text-[11px] font-extrabold uppercase tracking-widest border border-colin-teal/30">
                    Step 01 / Discover
                  </span>
                  <div className="w-11 h-11 rounded-2xl bg-colin-teal/15 text-colin-teal flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Search size={20} />
                  </div>
                </div>

                {/* Custom Discovery Micro-UI Visual */}
                <div className="p-4 rounded-2xl bg-colin-navy-950/80 border border-colin-teal/20 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-colin-charcoal-400">
                    <span className="flex items-center gap-1 font-semibold text-colin-teal-300">
                      <Compass size={12} className="text-colin-teal animate-spin-slow" /> Campus Radar
                    </span>
                    <span className="text-[10px] bg-colin-teal/20 text-colin-teal-300 px-2 py-0.5 rounded-full font-bold">
                      Within 500m
                    </span>
                  </div>
                  <div className="bg-white/5 rounded-xl px-3 py-2 text-xs flex items-center justify-between text-white font-medium border border-white/5">
                    <span className="flex items-center gap-1.5 truncate">
                      <MapPin size={12} className="text-colin-teal shrink-0" />
                      North Campus, DU
                    </span>
                    <span className="text-[10px] text-colin-teal-400 font-bold shrink-0">12 Verified Stays</span>
                  </div>
                  <div className="flex gap-1.5 text-[10px]">
                    <span className="bg-colin-teal/10 text-colin-teal-300 px-2 py-0.5 rounded-md font-semibold">Zero Brokerage</span>
                    <span className="bg-white/5 text-slate-300 px-2 py-0.5 rounded-md font-medium">Food Included</span>
                  </div>
                </div>

                {/* Text Content */}
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white group-hover:text-colin-teal-300 transition-colors">
                    Search & Campus Proximity
                  </h3>
                  <p className="text-xs sm:text-sm text-colin-charcoal-300 leading-relaxed">
                    Filter accommodations by walking distance to your lecture halls, faculty gates, and meal plans. Every listing features verified high-resolution photography.
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-colin-teal-400">
                <span>Campus Discovery Engine</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* ================= STEP 02: VISIT (Warm Orange Visual Identity) ================= */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-colin-navy-900/90 backdrop-blur-xl rounded-3xl p-7 sm:p-8 border border-colin-orange/30 hover:border-colin-orange transition-all duration-300 hover:shadow-2xl flex flex-col justify-between group hover:-translate-y-1.5"
            >
              <div className="space-y-6">
                {/* Step Pill & Step Number */}
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-colin-orange/15 text-colin-orange text-[11px] font-extrabold uppercase tracking-widest border border-colin-orange/30">
                    Step 02 / Visit
                  </span>
                  <div className="w-11 h-11 rounded-2xl bg-colin-orange/15 text-colin-orange flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calendar size={20} />
                  </div>
                </div>

                {/* Custom Inspection Slot Ticket Micro-UI Visual */}
                <div className="p-4 rounded-2xl bg-colin-navy-950/80 border border-colin-orange/20 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 font-semibold text-colin-orange">
                      <Clock size={12} className="text-colin-orange" /> Verified Pass
                    </span>
                    <span className="text-[10px] text-colin-charcoal-400">#COLIN-VISIT</span>
                  </div>
                  <div className="bg-colin-orange/10 border border-colin-orange/30 rounded-xl p-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-colin-orange tracking-wider">Confirmed Slot</div>
                      <div className="text-xs font-bold text-white">Tomorrow • 11:30 AM</div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-colin-orange text-colin-navy-950 px-2 py-0.5 rounded-md">
                        <Sparkles size={10} /> Escorted
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-colin-charcoal-400">Accompanied by accredited student volunteer</p>
                </div>

                {/* Text Content */}
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white group-hover:text-colin-orange transition-colors">
                    Schedule an Inspected Visit
                  </h3>
                  <p className="text-xs sm:text-sm text-colin-charcoal-300 leading-relaxed">
                    Book a direct inspection pass without aggressive broker pitches. A student ambassador or verified landlord meets you at the gate for a transparent walkthrough.
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-colin-orange">
                <span>1-Click Slot Reservation</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* ================= STEP 03: MOVE IN (Teal & Navy Visual Identity) ================= */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="bg-colin-navy-900/90 backdrop-blur-xl rounded-3xl p-7 sm:p-8 border border-white/15 hover:border-colin-teal/60 transition-all duration-300 hover:shadow-2xl flex flex-col justify-between group hover:-translate-y-1.5"
            >
              <div className="space-y-6">
                {/* Step Pill & Step Number */}
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-extrabold uppercase tracking-widest border border-white/20">
                    Step 03 / Move In
                  </span>
                  <div className="w-11 h-11 rounded-2xl bg-white/10 text-colin-teal-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Key size={20} />
                  </div>
                </div>

                {/* Custom Digital Move-In Key Micro-UI Visual */}
                <div className="p-4 rounded-2xl bg-colin-navy-950/80 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-colin-charcoal-400">
                    <span className="flex items-center gap-1 font-semibold text-white">
                      <CheckCircle2 size={12} className="text-colin-teal" /> Agreement Status
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                      Zero Commission
                    </span>
                  </div>
                  <div className="bg-white/5 rounded-xl px-3 py-2 text-xs flex items-center justify-between text-white font-medium border border-white/5">
                    <span className="truncate">Digital Move-In Pass Issued</span>
                    <span className="text-colin-teal font-bold text-xs">Unlocked</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-colin-charcoal-400">
                    <span>Direct Host Contact</span>
                    <span className="text-colin-teal font-semibold">100% Protected</span>
                  </div>
                </div>

                {/* Text Content */}
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white group-hover:text-colin-teal-300 transition-colors">
                    Move In with 100% Protection
                  </h3>
                  <p className="text-xs sm:text-sm text-colin-charcoal-300 leading-relaxed">
                    Finalize transparent rent agreements directly with verified property hosts. Zero surprise deposits, zero broker commissions, and automated move-in support.
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-colin-teal-300">
                <span>Verified Community Living</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

          </div>
        </div>

        {/* ================= INTEGRATED 55% REFUND GUARANTEE FOUNDATION ================= */}
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-gradient-to-r from-colin-navy-900 via-colin-navy-900 to-colin-navy-900/90 rounded-3xl p-6 sm:p-8 border border-white/15 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-colin-orange/10 to-transparent pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
            <div className="lg:col-span-8 flex flex-col sm:flex-row items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-colin-orange/15 border border-colin-orange/30 text-colin-orange flex items-center justify-center shrink-0 shadow-sm">
                <ShieldCheck size={28} />
              </div>
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-colin-orange">
                  Standard of Trust & Transparency
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  The COLIN 55% On-Site Visit Guarantee
                </h3>
                <p className="text-xs sm:text-sm text-colin-charcoal-300 leading-relaxed max-w-2xl">
                  If an accommodation’s physical room dimensions, cleanliness, or Wi-Fi speeds deviate from what you viewed on COLIN, 55% of your visit slot reservation fee is automatically refunded back to your bank account within 60 minutes.
                </p>
              </div>
            </div>

            <div className="lg:col-span-4 flex items-center justify-start lg:justify-end">
              <a href="#featured-properties" className="w-full sm:w-auto">
                <Button 
                  variant="accent" 
                  size="md" 
                  className="w-full sm:w-auto font-black text-colin-navy-950 text-xs px-6 py-3 hover:shadow-brand-orange whitespace-nowrap"
                  rightIcon={<ArrowRight size={14} />}
                >
                  Explore Accommodations Now
                </Button>
              </a>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};
