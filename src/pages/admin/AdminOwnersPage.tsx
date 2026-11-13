/**
 * COLIN Admin Control Centre — Property Owners & Host Directory
 * Phase 4A / Final Acceptance: Live Centralized Owner Management Module
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Mail,
  Phone,
  Award,
  X,
} from 'lucide-react';
import { AdminApiClient, maskEmailAddress, maskPhoneNumber } from '../../services/admin/adminApiClient';
import { AdminOwner } from '../../types/admin';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AdminOwnersPage: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const canManageStatus = hasPermission('MANAGE_OWNER_TICKETS') || hasPermission('MANAGE_ADMIN_USERS');

  const [owners, setOwners] = useState<AdminOwner[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'STANDARD' | 'VERIFIED_PARTNER' | 'PREMIUM'>('ALL');
  const [revealedPii, setRevealedPii] = useState<Record<string, boolean>>({});
  const [selectedOwner, setSelectedOwner] = useState<AdminOwner | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const fetchOwners = async () => {
    setIsLoading(true);
    try {
      const res = await AdminApiClient.getOwners();
      if (res.success && Array.isArray(res.data)) {
        setOwners(res.data);
      } else {
        setOwners([]);
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Failed to load hosts directory.' });
      setOwners([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();

    // Listen for storage events (Cross-browser / cross-tab synchronization)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'colin_registered_users' || e.key === 'colin_all_properties') {
        fetchOwners();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleRevealPii = (id: string) => {
    setRevealedPii((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleStatus = async (owner: AdminOwner) => {
    if (!canManageStatus) {
      setFeedbackMessage({ type: 'error', text: 'You do not have administrative permission to modify owner statuses.' });
      return;
    }

    const nextStatus = owner.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    setActionLoading(owner.id);
    try {
      const res = await AdminApiClient.updateOwnerStatus(owner.id, nextStatus);
      if (res.success) {
        setFeedbackMessage({
          type: 'success',
          text: `Host ${owner.name} was successfully ${nextStatus === 'ACTIVE' ? 'reactivated' : 'suspended'}.`,
        });
        await fetchOwners();
        if (selectedOwner && selectedOwner.id === owner.id) {
          setSelectedOwner((prev) => (prev ? { ...prev, status: nextStatus } : null));
        }
      } else {
        setFeedbackMessage({ type: 'error', text: res.message || 'Status transition was rejected.' });
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Communication error with admin security gateway.' });
    } finally {
      setActionLoading(null);
    }
  };

  // Filtered & Paginated records
  const filteredOwners = useMemo(() => {
    return owners.filter((o) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        o.name.toLowerCase().includes(query) ||
        o.email.toLowerCase().includes(query) ||
        o.id.toLowerCase().includes(query) ||
        (o.businessName && o.businessName.toLowerCase().includes(query));

      const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
      const matchesTier = tierFilter === 'ALL' || o.tier === tierFilter;

      return matchesSearch && matchesStatus && matchesTier;
    });
  }, [owners, searchQuery, statusFilter, tierFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOwners.length / pageSize));
  const paginatedOwners = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOwners.slice(start, start + pageSize);
  }, [filteredOwners, currentPage, pageSize]);

  // Aggregate KPI metrics
  const totalCount = owners.length;
  const activeCount = owners.filter((o) => o.status === 'ACTIVE').length;
  const partnerCount = owners.filter((o) => o.tier === 'VERIFIED_PARTNER' || o.tier === 'PREMIUM').length;
  const totalPropertiesListed = owners.reduce((acc, o) => acc + (o.propertiesCount || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-colin-charcoal-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Building size={18} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Host Operations</span>
          </div>
          <h1 className="text-2xl font-black text-colin-navy font-display">Property Hosts & Owners Management</h1>
          <p className="text-xs text-colin-charcoal-500 mt-1">
            Central management of accommodation providers, business entities, inventory volume, and listing compliance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOwners}
            disabled={isLoading}
            className="px-4 py-2 bg-colin-offwhite hover:bg-colin-charcoal-100 text-colin-navy rounded-xl text-xs font-semibold border border-colin-charcoal-200 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Sync Hosts</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-colin-charcoal-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-colin-charcoal-500 block">Total Hosts</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-colin-navy font-display">{totalCount}</span>
            <span className="text-[11px] text-colin-charcoal-400">Registered Owners</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-colin-charcoal-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-colin-charcoal-500 block">Active Status</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600 font-display">{activeCount}</span>
            <span className="text-[11px] text-emerald-600 font-medium">Operating</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-colin-charcoal-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-colin-charcoal-500 block">Verified Partners</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-colin-teal font-display">{partnerCount}</span>
            <span className="text-[11px] text-colin-teal font-medium">Certified Tier</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-colin-charcoal-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-colin-charcoal-500 block">Total Properties</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-indigo-700 font-display">{totalPropertiesListed}</span>
            <span className="text-[11px] text-indigo-700 font-medium">In Inventory</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center gap-2 text-xs animate-fade-in-up ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-red-50 border border-red-200 text-red-600'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-colin-charcoal-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search host by name, email, identifier, or enterprise/business name..."
            className="w-full pl-10 pr-4 py-2 bg-colin-offwhite border border-colin-charcoal-200 rounded-xl text-xs text-colin-navy placeholder-colin-charcoal-400 focus:outline-none focus:border-colin-teal focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-colin-offwhite border border-colin-charcoal-200 rounded-xl p-1 text-xs">
            <button
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                statusFilter === 'ALL' ? 'bg-white text-colin-navy shadow-xs' : 'text-colin-charcoal-500'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => { setStatusFilter('ACTIVE'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                statusFilter === 'ACTIVE' ? 'bg-white text-emerald-600 shadow-xs' : 'text-colin-charcoal-500'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => { setStatusFilter('SUSPENDED'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                statusFilter === 'SUSPENDED' ? 'bg-white text-red-600 shadow-xs' : 'text-colin-charcoal-500'
              }`}
            >
              Suspended
            </button>
          </div>

          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-colin-offwhite border border-colin-charcoal-200 rounded-xl text-xs text-colin-navy font-semibold focus:outline-none focus:border-colin-teal"
          >
            <option value="ALL">All Tiers</option>
            <option value="STANDARD">Standard</option>
            <option value="VERIFIED_PARTNER">Verified Partner</option>
            <option value="PREMIUM">Premium</option>
          </select>
        </div>
      </div>

      {/* Owners Data Table */}
      <div className="bg-white rounded-2xl border border-colin-charcoal-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-colin-charcoal-400">
            <RefreshCw size={24} className="animate-spin text-colin-teal mx-auto mb-2" />
            <span>Synchronizing live host records...</span>
          </div>
        ) : paginatedOwners.length === 0 ? (
          <div className="p-12 text-center">
            <Building size={32} className="text-colin-charcoal-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-colin-navy">No Host Records Found</h3>
            <p className="text-xs text-colin-charcoal-500 max-w-sm mx-auto mt-1">
              {searchQuery
                ? `No host matching "${searchQuery}" was found. Try clearing your search filters.`
                : 'No property owner accounts registered yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-colin-offwhite border-b border-colin-charcoal-200 text-colin-charcoal-500 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Owner / Entity</th>
                  <th className="py-3 px-4">Contact (PII Protected)</th>
                  <th className="py-3 px-4">Tier & Plan</th>
                  <th className="py-3 px-4">Properties</th>
                  <th className="py-3 px-4">KYC Status</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-colin-charcoal-100">
                {paginatedOwners.map((owner) => {
                  const isRevealed = !!revealedPii[owner.id];
                  return (
                    <tr key={owner.id} className="hover:bg-colin-offwhite/50 transition-colors">
                      {/* Identity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center shrink-0 border border-indigo-100">
                            {owner.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-colin-navy block truncate">{owner.name}</span>
                            <span className="text-[10px] text-colin-charcoal-500 flex items-center gap-1 truncate">
                              <Briefcase size={10} />
                              {owner.businessName || 'Individual Partner'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact with PII Masking */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Mail size={12} className="text-colin-charcoal-400 shrink-0" />
                            <span className="font-mono text-colin-charcoal-700">
                              {isRevealed ? owner.email : maskEmailAddress(owner.email)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone size={12} className="text-colin-charcoal-400 shrink-0" />
                            <span className="font-mono text-colin-charcoal-700">
                              {isRevealed ? (owner.phone || '—') : maskPhoneNumber(owner.phone)}
                            </span>
                            <button
                              onClick={() => toggleRevealPii(owner.id)}
                              title={isRevealed ? 'Mask PII' : 'Unmask PII (Audited)'}
                              className="text-colin-teal hover:text-colin-teal-700 p-0.5"
                            >
                              {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Tier & Plan */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Award size={10} />
                            {owner.tier || 'STANDARD'}
                          </span>
                          <span className="text-[10px] text-colin-charcoal-400 block mt-0.5">
                            {owner.subscriptionPlan || 'Free Tier'}
                          </span>
                        </div>
                      </td>

                      {/* Properties Count */}
                      <td className="py-3.5 px-4">
                        <div className="text-[11px] text-colin-charcoal-600">
                          <span className="font-bold text-colin-navy">{owner.propertiesCount}</span> Total (
                          <span className="text-emerald-600 font-semibold">{owner.approvedPropertiesCount} verified</span>,{' '}
                          <span className="text-colin-orange font-semibold">{owner.submittedPropertiesCount} pending</span>)
                        </div>
                      </td>

                      {/* KYC Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            owner.verificationStatus === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : owner.verificationStatus === 'IN_REVIEW' || owner.verificationStatus === 'PENDING_DOCS'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-colin-charcoal-100 text-colin-charcoal-600 border-colin-charcoal-200'
                          }`}
                        >
                          {owner.verificationStatus === 'VERIFIED' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                          {owner.verificationStatus}
                        </span>
                      </td>

                      {/* Account Lifecycle Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            owner.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {owner.status === 'ACTIVE' ? <UserCheck size={11} /> : <UserX size={11} />}
                          {owner.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => setSelectedOwner(owner)}
                            className="px-2.5 py-1 bg-white border border-colin-charcoal-200 hover:border-colin-teal hover:text-colin-teal text-colin-navy rounded-lg font-semibold text-[11px] transition-colors"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => handleToggleStatus(owner)}
                            disabled={actionLoading === owner.id || !canManageStatus}
                            className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] border transition-colors ${
                              owner.status === 'SUSPENDED'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                            }`}
                          >
                            {actionLoading === owner.id ? (
                              <RefreshCw size={12} className="animate-spin inline" />
                            ) : owner.status === 'SUSPENDED' ? (
                              'Reactivate'
                            ) : (
                              'Suspend'
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!isLoading && filteredOwners.length > pageSize && (
          <div className="p-4 border-t border-colin-charcoal-200 flex items-center justify-between text-xs text-colin-charcoal-500 bg-white">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredOwners.length)} of {filteredOwners.length} hosts
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-colin-charcoal-200 hover:bg-colin-offwhite disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-bold text-colin-navy">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-colin-charcoal-200 hover:bg-colin-offwhite disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Owner Drawer / Modal */}
      {selectedOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in-up">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-colin-charcoal-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedOwner(null)}
              className="absolute top-5 right-5 text-colin-charcoal-400 hover:text-colin-navy"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-lg flex items-center justify-center">
                {selectedOwner.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-colin-navy font-display">{selectedOwner.name}</h3>
                <span className="text-xs text-colin-charcoal-400 font-mono">ID: {selectedOwner.id}</span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-colin-offwhite rounded-xl border border-colin-charcoal-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-colin-charcoal-500">Business Entity:</span>
                  <span className="font-semibold text-colin-navy">{selectedOwner.businessName || 'Individual Partner'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-colin-charcoal-500">Email Address:</span>
                  <span className="font-semibold text-colin-navy font-mono">{selectedOwner.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-colin-charcoal-500">Phone Number:</span>
                  <span className="font-semibold text-colin-navy font-mono">{selectedOwner.phone || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-colin-charcoal-500">Partner Tier:</span>
                  <span className="font-semibold text-indigo-700">{selectedOwner.tier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-colin-charcoal-500">Subscription:</span>
                  <span className="font-semibold text-colin-navy">{selectedOwner.subscriptionPlan || 'Free Tier'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-colin-charcoal-500">Registration Date:</span>
                  <span className="font-semibold text-colin-navy">
                    {new Date(selectedOwner.registeredAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-indigo-700 block">Total</span>
                  <span className="text-xl font-black text-colin-navy">{selectedOwner.propertiesCount}</span>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Verified</span>
                  <span className="text-xl font-black text-emerald-700">{selectedOwner.approvedPropertiesCount}</span>
                </div>
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-amber-700 block">Pending</span>
                  <span className="text-xl font-black text-colin-orange">{selectedOwner.submittedPropertiesCount}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-colin-charcoal-100">
                <button
                  onClick={() => setSelectedOwner(null)}
                  className="px-4 py-2 rounded-xl bg-colin-offwhite hover:bg-colin-charcoal-100 text-colin-navy font-semibold text-xs transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleToggleStatus(selectedOwner)}
                  disabled={actionLoading === selectedOwner.id || !canManageStatus}
                  className={`px-4 py-2 rounded-xl text-white font-bold text-xs transition-colors ${
                    selectedOwner.status === 'SUSPENDED'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {selectedOwner.status === 'SUSPENDED' ? 'Reactivate Account' : 'Suspend Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
