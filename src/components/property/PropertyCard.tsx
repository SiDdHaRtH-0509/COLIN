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
  ArrowRight
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
      className="group relative bg-white rounded-3xl border border-colin-charcoal-200/90 shadow-brand hover:shadow-brand-hover transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-1.5 h-full"
    >
      {/* Property Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-colin-charcoal-100">
        <img
          src={property.featuredImage}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradient Overlay for Readable Text & Badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-colin-navy-950/80 via-black/10 to-black/35" />

        {/* Top Badges Row */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 z-10">
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
          <div className="flex items-center gap-1 bg-colin-navy-950/90 backdrop-blur-md px-2 py-0.5 rounded-full text-xs font-bold text-white border border-white/20 shadow-sm shrink-0">
            <Star size={12} className="text-colin-orange fill-colin-orange" />
            <span>{property.rating}</span>
            <span className="text-[10px] text-colin-charcoal-300 font-normal">({property.reviewsCount})</span>
          </div>
        </div>

        {/* Bottom Status Row on Image */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs z-10 gap-2">
          <div className="flex items-center gap-1.5">
            <span className="bg-colin-navy-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white/95 border border-white/10 shadow-sm">
              {property.roomType}
            </span>
            {!isAuthenticated && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-colin-orange text-colin-navy-950 px-2 py-0.5 rounded-md shadow-sm">
                <Lock size={10} /> Login to Unlock
              </span>
            )}
          </div>

          <div className="shrink-0">
            {getGenderBadge()}
          </div>
        </div>
      </div>

      {/* Card Content & Information Hierarchy */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3.5">
        <div className="space-y-2">
          {/* Category & Campus Proximity */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-colin-teal uppercase tracking-wider text-[11px]">
              {property.categoryLabel}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-colin-charcoal-600 bg-slate-100 px-2 py-0.5 rounded-md">
              <MapPin size={11} className="text-colin-teal shrink-0" />
              <span>{property.distanceToUniversity}</span>
            </span>
          </div>

          {/* Title */}
          <h3 className="font-extrabold text-base text-colin-navy group-hover:text-colin-teal transition-colors line-clamp-1 leading-snug">
            {property.title}
          </h3>

          {/* Location / Campus */}
          <div className="flex items-center gap-1.5 text-xs text-colin-charcoal-500">
            <MapPin size={13} className="text-colin-orange shrink-0" />
            <span className="line-clamp-1 font-medium text-colin-charcoal-600">{property.neighborhood}, {property.city}</span>
          </div>
        </div>

        {/* Key Amenities Preview */}
        <div className="pt-2.5 border-t border-colin-charcoal-100 flex flex-wrap gap-1.5 text-[11px]">
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

        {/* Rent & Action Footer */}
        <div className="pt-3 border-t border-colin-charcoal-100 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-colin-charcoal-500 tracking-wider">
              Monthly Indicative Rent
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-colin-navy">
                ₹{property.rentMonthly.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-colin-charcoal-500 font-medium">/ month</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-colin-teal group-hover:text-colin-navy transition-colors">
            <span>{isAuthenticated ? 'View Full Stay' : 'Unlock Details'}</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
