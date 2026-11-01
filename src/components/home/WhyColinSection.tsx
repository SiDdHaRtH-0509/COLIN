import React from 'react';
import { motion } from 'framer-motion';
import { WHY_COLIN_FEATURES } from '../../data/mockData';
import { 
  ShieldCheck, 
  BadgePercent, 
  CalendarCheck2, 
  Users, 
  CheckCircle2, 
  Sparkles
} from 'lucide-react';

const ICON_MAP = {
  ShieldCheck: ShieldCheck,
  BadgePercent: BadgePercent,
  CalendarCheck2: CalendarCheck2,
  Users: Users,
};

export const WhyColinSection: React.FC = () => {
  return (
    <section id="why-colin" className="py-20 bg-white border-t border-colin-charcoal-100 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-1/2 left-0 w-72 h-72 bg-colin-teal/10 rounded-full blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto space-y-3 mb-16"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-colin-orange/15 text-colin-orange-800 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={13} className="text-colin-orange" />
            <span>Built For Indian College Students</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-colin-navy tracking-tight font-display">
            Why Thousands of Students Choose COLIN
          </h2>
          <p className="text-base text-colin-charcoal-600 leading-relaxed">
            We solved the most frustrating problems of university accommodation: fake broker listings, non-refundable deposits, and bait-and-switch rooms.
          </p>
        </motion.div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {WHY_COLIN_FEATURES.map((item, idx) => {
            const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP] || ShieldCheck;

            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.15 }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="bg-colin-offwhite rounded-3xl p-6 sm:p-7 border border-colin-charcoal-200 hover:border-colin-teal/40 transition-all duration-300 hover:shadow-brand flex flex-col justify-between group colin-pin-motion colin-window-accent h-full"
              >
                <div className="space-y-4">
                  {/* Top Badge and Icon */}
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-colin-navy text-white flex items-center justify-center group-hover:bg-colin-teal transition-colors shadow-sm">
                      <Icon size={22} className="text-colin-orange group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white text-colin-teal-700 border border-colin-teal/30">
                      {item.badge}
                    </span>
                  </div>

                  {/* Title & Subtitle */}
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-lg text-colin-navy group-hover:text-colin-teal transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs font-bold text-colin-orange-700">
                      {item.subtitle}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-colin-charcoal-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Footer Assurance */}
                <div className="mt-6 pt-4 border-t border-colin-charcoal-200/80 flex items-center gap-1.5 text-[11px] font-bold text-colin-teal">
                  <CheckCircle2 size={13} />
                  <span>Verified Guarantee</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
