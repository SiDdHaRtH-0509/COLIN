import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  AlertCircle,
  User,
  Building
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid academic or personal email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    try {
      const success = await login(email);
      if (success) {
        navigate(redirectUrl);
      }
    } catch {
      setError('Authentication failed. Please check your credentials.');
    }
  };

  const handleDemoClick = (role: 'student' | 'owner') => {
    demoLogin(role);
    navigate(redirectUrl);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-br from-colin-navy-50 via-colin-offwhite to-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        
        {/* Branding & Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <img
              src="/assets/colin-logo.png"
              alt="COLIN Logo"
              className="h-12 w-auto object-contain"
            />
            <span className="text-2xl font-black text-colin-navy tracking-tight font-display">
              COLIN<span className="text-colin-orange">.</span>
            </span>
          </Link>
          <h1 className="text-2xl font-extrabold text-colin-navy tracking-tight font-display">
            Welcome Back to COLIN
          </h1>
          <p className="text-xs text-colin-charcoal-500">
            Sign in to unlock verified student stays, landlord contacts, and booking passes.
          </p>
        </div>

        {/* Demo Prototype Security Notice */}
        <div className="bg-colin-orange/10 border border-colin-orange/30 rounded-2xl p-3.5 text-xs text-colin-charcoal-700 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-colin-orange-900">
            <Sparkles size={14} className="text-colin-orange" />
            <span>Prototype Demo Authentication</span>
          </div>
          <p className="text-[11px] text-colin-charcoal-600 leading-relaxed">
            This prototype operates in local simulated authentication mode. You can log in using any email, or click an instant demo preset below.
          </p>
        </div>

        {/* Quick 1-Click Demo Login Presets */}
        <div className="bg-white rounded-2xl p-4 border border-colin-charcoal-200 shadow-sm space-y-2.5">
          <div className="text-[11px] font-bold text-colin-charcoal-500 uppercase tracking-wider flex items-center justify-between">
            <span>Instant Demo Evaluation</span>
            <span className="text-colin-teal text-[10px] font-bold">1-Click</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoClick('student')}
              className="p-2.5 rounded-xl border border-colin-teal/40 bg-colin-teal/5 hover:bg-colin-teal/15 text-left transition-all flex items-center gap-2 group"
            >
              <div className="w-7 h-7 rounded-lg bg-colin-teal text-white flex items-center justify-center shrink-0">
                <User size={14} />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-colin-navy truncate">Student Demo</div>
                <div className="text-[10px] text-colin-charcoal-500 truncate">Aarav (DU)</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoClick('owner')}
              className="p-2.5 rounded-xl border border-colin-orange/40 bg-colin-orange/5 hover:bg-colin-orange/15 text-left transition-all flex items-center gap-2 group"
            >
              <div className="w-7 h-7 rounded-lg bg-colin-orange text-colin-navy-950 flex items-center justify-center shrink-0">
                <Building size={14} />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-colin-navy truncate">Owner Demo</div>
                <div className="text-[10px] text-colin-charcoal-500 truncate">Col. Rajesh</div>
              </div>
            </button>
          </div>
        </div>

        {/* Login Form Container */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-colin-charcoal-200">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                Email Address:
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@du.ac.in or personal email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password Field with Visibility Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                  Password:
                </label>
                <span className="text-[11px] text-colin-teal font-semibold hover:underline cursor-pointer">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password (min 6 chars)"
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400 hover:text-colin-navy transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
                rightIcon={<ArrowRight size={14} />}
              >
                Sign In to COLIN
              </Button>
            </div>
          </form>

          {/* Toggle to Signup */}
          <div className="mt-6 pt-5 border-t border-colin-charcoal-100 text-center text-xs text-colin-charcoal-600">
            <span>Don't have a COLIN account yet?</span>{' '}
            <Link
              to={`/signup${redirectUrl !== '/' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
              className="font-bold text-colin-teal hover:underline"
            >
              Register for Free
            </Link>
          </div>
        </div>

        {/* Return to Home link */}
        <div className="text-center">
          <Link to="/" className="text-xs text-colin-charcoal-500 hover:text-colin-navy font-semibold transition-colors">
            ← Back to Public Homepage
          </Link>
        </div>
      </div>
    </div>
  );
};
