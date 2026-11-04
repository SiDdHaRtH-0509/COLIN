import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProperties } from '../../context/PropertyContext';
import {
  CertificationStage,
  InspectionChecklist,
} from '../../types';
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertTriangle,
  Award,
  Zap,
  X,
  Flame,
  Fingerprint,
  Wifi,
  Utensils,
  Sparkles,
  Wind,
  XCircle,
} from 'lucide-react';
import { Button } from '../../components/common/Button';

export const OwnerCertificationPage: React.FC = () => {
  const {
    ownerProperties,
    certifications,
    requestCertification,
    assignInspector,
    submitInspectionReport,
    approveCertification,
    rejectCertification,
  } = useProperties();

  // Selected Property for viewing/requesting certification
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(() => {
    return ownerProperties.length > 0 ? ownerProperties[0].id : '';
  });

  // Modal States
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [preferredDate, setPreferredDate] = useState('2026-11-10');
  const [preferredSlot, setPreferredSlot] = useState('11:00 AM - 01:00 PM');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Inspector Simulation Panel
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [simScore] = useState(98);
  const [simRemarks] = useState('All student health and safety standards verified. High-speed leased line tested at 320 Mbps.');
  const [simChecklist] = useState<InspectionChecklist>({
    fireSafetyApproved: true,
    biometricSecurityActive: true,
    wifiSpeedMbps: 320,
    foodHygieneAuditScore: 98,
    cleanLinenCertified: true,
    roomVentilationPassed: true,
  });

  const activeProperty = ownerProperties.find((p) => p.id === selectedPropertyId) || ownerProperties[0];
  const activeCertRequest = certifications.find((c) => c.propertyId === activeProperty?.id);

  // Determine current stage
  const currentStage: CertificationStage = activeCertRequest?.status || (activeProperty?.isColinCertified ? 'Certified' : 'Not Requested');

  // Submit certification request with simulated checkout
  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty) return;
    setPaymentProcessing(true);

    setTimeout(() => {
      setPaymentProcessing(false);
      setPaymentSuccess(true);
      requestCertification(activeProperty.id, preferredDate, preferredSlot);

      setTimeout(() => {
        setPaymentSuccess(false);
        setIsRequestModalOpen(false);
      }, 1500);
    }, 1200);
  };

  // Step definition for timeline
  const stagesList: Array<{ key: CertificationStage; label: string; desc: string }> = [
    { key: 'Not Requested', label: '1. Not Requested', desc: 'Audit not initiated' },
    { key: 'Inspection Requested', label: '2. Audit Requested', desc: 'Fee paid (₹999)' },
    { key: 'Inspector Assigned', label: '3. Inspector Assigned', desc: 'Campus volunteer allocated' },
    { key: 'Inspection Scheduled', label: '4. Scheduled', desc: 'On-site audit date confirmed' },
    { key: 'Inspection Completed', label: '5. Audit Completed', desc: 'Checklist scores recorded' },
    { key: 'Certified', label: '6. COLIN Certified', desc: 'Badge active & trust score live' },
  ];

  const getStageIndex = (stage: CertificationStage) => {
    switch (stage) {
      case 'Not Requested':
        return 0;
      case 'Payment Pending':
      case 'Inspection Requested':
        return 1;
      case 'Inspector Assigned':
        return 2;
      case 'Inspection Scheduled':
        return 3;
      case 'Inspection Completed':
      case 'Under Review':
        return 4;
      case 'Certified':
        return 5;
      case 'Rejected':
        return -1;
      default:
        return 0;
    }
  };

  const activeStepIdx = getStageIndex(currentStage);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-colin-navy font-display flex items-center gap-2">
            <ShieldCheck size={28} className="text-colin-teal" />
            <span>COLIN Physical Certification System</span>
          </h1>
          <p className="text-xs text-colin-charcoal-500 mt-1">
            Student housing verified through 100% in-person inspections by vetted university campus leaders.
          </p>
        </div>

        {ownerProperties.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSimulationOpen(!isSimulationOpen)}
              className="text-xs font-bold border-colin-teal text-colin-teal-800"
              leftIcon={<Zap size={14} className="text-colin-orange" />}
            >
              {isSimulationOpen ? 'Hide Audit Simulator' : 'Inspector Test Sandbox'}
            </Button>
          </div>
        )}
      </div>

      {ownerProperties.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-colin-charcoal-200 text-center space-y-4">
          <ShieldCheck size={40} className="text-colin-charcoal-300 mx-auto" />
          <h3 className="text-base font-extrabold text-colin-navy">No Properties Listed Yet</h3>
          <p className="text-xs text-colin-charcoal-500 max-w-sm mx-auto">
            Add your first property listing to request and schedule on-site physical certification audits.
          </p>
          <Link to="/owner/properties">
            <Button variant="primary" size="sm" className="text-xs font-bold">
              Add Your First Property
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Property Selector */}
      <div className="bg-white rounded-2xl p-4 border border-colin-charcoal-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Building2 size={18} className="text-colin-navy shrink-0" />
          <div className="space-y-0.5 flex-1 sm:flex-initial">
            <label className="text-[10px] font-bold text-colin-charcoal-400 uppercase tracking-wider block">
              Select Property for Inspection Tracking
            </label>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="text-xs font-bold text-colin-navy bg-colin-offwhite border border-colin-charcoal-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-colin-navy"
            >
              {ownerProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} — {p.isColinCertified ? '★ Certified' : 'Uncertified'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeProperty && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-colin-charcoal-500 font-semibold">Current Badge Status:</span>
            <span
              className={`text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 ${
                activeProperty.isColinCertified
                  ? 'bg-colin-teal text-white shadow-sm'
                  : currentStage === 'Rejected'
                  ? 'bg-rose-600 text-white'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {activeProperty.isColinCertified ? (
                <>
                  <ShieldCheck size={14} />
                  <span>COLIN Certified ({activeProperty.certificationScore || 98}/100)</span>
                </>
              ) : currentStage === 'Rejected' ? (
                <>
                  <XCircle size={14} />
                  <span>Audit Rejected</span>
                </>
              ) : (
                <>
                  <Clock size={14} />
                  <span>{currentStage}</span>
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Strict Anti-Pay-to-Certify Warning */}
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold">Strict COLIN Trust Requirement: Physical Verification Mandatory</div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Payment of the ₹999 inspection fee schedules an on-site physical audit by our volunteer team. <strong>Payment alone NEVER activates the certified badge.</strong> Only an official physical inspection score meeting our safety and hygiene criteria will grant the COLIN Certified shield.
          </p>
        </div>
      </div>

      {/* Simulator Drawer (For Testing Stages) */}
      {isSimulationOpen && activeCertRequest && (
        <div className="bg-gradient-to-r from-colin-navy-50 to-white rounded-3xl p-6 border-2 border-dashed border-colin-teal/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-colin-navy">
              <Zap size={18} className="text-colin-orange" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider">
                Auditor & Inspector Evaluation Sandbox
              </h3>
            </div>
            <span className="text-[11px] bg-colin-orange text-colin-navy-950 font-extrabold px-2 py-0.5 rounded-full">
              Testing Tool
            </span>
          </div>

          <p className="text-xs text-colin-charcoal-600">
            Use these controls to advance the inspection through each milestone of the COLIN audit workflow.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => assignInspector(activeCertRequest.id, 'Priya Sharma (DU Campus Lead)', '+91 98110 33445')}
              className="text-xs font-bold"
            >
              1. Assign Inspector
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => submitInspectionReport(activeCertRequest.id, simScore, simChecklist, simRemarks)}
              className="text-xs font-bold"
            >
              2. Submit Inspection Report (Score: {simScore})
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => approveCertification(activeCertRequest.id)}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700"
              leftIcon={<CheckCircle2 size={14} />}
            >
              3. Approve & Certify Property
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => rejectCertification(activeCertRequest.id, 'Fire safety extinguishers were expired. Re-inspection required.')}
              className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
            >
              Reject Audit
            </Button>
          </div>
        </div>
      )}

      {/* Workflow Progress Steps */}
      <div className="bg-white rounded-3xl p-6 border border-colin-charcoal-200/90 shadow-sm space-y-6">
        <h2 className="text-sm font-black text-colin-navy uppercase tracking-wider">
          Physical Certification Lifecycle
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {stagesList.map((step, idx) => {
            const isCompleted = activeStepIdx >= idx && activeStepIdx !== -1;
            const isCurrent = activeStepIdx === idx;

            return (
              <div
                key={step.key}
                className={`p-3.5 rounded-2xl border text-left space-y-1 transition-all ${
                  isCurrent
                    ? 'border-colin-teal bg-colin-teal/10 shadow-sm ring-2 ring-colin-teal/20'
                    : isCompleted
                    ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900'
                    : 'border-colin-charcoal-200 bg-colin-offwhite text-colin-charcoal-400 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase ${isCurrent ? 'text-colin-teal-800' : isCompleted ? 'text-emerald-700' : 'text-colin-charcoal-400'}`}>
                    Step {idx + 1}
                  </span>
                  {isCompleted && <CheckCircle2 size={13} className="text-emerald-600" />}
                </div>
                <div className="text-xs font-extrabold text-colin-navy truncate">
                  {step.label.split('. ')[1]}
                </div>
                <p className="text-[10px] text-colin-charcoal-500 line-clamp-2">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Inspection Status & Report Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Audit Details & Checklist */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200/90 shadow-sm space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-colin-charcoal-100">
              <div>
                <span className="text-[10px] font-bold uppercase text-colin-teal tracking-wider block">
                  Official Verification Audit
                </span>
                <h3 className="text-xl font-black text-colin-navy font-display">
                  {activeProperty?.title}
                </h3>
                <p className="text-xs text-colin-charcoal-500">
                  {activeProperty?.fullAddress || activeProperty?.neighborhood}
                </p>
              </div>

              {!activeProperty?.isColinCertified && currentStage === 'Not Requested' && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsRequestModalOpen(true)}
                  className="bg-colin-navy hover:bg-colin-navy-800 text-xs font-bold shrink-0 shadow-sm"
                  leftIcon={<ShieldCheck size={16} className="text-colin-orange" />}
                >
                  Request Physical Audit (₹999)
                </Button>
              )}
            </div>

            {/* Checklist Verification Scorecard */}
            {activeCertRequest?.inspectionChecklist || activeProperty?.inspectionChecklist ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-colin-charcoal-600 tracking-wider">
                    On-Site Inspector Safety & Hygiene Checklist
                  </h4>
                  <span className="text-sm font-black text-colin-navy font-display">
                    Score: {activeCertRequest?.inspectionScore || activeProperty?.certificationScore || 98} / 100
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-colin-offwhite rounded-2xl border border-colin-charcoal-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Flame size={16} className="text-rose-500" />
                      <div>
                        <div className="text-xs font-bold text-colin-navy">Fire Safety Extinguishers</div>
                        <span className="text-[10px] text-colin-charcoal-500">ISI certified & serviced</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-600">PASS ✓</span>
                  </div>

                  <div className="p-3.5 bg-colin-offwhite rounded-2xl border border-colin-charcoal-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Fingerprint size={16} className="text-colin-navy" />
                      <div>
                        <div className="text-xs font-bold text-colin-navy">Biometric Security Gate</div>
                        <span className="text-[10px] text-colin-charcoal-500">24/7 entry logging operational</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-600">PASS ✓</span>
                  </div>

                  <div className="p-3.5 bg-colin-offwhite rounded-2xl border border-colin-charcoal-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Wifi size={16} className="text-colin-teal" />
                      <div>
                        <div className="text-xs font-bold text-colin-navy">High-Speed Wi-Fi</div>
                        <span className="text-[10px] text-colin-charcoal-500">Speed verified on-site</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-colin-navy">
                      {(activeCertRequest?.inspectionChecklist?.wifiSpeedMbps || activeProperty?.inspectionChecklist?.wifiSpeedMbps || 300)} Mbps
                    </span>
                  </div>

                  <div className="p-3.5 bg-colin-offwhite rounded-2xl border border-colin-charcoal-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Utensils size={16} className="text-colin-orange" />
                      <div>
                        <div className="text-xs font-bold text-colin-navy">Food Hygiene & Clean Kitchen</div>
                        <span className="text-[10px] text-colin-charcoal-500">FSSAI compliant handling</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-600">
                      {(activeCertRequest?.inspectionChecklist?.foodHygieneAuditScore || activeProperty?.inspectionChecklist?.foodHygieneAuditScore || 95)}/100
                    </span>
                  </div>

                  <div className="p-3.5 bg-colin-offwhite rounded-2xl border border-colin-charcoal-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Sparkles size={16} className="text-colin-teal" />
                      <div>
                        <div className="text-xs font-bold text-colin-navy">Linen & Mattress Hygiene</div>
                        <span className="text-[10px] text-colin-charcoal-500">Sanitized orthopedic bedding</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-600">PASS ✓</span>
                  </div>

                  <div className="p-3.5 bg-colin-offwhite rounded-2xl border border-colin-charcoal-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Wind size={16} className="text-colin-navy" />
                      <div>
                        <div className="text-xs font-bold text-colin-navy">Room Natural Ventilation</div>
                        <span className="text-[10px] text-colin-charcoal-500">Windows & dual air flow</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-600">PASS ✓</span>
                  </div>
                </div>

                {/* Auditor Remarks Box */}
                <div className="p-4 bg-colin-navy-50 rounded-2xl border border-colin-navy-100 space-y-1">
                  <div className="text-xs font-bold text-colin-navy">Auditor Remarks:</div>
                  <p className="text-xs text-colin-charcoal-600 italic">
                    "{activeCertRequest?.inspectionRemarks || 'Exemplary property standards. Fire extinguishers on every floor with valid ISI certification. Biometric logs active. Kitchen hygiene score verified.'}"
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-colin-offwhite rounded-3xl border border-dashed border-colin-charcoal-200 text-center space-y-3">
                <ShieldCheck size={36} className="mx-auto text-colin-charcoal-400" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-colin-navy">No Audit Checklist Recorded Yet</h4>
                  <p className="text-xs text-colin-charcoal-500 max-w-sm mx-auto">
                    Request an inspection visit to have our campus volunteer team audit this property in person.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsRequestModalOpen(true)}
                  className="bg-colin-navy"
                >
                  Schedule On-Site Audit
                </Button>
              </div>
            )}

          </div>
        </div>

        {/* Right: Assigned Inspector Card & Benefits */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Inspector Profile */}
          <div className="bg-white rounded-3xl p-6 border border-colin-charcoal-200/90 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-colin-navy tracking-wider">
              Assigned Campus Auditor
            </h3>

            {activeCertRequest?.inspectorName ? (
              <div className="flex items-center gap-3">
                <img
                  src={activeCertRequest.inspectorAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'}
                  alt="Inspector"
                  className="w-14 h-14 rounded-2xl object-cover border border-colin-teal"
                />
                <div>
                  <div className="text-sm font-black text-colin-navy">
                    {activeCertRequest.inspectorName}
                  </div>
                  <div className="text-xs text-colin-teal font-semibold">
                    COLIN University Inspection Ambassador
                  </div>
                  <div className="text-[11px] text-colin-charcoal-500 mt-0.5">
                    Phone: {activeCertRequest.inspectorContact || '+91 98104 55120'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-colin-offwhite rounded-2xl text-center space-y-1 text-xs text-colin-charcoal-500">
                <UserCheck size={20} className="mx-auto text-colin-charcoal-400" />
                <p>Campus auditor assigned upon inspection scheduling.</p>
              </div>
            )}

            <div className="pt-2 border-t border-colin-charcoal-100 text-xs text-colin-charcoal-600 space-y-1">
              <div className="flex items-center justify-between">
                <span>Inspection Fee:</span>
                <strong className="text-colin-navy">₹999 (Demonstration)</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Validity:</span>
                <strong className="text-emerald-700">1 Academic Year (12 Months)</strong>
              </div>
            </div>
          </div>

          {/* Benefits Card */}
          <div className="bg-gradient-to-br from-colin-navy to-colin-navy-950 rounded-3xl p-6 text-white space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-colin-orange">
              <Award size={20} />
              <h3 className="text-xs font-black uppercase tracking-wider">
                Certification Benefits
              </h3>
            </div>

            <ul className="text-xs space-y-2 text-colin-charcoal-200">
              <li className="flex items-center gap-2">
                <span className="text-colin-teal font-bold">✓</span>
                <span>Coveted <strong>COLIN Certified</strong> shield badge on all cards</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-colin-teal font-bold">✓</span>
                <span>Top ranking in student campus search queries</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-colin-teal font-bold">✓</span>
                <span>3.4x higher student visit pass bookings</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-colin-teal font-bold">✓</span>
                <span>Zero broker disputes — trusted by DU, Christ & Symbiosis parents</span>
              </li>
            </ul>
          </div>

        </div>

      </div>
      </>
      )}

      {/* ================= AUDIT REQUEST MODAL (With Simulated Payment) ================= */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-colin-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-colin-charcoal-200 shadow-2xl space-y-5 animate-scaleUp">
            
            <div className="flex items-center justify-between pb-3 border-b border-colin-charcoal-100">
              <div className="flex items-center gap-2 text-colin-navy">
                <ShieldCheck size={20} className="text-colin-teal" />
                <h3 className="text-base font-black">Schedule Physical Inspection</h3>
              </div>
              <button onClick={() => setIsRequestModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div>
                <span className="text-xs text-colin-charcoal-400">Inspecting Property:</span>
                <p className="text-sm font-black text-colin-navy">{activeProperty?.title}</p>
                <p className="text-xs text-colin-charcoal-500">{activeProperty?.fullAddress}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                  Preferred Inspection Date
                </label>
                <input
                  type="date"
                  required
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                  Preferred Time Window
                </label>
                <select
                  value={preferredSlot}
                  onChange={(e) => setPreferredSlot(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none bg-white font-medium"
                >
                  <option>10:00 AM - 12:00 PM</option>
                  <option>11:00 AM - 01:00 PM</option>
                  <option>02:00 PM - 04:00 PM</option>
                  <option>04:00 PM - 06:00 PM</option>
                </select>
              </div>

              <div className="p-3 bg-colin-navy-50 rounded-2xl border border-colin-navy-100 space-y-1 text-xs">
                <div className="flex items-center justify-between font-bold text-colin-navy">
                  <span>Inspection Audit Fee:</span>
                  <span>₹999 (Demonstration)</span>
                </div>
                <p className="text-[11px] text-colin-charcoal-500">
                  Includes on-site visit by 2 vetted campus leads, 20-point checklist verification, and 12-month certification validity.
                </p>
              </div>

              {paymentSuccess ? (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Audit Booked! Status: Inspection Requested (Uncertified).</span>
                </div>
              ) : (
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setIsRequestModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={paymentProcessing}
                    className="bg-colin-navy hover:bg-colin-navy-800"
                  >
                    {paymentProcessing ? 'Processing...' : 'Pay ₹999 & Book Audit'}
                  </Button>
                </div>
              )}
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
