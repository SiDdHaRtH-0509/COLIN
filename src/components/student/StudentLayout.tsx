import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useStudent } from '../../context/StudentContext';
import {
  LayoutDashboard,
  Compass,
  Bookmark,
  Scale,
  CalendarCheck,
  Sparkles,
  Utensils,
  Crown,
  UserRound,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  House,
  ShieldCheck,
  Building,
  Zap,
  LucideIcon,
} from 'lucide-react';
import { Button } from '../common/Button';
import { FloatingJourneyWidget } from './FloatingJourneyWidget';

interface NavItemDef {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
  highlightBadge?: string;
  activeIconClass: string;
  activeIndicatorClass: string;
  hoverIconClass: string;
  hoverBgClass: string;
  badgeBgClass?: string;
}

interface NavGroupDef {
  title: string;
  items: NavItemDef[];
}

export const StudentLayout: React.FC = () => {
  const { user, isAuthenticated, logout, demoLogin } = useAuth();
  const { wishlist, comparisonList, upcomingVisitsCount, premiumSubscription, studentPreferences } = useStudent();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('colin_student_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const location = useLocation();
  const navigate = useNavigate();

  // Toggle desktop collapsed state & persist
  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('colin_student_sidebar_collapsed', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  // Prevent background scrolling while mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  // Role Guard: Unauthenticated Visitor
  if (!isAuthenticated) {
    return (
      <div className="min-h-[85vh] bg-gradient-to-b from-colin-navy-50/60 to-colin-offwhite flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200 shadow-xl text-center space-y-5 animate-scaleUp">
          <div className="w-16 h-16 rounded-2xl bg-colin-navy-50 text-colin-navy flex items-center justify-center mx-auto border border-colin-navy-100">
            <UserRound size={30} className="text-colin-teal" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-colin-teal uppercase tracking-wider">
              Student Portal Access
            </span>
            <h2 className="text-2xl font-black text-colin-navy font-display">
              Sign In as a Student
            </h2>
            <p className="text-xs text-colin-charcoal-500 leading-relaxed">
              Access your personalized accommodation discovery workspace, saved stays, visit pass bookings, and COLIN Living services.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <Button
              variant="accent"
              size="md"
              className="w-full text-colin-navy-950 font-black justify-center"
              onClick={() => {
                demoLogin('student');
                navigate('/student/dashboard');
              }}
              rightIcon={<Zap size={16} />}
            >
              Demo Student Login (Aarav Mehra)
            </Button>

            <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`} className="block">
              <Button variant="outline" size="md" className="w-full justify-center">
                Sign In with Credentials
              </Button>
            </Link>
          </div>

          <div className="pt-2 border-t border-colin-charcoal-100">
            <Link to="/" className="text-xs text-colin-charcoal-500 hover:text-colin-navy font-medium inline-flex items-center gap-1">
              <House size={13} />
              <span>Return to Public Homepage</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Role Guard: Property Owner signed in
  if (user?.role === 'owner') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-xl space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
            <Building size={26} />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
              Role Mismatch Notice
            </span>
            <h2 className="text-xl font-black text-colin-navy font-display">
              Property Host Account Detected
            </h2>
            <p className="text-xs text-colin-charcoal-600 leading-relaxed">
              You are currently signed in as <strong>{user.name}</strong> (Property Host). The Student Portal contains scholar-specific accommodation tools, student visits, and meal subscriptions.
            </p>
          </div>

          <div className="p-3.5 bg-colin-navy-50 rounded-2xl border border-colin-navy-100 text-xs text-colin-charcoal-700 space-y-1">
            <p className="font-bold text-colin-navy">Switch to Student view for testing:</p>
            <p className="text-[11px] text-colin-charcoal-500">
              You can instantly switch to the verified student evaluation account to explore all Phase 2 features.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1 justify-center"
              onClick={() => {
                navigate('/owner/dashboard');
              }}
            >
              Go to Owner Dashboard
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 justify-center"
              onClick={() => {
                demoLogin('student');
                navigate('/student/dashboard');
              }}
            >
              Switch to Student Demo
            </Button>
            <Link to="/" className="flex-1">
              <Button variant="ghost" size="sm" className="w-full justify-center">
                Return to Homepage
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Navigation Groupings per Section 1 & 2
  const navGroups: NavGroupDef[] = [
    {
      title: 'ACCOMMODATION',
      items: [
        {
          to: '/student/dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          activeIconClass: 'text-sky-400',
          activeIndicatorClass: 'bg-sky-400',
          hoverIconClass: 'group-hover:text-sky-500',
          hoverBgClass: 'hover:bg-sky-50/80',
        },
        {
          to: '/student/explore',
          label: 'Explore Stays',
          icon: Compass,
          activeIconClass: 'text-teal-300',
          activeIndicatorClass: 'bg-colin-teal',
          hoverIconClass: 'group-hover:text-colin-teal',
          hoverBgClass: 'hover:bg-teal-50/80',
        },
        {
          to: '/student/saved',
          label: 'Saved Stays',
          icon: Bookmark,
          badge: wishlist.length > 0 ? wishlist.length : undefined,
          activeIconClass: 'text-rose-400',
          activeIndicatorClass: 'bg-rose-500',
          hoverIconClass: 'group-hover:text-rose-500',
          hoverBgClass: 'hover:bg-rose-50/80',
          badgeBgClass: 'bg-rose-500',
        },
        {
          to: '/student/compare',
          label: 'Compare',
          icon: Scale,
          badge: comparisonList.length > 0 ? `${comparisonList.length}/3` : undefined,
          activeIconClass: 'text-amber-400',
          activeIndicatorClass: 'bg-colin-orange',
          hoverIconClass: 'group-hover:text-amber-500',
          hoverBgClass: 'hover:bg-amber-50/80',
          badgeBgClass: 'bg-amber-500',
        },
      ],
    },
    {
      title: 'MY ACTIVITY',
      items: [
        {
          to: '/student/visits',
          label: 'My Visits',
          icon: CalendarCheck,
          badge: upcomingVisitsCount > 0 ? upcomingVisitsCount : undefined,
          activeIconClass: 'text-blue-400',
          activeIndicatorClass: 'bg-blue-500',
          hoverIconClass: 'group-hover:text-blue-500',
          hoverBgClass: 'hover:bg-blue-50/80',
          badgeBgClass: 'bg-blue-500',
        },
        {
          to: '/student/profile',
          label: 'My Profile',
          icon: UserRound,
          activeIconClass: 'text-violet-400',
          activeIndicatorClass: 'bg-violet-500',
          hoverIconClass: 'group-hover:text-violet-500',
          hoverBgClass: 'hover:bg-violet-50/80',
        },
      ],
    },
    {
      title: 'STUDENT SERVICES',
      items: [
        {
          to: '/student/living',
          label: 'COLIN Living',
          icon: Sparkles,
          activeIconClass: 'text-purple-400',
          activeIndicatorClass: 'bg-purple-500',
          hoverIconClass: 'group-hover:text-purple-500',
          hoverBgClass: 'hover:bg-purple-50/80',
        },
        {
          to: '/student/tiffin-connect',
          label: 'TiffinConnect',
          icon: Utensils,
          activeIconClass: 'text-amber-400',
          activeIndicatorClass: 'bg-amber-500',
          hoverIconClass: 'group-hover:text-amber-500',
          hoverBgClass: 'hover:bg-amber-50/80',
        },
        {
          to: '/student/premium',
          label: 'Student Premium',
          icon: Crown,
          highlightBadge: premiumSubscription?.active ? 'ACTIVE' : 'PRO',
          activeIconClass: 'text-yellow-400',
          activeIndicatorClass: 'bg-yellow-400',
          hoverIconClass: 'group-hover:text-yellow-500',
          hoverBgClass: 'hover:bg-yellow-50/80',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-colin-offwhite flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-colin-charcoal-200 px-4 py-3 flex items-center justify-between">
        <Link to="/student/dashboard" className="flex items-center gap-2">
          <img src="/assets/colin-logo.png" alt="COLIN" className="h-7 w-auto object-contain" />
          <div className="flex items-center">
            <span className="font-black text-colin-navy text-base leading-none">COLIN</span>
            <span className="text-[9px] uppercase font-bold text-colin-teal ml-1.5 px-1.5 py-0.5 rounded bg-colin-teal/10">
              Student
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {comparisonList.length > 0 && (
            <Link
              to="/student/compare"
              className="text-xs bg-colin-teal text-white font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm"
              aria-label="View Comparison"
            >
              <Scale size={13} />
              <span>{comparisonList.length}</span>
            </Link>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-colin-charcoal-700 hover:bg-colin-charcoal-100 transition-colors"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-colin-navy-950/70 backdrop-blur-sm animate-fadeIn"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 max-w-[85%] h-full bg-white shadow-2xl p-5 flex flex-col justify-between animate-slideInLeft overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-5">
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-3 border-b border-colin-charcoal-100">
                <div className="flex items-center gap-2.5">
                  <img src="/assets/colin-logo.png" alt="COLIN" className="h-8 w-auto object-contain" />
                  <div>
                    <div className="font-black text-colin-navy text-base leading-tight">COLIN.</div>
                    <div className="text-[10px] uppercase font-bold text-colin-teal">Student Workspace</div>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                  aria-label="Close Navigation"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Student info */}
              <div className="p-3 bg-colin-navy-50/70 rounded-2xl flex items-center gap-3 border border-colin-navy-100">
                <img
                  src={studentPreferences.avatar || user?.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=100&q=80'}
                  alt={user?.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-colin-teal"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-colin-navy truncate">{user?.name || studentPreferences.fullName}</p>
                  <p className="text-[10px] text-colin-charcoal-500 truncate">{studentPreferences.university || user?.university}</p>
                </div>
              </div>

              {/* Mobile Grouped Links */}
              <nav className="space-y-4">
                {navGroups.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <div className="px-3 text-[10px] uppercase font-black tracking-wider text-colin-charcoal-400">
                      {group.title}
                    </div>

                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                              isActive
                                ? 'bg-colin-navy text-white shadow-sm'
                                : `text-colin-charcoal-700 ${item.hoverBgClass} hover:text-colin-navy`
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <div className="flex items-center gap-2.5">
                                <Icon
                                  size={16}
                                  className={`shrink-0 transition-colors duration-200 ${
                                    isActive ? item.activeIconClass : `text-slate-500 ${item.hoverIconClass}`
                                  }`}
                                />
                                <span>{item.label}</span>
                              </div>
                              {item.badge && (
                                <span className={`text-[10px] text-white font-extrabold px-1.5 py-0.5 rounded-full ${item.badgeBgClass || 'bg-colin-teal'}`}>
                                  {item.badge}
                                </span>
                              )}
                              {item.highlightBadge && (
                                <span
                                  className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                    item.highlightBadge === 'ACTIVE'
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-colin-orange text-colin-navy-950 font-extrabold'
                                  }`}
                                >
                                  {item.highlightBadge}
                                </span>
                              )}
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </div>

            {/* Mobile Footer Actions */}
            <div className="pt-4 border-t border-colin-charcoal-100 space-y-2 mt-4">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-xs font-bold text-colin-charcoal-600 hover:text-colin-navy py-2.5 px-3 rounded-xl flex items-center gap-2 hover:bg-slate-100 transition-colors"
              >
                <House size={15} className="text-slate-400" />
                <span>Public Homepage</span>
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="w-full text-xs font-bold text-rose-600 hover:bg-rose-50 py-2.5 px-3 rounded-xl flex items-center gap-2 transition-colors"
              >
                <LogOut size={15} className="text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Redesigned Collapsible Sidebar (Fixed to viewport) */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-slate-200/80 shrink-0 fixed top-0 left-0 bottom-0 h-screen transition-all duration-300 ease-in-out z-30 ${
          isCollapsed ? 'w-20' : 'w-64 lg:w-72'
        }`}
      >
        {/* Top Header / Branding & Collapse Toggle */}
        <div className={`border-b border-slate-100 flex items-center ${isCollapsed ? 'flex-col justify-center p-3 gap-1.5' : 'justify-between p-4'}`}>
          {!isCollapsed ? (
            <Link to="/" className="flex items-center gap-2.5 group focus:outline-none">
              <div className="relative">
                <img
                  src="/assets/colin-logo.png"
                  alt="COLIN Logo"
                  className="h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-colin-teal rounded-full border-2 border-white" />
              </div>
              <div className="flex flex-col">
                <div className="text-lg font-black text-colin-navy tracking-tight font-display flex items-center">
                  COLIN<span className="text-colin-orange text-xl leading-none">.</span>
                </div>
                <div className="text-[9px] uppercase font-bold tracking-wider text-colin-teal flex items-center gap-1">
                  <ShieldCheck size={10} />
                  <span>Student Portal</span>
                </div>
              </div>
            </Link>
          ) : (
            <Link to="/" className="group focus:outline-none flex flex-col items-center justify-center py-0.5 text-center" title="COLIN Student Portal">
              <img
                src="/assets/colin-logo.png"
                alt="COLIN"
                className="h-7 w-auto object-contain transition-transform group-hover:scale-110"
              />
              <span className="text-[11px] font-black tracking-tight text-colin-navy font-display mt-0.5 leading-none">
                COLIN<span className="text-colin-orange">.</span>
              </span>
            </Link>
          )}

          {/* Collapse/Expand Toggle Button */}
          <button
            onClick={toggleCollapse}
            className={`p-1.5 rounded-xl text-slate-400 hover:text-colin-navy hover:bg-slate-100 transition-colors ${
              isCollapsed ? 'mt-1' : ''
            }`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Student Profile Card (Shown in Expanded State) */}
        {!isCollapsed && (
          <div className="p-3.5 mx-3 mt-3 rounded-2xl bg-gradient-to-r from-colin-navy-50/70 to-colin-offwhite border border-colin-navy-100/60">
            <div className="flex items-center gap-3">
              <img
                src={studentPreferences.avatar || user?.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=100&q=80'}
                alt={user?.name}
                className="w-9 h-9 rounded-full object-cover border-2 border-colin-teal shrink-0 shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-colin-navy truncate">
                  {user?.name || studentPreferences.fullName}
                </div>
                <div className="text-[10px] text-colin-charcoal-500 truncate">
                  {studentPreferences.university || user?.university}
                </div>
                {premiumSubscription?.active ? (
                  <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-amber-700 bg-amber-100/90 px-1.5 py-0.2 rounded mt-0.5 border border-amber-300">
                    <Crown size={8} /> Premium
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase text-colin-teal bg-colin-teal/10 px-1.5 py-0.2 rounded mt-0.5">
                    Verified Scholar
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Groupings (No visible scrollbar in collapsed state) */}
        <nav
          className={`flex-1 overflow-y-auto no-scrollbar transition-all ${
            isCollapsed ? 'p-2 space-y-2.5' : 'p-2.5 space-y-4'
          }`}
        >
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-0.5">
              {!isCollapsed && (
                <div className="px-3 py-1 text-[9px] uppercase font-black tracking-wider text-colin-charcoal-400">
                  {group.title}
                </div>
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `relative group flex items-center rounded-xl text-xs font-bold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-colin-teal ${
                        isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2'
                      } ${
                        isActive
                          ? 'bg-colin-navy text-white shadow-sm'
                          : `text-colin-charcoal-600 ${item.hoverBgClass} hover:text-colin-navy`
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active Accent Bar on left in collapsed state */}
                        {isActive && isCollapsed && (
                          <span className={`absolute left-0 top-2 bottom-2 w-1.5 ${item.activeIndicatorClass} rounded-r-full shadow-sm`} />
                        )}

                        <div className="flex items-center gap-2.5">
                          <Icon
                            size={17}
                            className={`shrink-0 transition-colors duration-200 ${
                              isActive ? item.activeIconClass : `text-slate-500 ${item.hoverIconClass}`
                            }`}
                          />
                          {!isCollapsed && <span>{item.label}</span>}
                        </div>

                        {/* Badges in expanded state */}
                        {!isCollapsed && (
                          <div className="flex items-center gap-1.5">
                            {item.badge && (
                              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full text-white shadow-sm ${item.badgeBgClass || 'bg-colin-teal'}`}>
                                {item.badge}
                              </span>
                            )}
                            {item.highlightBadge && (
                              <span
                                className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                  item.highlightBadge === 'ACTIVE'
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-colin-orange text-colin-navy-950 font-extrabold'
                                }`}
                              >
                                {item.highlightBadge}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Floating Tooltip in collapsed state */}
                        {isCollapsed && (
                          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-colin-navy text-white text-[11px] font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 flex items-center gap-2">
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className={`text-[9px] text-white px-1.5 py-0.2 rounded-full ${item.badgeBgClass || 'bg-colin-teal'}`}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Actions: Public Homepage & Sign Out */}
        <div className="p-3 border-t border-slate-100 space-y-1">
          <Link
            to="/"
            className={`relative group flex items-center text-xs font-bold text-colin-charcoal-600 hover:text-colin-navy rounded-xl hover:bg-slate-100 transition-colors ${
              isCollapsed ? 'justify-center p-2.5' : 'p-2.5 justify-between'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <House size={16} className="text-slate-400 group-hover:text-colin-navy shrink-0 transition-colors" />
              {!isCollapsed && <span>Public Homepage</span>}
            </span>
            {isCollapsed && (
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-colin-navy text-white text-[11px] font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                Public Homepage
              </div>
            )}
          </Link>

          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className={`relative group flex items-center text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors w-full ${
              isCollapsed ? 'justify-center p-2.5' : 'p-2.5 justify-between'
            }`}
            title="Sign Out of Student Account"
          >
            <span className="flex items-center gap-2.5">
              <LogOut size={16} className="text-rose-500 group-hover:text-rose-600 shrink-0 transition-colors" />
              {!isCollapsed && <span>Sign Out</span>}
            </span>
            {isCollapsed && (
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-rose-950 text-white text-[11px] font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                Sign Out
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main Dynamic Content Area (Offset by fixed sidebar on md+ screens) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isCollapsed ? 'md:pl-20' : 'md:pl-64 lg:md:pl-72'
        }`}
      >
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Floating Accommodation Journey Widget */}
      <FloatingJourneyWidget />
    </div>
  );
};
