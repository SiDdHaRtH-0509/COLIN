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
  ShieldCheck
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
      className="group relative bg-white rounded-3xl border border-colin-charcoal-200/90 shadow-brand hover:shadow-brand-hover transition-all duration-300 overflow-hidden flex flex-col cursor-pointer hover:-translate-y-1.5"
    >
      {/* Property Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-colin-charcoal-100">
        <img
          src={property.featuredImage}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-colin-navy-950/80 via-transparent to-black/20" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
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
              <span className="bg-colin-navy-950/85 backdrop-blur-md text-[10px] uppercase font-black tracking-wider text-colin-orange px-2 py-0.5 rounded-lg border border-colin-orange/40 shadow-sm">
                Sponsored
              </span>
            )}
            {getGenderBadge()}
          </div>

          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-bold text-colin-navy shadow-sm">
            <Star size={12} className="text-colin-orange fill-colin-orange" />
            <span>{property.rating}</span>
            <span className="text-[10px] text-colin-charcoal-400 font-normal">({property.reviewsCount})</span>
          </div>
        </div>

        {/* Status indicator on image */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs z-10">
          <span className="bg-colin-navy-950/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-semibold text-colin-teal-300 border border-colin-teal/30">
            {property.roomType}
          </span>

          {!isAuthenticated ? (
            <span className="flex items-center gap-1 text-[11px] font-bold bg-colin-orange/90 text-colin-navy-950 px-2.5 py-1 rounded-lg shadow-sm">
              <Lock size={12} /> Login to Unlock
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-colin-teal/90 text-white px-2 py-0.5 rounded-lg">
              <ShieldCheck size={12} /> Verified
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Category & Proximity */}
          <div className="flex items-center justify-between text-xs text-colin-charcoal-500">
            <span className="font-bold text-colin-teal uppercase tracking-wider text-[11px]">
              {property.categoryLabel}
            </span>
            <span className="text-[11px] font-semibold text-colin-charcoal-600 bg-colin-navy-50 px-2 py-0.5 rounded-md">
              📍 {property.distanceToUniversity}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-extrabold text-base text-colin-navy group-hover:text-colin-teal transition-colors line-clamp-1">
            {property.title}
          </h3>

          {/* Location / Campus */}
          <div className="flex items-start gap-1.5 text-xs text-colin-charcoal-600">
            <MapPin size={14} className="text-colin-orange shrink-0 mt-0.5" />
            <span className="line-clamp-1">{property.neighborhood}, {property.city}</span>
          </div>
        </div>

        {/* Key Amenities Preview */}
        <div className="pt-2 border-t border-colin-charcoal-100 flex flex-wrap gap-2 text-[11px] text-colin-charcoal-600">
          {property.foodIncluded && (
            <span className="inline-flex items-center gap-1 bg-colin-teal/10 text-colin-teal-800 px-2 py-0.5 rounded-md font-semibold">
              <Utensils size={12} /> Food Included
            </span>
          )}
          <span className="inline-flex items-center gap-1 bg-colin-charcoal-100/70 text-colin-charcoal-700 px-2 py-0.5 rounded-md">
            <Wifi size={12} /> High-speed Wi-Fi
          </span>
          <span className="inline-flex items-center gap-1 bg-colin-charcoal-100/70 text-colin-charcoal-700 px-2 py-0.5 rounded-md">
            <Wind size={12} /> AC
          </span>
        </div>

        {/* Rent & Action Footer */}
        <div className="pt-3 border-t border-colin-charcoal-100 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-colin-charcoal-500 tracking-wider">
              Monthly Indicative Rent
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-colin-navy">
                ₹{property.rentMonthly.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-colin-charcoal-500">/ month</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-colin-teal group-hover:translate-x-1 transition-transform">
            <span>{isAuthenticated ? 'View Full Stay' : 'Unlock Details'}</span>
            <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </div>
  );
};
