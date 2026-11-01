import React from 'react';
import { motion } from 'framer-motion';
import { Property } from '../../types';
import { PropertyCard } from '../property/PropertyCard';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, 
  Sparkles, 
  FilterX, 
  Lock
} from 'lucide-react';
import { Button } from '../common/Button';

interface FeaturedPropertiesSectionProps {
  properties: Property[];
  onResetFilters: () => void;
}

export const FeaturedPropertiesSection: React.FC<FeaturedPropertiesSectionProps> = ({
  properties,
  onResetFilters,
}) => {
  const { isAuthenticated, demoLogin, openAuthModal } = useAuth();

  return (
    <section id="featured-properties" className="py-16 bg-colin-offwhite">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header with Clear Sponsored Showcase Identity */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-colin-orange bg-colin-orange/15 px-3 py-1 rounded-full border border-colin-orange/30">
              <Sparkles size={12} className="text-colin-orange" />
              <span>Sponsored Campus Showcase</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-colin-navy tracking-tight font-display">
              Featured Sponsored Accommodations
            </h2>
            <p className="text-sm text-colin-charcoal-600 max-w-xl">
              Displaying verified properties with active homepage sponsorship. Inspected in person by the COLIN team with zero brokerage.
            </p>
          </div>

          {/* Result Count Badge */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-colin-navy bg-white px-3.5 py-1.5 rounded-xl border border-colin-charcoal-200 shadow-sm">
              Showing {properties.length} Sponsored {properties.length === 1 ? 'Stay' : 'Stays'}
            </span>
          </div>
        </motion.div>

        {/* Member Access Restriction Callout Banner */}
        {!isAuthenticated && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 bg-gradient-to-r from-colin-navy-950 via-colin-navy to-colin-navy-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-colin-navy-800 flex flex-col md:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-colin-orange/20 text-colin-orange flex items-center justify-center shrink-0 border border-colin-orange/30">
                <Lock size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm sm:text-base text-white">
                  Full Building Addresses & Landlord Contacts are Protected
                </h4>
                <p className="text-xs text-colin-charcoal-300 max-w-xl leading-relaxed">
                  To protect student safety and avoid unauthorized broker distribution, exact addresses, direct host phone numbers, and visit booking slots require a free member account.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={() => demoLogin('student')}
                className="w-full md:w-auto px-4 py-2 bg-colin-teal hover:bg-colin-teal-600 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Sparkles size={13} className="text-colin-orange" />
                <span>Quick Sign In</span>
              </button>
              <button
                onClick={() => openAuthModal(undefined, 'Sign in or register for a free COLIN account to unlock complete property details and owner direct phone lines.')}
                className="w-full md:w-auto px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl transition-colors whitespace-nowrap"
              >
                Sign In
              </button>
            </div>
          </motion.div>
        )}

        {/* Properties Grid with Staggered Fade Up */}
        {properties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
            {properties.map((property, idx) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.15 }}
                transition={{ duration: 0.5, delay: (idx % 4) * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
              >
                <PropertyCard property={property} />
              </motion.div>
            ))}
          </div>
        ) : (
          /* Empty State for Sponsored Showcase */
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false, amount: 0.2 }}
            className="bg-white rounded-3xl border border-colin-charcoal-200 p-10 sm:p-14 text-center space-y-4 max-w-lg mx-auto shadow-sm"
          >
            <div className="w-16 h-16 bg-colin-navy-50 text-colin-navy rounded-2xl mx-auto flex items-center justify-center">
              <Building2 size={32} className="text-colin-teal" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-extrabold text-colin-navy">
                No Sponsored Listings Match Filters
              </h3>
              <p className="text-xs text-colin-charcoal-500">
                Try widening your budget, resetting filters, or selecting all campuses to see available verified properties.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onResetFilters}
                className="font-bold text-xs"
                leftIcon={<FilterX size={14} />}
              >
                Reset All Filters
              </Button>
            </div>
          </motion.div>
        )}

      </div>
    </section>
  );
};
