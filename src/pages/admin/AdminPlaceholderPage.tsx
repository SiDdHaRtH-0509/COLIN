/**
 * COLIN Admin Control Centre — Departmental Placeholder Component
 * Phase 4A: Clean, Explicit Module Status (No Fabricated Functionality)
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { AdminPermission } from '../../types/admin';
import {
  Clock,
  ShieldCheck,
  ArrowLeft,
  Layers,
  Lock,
  CheckCircle2,
} from 'lucide-react';

interface ModuleConfig {
  title: string;
  department: string;
  scheduledPhase: string;
  description: string;
  requiredPermissions: AdminPermission[];
  plannedFeatures: string[];
}

const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  '/admin/students': {
    title: 'Student Directory & Accounts',
    department: 'Student Affairs & Support',
    scheduledPhase: 'Phase 4B',
    description: 'Centralized directory for managing student accounts, KYC verifications, masked PII controls, and student accommodation history.',
    requiredPermissions: ['VIEW_STUDENT_PROFILES_MASKED', 'MANAGE_STUDENT_TICKETS'],
    plannedFeatures: [
      'Least-privilege student profile viewing with masked phone/email',
      'Student visit dispute resolution and refund triggers',
      'College university email validation',
      'Disciplinary flag and account suspension controls',
    ],
  },
  '/admin/owners': {
    title: 'Property Hosts & Owners Management',
    department: 'Host Partnerships & Operations',
    scheduledPhase: 'Phase 4B',
    description: 'Management of property owners, bank account verification, subscription billing statuses, and listing compliance.',
    requiredPermissions: ['VIEW_OWNER_PROFILES_MASKED', 'MANAGE_OWNER_TICKETS'],
    plannedFeatures: [
      'Owner KYC and identity document verification',
      'Bank beneficiary validation for payout settlements',
      'Listing compliance audits and quality strikes',
      'Subscription plan tier assignment and renewals',
    ],
  },
  '/admin/properties': {
    title: 'Properties & Inventory Control',
    department: 'Inventory Management',
    scheduledPhase: 'Phase 4B',
    description: 'Direct management of all COLIN property listings, room inventories, pricing thresholds, and visibility toggles.',
    requiredPermissions: ['VIEW_PROPERTY_SUBMISSIONS'],
    plannedFeatures: [
      'Full inventory search with filters across all cities and universities',
      'Administrative override for paused or draft listings',
      'Duplicate listing detection and spam prevention',
      'High-resolution virtual tour asset approval',
    ],
  },
  '/admin/verification': {
    title: 'Property Verification & Inspection Queue',
    department: 'Quality & Verification',
    scheduledPhase: 'Phase 4B',
    description: 'Dedicated pipeline for processing owner certification requests, scheduling volunteer audits, reviewing evidence, and issuing COLIN Verified badges.',
    requiredPermissions: ['VIEW_PROPERTY_SUBMISSIONS', 'ASSIGN_PROPERTY_INSPECTIONS', 'APPROVE_PROPERTY_CERTIFICATION'],
    plannedFeatures: [
      '3-stage verification pipeline (Safety, Hygiene, Security)',
      'Digital inspection checklist score validation (out of 100)',
      'Physical evidence and photographic proof review',
      'One-click certification approval, rejection, or revocation',
    ],
  },
  '/admin/visits': {
    title: 'Visit Coordination Headquarters',
    department: 'Central Operations',
    scheduledPhase: 'Phase 4B',
    description: 'Real-time dispatching and status tracking for all student-to-owner property visits mediated by COLIN volunteers.',
    requiredPermissions: ['VIEW_VISIT_REQUESTS', 'MANAGE_VISIT_COORDINATION', 'ASSIGN_VOLUNTEERS'],
    plannedFeatures: [
      'Interactive timeline of visit requests across 10 mediated states',
      'Volunteer guide assignment and automated WhatsApp dispatching',
      '12-hour student post-visit decision countdown monitoring',
      'Visit deposit retention and automated refund approval',
    ],
  },
  '/admin/finance': {
    title: 'Financial Operations & Ledgers',
    department: 'Finance & Accounts',
    scheduledPhase: 'Phase 4B',
    description: 'Comprehensive financial oversight of visit booking deposits, refund disbursements, owner subscription revenues, and payout ledgers.',
    requiredPermissions: ['VIEW_FINANCIAL_TRANSACTIONS', 'PROCESS_REFUNDS', 'VIEW_FINANCIAL_REPORTS'],
    plannedFeatures: [
      'Live transaction ledger with transaction reference IDs',
      'Automated and manual 55% visit refund processing',
      'Monthly owner subscription invoice generation',
      'Platform gross merchandise value (GMV) accounting',
    ],
  },
  '/admin/subscriptions': {
    title: 'Subscription Plans & Monetisation',
    department: 'Monetisation & Growth',
    scheduledPhase: 'Phase 4B',
    description: 'Administration of owner PRO/PREMIUM plans, student premium passes, and tiffin meal plan partner billing.',
    requiredPermissions: ['MANAGE_SUBSCRIPTION_RECORDS', 'VIEW_FINANCIAL_TRANSACTIONS'],
    plannedFeatures: [
      'Plan limits configuration (active property quotas)',
      'Grace period and payment failure handling',
      'Promotional discount codes for campus launch events',
      'Subscription churn and recurring revenue analytics',
    ],
  },
  '/admin/sponsorships': {
    title: 'Sponsorships & Featured Listings',
    department: 'Growth & Brand Partnerships',
    scheduledPhase: 'Phase 4B',
    description: 'Control center for homepage banners, promoted properties, search boost campaigns, and university partner placements.',
    requiredPermissions: ['MANAGE_SPONSORSHIPS', 'MANAGE_FEATURED_LISTINGS'],
    plannedFeatures: [
      'Homepage hero property slot calendar scheduling',
      'Search boost priority ranking controls',
      'Impression, click, and enquiry conversion analytics',
      'Commercial invoice generation for featured partners',
    ],
  },
  '/admin/volunteers': {
    title: 'Volunteer Campus Guides Network',
    department: 'Central Operations',
    scheduledPhase: 'Phase 4B',
    description: 'Coordination directory for student volunteers and campus ambassadors conducting physical property inspections and student guided visits.',
    requiredPermissions: ['ASSIGN_VOLUNTEERS', 'MANAGE_VISIT_COORDINATION'],
    plannedFeatures: [
      'Volunteer onboarding and university verification',
      'Geo-fenced assignment matching (DU North/South Campus, Noida, Bangalore)',
      'Completed visit completion certificates and stipend payouts',
      'Volunteer rating and student feedback scores',
    ],
  },
  '/admin/support': {
    title: 'Unified Customer Care & Support Tickets',
    department: 'Customer Care & Grievance',
    scheduledPhase: 'Phase 4B',
    description: 'Ticketing and grievance management interface for both student tenants and property owners.',
    requiredPermissions: ['MANAGE_STUDENT_TICKETS', 'MANAGE_OWNER_TICKETS'],
    plannedFeatures: [
      'Role-isolated ticket queues (Student vs Owner tickets)',
      'Resolution SLA tracking with automated escalations',
      'Internal administrative notes and dispute arbitration',
      'Canned responses for common campus living inquiries',
    ],
  },
  '/admin/analytics': {
    title: 'Platform Analytics & Business Intelligence',
    department: 'Business Intelligence',
    scheduledPhase: 'Phase 4B',
    description: 'Platform-wide conversion funnels, search intent heatmaps, accommodation demand versus supply analytics.',
    requiredPermissions: ['VIEW_ALL_DEPARTMENTS', 'VIEW_SYSTEM_HEALTH'],
    plannedFeatures: [
      'University-wise student demand indices',
      'Average monthly rent heatmaps across student hubs',
      'Visit-to-booking conversion percentage metrics',
      'Volunteer response time SLA performance charts',
    ],
  },
  '/admin/notifications': {
    title: 'System Notifications & Broadcast Engine',
    department: 'Central Communications',
    scheduledPhase: 'Phase 4B',
    description: 'Multi-channel communication center for dispatching transactional SMS, WhatsApp updates, and system-wide broadcast alerts.',
    requiredPermissions: ['MANAGE_PLATFORM_SETTINGS'],
    plannedFeatures: [
      'Transactional SMS/WhatsApp template management',
      'Targeted push notifications to students by campus',
      'Broadcast banners for platform maintenance schedules',
      'Delivery audit and failure telemetry logs',
    ],
  },
  '/admin/system': {
    title: 'System Administration & Security Vault',
    department: 'Executive IT & Security',
    scheduledPhase: 'Phase 4B',
    description: 'Super Admin control panel for provisioning administrator accounts, editing RBAC permissions, and inspecting security audit ledgers.',
    requiredPermissions: ['MANAGE_ADMIN_USERS', 'ASSIGN_ADMIN_ROLES', 'VIEW_AUDIT_LOGS'],
    plannedFeatures: [
      'Super Admin provisioning of new administrative officers',
      'Dynamic granular permission assignment per account',
      'MFA enforcement policy toggles',
      'Full cryptographic audit ledger export (JSON/CSV)',
    ],
  },
};

export const AdminPlaceholderPage: React.FC = () => {
  const location = useLocation();
  const { admin, hasPermission } = useAdminAuth();

  const config = MODULE_CONFIGS[location.pathname] || {
    title: 'Administrative Module',
    department: 'Central Operations',
    scheduledPhase: 'Phase 4B',
    description: 'This operational module is scheduled for implementation in upcoming roadmap phases.',
    requiredPermissions: ['VIEW_ALL_DEPARTMENTS'],
    plannedFeatures: ['Enterprise administration capability'],
  };

  const isPermitted = config.requiredPermissions.some((p) => hasPermission(p));

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in-up">
      {/* Breadcrumb Navigation Header */}
      <div className="flex items-center gap-2 text-xs text-colin-charcoal-400">
        <Link to="/admin" className="hover:text-colin-teal transition-colors flex items-center gap-1">
          <ArrowLeft size={12} /> Overview
        </Link>
        <span>/</span>
        <span className="text-colin-navy font-semibold">{config.title}</span>
      </div>

      {/* Main Module Banner Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-colin-charcoal-200 shadow-xs relative overflow-hidden">
        {/* Top Status Stripe */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-6 mb-6 border-b border-colin-charcoal-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-colin-navy-950 text-colin-teal flex items-center justify-center">
              <Layers size={24} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-colin-charcoal-400 block">
                {config.department}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-colin-navy font-display">
                {config.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-amber-50 text-amber-700 border border-amber-200">
              <Clock size={13} />
              {config.scheduledPhase} Scope
            </span>
          </div>
        </div>

        {/* Module Description */}
        <p className="text-sm text-colin-charcoal-600 leading-relaxed mb-6">
          {config.description}
        </p>

        {/* Security & Access Rights Verification */}
        <div className="mb-8 p-4 rounded-xl bg-colin-offwhite border border-colin-charcoal-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-colin-navy flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-colin-teal" />
              Role Authorization Status
            </span>
            {isPermitted ? (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={13} /> Authorized Account ({admin?.role})
              </span>
            ) : (
              <span className="text-xs font-semibold text-red-500 flex items-center gap-1">
                <Lock size={13} /> Restricted Access
              </span>
            )}
          </div>
          <div className="text-xs text-colin-charcoal-500 space-y-1">
            <div>
              Required Granular Privileges:{' '}
              {config.requiredPermissions.map((p) => (
                <code key={p} className="bg-white px-2 py-0.5 rounded text-[11px] text-colin-navy font-mono border border-colin-charcoal-200 mr-1.5">
                  {p}
                </code>
              ))}
            </div>
          </div>
        </div>

        {/* Planned Features Checklist */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-colin-navy font-display">
            Architecture Specification & Planned Capabilities
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {config.plannedFeatures.map((feat, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-white border border-colin-charcoal-200 flex items-start gap-2.5 text-xs text-colin-charcoal-700"
              >
                <CheckCircle2 size={15} className="text-colin-teal shrink-0 mt-0.5" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 pt-6 border-t border-colin-charcoal-100 flex items-center justify-between">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-colin-navy-900 hover:bg-colin-navy-800 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <ArrowLeft size={14} /> Back to Overview Dashboard
          </Link>
          <span className="text-[11px] text-colin-charcoal-400">
            Phase 4A Foundation Active
          </span>
        </div>
      </div>
    </div>
  );
};
