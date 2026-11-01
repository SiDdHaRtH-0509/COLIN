import React from 'react';
import { 
  Sparkles, 
  BookOpen, 
  UtensilsCrossed, 
  ShieldCheck, 
  Gamepad2, 
  CheckCircle2
} from 'lucide-react';

export const ColinLivingSection: React.FC = () => {
  const LIVING_PILLARS = [
    {
      icon: BookOpen,
      title: 'Silent Study Lounges & Fiber Internet',
      desc: 'Ergonomic study chairs, reading lamps, sound isolation, and dual-redundant 300+ Mbps fiber connections.',
    },
    {
      icon: UtensilsCrossed,
      title: 'Hygienic Home-Style Food',
      desc: 'Chef-prepared North & South Indian meals with weekly menu rotations, breakfast buffet, and weekend feasts.',
    },
    {
      icon: ShieldCheck,
      title: '360° Safety & Biometrics',
      desc: 'RFID and biometric turnstiles, female wardens in girls residences, CCTV coverage, and 24/7 emergency response.',
    },
    {
      icon: Gamepad2,
      title: 'Community Recreation Hubs',
      desc: 'Table tennis, PlayStation setups, screening terraces, and peer networking with fellow scholars.',
    },
  ];

  return (
    <section id="colin-living" className="py-20 bg-white border-t border-colin-charcoal-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-colin-teal/10 text-colin-teal-800 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={13} className="text-colin-teal" />
              <span>Beyond Just Four Walls</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-colin-navy tracking-tight font-display">
              Welcome to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-colin-navy via-colin-teal to-colin-teal-600">
                COLIN Living.
              </span>
            </h2>

            <p className="text-base text-colin-charcoal-600 leading-relaxed">
              University life is about more than just a bed to sleep in. COLIN Living is our curated standard for student spaces—engineered to support your academic focus, physical well-being, and campus community.
            </p>

            {/* Living Pillars List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {LIVING_PILLARS.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.title} className="p-4 rounded-2xl bg-colin-offwhite border border-colin-charcoal-200/80 space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-colin-teal/15 text-colin-teal flex items-center justify-center font-bold">
                      <Icon size={18} />
                    </div>
                    <h4 className="font-bold text-xs text-colin-navy">{p.title}</h4>
                    <p className="text-[11px] text-colin-charcoal-500 leading-relaxed">{p.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex items-center gap-3 text-xs font-bold text-colin-navy">
              <CheckCircle2 size={16} className="text-colin-teal" />
              <span>Audited weekly by COLIN campus ambassadors</span>
            </div>
          </div>

          {/* Right Visual Image Collage */}
          <div className="lg:col-span-6 relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="rounded-3xl overflow-hidden shadow-lg aspect-[4/5] bg-colin-navy-900 group">
                  <img
                    src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
                    alt="Study Lounge"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="bg-colin-teal text-white p-5 rounded-3xl space-y-1">
                  <div className="text-2xl font-black">4.9 ★</div>
                  <div className="text-xs font-semibold">Student Satisfaction Score Across 120+ Stays</div>
                </div>
              </div>

              <div className="space-y-4 pt-8">
                <div className="bg-colin-navy text-white p-5 rounded-3xl space-y-1">
                  <div className="text-2xl font-black">300 Mbps</div>
                  <div className="text-xs font-semibold text-colin-teal-200">Dual-Redundant Optical Fiber in every building</div>
                </div>
                <div className="rounded-3xl overflow-hidden shadow-lg aspect-[4/5] bg-colin-navy-900 group">
                  <img
                    src="https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80"
                    alt="Comfortable Room"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
