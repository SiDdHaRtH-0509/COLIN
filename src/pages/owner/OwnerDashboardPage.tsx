import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProperties } from '../../context/PropertyContext';
import {
  Building2,
  BedDouble,
  MessageSquareText,
  CalendarCheck,
  ShieldCheck,
  TrendingUp,
  Crown,
  PlusCircle,
  Clock,
  ExternalLink,
  BadgeCheck,
} from 'lucide-react';
import { Button } from '../../components/common/Button';

export const OwnerDashboardPage: React.FC = () => {
  const {
    ownerProperties,
    rooms,
    enquiries,
    visits,
    certifications,
    subscription,
    ownerProfile,
    toggleListingStatus,
  } = useProperties();

  // DERIVED METRICS (Never hardcoded!)
  const totalProperties = ownerProperties.length;
  const activeListings = ownerProperties.filter((p) => !p.listingStatus || p.listingStatus === 'active').length;
  const pendingListings = ownerProperties.filter((p) => p.listingStatus === 'paused' || p.listingStatus === 'draft').length;

  // Rooms & Beds metrics for owner's properties
  const ownerPropertyIds = useMemo(() => new Set(ownerProperties.map((p) => p.id)), [ownerProperties]);
  const ownerRooms = useMemo(() => rooms.filter((r) => ownerPropertyIds.has(r.propertyId)), [rooms, ownerPropertyIds]);

  const availableRoomsCount = ownerRooms.filter((r) => r.status === 'available').length;
  const occupiedRoomsCount = ownerRooms.filter((r) => r.status === 'occupied').length;
  const maintenanceRoomsCount = ownerRooms.filter((r) => r.status === 'maintenance').length;

  const totalBedsCount = ownerRooms.reduce((acc, r) => acc + r.totalBeds, 0);
  const availableBedsCount = ownerRooms.reduce((acc, r) => acc + (r.status === 'available' ? r.availableBeds : 0), 0);
  const occupiedBedsCount = Math.max(0, totalBedsCount - availableBedsCount);
  const occupancyPercentage = totalBedsCount > 0 ? Math.round((occupiedBedsCount / totalBedsCount) * 100) : 0;

  // Enquiries metrics
  const totalEnquiriesCount = enquiries.length;
  const newEnquiriesCount = enquiries.filter((e) => e.status === 'New').length;

  // Visits metrics
  const upcomingVisits = visits.filter((v) => v.status === 'Confirmed' || v.status === 'Pending');
  const upcomingVisitsCount = upcomingVisits.length;

  // Certification metrics
  const certifiedPropertiesCount = ownerProperties.filter((p) => p.isColinCertified).length;

  // Latest activities stream
  const recentActivities = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'enquiry' | 'visit' | 'certification';
      title: string;
      subtitle: string;
      date: string;
      status: string;
      badgeClass: string;
    }> = [];

    enquiries.slice(0, 3).forEach((e) => {
      list.push({
        id: `act-enq-${e.id}`,
        type: 'enquiry',
        title: `Enquiry from ${e.studentName}`,
        subtitle: `${e.propertyTitle} • ${e.studentUniversity || 'Student'}`,
        date: e.date,
        status: e.status,
        badgeClass: e.status === 'New' ? 'bg-colin-orange text-white' : 'bg-colin-navy-50 text-colin-navy',
      });
    });

    visits.slice(0, 3).forEach((v) => {
      list.push({
        id: `act-vis-${v.id}`,
        type: 'visit',
        title: `Visit by ${v.studentName}`,
        subtitle: `${v.propertyTitle} • Slot: ${v.date} (${v.timeSlot})`,
        date: v.date,
        status: v.status,
        badgeClass: v.status === 'Confirmed' ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-800',
      });
    });

    certifications.slice(0, 2).forEach((c) => {
      list.push({
        id: `act-cert-${c.id}`,
        type: 'certification',
        title: `Audit Status: ${c.status}`,
        subtitle: `${c.propertyTitle} • Inspector: ${c.inspectorName || 'COLIN Audit Team'}`,
        date: c.requestedAt,
        status: c.status,
        badgeClass: c.status === 'Certified' ? 'bg-colin-teal text-white' : 'bg-colin-navy text-white',
      });
    });

    return list.slice(0, 5);
  }, [enquiries, visits, certifications]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fadeIn">
      
      {/* ================= OVERVIEW HEADER ================= */}
      <div className="bg-gradient-to-r from-colin-navy-950 via-colin-navy to-colin-navy-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-white/10">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-colin-orange/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-colin-teal/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-colin-orange text-xs font-bold tracking-wide">
              <BadgeCheck size={14} className="text-colin-orange" />
              <span>COLIN Verified Partner Host</span>
              <span className="text-white/40">•</span>
              <span className="text-colin-teal-300 font-semibold">{ownerProfile.city}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight font-display">
              Welcome back, <span className="text-colin-orange">{ownerProfile.ownerName}</span>
            </h1>

            <p className="text-xs sm:text-sm text-colin-charcoal-200 max-w-2xl leading-relaxed">
              {ownerProfile.businessName} — Real-time property inventory, student visit appointments, and physical verification audits across campus hubs.
            </p>
          </div>

          {/* Quick Plan HUD & Upgrade Pill */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-white">
                <Crown size={14} className="text-colin-orange" />
                <span>{subscription.tier} Host Plan</span>
              </div>
              <p className="text-[11px] text-colin-charcoal-300">
                Active until {new Date(subscription.expiresAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <Link to="/owner/subscription">
              <Button
                variant="accent"
                size="sm"
                className="text-xs font-bold bg-colin-orange hover:bg-colin-orange-600 text-colin-navy-950 px-3 py-1.5"
              >
                Plan Details →
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ================= QUICK ACTIONS BAR ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Link to="/owner/properties">
          <div className="bg-white hover:bg-colin-navy hover:text-white p-3.5 rounded-2xl border border-colin-charcoal-200/90 shadow-sm transition-all group cursor-pointer text-center space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-colin-navy-50 text-colin-navy group-hover:bg-white/20 group-hover:text-white flex items-center justify-center mx-auto transition-colors">
              <PlusCircle size={18} className="text-colin-orange" />
            </div>
            <div className="text-xs font-black">Add Property</div>
            <p className="text-[10px] text-colin-charcoal-500 group-hover:text-colin-charcoal-200">New stay listing</p>
          </div>
        </Link>

        <Link to="/owner/rooms">
          <div className="bg-white hover:bg-colin-navy hover:text-white p-3.5 rounded-2xl border border-colin-charcoal-200/90 shadow-sm transition-all group cursor-pointer text-center space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-colin-navy-50 text-colin-navy group-hover:bg-white/20 group-hover:text-white flex items-center justify-center mx-auto transition-colors">
              <BedDouble size={18} className="text-colin-teal" />
            </div>
            <div className="text-xs font-black">Manage Rooms</div>
            <p className="text-[10px] text-colin-charcoal-500 group-hover:text-colin-charcoal-200">Bed occupancy</p>
          </div>
        </Link>

        <Link to="/owner/enquiries">
          <div className="bg-white hover:bg-colin-navy hover:text-white p-3.5 rounded-2xl border border-colin-charcoal-200/90 shadow-sm transition-all group cursor-pointer text-center space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-colin-navy-50 text-colin-navy group-hover:bg-white/20 group-hover:text-white flex items-center justify-center mx-auto transition-colors">
              <MessageSquareText size={18} className="text-colin-orange" />
            </div>
            <div className="text-xs font-black">View Enquiries</div>
            <p className="text-[10px] text-colin-charcoal-500 group-hover:text-colin-charcoal-200">{newEnquiriesCount} new messages</p>
          </div>
        </Link>

        <Link to="/owner/certification">
          <div className="bg-white hover:bg-colin-navy hover:text-white p-3.5 rounded-2xl border border-colin-charcoal-200/90 shadow-sm transition-all group cursor-pointer text-center space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-colin-navy-50 text-colin-navy group-hover:bg-white/20 group-hover:text-white flex items-center justify-center mx-auto transition-colors">
              <ShieldCheck size={18} className="text-colin-teal" />
            </div>
            <div className="text-xs font-black">COLIN Audit</div>
            <p className="text-[10px] text-colin-charcoal-500 group-hover:text-colin-charcoal-200">Physical inspection</p>
          </div>
        </Link>

        <Link to="/owner/monetisation" className="col-span-2 sm:col-span-1">
          <div className="bg-white hover:bg-colin-navy hover:text-white p-3.5 rounded-2xl border border-colin-charcoal-200/90 shadow-sm transition-all group cursor-pointer text-center space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-colin-navy-50 text-colin-navy group-hover:bg-white/20 group-hover:text-white flex items-center justify-center mx-auto transition-colors">
              <TrendingUp size={18} className="text-colin-orange" />
            </div>
            <div className="text-xs font-black">Promote Listing</div>
            <p className="text-[10px] text-colin-charcoal-500 group-hover:text-colin-charcoal-200">Homepage ads</p>
          </div>
        </Link>
      </div>

      {/* ================= DERIVED STATISTICS GRID ================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. Properties & Listings */}
        <div className="bg-white rounded-3xl p-5 border border-colin-charcoal-200/90 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-colin-charcoal-500">
            <span className="text-xs font-bold uppercase tracking-wider">Properties</span>
            <Building2 size={18} className="text-colin-navy" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-colin-navy font-display">
              {totalProperties}
            </span>
            <span className="text-xs text-colin-teal-700 font-bold">
              {activeListings} Active
            </span>
          </div>
          <div className="text-[11px] text-colin-charcoal-500 flex items-center gap-1">
            <span>{pendingListings} paused / draft</span>
          </div>
        </div>

        {/* 2. Room & Bed Occupancy */}
        <div className="bg-white rounded-3xl p-5 border border-colin-charcoal-200/90 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-colin-charcoal-500">
            <span className="text-xs font-bold uppercase tracking-wider">Bed Occupancy</span>
            <BedDouble size={18} className="text-colin-teal" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-colin-navy font-display">
              {occupancyPercentage}%
            </span>
            <span className="text-xs text-colin-teal font-bold">
              {availableBedsCount} available
            </span>
          </div>
          <div className="text-[11px] text-colin-charcoal-500">
            <span>{occupiedBedsCount} of {totalBedsCount} beds filled</span>
          </div>
        </div>

        {/* 3. Total Enquiries */}
        <div className="bg-white rounded-3xl p-5 border border-colin-charcoal-200/90 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-colin-charcoal-500">
            <span className="text-xs font-bold uppercase tracking-wider">Student Enquiries</span>
            <MessageSquareText size={18} className="text-colin-orange" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-colin-navy font-display">
              {totalEnquiriesCount}
            </span>
            {newEnquiriesCount > 0 && (
              <span className="text-[11px] font-extrabold bg-colin-orange text-white px-2 py-0.5 rounded-full">
                {newEnquiriesCount} New
              </span>
            )}
          </div>
          <div className="text-[11px] text-colin-charcoal-500">
            <span>Direct campus leads</span>
          </div>
        </div>

        {/* 4. Upcoming In-Person Visits */}
        <div className="bg-white rounded-3xl p-5 border border-colin-charcoal-200/90 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-colin-charcoal-500">
            <span className="text-xs font-bold uppercase tracking-wider">Visit Appointments</span>
            <CalendarCheck size={18} className="text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-colin-navy font-display">
              {upcomingVisitsCount}
            </span>
            <span className="text-xs text-emerald-600 font-bold">
              ₹150 Pass Paid
            </span>
          </div>
          <div className="text-[11px] text-colin-charcoal-500">
            <span>55% refund guarantee active</span>
          </div>
        </div>
      </div>

      {/* ================= MAIN 2-COLUMN SECTION ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Property-Wise Performance Table & Listing Overview */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-colin-charcoal-200/90 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-colin-navy font-display flex items-center gap-2">
                  <Building2 size={18} className="text-colin-navy" />
                  <span>Property Performance & Inventory</span>
                </h2>
                <p className="text-xs text-colin-charcoal-500">
                  Live occupancy, certification status, and listing health across your portfolio
                </p>
              </div>
              <Link to="/owner/properties">
                <Button variant="ghost" size="sm" className="text-xs font-bold text-colin-teal">
                  Manage All →
                </Button>
              </Link>
            </div>

            {/* Properties List */}
            <div className="divide-y divide-colin-charcoal-100">
              {ownerProperties.map((prop) => {
                const propRooms = rooms.filter((r) => r.propertyId === prop.id);
                const propBeds = propRooms.reduce((acc, r) => acc + (r.status === 'available' ? r.availableBeds : 0), 0);
                const propTotalBeds = propRooms.reduce((acc, r) => acc + r.totalBeds, 0);

                return (
                  <div key={prop.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={prop.featuredImage}
                        alt={prop.title}
                        className="w-14 h-14 rounded-2xl object-cover border border-colin-charcoal-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-colin-navy truncate">
                            {prop.title}
                          </h3>
                          {prop.isColinCertified && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-colin-teal/15 text-colin-teal-700 shrink-0">
                              Verified 99/100
                            </span>
                          )}
                          {prop.isSponsored && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-colin-orange/15 text-colin-orange shrink-0">
                              Sponsored
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-colin-charcoal-500 truncate">
                          {prop.neighborhood}, {prop.city} • ₹{prop.rentMonthly.toLocaleString('en-IN')}/mo
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-colin-charcoal-600 mt-1">
                          <span className="font-semibold text-colin-navy">
                            {propBeds} of {propTotalBeds} beds available
                          </span>
                          <span>•</span>
                          <span className={prop.listingStatus === 'active' || !prop.listingStatus ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                            {prop.listingStatus === 'active' || !prop.listingStatus ? '● Active Listing' : '○ Paused'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => toggleListingStatus(prop.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${
                          prop.listingStatus === 'paused'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-colin-charcoal-50 border-colin-charcoal-200 text-colin-charcoal-700 hover:bg-colin-charcoal-100'
                        }`}
                      >
                        {prop.listingStatus === 'paused' ? 'Publish' : 'Pause'}
                      </button>

                      <Link to="/owner/rooms">
                        <Button variant="outline" size="sm" className="text-xs font-bold px-3 py-1.5">
                          Rooms ({propRooms.length})
                        </Button>
                      </Link>

                      <Link to={`/student/property/${prop.id}`} target="_blank" rel="noopener noreferrer">
                        <button
                          className="p-1.5 text-colin-charcoal-400 hover:text-colin-navy rounded-lg"
                          title="Preview student view"
                        >
                          <ExternalLink size={16} />
                        </button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Occupancy & Rent Distribution Card */}
          <div className="bg-white rounded-3xl border border-colin-charcoal-200/90 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-colin-navy font-display flex items-center gap-2">
                <BedDouble size={18} className="text-colin-teal" />
                <span>Room Inventory Breakdown</span>
              </h2>
              <span className="text-xs font-bold text-colin-teal">
                {availableRoomsCount} Available / {occupiedRoomsCount} Occupied / {maintenanceRoomsCount} Maintenance
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="h-4 bg-colin-charcoal-100 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${occupancyPercentage}%` }}
                className="bg-colin-navy h-full transition-all duration-500"
                title={`Occupied: ${occupancyPercentage}%`}
              />
              <div
                style={{ width: `${100 - occupancyPercentage}%` }}
                className="bg-colin-teal h-full transition-all duration-500"
                title={`Available: ${100 - occupancyPercentage}%`}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-colin-charcoal-600 pt-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-colin-navy inline-block" />
                <span>Occupied Beds ({occupiedBedsCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-colin-teal inline-block" />
                <span>Available Beds ({availableBedsCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-400 inline-block" />
                <span>Maintenance Rooms ({maintenanceRoomsCount})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activities & Upcoming Visits Feed */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Upcoming Visit Passes Card */}
          <div className="bg-white rounded-3xl border border-colin-charcoal-200/90 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-colin-navy font-display flex items-center gap-2">
                <CalendarCheck size={18} className="text-emerald-600" />
                <span>Upcoming Visits</span>
              </h2>
              <Link to="/owner/visits" className="text-xs font-bold text-colin-teal hover:underline">
                View All
              </Link>
            </div>

            {upcomingVisits.length === 0 ? (
              <div className="text-center py-6 text-colin-charcoal-400 text-xs">
                No upcoming student visits scheduled.
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingVisits.slice(0, 3).map((visit) => (
                  <div key={visit.id} className="p-3 bg-colin-navy-50/60 rounded-2xl border border-colin-navy-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-colin-navy">
                        {visit.studentName}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        visit.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {visit.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-colin-charcoal-600">
                      {visit.propertyTitle}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-colin-charcoal-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {visit.date} ({visit.timeSlot})
                      </span>
                      <span className="font-bold text-colin-teal">
                        Fee Paid: ₹{visit.feePaid}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Enquiries Feed */}
          <div className="bg-white rounded-3xl border border-colin-charcoal-200/90 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-colin-navy font-display flex items-center gap-2">
                <MessageSquareText size={18} className="text-colin-orange" />
                <span>Student Enquiries</span>
              </h2>
              <Link to="/owner/enquiries" className="text-xs font-bold text-colin-teal hover:underline">
                Inbox ({enquiries.length})
              </Link>
            </div>

            <div className="space-y-3">
              {enquiries.slice(0, 3).map((enq) => (
                <div key={enq.id} className="p-3 rounded-2xl border border-colin-charcoal-200 hover:border-colin-navy-200 transition-colors space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-colin-navy">
                      {enq.studentName}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      enq.status === 'New' ? 'bg-colin-orange text-white' : 'bg-colin-charcoal-100 text-colin-charcoal-700'
                    }`}>
                      {enq.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-colin-charcoal-600 line-clamp-2">
                    "{enq.message}"
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-colin-charcoal-400 pt-1">
                    <span>{enq.studentUniversity || 'College Scholar'}</span>
                    <span>{enq.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activities Feed */}
          <div className="bg-white rounded-3xl border border-colin-charcoal-200/90 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-black text-colin-navy font-display">
              Recent Activity Feed
            </h2>
            <div className="space-y-2">
              {recentActivities.map((act) => (
                <div key={act.id} className="p-3 bg-colin-offwhite rounded-2xl border border-colin-charcoal-100 flex items-center justify-between text-xs gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-colin-navy truncate">{act.title}</div>
                    <div className="text-[11px] text-colin-charcoal-500 truncate">{act.subtitle}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${act.badgeClass}`}>
                    {act.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Physical Verification Status Card */}
          <div className="bg-gradient-to-br from-colin-teal-50 to-emerald-50 rounded-3xl border border-colin-teal/30 p-5 space-y-3">
            <div className="flex items-center gap-2 text-colin-teal-800">
              <ShieldCheck size={20} className="text-colin-teal" />
              <h3 className="text-xs font-black uppercase tracking-wider">
                COLIN Physical Audit Guarantee
              </h3>
            </div>
            <p className="text-xs text-colin-charcoal-600 leading-relaxed">
              Certified properties receive high trust ranking in campus search. In-person audits are conducted by verified student campus leaders.
            </p>
            <div className="pt-1 flex items-center justify-between">
              <span className="text-xs font-bold text-colin-teal-800">
                {certifiedPropertiesCount} of {totalProperties} Certified
              </span>
              <Link to="/owner/certification">
                <span className="text-xs font-extrabold text-colin-teal hover:underline flex items-center gap-1">
                  Audit Hub →
                </span>
              </Link>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
