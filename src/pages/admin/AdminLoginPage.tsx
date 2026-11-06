/**
 * COLIN Admin Control Centre — Enterprise Administrative Login
 * Phase 4A: Dedicated, Secure, Multi-Factor Administrative Gateway
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { AdminApiClient } from '../../services/admin/adminApiClient';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Clock,
  X,
  ShieldAlert,
} from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, verifyMfa, isAuthenticated } = useAdminAuth();

  const redirectUrl = searchParams.get('redirect') || '/admin';
  const isSessionExpired = searchParams.get('expired') === 'true';

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  // MFA Challenge State
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [tempMfaToken, setTempMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);

  // Forgot Password Modal State
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotTokenSimulated, setForgotTokenSimulated] = useState<string | null>(null);

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectUrl, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectUrl]);

  // Rate-limit countdown timer
  useEffect(() => {
    if (!retryAfter || retryAfter <= 0) return;
    const interval = setInterval(() => {
      setRetryAfter((prev) => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [retryAfter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please provide a valid administrative email.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your security passphrase.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(email, password, rememberDevice);
      if (res.requiresMfa && res.tempMfaToken) {
        setTempMfaToken(res.tempMfaToken);
        setMfaModalOpen(true);
      } else if (res.success) {
        navigate(redirectUrl, { replace: true });
      } else {
        setErrorMessage(res.message || 'Authentication rejected by security policy.');
        if (res.retryAfterSeconds) {
          setRetryAfter(res.retryAfterSeconds);
        }
      }
    } catch {
      setErrorMessage('An unexpected error occurred while communicating with the security gateway.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);

    if (!tempMfaToken) {
      setMfaError('MFA session expired. Please log in again.');
      return;
    }
    if (!mfaCode.trim() || mfaCode.trim().length !== 6) {
      setMfaError('Please enter a valid 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await verifyMfa(tempMfaToken, mfaCode, rememberDevice);
      if (res.success) {
        setMfaModalOpen(false);
        navigate(redirectUrl, { replace: true });
      } else {
        setMfaError(res.message || 'MFA validation failed.');
      }
    } catch {
      setMfaError('Failed to verify multi-factor authentication code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) return;

    try {
      const res = await AdminApiClient.requestPasswordReset(forgotEmail);
      setForgotSuccess(true);
      if (res.data?.resetTokenSimulated) {
        setForgotTokenSimulated(res.data.resetTokenSimulated);
      }
    } catch {
      setForgotSuccess(true);
    }
  };

  return (
    <div className="min-h-screen bg-colin-navy-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-white selection:bg-colin-teal selection:text-white">
      {/* Background Decorative Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#16B8A6_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-colin-navy-900 border border-colin-navy-800 shadow-xl mb-4 group">
            <img
              src="/assets/colin-logo.png"
              alt="COLIN Logo"
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </div>

          <div className="flex items-center justify-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-colin-teal/10 text-colin-teal border border-colin-teal/20">
              <ShieldCheck size={13} />
              COLIN Control Centre
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
            Admin Authentication Gateway
          </h1>
          
          <p className="mt-2 text-xs sm:text-sm text-colin-charcoal-400 max-w-sm mx-auto">
            Authorized Personnel Only. All administrative actions and login attempts are strictly audited and cryptographically verified.
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-8 bg-colin-navy-900/95 backdrop-blur-xl border border-colin-navy-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-colin-teal via-colin-orange to-colin-teal" />

          {/* Session Expired Banner */}
          {isSessionExpired && (
            <div className="mb-5 p-3.5 rounded-xl bg-colin-orange/10 border border-colin-orange/30 text-colin-orange flex items-start gap-2.5 text-xs">
              <Clock size={16} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Session Timeout</span>
                Your administrative session expired due to inactivity. Please re-authenticate.
              </div>
            </div>
          )}

          {/* Rate-Limit Warning Banner */}
          {retryAfter && retryAfter > 0 && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-start gap-2.5 text-xs">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Brute-Force Protection Active</span>
                Too many failed attempts. Security cooldown active: please wait{' '}
                <span className="font-mono font-bold text-white">{retryAfter}s</span> before retrying.
              </div>
            </div>
          )}

          {/* General Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-start gap-2.5 text-xs animate-fade-in-up">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Access Denied</span>
                {errorMessage}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-colin-charcoal-300 mb-1.5">
                Administrative Identity (Email)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-colin-charcoal-500">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@colin.in"
                  required
                  disabled={isSubmitting || !!retryAfter}
                  autoComplete="email"
                  className="w-full pl-9 pr-3 py-2.5 bg-colin-navy-950/80 border border-colin-navy-700 rounded-xl text-sm text-white placeholder-colin-charcoal-500 focus:outline-none focus:border-colin-teal focus:ring-1 focus:ring-colin-teal transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-colin-charcoal-300">
                  Security Passphrase
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotSuccess(false);
                    setForgotModalOpen(true);
                  }}
                  className="text-xs text-colin-teal hover:text-colin-teal-300 font-medium transition-colors"
                >
                  Forgot passphrase?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-colin-charcoal-500">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  disabled={isSubmitting || !!retryAfter}
                  autoComplete="current-password"
                  className="w-full pl-9 pr-10 py-2.5 bg-colin-navy-950/80 border border-colin-navy-700 rounded-xl text-sm text-white placeholder-colin-charcoal-500 focus:outline-none focus:border-colin-teal focus:ring-1 focus:ring-colin-teal transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-colin-charcoal-500 hover:text-colin-charcoal-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Device Policy */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  disabled={isSubmitting || !!retryAfter}
                  className="mt-0.5 rounded border-colin-navy-700 bg-colin-navy-950 text-colin-teal focus:ring-colin-teal focus:ring-offset-0"
                />
                <span className="text-xs text-colin-charcoal-400 leading-tight select-none">
                  Remember this workstation for 7 days{' '}
                  <span className="text-[10px] text-colin-charcoal-500 block">
                    (Requires device compliance with COLIN zero-trust hardware policy)
                  </span>
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !!retryAfter}
                className="w-full py-3 px-4 rounded-xl bg-colin-teal hover:bg-colin-teal-600 text-white font-bold text-sm tracking-wide shadow-brand-teal transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Authenticate to Control Centre</span>
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security Notice Footer */}
          <div className="mt-6 pt-5 border-t border-colin-navy-800 text-center">
            <p className="text-[11px] text-colin-charcoal-500 leading-relaxed">
              COLIN Security Infrastructure • Mutual TLS, PBKDF2/SHA-256 with dynamic salt, and immutable audit logging enforced.
            </p>
          </div>
        </div>
      </div>

      {/* MFA Verification Modal */}
      {mfaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-colin-navy-900 border border-colin-navy-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setMfaModalOpen(false);
                setMfaCode('');
                setMfaError(null);
              }}
              className="absolute top-4 right-4 text-colin-charcoal-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-xl bg-colin-teal/10 border border-colin-teal/20 text-colin-teal flex items-center justify-center mb-3">
              <KeyRound size={24} />
            </div>

            <h3 className="text-lg font-bold text-white font-display mb-1">
              Two-Factor Authentication
            </h3>
            <p className="text-xs text-colin-charcoal-400 mb-4 leading-relaxed">
              Enter the 6-digit security code generated by your hardware authenticator or authorized device.
            </p>

            {mfaError && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {mfaError}
              </div>
            )}

            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoFocus
                  required
                  className="w-full text-center tracking-[0.5em] font-mono text-2xl font-bold py-3 bg-colin-navy-950 border border-colin-navy-700 rounded-xl text-white placeholder-colin-charcoal-600 focus:outline-none focus:border-colin-teal focus:ring-1 focus:ring-colin-teal"
                />
                <span className="block text-[10px] text-colin-charcoal-500 text-center mt-1.5">
                  Code expires in 5 minutes
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || mfaCode.length !== 6}
                className="w-full py-2.5 rounded-xl bg-colin-teal hover:bg-colin-teal-600 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Validating Token...' : 'Confirm & Proceed'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Forgot Passphrase Recovery Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-colin-navy-900 border border-colin-navy-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setForgotModalOpen(false)}
              className="absolute top-4 right-4 text-colin-charcoal-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-xl bg-colin-orange/10 border border-colin-orange/20 text-colin-orange flex items-center justify-center mb-3">
              <Lock size={24} />
            </div>

            <h3 className="text-lg font-bold text-white font-display mb-1">
              Passphrase Recovery
            </h3>
            <p className="text-xs text-colin-charcoal-400 mb-4 leading-relaxed">
              Administrative recovery requires security validation. Submit your registered email to dispatch a time-limited one-time reset token.
            </p>

            {forgotSuccess ? (
              <div className="space-y-4">
                <div className="p-3 bg-colin-teal/10 border border-colin-teal/30 rounded-xl text-colin-teal text-xs flex items-start gap-2">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Recovery Dispatched</span>
                    If the account exists, cryptographic reset credentials have been routed to the administrative mailbox.
                  </div>
                </div>

                {forgotTokenSimulated && (
                  <div className="p-3 bg-colin-navy-950 border border-colin-navy-800 rounded-xl text-xs">
                    <span className="text-[10px] uppercase font-bold text-colin-charcoal-400 block mb-1">
                      Simulated Recovery Token (Development Sandbox):
                    </span>
                    <code className="text-colin-orange font-mono break-all text-[11px]">
                      {forgotTokenSimulated}
                    </code>
                  </div>
                )}

                <button
                  onClick={() => setForgotModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-colin-navy-800 hover:bg-colin-navy-700 text-white font-semibold text-xs transition-colors"
                >
                  Close Recovery Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="admin@colin.in"
                    required
                    className="w-full px-3 py-2.5 bg-colin-navy-950 border border-colin-navy-700 rounded-xl text-sm text-white placeholder-colin-charcoal-500 focus:outline-none focus:border-colin-teal"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-colin-teal hover:bg-colin-teal-600 text-white font-semibold text-sm transition-colors"
                >
                  Send Recovery Link
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
