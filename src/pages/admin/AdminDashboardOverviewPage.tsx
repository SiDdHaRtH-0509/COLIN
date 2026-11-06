/**
 * COLIN Admin Control Centre — Operational Overview Dashboard
 * Phase 4A: Real Operational KPIs, Audit Activity Stream & Triage Queues
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { AdminApiClient } from '../../services/admin/adminApiClient';
import { AdminMetricsSummary, AdminAuditLogEntry } from '../../types/admin';
import {
  Users,
  Building,
  Home,
  CheckCircle2,
  CalendarDays,
  UserCheck,
  IndianRupee,
  Activity,
  AlertTriangle,
  FileText,
  RefreshCw,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

export const AdminDashboardOverviewPage: React.FC = () => {
  const { admin, session } = useAdminAuth();

  const [metrics, setMetrics] = useState<AdminMetricsSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [metricsRes, logsRes] = await Promise.all([
        AdminApiClient.getMetrics(),
        AdminApiClient.getAuditLogs(15),
      ]);

      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data);
      }
      if (logsRes.success && logsRes.data) {
        setAuditLogs(logsRes.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve administrative metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in-up">
      {/* ------------------------------------------------------------- */}
      {/* Top Welcome & Operational Status Banner                       */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-colin-navy-950 text-white rounded-2xl p-6 sm:p-8 border border-colin-navy-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-colin-teal/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-colin-teal/15 border border-colin-teal/30 text-colin-teal-300 text-xs font-semibold">
              <ShieldCheck size={14} />
              <span>COLIN Central Operations Headquarters</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white">
              Welcome, {admin?.name || 'Administrator'}
            </h2>
            <p className="text-xs sm:text-sm text-colin-charcoal-300 leading-relaxed">
              Operating as <span className="text-white font-semibold">{admin?.role}</span> in{' '}
              <span className="text-colin-teal-300 font-semibold">{admin?.department}</span>. All actions are cryptographically authenticated and appended to the immutable security ledger.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-colin-navy-800 hover:bg-colin-navy-700 text-white text-xs font-semibold border border-colin-navy-700 transition-colors flex items-center gap-2 shadow-xs"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh Metrics</span>
            </button>
            <div className="px-3.5 py-2 rounded-xl bg-colin-navy-900 border border-colin-navy-700 text-[11px] text-colin-charcoal-300">
              Session active until:{' '}
              <span className="text-colin-orange font-mono">
                {session?.expiresAt ? new Date(session.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '8h'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 flex items-center gap-2 text-xs">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8 Primary Operational KPI Cards                               */}
      {/* ------------------------------------------------------------- */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-colin-navy font-display flex items-center gap-2">
            <Activity size={16} className="text-colin-teal" />
            Operational Vital Indicators
          </h3>
          <span className="text-xs text-colin-charcoal-500 font-medium">
            Synchronized with Central Business Store
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Students */}
          <div className="bg-white rounded-xl p-5 border border-colin-charcoal-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-colin-charcoal-500">
                Total Students
              </span>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Users size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-colin-navy font-display">
                {isLoading ? '—' : metrics?.totalStudents ?? 0}
              </span>
              <span className="text-xs text-colin-charcoal-400">Registered Accounts</span>
            </div>
          </div>

          {/* 2. Total Owners */}
          <div className="bg-white rounded-xl p-5 border border-colin-charcoal-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-colin-charcoal-500">
                Total Owners
              </span>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Building size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-colin-navy font-display">
                {isLoading ? '—' : metrics?.totalOwners ?? 0}
              </span>
              <span className="text-xs text-colin-charcoal-400">Property Hosts</span>
            </div>
          </div>

          {/* 3. Total Properties */}
          <div className="bg-white rounded-xl p-5 border border-colin-charcoal-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-colin-charcoal-500">
                Total Properties
              </span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Home size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-colin-navy font-display">
                {isLoading ? '—' : metrics?.totalProperties ?? 0}
              </span>
              <span className="text-xs text-colin-charcoal-400">Platform Inventory</span>
            </div>
          </div>

          {/* 4. Pending Verifications */}
          <div className="bg-white rounded-xl p-5 border border-colin-charcoal-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-colin-charcoal-500">
                Pending Verifications
              </span>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-colin-orange font-display">
                {isLoading ? '—' : metrics?.pendingPropertyVerifications ?? 0}
              </span>
              <span className="text-xs text-amber-600 font-medium">Awaiting Audit</span>
            </div>
          </div>

          {/* 5. Pending Visit Requests */}
          <div className="bg-white rounded-xl p-5 border border-colin-charcoal-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-colin-charcoal-500">
                Pending Visits
              </span>
              <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600">
                <CalendarDays size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-colin-navy font-display">
                {isLoading ? '—' : metrics?.pendingVisitRequests ?? 0}
              </span>
              <span className="text-xs text-cyan-700 font-medium">Mediation Queue</span>
            </div>
          </div>

          {/* 6. Completed Visits */}
          <div className="bg-white rounded-xl p-5 border border-colin-charcoal-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-colin-charcoal-500">
                Completed Visits
              </span>
              <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                <UserCheck size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-colin-teal font-display">
                {isLoading ? '—' : metrics?.completedVisits ?? 0}
              </span>
              <span className="text-xs text-colin-charcoal-400">Inspected by Guides</span>
            </div>
          </div>

          {/* 7. Active Volunteers */}
          <div className="bg-white rounded-xl p-5 border border-colin-charcoal-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-colin-charcoal-500">
                Active Volunteers
              </span>
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Users size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-purple-700 font-display">
                {isLoading ? '—' : metrics?.activeVolunteers ?? 0}
              </span>
              <span className="text-xs text-colin-charcoal-400">Campus Guides</span>
            </div>
          </div>

          {/* 8. Total Platform Revenue */}
          <div className="bg-white rounded-xl p-5 border border-colin-charcoal-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-colin-charcoal-500">
                Platform Revenue
              </span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <IndianRupee size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700 font-display">
                ₹{isLoading ? '—' : (metrics?.totalPlatformRevenue ?? 0).toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-colin-charcoal-400">Realized Gross</span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2-Column Operational Grid: Activity Feed & Triage Queues       */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column (2 Cols): Pending Triage & Operational Previews */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Operational Tasks Triage */}
          <div className="bg-white rounded-2xl p-6 border border-colin-charcoal-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-colin-charcoal-100 mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-colin-orange" />
                <h3 className="font-bold text-colin-navy font-display text-sm">
                  Priority Operational Tasks
                </h3>
              </div>
              <span className="text-xs text-colin-charcoal-400 font-medium">Needs Attention</span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-colin-offwhite border border-colin-charcoal-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-colin-orange" />
                  <div>
                    <span className="text-xs font-bold text-colin-navy block">
                      Physical Inspection Review
                    </span>
                    <span className="text-[11px] text-colin-charcoal-500">
                      Properties waiting for volunteer checklist validation & score review
                    </span>
                  </div>
                </div>
                <Link
                  to="/admin/verification"
                  className="px-3 py-1.5 rounded-lg bg-white border border-colin-charcoal-300 text-colin-navy text-xs font-semibold hover:border-colin-teal hover:text-colin-teal transition-colors"
                >
                  Review Queue
                </Link>
              </div>

              <div className="p-3.5 rounded-xl bg-colin-offwhite border border-colin-charcoal-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-colin-teal" />
                  <div>
                    <span className="text-xs font-bold text-colin-navy block">
                      Student Visit Coordination
                    </span>
                    <span className="text-[11px] text-colin-charcoal-500">
                      Unassigned visit slots requiring volunteer dispatching
                    </span>
                  </div>
                </div>
                <Link
                  to="/admin/visits"
                  className="px-3 py-1.5 rounded-lg bg-white border border-colin-charcoal-300 text-colin-navy text-xs font-semibold hover:border-colin-teal hover:text-colin-teal transition-colors"
                >
                  Coordinate
                </Link>
              </div>

              <div className="p-3.5 rounded-xl bg-colin-offwhite border border-colin-charcoal-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <div>
                    <span className="text-xs font-bold text-colin-navy block">
                      Subscription Invoice Reconciliations
                    </span>
                    <span className="text-[11px] text-colin-charcoal-500">
                      Monthly PRO & PREMIUM owner plan settlement monitoring
                    </span>
                  </div>
                </div>
                <Link
                  to="/admin/finance"
                  className="px-3 py-1.5 rounded-lg bg-white border border-colin-charcoal-300 text-colin-navy text-xs font-semibold hover:border-colin-teal hover:text-colin-teal transition-colors"
                >
                  Finance Ledgers
                </Link>
              </div>
            </div>
          </div>

          {/* Verification Queue Preview */}
          <div className="bg-white rounded-2xl p-6 border border-colin-charcoal-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-colin-charcoal-100 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-colin-teal" />
                <h3 className="font-bold text-colin-navy font-display text-sm">
                  Verification Queue Preview
                </h3>
              </div>
              <Link
                to="/admin/verification"
                className="text-xs font-semibold text-colin-teal hover:text-colin-teal-700 flex items-center gap-1"
              >
                <span>View Full Queue</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            <div className="p-4 bg-colin-offwhite rounded-xl border border-colin-charcoal-200 text-center">
              <span className="text-xs font-semibold text-colin-charcoal-600 block mb-1">
                Centralized Property Certification Pipeline Active
              </span>
              <p className="text-[11px] text-colin-charcoal-400 max-w-md mx-auto">
                Properties undergoing 3-stage validation (Fire Safety, Food Hygiene, and Biometric Security audits).
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Live Audit Trail & Security Health */}
        <div className="space-y-6">
          {/* Security & Zero-Trust Health Monitor */}
          <div className="bg-white rounded-2xl p-6 border border-colin-charcoal-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-colin-charcoal-100 mb-4">
              <h3 className="font-bold text-colin-navy font-display text-sm flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" />
                Security Governance
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Compliant
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-colin-charcoal-100">
                <span className="text-colin-charcoal-500">Authentication Protocol:</span>
                <span className="font-semibold text-colin-navy">PBKDF2/SHA-256 + Salt</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-colin-charcoal-100">
                <span className="text-colin-charcoal-500">Session Isolation:</span>
                <span className="font-semibold text-colin-navy">Strict Dedicated Context</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-colin-charcoal-100">
                <span className="text-colin-charcoal-500">Least-Privilege RBAC:</span>
                <span className="font-semibold text-emerald-600">Server Enforced (403)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-colin-charcoal-100">
                <span className="text-colin-charcoal-500">Brute-Force Rate Limiting:</span>
                <span className="font-semibold text-emerald-600">5-Attempt Lockout Active</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-colin-charcoal-500">Audit Logging Engine:</span>
                <span className="font-semibold text-colin-teal">Immutable Append-Only</span>
              </div>
            </div>
          </div>

          {/* Recent Administrative Activity (Audit Log) */}
          <div className="bg-white rounded-2xl p-6 border border-colin-charcoal-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-colin-charcoal-100 mb-4">
              <h3 className="font-bold text-colin-navy font-display text-sm flex items-center gap-2">
                <FileText size={16} className="text-colin-teal" />
                Recent Audit Trail
              </h3>
              <span className="text-[10px] text-colin-charcoal-400">Latest actions</span>
            </div>

            {auditLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-colin-charcoal-400">
                No recent administrative activity recorded.
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs.slice(0, 6).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-colin-offwhite border border-colin-charcoal-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-colin-navy truncate text-[11px]">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-colin-charcoal-400 shrink-0 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-colin-charcoal-500">
                      <span className="truncate">{log.adminEmail}</span>
                      <span className="font-semibold text-colin-teal shrink-0">
                        {log.adminRole}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
