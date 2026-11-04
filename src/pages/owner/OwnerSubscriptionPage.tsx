import React, { useState } from 'react';
import { useProperties } from '../../context/PropertyContext';
import { OwnerSubscriptionTier } from '../../types';
import {
  Crown,
  CheckCircle2,
  XCircle,
  Download,
  FileText,
  CreditCard,
  X,
} from 'lucide-react';
import { Button } from '../../components/common/Button';

export const OwnerSubscriptionPage: React.FC = () => {
  const { subscription, upgradeSubscription, ownerProperties } = useProperties();

  // Modal State for Upgrading
  const [targetTier, setTargetTier] = useState<OwnerSubscriptionTier | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [checkoutProcessing, setCheckoutProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const planTiers: Array<{
    id: OwnerSubscriptionTier;
    name: string;
    monthlyPrice: number;
    annualPrice: number;
    propertyLimit: string;
    tagline: string;
    badge?: string;
    badgeClass?: string;
    features: string[];
    excluded: string[];
  }> = [
    {
      id: 'FREE',
      name: 'Starter Host',
      monthlyPrice: 0,
      annualPrice: 0,
      propertyLimit: '1 Property',
      tagline: 'Ideal for independent homeowners renting a single flat or room.',
      features: [
        'List 1 property on COLIN',
        'Standard organic search placement',
        'Direct student enquiry inbox',
        'In-person visit appointment scheduling',
        'Basic community support',
      ],
      excluded: [
        'COLIN Certified badge physical audit eligibility',
        'Multi-property chain management',
        'Priority search ranking boost',
        'Interactive 360° virtual tour capture',
        'Automated WhatsApp lead notifications',
      ],
    },
    {
      id: 'PRO',
      name: 'Pro Host',
      monthlyPrice: 1999,
      annualPrice: 19990,
      propertyLimit: 'Up to 5 Properties',
      tagline: 'For active hostel owners and PG operators filling full buildings.',
      badge: 'Most Popular',
      badgeClass: 'bg-colin-teal text-white',
      features: [
        'List up to 5 properties simultaneously',
        'COLIN Certified badge eligibility (1 free audit included)',
        'Priority search result ranking across campus zones',
        'Instant WhatsApp & SMS student lead alerts',
        'Room & bed-level inventory tracker with live occupancy',
        'Access to full student visit pipeline & fee guarantees',
        'Standard email & phone partner support',
      ],
      excluded: [
        'Unlimited properties',
        'Top 3 guaranteed Homepage Spotlight showcase',
        'Dedicated COLIN Account Director',
      ],
    },
    {
      id: 'PREMIUM',
      name: 'Premium Enterprise',
      monthlyPrice: 4999,
      annualPrice: 49990,
      propertyLimit: 'Unlimited Properties',
      tagline: 'For established PG chains, student living brands & co-living groups.',
      badge: 'Enterprise Growth',
      badgeClass: 'bg-colin-orange text-colin-navy-950 font-black',
      features: [
        'Unlimited property listings across all campus cities',
        'Guaranteed Top 3 Homepage & Search Spotlight rotation',
        'Dedicated COLIN Account Manager & campus admissions rep',
        'Free professional 360° virtual tour for all buildings',
        'Automated move-in deposit processing & tenant verification',
        'Multi-property occupancy analytics & revenue reporting',
        '24/7 VIP priority partner line',
      ],
      excluded: [],
    },
  ];

  // Open Checkout Modal
  const handleOpenUpgrade = (tier: OwnerSubscriptionTier) => {
    setTargetTier(tier);
    setCheckoutProcessing(false);
    setCheckoutSuccess(false);
  };

  // Process Simulated Checkout
  const handleConfirmCheckout = () => {
    if (!targetTier) return;
    setCheckoutProcessing(true);

    setTimeout(() => {
      upgradeSubscription(targetTier, billingCycle);
      setCheckoutProcessing(false);
      setCheckoutSuccess(true);
      setTimeout(() => {
        setCheckoutSuccess(false);
        setTargetTier(null);
      }, 1500);
    }, 1200);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-colin-navy font-display flex items-center gap-2">
            <Crown size={28} className="text-colin-orange" />
            <span>Owner Subscription & Plans</span>
          </h1>
          <p className="text-xs text-colin-charcoal-500 mt-1">
            Choose a partner tier tailored to your student housing capacity. Upgrade anytime with simulated instant activation.
          </p>
        </div>

        {/* Current Plan Badge */}
        <div className="bg-colin-navy text-white px-4 py-2 rounded-2xl flex items-center gap-2 self-start sm:self-auto shadow-sm">
          <Crown size={16} className="text-colin-orange" />
          <span className="text-xs font-black uppercase">
            Active: {subscription.tier} Host
          </span>
        </div>
      </div>

      {/* Current Active Plan Status HUD */}
      <div className="bg-white rounded-3xl p-6 border border-colin-charcoal-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-colin-teal uppercase tracking-wider block">
            Current Membership Overview
          </span>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-colin-navy font-display">
              COLIN {subscription.tier} Host Plan
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Active Status
            </span>
          </div>
          <p className="text-xs text-colin-charcoal-500">
            Current property usage: <strong>{ownerProperties.length}</strong> of{' '}
            <strong>{subscription.propertyLimit === 999 ? 'Unlimited' : subscription.propertyLimit}</strong> property slots utilized.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-colin-charcoal-400 uppercase font-semibold block">Billing Cycle</span>
            <span className="text-xs font-bold text-colin-navy capitalize">{subscription.billingCycle}</span>
          </div>

          <div className="text-right border-l border-colin-charcoal-200 pl-3">
            <span className="text-[10px] text-colin-charcoal-400 uppercase font-semibold block">Expires On</span>
            <span className="text-xs font-bold text-colin-navy">
              {new Date(subscription.expiresAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center">
        <div className="bg-colin-charcoal-100 p-1 rounded-2xl flex items-center gap-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
              billingCycle === 'monthly'
                ? 'bg-white text-colin-navy shadow-sm'
                : 'text-colin-charcoal-600 hover:text-colin-navy'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              billingCycle === 'annual'
                ? 'bg-white text-colin-navy shadow-sm'
                : 'text-colin-charcoal-600 hover:text-colin-navy'
            }`}
          >
            <span>Annual Billing</span>
            <span className="text-[10px] font-extrabold bg-colin-orange text-colin-navy-950 px-1.5 py-0.2 rounded-md">
              Save ~17%
            </span>
          </button>
        </div>
      </div>

      {/* 3 Subscription Tiers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planTiers.map((tier) => {
          const isCurrent = subscription.tier === tier.id;
          const displayPrice = billingCycle === 'monthly' ? tier.monthlyPrice : tier.annualPrice;

          return (
            <div
              key={tier.id}
              className={`bg-white rounded-3xl p-6 sm:p-8 border transition-all flex flex-col justify-between relative shadow-sm ${
                isCurrent
                  ? 'border-2 border-colin-navy shadow-md ring-4 ring-colin-navy/5'
                  : 'border-colin-charcoal-200 hover:border-colin-charcoal-300'
              }`}
            >
              {tier.badge && (
                <div className={`absolute -top-3 left-6 text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider ${tier.badgeClass}`}>
                  {tier.badge}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-black text-colin-navy font-display">
                    {tier.name}
                  </h3>
                  <p className="text-xs text-colin-charcoal-500 mt-1 leading-relaxed">
                    {tier.tagline}
                  </p>
                </div>

                {/* Price Display */}
                <div className="pt-2 border-t border-colin-charcoal-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-colin-navy font-display">
                      ₹{displayPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-colin-charcoal-500 font-semibold">
                      / {billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-colin-teal block mt-0.5">
                    {tier.propertyLimit} Included
                  </span>
                </div>

                {/* Features Checklist */}
                <div className="pt-2 space-y-2.5">
                  <span className="text-[10px] font-bold text-colin-charcoal-400 uppercase tracking-wider block">
                    Features Included:
                  </span>
                  <ul className="space-y-2 text-xs">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-colin-charcoal-700">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                    {tier.excluded.map((e) => (
                      <li key={e} className="flex items-start gap-2 text-colin-charcoal-400 line-through">
                        <XCircle size={14} className="text-colin-charcoal-300 shrink-0 mt-0.5" />
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6">
                {isCurrent ? (
                  <Button
                    variant="outline"
                    size="md"
                    disabled
                    className="w-full justify-center text-xs font-bold opacity-60 border-colin-navy"
                  >
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleOpenUpgrade(tier.id)}
                    className="w-full justify-center text-xs font-bold bg-colin-navy hover:bg-colin-navy-800"
                  >
                    {tier.id === 'FREE' ? 'Downgrade to Free' : `Switch to ${tier.name}`}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Subscription Invoices & Billing History */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-colin-navy font-display">
              Payment Receipts & Invoices
            </h3>
            <p className="text-xs text-colin-charcoal-500">
              Generated demonstration receipts for tax and accounting records.
            </p>
          </div>
          <FileText size={20} className="text-colin-charcoal-400" />
        </div>

        <div className="divide-y divide-colin-charcoal-100">
          {subscription.paymentHistory.map((invoice) => (
            <div key={invoice.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-colin-navy">{invoice.plan}</div>
                <div className="text-[11px] text-colin-charcoal-500">
                  {invoice.invoiceNumber} • Date: {invoice.date}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-extrabold text-colin-navy">
                  ₹{invoice.amount.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {invoice.status}
                </span>
                <button
                  onClick={() => alert(`Simulated Invoice: ${invoice.invoiceNumber}\nAmount: ₹${invoice.amount}\nStatus: Paid\nGSTIN: 07AAACS1429B1Z8`)}
                  className="p-1.5 text-colin-teal hover:text-colin-navy rounded-lg"
                  title="View Receipt"
                >
                  <Download size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= SIMULATED CHECKOUT MODAL ================= */}
      {targetTier && (
        <div className="fixed inset-0 z-50 bg-colin-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-colin-charcoal-200 shadow-2xl space-y-5 animate-scaleUp">
            
            <div className="flex items-center justify-between pb-3 border-b border-colin-charcoal-100">
              <div className="flex items-center gap-2">
                <CreditCard size={20} className="text-colin-orange" />
                <h3 className="text-base font-black text-colin-navy">
                  Demonstration Plan Checkout
                </h3>
              </div>
              <button onClick={() => setTargetTier(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-colin-charcoal-400">Selected Tier:</span>
                <p className="text-lg font-black text-colin-navy font-display">
                  COLIN {targetTier} Host Plan ({billingCycle})
                </p>
              </div>

              <div className="p-3 bg-colin-navy-50 rounded-2xl border border-colin-navy-100 space-y-1 text-xs">
                <div className="flex items-center justify-between font-bold text-colin-navy">
                  <span>Demonstration Charge:</span>
                  <span>
                    ₹{targetTier === 'FREE' ? 0 : billingCycle === 'monthly' ? (targetTier === 'PRO' ? 1999 : 4999) : (targetTier === 'PRO' ? 19990 : 49990)}
                  </span>
                </div>
                <p className="text-[11px] text-colin-charcoal-500">
                  Simulated subscription checkout. No live card charges will occur. Updates your property limit instantly.
                </p>
              </div>
            </div>

            {checkoutSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-center space-y-1">
                <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
                <div className="text-xs font-extrabold">Plan Successfully Activated!</div>
                <p className="text-[11px]">Your host limits and features are now updated.</p>
              </div>
            ) : (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setTargetTier(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={checkoutProcessing}
                  onClick={handleConfirmCheckout}
                  className="bg-colin-navy hover:bg-colin-navy-800"
                >
                  {checkoutProcessing ? 'Activating...' : 'Confirm Upgrade'}
                </Button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
