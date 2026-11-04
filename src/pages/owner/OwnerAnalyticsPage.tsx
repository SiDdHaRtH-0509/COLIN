import React, { useMemo } from 'react';
import { useProperties } from '../../context/PropertyContext';
import {
  BarChart3,
  Users,
  Eye,
  CalendarCheck,
  DollarSign,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const OwnerAnalyticsPage: React.FC = () => {
  const { ownerProperties, rooms, enquiries, visits, sponsorships } = useProperties();

  // Metrics (Strictly scoped to owner's properties)
  const ownerPropertyIds = useMemo(() => new Set(ownerProperties.map((p) => p.id)), [ownerProperties]);
  const ownerRooms = useMemo(() => rooms.filter((r) => ownerPropertyIds.has(r.propertyId)), [rooms, ownerPropertyIds]);

  const totalBeds = ownerRooms.reduce((acc, r) => acc + r.totalBeds, 0);
  const availableBeds = ownerRooms.reduce((acc, r) => acc + (r.status === 'available' ? r.availableBeds : 0), 0);
  const occupiedBeds = Math.max(0, totalBeds - availableBeds);
  const occupancyPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  // Visit conversion stats
  const convertedEnquiries = enquiries.filter((e) => e.status === 'Converted').length;
  const conversionRate = visits.length > 0 ? Math.round((convertedEnquiries / visits.length) * 100) : 0;

  // Estimated Gross Monthly Rental Flow (Simulated / Demonstration data based on listed rents)
  const estimatedGrossRent = useMemo(() => {
    return ownerProperties.reduce((acc, p) => {
      const propRooms = rooms.filter((r) => r.propertyId === p.id);
      if (propRooms.length > 0) {
        return acc + propRooms.reduce((rAcc, r) => rAcc + (r.monthlyRent * (r.totalBeds - r.availableBeds)), 0);
      }
      return acc + (p.rentMonthly * 2);
    }, 0);
  }, [ownerProperties, rooms]);

  // Monthly Enquiry Trends (Mocked representative data points for 6 months)
  const monthlyTrends = [
    { month: 'Jun', count: 12, height: '35%' },
    { month: 'Jul', count: 34, height: '70%' },
    { month: 'Aug', count: 48, height: '95%' },
    { month: 'Sep', count: 28, height: '60%' },
    { month: 'Oct', count: 22, height: '48%' },
    { month: 'Nov', count: enquiries.length + 8, height: '55%' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-colin-navy font-display flex items-center gap-2">
            <BarChart3 size={28} className="text-colin-navy" />
            <span>Portfolio Analytics & Revenue Modeling</span>
          </h1>
          <p className="text-xs text-colin-charcoal-500 mt-1">
            Performance metrics derived from student discovery interactions, visit conversions, and bed occupancy.
          </p>
        </div>

        <div className="bg-colin-navy-50 text-colin-navy text-xs font-bold px-3 py-1.5 rounded-xl border border-colin-navy-100 flex items-center gap-2 self-start sm:self-auto">
          <ShieldCheck size={14} className="text-colin-teal" />
          <span>Real-time Marketplace Sync</span>
        </div>
      </div>

      {/* Primary KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-colin-charcoal-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-colin-charcoal-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Gross Occupancy</span>
            <Users size={16} className="text-colin-teal" />
          </div>
          <div className="text-3xl font-black text-colin-navy font-display">
            {occupancyPercent}%
          </div>
          <p className="text-[11px] text-colin-charcoal-500">
            {occupiedBeds} occupied / {availableBeds} beds open
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-colin-charcoal-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-colin-charcoal-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Student Inquiries</span>
            <Eye size={16} className="text-colin-orange" />
          </div>
          <div className="text-3xl font-black text-colin-navy font-display">
            {enquiries.length}
          </div>
          <p className="text-[11px] text-colin-teal font-semibold">
            {enquiries.filter((e) => e.status === 'New').length} new this week
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-colin-charcoal-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-colin-charcoal-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Visit Conversion</span>
            <CalendarCheck size={16} className="text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-colin-navy font-display">
            {conversionRate}%
          </div>
          <p className="text-[11px] text-colin-charcoal-500">
            {convertedEnquiries} converted leads
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-colin-charcoal-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-colin-charcoal-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Estimated Monthly Flow</span>
            <DollarSign size={16} className="text-colin-navy" />
          </div>
          <div className="text-3xl font-black text-colin-navy font-display">
            ₹{estimatedGrossRent.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-colin-charcoal-400 italic">
            *Demonstration estimate based on filled beds
          </p>
        </div>
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Monthly Trends SVG Chart */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200/90 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-colin-navy font-display">
                Student Enquiry & Lead Volume Trends
              </h2>
              <p className="text-xs text-colin-charcoal-500">
                Monthly student discovery inquiries peaking during university admission cycles
              </p>
            </div>
            <span className="text-xs font-bold text-colin-teal bg-colin-teal/10 px-2.5 py-1 rounded-full">
              Admission Surge: Jul–Aug
            </span>
          </div>

          {/* SVG Bar Chart Visualization */}
          <div className="h-64 flex items-end justify-between gap-4 pt-8 px-4 border-b border-colin-charcoal-100">
            {monthlyTrends.map((point) => (
              <div key={point.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] font-bold text-colin-charcoal-500 group-hover:text-colin-navy transition-colors">
                  {point.count}
                </div>
                <div
                  style={{ height: point.height }}
                  className="w-full max-w-[42px] bg-gradient-to-t from-colin-navy to-colin-teal rounded-t-xl group-hover:from-colin-teal group-hover:to-colin-orange transition-all duration-300"
                />
                <div className="text-xs font-bold text-colin-charcoal-600 mt-1">
                  {point.month}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-colin-charcoal-500 pt-1">
            <span>Aggregated across all active accommodations</span>
            <span>Current Month: November 2026</span>
          </div>
        </div>

        {/* Right Column: Configurable Commission & Marketplace Business Model */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Configurable Business Model Notice */}
          <div className="bg-gradient-to-br from-colin-navy-950 via-colin-navy to-colin-navy-900 rounded-3xl p-6 text-white space-y-4 shadow-xl border border-white/10">
            <div className="flex items-center gap-2 text-colin-orange">
              <Zap size={20} />
              <h3 className="text-xs font-black uppercase tracking-wider">
                Configurable Commission Model
              </h3>
            </div>

            <p className="text-xs text-colin-charcoal-200 leading-relaxed">
              COLIN operates with <strong>zero forced brokerage</strong> for students. For property owners, marketplace commercial models are configurable based on property volume:
            </p>

            <div className="space-y-2.5 pt-1 text-xs">
              <div className="p-3 bg-white/10 rounded-2xl border border-white/10 space-y-1">
                <span className="font-extrabold text-colin-orange block">
                  Model A: 7–9% Monthly Rental Success Fee
                </span>
                <p className="text-[11px] text-colin-charcoal-300">
                  Applied strictly upon verified student check-in. No upfront listing risk.
                </p>
              </div>

              <div className="p-3 bg-white/10 rounded-2xl border border-white/10 space-y-1">
                <span className="font-extrabold text-colin-teal-300 block">
                  Model B: One-Time Move-In Transaction Fee
                </span>
                <p className="text-[11px] text-colin-charcoal-300">
                  Flat ₹1,500 - ₹2,500 onboarding fee per bed filled with 12-month tenure guarantee.
                </p>
              </div>
            </div>

            <p className="text-[10px] text-colin-charcoal-400 italic">
              *All figures shown are for institutional evaluation and demonstration modeling.
            </p>
          </div>

          {/* Promotional Ads ROI Card */}
          <div className="bg-white rounded-3xl p-6 border border-colin-charcoal-200/90 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-colin-navy uppercase tracking-wider">
              Promotional Campaign ROI
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-colin-charcoal-500">Active Campaigns:</span>
                <strong className="text-colin-navy">{sponsorships.length} Active</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-colin-charcoal-500">Total Sponsored Views:</span>
                <strong className="text-colin-teal">
                  {sponsorships.reduce((acc, s) => acc + s.impressions, 0).toLocaleString('en-IN')}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-colin-charcoal-500">Direct Ad Inquiries:</span>
                <strong className="text-colin-orange">
                  {sponsorships.reduce((acc, s) => acc + s.leadsGenerated, 0)} Verified Students
                </strong>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
