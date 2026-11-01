import React from 'react';
import { TESTIMONIALS } from '../../data/mockData';
import { Star, Quote, ShieldCheck } from 'lucide-react';

export const TestimonialsSection: React.FC = () => {
  return (
    <section className="py-20 bg-colin-offwhite border-t border-colin-charcoal-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-colin-teal/10 text-colin-teal-800 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={13} />
            <span>Real Student Experiences</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-colin-navy tracking-tight font-display">
            Loved by Students Across Top Campuses
          </h2>
          <p className="text-sm text-colin-charcoal-600">
            Read how scholars from DU, Christ, Symbiosis and IIT found verified homes through COLIN.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.author}
              className="bg-white rounded-3xl p-7 border border-colin-charcoal-200/90 shadow-brand hover:shadow-brand-hover transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* 5 Stars */}
                <div className="flex items-center gap-1 text-colin-orange">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={15} className="fill-current" />
                  ))}
                </div>

                <Quote size={28} className="text-colin-teal/30" />

                <p className="text-xs sm:text-sm text-colin-charcoal-700 leading-relaxed italic">
                  "{t.quote}"
                </p>
              </div>

              {/* Author Info */}
              <div className="mt-6 pt-4 border-t border-colin-charcoal-100 flex items-center gap-3">
                <img
                  src={t.avatar}
                  alt={t.author}
                  className="w-11 h-11 rounded-full object-cover border-2 border-colin-teal/40"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-black text-colin-navy">{t.author}</div>
                  <div className="text-[11px] text-colin-teal-700 font-semibold">{t.university}</div>
                  <div className="text-[10px] text-colin-charcoal-400">{t.stay}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
