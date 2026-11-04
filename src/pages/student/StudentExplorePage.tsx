import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PROPERTIES, CITIES, UNIVERSITIES_LIST } from '../../data/mockData';
import { AccommodationType, GenderPreference, SharingType, isPropertyCertified, Property } from '../../types';
import { useStudent } from '../../context/StudentContext';
import { useProperties } from '../../context/PropertyContext';
import {
  getCurrentUserLocation,
  calculateHaversineDistance,
  Coordinates,
} from '../../services/locationService';
import {
  Search,
  SlidersHorizontal,
  X,
  ShieldCheck,
  ArrowUpDown,
  RotateCcw,
  GraduationCap,
  LocateFixed,
  Loader2,
  AlertCircle,
  LayoutGrid,
  List,
  Map as MapIcon,
  ArrowUp,
  Sparkles,
  MapPin,
  IndianRupee,
} from 'lucide-react';
import { StudentPropertyCard } from '../../components/student/StudentPropertyCard';
import { StudentPropertyListItem } from '../../components/student/StudentPropertyListItem';
import { Button } from '../../components/common/Button';

interface PropertyWithGps extends Property {
  gpsDistanceKm?: number;
}

export type ViewMode = 'grid' | 'list' | 'map';

const STORAGE_KEY = 'colin_find_stays_filters_v5';

