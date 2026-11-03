import React, { useState } from 'react';
import { useProperties } from '../../context/PropertyContext';
import { PhotographyPackage } from '../../types';
import {
  TrendingUp,
  Sparkles,
  Camera,
  RefreshCw,
  Building,
  Zap,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/common/Button';

export const OwnerMonetisationPage: React.FC = () => {
  const {
    ownerProperties,
    sponsorships,
    createSponsorship,
    photographyBookings,
    bookPhotography,
    renewListing,
  } = useProperties();

  // Active Monetisation Tab
  const [activeTab, setActiveTab] = useState<'sponsorship' | 'search_boost' | 'photography' | 'renewal' | 'bulk'>('sponsorship');

  // Property Selection for Campaigns
  const [selectedPropId, setSelectedPropId] = useState<string>(() => {
    return ownerProperties.length > 0 ? ownerProperties[0].id : '';
  });

  // Sponsorship Package Form
  const [sponsorshipDuration, setSponsorshipDuration] = useState<7 | 14 | 30>(14);
  const [sponsorshipSuccess, setSponsorshipSuccess] = useState(false);

  // Search Boost Form
  const [boostDuration, setBoostDuration] = useState<7 | 14 | 30>(7);
  const [boostSuccess, setBoostSuccess] = useState(false);

  // Photography Booking Form
  const [photoPackage, setPhotoPackage] = useState<PhotographyPackage>('360° Virtual Tour & HDR');
  const [photoDate, setPhotoDate] = useState('2026-11-15');
  const [photoSlot, setPhotoSlot] = useState('02:00 PM - 04:00 PM');
  const [photoSuccess, setPhotoSuccess] = useState(false);

  // Listing Renewal Form
  const [renewDuration, setRenewDuration] = useState<'6-month' | '12-month'>('12-month');
  const [renewSuccess, setRenewSuccess] = useState(false);

  // Bulk Partnership Form
  const [chainName, setChainName] = useState('Sharma Student Accommodations');
  const [totalBuildingCount, setTotalBuildingCount] = useState(4);
  const [totalBedCapacity, setTotalBedCapacity] = useState(120);
  const [bulkCity, setBulkCity] = useState('Delhi NCR');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState(false);

  const activeProperty = ownerProperties.find((p) => p.id === selectedPropId) || ownerProperties[0];

  // Pricing calculations
  const sponsorshipPricing: Record<number, { price: number; impressions: string; leads: string }> = {
    7: { price: 999, impressions: '2,500 - 4,000', leads: '20 - 35' },
    14: { price: 1799, impressions: '5,000 - 8,500', leads: '45 - 70' },
    30: { price: 2999, impressions: '12,000 - 18,000', leads: '90 - 150' },
  };

  const boostPricing: Record<number, { price: number; multiplier: string }> = {
    7: { price: 599, multiplier: '2.5x Rank Boost' },
    14: { price: 1099, multiplier: '3.2x Rank Boost' },
    30: { price: 1999, multiplier: '4.0x Rank Boost' },
  };

  const photoPricing: Record<PhotographyPackage, { price: number; description: string; turnaround: string }> = {
    'HDR Essentials': {
      price: 1499,
      description: '15 High Dynamic Range wide-angle interior & exterior room photos.',
      turnaround: '24 Hours Delivery',
    },
    '360° Virtual Tour & HDR': {
      price: 2499,
      description: 'Interactive Mol* 360° panoramic virtual walk-through + 20 HDR shots with hotspots.',
      turnaround: '48 Hours Delivery',
    },
    'Full Studio & Drone Shoot': {
      price: 3999,
      description: 'Drone aerial views, 360° tour, HDR room shots, and student lifestyle promotional clip.',
      turnaround: '72 Hours Delivery',
    },
  };

  // Submit Sponsorship
  const handleCreateSponsorship = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty) return;
    const plan = sponsorshipPricing[sponsorshipDuration];
    createSponsorship(activeProperty.id, 'homepage', sponsorshipDuration, plan.price);
    setSponsorshipSuccess(true);
    setTimeout(() => setSponsorshipSuccess(false), 2500);
  };

  // Submit Search Boost
  const handleCreateBoost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty) return;
    const plan = boostPricing[boostDuration];
    createSponsorship(activeProperty.id, 'search_boost', boostDuration, plan.price);
    setBoostSuccess(true);
    setTimeout(() => setBoostSuccess(false), 2500);
  };

  // Submit Photography
  const handleBookPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty) return;
    const plan = photoPricing[photoPackage];
    bookPhotography(activeProperty.id, photoPackage, photoDate, photoSlot, plan.price);
    setPhotoSuccess(true);
    setTimeout(() => setPhotoSuccess(false), 2500);
  };

  // Submit Renewal
  const handleRenewListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty) return;
    renewListing(activeProperty.id, renewDuration);
    setRenewSuccess(true);
    setTimeout(() => setRenewSuccess(false), 2500);
  };

  // Submit Bulk Enquiry
  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBulkSuccess(true);
    setTimeout(() => setBulkSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-colin-navy font-display flex items-center gap-2">
            <TrendingUp size={28} className="text-colin-orange" />
            <span>Growth & Listing Monetisation</span>
          </h1>
          <p className="text-xs text-colin-charcoal-500 mt-1">
            Promote your accommodations across student search feeds, book 360° virtual tours, renew listings, and partner with university housing networks.
          </p>
        </div>

        <div className="bg-colin-navy-50 text-colin-navy text-xs font-bold px-3 py-1.5 rounded-xl border border-colin-navy-100 flex items-center gap-2 self-start sm:self-auto">
          <Zap size={14} className="text-colin-orange fill-colin-orange" />
          <span>Demonstration Checkout Enabled</span>
        </div>
      </div>

      {/* Property Selector Bar */}
      <div className="bg-white rounded-2xl p-4 border border-colin-charcoal-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Building size={18} className="text-colin-navy shrink-0" />
          <div className="space-y-0.5 flex-1 sm:flex-initial">
            <label className="text-[10px] font-bold text-colin-charcoal-400 uppercase tracking-wider block">
              Target Property for Promotion
            </label>
            <select
              value={selectedPropId}
              onChange={(e) => setSelectedPropId(e.target.value)}
              className="text-xs font-bold text-colin-navy bg-colin-offwhite border border-colin-charcoal-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-colin-navy"
            >
              {ownerProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.neighborhood}, {p.city})
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeProperty && (
          <div className="flex items-center gap-2 text-xs">
            {activeProperty.isSponsored && (
              <span className="bg-colin-orange/15 text-colin-orange font-bold px-2.5 py-0.5 rounded-full">
                Active Sponsored Badge
              </span>
            )}
            {activeProperty.isColinCertified && (
              <span className="bg-colin-teal/15 text-colin-teal-700 font-bold px-2.5 py-0.5 rounded-full">
                ★ Certified
              </span>
            )}
          </div>
        )}
      </div>

      {/* Monetisation Tabs */}
      <div className="flex items-center gap-2 border-b border-colin-charcoal-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('sponsorship')}
          className={`text-xs font-extrabold px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'sponsorship'
              ? 'bg-colin-navy text-white shadow-sm'
              : 'text-colin-charcoal-600 hover:bg-colin-charcoal-100'
          }`}
        >
          <Sparkles size={14} className="text-colin-orange" />
          <span>A. Homepage Spotlight</span>
        </button>

        <button
          onClick={() => setActiveTab('search_boost')}
          className={`text-xs font-extrabold px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'search_boost'
              ? 'bg-colin-navy text-white shadow-sm'
              : 'text-colin-charcoal-600 hover:bg-colin-charcoal-100'
          }`}
        >
          <TrendingUp size={14} className="text-colin-teal" />
          <span>B. Search Ranking Boost</span>
        </button>

        <button
          onClick={() => setActiveTab('photography')}
          className={`text-xs font-extrabold px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'photography'
              ? 'bg-colin-navy text-white shadow-sm'
              : 'text-colin-charcoal-600 hover:bg-colin-charcoal-100'
          }`}
        >
          <Camera size={14} className="text-colin-navy" />
          <span>C. 360° Studio Photography</span>
        </button>

        <button
          onClick={() => setActiveTab('renewal')}
          className={`text-xs font-extrabold px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'renewal'
              ? 'bg-colin-navy text-white shadow-sm'
              : 'text-colin-charcoal-600 hover:bg-colin-charcoal-100'
          }`}
        >
          <RefreshCw size={14} />
          <span>D. Listing Renewal</span>
        </button>

        <button
          onClick={() => setActiveTab('bulk')}
          className={`text-xs font-extrabold px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'bulk'
              ? 'bg-colin-navy text-white shadow-sm'
              : 'text-colin-charcoal-600 hover:bg-colin-charcoal-100'
          }`}
        >
          <Building size={14} />
          <span>E. PG Chain & Bulk Management</span>
        </button>
      </div>

      {/* ================= TAB CONTENT ================= */}

      {/* A. HOMEPAGE SPONSORSHIP */}
      {activeTab === 'sponsorship' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200/90 shadow-sm space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-colin-orange tracking-wider block">
                Featured Placement Tier
              </span>
              <h2 className="text-xl font-black text-colin-navy font-display">
                Homepage Hero & Spotlight Sponsorship
              </h2>
              <p className="text-xs text-colin-charcoal-500 leading-relaxed">
                Position <strong>{activeProperty?.title}</strong> directly on the COLIN public homepage showcase. Prominently displays the gold "Sponsored" badge and prioritizes your accommodation for all incoming campus students.
              </p>
            </div>

            {/* Duration Selector */}
            <form onSubmit={handleCreateSponsorship} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider block">
                  Select Sponsorship Duration
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {([7, 14, 30] as const).map((duration) => {
                    const info = sponsorshipPricing[duration];
                    const isSelected = sponsorshipDuration === duration;
                    return (
                      <button
                        type="button"
                        key={duration}
                        onClick={() => setSponsorshipDuration(duration)}
                        className={`p-4 rounded-2xl border text-left space-y-1.5 transition-all ${
                          isSelected
                            ? 'border-colin-orange bg-colin-orange/10 ring-2 ring-colin-orange/20 shadow-sm'
                            : 'border-colin-charcoal-200 hover:border-colin-charcoal-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-colin-navy">{duration} Days</span>
                          {duration === 14 && (
                            <span className="text-[9px] font-black uppercase bg-colin-orange text-colin-navy-950 px-1.5 py-0.2 rounded">
                              Most Popular
                            </span>
                          )}
                        </div>
                        <div className="text-lg font-black text-colin-navy font-display">
                          ₹{info.price.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-colin-charcoal-500 pt-1 space-y-0.5">
                          <div>Est. Views: <strong>{info.impressions}</strong></div>
                          <div>Est. Leads: <strong>{info.leads} students</strong></div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {sponsorshipSuccess ? (
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-center space-y-1">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
                  <div className="text-xs font-extrabold">Homepage Sponsorship Activated!</div>
                  <p className="text-[11px]">Badge updated on student search and home showcase.</p>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-4 border-t border-colin-charcoal-100">
                  <div className="text-xs text-colin-charcoal-500">
                    Total: <strong className="text-sm text-colin-navy font-display">₹{sponsorshipPricing[sponsorshipDuration].price.toLocaleString('en-IN')}</strong> (Simulated)
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="bg-colin-navy hover:bg-colin-navy-800"
                    leftIcon={<Zap size={14} className="text-colin-orange fill-colin-orange" />}
                  >
                    Activate Sponsorship (Demo Checkout)
                  </Button>
                </div>
              )}
            </form>
          </div>

          {/* Right: Active Campaigns */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-colin-charcoal-200/90 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-colin-navy tracking-wider">
              Active Sponsorship Campaigns ({sponsorships.length})
            </h3>

            {sponsorships.length === 0 ? (
              <p className="text-xs text-colin-charcoal-400 italic">
                No active promotional campaigns running.
              </p>
            ) : (
              <div className="space-y-3">
                {sponsorships.map((camp) => (
                  <div key={camp.id} className="p-3.5 bg-colin-offwhite rounded-2xl border border-colin-charcoal-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-colin-navy">{camp.propertyTitle}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {camp.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-colin-charcoal-500">
                      Duration: {camp.durationDays} days ({camp.startDate} to {camp.endDate})
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-colin-charcoal-600 pt-1 border-t border-colin-charcoal-100">
                      <span>{camp.impressions} Views</span>
                      <span>{camp.clicks} Clicks</span>
                      <span className="font-bold text-colin-teal">{camp.leadsGenerated} Leads</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* B. SEARCH RANKING BOOST */}
      {activeTab === 'search_boost' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200/90 shadow-sm max-w-2xl space-y-6 animate-fadeIn">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-colin-teal tracking-wider block">
              Search Result Priority
            </span>
            <h2 className="text-xl font-black text-colin-navy font-display">
              Paid Search Ranking Boost
            </h2>
            <p className="text-xs text-colin-charcoal-500 leading-relaxed">
              Elevate your property to appear in the top 3 results whenever students search for accommodations in your campus locality.
            </p>
          </div>

          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <span>
              <strong>Transparency Note:</strong> Boosted listings carry an authentic "Sponsored" label. Search boost does NOT alter physical certification scores.
            </span>
          </div>

          <form onSubmit={handleCreateBoost} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                Choose Boost Duration
              </label>
              <div className="grid grid-cols-3 gap-3">
                {([7, 14, 30] as const).map((duration) => {
                  const info = boostPricing[duration];
                  const isSelected = boostDuration === duration;
                  return (
                    <button
                      type="button"
                      key={duration}
                      onClick={() => setBoostDuration(duration)}
                      className={`p-3.5 rounded-2xl border text-left space-y-1 transition-all ${
                        isSelected
                          ? 'border-colin-teal bg-colin-teal/10 ring-2 ring-colin-teal/20 shadow-sm'
                          : 'border-colin-charcoal-200 bg-white hover:bg-colin-charcoal-50'
                      }`}
                    >
                      <div className="text-xs font-bold text-colin-navy">{duration} Days</div>
                      <div className="text-base font-black text-colin-navy font-display">
                        ₹{info.price.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-colin-teal font-extrabold">{info.multiplier}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {boostSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-center space-y-1">
                <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
                <div className="text-xs font-extrabold">Search Boost Activated!</div>
                <p className="text-[11px]">Listing now prioritized in campus locality search results.</p>
              </div>
            ) : (
              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" size="md" className="bg-colin-navy">
                  Boost Listing (₹{boostPricing[boostDuration].price})
                </Button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* C. PROFESSIONAL PHOTOGRAPHY & 360 TOUR */}
      {activeTab === 'photography' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200/90 shadow-sm space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-colin-navy tracking-wider block">
                Visual Content Studio
              </span>
              <h2 className="text-xl font-black text-colin-navy font-display">
                Professional Photography & 360° Virtual Tour
              </h2>
              <p className="text-xs text-colin-charcoal-500 leading-relaxed">
                Properties with certified 360° virtual tours receive <strong>4.8x more student inquiries</strong> and save dozens of unnecessary physical visit hours.
              </p>
            </div>

            <form onSubmit={handleBookPhoto} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                  Select Visual Package
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['HDR Essentials', '360° Virtual Tour & HDR', 'Full Studio & Drone Shoot'] as const).map((pkg) => {
                    const info = photoPricing[pkg];
                    const isSelected = photoPackage === pkg;
                    return (
                      <button
                        type="button"
                        key={pkg}
                        onClick={() => setPhotoPackage(pkg)}
                        className={`p-4 rounded-2xl border text-left space-y-1.5 transition-all ${
                          isSelected
                            ? 'border-colin-navy bg-colin-navy-50 ring-2 ring-colin-navy/20 shadow-sm'
                            : 'border-colin-charcoal-200 bg-white hover:bg-colin-charcoal-50'
                        }`}
                      >
                        <div className="text-xs font-black text-colin-navy">{pkg}</div>
                        <div className="text-lg font-black text-colin-navy font-display">
                          ₹{info.price.toLocaleString('en-IN')}
                        </div>
                        <p className="text-[10px] text-colin-charcoal-500 leading-relaxed">
                          {info.description}
                        </p>
                        <span className="text-[9px] font-bold text-colin-teal block pt-1">
                          {info.turnaround}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                    Preferred Shoot Date
                  </label>
                  <input
                    type="date"
                    required
                    value={photoDate}
                    onChange={(e) => setPhotoDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                    Time Window
                  </label>
                  <select
                    value={photoSlot}
                    onChange={(e) => setPhotoSlot(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none bg-white"
                  >
                    <option>10:00 AM - 12:00 PM</option>
                    <option>02:00 PM - 04:00 PM</option>
                    <option>04:00 PM - 06:00 PM</option>
                  </select>
                </div>
              </div>

              {photoSuccess ? (
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-center space-y-1">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
                  <div className="text-xs font-extrabold">Studio Shoot Booked!</div>
                  <p className="text-[11px]">Photographer assigned. Will contact you 2 hours prior to arrival.</p>
                </div>
              ) : (
                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="primary" size="md" className="bg-colin-navy">
                    Book Studio Shoot (₹{photoPricing[photoPackage].price})
                  </Button>
                </div>
              )}
            </form>
          </div>

          {/* Right: Studio Booking Records */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-colin-charcoal-200/90 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-colin-navy tracking-wider">
              Photography Orders ({photographyBookings.length})
            </h3>
            {photographyBookings.map((b) => (
              <div key={b.id} className="p-3.5 bg-colin-offwhite rounded-2xl border border-colin-charcoal-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-colin-navy">{b.package}</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {b.status}
                  </span>
                </div>
                <div className="text-[11px] text-colin-charcoal-500">
                  {b.propertyTitle} • {b.scheduledDate} ({b.timeSlot})
                </div>
                <div className="text-[10px] text-colin-teal font-semibold pt-1">
                  Photographer: {b.photographerName}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* D. PROPERTY RENEWAL */}
      {activeTab === 'renewal' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200/90 shadow-sm max-w-2xl space-y-6 animate-fadeIn">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-colin-teal tracking-wider block">
              Annual Listing Extension
            </span>
            <h2 className="text-xl font-black text-colin-navy font-display">
              Property Listing Renewal & Verification Update
            </h2>
            <p className="text-xs text-colin-charcoal-500 leading-relaxed">
              Extend active accommodation listing on the student discovery portal. Update monthly rent, meal options, and refresh available bed inventory.
            </p>
          </div>

          <form onSubmit={handleRenewListing} className="space-y-4">
            <div className="p-3 bg-colin-offwhite rounded-2xl border border-colin-charcoal-100 text-xs space-y-1">
              <div>Target Property: <strong className="text-colin-navy">{activeProperty?.title}</strong></div>
              <div>Current Expiration: <span className="text-colin-charcoal-600">{activeProperty?.listingExpiresAt || '2027-10-01'}</span></div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                Select Renewal Duration
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRenewDuration('6-month')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    renewDuration === '6-month'
                      ? 'border-colin-navy bg-colin-navy-50 text-colin-navy font-bold'
                      : 'border-colin-charcoal-200 bg-white hover:bg-colin-charcoal-50'
                  }`}
                >
                  <div className="text-xs">6 Months Extension</div>
                  <div className="text-sm font-black text-colin-navy">₹999 (Simulated)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRenewDuration('12-month')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    renewDuration === '12-month'
                      ? 'border-colin-navy bg-colin-navy-50 text-colin-navy font-bold'
                      : 'border-colin-charcoal-200 bg-white hover:bg-colin-charcoal-50'
                  }`}
                >
                  <div className="text-xs">12 Months (Full Academic Year)</div>
                  <div className="text-sm font-black text-colin-navy">₹1,799 (Simulated)</div>
                </button>
              </div>
            </div>

            {renewSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-center space-y-1">
                <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
                <div className="text-xs font-extrabold">Listing Successfully Renewed!</div>
                <p className="text-[11px]">Updated expiration date recorded in property state.</p>
              </div>
            ) : (
              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" size="md" className="bg-colin-navy">
                  Confirm & Renew Listing
                </Button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* E. BULK PROPERTY PARTNERSHIP */}
      {activeTab === 'bulk' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200/90 shadow-sm space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-colin-navy tracking-wider block">
                Enterprise & PG Chains
              </span>
              <h2 className="text-xl font-black text-colin-navy font-display">
                Bulk Property Management & University Chain Partnership
              </h2>
              <p className="text-xs text-colin-charcoal-500 leading-relaxed">
                Managing 3 or more student hostels, PG buildings, or co-living spaces? Access dedicated account management, bulk CSV inventory upload, and unified university admission season marketing.
              </p>
            </div>

            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                    Hostel Chain / Operating Brand Name
                  </label>
                  <input
                    type="text"
                    required
                    value={chainName}
                    onChange={(e) => setChainName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                    Primary Operational City
                  </label>
                  <select
                    value={bulkCity}
                    onChange={(e) => setBulkCity(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none bg-white"
                  >
                    <option>Delhi NCR</option>
                    <option>Bengaluru</option>
                    <option>Pune</option>
                    <option>Mumbai</option>
                    <option>Kota</option>
                    <option>Hyderabad</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                    Total Buildings / Properties
                  </label>
                  <input
                    type="number"
                    min={2}
                    value={totalBuildingCount}
                    onChange={(e) => setTotalBuildingCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                    Total Bed Capacity
                  </label>
                  <input
                    type="number"
                    min={20}
                    value={totalBedCapacity}
                    onChange={(e) => setTotalBedCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                  Additional Notes or Specific University Campuses
                </label>
                <textarea
                  rows={3}
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  placeholder="e.g. 4 properties near North Campus (Kamla Nagar and Vijay Nagar), seeking bulk audit for admission season."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none"
                />
              </div>

              {bulkSuccess ? (
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-center space-y-1">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
                  <div className="text-xs font-extrabold">Enterprise Partnership Request Received!</div>
                  <p className="text-[11px]">A COLIN Senior Account Director will reach out within 4 business hours.</p>
                </div>
              ) : (
                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="primary" size="md" className="bg-colin-navy">
                    Submit Partnership Request
                  </Button>
                </div>
              )}
            </form>
          </div>

          {/* Right: CSV Bulk Template Card */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-colin-charcoal-200/90 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-colin-navy">
              <FileSpreadsheet size={20} className="text-colin-teal" />
              <h3 className="text-xs font-black uppercase tracking-wider">
                Bulk CSV Inventory Upload
              </h3>
            </div>

            <p className="text-xs text-colin-charcoal-500 leading-relaxed">
              Export and upload multiple property and room records simultaneously via spreadsheet.
            </p>

            <div className="space-y-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center text-xs font-bold"
                onClick={() => alert('Downloaded colin_bulk_properties_template.csv (Demonstration sample)')}
                leftIcon={<Download size={14} />}
              >
                Download CSV Sample Template
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-xs font-bold text-colin-teal"
                onClick={() => alert('Simulated CSV parser: 12 property rows validated successfully.')}
                leftIcon={<Upload size={14} />}
              >
                Upload Completed CSV
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
