import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Property, isPropertyCertified } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useStudent } from '../../context/StudentContext';
import { useToast } from '../../context/ToastContext';
import {
  VISIT_BOOKING_FEE,
  VISIT_REFUND_AMOUNT
} from '../../constants/booking';
import {
  MapPin,
  Star,
  Heart,
  Scale,
  GraduationCap,
  Utensils,
  Wind,
  Wifi,
  Sparkles,
} from 'lucide-react';
import { ColinCertifiedBadge } from '../common/ColinCertifiedBadge';

// Branded high-resolution fallback image
const FALLBACK_PROPERTY_IMAGE =
  'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80';

interface StudentPropertyCardProps {
  property: Property;
  compact?: boolean;
}

export const StudentPropertyCard: React.FC<StudentPropertyCardProps> = ({
  property,
  compact = false,
}) => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const {
    toggleWishlist,
    isInWishlist,
    comparisonList,
    addToComparison,
    removeFromComparison,
    isInComparison,
  } = useStudent();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [imgSrc, setImgSrc] = useState<string>(
    property.featuredImage || FALLBACK_PROPERTY_IMAGE
  );
  const [imgLoaded, setImgLoaded] = useState(false);

  const inWishlist = isInWishlist(property.id);
  const inComparison = isInComparison(property.id);
  const isCertified = isPropertyCertified(property);

  const handleCardClick = () => {
    navigate(`/student/property/${property.id}`);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      openAuthModal(
        `/student/property/${property.id}`,
        'Sign in to save properties to your shortlist.'
      );
      return;
    }
    toggleWishlist(property.id);
    if (!inWishlist) {
      showToast(`Saved "${property.title}" to your shortlist`, 'success');
    } else {
      showToast(`Removed "${property.title}" from your shortlist`, 'info');
    }
  };

  const handleToggleComparison = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      openAuthModal(
        `/student/property/${property.id}`,
        'Sign in to compare accommodation specifications.'
      );
      return;
    }

    if (inComparison) {
      removeFromComparison(property.id);
      showToast(`Removed "${property.title}" from comparison matrix`, 'info');
    } else {
      const res = addToComparison(property.id);
      if (res.success) {
        showToast(`Added "${property.title}" to comparison matrix (${comparisonList.length + 1}/3)`, 'success');
      } else {
        showToast(res.message || 'Comparison limit reached (max 3 properties).', 'warning');
      }
    }
  };

  // Occupancy badge colors
  const getOccupancyBadge = () => {
    if (property.occupancyStatus === 'Few Beds Left') {
      return (
        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/90 text-white shadow-xs">
          Few Beds Left
        </span>
      );
    }
    if (property.occupancyStatus === 'Filling Fast') {
      return (
        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/90 text-white shadow-xs">
          Filling Fast
        </span>
      );
    }
    return (
      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-600/90 text-white shadow-xs">
        Available
      </span>
    );
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/student/property/${property.id}`);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`Accommodation listing: ${property.title}`}
      className="group relative bg-white rounded-3xl border border-colin-charcoal-200/90 shadow-brand hover:shadow-xl hover:-translate-y-1 hover:border-colin-teal/60 active:scale-[0.99] transition-all duration-200 ease-out flex flex-col justify-between overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-colin-teal motion-reduce:transform-none motion-reduce:transition-none"
    >
      {/* 1. Image Header Section */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <img
          src={imgSrc}
          alt={property.title}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgSrc(FALLBACK_PROPERTY_IMAGE)}
          className={`w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transform-none ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Top Badges (Truthful Verification System) */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-auto">
          <div className="flex flex-col gap-1 items-start max-w-[70%]">
            {/* SPONSORED BADGE (Warm Amber) */}
            {property.isSponsored && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-colin-navy-950 bg-colin-orange px-2.5 py-0.5 rounded-full shadow-md border border-colin-orange-400">
                <Sparkles size={10} className="fill-colin-navy-950" /> Sponsored
              </span>
            )}

            {/* COLIN CERTIFIED BADGE (Deep Teal) */}
            {isCertified ? (
              <ColinCertifiedBadge score={property.certificationScore} size="sm" />
            ) : property.verificationStatus && property.verificationStatus !== 'not_requested' ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-800 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-full border border-slate-300 shadow-sm">
                {property.verificationStatus === 'inspection_scheduled' && '📅 Inspection Scheduled'}
                {property.verificationStatus === 'inspection_in_progress' && '🔍 In Progress'}
                {property.verificationStatus === 'inspection_completed' && '📝 Audit Pending Approval'}
                {property.verificationStatus === 'payment_pending' && '💳 Verification Pending'}
                {property.verificationStatus === 'rejected' && '❌ Verification Rejected'}
              </span>
            ) : null}
          </div>

          {/* Quick Action Buttons (Save & Compare) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Compare Toggle */}
            <button
              onClick={handleToggleComparison}
              className={`p-2 rounded-xl backdrop-blur-md transition-all shadow-md active:scale-95 ${
                inComparison
                  ? 'bg-amber-500 text-white'
                  : 'bg-white/90 text-colin-charcoal-700 hover:bg-white hover:text-amber-600'
              }`}
              title={inComparison ? 'Remove from comparison' : 'Add to side-by-side comparison'}
              aria-label="Toggle comparison"
            >
              <Scale size={14} />
            </button>

            {/* Wishlist Toggle */}
            <button
              onClick={handleToggleWishlist}
              className={`p-2 rounded-xl backdrop-blur-md transition-all shadow-md active:scale-95 ${
                inWishlist
                  ? 'bg-rose-500 text-white'
                  : 'bg-white/90 text-colin-charcoal-700 hover:bg-white hover:text-rose-500'
              }`}
              title={inWishlist ? 'Remove from saved' : 'Save to shortlist'}
              aria-label="Toggle wishlist"
            >
              <Heart size={14} className={inWishlist ? 'fill-white' : ''} />
            </button>
          </div>
        </div>

        {/* Bottom Image Overlay: Campus Proximity & Category */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-[11px] font-bold">
          <span className="bg-colin-navy/85 backdrop-blur-md px-2.5 py-1 rounded-xl flex items-center gap-1 max-w-[65%] truncate border border-white/10">
            <GraduationCap size={12} className="text-colin-teal shrink-0" />
            <span className="truncate">{property.distanceToUniversity}</span>
          </span>

          <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] uppercase font-bold border border-white/15">
            {property.categoryLabel}
          </span>
        </div>
      </div>

      {/* 2. Information Section — Structured in strict 7-level hierarchy */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4 bg-white">
        <div className="space-y-2.5">
          {/* Location & Star Rating */}
          <div className="flex items-center justify-between text-xs text-colin-charcoal-500 gap-2">
            <span className="flex items-center gap-1 truncate font-medium">
              <MapPin size={13} className="text-colin-orange shrink-0" />
              <span className="truncate">{property.neighborhood}, {property.city}</span>
            </span>
            <span className="flex items-center gap-1 font-bold text-colin-navy shrink-0 bg-colin-offwhite px-2 py-0.5 rounded-md border border-colin-charcoal-100">
              <Star size={12} className="text-colin-orange fill-colin-orange" />
              <span>{property.rating}</span>
              <span className="text-[10px] text-colin-charcoal-400 font-normal">({property.reviewsCount})</span>
            </span>
          </div>

          {/* Property Name */}
          <Link to={`/student/property/${property.id}`} className="block">
            <h3 className="font-extrabold text-base text-colin-navy group-hover:text-colin-teal transition-colors line-clamp-1 font-display">
              {property.title}
            </h3>
          </Link>

          {/* Configuration & Gender Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] font-bold text-colin-charcoal-600 bg-colin-offwhite px-2 py-0.5 rounded-md border border-colin-charcoal-200 capitalize">
              {property.sharingType ? `${property.sharingType} Sharing` : 'Double Sharing'}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border capitalize ${
                property.gender === 'boys'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : property.gender === 'girls'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {property.gender === 'unisex' ? 'Co-ed' : `${property.gender} Only`}
            </span>
            {getOccupancyBadge()}
          </div>

          {/* Essential Amenities Icons */}
          {!compact && (
            <div className="flex items-center gap-3 text-xs text-colin-charcoal-500 pt-0.5 flex-wrap">
              {property.foodIncluded && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
                  <Utensils size={12} className="text-emerald-600" />
                  <span>Meals Included</span>
                </span>
              )}
              {property.amenities.some((a) => a.toLowerCase().includes('ac') || a.toLowerCase().includes('air')) && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-colin-charcoal-600">
                  <Wind size={12} className="text-colin-teal" />
                  <span>AC</span>
                </span>
              )}
              {property.amenities.some((a) => a.toLowerCase().includes('wi-fi') || a.toLowerCase().includes('wifi')) && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-colin-charcoal-600">
                  <Wifi size={12} className="text-colin-teal" />
                  <span>Wi-Fi</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* 3. Card Bottom Section: Rent & Primary CTA */}
        <div className="pt-3 border-t border-colin-charcoal-100 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="text-xl font-black text-colin-navy font-display leading-none">
                ₹{property.rentMonthly.toLocaleString('en-IN')}
                <span className="text-xs font-normal text-colin-charcoal-500 ml-1">/ mo</span>
              </div>
              <div className="text-[10px] text-colin-charcoal-400 mt-0.5">
                Deposit: ₹{property.depositAmount.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold text-colin-teal bg-colin-teal/10 px-2 py-0.5 rounded-md block">
                Slot Pass: ₹{(property.visitSlotFee || VISIT_BOOKING_FEE).toFixed(2)}
              </span>
              <span className="text-[9px] text-emerald-700 block mt-0.5">
                55% Refund: ₹{VISIT_REFUND_AMOUNT.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/student/property/${property.id}`);
            }}
            className="w-full justify-center text-xs font-bold py-2.5 px-4 rounded-xl bg-colin-navy text-white hover:bg-colin-navy-800 active:scale-98 transition-all flex items-center gap-1 shadow-sm group-hover:bg-colin-teal"
          >
            <span>View Property Specs</span>
            <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
};
