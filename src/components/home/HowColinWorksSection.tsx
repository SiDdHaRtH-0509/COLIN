import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  ArrowRight, 
  MapPin, 
  Calendar, 
  CheckCircle2 
} from 'lucide-react';
import { Button } from '../common/Button';

export const HowColinWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="py-24 bg-colin-offwhite text-colin-charcoal relative overflow-hidden border-t border-colin-charcoal-200/60">
      {/* Subtle Background Glow Accents */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-colin-teal/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-colin-orange/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto space-y-3 mb-16 sm:mb-20"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-colin-teal/10 border border-colin-teal/20 text-colin-teal-800 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={14} className="text-colin-teal" />
            <span>Transparent Student Journey</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-colin-navy tracking-tight font-display">
            How COLIN Works
          </h2>
          <p className="text-base sm:text-lg text-colin-charcoal-600 leading-relaxed">
            Finding safe, verified accommodation near your university campus takes less than 15 minutes, with zero brokerage and zero pressure.
          </p>
        </motion.div>

        {/* Journey Timeline Container with Animated Connecting Path */}
        <div className="relative mb-16 sm:mb-20">
          
          {/* Desktop Animated Connecting Path (Horizontal) */}
          <svg 
            className="hidden lg:block absolute top-[135px] left-[15%] right-[15%] w-[70%] h-8 pointer-events-none z-0 overflow-visible"
            viewBox="0 0 800 24" 
            fill="none"
          >
            {/* Background Track Line */}
            <path 
              d="M 0 12 H 800" 
              stroke="#E2E8F0" 
              strokeWidth="2.5" 
              strokeDasharray="8 8"
            />
            {/* Animated Progressive Gradient Path */}
            <motion.path 
              d="M 0 12 H 800" 
              stroke="url(#gradient-path-light)" 
              strokeWidth="3" 
              strokeDasharray="8 6"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            />
            <defs>
              <linearGradient id="gradient-path-light" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#16A085" />
                <stop offset="50%" stopColor="#F2A01A" />
                <stop offset="100%" stopColor="#0B3452" />
              </linearGradient>
            </defs>
          </svg>

          {/* Three Distinct Student Journey Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative z-10 items-stretch">
            
            {/* ================= STEP 01 — DISCOVER YOUR SPACE ================= */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-3xl p-7 sm:p-8 border border-colin-charcoal-200/80 hover:border-colin-teal/40 transition-all duration-300 shadow-brand hover:shadow-brand-hover flex flex-col justify-between group hover:-translate-y-1.5 h-full relative"
            >
              <div>
                {/* Step Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-colin-teal bg-colin-teal/10 px-3 py-1 rounded-full border border-colin-teal/20">
                    Step 01
                  </span>
                  <span className="text-4xl sm:text-5xl font-black text-slate-200 font-display group-hover:text-colin-teal/30 transition-colors select-none">
                    01
                  </span>
                </div>

                {/* Vector SVG Composition: Location Pin & Campus Discovery */}
                <div className="my-5 py-2 flex items-center justify-center">
                  <svg width="120" height="96" viewBox="0 0 120 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="overflow-visible">
                    {/* Soft Concentric Pulse Rings */}
                    <circle cx="60" cy="48" r="38" fill="#16A085" fillOpacity="0.06" />
                    <circle cx="60" cy="48" r="26" fill="#16A085" fillOpacity="0.1" />
                    
                    {/* Campus Building Silhouettes */}
                    <rect x="36" y="38" width="16" height="24" rx="2" fill="#0B3452" fillOpacity="0.12" />
                    <rect x="68" y="34" width="16" height="28" rx="2" fill="#0B3452" fillOpacity="0.12" />
                    <path d="M 44 26 L 60 14 L 76 26 Z" fill="#0B3452" fillOpacity="0.2" />
                    {/* Campus Windows */}
                    <rect x="40" y="44" width="3" height="4" rx="1" fill="#FFFFFF" />
                    <rect x="47" y="44" width="3" height="4" rx="1" fill="#FFFFFF" />
                    <rect x="72" y="40" width="3" height="4" rx="1" fill="#FFFFFF" />
                    <rect x="79" y="40" width="3" height="4" rx="1" fill="#FFFFFF" />

                    {/* Animated Location Pin */}
                    <g className="transition-transform duration-300 group-hover:-translate-y-1.5">
                      <path
                        d="M60 20C51.716 20 45 26.716 45 35C45 45.2 60 58 60 58C60 58 75 45.2 75 35C75 26.716 68.284 20 60 20Z"
                        fill="url(#pin-grad-01)"
                        filter="drop-shadow(0 4px 6px rgba(22,160,133,0.3))"
                      />
                      <circle cx="60" cy="34" r="5" fill="#FFFFFF" />
                    </g>

                    {/* Compass Accent */}
                    <circle cx="88" cy="62" r="12" fill="#FFFFFF" stroke="#0B3452" strokeWidth="1.5" />
                    <path d="M88 54L91 62L88 70L85 62Z" fill="#F2A01A" />

                    <defs>
                      <linearGradient id="pin-grad-01" x1="45" y1="20" x2="75" y2="58" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#16A085" />
                        <stop offset="1" stopColor="#0B3452" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Content */}
                <h3 className="text-xl font-black text-colin-navy tracking-tight group-hover:text-colin-teal transition-colors mb-2">
                  Discover Your Space
                </h3>
                <p className="text-xs sm:text-sm text-colin-charcoal-600 leading-relaxed">
                  Search verified student rooms and PGs within walking distance of your faculty. Filter by budget, room sharing, and meal options with authentic photography.
                </p>
              </div>

              {/* Supporting Label */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-colin-teal">
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} /> Walking Distance Near Campus
                </span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* ================= STEP 02 — VISIT WITH CONFIDENCE ================= */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-3xl p-7 sm:p-8 border border-colin-charcoal-200/80 hover:border-colin-orange/40 transition-all duration-300 shadow-brand hover:shadow-brand-hover flex flex-col justify-between group hover:-translate-y-1.5 h-full relative"
            >
              <div>
                {/* Step Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-colin-orange bg-colin-orange/10 px-3 py-1 rounded-full border border-colin-orange/20">
                    Step 02
                  </span>
                  <span className="text-4xl sm:text-5xl font-black text-slate-200 font-display group-hover:text-colin-orange/30 transition-colors select-none">
                    02
                  </span>
                </div>

                {/* Vector SVG Composition: Calendar & Inspection Verification */}
                <div className="my-5 py-2 flex items-center justify-center">
                  <svg width="120" height="96" viewBox="0 0 120 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="overflow-visible">
                    {/* Soft Background Pulse */}
                    <circle cx="60" cy="48" r="38" fill="#F2A01A" fillOpacity="0.06" />
                    
                    {/* Calendar Base Card */}
                    <rect x="34" y="24" width="52" height="48" rx="8" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.04))" />
                    {/* Calendar Banner Header */}
                    <path d="M34 32C34 27.5817 37.5817 24 42 24H78C82.4183 24 86 27.5817 86 32V36H34V32Z" fill="#F2A01A" />
                    {/* Binding Rings */}
                    <rect x="44" y="20" width="4" height="8" rx="2" fill="#0B3452" />
                    <rect x="72" y="20" width="4" height="8" rx="2" fill="#0B3452" />
                    
                    {/* Calendar Days Grid */}
                    <circle cx="44" cy="45" r="2.5" fill="#CBD5E1" />
                    <circle cx="54" cy="45" r="2.5" fill="#CBD5E1" />
                    <circle cx="64" cy="45" r="2.5" fill="#CBD5E1" />
                    <circle cx="74" cy="45" r="2.5" fill="#CBD5E1" />
                    <circle cx="44" cy="56" r="2.5" fill="#CBD5E1" />
                    <circle cx="54" cy="56" r="2.5" fill="#F2A01A" />
                    <circle cx="64" cy="56" r="2.5" fill="#CBD5E1" />

                    {/* Inspection Verified Seal Overlay */}
                    <g className="transition-transform duration-300 group-hover:scale-105" transform="translate(68, 48)">
                      <circle cx="16" cy="16" r="15" fill="#0B3452" stroke="#FFFFFF" strokeWidth="2" filter="drop-shadow(0 4px 6px rgba(11,52,82,0.25))" />
                      <path d="M11 16L15 20L22 12" stroke="#F2A01A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                  </svg>
                </div>

                {/* Content */}
                <h3 className="text-xl font-black text-colin-navy tracking-tight group-hover:text-colin-orange transition-colors mb-2">
                  Visit with Confidence
                </h3>
                <p className="text-xs sm:text-sm text-colin-charcoal-600 leading-relaxed">
                  Schedule an in-person walkthrough at your convenience. An accredited student ambassador coordinates with the host so you inspect every square foot without pressure.
                </p>
              </div>

              {/* Supporting Label */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-colin-orange">
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} /> Guided On-Site Walkthrough
                </span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* ================= STEP 03 — MOVE INTO YOUR NEW HOME ================= */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-3xl p-7 sm:p-8 border border-colin-charcoal-200/80 hover:border-colin-navy/40 transition-all duration-300 shadow-brand hover:shadow-brand-hover flex flex-col justify-between group hover:-translate-y-1.5 h-full relative"
            >
              <div>
                {/* Step Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-colin-navy bg-colin-navy/10 px-3 py-1 rounded-full border border-colin-navy/20">
                    Step 03
                  </span>
                  <span className="text-4xl sm:text-5xl font-black text-slate-200 font-display group-hover:text-colin-navy/30 transition-colors select-none">
                    03
                  </span>
                </div>

                {/* Vector SVG Composition: House & Digital Move-In Key */}
                <div className="my-5 py-2 flex items-center justify-center">
                  <svg width="120" height="96" viewBox="0 0 120 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="overflow-visible">
                    {/* Soft Background Pulse */}
                    <circle cx="60" cy="48" r="38" fill="#0B3452" fillOpacity="0.05" />
                    
                    {/* Modern House Frame */}
                    <path d="M38 46L60 28L82 46V72C82 74.2091 80.2091 76 78 76H42C39.7909 76 38 74.2091 38 72V46Z" fill="#FFFFFF" stroke="#0B3452" strokeWidth="2" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.04))" />
                    {/* House Gable Roof Accent */}
                    <path d="M34 48L60 26L86 48" stroke="#16A085" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Chimney */}
                    <rect x="70" y="30" width="6" height="10" fill="#0B3452" rx="1" />
                    {/* Warm Window Glow */}
                    <rect x="46" y="52" width="10" height="10" rx="2" fill="#F2A01A" />
                    {/* Door */}
                    <path d="M64 76V58H74V76" fill="#0B3452" />

                    {/* Floating Verified Key with subtle hover slide */}
                    <g className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" transform="translate(64, 16)">
                      <circle cx="20" cy="14" r="8" fill="#F2A01A" stroke="#FFFFFF" strokeWidth="1.5" filter="drop-shadow(0 2px 4px rgba(242,160,26,0.3))" />
                      <circle cx="20" cy="14" r="4" fill="#FFFFFF" />
                      <path d="M20 22V36M20 28H25M20 33H24" stroke="#F2A01A" strokeWidth="2.5" strokeLinecap="round" />
                    </g>
                  </svg>
                </div>

                {/* Content */}
                <h3 className="text-xl font-black text-colin-navy tracking-tight group-hover:text-colin-teal transition-colors mb-2">
                  Move into Your New Home
                </h3>
                <p className="text-xs sm:text-sm text-colin-charcoal-600 leading-relaxed">
                  Sign transparent digital rental agreements directly with verified property hosts. Enjoy zero brokerage fees and settle into your new student community with peace of mind.
                </p>
              </div>

              {/* Supporting Label */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-colin-navy">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-colin-teal" /> Zero Broker Commissions
                </span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

          </div>
        </div>

        {/* ================= REDESIGNED 55% REFUND GUARANTEE PANEL ================= */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200/90 shadow-brand flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 max-w-3xl">
            <div className="w-14 h-14 rounded-2xl bg-colin-teal/10 border border-colin-teal/20 text-colin-teal flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck size={28} className="text-colin-teal" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-colin-orange block">
                Consumer Protection Promise
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-colin-navy">
                COLIN 55% On-Site Visit Guarantee
              </h3>
              <p className="text-xs sm:text-sm text-colin-charcoal-600 leading-relaxed">
                If an accommodation’s room dimensions, food hygiene, or Wi-Fi speeds deviate from what was published on COLIN, 55% of your visit reservation fee is immediately refunded back to your bank account within 60 minutes.
              </p>
            </div>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            <a href="#featured-properties" className="block w-full sm:w-auto">
              <Button 
                variant="primary" 
                size="md" 
                className="w-full sm:w-auto font-bold text-xs px-6 py-3 shadow-sm bg-colin-navy hover:bg-colin-teal transition-colors whitespace-nowrap"
                rightIcon={<ArrowRight size={14} />}
              >
                Explore Accommodations Now
              </Button>
            </a>
          </div>
        </motion.div>

      </div>
    </section>
  );
};
