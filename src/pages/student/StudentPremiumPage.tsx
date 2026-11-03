import React, { useState } from 'react';
import { STUDENT_PREMIUM_TIERS } from '../../data/mockData';
import { useStudent } from '../../context/StudentContext';
import {
  Crown,
  CheckCircle2,
  Zap,
  Info,
  X,
} from 'lucide-react';
import { Button } from '../../components/common/Button';

export const StudentPremiumPage: React.FC = () => {
  const { premiumSubscription, activatePremium, cancelPremium } = useStudent();
  const [selectedTier, setSelectedTier] = useState<'7-day' | '15-day' | '30-day'>('15-day');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card'>('upi');
  const [isActivating, setIsActivating] = useState(false);

  const currentTierData = STUDENT_PREMIUM_TIERS.find((t) => t.id === selectedTier) || STUDENT_PREMIUM_TIERS[1];

  const handleDemoActivate = async () => {
    setIsActivating(true);
    await new Promise((res) => setTimeout(res, 800));
    activatePremium(selectedTier);
    setIsActivating(false);
    setIsCheckoutOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* 1. Hero Banner */}
      <div className="relative bg-gradient-to-r from-colin-navy-950 via-colin-navy to-colin-teal-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl overflow-hidden border border-colin-navy-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-colin-orange/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-colin-teal/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-colin-orange/20 text-colin-orange border border-colin-orange/40 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            <Crown size={14} />
            <span>COLIN Student Premium Concierge</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight font-display text-white leading-tight">
            Find Your Campus Stay 3x Faster with a Dedicated Partner
          </h1>

          <p className="text-xs sm:text-sm text-colin-charcoal-200 leading-relaxed">
            Moving to an unfamiliar city is stressful. COLIN Premium pairs you with a verified campus ambassador who shortlists verified rooms, arranges direct landlord introductions, and protects you against hidden broker charges.
          </p>

          <div className="flex items-center gap-2 pt-2 text-xs text-amber-300 font-semibold">
            <Info size={14} className="shrink-0" />
            <span>All listed subscription prices are illustrative prototype estimates. Zero actual charges.</span>
          </div>
        </div>
      </div>

      {/* 2. Active Subscription Banner (if subscribed) */}
      {premiumSubscription?.active && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white rounded-3xl p-6 sm:p-7 border border-emerald-300 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Crown size={28} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Active Subscription
                </span>
                <span className="text-xs font-bold text-colin-navy">
                  Tier: {premiumSubscription.planName}
                </span>
              </div>
              <h3 className="text-lg font-black text-colin-navy font-display">
                You are a COLIN Premium Member
              </h3>
              <p className="text-xs text-colin-charcoal-600 leading-relaxed max-w-xl">
                Assigned Dedicated Partner: <strong>{premiumSubscription.dedicatedPartnerName}</strong> ({premiumSubscription.dedicatedPartnerPhone}). Access priority shortlists and landlord fast-track anytime.
              </p>
              <div className="text-[11px] text-emerald-800 font-semibold pt-1">
                Started: {premiumSubscription.startedAt} • Valid until: <strong>{premiumSubscription.expiresAt}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={cancelPremium}
              className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-4 py-2.5 rounded-xl border border-rose-200 transition-colors w-full md:w-auto"
            >
              Cancel Demo Subscription
            </button>
          </div>
        </div>
      )}

      {/* 3. Duration Cards Grid */}
      <div className="space-y-4">
        <div className="text-center max-w-xl mx-auto space-y-1.5">
          <h2 className="text-2xl font-black text-colin-navy tracking-tight font-display">
            Choose Your Placement Support Duration
          </h2>
          <p className="text-xs text-colin-charcoal-500">
            Select the duration matching your campus joining timeline. Prices are illustrative.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STUDENT_PREMIUM_TIERS.map((tier) => {
            const isSelected = selectedTier === tier.id;
            const isCurrent = premiumSubscription?.active && premiumSubscription.planId === tier.id;

            return (
              <div
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={`bg-white rounded-3xl p-6 sm:p-7 border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between relative shadow-brand hover:shadow-brand-hover ${
                  isSelected
                    ? 'border-colin-teal ring-4 ring-colin-teal/15 -translate-y-1'
                    : 'border-colin-charcoal-200/90 hover:border-colin-charcoal-300'
                }`}
              >
                {tier.tag && (
                  <div className="absolute -top-3 left-6">
                    <span className="bg-colin-navy text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                      {tier.tag}
                    </span>
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <div>
                    <span className="text-[11px] font-extrabold text-colin-teal uppercase tracking-wider">
                      {tier.durationLabel}
                    </span>
                    <h3 className="text-xl font-black text-colin-navy font-display mt-0.5">
                      {tier.name}
                    </h3>
                    <p className="text-xs text-colin-charcoal-500 mt-1 leading-snug">
                      {tier.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-colin-charcoal-100">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-colin-navy font-display">
                        ₹{tier.price}
                      </span>
                      <span className="text-xs text-colin-charcoal-400 font-semibold">
                        / illustrative fee
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      No recurring charges. One-time prototype pass.
                    </span>
                  </div>

                  {/* Benefits checklist */}
                  <div className="space-y-2.5 pt-3 border-t border-colin-charcoal-100 text-xs">
                    <span className="text-[10px] uppercase font-bold text-colin-charcoal-400 block">
                      Included Privileges:
                    </span>
                    {tier.benefits.map((b, i) => (
                      <div key={i} className="flex items-start gap-2 text-colin-charcoal-700">
                        <CheckCircle2 size={14} className="text-colin-teal shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-tight">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6">
                  {isCurrent ? (
                    <div className="w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-black text-center border border-emerald-300">
                      ✓ Active Tier
                    </div>
                  ) : (
                    <Button
                      variant={isSelected ? 'accent' : 'outline'}
                      size="sm"
                      className="w-full text-colin-navy-950 font-black justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTier(tier.id);
                        setIsCheckoutOpen(true);
                      }}
                    >
                      {isSelected ? 'Activate Demo Pass' : 'Select Plan'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Comparison Table: Free vs Premium */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200/90 shadow-sm space-y-5">
        <div className="space-y-1">
          <h3 className="text-lg font-black text-colin-navy font-display">
            Compare Free Scholar Access vs Premium Concierge
          </h3>
          <p className="text-xs text-colin-charcoal-500">
            Transparent breakdown of standard vs dedicated concierge benefits.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-colin-charcoal-200 bg-colin-offwhite">
                <th className="p-3.5 font-black uppercase text-colin-charcoal-500">Capability</th>
                <th className="p-3.5 font-black uppercase text-colin-charcoal-700">Free Scholar Account</th>
                <th className="p-3.5 font-black uppercase text-colin-teal bg-colin-teal/10">COLIN Premium Concierge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-colin-charcoal-100">
              <tr>
                <td className="p-3.5 font-bold text-colin-navy">Full Address & Host Contact Unlock</td>
                <td className="p-3.5 text-colin-charcoal-600">✓ Included for all logged-in members</td>
                <td className="p-3.5 font-bold text-colin-teal bg-colin-teal/5">✓ Included with direct owner queue-skip</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-colin-navy">Dedicated 1-on-1 Student Living Partner</td>
                <td className="p-3.5 text-colin-charcoal-400">✗ Self-service search</td>
                <td className="p-3.5 font-bold text-colin-teal bg-colin-teal/5">✓ Personal campus partner on WhatsApp & call</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-colin-navy">Fast-Track Shortlist Turnaround</td>
                <td className="p-3.5 text-colin-charcoal-400">✗ Manual browsing</td>
                <td className="p-3.5 font-bold text-colin-teal bg-colin-teal/5">✓ 5 curated matches within 4 hours</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-colin-navy">Guided Visit Slot Booking with 55% Refund</td>
                <td className="p-3.5 text-colin-charcoal-600">✓ ₹150.00 standard booking</td>
                <td className="p-3.5 font-bold text-colin-teal bg-colin-teal/5">✓ Priority slot scheduling + host coordination</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-colin-navy">Rental Agreement Verification</td>
                <td className="p-3.5 text-colin-charcoal-400">✗ Student self-check</td>
                <td className="p-3.5 font-bold text-colin-teal bg-colin-teal/5">✓ COLIN audit of lease & zero hidden charge clauses</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-colin-navy">COLIN Living & Moving Discount</td>
                <td className="p-3.5 text-colin-charcoal-400">Standard rates</td>
                <td className="p-3.5 font-bold text-colin-teal bg-colin-teal/5">✓ 15% discount on laundry, cleaning & luggage transfer</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Demo Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-colin-navy-950/75 backdrop-blur-sm animate-fadeIn" onClick={() => setIsCheckoutOpen(false)}>
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 border border-colin-charcoal-200 shadow-2xl space-y-5 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-colin-charcoal-100">
              <div className="flex items-center gap-2">
                <Crown size={20} className="text-colin-orange" />
                <h3 className="font-extrabold text-colin-navy text-lg">Demo Checkout</h3>
              </div>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                <X size={18} />
              </button>
            </div>

            {/* Plan Summary */}
            <div className="p-4 bg-colin-navy-50 rounded-2xl border border-colin-navy-100 space-y-1">
              <span className="text-[10px] uppercase font-bold text-colin-teal">Selected Pass</span>
              <div className="flex justify-between items-baseline">
                <h4 className="font-extrabold text-colin-navy text-base">{currentTierData.name}</h4>
                <span className="text-xl font-black text-colin-navy">₹{currentTierData.price}</span>
              </div>
              <p className="text-[11px] text-colin-charcoal-500">{currentTierData.durationLabel} • One-time illustrative prototype checkout</p>
            </div>

            {/* Simulated Payment Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">Simulated Payment Mode:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-3 rounded-2xl text-xs font-bold border transition-all text-center ${
                    paymentMethod === 'upi'
                      ? 'bg-colin-navy text-white border-colin-navy shadow-sm'
                      : 'bg-colin-offwhite text-colin-charcoal-600 border-colin-charcoal-200'
                  }`}
                >
                  📱 UPI / GPay / PhonePe
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-2xl text-xs font-bold border transition-all text-center ${
                    paymentMethod === 'card'
                      ? 'bg-colin-navy text-white border-colin-navy shadow-sm'
                      : 'bg-colin-offwhite text-colin-charcoal-600 border-colin-charcoal-200'
                  }`}
                >
                  💳 Debit / Credit Card
                </button>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <Info size={14} className="text-amber-700" />
                <span>Zero Real Payment Notice</span>
              </span>
              <p className="text-[11px] text-amber-800 leading-snug">
                Clicking confirm activates the premium student status instantly in local session storage without contacting any payment gateway.
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="accent"
                className="w-full text-colin-navy-950 font-black justify-center"
                isLoading={isActivating}
                onClick={handleDemoActivate}
                rightIcon={<Zap size={16} />}
              >
                Confirm Demo Pass Activation (₹{currentTierData.price})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
