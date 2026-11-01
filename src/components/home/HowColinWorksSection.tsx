import React from 'react';
import { motion } from 'framer-motion';
import { HOW_COLIN_WORKS_STEPS } from '../../data/mockData';
import { Search, Calendar, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../common/Button';

const STEP_ICONS = {
  Search: Search,
  Calendar: Calendar,
  CheckCircle: CheckCircle,
};

export const HowColinWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="py-20 bg-colin-navy-950 text-white relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-colin-teal/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-colin-orange/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto space-y-3 mb-16"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-colin-teal-300 text-xs font-bold uppercase tracking-wider border border-white/10">
            <ShieldCheck size={13} />
            <span>Simple 3-Step Journey</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight font-display">
            How COLIN Works
          </h2>
          <p className="text-sm sm:text-base text-colin-charcoal-300 leading-relaxed">
            Finding your ideal university accommodation takes less than 15 minutes, with zero broker hassle.
          </p>
        </motion.div>

        {/* Steps Grid with Connecting Line */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          
          {/* Animated Connecting Line on Desktop */}
          <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-colin-teal/40 via-colin-orange/40 to-colin-teal/40 -translate-y-12 z-0 pointer-events-none" />

          {HOW_COLIN_WORKS_STEPS.map((step, idx) => {
            const Icon = STEP_ICONS[step.icon as keyof typeof STEP_ICONS] || Search;

            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ duration: 0.6, delay: idx * 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="bg-colin-navy-900/80 backdrop-blur-md rounded-3xl p-8 border border-colin-navy-800 hover:border-colin-teal/50 transition-all duration-300 hover:shadow-2xl flex flex-col justify-between group colin-pin-motion colin-window-accent relative z-10 h-full"
              >
                <div className="space-y-5">
                  {/* Step Number & Icon */}
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-colin-orange font-display">
                      {step.step}
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-white/10 text-colin-teal-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon size={22} />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white group-hover:text-colin-teal-300 transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-colin-charcoal-300 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/10 flex items-center text-xs font-bold text-colin-teal-400">
                  <span>Student Step {idx + 1}</span>
                  <ArrowRight size={13} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Guarantee Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
        >
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-8 h-8 rounded-full bg-colin-orange/20 text-colin-orange flex items-center justify-center shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <span className="font-bold text-white">COLIN 55% Refund Guarantee:</span>{' '}
              <span className="text-colin-charcoal-300">
                If the property doesn’t match what you saw online, 55% of your visit slot fee is automatically refunded.
              </span>
            </div>
          </div>
          <a href="#featured-properties">
            <Button variant="accent" size="sm" className="whitespace-nowrap font-bold">
              Explore Accommodations Now
            </Button>
          </a>
        </motion.div>
      </div>
    </section>
  );
};
