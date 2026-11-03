import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStudent } from '../../context/StudentContext';
import { PROPERTIES } from '../../data/mockData';
import { useProperties } from '../../context/PropertyContext';
import {
  VISIT_BOOKING_FEE,
  VISIT_REFUND_AMOUNT,
} from '../../constants/booking';
import {
  Compass,
  Bookmark,
  Scale,
  CalendarCheck2,
  Sparkles,
  MapPin,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Clock,
  Utensils,
  ChevronRight,
  Eye,
  IndianRupee,
  Calendar,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { StudentPropertyCard } from '../../components/student/StudentPropertyCard';

export const StudentDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const {
    wishlist,
    comparisonList,
    visits,
    upcomingVisitsCount,
    studentPreferences,
    profileCompletionPercent,
    missingProfileFields,
    recentlyViewedProperties,
  } = useStudent();

  // Live ticking clock & date (updates every second without page reload)
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentDateTime.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = currentDateTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = currentDateTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // --------------------------------------------------------------------------
  // Personalized Recommendation Slices
  // --------------------------------------------------------------------------
  let propertiesSource = PROPERTIES;
  try {
    const propCtx = useProperties();
    if (propCtx?.properties) propertiesSource = propCtx.properties;
  } catch {}

  // Campus Recommendations: matches student's university
  const campusRecommendations = propertiesSource
    .filter((p) => !p.listingStatus || p.listingStatus === 'active')
    .filter((p) => {
    const studentUni = (studentPreferences.university || user?.university || '').toLowerCase();
    if (!studentUni) return true;
    const baseUni = studentUni.split('(')[0].trim();
    return p.nearbyUniversity.toLowerCase().includes(baseUni);
  }).slice(0, 3);

  // Check for any pending 12-hour decision visit
  const pendingDecisionVisit = visits.find((v) => v.status === 'VISIT_COMPLETED_DECISION_PENDING');

  // Next upcoming visit pass
  const nextVisit =
    pendingDecisionVisit ||
    visits.find(
      (v) =>
        v.status === 'Confirmed' ||
        v.status === 'Pending' ||
        v.status === 'VISIT_CONFIRMED' ||
        v.status === 'PENDING_COLIN_REVIEW' ||
        v.status === 'AWAITING_OWNER_AVAILABILITY'
    );
  const nextVisitProperty = nextVisit ? propertiesSource.find((p) => p.id === nextVisit.propertyId) : null;

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-20">
      
      {/* ================= 1. VIBRANT BRAND HERO BANNER WITH LIVE TICKING CLOCK ================= */}
      <div className="relative bg-gradient-to-r from-colin-navy-900 via-colin-navy to-[#0D4468] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-colin-navy/15 overflow-hidden border border-white/10">
        {/* Luminous Ambient Brand Lighting */}
        <div className="absolute -top-16 -right-16 w-80 h-80 bg-colin-teal/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-1/4 w-80 h-80 bg-colin-orange/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.04] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3.5 max-w-3xl">
            {/* Live Ticking Clock & Brand Workspace Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 bg-white/12 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-white border border-white/20 shadow-xs">
                <div className="w-4 h-4 rounded-full bg-colin-orange/20 flex items-center justify-center">
                  <Sparkles size={11} className="text-colin-orange" />
                </div>
                <span>COLIN Student Living Workspace</span>
              </div>

              <div
                data-testid="live-clock"
                className="inline-flex items-center gap-2 bg-colin-navy-950/70 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-100 border border-white/15 shadow-xs"
              >
                <Clock size={12} className="text-teal-300 animate-pulse shrink-0" />
                <span>{formattedDate}</span>
                <span className="text-white/30">•</span>
                <span className="font-mono text-teal-300 font-extrabold tracking-wide">{formattedTime}</span>
              </div>
            </div>

            {/* Radiant Student Greeting */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight font-display text-white">
              {getGreeting()},{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-teal-300 to-amber-200">
                {user?.name?.split(' ')[0] || studentPreferences.fullName?.split(' ')[0] || 'Scholar'}
              </span>
              ! 👋
            </h1>

            {/* High-Contrast Interactive Metadata Strip */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md text-white border border-white/15 font-bold transition-colors shadow-2xs">
                <GraduationCap size={15} className="text-teal-300 shrink-0" />
                <span className="truncate max-w-[280px]">
                  {studentPreferences.university || user?.university || 'Delhi University'}
                </span>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md text-white border border-white/15 font-semibold transition-colors shadow-2xs">
                <MapPin size={14} className="text-colin-orange shrink-0" />
                <span>Target City: <strong className="text-amber-200">{studentPreferences.preferredCity}</strong></span>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md text-white border border-white/15 font-semibold transition-colors shadow-2xs">
                <IndianRupee size={14} className="text-emerald-300 shrink-0" />
                <span>Budget: <strong className="text-emerald-200">Up to ₹{studentPreferences.maxBudget.toLocaleString('en-IN')}/mo</strong></span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/20 text-teal-200 border border-teal-400/30 text-xs font-bold shadow-2xs">
                <ShieldCheck size={14} className="text-teal-300 shrink-0" />
                <span>100% In-Person Inspected</span>
              </div>
            </div>
          </div>

          {/* Premium Glassmorphic Profile Completion HUD Card */}
          <Link
            to="/student/profile"
            className="w-full lg:w-72 bg-white/10 hover:bg-white/15 backdrop-blur-lg rounded-2xl p-4 sm:p-4.5 border border-white/20 shadow-lg hover:shadow-xl hover:border-teal-300/40 transition-all duration-300 group block space-y-3 shrink-0"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-teal-400/20 text-teal-300 flex items-center justify-center border border-teal-300/30 group-hover:scale-105 transition-transform">
                  <ShieldCheck size={15} />
                </div>
                <span className="font-extrabold text-white text-xs tracking-tight">Profile Completion</span>
              </div>
              <span className="font-black text-xs text-colin-navy bg-gradient-to-r from-teal-300 to-emerald-300 px-2.5 py-0.5 rounded-full shadow-xs">
                {profileCompletionPercent}%
              </span>
            </div>

            <div className="space-y-1">
              <div className="w-full h-2 rounded-full bg-black/30 border border-white/10 overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-colin-teal via-teal-400 to-amber-300 rounded-full transition-all duration-700 shadow-sm shadow-teal-400/50"
                  style={{ width: `${profileCompletionPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-0.5">
              <span className="text-slate-300 truncate max-w-[180px]">
                {missingProfileFields.length > 0
                  ? `Next: Add ${missingProfileFields[0]}`
                  : 'Profile 100% complete'}
              </span>
              <span className="text-teal-300 font-extrabold group-hover:text-white group-hover:translate-x-1 transition-all flex items-center gap-0.5">
                Edit &rarr;
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* ================= 2. UPCOMING VISIT SUMMARY / 12-HOUR DECISION ALERT ================= */}
      {pendingDecisionVisit ? (
        <div className="bg-gradient-to-r from-colin-navy-950 via-colin-navy to-[#18395e] rounded-3xl p-5 sm:p-6 border-2 border-colin-orange/70 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 text-white animate-scaleUp">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-colin-orange/20 text-colin-orange border border-colin-orange/40 flex items-center justify-center shrink-0 shadow-sm">
              <Clock size={28} className="animate-spin text-colin-orange" />
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-colin-orange bg-colin-orange/20 px-2.5 py-0.5 rounded-full border border-colin-orange/30">
                  Decision Required (12h Timer Active)
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  Ref: {pendingDecisionVisit.bookingReference || pendingDecisionVisit.id}
                </span>
              </div>

              <h3 className="text-base font-extrabold text-white truncate">
                YOUR PROPERTY VISIT IS COMPLETE: {pendingDecisionVisit.propertyTitle}
              </h3>

              <p className="text-xs text-colin-charcoal-200">
                You toured with your ambassador. Submit your final Accept or Reject choice within 12 hours. Eligible for 55% (₹82.50) refund if rejected.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
            <Link to="/student/visits" className="w-full md:w-auto">
              <Button
                variant="accent"
                size="sm"
                className="w-full justify-center text-xs font-black bg-colin-orange text-colin-navy-950 hover:bg-colin-orange-600 shadow-md"
              >
                Submit Decision Now &rarr;
              </Button>
            </Link>
          </div>
        </div>
      ) : nextVisit ? (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50/60 to-white rounded-3xl p-5 sm:p-6 border border-emerald-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            {nextVisitProperty ? (
              <img
                src={nextVisitProperty.featuredImage}
                alt={nextVisit.propertyTitle}
                className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-emerald-200 shadow-xs"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CalendarCheck2 size={24} />
              </div>
            )}

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded-md">
                  Upcoming Inspection Slot
                </span>
                <span className="text-xs font-bold text-colin-navy">
                  Pass ID: {nextVisit.id}
                </span>
              </div>

              <h3 className="text-base font-extrabold text-colin-navy truncate">
                {nextVisit.propertyTitle}
              </h3>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-colin-charcoal-600">
                <span className="flex items-center gap-1 font-semibold text-colin-navy">
                  <Clock size={13} className="text-colin-teal" />
                  <span>{nextVisit.date} • {nextVisit.timeSlot}</span>
                </span>
                <span>•</span>
                <span className="text-colin-charcoal-700 font-medium">
                  Fee Paid: <strong>₹{(nextVisit.feePaid || VISIT_BOOKING_FEE).toFixed(2)}</strong>
                </span>
                <span>•</span>
                <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                  <ShieldCheck size={13} />
                  <span>55% Refund: ₹{VISIT_REFUND_AMOUNT.toFixed(2)} if room not accepted</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
            <Link to="/student/visits" className="w-full md:w-auto">
              <Button variant="primary" size="sm" className="w-full justify-center text-xs">
                View Pass & Details &rarr;
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-colin-navy-50/60 to-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-colin-navy text-white flex items-center justify-center shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-colin-navy">Schedule a Guided Property Inspection</h4>
              <p className="text-[11px] text-slate-500">
                Book in-person physical inspections with verified student accompaniment • ₹150 slot pass with 55% refund guarantee
              </p>
            </div>
          </div>
          <Link to="/student/explore">
            <Button variant="outline" size="sm" className="text-xs whitespace-nowrap">
              Book a Visit &rarr;
            </Button>
          </Link>
        </div>
      )}

      {/* ================= 3. EXPLORE STUDENT WORKSPACE SERVICES (6 BRAND ACCENT CARDS) ================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-colin-navy tracking-tight font-display">
            Explore Student Workspace Services
          </h2>
          <span className="text-xs text-colin-charcoal-400 font-medium hidden sm:inline">
            Direct shortcuts to accommodation and living tools
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Action 1: Find Stays */}
          <Link
            to="/student/explore"
            className="flex flex-col items-center p-4 rounded-2xl bg-white border border-colin-charcoal-200/90 shadow-sm hover:border-colin-teal hover:shadow-md hover:-translate-y-0.5 transition-all text-center group"
          >
            <div className="w-11 h-11 rounded-2xl bg-colin-teal/10 text-colin-teal flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Compass size={22} />
            </div>
            <span className="text-xs font-extrabold text-colin-navy group-hover:text-colin-teal">
              Find Stays
            </span>
            <span className="text-[10px] text-colin-charcoal-400 mt-0.5">
              {PROPERTIES.length} listings active
            </span>
          </Link>

          {/* Action 2: Saved Stays */}
          <Link
            to="/student/saved"
            className="flex flex-col items-center p-4 rounded-2xl bg-white border border-colin-charcoal-200/90 shadow-sm hover:border-rose-400 hover:shadow-md hover:-translate-y-0.5 transition-all text-center group"
          >
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Bookmark size={22} />
            </div>
            <span className="text-xs font-extrabold text-colin-navy group-hover:text-rose-600">
              Saved Stays
            </span>
            <span className="text-[10px] text-colin-charcoal-400 mt-0.5">
              {wishlist.length} shortlisted
            </span>
          </Link>

          {/* Action 3: Compare */}
          <Link
            to="/student/compare"
            className="flex flex-col items-center p-4 rounded-2xl bg-white border border-colin-charcoal-200/90 shadow-sm hover:border-amber-400 hover:shadow-md hover:-translate-y-0.5 transition-all text-center group"
          >
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Scale size={22} />
            </div>
            <span className="text-xs font-extrabold text-colin-navy group-hover:text-amber-700">
              Compare
            </span>
            <span className="text-[10px] text-colin-charcoal-400 mt-0.5">
              {comparisonList.length}/3 in matrix
            </span>
          </Link>

          {/* Action 4: Book a Visit */}
          <Link
            to="/student/visits"
            className="flex flex-col items-center p-4 rounded-2xl bg-white border border-colin-charcoal-200/90 shadow-sm hover:border-colin-navy hover:shadow-md hover:-translate-y-0.5 transition-all text-center group"
          >
            <div className="w-11 h-11 rounded-2xl bg-colin-navy-50 text-colin-navy flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <CalendarCheck2 size={22} />
            </div>
            <span className="text-xs font-extrabold text-colin-navy group-hover:text-colin-navy-800">
              Book a Visit
            </span>
            <span className="text-[10px] text-colin-charcoal-400 mt-0.5">
              {upcomingVisitsCount > 0 ? `${upcomingVisitsCount} upcoming` : '₹150 slot pass'}
            </span>
          </Link>

          {/* Action 5: COLIN Living */}
          <Link
            to="/student/living"
            className="flex flex-col items-center p-4 rounded-2xl bg-white border border-colin-charcoal-200/90 shadow-sm hover:border-purple-400 hover:shadow-md hover:-translate-y-0.5 transition-all text-center group"
          >
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Sparkles size={22} />
            </div>
            <span className="text-xs font-extrabold text-colin-navy group-hover:text-purple-700">
              COLIN Living
            </span>
            <span className="text-[10px] text-colin-charcoal-400 mt-0.5">
              Laundry & transit
            </span>
          </Link>

          {/* Action 6: TiffinConnect */}
          <Link
            to="/student/tiffin-connect"
            className="flex flex-col items-center p-4 rounded-2xl bg-white border border-colin-charcoal-200/90 shadow-sm hover:border-colin-orange hover:shadow-md hover:-translate-y-0.5 transition-all text-center group"
          >
            <div className="w-11 h-11 rounded-2xl bg-orange-50 text-colin-orange flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Utensils size={22} />
            </div>
            <span className="text-xs font-extrabold text-colin-navy group-hover:text-colin-orange">
              TiffinConnect
            </span>
            <span className="text-[10px] text-colin-charcoal-400 mt-0.5">
              Rotational meals
            </span>
          </Link>
        </div>
      </div>

      {/* ================= 4. RECOMMENDED STAYS FOR YOU ================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-colin-navy tracking-tight font-display flex items-center gap-2">
              <GraduationCap size={20} className="text-colin-teal" />
              <span>Recommended Stays for You</span>
            </h2>
            <p className="text-xs text-colin-charcoal-400">
              Recommended for Your Campus — Accommodations within easy walking distance to {studentPreferences.university || 'your campus'}
            </p>
          </div>

          <Link
            to="/student/explore"
            className="text-xs font-bold text-colin-teal hover:underline flex items-center gap-1"
          >
            <span>Explore All</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(campusRecommendations.length > 0 ? campusRecommendations : PROPERTIES.slice(0, 3)).map((property) => (
            <StudentPropertyCard key={`campus-${property.id}`} property={property} />
          ))}
        </div>
      </div>

      {/* ================= 5. RECENTLY VIEWED PROPERTIES ================= */}
      {recentlyViewedProperties.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-colin-navy tracking-tight font-display flex items-center gap-2">
                <Eye size={18} className="text-colin-teal" />
                <span>Recently Viewed Stays</span>
              </h2>
              <p className="text-xs text-colin-charcoal-400">
                Continue exploring the accommodations you recently checked out
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentlyViewedProperties.slice(0, 3).map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-3xl border border-colin-charcoal-200/90 shadow-sm hover:shadow-md transition-all p-4 flex gap-4 items-center group"
              >
                <img
                  src={property.featuredImage}
                  alt={property.title}
                  className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-slate-100 group-hover:scale-105 transition-transform"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase text-colin-teal truncate">
                      {property.categoryLabel}
                    </span>
                    <span className="text-xs font-black text-colin-navy">
                      ₹{property.rentMonthly.toLocaleString('en-IN')}<span className="text-[10px] text-slate-400 font-normal">/mo</span>
                    </span>
                  </div>
                  <Link
                    to={`/student/property/${property.id}`}
                    className="block text-xs font-extrabold text-colin-navy hover:text-colin-teal truncate"
                  >
                    {property.title}
                  </Link>
                  <div className="flex items-center gap-1 text-[11px] text-colin-charcoal-500 truncate">
                    <MapPin size={11} className="text-colin-orange shrink-0" />
                    <span>{property.neighborhood}, {property.city}</span>
                  </div>
                  <div className="pt-1">
                    <Link
                      to={`/student/property/${property.id}`}
                      className="text-[11px] font-bold text-colin-teal hover:underline flex items-center gap-0.5"
                    >
                      <span>View Specs</span>
                      <ArrowRight size={10} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
