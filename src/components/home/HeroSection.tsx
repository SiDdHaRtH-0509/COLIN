import React from 'react';
import { SearchFilterState } from '../../types';
import { SearchFilterBar } from './SearchFilterBar';
import { ColinCertifiedBadge } from '../common/ColinCertifiedBadge';
import { 
  Award
} from 'lucide-react';

interface HeroSectionProps {
  filters: SearchFilterState;
  onFilterChange: (filters: SearchFilterState) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ filters, onFilterChange }) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-colin-navy-50/60 via-white to-colin-offwhite pt-8 pb-16 lg:pt-14 lg:pb-24">
      {/* Decorative Brand Background Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-colin-teal/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute top-20 right-10 w-80 h-80 bg-colin-orange/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-1/3 w-72 h-72 bg-colin-navy/5 rounded-full blur-2xl -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Headline, Trust Pillars, Badges */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Trust Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-colin-teal/10 border border-colin-teal/30 text-colin-teal-800 text-xs font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-colin-teal animate-pulse" />
              <Award size={14} className="text-colin-teal" />
              <span>India’s 1st In-Person Verified Student Living Platform</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-colin-navy tracking-tight leading-[1.12] font-display">
              Find Your Safe, <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-colin-teal via-colin-teal-600 to-colin-navy">
                Verified Student Home
              </span>{' '}
              Near Campus.
            </h1>

            {/* Sub-headline */}
            <p className="text-base sm:text-lg text-colin-charcoal-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Say goodbye to deceptive brokers, misleading photos, and fake listings. COLIN brings 100% in-person inspected student PGs, hostels, and co-living with zero brokerage and transparent visit slots.
            </p>

            {/* Quick Metrics / Guarantees */}
            <div className="grid grid-cols-3 gap-3 pt-2 max-w-lg mx-auto lg:mx-0">
              <div className="bg-white/80 backdrop-blur-sm border border-colin-charcoal-200/80 rounded-2xl p-3 shadow-sm text-left">
                <div className="text-xl sm:text-2xl font-black text-colin-navy">100%</div>
                <div className="text-[11px] font-bold text-colin-teal-700">In-Person Inspected</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-colin-charcoal-200/80 rounded-2xl p-3 shadow-sm text-left">
                <div className="text-xl sm:text-2xl font-black text-colin-navy">₹0</div>
                <div className="text-[11px] font-bold text-colin-orange-700">Zero Brokerage</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-colin-charcoal-200/80 rounded-2xl p-3 shadow-sm text-left">
                <div className="text-xl sm:text-2xl font-black text-colin-navy">55%</div>
                <div className="text-[11px] font-bold text-colin-teal-700">Slot Refund Promise</div>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Visual Showcase with Floating Cards */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Main Feature Photo Card */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white aspect-[4/3] bg-colin-navy-900 group">
                <img
                  src="https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1000&q=80"
                  alt="Modern COLIN Verified Student Residence"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-colin-navy-950/85 via-black/20 to-transparent" />
                
                {/* Floating On-Image Info */}
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="mb-2">
                    <ColinCertifiedBadge variant="glass" size="sm" score={99} showScore />
                  </div>
                  <div className="text-lg font-black truncate">COLIN Heights — North Campus</div>
                  <div className="text-xs text-colin-charcoal-300 flex items-center justify-between mt-1">
                    <span>350m to Delhi University</span>
                    <span className="font-bold text-colin-orange">₹12,500/mo</span>
                  </div>
                </div>
              </div>

              {/* Floating Top Badge: Logo-Inspired COLIN Certified Emblem */}
              <div className="absolute -top-5 -left-4 sm:-left-6 bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-2xl border-2 border-colin-teal/40 flex items-center gap-2 animate-float-slow">
                <ColinCertifiedBadge variant="light" size="md" score={99} showScore />
              </div>

              {/* Floating Bottom Card: Community */}
              <div className="absolute -bottom-5 -right-4 sm:-right-6 bg-white rounded-2xl p-3 shadow-xl border border-colin-charcoal-200 flex items-center gap-3 animate-float-slow" style={{ animationDelay: '1.5s' }}>
                <div className="flex -space-x-2">
                  <img
                    className="w-8 h-8 rounded-full border-2 border-white object-cover"
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                    alt="Student"
                  />
                  <img
                    className="w-8 h-8 rounded-full border-2 border-white object-cover"
                    src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=100&q=80"
                    alt="Student"
                  />
                  <img
                    className="w-8 h-8 rounded-full border-2 border-white object-cover"
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80"
                    alt="Student"
                  />
                </div>
                <div>
                  <div className="text-xs font-black text-colin-navy">50,000+ Students</div>
                  <div className="text-[10px] text-colin-teal-700 font-bold">Safe & Welcoming Hubs</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Integrated Search Filter Bar */}
        <div className="mt-12 sm:mt-16">
          <SearchFilterBar filters={filters} onFilterChange={onFilterChange} />
        </div>
      </div>
    </section>
  );
};
