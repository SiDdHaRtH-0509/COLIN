import React from 'react';
import { Property } from '../../types';
import { PropertyCard } from '../property/PropertyCard';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, 
  ShieldCheck, 
  FilterX, 
  Lock, 
  Sparkles
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
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-colin-teal">
              <ShieldCheck size={14} />
              <span>Campus Proximity & Verified Listings</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-colin-navy tracking-tight font-display">
              Featured Verified Accommodations
            </h2>
            <p className="text-sm text-colin-charcoal-600 max-w-xl">
              Inspected in person by COLIN volunteers. Zero brokerage, accurate room specifications, and transparent visit slot guarantees.
            </p>
          </div>

          {/* Result Count and Active Filters */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-colin-navy bg-white px-3.5 py-1.5 rounded-xl border border-colin-charcoal-200 shadow-sm">
              Showing {properties.length} Verified Properties
            </span>
          </div>
        </div>

        {/* Member Access Restriction Callout Banner (Prompt Requirement) */}
        {!isAuthenticated && (
          <div className="mb-8 bg-gradient-to-r from-colin-navy-950 via-colin-navy to-colin-navy-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-colin-navy-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-colin-orange/20 text-colin-orange flex items-center justify-center shrink-0 border border-colin-orange/30">
                <Lock size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm sm:text-base text-white">
                  Full Property Details & Landlord Contacts are Restricted
                </h4>
                <p className="text-xs text-colin-charcoal-300 max-w-xl leading-relaxed">
                  To protect student safety and prevent broker scrapers, exact building addresses, owner phone numbers, and visit slot bookings require a free registered COLIN account.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={() => demoLogin('student')}
                className="w-full md:w-auto px-4 py-2 bg-colin-teal hover:bg-colin-teal-600 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Sparkles size={13} className="text-colin-orange" />
                <span>1-Click Student Login</span>
              </button>
              <button
                onClick={() => openAuthModal(undefined, 'Sign in or register to unlock complete property details and owner direct phone lines.')}
                className="w-full md:w-auto px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl transition-colors whitespace-nowrap"
              >
                Sign In
              </button>
            </div>
          </div>
        )}

        {/* Properties Grid */}
        {properties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          /* Empty Search State */
          <div className="bg-white rounded-3xl border border-colin-charcoal-200 p-12 text-center space-y-4 max-w-md mx-auto shadow-sm">
            <div className="w-14 h-14 bg-colin-navy-50 text-colin-navy rounded-full mx-auto flex items-center justify-center">
              <Building2 size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-lg text-colin-navy">No Properties Matched Your Filter</h3>
              <p className="text-xs text-colin-charcoal-500">
                Try adjusting your campus hub, accommodation category, or expanding your rent budget.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              leftIcon={<FilterX size={14} />}
            >
              Reset All Filters
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};
