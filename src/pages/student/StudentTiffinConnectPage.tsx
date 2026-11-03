import React, { useState } from 'react';
import { TIFFIN_MEAL_PLANS } from '../../data/mockData';
import { useStudent } from '../../context/StudentContext';
import {
  UtensilsCrossed,
  Clock,
  ShieldCheck,
  Info,
  X,
  Leaf,
} from 'lucide-react';
import { Button } from '../../components/common/Button';

export const StudentTiffinConnectPage: React.FC = () => {
  const { tiffinSubscription, activateTiffin, cancelTiffin } = useStudent();

  const [selectedPlanId, setSelectedPlanId] = useState<string>('tiffin-full');
  const [dietary, setDietary] = useState<'pure-veg' | 'non-veg' | 'jain' | 'eggetarian'>('pure-veg');
  const [deliverySlot, setDeliverySlot] = useState<string>('Campus Gate 2 (Lunch) & Room Door (Dinner)');
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const currentPlan = TIFFIN_MEAL_PLANS.find((p) => p.id === selectedPlanId) || TIFFIN_MEAL_PLANS[0];

  const handleActivatePlan = async () => {
    setIsActivating(true);
    await new Promise((res) => setTimeout(res, 800));
    activateTiffin(selectedPlanId, dietary, deliverySlot);
    setIsActivating(false);
    setCheckoutModalOpen(false);
  };

  const sampleWeeklyMenu = [
    { day: 'Monday', lunch: 'Rajma Masala, Aloo Shimla Mirch, Steamed Rice, 4 Phulkas', dinner: 'Matar Paneer / Egg Curry, Dal Tadka, Jeera Rice, 4 Phulkas' },
    { day: 'Tuesday', lunch: 'Kadhi Pakora, Dry Bhindi Fry, Steamed Basmati Rice, 3 Phulkas', dinner: 'Shahi Paneer / Chicken Masala, Chana Dal, 4 Phulkas, Kheer' },
    { day: 'Wednesday', lunch: 'Chole Bhature / Chole Rice, Boondi Raita, Salad, Pickle', dinner: 'Mix Veg Korma, Dal Makhani, 4 Phulkas, Pulao' },
    { day: 'Thursday', lunch: 'Dal Fry, Baingan Bharta, Steamed Rice, 4 Phulkas, Curd', dinner: 'Paneer Butter Masala, Masoor Dal, 4 Phulkas, Steamed Rice' },
    { day: 'Friday', lunch: 'Aloo Gobi Adraki, Moong Dal, Steamed Rice, 4 Phulkas', dinner: 'Hyderabadi Veg / Chicken Dum Biryani, Mirchi Ka Salan, Raita' },
    { day: 'Saturday', lunch: 'Dal Panchmel, Dum Aloo, 4 Phulkas, Jeera Rice', dinner: 'Malai Kofta, Yellow Dal, 4 Phulkas, Gulab Jamun' },
    { day: 'Sunday', lunch: 'Special Sunday Thali: Paneer Lababdar, Dal Makhani, Pulao, 4 Naan/Phulkas', dinner: 'Light Khichdi / Pulao with Kadhi & Papad' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* 1. Hero Banner */}
      <div className="relative bg-gradient-to-r from-colin-navy-950 via-colin-navy to-emerald-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl overflow-hidden border border-colin-navy-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-colin-orange/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            <UtensilsCrossed size={14} className="text-colin-orange" />
            <span>TiffinConnect Meal Subscriptions</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-display text-white">
            Wholesome Home-Style Food Delivered Daily Near Campus
          </h1>

          <p className="text-xs sm:text-sm text-colin-charcoal-200 leading-relaxed">
            Never compromise on nutrition during exam season. TiffinConnect partners with verified, hygiene-audited local cloud kitchens to deliver hot, balanced meals directly to your accommodation or college gate.
          </p>

          <div className="flex items-center gap-2 pt-2 text-xs text-emerald-200 font-semibold">
            <Info size={14} className="shrink-0" />
            <span>Simulated food subscription for demonstration. Zero actual payments or real ordering.</span>
          </div>
        </div>
      </div>

      {/* 2. Active Subscription Banner (if subscribed) */}
      {tiffinSubscription?.active && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white rounded-3xl p-6 sm:p-7 border border-emerald-300 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <UtensilsCrossed size={28} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Active Meal Subscription
                </span>
                <span className="text-xs font-bold text-colin-navy capitalize">
                  Dietary: {tiffinSubscription.dietaryPreference.replace('-', ' ')}
                </span>
              </div>
              <h3 className="text-lg font-black text-colin-navy font-display">
                {tiffinSubscription.planName}
              </h3>
              <p className="text-xs text-colin-charcoal-600 max-w-xl">
                Partner Kitchen: <strong>{tiffinSubscription.partnerName}</strong>. Delivery slot: {tiffinSubscription.deliverySlot}.
              </p>
              <div className="text-[11px] text-emerald-800 font-semibold pt-1">
                Fee: ₹{tiffinSubscription.priceMonthly}/month (Simulated) • Started on {tiffinSubscription.startedAt}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={cancelTiffin}
              className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-4 py-2.5 rounded-xl border border-rose-200 transition-colors w-full md:w-auto"
            >
              Cancel Demo Meal Plan
            </button>
          </div>
        </div>
      )}

      {/* 3. Meal Plans Grid */}
      <div className="space-y-4">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 className="text-2xl font-black text-colin-navy tracking-tight font-display">
            Select Your Monthly Meal Plan
          </h2>
          <p className="text-xs text-colin-charcoal-500">
            Flexible monthly plans with pause/resume support during semester breaks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIFFIN_MEAL_PLANS.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const isCurrent = tiffinSubscription?.active && tiffinSubscription.planId === plan.id;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`bg-white rounded-3xl p-6 sm:p-7 border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between relative shadow-brand hover:shadow-brand-hover ${
                  isSelected
                    ? 'border-emerald-500 ring-4 ring-emerald-500/15 -translate-y-1'
                    : 'border-colin-charcoal-200/90 hover:border-colin-charcoal-300'
                }`}
              >
                {plan.tag && (
                  <div className="absolute -top-3 left-6">
                    <span className="bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                      {plan.tag}
                    </span>
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <div>
                    <span className="text-[11px] font-extrabold text-colin-teal uppercase tracking-wider">
                      {plan.subtitle}
                    </span>
                    <h3 className="text-xl font-black text-colin-navy font-display mt-0.5">
                      {plan.title}
                    </h3>
                    <p className="text-xs text-colin-charcoal-600 mt-1 leading-snug">
                      {plan.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-colin-charcoal-100">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-colin-navy font-display">
                        ₹{plan.priceMonthly.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-colin-charcoal-400 font-semibold">
                        / month (indicative)
                      </span>
                    </div>
                  </div>

                  {/* Meals Schedule */}
                  <div className="space-y-2 pt-3 border-t border-colin-charcoal-100 text-xs">
                    <span className="text-[10px] uppercase font-bold text-colin-charcoal-400 block">
                      Daily Schedule:
                    </span>
                    {plan.mealsIncluded.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-colin-charcoal-700 font-medium">
                        <Clock size={12} className="text-colin-teal shrink-0" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>

                  {/* Kitchen partner info */}
                  <div className="p-3 bg-colin-offwhite rounded-2xl border border-colin-charcoal-200 text-xs space-y-1">
                    <span className="text-[10px] text-colin-charcoal-400 uppercase font-bold block">Audited Kitchen</span>
                    <p className="font-bold text-colin-navy">{plan.partnerName}</p>
                    <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-bold">
                      <ShieldCheck size={13} className="text-emerald-600" />
                      <span>Hygiene Rating: {plan.hygieneRating}/5</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  {isCurrent ? (
                    <div className="w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-black text-center border border-emerald-300">
                      ✓ Active Meal Plan
                    </div>
                  ) : (
                    <Button
                      variant={isSelected ? 'accent' : 'outline'}
                      size="sm"
                      className="w-full text-colin-navy-950 font-black justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlanId(plan.id);
                        setCheckoutModalOpen(true);
                      }}
                    >
                      {isSelected ? 'Activate Demo Meal Pass' : 'Select Plan'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Sample Weekly Rotational Menu */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200/90 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black text-colin-navy font-display">
              Sample Weekly Rotational Menu
            </h3>
            <p className="text-xs text-colin-charcoal-500">
              Low-oil, digestible, authentic North & South Indian dishes prepared fresh 30 minutes before delivery.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-colin-teal bg-colin-teal/10 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Leaf size={12} /> Pure Veg & Non-Veg Available
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-colin-charcoal-200 bg-colin-offwhite">
                <th className="p-3.5 font-black uppercase text-colin-charcoal-500 w-28">Day</th>
                <th className="p-3.5 font-black uppercase text-colin-navy">Campus Lunch (12:30 PM)</th>
                <th className="p-3.5 font-black uppercase text-colin-navy">Evening Dinner (8:15 PM)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-colin-charcoal-100">
              {sampleWeeklyMenu.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="p-3.5 font-extrabold text-colin-navy">{item.day}</td>
                  <td className="p-3.5 text-colin-charcoal-700">{item.lunch}</td>
                  <td className="p-3.5 text-colin-charcoal-700">{item.dinner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Demo Activation Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-colin-navy-950/75 backdrop-blur-sm animate-fadeIn" onClick={() => setCheckoutModalOpen(false)}>
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 border border-colin-charcoal-200 shadow-2xl space-y-5 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-colin-charcoal-100">
              <div className="flex items-center gap-2">
                <UtensilsCrossed size={20} className="text-emerald-600" />
                <h3 className="font-extrabold text-colin-navy text-lg">Select Meal Pass (Demo)</h3>
              </div>
              <button onClick={() => setCheckoutModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-800">Plan Summary</span>
              <div className="flex justify-between items-baseline">
                <h4 className="font-extrabold text-colin-navy text-base">{currentPlan.title}</h4>
                <span className="text-xl font-black text-colin-navy">₹{currentPlan.priceMonthly}/mo</span>
              </div>
              <p className="text-[11px] text-colin-charcoal-600">{currentPlan.subtitle}</p>
            </div>

            {/* Dietary Preference */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">Dietary Preference:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'pure-veg', label: '🥗 Pure Vegetarian' },
                  { id: 'non-veg', label: '🍗 Non-Vegetarian' },
                  { id: 'eggetarian', label: '🥚 Eggetarian' },
                  { id: 'jain', label: '🌱 Jain / Sattvic' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDietary(d.id as any)}
                    className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-center ${
                      dietary === d.id
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-colin-offwhite text-colin-charcoal-700 border-colin-charcoal-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Location Slot */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">Delivery Location Slot:</label>
              <input
                type="text"
                value={deliverySlot}
                onChange={(e) => setDeliverySlot(e.target.value)}
                className="w-full text-xs font-medium p-2.5 rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-teal focus:outline-none"
                placeholder="e.g. Room 204 or Campus Main Gate"
              />
            </div>

            <div className="pt-2">
              <Button
                variant="accent"
                className="w-full text-colin-navy-950 font-black justify-center"
                isLoading={isActivating}
                onClick={handleActivatePlan}
              >
                Confirm Demo Meal Subscription (₹{currentPlan.priceMonthly}/mo)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
