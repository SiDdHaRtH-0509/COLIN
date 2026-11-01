import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, LogOut, ChevronDown, Sparkles } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  const { user, isAuthenticated, demoLogin, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-colin-navy-950 text-white text-xs border-b border-colin-navy-800 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="bg-colin-orange/20 text-colin-orange border border-colin-orange/40 font-bold px-2 py-0.5 rounded text-[10px] tracking-wider uppercase flex items-center gap-1">
            <Sparkles size={11} /> Phase 1 Demo
          </span>
          <span className="text-colin-charcoal-300 hidden sm:inline">
            Prototype Authentication & Access Restriction Layer (Local Sandbox Session)
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-2 bg-colin-navy-900/90 px-2.5 py-1 rounded-lg border border-colin-teal/40">
              <UserCheck size={13} className="text-colin-teal" />
              <span className="text-white font-medium">
                {user?.name} ({user?.role === 'student' ? 'Student' : 'Property Owner'})
              </span>
              <button
                onClick={logout}
                className="text-colin-charcoal-400 hover:text-rose-400 text-[11px] underline ml-1 flex items-center gap-0.5"
                title="Switch or reset demo account"
              >
                <LogOut size={11} /> Logout
              </button>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 bg-colin-teal hover:bg-colin-teal-600 text-white font-semibold px-2.5 py-1 rounded-lg text-xs transition-colors shadow-sm"
              >
                <span>⚡ Instant Demo Login</span>
                <ChevronDown size={13} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white text-colin-charcoal rounded-xl shadow-xl border border-colin-charcoal-200 p-2 z-50">
                  <div className="text-[11px] text-colin-charcoal-500 font-semibold px-2 py-1 uppercase tracking-wider">
                    Quick Evaluator Presets
                  </div>
                  <button
                    onClick={() => {
                      demoLogin('student');
                      setIsOpen(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-colin-navy-50 flex items-start gap-2.5 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-full bg-colin-teal/15 text-colin-teal flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                      🎓
                    </div>
                    <div>
                      <div className="font-bold text-colin-navy group-hover:text-colin-teal text-xs">
                        Student Demo (Aarav Mehra)
                      </div>
                      <div className="text-[10px] text-colin-charcoal-500">
                        SRCC Delhi Univ • Full Property & Booking Access
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      demoLogin('owner');
                      setIsOpen(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-colin-navy-50 flex items-start gap-2.5 transition-colors group mt-1"
                  >
                    <div className="w-7 h-7 rounded-full bg-colin-orange/15 text-colin-orange flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                      🏢
                    </div>
                    <div>
                      <div className="font-bold text-colin-navy group-hover:text-colin-orange-600 text-xs">
                        Owner Demo (Col. Rajesh Sharma)
                      </div>
                      <div className="text-[10px] text-colin-charcoal-500">
                        Property Host • Certified Listing Access
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
