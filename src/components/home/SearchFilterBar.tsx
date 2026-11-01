import React from 'react';
import { SearchFilterState, AccommodationType, GenderPreference } from '../../types';
import { CITIES } from '../../data/mockData';
import { 
  Search, 
  MapPin, 
  Home, 
  Users, 
  ShieldCheck, 
  Utensils, 
  SlidersHorizontal 
} from 'lucide-react';
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
      className="bg-white/95 backdrop-blur-xl rounded-3xl p-4 sm:p-6 shadow-2xl border border-colin-charcoal-200/90 text-colin-charcoal transition-all"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* City / Campus Hub */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-colin-charcoal-500 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin size={13} className="text-colin-teal shrink-0" />
            <span>Campus Hub & City</span>
          </label>
          <div className="relative">
            <select
              value={filters.city}
              onChange={(e) => onFilterChange({ ...filters, city: e.target.value })}
              className="w-full bg-colin-offwhite hover:bg-white border border-colin-charcoal-200 rounded-xl px-3.5 py-3 text-xs sm:text-sm font-semibold text-colin-navy focus:outline-none focus:ring-2 focus:ring-colin-navy focus:border-colin-navy cursor-pointer transition-all appearance-none"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c === 'All Cities' ? 'All Campuses & Cities' : c}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-colin-charcoal-400">
              <SlidersHorizontal size={14} />
            </div>
          </div>
        </div>

        {/* Accommodation Category */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-colin-charcoal-500 uppercase tracking-wider flex items-center gap-1.5">
            <Home size={13} className="text-colin-teal shrink-0" />
            <span>Accommodation Type</span>
          </label>
          <div className="relative">
            <select
              value={filters.category}
              onChange={(e) => onFilterChange({ ...filters, category: e.target.value as AccommodationType })}
              className="w-full bg-colin-offwhite hover:bg-white border border-colin-charcoal-200 rounded-xl px-3.5 py-3 text-xs sm:text-sm font-semibold text-colin-navy focus:outline-none focus:ring-2 focus:ring-colin-navy focus:border-colin-navy cursor-pointer transition-all appearance-none"
            >
              <option value="all">All Accommodation Types</option>
              <option value="pg">PGs (Paying Guest)</option>
              <option value="hostel">Student Hostels</option>
              <option value="rental-room">Private Rental Rooms</option>
              <option value="shared-flat">Shared Student Flats</option>
              <option value="co-living">Modern Co-Living</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-colin-charcoal-400">
              <SlidersHorizontal size={14} />
            </div>
          </div>
        </div>

        {/* Gender / Community Preference */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-colin-charcoal-500 uppercase tracking-wider flex items-center gap-1.5">
            <Users size={13} className="text-colin-teal shrink-0" />
            <span>Stay Preference</span>
          </label>
          <div className="relative">
            <select
              value={filters.gender}
              onChange={(e) => onFilterChange({ ...filters, gender: e.target.value as 'all' | GenderPreference })}
              className="w-full bg-colin-offwhite hover:bg-white border border-colin-charcoal-200 rounded-xl px-3.5 py-3 text-xs sm:text-sm font-semibold text-colin-navy focus:outline-none focus:ring-2 focus:ring-colin-navy focus:border-colin-navy cursor-pointer transition-all appearance-none"
            >
              <option value="all">All Preferences (Any)</option>
              <option value="girls">Girls Only Accommodations</option>
              <option value="boys">Boys Only Accommodations</option>
              <option value="unisex">Co-ed / Open Sharing</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-colin-charcoal-400">
              <SlidersHorizontal size={14} />
            </div>
          </div>
        </div>

        {/* Search Action CTA */}
        <div className="flex items-end">
          <Button
            type="submit"
            variant="accent"
            size="md"
            className="w-full h-[46px] font-extrabold text-colin-navy-950 hover:shadow-brand-orange transition-all"
            leftIcon={<Search size={16} />}
          >
            Find Stays
          </Button>
        </div>
      </div>

      {/* Quick Filter Chips & Budget Slider */}
      <div className="mt-4 pt-3.5 border-t border-colin-charcoal-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-colin-charcoal-500 tracking-wide">Quick Filters:</span>
          
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, certifiedOnly: !filters.certifiedOnly })}
            className={`px-3 py-1.5 rounded-full font-bold text-[11px] transition-all flex items-center gap-1.5 border ${
              filters.certifiedOnly
                ? 'bg-colin-navy text-white border-colin-navy shadow-sm'
                : 'bg-colin-offwhite text-colin-charcoal-600 border-colin-charcoal-200 hover:border-colin-navy/40 hover:bg-white'
            }`}
          >
            <ShieldCheck size={13} className={filters.certifiedOnly ? 'text-colin-orange' : 'text-colin-teal'} />
            <span>COLIN Certified Only</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, foodIncludedOnly: !filters.foodIncludedOnly })}
            className={`px-3 py-1.5 rounded-full font-bold text-[11px] transition-all flex items-center gap-1.5 border ${
              filters.foodIncludedOnly
                ? 'bg-colin-teal text-white border-colin-teal shadow-sm'
                : 'bg-colin-offwhite text-colin-charcoal-600 border-colin-charcoal-200 hover:border-colin-teal/40 hover:bg-white'
            }`}
          >
            <Utensils size={13} className={filters.foodIncludedOnly ? 'text-white' : 'text-colin-teal'} />
            <span>Food Included</span>
          </button>
        </div>

        {/* Budget Max Quick Indicator */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end bg-colin-navy-50/60 md:bg-transparent p-2 md:p-0 rounded-xl">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-colin-charcoal-500">Max Rent:</span>
            <span className="font-black text-colin-navy text-xs sm:text-sm">
              ₹{filters.maxBudget.toLocaleString('en-IN')}<span className="text-[10px] font-normal text-colin-charcoal-500">/mo</span>
            </span>
          </div>
          <input
            type="range"
            min={7000}
            max={25000}
            step={500}
            value={filters.maxBudget}
            onChange={(e) => onFilterChange({ ...filters, maxBudget: Number(e.target.value) })}
            className="w-28 sm:w-36 accent-colin-teal cursor-pointer"
            aria-label="Filter by maximum monthly rent"
          />
        </div>
      </div>
    </form>
  );
};
