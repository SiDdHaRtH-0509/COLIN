import React from 'react';
import { SearchFilterState, AccommodationType, GenderPreference } from '../../types';
import { CITIES } from '../../data/mockData';
import { Search, MapPin, Home, SlidersHorizontal, ShieldCheck } from 'lucide-react';
import { Button } from '../common/Button';

interface SearchFilterBarProps {
  filters: SearchFilterState;
  onFilterChange: (filters: SearchFilterState) => void;
  onSearchSubmit?: () => void;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  filters,
  onFilterChange,
  onSearchSubmit,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchSubmit) {
      onSearchSubmit();
    }
    const target = document.getElementById('featured-properties');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/95 backdrop-blur-md rounded-3xl p-4 sm:p-5 shadow-2xl border border-colin-charcoal-200/90 text-colin-charcoal"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* City / Campus Hub */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-colin-charcoal-500 uppercase tracking-wider flex items-center gap-1">
            <MapPin size={13} className="text-colin-teal" />
            <span>Select Campus Hub</span>
          </label>
          <select
            value={filters.city}
            onChange={(e) => onFilterChange({ ...filters, city: e.target.value })}
            className="w-full bg-colin-offwhite hover:bg-white border border-colin-charcoal-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-colin-navy focus:outline-none focus:ring-2 focus:ring-colin-navy cursor-pointer transition-all"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c === 'All Cities' ? '🏛️ All Campuses & Cities' : `📍 ${c}`}
              </option>
            ))}
          </select>
        </div>

        {/* Accommodation Category */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-colin-charcoal-500 uppercase tracking-wider flex items-center gap-1">
            <Home size={13} className="text-colin-teal" />
            <span>Accommodation Type</span>
          </label>
          <select
            value={filters.category}
            onChange={(e) => onFilterChange({ ...filters, category: e.target.value as AccommodationType })}
            className="w-full bg-colin-offwhite hover:bg-white border border-colin-charcoal-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-colin-navy focus:outline-none focus:ring-2 focus:ring-colin-navy cursor-pointer transition-all"
          >
            <option value="all">🏠 All Stay Types</option>
            <option value="pg">🛏️ PGs (Paying Guest)</option>
            <option value="hostel">🏢 Student Hostels</option>
            <option value="rental-room">🔑 Private Rental Rooms</option>
            <option value="shared-flat">🛋️ Shared Flats</option>
            <option value="co-living">✨ Modern Co-Living</option>
          </select>
        </div>

        {/* Gender / Community Preference */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-colin-charcoal-500 uppercase tracking-wider flex items-center gap-1">
            <SlidersHorizontal size={13} className="text-colin-teal" />
            <span>Stay Preference</span>
          </label>
          <select
            value={filters.gender}
            onChange={(e) => onFilterChange({ ...filters, gender: e.target.value as 'all' | GenderPreference })}
            className="w-full bg-colin-offwhite hover:bg-white border border-colin-charcoal-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-colin-navy focus:outline-none focus:ring-2 focus:ring-colin-navy cursor-pointer transition-all"
          >
            <option value="all">👥 All Preferences</option>
            <option value="girls">👩 Girls Only</option>
            <option value="boys">👨 Boys Only</option>
            <option value="unisex">🤝 Co-ed / Open</option>
          </select>
        </div>

        {/* Search Action CTA */}
        <div className="flex items-end">
          <Button
            type="submit"
            variant="accent"
            size="md"
            className="w-full h-[42px] sm:h-[46px] font-extrabold text-colin-navy-950 hover:shadow-brand-orange"
            leftIcon={<Search size={16} />}
          >
            Find Stays
          </Button>
        </div>
      </div>

      {/* Quick Filter Chips & Budget Slider */}
      <div className="mt-3 pt-3 border-t border-colin-charcoal-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-colin-charcoal-500">Quick Filters:</span>
          
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, certifiedOnly: !filters.certifiedOnly })}
            className={`px-3 py-1 rounded-full font-bold text-[11px] transition-all flex items-center gap-1 border ${
              filters.certifiedOnly
                ? 'bg-colin-navy text-white border-colin-navy'
                : 'bg-colin-offwhite text-colin-charcoal-600 border-colin-charcoal-200 hover:border-colin-navy/40'
            }`}
          >
            <ShieldCheck size={12} className={filters.certifiedOnly ? 'text-colin-orange' : 'text-colin-teal'} />
            <span>COLIN Certified Only</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, foodIncludedOnly: !filters.foodIncludedOnly })}
            className={`px-3 py-1 rounded-full font-bold text-[11px] transition-all flex items-center gap-1 border ${
              filters.foodIncludedOnly
                ? 'bg-colin-teal text-white border-colin-teal'
                : 'bg-colin-offwhite text-colin-charcoal-600 border-colin-charcoal-200 hover:border-colin-teal/40'
            }`}
          >
            <span>🍲 Food Included</span>
          </button>
        </div>

        {/* Budget Max Quick Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-colin-charcoal-500">Max Rent:</span>
          <span className="font-extrabold text-colin-navy text-xs">
            Up to ₹{filters.maxBudget.toLocaleString('en-IN')}
          </span>
          <input
            type="range"
            min={7000}
            max={25000}
            step={500}
            value={filters.maxBudget}
            onChange={(e) => onFilterChange({ ...filters, maxBudget: Number(e.target.value) })}
            className="w-24 sm:w-32 accent-colin-teal cursor-pointer"
          />
        </div>
      </div>
    </form>
  );
};
