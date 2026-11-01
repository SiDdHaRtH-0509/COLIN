import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Property } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { 
  MapPin, 
  Wifi, 
  Utensils, 
  Wind, 
  Lock, 
  Star, 
  ArrowRight,
  Compass
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { ColinCertifiedBadge } from '../common/ColinCertifiedBadge';

interface PropertyCardProps {
  property: Property;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const handleCardClick = () => {
    const targetUrl = `/property/${property.id}`;
    if (!isAuthenticated) {
      openAuthModal(
        targetUrl,
        `Sign in or register to unlock full address, owner contact, and verified inspection records for ${property.title}.`
      );
    } else {
      navigate(targetUrl);
    }
  };

  const getGenderBadge = () => {
    switch (property.gender) {
      case 'girls':
        return <Badge variant="accent" size="sm">Girls Only</Badge>;
      case 'boys':
        return <Badge variant="neutral" size="sm">Boys Only</Badge>;
      default:
        return <Badge variant="outline" size="sm">Co-ed</Badge>;
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-white rounded-3xl border border-colin-charcoal-200/90 shadow-brand hover:shadow-brand-hover transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-1 h-full"
    >
      {/* 1. Image Section — Large, Clean & Uncluttered */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <img
          src={property.featuredImage}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
        />

        {/* Refined gradient overlay only at the top for badge legibility */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 via-black/20 to-transparent pointer-events-none" />

        {/* Top Badges Area: Consistent placement with zero overcrowding */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 z-10 pointer-events-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            {property.isColinCertified && (
              <ColinCertifiedBadge
                variant="dark"
                size="sm"
                score={property.certificationScore}
                showScore={false}
              />
            )}
            {property.isSponsored && (
              <span className="bg-colin-orange text-colin-navy-950 text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-lg shadow-sm border border-colin-orange-400">
                Sponsored
              </span>
            )}
          </div>

          {/* Rating Pill */}
          <div className="flex items-center gap-1 bg-colin-navy-950/85 backdrop-blur-md px-2 py-0.5 rounded-full text-xs font-bold text-white border border-white/20 shadow-sm shrink-0">
            <Star size={11} className="text-colin-orange fill-colin-orange" />
            <span>{property.rating}</span>
            <span className="text-[10px] text-slate-300 font-normal">({property.reviewsCount})</span>
          </div>
        </div>
      </div>

      {/* 2. Information Section — Structured in strict 7-level hierarchy */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3.5 bg-white">
        
        <div className="space-y-2">
          {/* Hierarchy 1: Accommodation Type & Room Sharing + Gender Tag */}
          <div className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-extrabold text-colin-teal uppercase tracking-wider text-[11px] truncate">
                {property.categoryLabel}
              </span>
              <span className="text-slate-300 font-bold">•</span>
              <span className="text-xs font-semibold text-slate-600 truncate">
                {property.roomType}
              </span>
            </div>
            <div className="shrink-0">
              {getGenderBadge()}
            </div>
          </div>

          {/* Hierarchy 2: Property Name (Robust line clamp) */}
          <h3 className="font-extrabold text-base text-colin-navy group-hover:text-colin-teal transition-colors line-clamp-1 leading-snug">
            {property.title}
          </h3>

          {/* Hierarchy 3: Location */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin size={13} className="text-colin-teal shrink-0" />
            <span className="line-clamp-1 font-medium text-slate-600">{property.neighborhood}, {property.city}</span>
          </div>

          {/* Hierarchy 4: Distance from Campus */}
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-md w-fit">
            <Compass size={12} className="text-colin-orange shrink-0" />
            <span className="font-semibold text-[11px]">{property.distanceToUniversity}</span>
          </div>
        </div>

        {/* Hierarchy 5: Important Amenities */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5 text-[11px]">
          {property.foodIncluded && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2 py-0.5 rounded-md font-semibold">
              <Utensils size={11} /> Food Included
            </span>
          )}
          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 border border-slate-200/60 px-2 py-0.5 rounded-md font-medium">
            <Wifi size={11} /> High-speed Wi-Fi
          </span>
          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 border border-slate-200/60 px-2 py-0.5 rounded-md font-medium">
            <Wind size={11} /> AC
          </span>
        </div>

        {/* Hierarchy 6 & 7: Monthly Rent & Compact Login/Unlock Action */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Monthly Indicative Rent
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-colin-navy tracking-tight">
                ₹{property.rentMonthly.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-slate-500 font-medium">/ month</span>
            </div>
          </div>

          {/* Compact, Refined CTA without dominating orange buttons */}
          <div className="shrink-0">
            {!isAuthenticated ? (
              <div className="flex flex-col items-end">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 bg-colin-navy hover:bg-colin-teal text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm"
                >
                  <Lock size={12} className="text-colin-orange" />
                  <span>Unlock Details</span>
                  <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Login to Unlock
                </span>
              </div>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 bg-colin-teal hover:bg-colin-teal-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm"
              >
                <span>View Full Stay</span>
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
