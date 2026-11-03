import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudent } from '../../context/StudentContext';
import { PROPERTIES } from '../../data/mockData';
import { useProperties } from '../../context/PropertyContext';
import { Property } from '../../types';
import {
  Scale,
  Trash2,
  Plus,
  Check,
  X,
  GraduationCap,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { ColinCertifiedBadge } from '../../components/common/ColinCertifiedBadge';
import { VisitSlotModal } from '../../components/property/VisitSlotModal';

export const StudentComparePage: React.FC = () => {
  const {
    comparisonList,
    comparedProperties,
    removeFromComparison,
    addToComparison,
    clearComparison,
  } = useStudent();

  const [selectedPropertyForBooking, setSelectedPropertyForBooking] = useState<Property | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  let propertiesSource = PROPERTIES;
  try {
    const propCtx = useProperties();
    if (propCtx?.properties) propertiesSource = propCtx.properties;
  } catch {}

  // Available properties to add (not already in comparison)
  const availableToAdd = propertiesSource
    .filter((p) => !p.listingStatus || p.listingStatus === 'active')
    .filter((p) => !comparisonList.includes(p.id));

  // Determine winners/highlights across compared properties
  const lowestRent = comparedProperties.length > 0
    ? Math.min(...comparedProperties.map((p) => p.rentMonthly))
    : null;

  // Extract meters for proximity comparison
  const extractMeters = (distStr: string) => {
    if (distStr.includes('km')) return parseFloat(distStr) * 1000;
    const match = distStr.match(/(\d+)\s*m/);
    return match ? parseInt(match[1]) : 1500;
  };

  const closestDistance = comparedProperties.length > 0
    ? Math.min(...comparedProperties.map((p) => extractMeters(p.distanceToUniversity)))
    : null;

  const highestScore = comparedProperties.length > 0
    ? Math.max(...comparedProperties.map((p) => p.certificationScore || 90))
    : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-colin-charcoal-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Decision Workspace
            </span>
            <span className="text-xs text-colin-charcoal-500 font-medium">
              Side-by-side comparison matrix (up to 3 stays)
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-colin-navy tracking-tight font-display">
            Compare Accommodations ({comparedProperties.length}/3)
          </h1>
          <p className="text-xs text-colin-charcoal-500 max-w-xl">
            Evaluate monthly rent, campus proximity, food schedules, and verified inspection scores side-by-side to make the right student housing decision.
          </p>
        </div>

        {comparedProperties.length > 0 && (
          <div className="flex items-center gap-2.5">
            {comparedProperties.length < 3 && (
              <button
                onClick={() => setAddModalOpen(true)}
                className="text-xs font-bold text-colin-navy bg-colin-navy-50 hover:bg-colin-navy-100 border border-colin-navy-200 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Add Stay ({3 - comparedProperties.length} left)</span>
              </button>
            )}

            <button
              onClick={clearComparison}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={13} />
              <span>Clear Table</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Matrix Table */}
      {comparedProperties.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl p-12 text-center border border-colin-charcoal-200 shadow-sm space-y-4 max-w-lg mx-auto my-8">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Scale size={28} />
          </div>
          <h2 className="text-xl font-extrabold text-colin-navy">
            Comparison Matrix is Empty
          </h2>
          <p className="text-xs text-colin-charcoal-500 leading-relaxed">
            Select up to 3 accommodations from the Explore directory to analyze rent, security deposits, walking distance to your college, and certified amenities.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
            <Link to="/student/explore">
              <Button variant="primary" size="md" className="justify-center">
                Explore Verified Stays
              </Button>
            </Link>
            <button
              onClick={() => {
                addToComparison('prop-1');
                addToComparison('prop-2');
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-colin-navy bg-colin-navy-50 hover:bg-colin-navy-100 border border-colin-navy-200 transition-colors"
            >
              Load Sample Comparison (Delhi DU)
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-colin-charcoal-200/90 shadow-brand overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-colin-charcoal-200 bg-colin-offwhite">
                  <th className="p-4 sm:p-5 w-48 text-xs font-black uppercase tracking-wider text-colin-charcoal-400">
                    Feature / Attribute
                  </th>
                  {comparedProperties.map((prop) => (
                    <th key={prop.id} className="p-4 sm:p-5 w-64 text-left align-top">
                      <div className="space-y-3">
                        {/* Thumbnail & Remove button */}
                        <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-100 shadow-sm">
                          <img
                            src={prop.featuredImage}
                            alt={prop.title}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => removeFromComparison(prop.id)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-colin-navy-950/80 hover:bg-rose-600 text-white flex items-center justify-center transition-colors"
                            title="Remove from comparison"
                          >
                            <X size={14} />
                          </button>
                          {prop.isColinCertified && (
                            <div className="absolute bottom-2 left-2">
                              <ColinCertifiedBadge variant="dark" size="sm" score={prop.certificationScore} showScore={false} />
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="text-[10px] font-extrabold uppercase text-colin-teal tracking-wider block truncate">
                            {prop.categoryLabel} • {prop.city}
                          </span>
                          <Link to={`/student/property/${prop.id}`}>
                            <h3 className="font-extrabold text-sm text-colin-navy hover:text-colin-teal transition-colors line-clamp-2 leading-snug">
                              {prop.title}
                            </h3>
                          </Link>
                        </div>
                      </div>
                    </th>
                  ))}

                  {/* Empty placeholder column if fewer than 3 */}
                  {Array.from({ length: 3 - comparedProperties.length }).map((_, idx) => (
                    <th key={idx} className="p-4 sm:p-5 w-64 text-center align-middle bg-slate-50/50">
                      <div className="border-2 border-dashed border-colin-charcoal-200 rounded-3xl p-6 text-center space-y-2">
                        <Scale size={24} className="text-colin-charcoal-300 mx-auto" />
                        <p className="text-xs font-bold text-colin-charcoal-500">Compare Another Stay</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => setAddModalOpen(true)}
                        >
                          + Add Stay
                        </Button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-colin-charcoal-100 text-xs">
                {/* 1. Monthly Rent */}
                <tr className="hover:bg-colin-navy-50/30">
                  <td className="p-4 sm:p-5 font-bold text-colin-charcoal-700 bg-slate-50/40">
                    Monthly Indicative Rent
                  </td>
                  {comparedProperties.map((prop) => {
                    const isLowest = prop.rentMonthly === lowestRent;
                    return (
                      <td key={prop.id} className="p-4 sm:p-5">
                        <div className="space-y-1">
                          <div className="text-lg font-black text-colin-navy">
                            ₹{prop.rentMonthly.toLocaleString('en-IN')}<span className="text-xs font-normal text-slate-400">/mo</span>
                          </div>
                          {isLowest && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                              <Sparkles size={11} /> Best Rent Value
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  {Array.from({ length: 3 - comparedProperties.length }).map((_, i) => (
                    <td key={i} className="p-4 sm:p-5 bg-slate-50/30" />
                  ))}
                </tr>

                {/* 2. Security Deposit */}
                <tr className="hover:bg-colin-navy-50/30">
                  <td className="p-4 sm:p-5 font-bold text-colin-charcoal-700 bg-slate-50/40">
                    Security Deposit
                  </td>
                  {comparedProperties.map((prop) => (
                    <td key={prop.id} className="p-4 sm:p-5 font-extrabold text-colin-navy">
                      ₹{prop.depositAmount.toLocaleString('en-IN')}
                      <span className="text-[10px] font-normal text-slate-400 block mt-0.5">
                        (Refundable at exit)
                      </span>
                    </td>
                  ))}
                  {Array.from({ length: 3 - comparedProperties.length }).map((_, i) => (
                    <td key={i} className="p-4 sm:p-5 bg-slate-50/30" />
                  ))}
                </tr>

                {/* 3. Accommodation Type & Sharing */}
                <tr className="hover:bg-colin-navy-50/30">
                  <td className="p-4 sm:p-5 font-bold text-colin-charcoal-700 bg-slate-50/40">
                    Accommodation & Sharing
                  </td>
                  {comparedProperties.map((prop) => (
                    <td key={prop.id} className="p-4 sm:p-5">
                      <span className="font-bold text-colin-navy block">{prop.categoryLabel}</span>
                      <span className="text-[11px] text-colin-charcoal-500 capitalize">
                        {prop.sharingType ? `${prop.sharingType} sharing` : prop.roomType}
                      </span>
                    </td>
                  ))}
                  {Array.from({ length: 3 - comparedProperties.length }).map((_, i) => (
                    <td key={i} className="p-4 sm:p-5 bg-slate-50/30" />
                  ))}
                </tr>

                {/* 4. Distance to University */}
                <tr className="hover:bg-colin-navy-50/30">
                  <td className="p-4 sm:p-5 font-bold text-colin-charcoal-700 bg-slate-50/40">
                    Distance to College
                  </td>
                  {comparedProperties.map((prop) => {
                    const isClosest = extractMeters(prop.distanceToUniversity) === closestDistance;
                    return (
                      <td key={prop.id} className="p-4 sm:p-5">
                        <div className="font-extrabold text-colin-navy flex items-center gap-1.5">
                          <GraduationCap size={13} className="text-colin-teal" />
                          <span>{prop.distanceToUniversity}</span>
                        </div>
                        <span className="text-[10px] text-colin-charcoal-500 block mt-0.5">
                          {prop.nearbyUniversity}
                        </span>
                        {isClosest && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-colin-teal-800 bg-colin-teal/15 px-2 py-0.5 rounded-md mt-1">
                            Closest to Campus
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {Array.from({ length: 3 - comparedProperties.length }).map((_, i) => (
                    <td key={i} className="p-4 sm:p-5 bg-slate-50/30" />
                  ))}
                </tr>

                {/* 5. Food / Meals Availability */}
                <tr className="hover:bg-colin-navy-50/30">
                  <td className="p-4 sm:p-5 font-bold text-colin-charcoal-700 bg-slate-50/40">
                    Food & Meals
                  </td>
                  {comparedProperties.map((prop) => (
                    <td key={prop.id} className="p-4 sm:p-5">
                      {prop.foodIncluded ? (
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-emerald-700 flex items-center gap-1">
                            <Check size={14} /> Included in Rent
                          </span>
                          <span className="text-[10px] text-slate-500 block">3 daily hot meals</span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="font-semibold text-colin-charcoal-500 flex items-center gap-1">
                            <X size={14} className="text-rose-400" /> Not Included
                          </span>
                          <span className="text-[10px] text-colin-charcoal-400">Available via TiffinConnect</span>
                        </div>
                      )}
                    </td>
                  ))}
                  {Array.from({ length: 3 - comparedProperties.length }).map((_, i) => (
                    <td key={i} className="p-4 sm:p-5 bg-slate-50/30" />
                  ))}
                </tr>

                {/* 6. Wi-Fi Facility */}
                <tr className="hover:bg-colin-navy-50/30">
                  <td className="p-4 sm:p-5 font-bold text-colin-charcoal-700 bg-slate-50/40">
                    High-Speed Wi-Fi
                  </td>
                  {comparedProperties.map((prop) => {
                    const hasWifi = prop.amenities.some((a) => a.toLowerCase().includes('wi-fi') || a.toLowerCase().includes('fiber'));
                    return (
                      <td key={prop.id} className="p-4 sm:p-5">
                        {hasWifi ? (
                          <span className="font-bold text-colin-navy flex items-center gap-1 text-emerald-700">
                            <Check size={14} /> High-Speed (150-350 Mbps)
                          </span>
                        ) : (
                          <span className="font-semibold text-colin-charcoal-400 flex items-center gap-1">
                            <X size={14} /> Standard
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {Array.from({ length: 3 - comparedProperties.length }).map((_, i) => (
                    <td key={i} className="p-4 sm:p-5 bg-slate-50/30" />
                  ))}
                </tr>

                {/* 7. Air Conditioning (AC) */}
                <tr className="hover:bg-colin-navy-50/30">
                  <td className="p-4 sm:p-5 font-bold text-colin-charcoal-700 bg-slate-50/40">
                    Air Conditioning
                  </td>
                  {comparedProperties.map((prop) => {
                    const hasAc = prop.amenities.some((a) => a.toLowerCase().includes('ac') || a.toLowerCase().includes('air condition'));
                    return (
                      <td key={prop.id} className="p-4 sm:p-5">
                        {hasAc ? (
                          <span className="font-bold text-emerald-700 flex items-center gap-1">
                            <Check size={14} /> Inverter Split AC
                          </span>
                        ) : (
                          <span className="font-semibold text-colin-charcoal-500 flex items-center gap-1">
                            <X size={14} className="text-slate-400" /> Air Cooled / Fan
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {Array.from({ length: 3 - comparedProperties.length }).map((_, i) => (
                    <td key={i} className="p-4 sm:p-5 bg-slate-50/30" />
                  ))}
                </tr>

                {/* 8. Laundry Facility */}
                <tr className="hover:bg-colin-navy-50/30">
                  <td className="p-4 sm:p-5 font-bold text-colin-charcoal-700 bg-slate-50/40">
                    Laundry Support
                  </td>
                  {comparedProperties.map((prop) => {
                    const hasLaundry = prop.amenities.some((a) => a.toLowerCase().includes('laundr') || a.toLowerCase().includes('washing'));
                    return (
                      <td key={prop.id} className="p-4 sm:p-5">
                        {hasLaundry ? (
                          <span className="font-bold text-emerald-700 flex items-center gap-1">
                            <Check size={14} /> Free Machine / Service
                          </span>
                        ) : (
                          <span className="font-semibold text-colin-charcoal-400 flex items-center gap-1">
                            <X size={14} /> Self / External
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {Array.from({ length: 3 - comparedProperties.length }).map((_, i) => (
                    <td key={i} className="p-4 sm:p-5 bg-slate-50/30" />
                  ))}
                </tr>

                {/* 9. Security & Entry */}
                <tr className="hover:bg-colin-navy-50/30">
                  <td className="p-4 sm:p-5 font-bold text-colin-charcoal-700 bg-slate-50/40">
                    Security & Access
                  </td>
                  {comparedProperties.map((prop) => (
                    <td key={prop.id} className="p-4 sm:p-5">
                      <span className="font-bold text-colin-navy flex items-center gap-1">
                        <Lock size={12} className="text-colin-teal" />
                        <span>Biometric / Smart RFID</span>
                      </span>
                      <span className="text-[10px] text-colin-charcoal-400 block mt-0.5">
                        24/7 CCTV Survelliance
                      </span>
                    </td>
                  ))}
                  {Array.from({ length: 3 - comparedProperties.length }).map((_, i) => (
                    <td key={i} className="p-4 sm:p-5 bg-slate-50/30" />
                  ))}
                </tr>

                {/* 10. COLIN Certified Score */}
                <tr className="hover:bg-colin-navy-50/30">
                  <td className="p-4 sm:p-5 font-bold text-colin-charcoal-700 bg-slate-50/40">
                    COLIN Audit Score
                  </td>
                  {comparedProperties.map((prop) => {
                    const isHighest = prop.certificationScore === highestScore;
                    return (
                      <td key={prop.id} className="p-4 sm:p-5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-colin-navy">
                            {prop.certificationScore || 95}/100
                          </span>
                          {isHighest && (
                            <span className="text-[9px] font-black uppercase text-colin-teal bg-colin-teal/15 px-1.5 py-0.5 rounded">
                              Top Verified
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-colin-charcoal-400 block mt-0.5">
                          Audit on {prop.certificationDate}
                        </span>
                      </td>
                    );
                  })}
                  {Array.from({ length: 3 - comparedProperties.length }).map((_, i) => (
                    <td key={i} className="p-4 sm:p-5 bg-slate-50/30" />
                  ))}
                </tr>

                {/* 11. Available Rooms & Beds */}
                <tr className="hover:bg-colin-navy-50/30">
                  <td className="p-4 sm:p-5 font-bold text-colin-charcoal-700 bg-slate-50/40">
                    Availability
                  </td>
                  {comparedProperties.map((prop) => (
                    <td key={prop.id} className="p-4 sm:p-5 font-bold text-emerald-800">
                      {prop.availableRooms || 2} Rooms ({prop.availableBeds || 4} Beds left)
                      <span className="text-[10px] text-colin-charcoal-500 font-normal block mt-0.5">
                        {prop.occupancyStatus}
                      </span>
                    </td>
                  ))}
                  {Array.from({ length: 3 - comparedProperties.length }).map((_, i) => (
                    <td key={i} className="p-4 sm:p-5 bg-slate-50/30" />
                  ))}
                </tr>

                {/* 12. Actions Row */}
                <tr className="bg-colin-offwhite">
                  <td className="p-4 sm:p-5 font-bold text-colin-charcoal-700 bg-slate-100">
                    Next Step
                  </td>
                  {comparedProperties.map((prop) => (
                    <td key={prop.id} className="p-4 sm:p-5 space-y-2">
                      <Button
                        variant="accent"
                        size="sm"
                        className="w-full text-colin-navy-950 font-black justify-center text-xs"
                        onClick={() => setSelectedPropertyForBooking(prop)}
                      >
                        Book Visit Slot
                      </Button>

                      <Link to={`/student/property/${prop.id}`} className="block">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-center text-xs"
                        >
                          Full Details &rarr;
                        </Button>
                      </Link>
                    </td>
                  ))}
                  {Array.from({ length: 3 - comparedProperties.length }).map((_, i) => (
                    <td key={i} className="p-4 sm:p-5 bg-slate-50/30" />
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Property to Compare */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-colin-navy-950/75 backdrop-blur-sm animate-fadeIn" onClick={() => setAddModalOpen(false)}>
          <div
            className="w-full max-w-lg bg-white rounded-3xl p-6 border border-colin-charcoal-200 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-colin-charcoal-100">
              <div className="flex items-center gap-2">
                <Scale size={18} className="text-colin-teal" />
                <h3 className="font-extrabold text-colin-navy text-base">Select Stay to Add to Matrix</h3>
              </div>
              <button onClick={() => setAddModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {availableToAdd.map((prop) => (
                <div
                  key={prop.id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-colin-charcoal-200 hover:border-colin-teal hover:bg-colin-navy-50/40 transition-all gap-3"
                >
                  <img
                    src={prop.featuredImage}
                    alt={prop.title}
                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-colin-teal uppercase truncate block">
                      {prop.categoryLabel} • {prop.city}
                    </span>
                    <h4 className="font-bold text-xs text-colin-navy truncate">
                      {prop.title}
                    </h4>
                    <span className="text-xs font-black text-colin-navy block mt-0.5">
                      ₹{prop.rentMonthly.toLocaleString('en-IN')}/mo
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="text-xs shrink-0"
                    onClick={() => {
                      addToComparison(prop.id);
                      setAddModalOpen(false);
                    }}
                  >
                    + Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Guided Visit Slot Modal */}
      {selectedPropertyForBooking && (
        <VisitSlotModal
          property={selectedPropertyForBooking}
          isOpen={!!selectedPropertyForBooking}
          onClose={() => setSelectedPropertyForBooking(null)}
        />
      )}
    </div>
  );
};
