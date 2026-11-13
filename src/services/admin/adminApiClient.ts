/**
 * COLIN Admin Control Centre — Administrative API Client
 * Phase 4A: Server-Side Request Dispatcher & PII Protection Utilities
 */

import {
  AdminApiResponse,
  AdminSession,
  AdminUser,
  AdminMetricsSummary,
  AdminAuditLogEntry,
  AdminPermission,
  AdminStudent,
  AdminOwner,
  AdminNotification,
  PlatformActivityEvent,
} from '../../types/admin';
import {
  serverAdminLogin,
  serverVerifyMfa,
  serverAdminLogout,
  serverVerifySession,
  serverRequirePermission,
  serverGetAdminMetrics,
  getServerAuditLogs,
  serverUpdateAdminStatus,
  serverRequestPasswordReset,
  serverGetStudents,
  serverGetOwners,
  serverUpdateStudentStatus,
  serverUpdateOwnerStatus,
  getPlatformActivities,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  recordPlatformActivity,
  recordAdminNotification,
} from '../../server/adminSecurity';
import { apiClient, getApiBaseUrl } from '../apiClient';

const ADMIN_TOKEN_KEY = 'colin_admin_session_token';

export class AdminApiClient {
  private static getStoredToken(): string | null {
    try {
      return localStorage.getItem(ADMIN_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  public static setStoredToken(token: string | null): void {
    try {
      if (token) {
        localStorage.setItem(ADMIN_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
      }
    } catch {}
  }

  /**
   * Submit credentials to server authentication gateway
   */
  public static async login(
    email: string,
    secret: string,
    rememberDevice: boolean = false
  ): Promise<AdminApiResponse<{ session?: AdminSession; admin?: AdminUser }>> {
    const res = await serverAdminLogin(email, secret, {
      rememberDevice,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'NodeJs/Vitest',
      ipAddress: '127.0.0.1',
    });

    if (res.success && res.data?.session?.token) {
      this.setStoredToken(res.data.session.token);
    }
    return res;
  }

  /**
   * Complete MFA verification step
   */
  public static async verifyMfa(
    tempToken: string,
    code: string,
    rememberDevice: boolean = false
  ): Promise<AdminApiResponse<{ session?: AdminSession; admin?: AdminUser }>> {
    const res = await serverVerifyMfa(tempToken, code, {
      rememberDevice,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'NodeJs/Vitest',
      ipAddress: '127.0.0.1',
    });

    if (res.success && res.data?.session?.token) {
      this.setStoredToken(res.data.session.token);
    }
    return res;
  }

  /**
   * Revoke session on server and clear client token
   */
  public static async logout(): Promise<AdminApiResponse> {
    const token = this.getStoredToken();
    const res = serverAdminLogout(token);
    this.setStoredToken(null);
    return res;
  }

  /**
   * Verify current session token against server
   */
  public static async verifySession(): Promise<{
    valid: boolean;
    admin?: AdminUser;
    session?: AdminSession;
    statusCode: number;
    error?: string;
  }> {
    const token = this.getStoredToken();
    return serverVerifySession(token);
  }

  /**
   * Check RBAC permission on server
   */
  public static async checkPermission(permission: AdminPermission): Promise<{
    authorized: boolean;
    admin?: AdminUser;
    statusCode: number;
    error?: string;
  }> {
    const token = this.getStoredToken();
    return serverRequirePermission(token, permission);
  }

  /**
   * Fetch live KPI metrics
   */
  public static async getMetrics(): Promise<AdminApiResponse<AdminMetricsSummary>> {
    const token = this.getStoredToken() || '';
    if (getApiBaseUrl()) {
      try {
        const res: any = await apiClient.get('/api/v1/admin/metrics', { useAdminAuth: true });
        if (res?.success && res.data) {
          return res;
        }
      } catch {}
    }
    return serverGetAdminMetrics(token);
  }

  /**
   * Fetch audit logs (Requires VIEW_AUDIT_LOGS permission)
   */
  public static async getAuditLogs(limit: number = 30): Promise<AdminApiResponse<AdminAuditLogEntry[]>> {
    const token = this.getStoredToken();
    const auth = serverRequirePermission(token, 'VIEW_AUDIT_LOGS');
    if (!auth.authorized) {
      return {
        success: false,
        statusCode: auth.statusCode,
        message: auth.error,
      };
    }

    const logs = getServerAuditLogs(limit);
    return {
      success: true,
      statusCode: 200,
      data: logs,
    };
  }

  /**
   * Update admin account status (Super Admin only)
   */
  public static async updateAdminStatus(
    targetAdminId: string,
    newStatus: 'active' | 'disabled' | 'suspended'
  ): Promise<AdminApiResponse> {
    const token = this.getStoredToken() || '';
    return serverUpdateAdminStatus(token, targetAdminId, newStatus);
  }

  /**
   * Request password recovery token
   */
  public static async requestPasswordReset(email: string): Promise<AdminApiResponse> {
    return serverRequestPasswordReset(email);
  }

  /**
   * Fetch all registered students for Admin directory
   */
  public static async getStudents(): Promise<AdminApiResponse<AdminStudent[]>> {
    const token = this.getStoredToken() || '';
    if (getApiBaseUrl()) {
      try {
        const res: any = await apiClient.get('/api/v1/admin/students', { useAdminAuth: true });
        if (res?.success && Array.isArray(res.data)) {
          return res;
        }
      } catch {}
    }
    return serverGetStudents(token);
  }

  /**
   * Fetch all registered owners for Admin directory
   */
  public static async getOwners(): Promise<AdminApiResponse<AdminOwner[]>> {
    const token = this.getStoredToken() || '';
    if (getApiBaseUrl()) {
      try {
        const res: any = await apiClient.get('/api/v1/admin/owners', { useAdminAuth: true });
        if (res?.success && Array.isArray(res.data)) {
          return res;
        }
      } catch {}
    }
    return serverGetOwners(token);
  }

  /**
   * Update student lifecycle status (ACTIVE / SUSPENDED)
   */
  public static async updateStudentStatus(
    studentId: string,
    status: 'ACTIVE' | 'SUSPENDED'
  ): Promise<AdminApiResponse> {
    const token = this.getStoredToken() || '';
    try {
      const res: any = await apiClient.patch(`/api/v1/admin/students/${studentId}/status`, { status });
      if (res?.success) {
        serverUpdateStudentStatus(token, studentId, status);
        return res;
      }
    } catch {}
    return serverUpdateStudentStatus(token, studentId, status);
  }

  /**
   * Update owner lifecycle status (ACTIVE / SUSPENDED)
   */
  public static async updateOwnerStatus(
    ownerId: string,
    status: 'ACTIVE' | 'SUSPENDED'
  ): Promise<AdminApiResponse> {
    const token = this.getStoredToken() || '';
    try {
      const res: any = await apiClient.patch(`/api/v1/admin/owners/${ownerId}/status`, { status });
      if (res?.success) {
        serverUpdateOwnerStatus(token, ownerId, status);
        return res;
      }
    } catch {}
    return serverUpdateOwnerStatus(token, ownerId, status);
  }

  /**
   * Fetch live platform activity feed
   */
  public static async getPlatformActivities(limit: number = 30): Promise<PlatformActivityEvent[]> {
    return getPlatformActivities(limit);
  }

  /**
   * Record a platform activity event
   */
  public static recordActivity(entry: Omit<PlatformActivityEvent, 'id' | 'timestamp'>): PlatformActivityEvent {
    return recordPlatformActivity(entry);
  }

  /**
   * Fetch operational notifications
   */
  public static async getNotifications(limit: number = 50): Promise<AdminNotification[]> {
    return getAdminNotifications(limit);
  }

  /**
   * Dispatch an operational notification
   */
  public static sendNotification(entry: Omit<AdminNotification, 'id' | 'timestamp' | 'read'>): AdminNotification {
    return recordAdminNotification(entry);
  }

  /**
   * Mark a notification as read
   */
  public static markNotificationRead(id: string): boolean {
    return markAdminNotificationRead(id);
  }

  /**
   * Mark all notifications as read
   */
  public static markAllNotificationsRead(): boolean {
    return markAllAdminNotificationsRead();
  }
}

// -------------------------------------------------------------
// Data Privacy & Least-Privilege PII Masking Utilities
// -------------------------------------------------------------

/**
 * Mask phone number: e.g. +91 98765 43210 -> +91 98*** **210
 */
export function maskPhoneNumber(phone?: string): string {
  if (!phone) return '—';
  const clean = phone.trim();
  if (clean.length < 7) return '***-***';
  const visiblePrefix = clean.slice(0, 5);
  const visibleSuffix = clean.slice(-3);
  return `${visiblePrefix}****${visibleSuffix}`;
}

/**
 * Mask email: e.g. aarav.mehra@colin.in -> aa***@colin.in
 */
export function maskEmailAddress(email?: string): string {
  if (!email || !email.includes('@')) return '—';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `*@${domain}`;
  return `${user.slice(0, 2)}***@${domain}`;
}

/**
 * Mask physical address: e.g. Flat 402, Sunshine Apts, Mukherjee Nagar -> *** Mukherjee Nagar
 */
export function maskAddress(address?: string): string {
  if (!address) return '—';
  const parts = address.split(',');
  if (parts.length <= 1) return '*** Protected Address ***';
  return `***, ${parts[parts.length - 1].trim()}`;
}