export const StudentExplorePage: React.FC = () => {
  const { studentPreferences, recentlyViewedProperties, wishlist } = useStudent();
  const location = useLocation();
  const navState = (location.state || {}) as any;

  // Load initial filter state from navState or sessionStorage (preserves state when opening stay and returning)
  const savedState = useMemo(() => {
    try {
      const data = sessionStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }, []);

  // View mode state (Grid / List / Map)
  const [viewMode, setViewMode] = useState<ViewMode>(navState?.viewMode || savedState?.viewMode || 'grid');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState(
    navState.searchQuery !== undefined ? navState.searchQuery : (savedState?.searchQuery || '')
  );
  const [selectedCity, setSelectedCity] = useState<string>(
    navState.selectedCity || savedState?.selectedCity || 'All Cities'
  );
  const [selectedUniversity, setSelectedUniversity] = useState<string>(
    navState.selectedUniversity || savedState?.selectedUniversity || 'All Universities / Institutes'
  );
  const [selectedCategory, setSelectedCategory] = useState<AccommodationType>(
    navState.selectedCategory || savedState?.selectedCategory || 'all'
  );
  const [selectedGender, setSelectedGender] = useState<'all' | GenderPreference>(
    navState.selectedGender || savedState?.selectedGender || 'all'
  );
  const [selectedSharing, setSelectedSharing] = useState<'all' | SharingType>(
    navState.selectedSharing || savedState?.selectedSharing || 'all'
  );
  const [maxBudget, setMaxBudget] = useState<number>(
    navState.maxBudget || savedState?.maxBudget || 25000
  );

  // Amenity and verification toggles
  const [certifiedOnly, setCertifiedOnly] = useState<boolean>(savedState?.certifiedOnly || false);
  const [foodOnly, setFoodOnly] = useState<boolean>(savedState?.foodOnly || false);
  const [acOnly, setAcOnly] = useState<boolean>(savedState?.acOnly || false);
  const [wifiOnly, setWifiOnly] = useState<boolean>(savedState?.wifiOnly || false);
  const [laundryOnly, setLaundryOnly] = useState<boolean>(savedState?.laundryOnly || false);
  const [securityOnly, setSecurityOnly] = useState<boolean>(savedState?.securityOnly || false);

  // Location-aware discovery state
  const [userCoords, setUserCoords] = useState<Coordinates | null>(
    navState.userCoords || null
  );
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    navState.userCoords ? 'success' : 'idle'
  );
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationRadius, setLocationRadius] = useState<number>(
    navState.locationRadius !== undefined ? navState.locationRadius : (savedState?.locationRadius || 0)
  );

  // Sorting
  const [sortBy, setSortBy] = useState<'default' | 'rent-asc' | 'rent-desc' | 'distance' | 'nearest-gps' | 'rating' | 'recent'>(
    navState.sortBy || savedState?.sortBy || (navState.userCoords ? 'nearest-gps' : 'default')
  );

  // Pagination / Load More batch count
  const [visibleCount, setVisibleCount] = useState<number>(6);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Filter Drawer visibility
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Back to Top button visibility
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Check if Google Maps API key exists
  const hasGoogleMapsApiKey = Boolean((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY);

  // Track window scroll for Back to Top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Persist filter state into sessionStorage whenever values change
  useEffect(() => {
    try {
      const state = {
        viewMode,
        searchQuery,
        selectedCity,
        selectedUniversity,
        selectedCategory,
        selectedGender,
        selectedSharing,
        maxBudget,
        certifiedOnly,
        foodOnly,
        acOnly,
        wifiOnly,
        laundryOnly,
        securityOnly,
        sortBy,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  }, [
    viewMode,
    searchQuery,
    selectedCity,
    selectedUniversity,
    selectedCategory,
    selectedGender,
    selectedSharing,
    maxBudget,
    certifiedOnly,
    foodOnly,
    acOnly,
    wifiOnly,
    laundryOnly,
    securityOnly,
    sortBy,
  ]);

  // Handle GPS location request (explicit user action)
  const handleRequestLocation = async () => {
    setLocationStatus('loading');
    setLocationError(null);

    const result = await getCurrentUserLocation();

    if (result.coords) {
      setUserCoords(result.coords);
      setLocationStatus('success');
      setSortBy('nearest-gps');
      if (locationRadius === 0) {
        setLocationRadius(10); // default to 10 km radius on initial GPS trigger
      }
    } else {
      setLocationStatus('error');
      setLocationError(result.error || 'Could not determine your location.');
    }
  };

  const handleClearLocation = () => {
    setUserCoords(null);
    setLocationStatus('idle');
    setLocationError(null);
    setLocationRadius(0);
    if (sortBy === 'nearest-gps') {
      setSortBy('default');
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCity('All Cities');
    setSelectedUniversity('All Universities / Institutes');
    setSelectedCategory('all');
    setSelectedGender('all');
    setSelectedSharing('all');
    setMaxBudget(25000);
    setCertifiedOnly(false);
    setFoodOnly(false);
    setAcOnly(false);
    setWifiOnly(false);
    setLaundryOnly(false);
    setSecurityOnly(false);
    handleClearLocation();
    setSortBy('default');
    setVisibleCount(6);
  };

  // Count active filters (excluding default values)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedCity !== 'All Cities') count++;
    if (selectedUniversity !== 'All Universities / Institutes') count++;
    if (selectedCategory !== 'all') count++;
    if (selectedGender !== 'all') count++;
    if (selectedSharing !== 'all') count++;
    if (maxBudget < 25000) count++;
    if (certifiedOnly) count++;
    if (foodOnly) count++;
    if (acOnly) count++;
    if (wifiOnly) count++;
    if (laundryOnly) count++;
    if (securityOnly) count++;
    if (userCoords) count++;
    return count;
  }, [
    searchQuery,
    selectedCity,
    selectedUniversity,
    selectedCategory,
    selectedGender,
    selectedSharing,
    maxBudget,
    certifiedOnly,
    foodOnly,
    acOnly,
    wifiOnly,
    laundryOnly,
    securityOnly,
    userCoords,
  ]);

  let propertiesSource = PROPERTIES;
  try {
    const propCtx = useProperties();
    if (propCtx?.properties) {
      propertiesSource = propCtx.properties;
    }
  } catch {}

  // Compute GPS distances and filter/sort properties
  const filteredProperties = useMemo(() => {
    // 1. Map properties with calculated GPS distance if userCoords available
    const propertiesWithDistance: PropertyWithGps[] = propertiesSource
      .filter((p) => !p.listingStatus || p.listingStatus === 'active')
      .map((p) => {
      let gpsDistanceKm: number | undefined;
      if (userCoords && p.latitude && p.longitude) {
        gpsDistanceKm = calculateHaversineDistance(
          userCoords.latitude,
          userCoords.longitude,
          p.latitude,
          p.longitude
        );
      }
      return { ...p, gpsDistanceKm };
    });

    // 2. Filter properties
    let result = propertiesWithDistance.filter((p) => {
      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          p.title.toLowerCase().includes(query) ||
          p.neighborhood.toLowerCase().includes(query) ||
          p.city.toLowerCase().includes(query) ||
          p.landmark.toLowerCase().includes(query) ||
          p.nearbyUniversity.toLowerCase().includes(query) ||
          p.amenities.some((a) => a.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      // City filter
      if (selectedCity !== 'All Cities' && p.city !== selectedCity) {
        return false;
      }

      // University / Campus filter
      if (
        selectedUniversity !== 'All Universities / Institutes' &&
        !p.nearbyUniversity.toLowerCase().includes(selectedUniversity.toLowerCase().split('(')[0].trim())
      ) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      // Gender preference filter
      if (selectedGender !== 'all' && p.gender !== selectedGender && p.gender !== 'unisex') {
        return false;
      }

      // Sharing type filter
      if (selectedSharing !== 'all' && p.sharingType !== selectedSharing) {
        return false;
      }

      // Max rent filter
      if (p.rentMonthly > maxBudget) {
        return false;
      }

      // COLIN Certified filter — only properties that meet all verification criteria
      if (certifiedOnly && !isPropertyCertified(p)) {
        return false;
      }

      // Food inclusion
      if (foodOnly && !p.foodIncluded) {
        return false;
      }

      // AC amenity
      if (acOnly && !p.amenities.some((a) => a.toLowerCase().includes('ac') || a.toLowerCase().includes('air conditioning'))) {
        return false;
      }

      // Wi-Fi amenity
      if (wifiOnly && !p.amenities.some((a) => a.toLowerCase().includes('wi-fi') || a.toLowerCase().includes('wifi'))) {
        return false;
      }

      // Laundry amenity
      if (laundryOnly && !p.amenities.some((a) => a.toLowerCase().includes('laundry') || a.toLowerCase().includes('washing'))) {
        return false;
      }

      // Security / Biometric
      if (
        securityOnly &&
        !p.amenities.some(
          (a) =>
            a.toLowerCase().includes('security') ||
            a.toLowerCase().includes('cctv') ||
            a.toLowerCase().includes('biometric') ||
            a.toLowerCase().includes('guard')
        )
      ) {
        return false;
      }

      // GPS Radius Filter (if radius > 0 and userCoords active)
      if (locationRadius > 0 && userCoords) {
        if (p.gpsDistanceKm === undefined || p.gpsDistanceKm > locationRadius) {
          return false;
        }
      }

      return true;
    });

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === 'nearest-gps') {
        if (a.gpsDistanceKm !== undefined && b.gpsDistanceKm !== undefined) {
          return a.gpsDistanceKm - b.gpsDistanceKm;
        }
        if (a.gpsDistanceKm !== undefined) return -1;
        if (b.gpsDistanceKm !== undefined) return 1;
      }

      if (sortBy === 'default') {
        if (a.isSponsored && !b.isSponsored) return -1;
        if (!a.isSponsored && b.isSponsored) return 1;
        return (b.certificationScore || 90) - (a.certificationScore || 90);
      }
      if (sortBy === 'rent-asc') return a.rentMonthly - b.rentMonthly;
      if (sortBy === 'rent-desc') return b.rentMonthly - a.rentMonthly;
      if (sortBy === 'distance') {
        const getDist = (str: string) => {
          const num = parseFloat(str) || 0;
          return str.includes('km') ? num * 1000 : num;
        };
        return getDist(a.distanceToUniversity) - getDist(b.distanceToUniversity);
      }
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'recent') {
        return (b.id || '').localeCompare(a.id || '');
      }
      return 0;
    });

    return result;
  }, [
    userCoords,
    locationRadius,
    searchQuery,
    selectedCity,
    selectedUniversity,
    selectedCategory,
    selectedGender,
    selectedSharing,
    maxBudget,
    certifiedOnly,
    foodOnly,
    acOnly,
    wifiOnly,
    laundryOnly,
    securityOnly,
    sortBy,
  ]);

  // Paginated visible slice
  const visibleProperties = useMemo(() => {
    return filteredProperties.slice(0, visibleCount);
  }, [filteredProperties, visibleCount]);

  // Load More handler with brief tactile spinner
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 6, filteredProperties.length));
      setIsLoadingMore(false);
    }, 250);
  };

  // Contextual Recommendations (Campus & Budget)
  const campusRecommendations = useMemo(() => {
    const uni = studentPreferences.university || 'Delhi University';
    return PROPERTIES.filter(
      (p) => p.nearbyUniversity.toLowerCase().includes(uni.toLowerCase().split('(')[0].trim())
    ).slice(0, 3);
  }, [studentPreferences.university]);

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto pb-20">
      
      {/* 1. Page Header with Discovery Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-colin-teal bg-colin-teal/10 px-2.5 py-0.5 rounded-full">
              Student Accommodation Marketplace
            </span>
            <span className="text-xs text-colin-charcoal-400 font-medium">
              Zero Brokerage Direct
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-colin-navy tracking-tight font-display">
            Find Your Next Stay — Discover Verified Stays
          </h1>
          <p className="text-xs sm:text-sm text-colin-charcoal-500 mt-1">
            Discover verified PGs, hostels, and shared flats with audited amenities, honest distances, and direct landlord booking.
          </p>
        </div>

        {/* Wishlist / Compare Quick Shortcut */}
        {wishlist.length > 0 && (
          <div className="hidden lg:flex items-center gap-2 bg-rose-50/80 border border-rose-200 px-3.5 py-2 rounded-2xl text-xs text-rose-900">
            <Sparkles size={14} className="text-rose-600" />
            <span>You have <strong>{wishlist.length} stay{wishlist.length > 1 ? 's' : ''} saved</strong> in your shortlist.</span>
          </div>
        )}
      </div>

      {/* ================= 2. MINIMAL STANDARD-GRADE SEARCH BAR ================= */}
      <div
        data-testid="location-first-search-bar"
        className="space-y-2.5"
      >
        <div className="bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-200/90 shadow-sm hover:border-slate-300 focus-within:border-colin-teal focus-within:ring-2 focus-within:ring-colin-teal/20 transition-all flex flex-col md:flex-row items-stretch md:items-center gap-2">
          {/* Main Locality/Landmark Input */}
          <div className="flex-1 flex items-center gap-2.5 px-3 py-1.5 min-w-0">
            <Search size={18} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city, campus, locality, or landmark (e.g. North Campus, Kamla Nagar)..."
              className="w-full text-xs font-semibold text-colin-navy placeholder:text-slate-400 bg-transparent focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 shrink-0 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Desktop divider */}
          <div className="hidden md:block w-px h-6 bg-slate-200" />

          {/* Inline City Select */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 md:bg-transparent rounded-xl">
            <MapPin size={14} className="text-colin-orange shrink-0" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="text-xs font-bold text-colin-navy bg-transparent focus:outline-none cursor-pointer pr-1"
            >
              <option value="All Cities">All Cities</option>
              <option value="Delhi NCR">Delhi NCR</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Pune">Pune</option>
              <option value="Kota">Kota</option>
              <option value="Hyderabad">Hyderabad</option>
            </select>
          </div>

          {/* Desktop divider */}
          <div className="hidden md:block w-px h-6 bg-slate-200" />

          {/* Inline Budget Select */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 md:bg-transparent rounded-xl">
            <IndianRupee size={14} className="text-emerald-600 shrink-0" />
            <select
              value={maxBudget}
              onChange={(e) => setMaxBudget(Number(e.target.value))}
              className="text-xs font-bold text-colin-navy bg-transparent focus:outline-none cursor-pointer pr-1"
            >
              <option value={10000}>Up to ₹10k</option>
              <option value={15000}>Up to ₹15k</option>
              <option value={20000}>Up to ₹20k</option>
              <option value={25000}>Up to ₹25k</option>
              <option value={35000}>Up to ₹35k</option>
            </select>
          </div>

          {/* GPS Button */}
          <button
            type="button"
            onClick={userCoords ? handleClearLocation : handleRequestLocation}
            disabled={locationStatus === 'loading'}
            className={`p-2.5 rounded-xl border transition-all flex items-center justify-center shrink-0 ${
              userCoords
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200 hover:text-colin-teal'
            }`}
            title={userCoords ? 'GPS Active (Click to clear)' : 'Use Current Location'}
            aria-label="Use Current Location"
          >
            {locationStatus === 'loading' ? (
              <Loader2 size={16} className="animate-spin text-colin-teal" />
            ) : (
              <LocateFixed size={16} className={userCoords ? 'text-emerald-600' : 'text-slate-500'} />
            )}
          </button>

          {/* Search Stays Button */}
          <Button
            type="button"
            variant="primary"
            size="md"
            className="px-5 py-2.5 text-xs font-bold shrink-0 justify-center shadow-xs"
            onClick={() => setVisibleCount(6)}
          >
            Search Stays
          </Button>

          {/* Filter Drawer Toggle */}
          <button
            type="button"
            onClick={() => setFilterDrawerOpen(true)}
            className="p-2.5 rounded-xl border border-slate-200 hover:border-colin-teal bg-slate-50 hover:bg-slate-100 text-colin-navy transition-colors relative shrink-0"
            title="More Filters"
          >
            <SlidersHorizontal size={16} />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-colin-teal text-white text-[9px] font-black flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* GPS Radius Pills (when GPS is active) */}
        {userCoords && (
          <div className="flex items-center gap-2 flex-wrap text-xs px-1">
            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>GPS Proximity:</span>
            </span>
            {[
              { val: 2, label: 'Within 2 km' },
              { val: 5, label: 'Within 5 km' },
              { val: 10, label: 'Within 10 km' },
              { val: 20, label: 'Within 20 km' },
              { val: 0, label: 'Any Distance' },
            ].map((rad) => (
              <button
                key={rad.val}
                type="button"
                onClick={() => setLocationRadius(rad.val)}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all border ${
                  locationRadius === rad.val
                    ? 'bg-colin-teal text-white border-colin-teal shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {rad.label}
              </button>
            ))}
          </div>
        )}

        {/* Locality Quick Pills */}
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 px-1">
          <span className="font-semibold text-colin-charcoal-400">Popular:</span>
          {['North Campus', 'Kamla Nagar', 'Koramangala', 'Viman Nagar', 'Landmark City', 'Bandra'].map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setSearchQuery(loc)}
              className={`px-2 py-0.5 rounded-lg border transition-all ${
                searchQuery === loc
                  ? 'bg-colin-navy text-white border-colin-navy'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Category Tabs (All Stays, Premium PGs, Student Hostels, Shared Flats) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'All Stays' },
          { id: 'pg', label: 'Premium PGs' },
          { id: 'hostel', label: 'Student Hostels' },
          { id: 'flat', label: 'Shared Flats' },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id as any)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border shadow-xs ${
              selectedCategory === cat.id
                ? 'bg-colin-navy text-white border-colin-navy ring-2 ring-colin-teal/40'
                : 'bg-white text-colin-navy border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 2. Quick Discovery Filter Shortcuts (Section 4 Point 2) */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Quick Discovery Categories:
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              if (selectedUniversity === studentPreferences.university) {
                setSelectedUniversity('All Universities / Institutes');
              } else {
                setSelectedUniversity(studentPreferences.university || 'Delhi University');
              }
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 shadow-xs ${
              selectedUniversity !== 'All Universities / Institutes'
                ? 'bg-colin-navy text-white border-colin-navy ring-2 ring-colin-teal/40'
                : 'bg-white text-colin-navy border-slate-200 hover:bg-slate-50'
            }`}
          >
            <GraduationCap size={14} className="text-colin-teal" />
            <span>Near My Campus</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (maxBudget === studentPreferences.maxBudget) {
                setMaxBudget(25000);
              } else {
                setMaxBudget(studentPreferences.maxBudget || 15000);
              }
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 shadow-xs ${
              maxBudget === studentPreferences.maxBudget
                ? 'bg-colin-navy text-white border-colin-navy ring-2 ring-colin-teal/40'
                : 'bg-white text-colin-navy border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>Under My Budget (₹{studentPreferences.maxBudget.toLocaleString('en-IN')})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedGender(selectedGender === 'girls' ? 'all' : 'girls')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 shadow-xs ${
              selectedGender === 'girls'
                ? 'bg-colin-orange text-colin-navy-950 border-colin-orange font-black ring-2 ring-colin-orange/40'
                : 'bg-white text-colin-navy border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>Girls Only</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedGender(selectedGender === 'boys' ? 'all' : 'boys')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 shadow-xs ${
              selectedGender === 'boys'
                ? 'bg-colin-navy text-white border-colin-navy ring-2 ring-colin-teal/40'
                : 'bg-white text-colin-navy border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>Boys Only</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedGender(selectedGender === 'unisex' ? 'all' : 'unisex')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 shadow-xs ${
              selectedGender === 'unisex'
                ? 'bg-colin-navy text-white border-colin-navy ring-2 ring-colin-teal/40'
                : 'bg-white text-colin-navy border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>Co-ed Stays</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedSharing(selectedSharing === 'single' ? 'all' : 'single')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 shadow-xs ${
              selectedSharing === 'single'
                ? 'bg-colin-navy text-white border-colin-navy ring-2 ring-colin-teal/40'
                : 'bg-white text-colin-navy border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>Single Sharing</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedSharing(selectedSharing === 'double' ? 'all' : 'double')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 shadow-xs ${
              selectedSharing === 'double'
                ? 'bg-colin-navy text-white border-colin-navy ring-2 ring-colin-teal/40'
                : 'bg-white text-colin-navy border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>Double Sharing</span>
          </button>

          <button
            type="button"
            onClick={() => setCertifiedOnly(!certifiedOnly)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 shadow-xs ${
              certifiedOnly
                ? 'bg-colin-teal text-white border-colin-teal font-black ring-2 ring-colin-teal/40'
                : 'bg-white text-colin-navy border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck size={14} className={certifiedOnly ? 'text-white' : 'text-colin-teal'} />
            <span>COLIN Certified</span>
          </button>
        </div>
      </div>

      {/* 3. Sticky Discovery Controls Bar (Section 4 Point 5) */}
      <div
        data-testid="discovery-controls-bar"
        className="sticky top-0 z-20 bg-colin-offwhite/95 backdrop-blur-md py-3 border-y border-colin-charcoal-200/80 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: View Mode Selector (Grid / List / Map) */}
          <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid View"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'grid'
                  ? 'bg-colin-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-colin-navy hover:bg-slate-50'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={15} />
              <span>Grid View</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List View"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-colin-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-colin-navy hover:bg-slate-50'
              }`}
              title="List View"
            >
              <List size={15} />
              <span>List View</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('map')}
              aria-label="Map View"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'map'
                  ? 'bg-colin-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-colin-navy hover:bg-slate-50'
              }`}
              title="Map View"
            >
              <MapIcon size={15} />
              <span>Map View</span>
            </button>
          </div>

          {/* Center / Right: Result Count & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="text-xs font-bold text-colin-navy hidden sm:inline">
              <strong>{filteredProperties.length}</strong> stays found
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setFilterDrawerOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-colin-navy border border-slate-200 hover:bg-slate-50 shadow-xs"
            >
              <SlidersHorizontal size={14} className="text-colin-teal" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-colin-teal text-white flex items-center justify-center text-[10px] font-black">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="relative flex items-center">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none bg-white text-xs font-bold text-colin-navy border border-slate-200 rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-colin-teal/40 shadow-xs cursor-pointer"
              >
                <option value="default">Sort: Recommended</option>
                <option value="rent-asc">Rent: Low to High</option>
                <option value="rent-desc">Rent: High to Low</option>
                <option value="distance">Nearest to Campus</option>
                {userCoords && <option value="nearest-gps">Nearest GPS Distance</option>}
                <option value="rating">Highest Rated</option>
                <option value="recent">Recently Added</option>
              </select>
              <ArrowUpDown size={13} className="absolute right-2.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Clear All Filters Button */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="p-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                title="Clear all filters"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Active:</span>

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-colin-navy text-[11px] font-semibold">
                <span>"{searchQuery}"</span>
                <X size={12} className="cursor-pointer text-slate-400 hover:text-rose-600" onClick={() => setSearchQuery('')} />
              </span>
            )}

            {selectedCity !== 'All Cities' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-colin-navy text-[11px] font-semibold">
                <span>City: {selectedCity}</span>
                <X size={12} className="cursor-pointer text-slate-400 hover:text-rose-600" onClick={() => setSelectedCity('All Cities')} />
              </span>
            )}

            {selectedUniversity !== 'All Universities / Institutes' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-colin-navy text-[11px] font-semibold">
                <span>Campus: {selectedUniversity.split('(')[0]}</span>
                <X size={12} className="cursor-pointer text-slate-400 hover:text-rose-600" onClick={() => setSelectedUniversity('All Universities / Institutes')} />
              </span>
            )}

            {maxBudget < 25000 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-colin-navy text-[11px] font-semibold">
                <span>Budget: ≤ ₹{maxBudget.toLocaleString('en-IN')}</span>
                <X size={12} className="cursor-pointer text-slate-400 hover:text-rose-600" onClick={() => setMaxBudget(25000)} />
              </span>
            )}

            {selectedGender !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-colin-navy text-[11px] font-semibold">
                <span className="capitalize">{selectedGender} Only</span>
                <X size={12} className="cursor-pointer text-slate-400 hover:text-rose-600" onClick={() => setSelectedGender('all')} />
              </span>
            )}

            {certifiedOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                <span>COLIN Certified</span>
                <X size={12} className="cursor-pointer text-emerald-600 hover:text-rose-600" onClick={() => setCertifiedOnly(false)} />
              </span>
            )}

            {userCoords && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-[11px] font-bold">
                <span>GPS Radius ({locationRadius} km)</span>
                <X size={12} className="cursor-pointer text-teal-700 hover:text-rose-600" onClick={handleClearLocation} />
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-colin-teal hover:underline ml-1"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* 4. Main Results View Switcher */}

      {/* VIEW A: MAP VIEW (Section 4 Point 1 Requirement) */}
      {viewMode === 'map' && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-colin-navy text-white flex items-center justify-center mx-auto shadow-md">
            <MapIcon size={30} className="text-colin-teal" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-colin-teal bg-colin-teal/10 px-2.5 py-0.5 rounded-full">
              Google Maps Platform
            </span>
            <h3 className="text-xl font-extrabold text-colin-navy font-display">
              Google Maps Interactive Discovery
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {hasGoogleMapsApiKey
                ? 'Displaying properties on Google Maps coordinates.'
                : 'Google Maps API integration is currently in progress. To prevent confusing placeholders or fabricated pins, please explore verified coordinates using Grid View or List View, or apply our live GPS distance calculator.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setViewMode('grid')}
              leftIcon={<LayoutGrid size={15} />}
            >
              Switch to Grid View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('list')}
              leftIcon={<List size={15} />}
            >
              Switch to List View
            </Button>
          </div>
        </div>
      )}

      {/* VIEW B: LIST VIEW (Section 4 Point 1 Requirement) */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {visibleProperties.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto text-xl font-bold">
                0
              </div>
              <h3 className="text-lg font-bold text-colin-navy">No Accommodations Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No verified stays match your current filter combination. Try clearing some filters or expanding your budget range.
              </p>
              <Button variant="primary" size="sm" onClick={handleResetFilters}>
                Reset All Filters
              </Button>
            </div>
          ) : (
            visibleProperties.map((prop) => (
              <StudentPropertyListItem key={prop.id} property={prop} />
            ))
          )}
        </div>
      )}

      {/* VIEW C: GRID VIEW (Default 3-Column Responsive Grid) */}
      {viewMode === 'grid' && (
        <div>
          {visibleProperties.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto text-xl font-bold">
                0
              </div>
              <h3 className="text-lg font-bold text-colin-navy">No Accommodations Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No verified stays match your current filter combination. Try clearing some filters or expanding your budget range.
              </p>
              <Button variant="primary" size="sm" onClick={handleResetFilters}>
                Reset All Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleProperties.map((prop) => (
                <StudentPropertyCard key={prop.id} property={prop} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Pagination / Load More Controller (Section 4 Point 2) */}
      {viewMode !== 'map' && filteredProperties.length > 0 && (
        <div className="pt-6 flex flex-col items-center justify-center gap-3">
          <div className="text-xs font-semibold text-slate-500">
            Showing {Math.min(visibleCount, filteredProperties.length)} of {filteredProperties.length} verified stays
          </div>

          {visibleCount < filteredProperties.length && (
            <Button
              variant="outline"
              size="md"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-6 py-2.5 text-xs font-bold shadow-xs hover:border-colin-teal"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 size={15} className="animate-spin text-colin-teal mr-2" />
                  <span>Loading More Stays...</span>
                </>
              ) : (
                <span>Load More Stays ({filteredProperties.length - visibleCount} Remaining)</span>
              )}
            </Button>
          )}
        </div>
      )}

      {/* 6. Contextual Discovery Recommendations (Section 4 Point 4) */}
      {viewMode !== 'map' && campusRecommendations.length > 0 && activeFiltersCount === 0 && (
        <div className="pt-10 space-y-4 border-t border-slate-200/80">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-colin-navy font-display">
                Recommended for {studentPreferences.university || 'Your Campus'}
              </h3>
              <p className="text-xs text-slate-500">
                Top-rated verified stays within walking or metro distance of your college.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {campusRecommendations.map((prop) => (
              <StudentPropertyCard key={`rec-${prop.id}`} property={prop} compact />
            ))}
          </div>
        </div>
      )}

      {/* 7. Recently Viewed Stays Strip */}
      {viewMode !== 'map' && recentlyViewedProperties.length > 0 && (
        <div className="pt-8 space-y-4 border-t border-slate-200/80">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-colin-navy font-display">
                Recently Viewed Accommodations
              </h3>
              <p className="text-xs text-slate-500">
                Stays you inspected during this session
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentlyViewedProperties.slice(0, 3).map((prop) => (
              <StudentPropertyCard key={`recent-${prop.id}`} property={prop} compact />
            ))}
          </div>
        </div>
      )}

      {/* 8. Slide-Over Filters Drawer / Modal */}
      {filterDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-colin-navy-950/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setFilterDrawerOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white h-full overflow-y-auto p-6 space-y-6 shadow-2xl animate-slideLeft"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-colin-teal" />
                <h3 className="font-extrabold text-colin-navy text-base">Filter Accommodations</h3>
              </div>
              <button
                type="button"
                onClick={() => setFilterDrawerOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Keyword Search */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">Search by Locality / Keyword</label>
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. North Campus, Kamla Nagar, AC..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-colin-teal/40"
                />
              </div>
            </div>

            {/* City Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">Target City Hub:</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-colin-teal/40"
              >
                <option value="All Cities">All Cities</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Campus Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">College / University Campus:</label>
              <select
                value={selectedUniversity}
                onChange={(e) => setSelectedUniversity(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-colin-teal/40"
              >
                <option value="All Universities / Institutes">All Universities / Institutes</option>
                {UNIVERSITIES_LIST.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Monthly Budget Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700 uppercase">Max Monthly Rent</span>
                <span className="text-colin-teal font-extrabold">₹{maxBudget.toLocaleString('en-IN')}/mo</span>
              </div>
              <input
                type="range"
                min="5000"
                max="35000"
                step="500"
                value={maxBudget}
                onChange={(e) => setMaxBudget(Number(e.target.value))}
                className="w-full accent-colin-teal cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>₹5,000</span>
                <span>₹35,000</span>
              </div>
            </div>

            {/* Gender Policy */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">Gender Policy</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'girls', label: 'Girls' },
                  { value: 'boys', label: 'Boys' },
                  { value: 'unisex', label: 'Co-ed' },
                ].map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setSelectedGender(g.value as any)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                      selectedGender === g.value
                        ? 'bg-colin-navy text-white border-colin-navy'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sharing Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">Room Sharing</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'single', label: 'Single' },
                  { value: 'double', label: 'Double' },
                  { value: 'triple', label: 'Triple' },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSelectedSharing(s.value as any)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                      selectedSharing === s.value
                        ? 'bg-colin-navy text-white border-colin-navy'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Essential Amenities & Certification Toggles */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 uppercase block">Verified Amenities</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={certifiedOnly}
                    onChange={(e) => setCertifiedOnly(e.target.checked)}
                    className="rounded text-colin-teal focus:ring-colin-teal"
                  />
                  <span className="font-bold text-emerald-800">COLIN Certified Only</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={foodOnly}
                    onChange={(e) => setFoodOnly(e.target.checked)}
                    className="rounded text-colin-teal focus:ring-colin-teal"
                  />
                  <span>Food & Meals Included</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acOnly}
                    onChange={(e) => setAcOnly(e.target.checked)}
                    className="rounded text-colin-teal focus:ring-colin-teal"
                  />
                  <span>Air Conditioning (AC)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wifiOnly}
                    onChange={(e) => setWifiOnly(e.target.checked)}
                    className="rounded text-colin-teal focus:ring-colin-teal"
                  />
                  <span>High-Speed Fiber Wi-Fi</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={securityOnly}
                    onChange={(e) => setSecurityOnly(e.target.checked)}
                    className="rounded text-colin-teal focus:ring-colin-teal"
                  />
                  <span>Biometric / RFID Security Gate</span>
                </label>
              </div>
            </div>

            {/* GPS Location Discovery */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 uppercase block">Location-Based Search</label>
              {userCoords ? (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-teal-900 font-bold">
                    <span>GPS Active</span>
                    <button onClick={handleClearLocation} className="text-rose-600 hover:underline text-[11px]">
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-teal-800 uppercase font-semibold">Radius Filter</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[2, 5, 10, 25].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setLocationRadius(r)}
                          className={`py-1 rounded-lg text-xs font-bold border ${
                            locationRadius === r ? 'bg-colin-teal text-white border-colin-teal' : 'bg-white text-slate-600 border-teal-200'
                          }`}
                        >
                          {r} km
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRequestLocation}
                  disabled={locationStatus === 'loading'}
                  className="w-full text-xs font-bold justify-center"
                  leftIcon={locationStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
                >
                  {locationStatus === 'loading' ? 'Locating...' : 'Use Current Location'}
                </Button>
              )}

              {locationError && (
                <div className="text-[11px] text-rose-600 flex items-center gap-1">
                  <AlertCircle size={12} />
                  <span>{locationError}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
              <Button
                variant="primary"
                className="flex-1 justify-center"
                onClick={() => setFilterDrawerOpen(false)}
              >
                Apply Filters ({filteredProperties.length} Stays)
              </Button>
              <Button
                variant="outline"
                onClick={handleResetFilters}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Floating Back to Top Button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          className="fixed bottom-20 md:bottom-6 left-6 z-30 w-11 h-11 rounded-full bg-colin-navy text-white shadow-xl flex items-center justify-center hover:bg-colin-teal active:scale-95 transition-all duration-200 border border-white/20"
        >
          <ArrowUp size={18} />
        </button>
      )}

    </div>
  );
};