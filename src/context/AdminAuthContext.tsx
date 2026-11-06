/**
 * COLIN Admin Control Centre — Authentication Context
 * Phase 4A: Dedicated, Independent Administrative Session State
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AdminUser,
  AdminSession,
  AdminPermission,
  AdminApiResponse,
} from '../types/admin';
import { AdminApiClient } from '../services/admin/adminApiClient';

interface AdminAuthContextType {
  admin: AdminUser | null;
  session: AdminSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionExpiresAt: string | null;
  login: (email: string, secret: string, rememberDevice?: boolean) => Promise<AdminApiResponse>;
  verifyMfa: (tempToken: string, code: string, rememberDevice?: boolean) => Promise<AdminApiResponse>;
  logout: () => Promise<void>;
  hasPermission: (permission: AdminPermission) => boolean;
  refreshSession: () => Promise<boolean>;
  clearError: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize and verify session against server
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await AdminApiClient.verifySession();
      if (res.valid && res.admin && res.session) {
        setAdmin(res.admin);
        setSession(res.session);
        return true;
      } else {
        setAdmin(null);
        setSession(null);
        AdminApiClient.setStoredToken(null);
        return false;
      }
    } catch (err) {
      setAdmin(null);
      setSession(null);
      AdminApiClient.setStoredToken(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (
    email: string,
    secret: string,
    rememberDevice: boolean = false
  ): Promise<AdminApiResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await AdminApiClient.login(email, secret, rememberDevice);
      if (res.success && res.data?.admin && res.data?.session) {
        setAdmin(res.data.admin);
        setSession(res.data.session);
      } else if (!res.success) {
        setError(res.message || 'Administrative authentication failed.');
      }
      return res;
    } catch (err: any) {
      const msg = err?.message || 'Network or server error during authentication.';
      setError(msg);
      return {
        success: false,
        statusCode: 500,
        message: msg,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyMfa = async (
    tempToken: string,
    code: string,
    rememberDevice: boolean = false
  ): Promise<AdminApiResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await AdminApiClient.verifyMfa(tempToken, code, rememberDevice);
      if (res.success && res.data?.admin && res.data?.session) {
        setAdmin(res.data.admin);
        setSession(res.data.session);
      } else if (!res.success) {
        setError(res.message || 'MFA validation failed.');
      }
      return res;
    } catch (err: any) {
      const msg = err?.message || 'MFA verification failed.';
      setError(msg);
      return {
        success: false,
        statusCode: 500,
        message: msg,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await AdminApiClient.logout();
    } finally {
      setAdmin(null);
      setSession(null);
      setError(null);
      setIsLoading(false);
    }
  };

  const hasPermission = useCallback(
    (permission: AdminPermission): boolean => {
      if (!admin) return false;
      if (admin.role === 'SUPER_ADMIN') return true;
      return admin.permissions.includes(permission);
    },
    [admin]
  );

  const clearError = () => setError(null);

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        session,
        isAuthenticated: !!admin && !!session,
        isLoading,
        error,
        sessionExpiresAt: session?.expiresAt || null,
        login,
        verifyMfa,
        logout,
        hasPermission,
        refreshSession,
        clearError,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
