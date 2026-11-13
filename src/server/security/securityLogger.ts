/**
 * COLIN Security Event Monitoring & Incident Logging Service
 * Phase 6I: Security Monitoring, Alerting & Incident Handling
 * 
 * Collects, normalizes, and audits high-severity security events across all platform boundaries.
 * Emits audit entries to PostgreSQL admin_audit_logs via colin_admin_runtime without leaking PII or credentials.
 */

import { AuditActionCategory, AuditSeverity } from '@prisma/client';
import { AdminAuditRepository } from '../database/repositories/AdminAuditRepository';

export type SecurityEventType =
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_ACCOUNT_SUSPENDED_LOGIN_ATTEMPT'
  | 'AUTH_REFRESH_TOKEN_REUSE_DETECTED'
  | 'AUTH_BRUTE_FORCE_LOCKOUT'
  | 'ADMIN_MFA_CHALLENGE_ISSUED'
  | 'ADMIN_MFA_FAILED'
  | 'ADMIN_MFA_SUCCESS'
  | 'ADMIN_MFA_ENROLLED'
  | 'ADMIN_MFA_DISABLED'
  | 'ADMIN_PII_UNMASKED'
  | 'ADMIN_ROLE_MODIFIED'
  | 'PRIVILEGE_ESCALATION_ATTEMPT'
  | 'MALICIOUS_FILE_UPLOAD_BLOCKED'
  | 'UNAUTHORIZED_CROSS_TENANT_ACCESS';

export interface SecurityEventData {
  eventType: SecurityEventType;
  actorId?: string;
  actorRole?: string;
  targetEntity?: string;
  targetEntityId?: string;
  ipAddress?: string;
  userAgent?: string;
  severity: AuditSeverity;
  details?: Record<string, unknown>;
}

export class SecurityLogger {
  private static auditRepo = new AdminAuditRepository();

  /**
   * Logs a standardized security event to audit infrastructure and console.
   */
  public static async logSecurityEvent(event: SecurityEventData): Promise<void> {
    const timestamp = new Date().toISOString();

    // Redact sensitive keys if inadvertently passed in details
    const sanitizedDetails = { ...event.details };
    delete sanitizedDetails.password;
    delete sanitizedDetails.token;
    delete sanitizedDetails.secret;
    delete sanitizedDetails.recoveryCode;

    // Structured JSON log for SIEM / external log ingestion
    console.warn(
      `[SECURITY-EVENT] [${event.severity}] [${event.eventType}] Actor: ${event.actorId || 'ANONYMOUS'} IP: ${
        event.ipAddress || 'UNKNOWN'
      } Target: ${event.targetEntity || 'SYSTEM'} Details: ${JSON.stringify(sanitizedDetails)}`
    );

    // Persist high and critical severity events to PostgreSQL audit ledger
    try {
      await this.auditRepo.logAction({
        adminId: event.actorId || '00000000-0000-0000-0000-000000000001',
        actionCategory: this.mapCategory(event.eventType),
        action: event.eventType,
        targetEntity: event.targetEntity || 'SecurityEvent',
        targetEntityId: event.targetEntityId || '00000000-0000-0000-0000-000000000000',
        ipAddress: event.ipAddress || '127.0.0.1',
        userAgent: event.userAgent,
        severity: event.severity,
        detailsJson: {
          timestamp,
          actorRole: event.actorRole || 'UNKNOWN',
          ...sanitizedDetails,
        },
      });
    } catch {
      // Prevent failure in security logger from crashing application
    }
  }

  private static mapCategory(type: SecurityEventType): AuditActionCategory {
    if (type.startsWith('AUTH_MFA_') || type.startsWith('ADMIN_MFA_')) return AuditActionCategory.AUTH_MFA_UPDATE;
    if (type.startsWith('AUTH_')) return AuditActionCategory.AUTH_LOGIN;
    if (type.includes('ROLE_MODIFIED') || type.includes('PRIVILEGE_ESCALATION')) return AuditActionCategory.ROLE_ASSIGNMENT;
    if (type.includes('SUSPEND')) return AuditActionCategory.USER_SUSPENSION;
    return AuditActionCategory.SYSTEM_SETTING_CHANGE;
  }
}
