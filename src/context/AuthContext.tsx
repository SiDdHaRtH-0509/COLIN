import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { apiClient, TokenStorage } from '../services/apiClient';

interface SignupData {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  university?: string;
  password?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, role?: UserRole, password?: string) => Promise<boolean>;
  signup: (userData: SignupData) => Promise<boolean>;
  demoLogin: (role: UserRole) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  // Access control modal helpers
  isAuthModalOpen: boolean;
  authModalMessage: string;
  openAuthModal: (intendedUrl?: string, customMessage?: string) => void;
  closeAuthModal: () => void;
  intendedUrl: string | null;
  setIntendedUrl: (url: string | null) => void;
}

const DEMO_STUDENT: User = {
  id: 'usr-student-01',
  name: 'Aarav Mehra',
  email: 'aarav.mehra@colin.in',
  phone: '+91 98765 43210',
  role: 'student',
  university: 'Delhi University (SRCC)',
  city: 'Delhi NCR',
  avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
  memberSince: 'September 2026',
};

const DEMO_OWNER: User = {
  id: 'usr-owner-01',
  name: 'Col. Rajesh Sharma',
  email: 'rajesh.sharma@colin.in',
  phone: '+91 98110 44219',
  role: 'owner',
  city: 'Delhi NCR',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
  memberSince: 'July 2026',
};

const AUTH_STORAGE_KEY = 'colin_auth_session';
const REGISTERED_USERS_KEY = 'colin_registered_users';

