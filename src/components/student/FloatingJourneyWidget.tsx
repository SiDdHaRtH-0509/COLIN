import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useStudent } from '../../context/StudentContext';
import {
  Compass,
  CheckCircle2,
  CircleDot,
  X,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const FloatingJourneyWidget: React.FC = () => {
  const {
    wishlist,
    visits,
    upcomingVisitsCount,
    studentPreferences,
    recentlyViewed,
    profileCompletionPercent,
  } = useStudent();

  const [isOpen, setIsOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Define the 5 official journey steps with real application state
  const journeySteps = [
    {
      id: 1,
      title: 'Complete Profile',
      altTitle: 'Profile & Preferences',
      desc: studentPreferences.preferredCity
        ? `${studentPreferences.preferredCity} • Up to ₹${studentPreferences.maxBudget.toLocaleString('en-IN')}`
        : 'Set your university, city & budget preferences',
      isDone: profileCompletionPercent >= 80,
      link: '/student/profile',
      actionLabel: 'Update Profile',
    },
    {
      id: 2,
      title: 'Discover Stays',
      altTitle: 'Explore Accommodations',
      desc: recentlyViewed.length > 0
        ? `${recentlyViewed.length} verified accommodation${recentlyViewed.length > 1 ? 's' : ''} inspected`
        : 'Explore verified student accommodations',
      isDone: recentlyViewed.length > 0 || wishlist.length > 0,
      link: '/student/explore',
      actionLabel: 'Explore Stays',
    },
    {
      id: 3,
      title: 'Shortlist Properties',
      altTitle: 'Shortlist Properties',
      desc: wishlist.length > 0
        ? `${wishlist.length} stay${wishlist.length > 1 ? 's' : ''} saved in shortlist`
        : 'Shortlist properties to compare specs',
      isDone: wishlist.length > 0,
      link: '/student/saved',
      actionLabel: 'View Shortlist',
    },
    {
      id: 4,
      title: 'Schedule Visits',
      altTitle: 'Schedule In-Person Visits',
      desc: upcomingVisitsCount > 0
        ? `${upcomingVisitsCount} upcoming visit pass${upcomingVisitsCount > 1 ? 'es' : ''}`
        : 'Book ₹150 slot with 55% refund guarantee',
      isDone: visits.length > 0,
      link: '/student/visits',
      actionLabel: 'Book a Slot',
    },
    {
      id: 5,
      title: 'Finalize Stay',
      altTitle: 'Finalize & Move In',
      desc: visits.some((v) => v.status === 'Completed')
        ? 'Physical inspection completed — ready to move in'
        : 'Complete physical inspection before locking deposit',
      isDone: visits.some((v) => v.status === 'Completed'),
      link: '/student/visits',
      actionLabel: 'Manage Passes',
    },
  ];

  // Determine active step index
  const currentStepIndex = journeySteps.findIndex((s) => !s.isDone);
  const currentStep = currentStepIndex === -1 ? 5 : currentStepIndex + 1;
  const completedCount = journeySteps.filter((s) => s.isDone).length;
  const remainingCount = 5 - completedCount;
  const progressPercent = Math.round((completedCount / 5) * 100);

  // Close on Outside Click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape Key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={widgetRef}
      data-testid="accommodation-journey-widget"
      className="fixed bottom-20 md:bottom-6 right-4 md:right-8 z-30 select-none print:hidden"
    >
      {/* Expanded Journey Panel (Opens upward from the bottom-right corner) */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Accommodation Journey Progress"
          className="absolute bottom-14 right-0 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-5 space-y-4 animate-scaleUp max-h-[82vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-colin-teal/15 text-colin-teal flex items-center justify-center shrink-0">
                <Compass size={17} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-colin-navy font-display">
                  Accommodation Journey
                </h3>
                <p className="text-[11px] text-colin-charcoal-500">
                  {completedCount} of 5 completed • {remainingCount} remaining
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              aria-label="Close Journey dialog"
            >
              <X size={16} />
            </button>
          </div>

          {/* Progress Overview Bar */}
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-colin-navy">Overall Progress</span>
              <span className="text-colin-teal font-extrabold">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-colin-teal to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 text-right">
              Step {currentStep} of 5 Active
            </div>
          </div>

          {/* 5-Step List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
            {journeySteps.map((step) => {
              const isCurrent = step.id === currentStep;
              return (
                <Link
                  key={step.id}
                  to={step.link}
                  onClick={() => setIsOpen(false)}
                  className={`block p-3 rounded-2xl border transition-all text-left ${
                    step.isDone
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 hover:bg-emerald-100/70'
                      : isCurrent
                      ? 'bg-colin-navy-50/90 border-colin-navy/40 ring-1 ring-colin-teal/40 shadow-xs'
                      : 'bg-white border-slate-200/80 text-colin-charcoal-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {step.isDone ? (
                          <CheckCircle2 size={16} className="text-emerald-600" />
                        ) : isCurrent ? (
                          <CircleDot size={16} className="text-colin-teal animate-pulse" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 text-[10px] flex items-center justify-center font-bold text-slate-400">
                            {step.id}
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="text-xs font-bold text-colin-navy flex items-center gap-1.5 flex-wrap">
                          <span>{step.title}</span>
                          {step.altTitle && step.altTitle !== step.title && (
                            <span className="text-[10px] font-normal text-slate-400">
                              {step.altTitle}
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-colin-navy text-white px-1.5 py-0.2 rounded">
                              Current
                            </span>
                          )}
                          {step.isDone && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                              Done
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-colin-charcoal-500 truncate">
                          {step.desc}
                        </div>
                      </div>
                    </div>

                    <ChevronRight size={14} className="text-colin-charcoal-300 shrink-0 mt-1" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Quick Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-colin-charcoal-400 flex items-center gap-1">
              <ShieldCheck size={12} className="text-colin-teal" />
              <span>Verified student workflow</span>
            </span>
            <Link
              to="/student/explore"
              onClick={() => setIsOpen(false)}
              className="font-bold text-colin-teal hover:underline"
            >
              Discover Stays &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* New Collapsed State: Premium, Website-Consistent Journey Pill */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="group relative flex items-center gap-2.5 pl-2.5 pr-3.5 py-2 rounded-full bg-white/95 backdrop-blur-md text-colin-navy shadow-lg shadow-colin-navy/10 border border-slate-200/90 hover:border-colin-teal hover:shadow-xl hover:shadow-colin-teal/15 transition-all duration-300 overflow-hidden"
        aria-label="Toggle Accommodation Journey (Open Accommodation Journey)"
        aria-expanded={isOpen}
      >
        {/* Micro-progress indicator line along bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-colin-teal to-emerald-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="w-6 h-6 rounded-full bg-colin-teal/10 text-colin-teal border border-colin-teal/25 flex items-center justify-center group-hover:rotate-45 group-hover:bg-colin-teal group-hover:text-white transition-all duration-300 shrink-0">
          <Compass size={13} />
        </div>

        <span className="text-xs font-black tracking-tight text-colin-navy group-hover:text-colin-teal transition-colors hidden sm:inline">
          Accommodation Journey
        </span>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider bg-colin-teal text-white px-2 py-0.5 rounded-full shadow-xs">
            Step {currentStep}/5
          </span>
          <span className="text-[11px] font-bold text-slate-500 group-hover:text-colin-navy transition-colors hidden sm:inline">
            • {progressPercent}%
          </span>
        </div>
      </button>
    </div>
  );
};