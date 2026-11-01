import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, role?: UserRole) => Promise<boolean>;
  signup: (userData: { name: string; email: string; phone: string; role: UserRole; university?: string }) => Promise<boolean>;
  demoLogin: (role: UserRole) => void;
  logout: () => void;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMessage, setAuthModalMessage] = useState<string>('Sign in or register for a free COLIN account to unlock verified property details, direct owner contact, and in-person visit slot bookings.');
  const [intendedUrl, setIntendedUrl] = useState<string | null>(null);

  useEffect(() => {
    // Check localStorage for existing demo session
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      console.warn('Failed to parse stored session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSession = (newUser: User) => {
    setUser(newUser);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    } catch {
      // Ignore localStorage quotas in demo mode
    }
  };

  const login = async (email: string, role: UserRole = 'student'): Promise<boolean> => {
    setIsLoading(true);
    // Simulate brief network delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'COLIN Member',
      email: email,
      phone: '+91 98100 ' + Math.floor(10000 + Math.random() * 90000),
      role: role,
      university: role === 'student' ? 'Delhi University' : undefined,
      city: 'Delhi NCR',
      avatar: role === 'student'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      memberSince: 'November 2026',
    };

    saveSession(newUser);
    setIsLoading(false);
    setIsAuthModalOpen(false);
    return true;
  };

  const signup = async (userData: { name: string; email: string; phone: string; role: UserRole; university?: string }): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 700));

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      role: userData.role,
      university: userData.university,
      city: 'Delhi NCR',
      avatar: userData.role === 'student'
        ? 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80'
        : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      memberSince: 'November 2026',
    };

    saveSession(newUser);
    setIsLoading(false);
    setIsAuthModalOpen(false);
    return true;
  };

  const demoLogin = (role: UserRole) => {
    const selected = role === 'student' ? DEMO_STUDENT : DEMO_OWNER;
    saveSession(selected);
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ignore
    }
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