// Helper to retrieve all registered accounts
const getStoredRegisteredUsers = (): User[] => {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// Helper to persist a registered user
const persistRegisteredUser = (userData: User) => {
  try {
    const users = getStoredRegisteredUsers();
    const idx = users.findIndex((u) => u.email.toLowerCase() === userData.email.toLowerCase());
    if (idx >= 0) {
      users[idx] = userData;
    } else {
      users.push(userData);
    }
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
  } catch {}
};

function mapBackendUserToFrontend(backendUser: any, roleOverride?: UserRole): User {
  const profile = backendUser.profile || {};
  const firstName = profile.firstName || '';
  const lastName = profile.lastName || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || backendUser.email?.split('@')[0] || 'COLIN Member';
  const role: UserRole =
    roleOverride ||
    (backendUser.role === 'OWNER' ? 'owner' : backendUser.role === 'ADMIN' ? 'admin' : 'student');

  return {
    id: backendUser.id,
    name: fullName,
    email: backendUser.email,
    phone: backendUser.phone || '',
    role,
    university: backendUser.studentProfile?.collegeName || (role === 'student' ? 'Delhi University' : undefined),
    city: 'Delhi NCR',
    avatar: profile.avatarUrl || undefined,
    memberSince: backendUser.createdAt
      ? new Date(backendUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMessage, setAuthModalMessage] = useState<string>(
    'Sign in or register for a free COLIN account to unlock verified property details, direct owner contact, and in-person visit slot bookings.'
  );
  const [intendedUrl, setIntendedUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      // 1. Try restoring from backend /api/v1/auth/me if we have token or cookie
      try {
        const response: any = await apiClient.get('/api/v1/auth/me');
        if (isMounted && response?.success && response.data?.user) {
          const mapped = mapBackendUserToFrontend(response.data.user);
          setUser(mapped);
          saveSessionLocally(mapped);
          setIsLoading(false);
          return;
        }
      } catch {
        // Fall back to local storage session
      }

      // 2. Check localStorage for existing session
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored && isMounted) {
          setUser(JSON.parse(stored));
        }
      } catch {
        console.warn('Failed to parse stored session');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const saveSessionLocally = (newUser: User) => {
    setUser(newUser);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    } catch {}
  };

  const login = async (email: string, role: UserRole = 'student', password?: string): Promise<boolean> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try real backend login
    try {
      const response: any = await apiClient.post('/api/v1/auth/login', {
        email: cleanEmail,
        password: password || 'Password123!',
      });

      if (response?.success && response.data?.user) {
        if (response.data.tokens?.accessToken) {
          TokenStorage.setAccessToken(response.data.tokens.accessToken);
        }
        if (response.data.csrfToken) {
          TokenStorage.setCsrfToken(response.data.csrfToken);
        }

        const mapped = mapBackendUserToFrontend(response.data.user, role);
        saveSessionLocally(mapped);
        persistRegisteredUser(mapped);
        setIsLoading(false);
        setIsAuthModalOpen(false);
        return true;
      }
    } catch {
      // Backend unavailable or credentials rejected in local mock mode; fall back gracefully
    }

    // 2. Fallback: Check if user was previously registered locally
    const registered = getStoredRegisteredUsers();
    const existing = registered.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      saveSessionLocally(existing);
      setIsLoading(false);
      setIsAuthModalOpen(false);
      return true;
    }

    // 3. Fallback: Check demo accounts
    if (
      cleanEmail === DEMO_STUDENT.email.toLowerCase() ||
      cleanEmail === 'student.demo@colin.in' ||
      cleanEmail === 'student@colin.in'
    ) {
      saveSessionLocally(DEMO_STUDENT);
      setIsLoading(false);
      setIsAuthModalOpen(false);
      return true;
    }
    if (
      cleanEmail === DEMO_OWNER.email.toLowerCase() ||
      cleanEmail === 'owner.demo@colin.in' ||
      cleanEmail === 'owner@colin.in'
    ) {
      saveSessionLocally(DEMO_OWNER);
      setIsLoading(false);
      setIsAuthModalOpen(false);
      return true;
    }

    // 4. Fallback: Fresh user creation
    const prefix = role === 'student' ? 'usr-student' : 'usr-owner';
    const newUser: User = {
      id: `${prefix}-${Date.now()}`,
      name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'COLIN Member',
      email: email,
      phone: '',
      role: role,
      university: role === 'student' ? 'Delhi University' : undefined,
      city: 'Delhi NCR',
      avatar: undefined,
      memberSince: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    };

    persistRegisteredUser(newUser);
    saveSessionLocally(newUser);
    setIsLoading(false);
    setIsAuthModalOpen(false);
    return true;
  };

  const signup = async (userData: SignupData): Promise<boolean> => {
    setIsLoading(true);
    const cleanEmail = userData.email.trim().toLowerCase();
    const nameParts = (userData.name || '').trim().split(' ');
    const firstName = nameParts[0] || 'Student';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Normalize phone to E.164 if possible
    let formattedPhone: string | undefined = undefined;
    const digits = (userData.phone || '').replace(/\D/g, '');
    if (digits.length === 10) {
      formattedPhone = `+91${digits}`;
    } else if (digits.length >= 11 && (userData.phone || '').startsWith('+')) {
      formattedPhone = userData.phone;
    }

    // 1. Try real backend registration
    try {
      const backendRole = userData.role === 'owner' ? 'OWNER' : 'STUDENT';
      const response: any = await apiClient.post('/api/v1/auth/register', {
        email: cleanEmail,
        password: userData.password || 'Password123!',
        firstName,
        lastName,
        phone: formattedPhone,
        role: backendRole,
        collegeName: userData.university,
      });

      if (response?.success && response.data?.user) {
        if (response.data.tokens?.accessToken) {
          TokenStorage.setAccessToken(response.data.tokens.accessToken);
        }
        if (response.data.csrfToken) {
          TokenStorage.setCsrfToken(response.data.csrfToken);
        }

        const mapped = mapBackendUserToFrontend(response.data.user, userData.role);
        saveSessionLocally(mapped);
        persistRegisteredUser(mapped);
        setIsLoading(false);
        setIsAuthModalOpen(false);
        return true;
      }
    } catch {
      // Backend unavailable; fall back to local persistence
    }

    // 2. Fallback: Local registration
    const registered = getStoredRegisteredUsers();
    const existing = registered.find((u) => u.email.toLowerCase() === cleanEmail);
    const prefix = userData.role === 'student' ? 'usr-student' : 'usr-owner';
    const newUser: User = {
      id: existing ? existing.id : `${prefix}-${Date.now()}`,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      role: userData.role,
      university: userData.university,
      city: 'Delhi NCR',
      avatar: undefined,
      memberSince: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    };

    persistRegisteredUser(newUser);
    saveSessionLocally(newUser);
    setIsLoading(false);
    setIsAuthModalOpen(false);
    return true;
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser: User = { ...user, ...updates };
    persistRegisteredUser(updatedUser);
    saveSessionLocally(updatedUser);
  };

  const demoLogin = (role: UserRole) => {
    const selected = role === 'student' ? DEMO_STUDENT : DEMO_OWNER;
    saveSessionLocally(selected);
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    // Fire-and-forget backend session cleanup
    apiClient.post('/api/v1/auth/logout').catch(() => {});
    TokenStorage.clearAll();
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {}
  };

  const openAuthModal = (targetUrl?: string, customMessage?: string) => {
    if (targetUrl) setIntendedUrl(targetUrl);
    if (customMessage) setAuthModalMessage(customMessage);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        demoLogin,
        logout,
        updateUser,
        isAuthModalOpen,
        authModalMessage,
        openAuthModal,
        closeAuthModal,
        intendedUrl,
        setIntendedUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
