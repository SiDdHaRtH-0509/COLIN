/**
 * COLIN Admin Control Centre — Route Protection & RBAC Guard
 * Phase 4A: Server-Verified Administrative Gateway
 */

import React from 'react';
import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { AdminPermission } from '../../types/admin';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

interface AdminProtectedRouteProps {
  requiredPermission?: AdminPermission;
  children?: React.ReactNode;
}

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({
  requiredPermission,
  children,
}) => {
  const { isAuthenticated, isLoading, admin, hasPermission } = useAdminAuth();
  const location = useLocation();

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-colin-navy-950 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-12 h-12 rounded-xl border-2 border-colin-teal/20 border-t-colin-teal animate-spin mb-4" />
        <span className="text-sm font-semibold tracking-wide text-colin-teal-300">
          COLIN Security Verification
        </span>
        <span className="text-xs text-colin-charcoal-400 mt-1">
          Validating administrative session & privileges...
        </span>
      </div>
    );
  }

  // 2. Unauthenticated State: Redirect to dedicated /admin/login
  if (!isAuthenticated || !admin) {
    return (
      <Navigate
        to={`/admin/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  // 3. Permission Verification (RBAC Enforcement)
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen bg-colin-navy-950 flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full bg-colin-navy-900 border border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={28} />
          </div>
          
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-red-500/10 text-red-400 border border-red-500/20 mb-3">
            <Lock size={12} /> 403 Forbidden
          </span>

          <h2 className="text-xl font-bold text-white mb-2 font-display">
            Restricted Administrative Resource
          </h2>
          
          <p className="text-xs sm:text-sm text-colin-charcoal-300 mb-6 leading-relaxed">
            Your assigned role <span className="text-colin-teal-300 font-semibold">({admin.role})</span> lacks the required privilege <code className="bg-colin-navy-950 px-2 py-0.5 rounded text-colin-orange text-xs border border-colin-navy-700">{requiredPermission}</code> to access this department.
          </p>

          <div className="p-3 bg-colin-navy-950/60 rounded-xl border border-colin-navy-800 text-left text-xs text-colin-charcoal-400 mb-6 space-y-1">
            <div className="flex justify-between">
              <span>Admin Identity:</span>
              <span className="text-white font-mono">{admin.email}</span>
            </div>
            <div className="flex justify-between">
              <span>Department:</span>
              <span className="text-white">{admin.department}</span>
            </div>
          </div>

          <Link
            to="/admin"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-colin-teal hover:bg-colin-teal-600 text-white font-semibold text-sm transition-colors shadow-sm"
          >
            <ArrowLeft size={16} /> Return to Operations Overview
          </Link>
        </div>
      </div>
    );
  }

  // 4. Authorized
  return children ? <>{children}</> : <Outlet />;
};
