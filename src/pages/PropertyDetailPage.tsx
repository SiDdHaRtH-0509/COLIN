import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PROPERTIES } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { VisitSlotModal } from '../components/property/VisitSlotModal';
import { ColinCertifiedBadge } from '../components/common/ColinCertifiedBadge';
import { Button } from '../components/common/Button';
import { 
  MapPin, 
  Star, 
  Lock, 
  Calendar, 
  Phone, 
  Mail, 
  User, 
  CheckCircle2, 
  Utensils, 
  ArrowLeft, 
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, demoLogin } = useAuth();
  
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);

  const property = PROPERTIES.find((p) => p.id === id);

  if (!property) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="w-16 h-16 rounded-full bg-colin-navy-50 text-colin-navy flex items-center justify-center mx-auto text-2xl font-bold">
            ?
          </div>
          <h2 className="text-2xl font-extrabold text-colin-navy">Property Not Found</h2>
          <p className="text-xs text-colin-charcoal-500">
            The property you are looking for does not exist or may have been unlisted.
          </p>
          <Link to="/">
            <Button variant="primary" size="sm">
              Return to Homepage
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const gallery = property.galleryImages || [property.featuredImage];

  return (
    <div className="min-h-screen bg-colin-offwhite py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <Link
            to="/#featured-properties"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-colin-charcoal-600 hover:text-colin-navy transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to All Stays</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-colin-teal uppercase tracking-wider">
              {property.categoryLabel}
            </span>
            <span className="text-colin-charcoal-300">•</span>
            <span className="text-xs font-medium text-colin-charcoal-600">
              {property.city}
            </span>
          </div>
        </div>

        {/* Unauthenticated Access Warning Banner if visitor lands here directly */}
        {!isAuthenticated && (
          <div className="bg-gradient-to-r from-colin-navy-950 via-colin-navy to-colin-navy-900 text-white rounded-3xl p-6 shadow-xl border border-colin-navy-800 flex flex-col md:flex-row items-center justify-between gap-5 animate-fadeIn">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-colin-orange/20 text-colin-orange flex items-center justify-center shrink-0 border border-colin-orange/30">
                <Lock size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Limited Guest Preview — Full Details Locked
                </h3>
                <p className="text-xs text-colin-charcoal-300 max-w-xl leading-relaxed">
                  Sign in or create a free student account to reveal the verified building address, landlord direct contact phone, and book an in-person inspection slot.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={() => demoLogin('student')}
                className="w-full sm:w-auto px-4 py-2.5 bg-colin-teal hover:bg-colin-teal-600 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} className="text-colin-orange" />
                <span>Quick Sign In</span>
              </button>
              <Link to={`/login?redirect=/property/${property.id}`} className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="w-full text-white border-white/30 hover:bg-white/10">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Visuals & Property Specs */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Gallery Viewer */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-colin-charcoal-200/90 shadow-sm space-y-3">
              <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-colin-charcoal-100">
                <img
                  src={gallery[activeImageIndex]}
                  alt={`${property.title} view ${activeImageIndex + 1}`}
                  className="w-full h-full object-cover transition-all duration-300"
                />
                <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
                  {property.isColinCertified && (
                    <ColinCertifiedBadge
                      variant="glass"
                      size="md"
                      score={property.certificationScore}
                      showScore
                    />
                  )}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-colin-navy-950 text-white border border-colin-teal/60 shadow-lg backdrop-blur-md select-none">
                    <span className={`w-2 h-2 rounded-full ${property.gender === 'girls' ? 'bg-colin-orange' : 'bg-colin-teal'}`} />
                    <span>{property.gender === 'girls' ? 'Girls Only' : property.gender === 'boys' ? 'Boys Only' : 'Co-ed'}</span>
                  </span>
                </div>
              </div>

              {/* Thumbnail Bar */}
              {gallery.length > 1 && (
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
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
                      <img src={img} alt="thumb" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Core Overview */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200/90 shadow-sm space-y-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-colin-teal bg-colin-teal/10 px-3 py-1 rounded-full">
                    {property.categoryLabel} • {property.roomType}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-colin-navy">
                    <Star size={14} className="text-colin-orange fill-colin-orange" />
                    <span>{property.rating}</span>
                    <span className="text-colin-charcoal-400 font-normal">({property.reviewsCount} student reviews)</span>
                  </div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-colin-navy tracking-tight font-display">
                  {property.title}
                </h1>

                <div className="flex items-center gap-1.5 text-xs text-colin-charcoal-600 font-medium">
                  <MapPin size={15} className="text-colin-orange shrink-0" />
                  <span>{property.neighborhood}, {property.city}</span>
                </div>
              </div>

              {/* Campus Proximity Box */}
              <div className="bg-colin-navy-50/70 border border-colin-navy-100 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-colin-charcoal-500 font-medium block">Proximity to College:</span>
                  <span className="font-extrabold text-colin-navy">{property.distanceToUniversity}</span>
                  <span className="text-[11px] text-colin-teal-700 block mt-0.5">{property.nearbyUniversity}</span>
                </div>
                <div>
                  <span className="text-colin-charcoal-500 font-medium block">Nearest Metro / Transit:</span>
                  <span className="font-extrabold text-colin-navy">{property.distanceToMetro}</span>
                  <span className="text-[11px] text-colin-charcoal-500 block mt-0.5">{property.landmark}</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2 pt-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-colin-navy">
                  About This Accommodation
                </h3>
                <p className="text-xs sm:text-sm text-colin-charcoal-600 leading-relaxed">
                  {property.description}
                </p>
              </div>

              {/* Highlights */}
              <div className="space-y-2 pt-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-colin-navy">
                  Key Verification Highlights
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {property.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-colin-charcoal-700">
                      <CheckCircle2 size={15} className="text-colin-teal shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-3 pt-3 border-t border-colin-charcoal-100">
                <h3 className="text-sm font-bold uppercase tracking-wider text-colin-navy">
                  Certified Amenities & Facilities
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {property.amenities.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-colin-offwhite border border-colin-charcoal-200/70 text-xs font-semibold text-colin-charcoal-800">
                      <span className="w-2 h-2 rounded-full bg-colin-teal" />
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* House Rules */}
              <div className="space-y-2 pt-3 border-t border-colin-charcoal-100">
                <h3 className="text-sm font-bold uppercase tracking-wider text-colin-navy">
                  House Rules & Community Norms
                </h3>
                <ul className="text-xs text-colin-charcoal-600 space-y-1.5 list-disc pl-5">
                  {property.houseRules.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>

          </div>

          {/* Right Column: Protected Contact & Visit Booking Card */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-28">
            
            {/* Rent & Booking Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-colin-charcoal-200 shadow-xl space-y-6">
              {/* Rent Details */}
              <div className="space-y-1 pb-4 border-b border-colin-charcoal-100">
                <div className="text-[11px] font-bold text-colin-charcoal-500 uppercase tracking-wider">
                  Indicative Monthly Rent
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-colin-navy">
                    ₹{property.rentMonthly.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-colin-charcoal-500">/ month</span>
                </div>
                <div className="flex items-center justify-between text-xs text-colin-charcoal-600 pt-1">
                  <span>Security Deposit:</span>
                  <span className="font-bold text-colin-navy">₹{property.depositAmount.toLocaleString('en-IN')}</span>
                </div>
                {property.foodIncluded && (
                  <div className="text-[11px] font-bold text-colin-teal bg-colin-teal/10 px-2.5 py-1 rounded-lg mt-2 inline-flex items-center gap-1.5">
                    <Utensils size={13} />
                    <span>Food Included (3 Daily Meals)</span>
                  </div>
                )}
              </div>

              {/* Booking CTA or Guest Barrier */}
              {isAuthenticated ? (
                /* Authenticated Action: Book Visit Slot */
                <div className="space-y-3">
                  <Button
                    variant="accent"
                    size="lg"
                    className="w-full text-colin-navy-950 font-extrabold"
                    onClick={() => setIsSlotModalOpen(true)}
                    rightIcon={<Calendar size={18} />}
                  >
                    Book In-Person Visit Slot
                  </Button>

                  <div className="p-3 bg-colin-teal/10 border border-colin-teal/30 rounded-2xl text-[11px] text-colin-teal-900 leading-relaxed">
                    <span className="font-bold">55% Refund Policy:</span> Reserve your guided visit slot. If you decide not to proceed after inspecting the property, 55% of your deposit is refunded instantly.
                  </div>
                </div>
              ) : (
                /* Unauthenticated Guest Lock Barrier */
                <div className="p-4 rounded-2xl bg-colin-navy-50 border border-colin-navy-100 space-y-3 text-center">
                  <div className="w-10 h-10 rounded-xl bg-colin-navy text-white mx-auto flex items-center justify-center">
                    <Lock size={18} className="text-colin-orange" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-colin-navy">
                      Login to Schedule Visit Slot
                    </h4>
                    <p className="text-[11px] text-colin-charcoal-500 mt-1">
                      Direct contact numbers and visit passes are restricted to verified accounts.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full flex items-center justify-center gap-1.5"
                    onClick={() => demoLogin('student')}
                  >
                    <Zap size={14} className="text-colin-orange fill-colin-orange" />
                    <span>Instant Student Demo Login</span>
                  </Button>
                </div>
              )}

              {/* Protected Property Address & Landlord Info */}
              <div className="pt-4 border-t border-colin-charcoal-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-colin-charcoal-700">
                    Host & Location Records
                  </span>
                  {isAuthenticated ? (
                    <span className="text-[10px] font-bold text-colin-teal bg-colin-teal/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck size={12} /> Unlocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-colin-orange bg-colin-orange/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock size={12} /> Restricted
                    </span>
                  )}
                </div>

                {isAuthenticated ? (
                  /* Unlocked Contact Details */
                  <div className="bg-colin-offwhite rounded-2xl p-4 border border-colin-charcoal-200/80 space-y-2.5 text-xs animate-fadeIn">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-colin-charcoal-500">
                        Exact Building Address:
                      </span>
                      <p className="font-bold text-colin-navy">{property.fullAddress}</p>
                    </div>

                    <div className="pt-2 border-t border-colin-charcoal-200/60 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-colin-charcoal-500">
                        Verified Landlord / Warden:
                      </span>
                      <div className="font-extrabold text-colin-navy flex items-center gap-1.5">
                        <User size={14} className="text-colin-teal" />
                        <span>{property.ownerName}</span>
                      </div>
                      <div className="text-colin-teal font-semibold flex items-center gap-1.5 pt-0.5">
                        <Phone size={13} />
                        <span>{property.ownerContact}</span>
                      </div>
                      <div className="text-colin-charcoal-500 text-[11px] flex items-center gap-1.5">
                        <Mail size={13} />
                        <span>{property.ownerEmail}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Redacted Contact Preview */
                  <div className="bg-colin-charcoal-100/70 rounded-2xl p-4 border border-colin-charcoal-200/80 space-y-2 text-xs filter blur-[0.5px] opacity-75 select-none">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-colin-charcoal-500">
                        Exact Address:
                      </span>
                      <p className="font-bold text-colin-navy">Plot •••, Hudson Lane, GTB Nagar ••••••</p>
                    </div>
                    <div className="pt-2 border-t border-colin-charcoal-200">
                      <span className="text-[10px] uppercase font-bold text-colin-charcoal-500">
                        Owner Contact:
                      </span>
                      <p className="font-bold text-colin-navy">+91 98XXX XXXXX (Locked)</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Inspection Badge Card */}
              <div className="bg-colin-navy-950 p-5 rounded-3xl text-white space-y-2 border border-colin-teal/30 shadow-md">
                <ColinCertifiedBadge variant="dark" size="md" score={property.certificationScore} showScore />
                <p className="text-[11px] text-colin-charcoal-200 leading-relaxed pt-1">
                  Physically verified on {property.certificationDate} by COLIN campus ambassadors. Room dimensions, biometric entry, and food hygiene passed inspection.
                </p>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* Guided Visit Slot Modal */}
      <VisitSlotModal
        property={property}
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
      />
    </div>
  );
};
