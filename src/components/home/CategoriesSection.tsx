import React from 'react';
import { motion } from 'framer-motion';
import { AccommodationType } from '../../types';
import { 
  Users, 
  Building, 
  Key, 
  Maximize2, 
  Sparkles, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface CategoriesSectionProps {
  selectedCategory: AccommodationType;
  onSelectCategory: (category: AccommodationType) => void;
}

const CATEGORY_ITEMS = [
  {
    id: 'pg' as AccommodationType,
    title: 'Paying Guest (PG)',
    subtitle: 'Meals & Housekeeping Included',
    description: 'Hygienic 3-tier meals, daily cleaning, power backup, and quiet study hours. Ideal for undergrads and freshers.',
    icon: Users,
    count: '120+ Verified PGs',
    accentColor: 'teal',
  },
  {
    id: 'hostel' as AccommodationType,
    title: 'Student Hostels',
    subtitle: 'Campus Community & High Security',
    description: 'Biometric gates, 24/7 wardens, study libraries, and vibrant student peer groups right outside college gates.',
    icon: Building,
    count: '45+ Hostels',
    accentColor: 'navy',
  },
  {
    id: 'rental-room' as AccommodationType,
    title: 'Private Rental Rooms',
    subtitle: 'Zero Curfew & Total Autonomy',
    description: 'Independent furnished rooms with attached baths for senior scholars, researchers, and competitive exam aspirants.',
    icon: Key,
    count: '60+ Private Rooms',
    accentColor: 'orange',
  },
  {
    id: 'shared-flat' as AccommodationType,
    title: 'Shared Flats',
    subtitle: 'Live With Fellow University Mates',
    description: 'Furnished 2BHK/3BHK apartments with modular kitchens, living lounges, and split rents without broker commissions.',
    icon: Maximize2,
    count: '35+ Shared Flats',
    accentColor: 'teal',
  },
  {
    id: 'co-living' as AccommodationType,
    title: 'Modern Co-Living',
    subtitle: 'Premium Student Suites & Lounges',
    description: 'Coworking desks, high-speed fiber internet, fitness areas, gaming hubs, and weekly student community events.',
    icon: Sparkles,
    count: '28+ Co-Living Spaces',
    accentColor: 'navy',
  },
];

export const CategoriesSection: React.FC<CategoriesSectionProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const handleCategoryClick = (catId: AccommodationType) => {
    onSelectCategory(catId);
    const target = document.getElementById('featured-properties');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="categories" className="py-16 bg-white border-t border-colin-charcoal-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-colin-teal">
              <ShieldCheck size={14} />
              <span>Campus Accommodation Categories</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-colin-navy tracking-tight font-display">
              Tailored For Every Student Lifestyle
            </h2>
            <p className="text-sm text-colin-charcoal-600 max-w-xl">
              From full-service PGs with home-cooked meals to private study rooms and collaborative co-living suites.
            </p>
          </div>

          <button
            onClick={() => handleCategoryClick('all')}
            className={`text-xs font-bold px-4 py-2 rounded-xl transition-all border ${
              selectedCategory === 'all'
                ? 'bg-colin-navy text-white border-colin-navy'
                : 'bg-colin-offwhite text-colin-charcoal-700 border-colin-charcoal-200 hover:border-colin-navy'
            }`}
          >
            View All Stay Categories
          </button>
        </motion.div>

        {/* Categories Grid with Staggered Entrance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          {CATEGORY_ITEMS.map((cat, idx) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;

            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ duration: 0.5, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => handleCategoryClick(cat.id)}
                className={`group p-5 rounded-3xl cursor-pointer transition-all duration-300 border flex flex-col justify-between colin-pin-motion colin-window-accent ${
                  isSelected
                    ? 'bg-colin-navy text-white border-colin-navy shadow-xl scale-[1.02]'
                    : 'bg-colin-offwhite/70 hover:bg-white text-colin-charcoal border-colin-charcoal-200/80 hover:border-colin-teal/40 hover:shadow-brand'
                }`}
              >
                <div className="space-y-4">
                  {/* Category Icon */}
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                        isSelected
                          ? 'bg-white/10 text-colin-orange'
                          : 'bg-colin-navy/5 text-colin-navy group-hover:bg-colin-teal/10 group-hover:text-colin-teal'
                      }`}
                    >
                      <Icon size={22} />
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-white/15 text-colin-teal-200'
                          : 'bg-colin-charcoal-100 text-colin-charcoal-600'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </div>

                  {/* Text Details */}
                  <div className="space-y-1">
                    <h3
                      className={`font-extrabold text-base transition-colors ${
                        isSelected ? 'text-white' : 'text-colin-navy group-hover:text-colin-teal'
                      }`}
                    >
                      {cat.title}
                    </h3>
                    <p
                      className={`text-[11px] font-semibold ${
                        isSelected ? 'text-colin-teal-300' : 'text-colin-teal-700'
                      }`}
                    >
                      {cat.subtitle}
                    </p>
                    <p
                      className={`text-xs line-clamp-3 leading-relaxed mt-2 ${
                        isSelected ? 'text-colin-charcoal-200' : 'text-colin-charcoal-500'
                      }`}
                    >
                      {cat.description}
                    </p>
                  </div>
                </div>

                {/* Explore link */}
                <div
                  className={`mt-4 pt-3 border-t text-xs font-bold flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'border-white/15 text-colin-orange'
                      : 'border-colin-charcoal-200/60 text-colin-navy group-hover:text-colin-teal'
                  }`}
                >
                  <span>Explore Stays</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
