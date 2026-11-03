import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProperties } from '../../context/PropertyContext';
import {
  LayoutDashboard,
  Building2,
  BedDouble,
  MessageSquareText,
  CalendarCheck,
  ShieldCheck,
  TrendingUp,
  Crown,
  BarChart3,
  Settings,
  PlusCircle,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Bell,
  Zap,
  GraduationCap,
  House,
} from 'lucide-react';
import { Button } from '../common/Button';

export const OwnerLayout: React.FC = () => {
  const { user, isAuthenticated, logout, demoLogin } = useAuth();
  const {
    ownerProperties,
    rooms,
    enquiries,
    visits,
    subscription,
    ownerProfile,
  } = useProperties();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('colin_owner_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const location = useLocation();
  const navigate = useNavigate();

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('colin_owner_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  // Derived counts for sidebar badges
  const newEnquiriesCount = enquiries.filter((e) => e.status === 'New').length;
  const pendingVisitsCount = visits.filter((v) => v.status === 'Pending').length;
  const totalAvailableBeds = rooms.reduce((acc, r) => acc + (r.status === 'available' ? r.availableBeds : 0), 0);
  const activeCertifiedCount = ownerProperties.filter((p) => p.isColinCertified).length;

  // Unauthenticated Guard
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-colin-navy-950 via-colin-navy to-colin-navy-900 flex items-center justify-center p-4 sm:p-6 text-white relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-colin-teal/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-colin-orange/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-white text-colin-charcoal rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200 shadow-2xl space-y-6 animate-scaleUp">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-colin-navy-50 text-colin-navy flex items-center justify-center mx-auto border border-colin-navy-100 shadow-inner">
              <Building2 size={32} className="text-colin-orange" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-colin-orange uppercase tracking-wider bg-colin-orange/10 px-3 py-0.5 rounded-full">
                Property Host & Landlord Portal
              </span>
              <h1 className="text-2xl font-black text-colin-navy font-display">
                Sign In to Owner Portal
              </h1>
              <p className="text-xs text-colin-charcoal-500 leading-relaxed">
                Manage your student accommodations, track bed occupancy in real-time, review in-person inspection reports, and connect with verified scholars.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              variant="accent"
              size="md"
              className="w-full justify-center font-bold text-xs py-3 bg-colin-teal hover:bg-colin-teal-600 text-white shadow-brand-teal"
              onClick={() => {
                demoLogin('owner');
                navigate('/owner/dashboard');
              }}
              rightIcon={<Zap size={16} className="text-colin-orange fill-colin-orange" />}
            >
              Demo Owner Login (Col. Rajesh Sharma)
            </Button>

            <Link to={`/login?redirect=${encodeURIComponent('/owner/dashboard')}`} className="block">
              <Button variant="outline" size="md" className="w-full justify-center font-bold text-xs py-2.5">
                Sign In with Credentials
              </Button>
            </Link>

            <Link to={`/signup?role=owner&redirect=${encodeURIComponent('/owner/dashboard')}`} className="block">
              <Button variant="ghost" size="sm" className="w-full justify-center text-xs font-semibold text-colin-charcoal-600">
                Register New Host Account
              </Button>
            </Link>
          </div>

          <div className="pt-3 border-t border-colin-charcoal-100 text-center">
            <Link to="/" className="text-xs text-colin-charcoal-500 hover:text-colin-navy font-semibold inline-flex items-center gap-1.5">
              <House size={13} />
              <span>Return to Public Homepage</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Student Account Role Mismatch Guard
  if (user?.role === 'student') {
    return (
      <div className="min-h-screen bg-colin-offwhite flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-xl space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
            <GraduationCap size={28} />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
              Student Scholar Account Detected
            </span>
            <h2 className="text-xl font-black text-colin-navy font-display">
              Owner Portal Access Restricted
            </h2>
            <p className="text-xs text-colin-charcoal-600 leading-relaxed">
              You are currently signed in as <strong>{user.name}</strong> with a Student Scholar account. The Owner Portal is reserved exclusively for verified property hosts, landlords, and hostel operators.
            </p>
          </div>

          <div className="p-3.5 bg-colin-navy-50 rounded-2xl border border-colin-navy-100 text-xs text-colin-charcoal-700 space-y-1">
            <p className="font-bold text-colin-navy">Switch to Property Host for testing:</p>
            <p className="text-[11px] text-colin-charcoal-500">
              You can instantly switch to the verified host account (Col. Rajesh Sharma) to explore Phase 3 property management, certification, and monetization features.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="primary"
              size="md"
              className="w-full justify-center text-xs font-bold"
              onClick={() => {
                demoLogin('owner');
                navigate('/owner/dashboard');
              }}
              rightIcon={<Zap size={14} className="text-colin-orange fill-colin-orange" />}
            >
              Switch to Demo Owner (Col. Rajesh Sharma)
            </Button>
            <Button
              variant="outline"
              size="md"
              className="w-full justify-center text-xs font-semibold"
              onClick={() => navigate('/student/dashboard')}
            >
              Return to Student Dashboard
            </Button>
            <Link to="/">
              <Button variant="ghost" size="sm" className="w-full justify-center text-xs text-colin-charcoal-500">
                Go to Public Homepage
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Navigation Items
  const navSections = [
    {
      group: 'OVERVIEW',
      items: [
        {
          to: '/owner/dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          accent: {
            iconColor: 'text-teal-600',
            activeBg: 'bg-teal-600 text-white shadow-sm',
            hoverBg: 'hover:bg-teal-50 hover:text-teal-900',
            indicator: 'bg-teal-500',
          },
        },
      ],
    },
    {
      group: 'PROPERTIES & INVENTORY',
      items: [
        {
          to: '/owner/properties',
          label: 'My Properties',
          icon: Building2,
          badge: ownerProperties.length,
          accent: {
            iconColor: 'text-colin-navy',
            activeBg: 'bg-colin-navy text-white shadow-sm',
            hoverBg: 'hover:bg-colin-navy-50 hover:text-colin-navy-950',
            indicator: 'bg-colin-navy',
          },
        },
        {
          to: '/owner/rooms',
          label: 'Rooms & Beds',
          icon: BedDouble,
          badge: totalAvailableBeds ? `${totalAvailableBeds} beds` : undefined,
          badgeColor: 'bg-colin-teal/15 text-colin-teal-700',
          accent: {
            iconColor: 'text-blue-600',
            activeBg: 'bg-blue-600 text-white shadow-sm',
            hoverBg: 'hover:bg-blue-50 hover:text-blue-900',
            indicator: 'bg-blue-500',
          },
        },
      ],
    },
    {
      group: 'LEADS & COORDINATION',
      items: [
        {
          to: '/owner/enquiries',
          label: 'Student Coordination',
          icon: MessageSquareText,
          badge: newEnquiriesCount > 0 ? newEnquiriesCount : undefined,
          badgeColor: 'bg-colin-orange text-white font-extrabold',
          accent: {
            iconColor: 'text-amber-600',
            activeBg: 'bg-amber-600 text-white shadow-sm',
            hoverBg: 'hover:bg-amber-50 hover:text-amber-900',
            indicator: 'bg-amber-500',
          },
        },
        {
          to: '/owner/visits',
          label: 'Visits & Bookings',
          icon: CalendarCheck,
          badge: pendingVisitsCount > 0 ? pendingVisitsCount : undefined,
          badgeColor: 'bg-emerald-600 text-white font-extrabold',
          accent: {
            iconColor: 'text-teal-600',
            activeBg: 'bg-teal-700 text-white shadow-sm',
            hoverBg: 'hover:bg-teal-50 hover:text-teal-900',
            indicator: 'bg-teal-600',
          },
        },
      ],
    },
    {
      group: 'TRUST & MONETISATION',
      items: [
        {
          to: '/owner/certification',
          label: 'COLIN Verification',
          icon: ShieldCheck,
          badge: activeCertifiedCount > 0 ? 'Certified' : 'Audit',
          badgeColor: activeCertifiedCount > 0 ? 'bg-colin-teal/15 text-colin-teal-700' : 'bg-amber-100 text-amber-800',
          accent: {
            iconColor: 'text-emerald-600',
            activeBg: 'bg-emerald-600 text-white shadow-sm',
            hoverBg: 'hover:bg-emerald-50 hover:text-emerald-900',
            indicator: 'bg-emerald-500',
          },
        },
        {
          to: '/owner/monetisation',
          label: 'Growth & Promotions',
          icon: TrendingUp,
          accent: {
            iconColor: 'text-orange-600',
            activeBg: 'bg-orange-600 text-white shadow-sm',
            hoverBg: 'hover:bg-orange-50 hover:text-orange-900',
            indicator: 'bg-orange-500',
          },
        },
      ],
    },
    {
      group: 'PLATFORM & SETTINGS',
      items: [
        {
          to: '/owner/subscription',
          label: 'Subscription',
          icon: Crown,
          badge: subscription.tier,
          badgeColor: 'bg-violet-100 text-violet-800 text-[9px] uppercase font-bold',
          accent: {
            iconColor: 'text-violet-600',
            activeBg: 'bg-violet-600 text-white shadow-sm',
            hoverBg: 'hover:bg-violet-50 hover:text-violet-900',
            indicator: 'bg-violet-500',
          },
        },
        {
          to: '/owner/analytics',
          label: 'Analytics & Revenue',
          icon: BarChart3,
          accent: {
            iconColor: 'text-indigo-600',
            activeBg: 'bg-indigo-600 text-white shadow-sm',
            hoverBg: 'hover:bg-indigo-50 hover:text-indigo-900',
            indicator: 'bg-indigo-500',
          },
        },
        {
          to: '/owner/settings',
          label: 'Business Settings',
          icon: Settings,
          accent: {
            iconColor: 'text-slate-600',
            activeBg: 'bg-slate-700 text-white shadow-sm',
            hoverBg: 'hover:bg-slate-100 hover:text-slate-900',
            indicator: 'bg-slate-500',
          },
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-colin-charcoal flex flex-col font-sans">
      
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-colin-charcoal-200/80 h-16 flex items-center justify-between px-4 sm:px-6 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-colin-navy hover:bg-colin-navy-50"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Brand Logo & Portal Tag */}
          <Link to="/owner/dashboard" className="flex items-center gap-2.5 group">
            <div className="relative">
              <img
                src="/assets/colin-logo.png"
                alt="COLIN Logo"
                className="h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-colin-orange rounded-full border border-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-colin-navy font-display leading-none">
                  COLIN
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-colin-navy text-white">
                  Host Portal
                </span>
              </div>
              <span className="text-[9px] text-colin-teal-700 font-bold uppercase tracking-wider">
                Partner & Inventory Suite
              </span>
            </div>
          </Link>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Add Property CTA Shortcut */}
          <Link to="/owner/properties">
            <Button
              variant="primary"
              size="sm"
              className="text-xs font-bold bg-colin-navy hover:bg-colin-navy-800 px-3 py-1.5 shadow-sm hidden sm:inline-flex"
              leftIcon={<PlusCircle size={14} className="text-colin-orange" />}
            >
              Add Property
            </Button>
          </Link>

          {/* Quick Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-xl text-colin-charcoal-600 hover:text-colin-navy hover:bg-colin-navy-50 relative transition-colors"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {(newEnquiriesCount > 0 || pendingVisitsCount > 0) && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-colin-orange rounded-full border-2 border-white animate-pulse" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-colin-charcoal-200 py-3 z-50 animate-fadeIn">
                <div className="px-4 pb-2 border-b border-colin-charcoal-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-colin-navy uppercase tracking-wider">
                    Recent Host Alerts
                  </span>
                  <span className="text-[10px] font-semibold text-colin-teal-700 bg-colin-teal/10 px-2 py-0.5 rounded-full">
                    Live Updates
                  </span>
                </div>
                <div className="divide-y divide-colin-charcoal-100 max-h-72 overflow-y-auto">
                  {newEnquiriesCount > 0 && (
                    <Link
                      to="/owner/enquiries"
                      className="p-3 hover:bg-colin-navy-50/50 block transition-colors space-y-1"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-colin-navy">
                        <MessageSquareText size={14} className="text-colin-orange shrink-0" />
                        <span>{newEnquiriesCount} New Student Enquiries</span>
                      </div>
                      <p className="text-[11px] text-colin-charcoal-500 line-clamp-1">
                        Students from DU SRCC and Hindu College have reached out regarding available beds.
                      </p>
                    </Link>
                  )}
                  {pendingVisitsCount > 0 && (
                    <Link
                      to="/owner/visits"
                      className="p-3 hover:bg-colin-navy-50/50 block transition-colors space-y-1"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-colin-navy">
                        <CalendarCheck size={14} className="text-emerald-600 shrink-0" />
                        <span>{pendingVisitsCount} In-Person Visits Awaiting Approval</span>
                      </div>
                      <p className="text-[11px] text-colin-charcoal-500 line-clamp-1">
                        Student paid ₹150 visit fee with 55% refund guarantee. Confirm slot.
                      </p>
                    </Link>
                  )}
                  <Link
                    to="/owner/certification"
                    className="p-3 hover:bg-colin-navy-50/50 block transition-colors space-y-1"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-colin-navy">
                      <ShieldCheck size={14} className="text-colin-teal shrink-0" />
                      <span>COLIN Certified Status Active</span>
                    </div>
                    <p className="text-[11px] text-colin-charcoal-500 line-clamp-1">
                      COLIN Heights audit score: 99/100 verified by Campus Inspector Kunal Singhania.
                    </p>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* View Public Site */}
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-colin-charcoal-600 hover:text-colin-navy hover:bg-colin-charcoal-100 px-2.5 py-1.5 rounded-xl transition-colors hidden md:inline-flex items-center gap-1.5"
          >
            <span>Live Site</span>
            <ExternalLink size={12} />
          </Link>

          {/* User Profile Avatar */}
          <Link to="/owner/settings" className="flex items-center gap-2 p-1 rounded-full hover:bg-colin-charcoal-100 transition-colors">
            <img
              src={ownerProfile.avatar || user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80'}
              alt={ownerProfile.ownerName}
              className="w-8 h-8 rounded-full object-cover border-2 border-colin-orange"
            />
          </Link>
        </div>
      </header>

      {/* Main Workspace with Sticky Sidebar & Naturally Scrolling Content */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Desktop Sticky Sidebar */}
        <aside
          className={`hidden md:flex flex-col border-r border-colin-charcoal-200/80 bg-white transition-all duration-300 sticky top-16 h-[calc(100vh-4rem)] z-20 shrink-0 ${
            isCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Collapse Toggle Button */}
          <button
            onClick={toggleCollapse}
            className="absolute -right-3 top-5 w-6 h-6 rounded-full bg-white border border-colin-charcoal-200 text-colin-charcoal-600 hover:text-colin-navy flex items-center justify-center shadow-sm z-30 transition-transform"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {/* Host Business Header Card */}
          <div className="p-4 border-b border-colin-charcoal-100 flex items-center gap-3 shrink-0">
            <img
              src={ownerProfile.avatar || user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80'}
              alt="Owner"
              className="w-10 h-10 rounded-2xl object-cover border border-colin-charcoal-200 shrink-0"
            />
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-colin-navy truncate font-display">
                  {ownerProfile.businessName}
                </div>
                <div className="text-[11px] text-colin-charcoal-500 truncate">
                  {ownerProfile.ownerName}
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-colin-teal/15 text-colin-teal-700">
                    Verified Host
                  </span>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-colin-navy text-white">
                    {subscription.tier}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links Grouping (Independently scrollable) */}
          <div className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
            {navSections.map((section) => (
              <div key={section.group} className="space-y-1">
                {!isCollapsed && (
                  <div className="px-3 text-[10px] font-black uppercase tracking-wider text-colin-charcoal-400">
                    {section.group}
                  </div>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative group ${
                            isActive
                              ? item.accent.activeBg
                              : `text-colin-charcoal-600 ${item.accent.hoverBg}`
                          } ${isCollapsed ? 'justify-center' : ''}`
                        }
                        title={isCollapsed ? item.label : undefined}
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <span
                                className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full ${item.accent.indicator}`}
                              />
                            )}
                            <Icon
                              size={17}
                              className={`shrink-0 transition-colors ${
                                isActive ? 'text-white' : item.accent.iconColor
                              }`}
                            />
                            {!isCollapsed && (
                              <div className="flex-1 flex items-center justify-between min-w-0">
                                <span className="truncate">{item.label}</span>
                                {item.badge !== undefined && (
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                      item.badgeColor || (isActive ? 'bg-white/20 text-white' : 'bg-colin-charcoal-100 text-colin-charcoal-700')
                                    }`}
                                  >
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
              </div>
            ))}
          </div>

          {/* Bottom Footer Actions (Pinned) */}
          <div className="p-3 border-t border-colin-charcoal-100 space-y-2 shrink-0">
            {!isCollapsed && (
              <div className="bg-colin-navy-50/60 rounded-2xl p-2.5 border border-colin-navy-100 text-center space-y-1">
                <div className="text-[11px] font-bold text-colin-navy flex items-center justify-center gap-1">
                  <Crown size={12} className="text-colin-orange" />
                  <span>{subscription.tier} Plan Active</span>
                </div>
                <p className="text-[10px] text-colin-charcoal-500">
                  {subscription.propertyLimit === 999
                    ? 'Unlimited Properties'
                    : `Up to ${subscription.propertyLimit} properties`}
                </p>
                <Link to="/owner/subscription" className="text-[10px] text-colin-teal font-extrabold hover:underline block pt-0.5">
                  Manage Tier →
                </Link>
              </div>
            )}

            <button
              onClick={logout}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors ${
                isCollapsed ? 'justify-center' : ''
              }`}
              title="Sign Out"
            >
              <LogOut size={16} />
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-colin-navy-950/60 backdrop-blur-sm">
            <div className="w-72 bg-white h-full flex flex-col p-4 space-y-4 shadow-2xl animate-slideRight">
              <div className="flex items-center justify-between pb-3 border-b border-colin-charcoal-100">
                <div className="flex items-center gap-2">
                  <img src="/assets/colin-logo.png" alt="COLIN" className="h-7 w-auto" />
                  <span className="text-xs font-extrabold text-colin-navy uppercase">
                    Host Workspace
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-colin-charcoal-500 hover:text-colin-navy"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4">
                {navSections.map((section) => (
                  <div key={section.group} className="space-y-1">
                    <div className="text-[10px] font-black uppercase text-colin-charcoal-400">
                      {section.group}
                    </div>
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold ${
                              isActive
                                ? item.accent.activeBg
                                : `text-colin-charcoal-600 ${item.accent.hoverBg}`
                            }`
                          }
                        >
                          <Icon size={16} className={item.accent.iconColor} />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-colin-charcoal-100">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Route Content (natural document scroll, not trapped in nested container!) */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

    </div>
  );
};
