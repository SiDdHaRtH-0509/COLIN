/**
 * COLIN Admin Control Centre — Core Type Definitions
 * Phase 4A: Architecture, Authentication, RBAC & Audit Foundation
 */

export type AdminRole =
  | 'SUPER_ADMIN'
  | 'OPERATIONS_ADMIN'
  | 'VERIFICATION_MANAGER'
  | 'FINANCE_ADMIN'
  | 'STUDENT_SUPPORT'
  | 'OWNER_SUPPORT'
  | 'MARKETING_ADMIN';

export type AdminPermission =
  // Platform & Account Administration
  | 'MANAGE_ADMIN_USERS'
  | 'ASSIGN_ADMIN_ROLES'
  | 'VIEW_AUDIT_LOGS'
  | 'MANAGE_PLATFORM_SETTINGS'
  | 'VIEW_SYSTEM_HEALTH'
  
  // Operations & Visit Coordination
  | 'VIEW_VISIT_REQUESTS'
  | 'MANAGE_VISIT_COORDINATION'
  | 'ASSIGN_VOLUNTEERS'
  | 'OVERRIDE_VISIT_STATUS'
  
  // Property Verification & Certification
  | 'VIEW_PROPERTY_SUBMISSIONS'
  | 'ASSIGN_PROPERTY_INSPECTIONS'
  | 'REVIEW_INSPECTION_EVIDENCE'
  | 'APPROVE_PROPERTY_CERTIFICATION'
  | 'REJECT_PROPERTY_CERTIFICATION'
  | 'SUSPEND_PROPERTY_CERTIFICATION'
  
  // Financial Operations & Subscriptions
  | 'VIEW_FINANCIAL_TRANSACTIONS'
  | 'PROCESS_REFUNDS'
  | 'MANAGE_SUBSCRIPTION_RECORDS'
  | 'VIEW_FINANCIAL_REPORTS'
  
  // Student Support (Least Privilege)
  | 'VIEW_STUDENT_PROFILES_MASKED'
  | 'MANAGE_STUDENT_TICKETS'
  | 'RESOLVE_STUDENT_DISPUTES'
  
  // Owner Support (Least Privilege)
  | 'VIEW_OWNER_PROFILES_MASKED'
  | 'MANAGE_OWNER_TICKETS'
  | 'ASSIST_OWNER_LISTINGS'
  
  // Marketing & Sponsorships
  | 'MANAGE_SPONSORSHIPS'
  | 'MANAGE_FEATURED_LISTINGS'
  | 'VIEW_CAMPAIGN_PERFORMANCE'
  
  // General Department Overviews
  | 'VIEW_ALL_DEPARTMENTS';

export type AdminAccountStatus = 'active' | 'disabled' | 'suspended';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  department: string;
  permissions: AdminPermission[];
  status: AdminAccountStatus;
  mfaEnabled: boolean;
  avatar?: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
  createdBy?: string;
}

export interface AdminSession {
  token: string;
  adminId: string;
  adminEmail: string;
  role: AdminRole;
  createdAt: string;
  expiresAt: string;
  lastActivityAt: string;
  userAgent?: string;
  ipAddress?: string;
  rememberDevice?: boolean;
}

export interface AdminAuditLogEntry {
  id: string;
  timestamp: string;
  adminId: string;
  adminEmail: string;
  adminRole: AdminRole;
  action: string;
  targetResource: string;
  details?: Record<string, any>;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  correlationId: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface AdminMetricsSummary {
  totalStudents: number;
  totalOwners: number;
  totalProperties: number;
  pendingPropertyVerifications: number;
  pendingVisitRequests: number;
  completedVisits: number;
  activeVolunteers: number;
  totalPlatformRevenue: number;
  isPrototypeData: boolean;
}

export interface AdminApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  data?: T;
  message?: string;
  errorCode?: string;
  correlationId?: string;
  requiresMfa?: boolean;
  tempMfaToken?: string;
  retryAfterSeconds?: number;
}

export interface PasswordResetToken {
  token: string;
  email: string;
  expiresAt: string;
  used: boolean;
}
