import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Property, isPropertyCertified } from '../../types';
import { useStudent } from '../../context/StudentContext';
import { useToast } from '../../context/ToastContext';
import {
  MapPin,
  Star,
  Heart,
  Scale,
  GraduationCap,
  Utensils,
  Wind,
  Wifi,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { ColinCertifiedBadge } from '../common/ColinCertifiedBadge';

interface StudentPropertyListItemProps {
  property: Property & { gpsDistanceKm?: number };
}

export const StudentPropertyListItem: React.FC<StudentPropertyListItemProps> = ({
  property,
}) => {
  const {
    toggleWishlist,
    isInWishlist,
    addToComparison,
    removeFromComparison,
    isInComparison,
    comparisonList,
  } = useStudent();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const inWishlist = isInWishlist(property.id);
  const inComparison = isInComparison(property.id);
  const certified = isPropertyCertified(property);

  const handleCardClick = () => {
    navigate(`/student/property/${property.id}`);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleWishlist(property.id);
    if (inWishlist) {
      showToast(`Removed "${property.title}" from saved stays`, 'info');
    } else {
      showToast(`Saved "${property.title}" to shortlist!`, 'success');
    }
  };

  const handleToggleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (inComparison) {
      removeFromComparison(property.id);
      showToast(`Removed "${property.title}" from comparison matrix`, 'info');
    } else {
      if (comparisonList.length >= 3) {
        showToast('Comparison limit reached (max 3 properties). Remove one to add this.', 'warning');
        return;
      }
      addToComparison(property.id);
      showToast(`Added "${property.title}" to comparison matrix (${comparisonList.length + 1}/3)`, 'success');
    }
  };

  return (
    <div
      onClick={handleCardClick}
      data-testid={`property-list-item-${property.id}`}
      className="group relative bg-white rounded-3xl border border-colin-charcoal-200/90 hover:border-colin-teal/60 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden flex flex-col md:flex-row items-stretch"
    >
      {/* Thumbnail Section */}
      <div className="relative w-full md:w-72 h-52 md:h-auto shrink-0 overflow-hidden bg-slate-100">
        <img
          src={property.featuredImage}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        />

        {/* Badges on Thumbnail */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
          {certified ? (
            <ColinCertifiedBadge
              variant="glass"
              size="sm"
              score={property.certificationScore}
              showScore
            />
          ) : null}

          {property.isSponsored && (
            <span className="bg-colin-orange text-colin-navy-950 text-[10px] uppercase font-black px-2 py-0.5 rounded-lg shadow-sm border border-colin-orange-400">
              Sponsored
            </span>
          )}

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-colin-navy-950 text-white border border-colin-teal/40 shadow-sm backdrop-blur-md">
            <span className={`w-1.5 h-1.5 rounded-full ${property.gender === 'girls' ? 'bg-colin-orange' : 'bg-colin-teal'}`} />
            <span>{property.gender === 'girls' ? 'Girls Only' : property.gender === 'boys' ? 'Boys Only' : 'Co-ed'}</span>
          </span>
        </div>

        {/* Quick Save Action */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleWishlist}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md text-colin-navy flex items-center justify-center shadow-md hover:bg-white hover:scale-110 active:scale-90 transition-all border border-slate-200"
          >
            <Heart
              size={15}
              className={inWishlist ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}
            />
          </button>
        </div>
      </div>

      {/* Middle Specs & Details Section */}
      <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Category & Rating */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-extrabold uppercase tracking-wider text-colin-teal bg-colin-teal/10 px-2.5 py-0.5 rounded-full text-[11px]">
              {property.categoryLabel} • {property.sharingType ? `${property.sharingType.toUpperCase()} SHARING` : property.roomType}
            </span>

            <div className="flex items-center gap-1 font-bold text-colin-navy text-xs">
              <Star size={13} className="text-colin-orange fill-colin-orange" />
              <span>{property.rating}</span>
              <span className="text-slate-400 font-normal">({property.reviewsCount})</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg font-black text-colin-navy group-hover:text-colin-teal transition-colors tracking-tight font-display">
            {property.title}
          </h3>

          {/* Location & Proximity */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-colin-charcoal-600">
            <span className="flex items-center gap-1 font-medium">
              <MapPin size={13} className="text-colin-teal shrink-0" />
              <span>{property.neighborhood}, {property.city}</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1 font-semibold text-colin-navy">
              <GraduationCap size={13} className="text-colin-orange shrink-0" />
              <span>{property.distanceToUniversity} from {property.nearbyUniversity}</span>
            </span>
            {property.gpsDistanceKm !== undefined && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-colin-teal font-bold bg-colin-teal/10 px-2 py-0.5 rounded-md text-[11px]">
                  📍 {property.gpsDistanceKm.toFixed(1)} km from your GPS
                </span>
              </>
            )}
          </div>
        </div>

        {/* Amenity Badges Strip */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-colin-charcoal-600">
          <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
            <Wifi size={12} className="text-colin-teal" />
            <span>High-Speed Wi-Fi</span>
          </span>
          {property.foodIncluded && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-xl font-semibold">
              <Utensils size={12} className="text-emerald-600" />
              <span>Meals Included</span>
            </span>
          )}
          {property.amenities.some((a) => a.toLowerCase().includes('ac')) && (
            <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
              <Wind size={12} className="text-colin-teal" />
              <span>Air Conditioned</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
            <ShieldCheck size={12} className="text-colin-teal" />
            <span>Biometric Security</span>
          </span>
        </div>

        {/* Capacity Indicator */}
        <div className="text-[11px] text-slate-500 flex items-center gap-2">
          <span>Availability: <strong className="text-emerald-700">{property.availableBeds || 2} Beds Open</strong> ({property.occupancyStatus})</span>
        </div>
      </div>

      {/* Right Pricing & CTA Section */}
      <div className="w-full md:w-56 p-5 sm:p-6 bg-slate-50/80 border-t md:border-t-0 md:border-l border-slate-200/90 flex flex-col justify-between shrink-0 space-y-3">
        <div className="space-y-1">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Monthly Rent
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-colin-navy font-display">
              ₹{property.rentMonthly.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">/mo</span>
          </div>

          <div className="text-[11px] text-slate-600">
            Deposit: <strong>₹{property.depositAmount.toLocaleString('en-IN')}</strong>
          </div>

          <div className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md inline-block mt-1">
            Zero Brokerage Direct
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Link
            to={`/student/property/${property.id}`}
            onClick={(e) => e.stopPropagation()}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-colin-navy text-white hover:bg-colin-navy-950 text-xs font-bold transition-all shadow-sm group-hover:bg-colin-teal"
          >
            <span>View Details</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          <button
            type="button"
            onClick={handleToggleCompare}
            className={`w-full py-1.5 px-2.5 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1.5 ${
              inComparison
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Scale size={12} className={inComparison ? 'text-amber-600' : 'text-slate-400'} />
            <span>{inComparison ? 'In Comparison' : 'Compare Stay'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};