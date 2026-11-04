import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PROPERTIES } from '../../data/mockData';
import { isPropertyCertified, Property } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useStudent } from '../../context/StudentContext';
import { useProperties } from '../../context/PropertyContext';
import { useToast } from '../../context/ToastContext';
import { VisitSlotModal } from '../../components/property/VisitSlotModal';
import { ColinCertifiedBadge } from '../../components/common/ColinCertifiedBadge';
import { Button } from '../../components/common/Button';
import { StudentPropertyCard } from '../../components/student/StudentPropertyCard';
import {
  VISIT_BOOKING_FEE,
  VISIT_REFUND_AMOUNT,
  VISIT_NON_REFUNDABLE_AMOUNT
} from '../../constants/booking';
import {
  MapPin,
  Star,
  Calendar,
  Phone,
  Mail,
  User,
  CheckCircle2,
  Utensils,
  ArrowLeft,
  ShieldCheck,
  Heart,
  Scale,
  Camera,
  Share2,
  MessageSquare,
  Compass,
  GraduationCap,
  Check,
  X,
  ThumbsUp,
  Maximize2,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const StudentPropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const {
    toggleWishlist,
    isInWishlist,
    addToComparison,
    removeFromComparison,
    isInComparison,
    comparisonList,
    addRecentlyViewed,
  } = useStudent();
  const { showToast } = useToast();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactMethod, setContactMethod] = useState<'whatsapp' | 'call'>('whatsapp');
  const [copiedLink, setCopiedLink] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [refundExpanded, setRefundExpanded] = useState(false);

  let liveProperty: Property | undefined;
  try {
    const propCtx = useProperties();
    liveProperty = propCtx?.getPropertyById(id || '') || propCtx?.properties.find((p) => p.id === id);
  } catch {}

  const property = liveProperty || PROPERTIES.find((p) => p.id === id);

  // Track recently viewed
  useEffect(() => {
    if (property) {
      addRecentlyViewed(property.id);
    }
  }, [property?.id, addRecentlyViewed]);

  if (!property) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="w-16 h-16 rounded-full bg-colin-navy-50 text-colin-navy flex items-center justify-center mx-auto text-2xl font-bold">
            ?
          </div>
          <h2 className="text-2xl font-extrabold text-colin-navy">Stay Not Found</h2>
          <p className="text-xs text-colin-charcoal-500">
            The property you are looking for does not exist or may have been unlisted.
          </p>
          <Link to="/student/explore">
            <Button variant="primary" size="sm">
              Explore All Stays
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const gallery = property.galleryImages?.length ? property.galleryImages : [property.featuredImage];
  const inWishlist = isInWishlist(property.id);
  const inComparison = isInComparison(property.id);

  // Handle Wishlist Toggle with Toast
  const handleToggleWishlist = () => {
    toggleWishlist(property.id);
    if (inWishlist) {
      showToast(`Removed "${property.title}" from your saved stays.`, 'info');
    } else {
      showToast(`Saved "${property.title}" to your wishlist!`, 'success');
    }
  };

  // Handle Comparison Toggle with Toast & 3-Stay Limit
  const handleToggleCompare = () => {
    if (inComparison) {
      removeFromComparison(property.id);
      showToast(`Removed "${property.title}" from comparison matrix.`, 'info');
    } else {
      if (comparisonList.length >= 3) {
        showToast('Comparison limit reached (max 3 stays). Remove a stay to add this one.', 'warning');
        return;
      }
      addToComparison(property.id);
      showToast(`Added "${property.title}" to comparison matrix (${comparisonList.length + 1}/3).`, 'success');
    }
  };

  // Handle Share Link
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      showToast('Stay link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Find similar stays
  const similarStays = PROPERTIES.filter(
    (p) => p.id !== property.id && (p.city === property.city || p.gender === property.gender)
  ).slice(0, 2);

  // Mock verified student reviews
  const studentReviews = [
    {
      id: 'rev-1',
      studentName: 'Aarav Mehta',
      university: 'Delhi University (Hindu College)',
      course: 'B.Com (Hons), 2nd Year',
      rating: 5,
      date: 'October 2026',
      verified: true,
      comment:
        'The Wi-Fi speed is genuinely as advertised during the physical inspection. Food mess serves hot home-style roti and dal every evening. Warden is super supportive and quiet study hours are respected.',
      helpfulCount: 14,
    },
    {
      id: 'rev-2',
      studentName: 'Sneha Sharma',
      university: 'Faculty of Law, DU',
      course: 'LL.B, 1st Year',
      rating: 4.8,
      date: 'September 2026',
      verified: true,
      comment:
        'Zero brokerage was a lifesaver. Saved ₹12,000 upfront. Metro station is an easy 7-minute walk. Biometric entry gives my parents immense peace of mind.',
      helpfulCount: 9,
    },
    {
      id: 'rev-3',
      studentName: 'Rohan Kulkarni',
      university: 'Hansraj College',
      course: 'B.Sc Computer Science',
      rating: 4.5,
      date: 'August 2026',
      verified: true,
      comment:
        'Clean spacious rooms with solid wood study desks. The hot water geyser works instantly during early morning 8 AM practical classes.',
      helpfulCount: 6,
    },
  ];

  const certified = isPropertyCertified(property);
  const inspectionReportId = `IR-2026-${property.city.substring(0, 3).toUpperCase()}-${property.id.replace('prop-', '00')}`;

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-fadeIn pb-24 lg:pb-0 lg:h-[calc(100vh-theme(spacing.20))] lg:flex lg:flex-col lg:overflow-hidden">
      {/* 1. Breadcrumbs Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <Link
          to="/student/explore"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-colin-charcoal-600 hover:text-colin-navy transition-colors bg-white px-3.5 py-2 rounded-xl border border-colin-charcoal-200 shadow-sm"
        >
          <ArrowLeft size={14} />
          <span>Back to Explore Directory</span>
        </Link>

        <div className="flex items-center gap-2 text-xs text-colin-charcoal-500 font-medium">
          <span>Student Portal</span>
          <span>/</span>
          <span>{property.city}</span>
          <span>/</span>
          <span className="font-bold text-colin-navy truncate max-w-[200px]">{property.title}</span>
        </div>
      </div>

      {/* 2. Main Desktop 2-Column Layout with Independent Left-Column Scrolling */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start lg:flex-1 lg:overflow-hidden">
        
        {/* Left Column: Independently Vertically Scrollable Content (~68% width on desktop) */}
        <div
          data-testid="property-details-left-column"
          tabIndex={0}
          className="lg:col-span-8 space-y-6 lg:h-full lg:overflow-y-auto lg:pr-3 focus:outline-none"
          style={{ scrollbarGutter: 'stable' }}
        >
          
          {/* Gallery Viewer (NO Overlaid Action Buttons) */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-colin-charcoal-200/90 shadow-sm space-y-3">
            <div
              className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-100 cursor-pointer group"
              onClick={() => setImageModalOpen(true)}
            >
              <img
                src={gallery[activeImageIndex]}
                alt={`${property.title} view ${activeImageIndex + 1}`}
                className="w-full h-full object-cover transition-all duration-300 group-hover:scale-[1.02]"
              />

              {/* Status Badges on Gallery (Non-interactive info only) */}
              <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap pointer-events-none">
                {certified ? (
                  <ColinCertifiedBadge
                    variant="glass"
                    size="md"
                    score={property.certificationScore}
                    showScore
                  />
                ) : property.verificationStatus && property.verificationStatus !== 'not_requested' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/95 text-slate-800 border border-slate-300 shadow-md">
                    <span>
                      {property.verificationStatus === 'inspection_scheduled' && '📅 Inspection Scheduled'}
                      {property.verificationStatus === 'inspection_in_progress' && '🔍 Inspection In Progress'}
                      {property.verificationStatus === 'inspection_completed' && '📝 Audit Pending Final Approval'}
                      {property.verificationStatus === 'payment_pending' && '💳 Verification Payment Pending'}
                      {property.verificationStatus === 'rejected' && '❌ Verification Rejected'}
                    </span>
                  </span>
                ) : null}

                {property.isSponsored && (
                  <span className="bg-colin-orange text-colin-navy-950 text-xs uppercase font-black px-2.5 py-1 rounded-xl shadow-md border border-colin-orange-400">
                    Sponsored Listing
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-colin-navy-950 text-white border border-colin-teal/60 shadow-lg backdrop-blur-md">
                  <span className={`w-2 h-2 rounded-full ${property.gender === 'girls' ? 'bg-colin-orange' : 'bg-colin-teal'}`} />
                  <span>{property.gender === 'girls' ? 'Girls Only' : property.gender === 'boys' ? 'Boys Only' : 'Co-ed'}</span>
                </span>
              </div>

              {/* Photo Counter & Expand Indicator */}
              <div className="absolute bottom-4 right-4 bg-colin-navy-950/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1.5">
                <Maximize2 size={13} className="text-colin-teal" />
                <span>Photo {activeImageIndex + 1} of {gallery.length}</span>
              </div>
            </div>

            {/* Thumbnail Navigation Bar */}
            {gallery.length > 1 && (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIndex(i)}
                    className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      activeImageIndex === i
                        ? 'border-colin-teal ring-2 ring-colin-teal/30 scale-105'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* GALLERY ACTION TOOLBAR (Positioned directly BELOW images, never over photo) */}
            <div
              data-testid="gallery-action-toolbar"
              className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-colin-charcoal-100"
            >
              <div className="flex flex-wrap items-center gap-2">
                {/* Save to Wishlist Button */}
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-xs active:scale-95 ${
                    inWishlist
                      ? 'bg-rose-50 text-rose-600 border-rose-300 ring-2 ring-rose-200'
                      : 'bg-white text-colin-navy border-colin-charcoal-200 hover:border-rose-300 hover:bg-rose-50/40'
                  }`}
                >
                  <Heart
                    size={15}
                    className={inWishlist ? 'fill-rose-500 text-rose-500 scale-110 transition-transform' : 'text-colin-charcoal-500'}
                  />
                  <span>{inWishlist ? 'Saved in Wishlist' : 'Save to Wishlist'}</span>
                </button>

                {/* Add to Compare Button (Enforces 3-stay limit) */}
                <button
                  type="button"
                  onClick={handleToggleCompare}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-xs active:scale-95 ${
                    inComparison
                      ? 'bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-200'
                      : 'bg-white text-colin-navy border-colin-charcoal-200 hover:border-amber-300 hover:bg-amber-50/40'
                  }`}
                >
                  <Scale
                    size={15}
                    className={inComparison ? 'text-amber-600' : 'text-colin-charcoal-500'}
                  />
                  <span>{inComparison ? 'In Comparison Matrix' : 'Add to Compare'}</span>
                </button>

                {/* Interactive Virtual Tour CTA */}
                {property.virtualTourAvailable && (
                  <Link
                    to={`/student/property/${property.id}/tour`}
                    className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-colin-teal text-white hover:bg-colin-teal-600 transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
                  >
                    <Camera size={15} />
                    <span>Interactive 360 Tour</span>
                  </Link>
                )}
              </div>

              {/* Share Stay Link */}
              <button
                type="button"
                onClick={handleShare}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-colin-charcoal-700 border border-colin-charcoal-200 hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs"
                title="Copy Stay Link"
              >
                {copiedLink ? (
                  <>
                    <Check size={15} className="text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 size={15} className="text-colin-charcoal-500" />
                    <span>Share Stay</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Core Overview & Specifications */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200/90 shadow-sm space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-colin-teal bg-colin-teal/10 px-3 py-1 rounded-full">
                  {property.categoryLabel} • {property.sharingType ? `${property.sharingType.toUpperCase()} SHARING` : property.roomType}
                </span>

                <div className="flex items-center gap-1.5 text-xs font-bold text-colin-navy">
                  <Star size={15} className="text-colin-orange fill-colin-orange" />
                  <span className="text-sm">{property.rating}</span>
                  <span className="text-colin-charcoal-400 font-normal">({property.reviewsCount} verified student reviews)</span>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-colin-navy tracking-tight font-display">
                {property.title}
              </h1>

              <div className="flex items-center gap-1.5 text-xs text-colin-charcoal-600 font-medium">
                <MapPin size={15} className="text-colin-teal shrink-0" />
                <span>{property.neighborhood}, {property.city}</span>
                <span className="text-slate-400">•</span>
                <span className="text-colin-teal font-semibold">100% Direct Landlord Deal</span>
              </div>
            </div>

            {/* Capacity & Key Specs Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-colin-offwhite rounded-2xl border border-colin-charcoal-200/80 text-center">
                <span className="text-[10px] uppercase font-bold text-colin-charcoal-400 block">Sharing Option</span>
                <span className="text-xs font-extrabold text-colin-navy capitalize">
                  {property.sharingType || 'Double'} Sharing
                </span>
              </div>

              <div className="p-3 bg-colin-offwhite rounded-2xl border border-colin-charcoal-200/80 text-center">
                <span className="text-[10px] uppercase font-bold text-colin-charcoal-400 block">Available Rooms</span>
                <span className="text-xs font-extrabold text-colin-navy">
                  {property.availableRooms || 2} Rooms Left
                </span>
              </div>

              <div className="p-3 bg-colin-offwhite rounded-2xl border border-colin-charcoal-200/80 text-center">
                <span className="text-[10px] uppercase font-bold text-colin-charcoal-400 block">Available Beds</span>
                <span className="text-xs font-extrabold text-colin-navy">
                  {property.availableBeds || 4} Beds Open
                </span>
              </div>

              <div className="p-3 bg-colin-offwhite rounded-2xl border border-colin-charcoal-200/80 text-center">
                <span className="text-[10px] uppercase font-bold text-colin-charcoal-400 block">Occupancy Status</span>
                <span className="text-xs font-extrabold text-emerald-700">
                  {property.occupancyStatus}
                </span>
              </div>
            </div>

            {/* Campus Proximity Box */}
            <div className="bg-colin-navy-50/80 border border-colin-navy-100 rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-colin-charcoal-500 font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                  <GraduationCap size={14} className="text-colin-teal" />
                  <span>College Proximity:</span>
                </span>
                <span className="text-sm font-black text-colin-navy block">{property.distanceToUniversity}</span>
                <span className="text-[11px] text-colin-teal-800 font-semibold block">{property.nearbyUniversity}</span>
              </div>

              <div className="space-y-1">
                <span className="text-colin-charcoal-500 font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                  <Compass size={14} className="text-colin-orange" />
                  <span>Nearest Transit & Landmark:</span>
                </span>
                <span className="text-sm font-black text-colin-navy block">{property.distanceToMetro}</span>
                <span className="text-[11px] text-colin-charcoal-500 block">{property.landmark}</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-colin-navy">
                About This Accommodation
              </h3>
              <p className="text-xs sm:text-sm text-colin-charcoal-700 leading-relaxed">
                {property.description}
              </p>
            </div>

            {/* Verification Highlights */}
            <div className="space-y-2.5 pt-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-colin-navy">
                COLIN Verification Highlights
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {property.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-colin-charcoal-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                    <CheckCircle2 size={15} className="text-colin-teal shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Certified Amenities & Facilities */}
            <div className="space-y-3 pt-3 border-t border-colin-charcoal-100">
              <h3 className="text-sm font-black uppercase tracking-wider text-colin-navy">
                Certified Amenities & Facilities
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {property.amenities.map((a, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-colin-offwhite border border-colin-charcoal-200/70 text-xs font-semibold text-colin-charcoal-800">
                    <span className="w-2 h-2 rounded-full bg-colin-teal shrink-0" />
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Food & Meal Plans (if food included or available) */}
            {property.foodIncluded && (
              <div className="space-y-3 pt-3 border-t border-colin-charcoal-100 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/60">
                <div className="flex items-center gap-2">
                  <Utensils size={16} className="text-emerald-700" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-emerald-950">
                    Wholesome Food & Meal Schedule Included
                  </h3>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  Nutritious, student-curated meals prepared fresh daily with audited hygiene standards and purified drinking water.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {(property.mealOptions || ['Breakfast (8 AM)', 'Campus Lunch (12:30 PM)', 'Evening Chai', 'Dinner Buffet (8 PM)']).map((m, i) => (
                    <div key={i} className="p-2 bg-white rounded-xl border border-emerald-200 text-center font-bold text-emerald-900 shadow-xs">
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 3. COLIN CERTIFIED PHYSICAL AUDIT REPORT — COMPLETE REMAKE      */}
            {/* Standard official report layout (Section 3 of User Prompt)     */}
            {/* ============================================================== */}
            <div className="space-y-3 pt-4 border-t border-colin-charcoal-100">
              {certified ? (
                <div
                  data-testid="physical-audit-report"
                  className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-5 text-slate-800"
                >
                  {/* Official Inspection Report Header */}
                  <div className="border-b-2 border-colin-navy pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black tracking-widest text-colin-teal uppercase">
                          COLIN ACCOMMODATION VERIFICATION
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-colin-navy tracking-tight uppercase font-display mt-0.5">
                        Physical Property Inspection Report
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {property.title} • {property.neighborhood}, {property.city}
                      </p>
                    </div>

                    <div className="text-left sm:text-right space-y-0.5 text-xs">
                      <div className="font-mono text-[11px] font-bold text-slate-500">
                        Report ID: <span className="text-colin-navy font-bold">{inspectionReportId}</span>
                      </div>
                      <div className="text-slate-600 text-[11px]">
                        Inspected: <strong>{property.certificationDate || '18 September 2026'}</strong>
                      </div>
                      <div className="text-slate-500 text-[10px]">
                        Last Audited: {property.certificationDate || '22 September 2026'}
                      </div>
                    </div>
                  </div>

                  {/* Verification Status Banner */}
                  <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        ✓
                      </div>
                      <div>
                        <span className="text-xs font-black uppercase text-emerald-950">
                          Verification Status: Approved (COLIN Certified)
                        </span>
                        <p className="text-[11px] text-emerald-800">
                          Physical inspection completed on-site and approved by campus student ambassadors.
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold text-emerald-900 bg-white px-2.5 py-1 rounded-md border border-emerald-200 self-start sm:self-auto shrink-0">
                      Audit Score: {property.certificationScore || 96}/100
                    </span>
                  </div>

                  {/* Inspection Summary */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-colin-navy">
                      Inspection Scope & Summary
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      A team of verified COLIN student ambassadors conducted an on-site physical inspection of the premises to verify structural dimensions, water sanitation, fire safety compliance, study amenities, Wi-Fi connectivity, and room ventilation.
                    </p>
                  </div>

                  {/* Clean Inspection Checklist Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Inspection Status</th>
                          <th className="py-2.5 px-3">Recorded Field Findings</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">Room Condition</td>
                          <td className="py-2.5 px-3 text-emerald-700 font-bold flex items-center gap-1">
                            <Check size={13} /> Verified
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            Solid wood study desk, ergonomic chair, orthopedic mattress, double wardrobe.
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">Electrical & Fire Safety</td>
                          <td className="py-2.5 px-3 text-emerald-700 font-bold flex items-center gap-1">
                            <Check size={13} /> Approved
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            Fire extinguisher mounted in corridor, functional MCB panel, grounded 3-pin power sockets.
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">Water & Sanitation</td>
                          <td className="py-2.5 px-3 text-emerald-700 font-bold flex items-center gap-1">
                            <Check size={13} /> Verified
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            Continuous municipal/borewell water supply, functional 25L instant hot water geyser.
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">Ventilation & Lighting</td>
                          <td className="py-2.5 px-3 text-emerald-700 font-bold flex items-center gap-1">
                            <Check size={13} /> Verified
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            Large exterior window with mosquito mesh, natural daylight, flicker-free LED lighting.
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">Security Arrangements</td>
                          <td className="py-2.5 px-3 text-emerald-700 font-bold flex items-center gap-1">
                            <Check size={13} /> Active
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            CCTV coverage at main entrance & common halls, resident biometric entry access.
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">Internet Availability</td>
                          <td className="py-2.5 px-3 text-emerald-700 font-bold flex items-center gap-1">
                            <Check size={13} /> Tested
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {property.inspectionChecklist?.wifiSpeedMbps || 300} Mbps dual-band fiber Wi-Fi speed-tested during inspection.
                          </td>
                        </tr>
                        {property.foodIncluded && (
                          <tr>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">Food Arrangements</td>
                            <td className="py-2.5 px-3 text-emerald-700 font-bold flex items-center gap-1">
                              <Check size={13} /> Audited
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Kitchen hygiene audit score: {property.inspectionChecklist?.foodHygieneAuditScore || 98}%, stainless steel dining mess.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Inspection Notes */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                    <span className="font-bold text-colin-navy block">Ambassador Inspection Notes:</span>
                    <p className="text-slate-600 leading-relaxed">
                      "Property matches photos and declared room dimensions. Clean corridor spaces with 24/7 power backup. The property manager demonstrated working water heaters and biometric gate logs."
                    </p>
                  </div>

                  {/* Important Limitations */}
                  <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-3 space-y-1">
                    <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Verification Framework Limitations:
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>Physically inspected items reflect on-site conditions on the recorded inspection date.</li>
                      <li>Rent pricing, deposit refund timeline, and move-in terms are owner-provided and contractually binding.</li>
                      <li>COLIN does not act as a broker; agreements are direct between student and verified owner.</li>
                    </ul>
                  </div>

                  {/* Demo Mode Notice */}
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
                    <AlertCircle size={14} className="text-amber-700 shrink-0" />
                    <span>
                      <strong>Demonstration Mode:</strong> Illustrative demonstration report — not evidence of an actual physical inspection.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-3">
                  <FileText size={18} className="text-slate-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-colin-navy">
                      This property does not currently have an approved COLIN inspection report.
                    </h4>
                    <p className="text-slate-500 leading-relaxed">
                      COLIN Certified status is only granted after an owner-paid inspection and physical verification by our student ambassador team. Uninspected stays are listed for convenience and direct landlord contact.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* House Rules & Community Norms */}
            <div className="space-y-2 pt-3 border-t border-colin-charcoal-100">
              <h3 className="text-sm font-black uppercase tracking-wider text-colin-navy">
                House Rules & Community Norms
              </h3>
              <ul className="text-xs text-colin-charcoal-700 space-y-1.5 list-disc pl-5">
                {property.houseRules.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            {/* Host & Landlord Records (Moved to Left Column per Section 2 Requirements) */}
            <div className="space-y-3 pt-3 border-t border-colin-charcoal-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-colin-navy">
                  Verified Host & Building Records
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                  <ShieldCheck size={12} /> Contact Unlocked
                </span>
              </div>

              <div className="bg-colin-offwhite rounded-2xl p-4 sm:p-5 border border-colin-charcoal-200/90 space-y-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-colin-charcoal-400 block">
                    Verified Building Address:
                  </span>
                  <p className="font-bold text-colin-navy text-xs leading-snug mt-0.5">
                    {property.fullAddress}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-colin-charcoal-200/60">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-colin-charcoal-400 block">
                      Landlord / Warden:
                    </span>
                    <div className="font-extrabold text-colin-navy flex items-center gap-1.5 text-sm mt-0.5">
                      <User size={14} className="text-colin-teal" />
                      <span>{property.ownerName}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-colin-charcoal-400 block">
                      Direct Contact:
                    </span>
                    <div className="text-colin-teal font-bold flex items-center gap-1.5 mt-0.5">
                      <Phone size={13} />
                      <span>{property.ownerContact}</span>
                    </div>
                    <div className="text-colin-charcoal-500 text-[11px] flex items-center gap-1.5">
                      <Mail size={13} />
                      <span>{property.ownerEmail}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-bold justify-center"
                    onClick={() => setContactModalOpen(true)}
                    rightIcon={<MessageSquare size={14} />}
                  >
                    Contact Host (Demo Simulator)
                  </Button>
                </div>
              </div>
            </div>

            {/* Verified Student Reviews Section */}
            <div className="space-y-4 pt-3 border-t border-colin-charcoal-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-colin-navy">
                    Verified Student Reviews
                  </h3>
                  <p className="text-xs text-colin-charcoal-500">
                    Real feedback from students who lived at this accommodation
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 px-3 py-1 rounded-xl border border-amber-200 text-xs font-black">
                  <Star size={14} className="text-colin-orange fill-colin-orange" />
                  <span>{property.rating} / 5.0</span>
                </div>
              </div>

              <div className="space-y-3">
                {studentReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-colin-navy text-white flex items-center justify-center font-bold text-xs">
                          {rev.studentName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-colin-navy flex items-center gap-1.5">
                            <span>{rev.studentName}</span>
                            {rev.verified && (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">
                                Verified Resident
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-colin-charcoal-500">
                            {rev.university} • {rev.course}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-amber-500 font-bold shrink-0">
                        <Star size={13} className="fill-amber-400 text-amber-400" />
                        <span>{rev.rating}</span>
                      </div>
                    </div>

                    <p className="text-colin-charcoal-700 leading-relaxed text-xs">
                      "{rev.comment}"
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-colin-charcoal-400 pt-1">
                      <span>Reviewed in {rev.date}</span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp size={11} className="text-slate-400" />
                        <span>{rev.helpfulCount} students found this helpful</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Similar Accommodations Recommendation */}
            {similarStays.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-colin-charcoal-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-colin-navy">
                    Similar Accommodations in {property.city}
                  </h3>
                  <Link
                    to="/student/explore"
                    className="text-xs font-bold text-colin-teal hover:underline flex items-center gap-1"
                  >
                    <span>View all</span>
                    <span>&rarr;</span>
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {similarStays.map((simProp) => (
                    <StudentPropertyCard key={simProp.id} property={simProp} />
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Bottom spacing inside scrollable left column */}
          <div className="pb-12" />
        </div>

        {/* ============================================================== */}
        {/* Right Column: Unified, Stable Booking Panel (~32% width)       */}
        {/* Fixed/Pinned in Viewport: Never scrolls out of view on desktop */}
        {/* ============================================================== */}
        <div className="lg:col-span-4 space-y-4 lg:h-full lg:overflow-y-auto lg:sticky lg:top-0 z-20 self-start shrink-0">
          
          <div
            data-testid="sticky-booking-panel"
            className="bg-white rounded-3xl p-6 sm:p-7 border border-colin-charcoal-200/90 shadow-xl space-y-5"
          >
            {/* Rent & Deposit Pricing Breakdown */}
            <div className="space-y-2 pb-4 border-b border-colin-charcoal-100">
              <div className="text-[10px] font-extrabold text-colin-charcoal-400 uppercase tracking-wider">
                Monthly Indicative Rent
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-colin-navy font-display">
                  ₹{property.rentMonthly.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-colin-charcoal-500 font-medium">/ month</span>
              </div>

              <div className="flex items-center justify-between text-xs text-colin-charcoal-600 pt-1">
                <span>Security Deposit:</span>
                <span className="font-bold text-colin-navy">₹{property.depositAmount.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-colin-charcoal-600">
                <span>Brokerage:</span>
                <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  ₹0 (Zero Brokerage)
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-colin-charcoal-600">
                <span>Visit Booking Fee:</span>
                <span className="font-bold text-colin-navy">₹{(property.visitSlotFee || VISIT_BOOKING_FEE).toFixed(2)}</span>
              </div>
            </div>

            {/* Primary CTA: Book Guided Visit */}
            <div className="space-y-3">
              <Button
                variant="accent"
                size="lg"
                className="w-full text-colin-navy-950 font-black justify-center shadow-md py-3 text-sm"
                onClick={() => setIsSlotModalOpen(true)}
                rightIcon={<Calendar size={18} />}
              >
                Book Guided Visit
              </Button>

              {/* Refund Summary per Section 2 Requirements */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-colin-navy flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-colin-teal" />
                    <span>55% Eligible Refund</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    ₹{VISIT_REFUND_AMOUNT.toFixed(2)} Refundable
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  "The 55% refund is applicable if you physically visit the property and decide not to accept it."
                </p>

                <div className="pt-1 border-t border-slate-200/70 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Retained: ₹{VISIT_NON_REFUNDABLE_AMOUNT.toFixed(2)} (Ambassador Escort)</span>
                  <button
                    type="button"
                    onClick={() => setRefundExpanded(!refundExpanded)}
                    className="text-colin-teal font-bold hover:underline flex items-center gap-0.5"
                  >
                    <span>{refundExpanded ? 'Less' : 'Details'}</span>
                    {refundExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>

                {refundExpanded && (
                  <div className="pt-2 text-[10px] text-slate-500 border-t border-slate-200/50 space-y-1">
                    <p>• Refund of ₹82.50 is issued upon physical on-site visit rejection.</p>
                    <p>• Retained ₹67.50 covers accompaniment by a verified student campus ambassador.</p>
                    <p>• No refund for unnotified no-shows after the booked time window.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Virtual Tour Trigger if Available */}
            {property.virtualTourAvailable && (
              <div className="pt-3 border-t border-slate-100">
                <Link to={`/student/property/${property.id}/tour`} className="block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-bold justify-center"
                    rightIcon={<Camera size={14} />}
                  >
                    Take Interactive Virtual Tour
                  </Button>
                </Link>
              </div>
            )}

            {/* Direct Assurance Badges */}
            <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100">
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-colin-teal" />
                <span>Zero Brokerage</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-colin-teal" />
                <span>Verified Host</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-colin-teal" />
                <span>Escrow Safe</span>
              </span>
            </div>

          </div>

        </div>

      </div>

      {/* 3. Mobile Fixed Bottom Booking Bar */}
      <div
        data-testid="mobile-bottom-booking-bar"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-2xl flex items-center justify-between"
      >
        <div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Monthly Rent</div>
          <div className="text-base font-black text-colin-navy">
            ₹{property.rentMonthly.toLocaleString('en-IN')}
            <span className="text-xs font-normal text-slate-500">/mo</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="accent"
            size="sm"
            className="text-colin-navy-950 font-black shadow-md text-xs py-2 px-3.5"
            onClick={() => setIsSlotModalOpen(true)}
            rightIcon={<Calendar size={14} />}
          >
            Book Visit (₹{(property.visitSlotFee || VISIT_BOOKING_FEE).toFixed(0)})
          </Button>
        </div>
      </div>

      {/* Guided Visit Slot Modal */}
      <VisitSlotModal
        property={property}
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
      />

      {/* Demo Contact Host Modal */}
      {contactModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-colin-navy-950/75 backdrop-blur-sm animate-fadeIn"
          onClick={() => setContactModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 border border-colin-charcoal-200 shadow-2xl space-y-4 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-colin-charcoal-100">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-colin-teal" />
                <h3 className="font-extrabold text-colin-navy text-base">Contact Property Host</h3>
              </div>
              <button
                onClick={() => setContactModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 bg-colin-navy-50 rounded-2xl text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-colin-charcoal-400">Host Contact</span>
              <p className="font-bold text-colin-navy">{property.ownerName}</p>
              <p className="text-colin-teal font-semibold">{property.ownerContact}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">Simulated Direct Action:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setContactMethod('whatsapp')}
                  className={`p-3 rounded-2xl text-xs font-bold border transition-all text-center ${
                    contactMethod === 'whatsapp'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-sm'
                      : 'bg-colin-offwhite text-colin-charcoal-600 border-colin-charcoal-200'
                  }`}
                >
                  💬 WhatsApp Message
                </button>
                <button
                  type="button"
                  onClick={() => setContactMethod('call')}
                  className={`p-3 rounded-2xl text-xs font-bold border transition-all text-center ${
                    contactMethod === 'call'
                      ? 'bg-colin-navy text-white border-colin-navy shadow-sm'
                      : 'bg-colin-offwhite text-colin-charcoal-600 border-colin-charcoal-200'
                  }`}
                >
                  📞 Direct Phone Call
                </button>
              </div>
            </div>

            {contactMethod === 'whatsapp' ? (
              <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-2">
                <p className="font-semibold">Simulated WhatsApp Message:</p>
                <div className="p-2.5 bg-white rounded-xl text-[11px] text-slate-700 italic border border-emerald-100">
                  "Hello {property.ownerName}, I found {property.title} on COLIN. I am a student at {user?.university || 'Delhi University'} interested in the {property.roomType}. Is it available for move-in?"
                </div>
              </div>
            ) : (
              <div className="p-3 bg-colin-navy-50 rounded-2xl border border-colin-navy-100 text-xs text-colin-navy space-y-1">
                <p className="font-semibold">Simulated Phone Dial:</p>
                <p className="text-sm font-bold text-colin-teal">{property.ownerContact}</p>
                <p className="text-[11px] text-colin-charcoal-500">Calling verified owner directly with zero broker interruption.</p>
              </div>
            )}

            <div className="pt-2">
              <Button
                variant="primary"
                className="w-full justify-center"
                onClick={() => setContactModalOpen(false)}
              >
                Close Demo Simulator
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Lightbox Modal */}
      {imageModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setImageModalOpen(false)}
              className="absolute -top-10 right-0 text-white hover:text-colin-orange text-sm font-bold flex items-center gap-1"
            >
              <X size={20} />
              <span>Close</span>
            </button>
            <img
              src={gallery[activeImageIndex]}
              alt="fullscreen"
              className="max-h-[80vh] w-auto object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};