/**
 * COLIN Admin Control Centre — Enterprise Application Shell
 * Phase 4A: Fixed Responsive Sidebar, Top Navigation Bar & Administrative Layout
 */

import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  LayoutDashboard,
  Users,
  Building,
  Home,
  CheckCircle2,
  CalendarDays,
  IndianRupee,
  CreditCard,
  Megaphone,
  UserCheck,
  Headphones,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  ChevronRight as BreadcrumbSeparator,
  Sparkles,
  LucideIcon,
} from 'lucide-react';

interface AdminNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: string;
}

const NAV_ITEMS: AdminNavItem[] = [
  { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/owners', label: 'Owners', icon: Building },
  { to: '/admin/properties', label: 'Properties', icon: Home },
  { to: '/admin/verification', label: 'Verification', icon: CheckCircle2, badge: 'Queue', badgeColor: 'bg-colin-teal/20 text-colin-teal border-colin-teal/30' },
  { to: '/admin/visits', label: 'Visit Coordination', icon: CalendarDays },
  { to: '/admin/finance', label: 'Finance', icon: IndianRupee },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/admin/sponsorships', label: 'Sponsorships', icon: Megaphone },
  { to: '/admin/volunteers', label: 'Volunteers', icon: UserCheck },
  { to: '/admin/support', label: 'Support', icon: Headphones },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/system', label: 'System Administration', icon: Settings },
];

export const AdminLayout: React.FC = () => {
  const { admin, logout } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('colin_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('colin_admin_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  // Derive current page title from active path
  const currentNav = NAV_ITEMS.find(
    (item) =>
      location.pathname === item.to ||
      (item.to === '/admin/dashboard' && (location.pathname === '/admin' || location.pathname === '/admin/'))
  );
  const pageTitle = currentNav?.label || 'Control Centre';

  return (
    <div className="min-h-screen bg-colin-offwhite flex font-sans text-colin-charcoal antialiased">
      {/* ------------------------------------------------------------- */}
      {/* 1. Fixed Enterprise Left Sidebar (Desktop)                   */}
      {/* ------------------------------------------------------------- */}
      <aside
        className={`hidden md:flex flex-col fixed top-0 bottom-0 left-0 z-30 bg-colin-navy-950 text-white border-r border-colin-navy-800 transition-all duration-300 ease-in-out select-none ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Fixed Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-colin-navy-800 shrink-0">
          <Link to="/admin" className="flex items-center gap-3 overflow-hidden">
            <div className="relative shrink-0">
              <img
                src="/assets/colin-logo.png"
                alt="COLIN Logo"
                className="h-8 w-auto object-contain bg-white rounded-lg p-0.5"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-colin-teal rounded-full border border-colin-navy-950" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-base font-extrabold tracking-tight text-white flex items-center gap-1 font-display leading-none">
                  COLIN<span className="text-colin-orange">.</span>
                </span>
                <span className="text-[9px] uppercase font-bold tracking-widest text-colin-teal-300 block truncate mt-0.5">
                  Control Centre
                </span>
              </div>
            )}
          </Link>

          {/* Collapse/Expand Toggle */}
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="p-1.5 rounded-lg text-colin-charcoal-400 hover:text-white hover:bg-colin-navy-900 transition-colors"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-1 scrollbar-thin scrollbar-thumb-colin-navy-800">
          {!isCollapsed && (
            <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-colin-charcoal-400">
              Operations Headquarters
            </div>
          )}

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.to ||
              (item.to === '/admin/dashboard' && (location.pathname === '/admin' || location.pathname === '/admin/'));

            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={isCollapsed ? item.label : undefined}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                  isActive
                    ? 'bg-colin-teal text-white shadow-brand-teal'
                    : 'text-colin-charcoal-300 hover:text-white hover:bg-colin-navy-900'
                }`}
              >
                <Icon
                  size={18}
                  className={`shrink-0 transition-transform ${
                    isActive ? 'scale-105 text-white' : 'text-colin-charcoal-400 group-hover:text-colin-teal'
                  }`}
                />
                {!isCollapsed && (
                  <span className="truncate flex-1">{item.label}</span>
                )}
                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border uppercase tracking-wider ${
                      isActive ? 'bg-white/20 text-white border-white/30' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Fixed Bottom Profile & Logout Area */}
        <div className="p-3 border-t border-colin-navy-800 bg-colin-navy-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-colin-teal/20 border border-colin-teal/40 text-colin-teal flex items-center justify-center font-bold text-sm shrink-0">
              {admin?.name?.charAt(0) || 'A'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-white block truncate leading-tight">
                  {admin?.name || 'Administrator'}
                </span>
                <span className="text-[10px] text-colin-teal-300 font-medium block truncate">
                  {admin?.role}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              title="Secure Logout"
              className="p-1.5 rounded-lg text-colin-charcoal-400 hover:text-red-400 hover:bg-colin-navy-900 transition-colors shrink-0"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* 2. Responsive Mobile Drawer Navigation                       */}
      {/* ------------------------------------------------------------- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/70 backdrop-blur-sm flex">
          <div className="w-72 bg-colin-navy-950 text-white h-full flex flex-col border-r border-colin-navy-800 shadow-2xl animate-fade-in-up">
            <div className="h-16 px-4 flex items-center justify-between border-b border-colin-navy-800">
              <div className="flex items-center gap-2">
                <img src="/assets/colin-logo.png" alt="COLIN" className="h-8 bg-white rounded p-0.5" />
                <span className="text-base font-bold text-white font-display">COLIN Admin</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-colin-charcoal-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                      isActive ? 'bg-colin-teal text-white' : 'text-colin-charcoal-300 hover:bg-colin-navy-900'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

            <div className="p-4 border-t border-colin-navy-800 bg-colin-navy-900 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">{admin?.name}</span>
                <span className="text-[10px] text-colin-teal-300 block">{admin?.role}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-red-400 hover:bg-colin-navy-800"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. Main Workspace Area (Top Navigation + Content)             */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* Top Operational Navigation Bar */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-colin-charcoal-200/80 px-4 sm:px-6 flex items-center justify-between shadow-xs">
          {/* Left: Mobile Menu Trigger + Breadcrumb */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-colin-charcoal-600 hover:bg-colin-charcoal-100"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="font-semibold text-colin-charcoal-500 hidden sm:inline">
                Control Centre
              </span>
              <BreadcrumbSeparator size={14} className="text-colin-charcoal-400 hidden sm:inline" />
              <h1 className="text-base sm:text-lg font-bold text-colin-navy font-display">
                {pageTitle}
              </h1>
            </div>
          </div>

          {/* Right: Environment, Role Pill, Notifications & Quick Profile */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* System Status Pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Zero-Trust Active
            </div>

            {/* Department Role Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-colin-navy-50 border border-colin-navy-200 text-colin-navy text-xs font-semibold">
              <Shield size={13} className="text-colin-teal" />
              <span>{admin?.role || 'ADMIN'}</span>
            </div>

            {/* Notifications Trigger */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl text-colin-charcoal-600 hover:bg-colin-charcoal-100 transition-colors relative"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-colin-orange" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-colin-charcoal-200 rounded-2xl shadow-xl p-4 text-xs z-50 animate-fade-in-up">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-colin-charcoal-100 font-bold text-colin-navy">
                    <span>Operational Alerts</span>
                    <span className="text-[10px] text-colin-teal font-medium">Real-time</span>
                  </div>
                  <div className="space-y-2.5 text-colin-charcoal-600">
                    <div className="p-2 rounded-lg bg-colin-navy-50/60 border border-colin-navy-100 flex items-start gap-2">
                      <Sparkles size={14} className="text-colin-teal mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold block text-colin-navy">Admin Gateway Active</span>
                        Phase 4A Architecture & Security foundation initialized.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Profile Fast Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-colin-navy-900 hover:bg-colin-navy-800 text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
