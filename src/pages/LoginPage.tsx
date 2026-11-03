import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle,
  GraduationCap,
  Building,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Button } from '../components/common/Button';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const { login, demoLogin, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    try {
      const success = await login(email);
      if (success) {
        if (redirectUrl && redirectUrl !== '/' && !redirectUrl.includes('/student') || email.includes('student') || !email.includes('owner')) {
          navigate(redirectUrl && redirectUrl !== '/' ? redirectUrl : '/student/dashboard');
        } else {
          navigate(redirectUrl && !redirectUrl.includes('/student') ? redirectUrl : '/');
        }
      }
    } catch {
      setError('Authentication failed. Please verify your credentials.');
    }
  };

  const handleDemoFill = (role: 'student' | 'owner') => {
    demoLogin(role);
    if (role === 'student') {
      navigate(redirectUrl && redirectUrl !== '/' ? redirectUrl : '/student/dashboard');
    } else {
      navigate(redirectUrl && !redirectUrl.includes('/student') ? redirectUrl : '/');
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotEmail.includes('@')) {
      setForgotSuccess(true);
      setTimeout(() => {
        setForgotModalOpen(false);
        setForgotSuccess(false);
        setForgotEmail('');
      }, 2500);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-colin-navy-50/50 via-white to-colin-offwhite flex items-center justify-center px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Logo-inspired Background Ambient Gradients */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-colin-teal/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-colin-orange/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Login Card Container */}
      <div className="w-full max-w-[440px] animate-pin-drop">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-brand hover:shadow-brand-hover transition-all duration-300 border border-colin-charcoal-200/90 relative">
          
          {/* Top Brand Crown with Logo-Inspired Entrance */}
          <div className="text-center space-y-3 mb-6">
            <Link to="/" className="inline-flex items-center gap-2.5 group focus:outline-none">
              <div className="relative">
                <img
                  src="/assets/colin-logo.png"
                  alt="COLIN Logo"
                  className="h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-colin-teal rounded-full border-2 border-white animate-pulse" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-black text-colin-navy tracking-tight font-display leading-none">
                  COLIN<span className="text-colin-orange text-3xl leading-none">.</span>
                </div>
                <div className="text-[9px] uppercase font-bold tracking-widest text-colin-teal-700 mt-0.5">
                  Verified Student Living
                </div>
              </div>
            </Link>

            <div className="space-y-1 pt-1">
              <h1 className="text-xl sm:text-2xl font-black text-colin-navy tracking-tight font-display">
                Sign in to your account
              </h1>
              <p className="text-xs text-colin-charcoal-500">
                Unlock verified student accommodations, owner phone numbers & visit passes.
              </p>
            </div>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-colin-charcoal-700 uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative group">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400 group-focus-within:text-colin-teal transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@du.ac.in or personal email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-colin-charcoal-300 focus:border-colin-navy focus:ring-2 focus:ring-colin-teal/20 focus:outline-none transition-all placeholder:text-colin-charcoal-400 text-colin-navy font-medium bg-colin-offwhite/50 focus:bg-white"
                />
              </div>
            </div>

            {/* Password Field with Refined Visibility Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-colin-charcoal-700 uppercase tracking-wider block">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-[11px] text-colin-teal-700 font-bold hover:text-colin-navy transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative group">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400 group-focus-within:text-colin-teal transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password (min 6 characters)"
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-colin-charcoal-300 focus:border-colin-navy focus:ring-2 focus:ring-colin-teal/20 focus:outline-none transition-all placeholder:text-colin-charcoal-400 text-colin-navy font-medium bg-colin-offwhite/50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400 hover:text-colin-navy transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Sign In Primary Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full h-11 text-sm font-extrabold shadow-brand hover:shadow-brand-hover bg-colin-navy hover:bg-colin-navy-800"
                isLoading={isLoading}
                rightIcon={<ArrowRight size={15} />}
              >
                Sign In
              </Button>
            </div>
          </form>

          {/* Streamlined Test Sign-In Shortcuts (Clean & Professional, Zero Prototype Banners) */}
          <div className="mt-5 pt-4 border-t border-colin-charcoal-100">
            <div className="flex items-center justify-between text-[10px] font-bold text-colin-charcoal-500 uppercase tracking-wider mb-2">
              <span>Quick evaluation credentials:</span>
              <span className="text-colin-teal flex items-center gap-1 font-bold">
                <Sparkles size={11} className="text-colin-orange" /> 1-Click
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill('student')}
                className="p-2 rounded-xl border border-colin-charcoal-200 hover:border-colin-teal bg-colin-offwhite hover:bg-colin-teal/5 text-left transition-all flex items-center gap-2 group"
                title="Log in as demo student Aarav Mehra"
              >
                <div className="w-6 h-6 rounded-lg bg-colin-teal/15 text-colin-teal flex items-center justify-center shrink-0 group-hover:bg-colin-teal group-hover:text-white transition-colors">
                  <GraduationCap size={13} />
                </div>
                <div className="overflow-hidden">
                  <div className="text-[11px] font-bold text-colin-navy truncate">Student Account</div>
                  <div className="text-[9px] text-colin-charcoal-500 truncate">Aarav (DU Scholar)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('owner')}
                className="p-2 rounded-xl border border-colin-charcoal-200 hover:border-colin-orange bg-colin-offwhite hover:bg-colin-orange/5 text-left transition-all flex items-center gap-2 group"
                title="Log in as demo host Col. Rajesh Sharma"
              >
                <div className="w-6 h-6 rounded-lg bg-colin-orange/15 text-colin-orange flex items-center justify-center shrink-0 group-hover:bg-colin-orange group-hover:text-colin-navy-950 transition-colors">
                  <Building size={13} />
                </div>
                <div className="overflow-hidden">
                  <div className="text-[11px] font-bold text-colin-navy truncate">Owner Account</div>
                  <div className="text-[9px] text-colin-charcoal-500 truncate">Col. Rajesh (Host)</div>
                </div>
              </button>
            </div>
          </div>

          {/* Toggle Link to Signup */}
          <div className="mt-5 text-center text-xs text-colin-charcoal-600">
            <span>Don't have a COLIN account?</span>{' '}
            <Link
              to={`/signup${redirectUrl !== '/' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
              className="font-extrabold text-colin-teal hover:underline ml-1"
            >
              Register for Free
            </Link>
          </div>

        </div>

        {/* Minimal Return to Home link */}
        <div className="text-center mt-4">
          <Link to="/" className="text-xs text-colin-charcoal-500 hover:text-colin-navy font-semibold transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-colin-navy-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-colin-charcoal-200 space-y-4">
            <div className="space-y-1 text-center">
              <h3 className="text-lg font-black text-colin-navy">Reset Password</h3>
              <p className="text-xs text-colin-charcoal-500">
                Enter your email address and we will send you a secure password reset link.
              </p>
            </div>

            {forgotSuccess ? (
              <div className="p-4 bg-colin-teal/10 border border-colin-teal/40 rounded-2xl text-center space-y-2">
                <CheckCircle2 size={24} className="text-colin-teal mx-auto" />
                <p className="text-xs font-bold text-colin-navy">Reset link sent to {forgotEmail}!</p>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  required
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => setForgotModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="flex-1"
                  >
                    Send Link
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
