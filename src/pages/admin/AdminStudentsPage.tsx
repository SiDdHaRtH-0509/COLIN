/**
 * COLIN Admin Control Centre — Student Directory & Account Management
 * Phase 4A / Final Acceptance: Live Centralized Student Management Module
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
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
  Mail,
  Phone,
  MapPin,
  X,
} from 'lucide-react';
import { AdminApiClient, maskEmailAddress, maskPhoneNumber } from '../../services/admin/adminApiClient';
import { AdminStudent } from '../../types/admin';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AdminStudentsPage: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const canManageStatus = hasPermission('MANAGE_STUDENT_TICKETS') || hasPermission('MANAGE_ADMIN_USERS');

  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [verificationFilter, setVerificationFilter] = useState<'ALL' | 'VERIFIED' | 'UNVERIFIED' | 'PENDING_REVIEW'>('ALL');
  const [revealedPii, setRevealedPii] = useState<Record<string, boolean>>({});
  const [selectedStudent, setSelectedStudent] = useState<AdminStudent | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const res = await AdminApiClient.getStudents();
      if (res.success && Array.isArray(res.data)) {
        setStudents(res.data);
      } else {
        setStudents([]);
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Failed to load students directory.' });
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();

    // Listen for storage events (Cross-browser / cross-tab synchronization)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'colin_registered_users') {
        fetchStudents();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleRevealPii = (id: string) => {
    setRevealedPii((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleStatus = async (student: AdminStudent) => {
    if (!canManageStatus) {
      setFeedbackMessage({ type: 'error', text: 'You do not have administrative permission to modify account statuses.' });
      return;
    }

    const nextStatus = student.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    setActionLoading(student.id);
    try {
      const res = await AdminApiClient.updateStudentStatus(student.id, nextStatus);
      if (res.success) {
        setFeedbackMessage({
          type: 'success',
          text: `Student ${student.name} was successfully ${nextStatus === 'ACTIVE' ? 'reactivated' : 'suspended'}.`,
        });
        await fetchStudents();
        if (selectedStudent && selectedStudent.id === student.id) {
          setSelectedStudent((prev) => (prev ? { ...prev, status: nextStatus } : null));
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
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query) ||
        (s.university && s.university.toLowerCase().includes(query)) ||
        (s.city && s.city.toLowerCase().includes(query));

      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
      const matchesVerification =
        verificationFilter === 'ALL' || s.verificationStatus === verificationFilter;

      return matchesSearch && matchesStatus && matchesVerification;
    });
  }, [students, searchQuery, statusFilter, verificationFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Aggregate KPI metrics
  const totalCount = students.length;
  const activeCount = students.filter((s) => s.status === 'ACTIVE').length;
  const suspendedCount = students.filter((s) => s.status === 'SUSPENDED').length;
  const verifiedCount = students.filter((s) => s.verificationStatus === 'VERIFIED').length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-colin-charcoal-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Users size={18} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Student Affairs</span>
          </div>
          <h1 className="text-2xl font-black text-colin-navy font-display">Student Directory & Accounts</h1>
          <p className="text-xs text-colin-charcoal-500 mt-1">
            Real-time directory of verified and active students with least-privilege masked PII and disciplinary controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStudents}
            disabled={isLoading}
            className="px-4 py-2 bg-colin-offwhite hover:bg-colin-charcoal-100 text-colin-navy rounded-xl text-xs font-semibold border border-colin-charcoal-200 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Sync Directory</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-colin-charcoal-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-colin-charcoal-500 block">Total Registered</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-colin-navy font-display">{totalCount}</span>
            <span className="text-[11px] text-colin-charcoal-400">Students</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-colin-charcoal-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-colin-charcoal-500 block">Active Accounts</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600 font-display">{activeCount}</span>
            <span className="text-[11px] text-emerald-600 font-medium">In Good Standing</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-colin-charcoal-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-colin-charcoal-500 block">Verified KYC</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-colin-teal font-display">{verifiedCount}</span>
            <span className="text-[11px] text-colin-teal font-medium">Email / ID Checked</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-colin-charcoal-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-colin-charcoal-500 block">Suspended</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-colin-orange font-display">{suspendedCount}</span>
            <span className="text-[11px] text-colin-orange font-medium">Disciplinary Flags</span>
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
            placeholder="Search student by name, email, identifier, campus, or city..."
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

          {/* Verification Filter */}
          <select
            value={verificationFilter}
            onChange={(e) => {
              setVerificationFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-colin-offwhite border border-colin-charcoal-200 rounded-xl text-xs text-colin-navy font-semibold focus:outline-none focus:border-colin-teal"
          >
            <option value="ALL">All KYC</option>
            <option value="VERIFIED">Verified</option>
            <option value="UNVERIFIED">Unverified</option>
            <option value="PENDING_REVIEW">Pending Review</option>
          </select>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-2xl border border-colin-charcoal-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-colin-charcoal-400">
            <RefreshCw size={24} className="animate-spin text-colin-teal mx-auto mb-2" />
            <span>Synchronizing live student records...</span>
          </div>
        ) : paginatedStudents.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={32} className="text-colin-charcoal-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-colin-navy">No Student Records Found</h3>
            <p className="text-xs text-colin-charcoal-500 max-w-sm mx-auto mt-1">
              {searchQuery
                ? `No student matching "${searchQuery}" was found. Try clearing your filters.`
                : 'No student accounts have been registered yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-colin-offwhite border-b border-colin-charcoal-200 text-colin-charcoal-500 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Contact (PII Protected)</th>
                  <th className="py-3 px-4">Campus / City</th>
                  <th className="py-3 px-4">Activity</th>
                  <th className="py-3 px-4">KYC Status</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-colin-charcoal-100">
                {paginatedStudents.map((student) => {
                  const isRevealed = !!revealedPii[student.id];
                  return (
                    <tr key={student.id} className="hover:bg-colin-offwhite/50 transition-colors">
                      {/* Identity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0 border border-blue-100">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-colin-navy block truncate">{student.name}</span>
                            <span className="text-[10px] text-colin-charcoal-400 font-mono block truncate">
                              ID: {student.id.length > 20 ? `${student.id.slice(0, 16)}...` : student.id}
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
                              {isRevealed ? student.email : maskEmailAddress(student.email)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone size={12} className="text-colin-charcoal-400 shrink-0" />
                            <span className="font-mono text-colin-charcoal-700">
                              {isRevealed ? (student.phone || '—') : maskPhoneNumber(student.phone)}
                            </span>
                            <button
                              onClick={() => toggleRevealPii(student.id)}
                              title={isRevealed ? 'Mask PII' : 'Unmask PII (Audited)'}
                              className="text-colin-teal hover:text-colin-teal-700 p-0.5"
                            >
                              {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Campus & Location */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-medium text-colin-navy block truncate max-w-[180px]">
                            {student.university || 'Delhi University'}
                          </span>
                          <span className="text-[10px] text-colin-charcoal-400 flex items-center gap-1">
                            <MapPin size={10} />
                            {student.city || 'Delhi NCR'}
                          </span>
                        </div>
                      </td>

                      {/* Activity */}
                      <td className="py-3.5 px-4">
                        <div className="text-[11px] text-colin-charcoal-600">
                          <span className="font-semibold text-colin-navy">{student.bookingCount ?? 0}</span> bookings •{' '}
                          <span className="font-semibold text-colin-teal">{student.visitCount ?? 0}</span> visits
                          <span className="block text-[10px] text-colin-charcoal-400 mt-0.5">
                            Joined {student.memberSince || 'Recently'}
                          </span>
                        </div>
                      </td>

                      {/* KYC Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            student.verificationStatus === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : student.verificationStatus === 'PENDING_REVIEW'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-colin-charcoal-100 text-colin-charcoal-600 border-colin-charcoal-200'
                          }`}
                        >
                          {student.verificationStatus === 'VERIFIED' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                          {student.verificationStatus}
                        </span>
                      </td>

                      {/* Account Lifecycle Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            student.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {student.status === 'ACTIVE' ? <UserCheck size={11} /> : <UserX size={11} />}
                          {student.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => setSelectedStudent(student)}
                            className="px-2.5 py-1 bg-white border border-colin-charcoal-200 hover:border-colin-teal hover:text-colin-teal text-colin-navy rounded-lg font-semibold text-[11px] transition-colors"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => handleToggleStatus(student)}
                            disabled={actionLoading === student.id || !canManageStatus}
                            className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] border transition-colors ${
                              student.status === 'SUSPENDED'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                            }`}
                          >
                            {actionLoading === student.id ? (
                              <RefreshCw size={12} className="animate-spin inline" />
                            ) : student.status === 'SUSPENDED' ? (
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
        {!isLoading && filteredStudents.length > pageSize && (
          <div className="p-4 border-t border-colin-charcoal-200 flex items-center justify-between text-xs text-colin-charcoal-500 bg-white">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredStudents.length)} of {filteredStudents.length} students
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

      {/* Inspect Student Drawer / Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in-up">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-colin-charcoal-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedStudent(null)}
              className="absolute top-5 right-5 text-colin-charcoal-400 hover:text-colin-navy"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 font-bold text-lg flex items-center justify-center">
                {selectedStudent.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-colin-navy font-display">{selectedStudent.name}</h3>
                <span className="text-xs text-colin-charcoal-400 font-mono">ID: {selectedStudent.id}</span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-colin-offwhite rounded-xl border border-colin-charcoal-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-colin-charcoal-500">Email Address:</span>
                  <span className="font-semibold text-colin-navy font-mono">{selectedStudent.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-colin-charcoal-500">Phone Number:</span>
                  <span className="font-semibold text-colin-navy font-mono">{selectedStudent.phone || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-colin-charcoal-500">University / College:</span>
                  <span className="font-semibold text-colin-navy">{selectedStudent.university || 'Delhi University'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-colin-charcoal-500">City / Region:</span>
                  <span className="font-semibold text-colin-navy">{selectedStudent.city || 'Delhi NCR'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-colin-charcoal-500">Registration Date:</span>
                  <span className="font-semibold text-colin-navy">
                    {new Date(selectedStudent.registeredAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-blue-600 block">Total Bookings</span>
                  <span className="text-xl font-black text-colin-navy">{selectedStudent.bookingCount ?? 0}</span>
                </div>
                <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-colin-teal block">Completed Visits</span>
                  <span className="text-xl font-black text-colin-navy">{selectedStudent.visitCount ?? 0}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-colin-charcoal-100">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-2 rounded-xl bg-colin-offwhite hover:bg-colin-charcoal-100 text-colin-navy font-semibold text-xs transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleToggleStatus(selectedStudent)}
                  disabled={actionLoading === selectedStudent.id || !canManageStatus}
                  className={`px-4 py-2 rounded-xl text-white font-bold text-xs transition-colors ${
                    selectedStudent.status === 'SUSPENDED'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {selectedStudent.status === 'SUSPENDED' ? 'Reactivate Account' : 'Suspend Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
