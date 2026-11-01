import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { 
  Lock, 
  Mail, 
  User, 
  Phone, 
  GraduationCap, 
  Building, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/common/Button';

export const SignUpPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<UserRole>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [university, setUniversity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return { label: 'None', color: 'bg-colin-charcoal-200', percent: 0 };
    let score = 0;
    if (password.length >= 6) score += 25;
    if (password.length >= 8) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;

    if (score <= 25) return { label: 'Weak', color: 'bg-rose-500', percent: 25 };
    if (score <= 50) return { label: 'Fair', color: 'bg-colin-orange', percent: 50 };
    if (score <= 75) return { label: 'Good', color: 'bg-colin-teal', percent: 75 };
    return { label: 'Strong', color: 'bg-emerald-600', percent: 100 };
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide your full legal name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }
    if (!termsAccepted) {
      setError('You must agree to the COLIN Verified Member Guidelines.');
      return;
    }

    try {
      const success = await signup({
        name,
        email,
        phone,
        role,
        university: role === 'student' ? university : undefined,
      });

      if (success) {
        navigate(redirectUrl);
      }
    } catch {
      setError('Registration could not be completed. Please try again.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-colin-navy-50/50 via-white to-colin-offwhite flex items-center justify-center px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Background Ambient Gradients */}
      <div className="absolute top-1/4 -right-20 w-80 h-80 bg-colin-teal/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-colin-orange/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Registration Card */}
      <div className="w-full max-w-[620px] animate-pin-drop">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-brand hover:shadow-brand-hover transition-all duration-300 border border-colin-charcoal-200/90 relative">
          
          {/* Top Brand Crown */}
          <div className="text-center space-y-2 mb-6">
            <Link to="/" className="inline-flex items-center gap-2.5 group focus:outline-none">
              <div className="relative">
                <img
                  src="/assets/colin-logo.png"
                  alt="COLIN Logo"
                  className="h-11 sm:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
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
                Create your account
              </h1>
              <p className="text-xs text-colin-charcoal-500">
                Join verified students and accommodation hosts across major university campuses.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Segmented Role Switcher */}
          <div className="mb-6 space-y-1.5">
            <label className="text-[10px] font-bold text-colin-charcoal-500 uppercase tracking-wider block">
              I am registering as:
            </label>
            <div className="grid grid-cols-2 gap-2 bg-colin-offwhite p-1 rounded-2xl border border-colin-charcoal-200">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  role === 'student'
                    ? 'bg-colin-navy text-white shadow-sm'
                    : 'text-colin-charcoal-600 hover:text-colin-navy hover:bg-white/60'
                }`}
              >
                <GraduationCap size={16} className={role === 'student' ? 'text-colin-orange' : 'text-colin-charcoal-400'} />
                <span>Student / Scholar</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('owner')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  role === 'owner'
                    ? 'bg-colin-teal text-white shadow-sm'
                    : 'text-colin-charcoal-600 hover:text-colin-teal hover:bg-white/60'
                }`}
              >
                <Building size={16} className={role === 'owner' ? 'text-white' : 'text-colin-charcoal-400'} />
                <span>Property Host / Owner</span>
              </button>
            </div>
          </div>

          {/* Registration Form with Balanced 2-Column Grid */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Full Legal Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-colin-charcoal-700 uppercase tracking-wider block">
                  Full Name
                </label>
                <div className="relative group">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400 group-focus-within:text-colin-teal transition-colors" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aarav Mehra"
                    required
                    className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-colin-charcoal-300 focus:border-colin-navy focus:ring-2 focus:ring-colin-teal/20 focus:outline-none transition-all placeholder:text-colin-charcoal-400 text-colin-navy font-medium bg-colin-offwhite/50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-colin-charcoal-700 uppercase tracking-wider block">
                  Mobile Number
                </label>
                <div className="relative group">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400 group-focus-within:text-colin-teal transition-colors" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                    className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-colin-charcoal-300 focus:border-colin-navy focus:ring-2 focus:ring-colin-teal/20 focus:outline-none transition-all placeholder:text-colin-charcoal-400 text-colin-navy font-medium bg-colin-offwhite/50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-bold text-colin-charcoal-700 uppercase tracking-wider block">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400 group-focus-within:text-colin-teal transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@du.ac.in or personal email"
                    required
                    className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-colin-charcoal-300 focus:border-colin-navy focus:ring-2 focus:ring-colin-teal/20 focus:outline-none transition-all placeholder:text-colin-charcoal-400 text-colin-navy font-medium bg-colin-offwhite/50 focus:bg-white"
                  />
                </div>
              </div>

              {/* University (for student) */}
              {role === 'student' && (
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-colin-charcoal-700 uppercase tracking-wider block">
                    College / University / Coaching Institute
                  </label>
                  <div className="relative group">
                    <GraduationCap size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400 group-focus-within:text-colin-teal transition-colors" />
                    <input
                      type="text"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      placeholder="e.g. Delhi University (SRCC), Christ, Symbiosis, IIT"
                      className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-colin-charcoal-300 focus:border-colin-navy focus:ring-2 focus:ring-colin-teal/20 focus:outline-none transition-all placeholder:text-colin-charcoal-400 text-colin-navy font-medium bg-colin-offwhite/50 focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-colin-charcoal-700 uppercase tracking-wider block">
                  Password
                </label>
                <div className="relative group">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400 group-focus-within:text-colin-teal transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    required
                    className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm rounded-xl border border-colin-charcoal-300 focus:border-colin-navy focus:ring-2 focus:ring-colin-teal/20 focus:outline-none transition-all placeholder:text-colin-charcoal-400 text-colin-navy font-medium bg-colin-offwhite/50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-colin-charcoal-400 hover:text-colin-navy focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-colin-charcoal-700 uppercase tracking-wider block">
                  Confirm Password
                </label>
                <div className="relative group">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400 group-focus-within:text-colin-teal transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-colin-charcoal-300 focus:border-colin-navy focus:ring-2 focus:ring-colin-teal/20 focus:outline-none transition-all placeholder:text-colin-charcoal-400 text-colin-navy font-medium bg-colin-offwhite/50 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] text-colin-charcoal-500 font-bold uppercase tracking-wider">
                  <span>Strength: <strong className="text-colin-navy">{strength.label}</strong></span>
                  <span>{strength.percent}%</span>
                </div>
                <div className="w-full bg-colin-charcoal-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strength.color} transition-all duration-300`}
                    style={{ width: `${strength.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Terms Checkbox */}
            <div className="pt-2 flex items-start gap-2.5 text-xs text-colin-charcoal-600">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 rounded text-colin-teal focus:ring-colin-teal cursor-pointer accent-colin-teal"
              />
              <label htmlFor="terms" className="cursor-pointer leading-relaxed text-[11px] text-colin-charcoal-600">
                I agree to the <span className="text-colin-navy font-bold">COLIN Verified Member Terms</span>, anti-ragging code, and privacy policy.
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full h-11 text-sm font-extrabold shadow-brand hover:shadow-brand-hover bg-colin-navy hover:bg-colin-navy-800"
                isLoading={isLoading}
                rightIcon={<ArrowRight size={15} />}
              >
                Complete Registration
              </Button>
            </div>
          </form>

          {/* Toggle Link to Login */}
          <div className="mt-5 pt-4 border-t border-colin-charcoal-100 text-center text-xs text-colin-charcoal-600">
            <span>Already have an account?</span>{' '}
            <Link
              to={`/login${redirectUrl !== '/' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
              className="font-extrabold text-colin-teal hover:underline ml-1"
            >
              Sign In
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
    </div>
  );
};
