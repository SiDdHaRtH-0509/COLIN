import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { X, Lock, ShieldCheck, ArrowRight, Sparkles, User, Building } from 'lucide-react';
import { Button } from './Button';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalMessage, demoLogin, intendedUrl } = useAuth();
  const navigate = useNavigate();

  if (!isAuthModalOpen) return null;

  const handleFullLogin = () => {
    closeAuthModal();
    const query = intendedUrl ? `?redirect=${encodeURIComponent(intendedUrl)}` : '';
    navigate(`/login${query}`);
  };

  const handleFullSignup = () => {
    closeAuthModal();
    const query = intendedUrl ? `?redirect=${encodeURIComponent(intendedUrl)}` : '';
    navigate(`/signup${query}`);
  };

  const handleQuickDemo = (role: 'student' | 'owner') => {
    demoLogin(role);
    closeAuthModal();
    if (intendedUrl) {
      navigate(intendedUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-colin-navy-950/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-colin-charcoal-200 overflow-hidden transform transition-all animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-colin-navy via-colin-navy-800 to-colin-teal p-6 text-white relative">
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-1.5 text-white/70 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 backdrop-blur flex items-center justify-center mb-3">
            <Lock size={22} className="text-colin-orange" />
          </div>

          <h3 className="text-xl font-extrabold tracking-tight">
            Member-Only Property Access
          </h3>
          <p className="text-xs text-colin-teal-100 mt-1 max-w-sm leading-relaxed">
            {authModalMessage}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Trust Guarantees */}
          <div className="bg-colin-navy-50/70 border border-colin-navy-100 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-colin-navy">
              <ShieldCheck size={16} className="text-colin-teal" />
              <span>Why COLIN Requires Free Student Verification:</span>
            </div>
            <ul className="text-colin-charcoal-600 space-y-1 pl-6 list-disc text-[11px] leading-relaxed">
              <li>Protects student privacy & verifies legitimate hostel/flatmate inquiries.</li>
              <li>Unlocks direct verified owner phone numbers & exact building addresses.</li>
              <li>Activates visit slot booking with 55% guaranteed refund policy.</li>
            </ul>
          </div>

          {/* Quick Demo Evaluation Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-colin-orange" />
                1-Click Prototype Logins:
              </span>
              <span className="text-[10px] text-colin-teal-700 font-semibold bg-colin-teal/10 px-2 py-0.5 rounded-full">
                Instant Access
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleQuickDemo('student')}
                className="flex items-center gap-3 p-3 rounded-xl border-2 border-colin-teal/30 hover:border-colin-teal bg-colin-teal/5 hover:bg-colin-teal/10 text-left transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-colin-teal text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <User size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-colin-navy">Student Demo</div>
                  <div className="text-[10px] text-colin-charcoal-500">Aarav (DU Student)</div>
                </div>
              </button>

              <button
                onClick={() => handleQuickDemo('owner')}
                className="flex items-center gap-3 p-3 rounded-xl border-2 border-colin-orange/30 hover:border-colin-orange bg-colin-orange/5 hover:bg-colin-orange/10 text-left transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-colin-orange text-colin-navy-950 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <Building size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-colin-navy">Owner Demo</div>
                  <div className="text-[10px] text-colin-charcoal-500">Col. Rajesh (Verified Host)</div>
                </div>
              </button>
            </div>
          </div>

          {/* Regular Login / Signup options */}
          <div className="pt-2 border-t border-colin-charcoal-100 flex flex-col sm:flex-row gap-3">
            <Button
              variant="primary"
              className="w-full flex-1"
              onClick={handleFullLogin}
              rightIcon={<ArrowRight size={14} />}
            >
              Go to Login
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleFullSignup}
            >
              Sign Up Free
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
