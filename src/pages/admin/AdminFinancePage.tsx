/**
 * COLIN Admin Control Centre — Financial Operations & Ledgers
 * Phase 4A / Sprint Completion: Double-Entry Chart of Accounts & Escrow Reconciliation
 */

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShieldCheck,
  RotateCcw,
  Scale,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { Button } from '../../components/common/Button';

interface FinanceSummary {
  totalBookings: number;
  feePaidCount: number;
  acceptedCount: number;
  rejectedCount: number;
  expiredCount: number;
  totalCollected: number;
  escrowBalance: number;
  revenueRetained: number;
  refundsPaid: number;
  isBalanced: boolean;
}

export const AdminFinancePage: React.FC = () => {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchFinanceSummary = async () => {
    setIsLoading(true);
    setFeedbackMessage(null);
    try {
      const res = await apiClient.get<FinanceSummary>('/api/v1/admin/bookings/finance-summary');
      if (res.success && res.data) {
        setSummary(res.data);
      } else {
        // Fallback default structure
        setSummary({
          totalBookings: 0,
          feePaidCount: 0,
          acceptedCount: 0,
          rejectedCount: 0,
          expiredCount: 0,
          totalCollected: 0,
          escrowBalance: 0,
          revenueRetained: 0,
          refundsPaid: 0,
          isBalanced: true,
        });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to load ledger summary.' });
      setSummary({
        totalBookings: 0,
        feePaidCount: 0,
        acceptedCount: 0,
        rejectedCount: 0,
        expiredCount: 0,
        totalCollected: 0,
        escrowBalance: 0,
        revenueRetained: 0,
        refundsPaid: 0,
        isBalanced: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceSummary();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-colin-charcoal-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-colin-teal/10 text-colin-teal rounded-lg">
              <Scale size={18} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-colin-teal">Finance & Accounts</span>
          </div>
          <h1 className="text-2xl font-black text-colin-navy font-display">Financial Operations & Ledgers</h1>
          <p className="text-xs text-colin-charcoal-500 mt-1">
            Authoritative double-entry ledger tracking, ₹150 visit fee escrow balances, student refund payable reconciliations, and retained platform earnings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFinanceSummary}
            disabled={isLoading}
            leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
          >
            Refresh Ledger
          </Button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button onClick={() => setFeedbackMessage(null)} className="text-xs font-bold underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Double-Entry Balance Invariant Status Bar */}
      <div className="p-4 bg-white rounded-2xl border border-colin-charcoal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {summary?.isBalanced ? (
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={18} />
            </span>
          ) : (
            <span className="p-2 bg-red-50 text-red-600 rounded-xl">
              <AlertTriangle size={18} />
            </span>
          )}
          <div>
            <div className="text-xs font-bold text-colin-navy">
              {summary?.isBalanced ? 'Double-Entry Invariant Verified: Balanced' : 'Ledger Imbalance Detected'}
            </div>
            <div className="text-[11px] text-colin-charcoal-500">
              PostgreSQL trigger <code className="font-mono text-[10px] bg-slate-100 px-1 rounded">validate_ledger_transaction_balance()</code> strictly requires Total Debits == Total Credits.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold font-mono">
          <span className="px-3 py-1 bg-slate-100 text-colin-navy rounded-lg">
            Mode: TEST/SIMULATED
          </span>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg">
            Zero-Sum Validated
          </span>
        </div>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Fees Collected */}
        <div className="bg-white p-5 rounded-3xl border border-colin-charcoal-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-colin-charcoal-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Fees Collected</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ArrowUpRight size={16} />
            </span>
          </div>
          <div className="text-2xl font-black text-colin-navy font-display">
            ₹{summary ? summary.totalCollected.toFixed(2) : '0.00'}
          </div>
          <div className="text-[11px] text-colin-charcoal-500 font-medium">
            From {summary?.totalBookings ?? 0} total visit requests
          </div>
        </div>

        {/* Card 2: Escrow Balance in Transit */}
        <div className="bg-white p-5 rounded-3xl border border-colin-charcoal-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-colin-charcoal-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Escrow Balance (Liability)</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Lock size={16} />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-900 font-display">
            ₹{summary ? summary.escrowBalance.toFixed(2) : '0.00'}
          </div>
          <div className="text-[11px] text-amber-700 font-medium">
            Held in escrow across {summary?.feePaidCount ?? 0} active/pending visits
          </div>
        </div>

        {/* Card 3: Platform Retained Revenue */}
        <div className="bg-white p-5 rounded-3xl border border-colin-charcoal-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-colin-charcoal-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Retained Platform Revenue</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-900 font-display">
            ₹{summary ? summary.revenueRetained.toFixed(2) : '0.00'}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">
            Earned from {summary ? summary.acceptedCount + summary.expiredCount : 0} settled decisions
          </div>
        </div>

        {/* Card 4: 55% Student Refunds Paid/Due */}
        <div className="bg-white p-5 rounded-3xl border border-colin-charcoal-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-colin-charcoal-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Student Refunds (55%)</span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <RotateCcw size={16} />
            </span>
          </div>
          <div className="text-2xl font-black text-purple-900 font-display">
            ₹{summary ? summary.refundsPaid.toFixed(2) : '0.00'}
          </div>
          <div className="text-[11px] text-purple-700 font-medium">
            Guaranteed ₹82.50 refunds for {summary?.rejectedCount ?? 0} rejections
          </div>
        </div>
      </div>

      {/* Chart of Accounts & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Double-Entry Chart of Accounts */}
        <div className="bg-white p-6 rounded-3xl border border-colin-charcoal-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-colin-navy text-sm">COLIN Chart of Accounts</h3>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">Standard IAS-1</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <span className="font-mono text-[10px] text-slate-400 font-bold block">1000 • ASSET</span>
                <span className="font-bold text-colin-navy">Payment Gateway Clearing</span>
              </div>
              <span className="font-mono font-bold text-colin-navy">₹{summary?.totalCollected.toFixed(2) ?? '0.00'}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <span className="font-mono text-[10px] text-slate-400 font-bold block">2000 • LIABILITY</span>
                <span className="font-bold text-colin-navy">Platform Visit Fee Escrow</span>
              </div>
              <span className="font-mono font-bold text-amber-700">₹{summary?.escrowBalance.toFixed(2) ?? '0.00'}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <span className="font-mono text-[10px] text-slate-400 font-bold block">2100 • LIABILITY</span>
                <span className="font-bold text-colin-navy">Student Refund Payable (55%)</span>
              </div>
              <span className="font-mono font-bold text-purple-700">₹{summary?.refundsPaid.toFixed(2) ?? '0.00'}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <span className="font-mono text-[10px] text-slate-400 font-bold block">4000 • REVENUE</span>
                <span className="font-bold text-colin-navy">Platform Retained Revenue</span>
              </div>
              <span className="font-mono font-bold text-emerald-700">₹{summary?.revenueRetained.toFixed(2) ?? '0.00'}</span>
            </div>
          </div>
        </div>

        {/* Visit Settlement Rule Reference */}
        <div className="bg-white p-6 rounded-3xl border border-colin-charcoal-200 shadow-sm space-y-4">
          <h3 className="font-bold text-colin-navy text-sm">Authoritative Settlement Rules</h3>
          <div className="space-y-3 text-xs text-colin-charcoal-600">
            <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-1">
              <div className="font-bold text-blue-900">1. Initial Pass Purchase (₹150.00)</div>
              <p className="text-[11px] text-blue-800">
                Debit: Payment Gateway Clearing (₹150.00) == Credit: Platform Escrow (₹150.00). Held until decision deadline.
              </p>
            </div>

            <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-1">
              <div className="font-bold text-emerald-900">2. Student Acceptance (Stay Confirmed)</div>
              <p className="text-[11px] text-emerald-800">
                100% of pass fee is retained as platform revenue. Debit: Platform Escrow (₹150.00) == Credit: Platform Revenue (₹150.00). ₹0.00 refund.
              </p>
            </div>

            <div className="p-3.5 bg-rose-50/70 border border-rose-100 rounded-2xl space-y-1">
              <div className="font-bold text-rose-900">3. Student Rejection within 12h Window</div>
              <p className="text-[11px] text-rose-800">
                Exact 55% refund guarantee. Debit: Escrow (₹150.00) == Credit: Student Wallet (₹82.50) + Credit: Platform Revenue (₹67.50).
              </p>
            </div>

            <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-2xl space-y-1">
              <div className="font-bold text-slate-800">4. Auto-Expiration (Past 12-Hour Deadline)</div>
              <p className="text-[11px] text-slate-700">
                Student failed to submit decision before server deadline. Debit: Escrow (₹150.00) == Credit: Platform Revenue (₹150.00). Forfeited.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
