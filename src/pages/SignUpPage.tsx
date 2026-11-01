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

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return { label: 'Empty', color: 'bg-colin-charcoal-200', percent: 0 };
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

    // Form Validations
    if (!name.trim()) {
      setError('Please provide your full legal name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid academic or personal email address.');
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
      setError('Passwords do not match. Please re-check.');
      return;
    }
    if (!termsAccepted) {
      setError('You must accept the COLIN Safety Guidelines and Terms.');
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
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-br from-colin-navy-50 via-colin-offwhite to-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg space-y-6">
        
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
            Create Your Free Account
          </h1>
          <p className="text-xs text-colin-charcoal-500">
            Join 50,000+ students and verified property hosts across Indian university cities.
          </p>
        </div>

        {/* Signup Form Container */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-colin-charcoal-200 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Role Selector Tabs */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
              I am registering as:
            </label>
            <div className="grid grid-cols-2 gap-2 bg-colin-offwhite p-1 rounded-2xl border border-colin-charcoal-200">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  role === 'student'
                    ? 'bg-colin-navy text-white shadow-sm'
                    : 'text-colin-charcoal-600 hover:text-colin-navy'
                }`}
              >
                <GraduationCap size={15} />
                <span>Student / Scholar</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('owner')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  role === 'owner'
                    ? 'bg-colin-teal text-white shadow-sm'
                    : 'text-colin-charcoal-600 hover:text-colin-teal'
                }`}
              >
                <Building size={15} />
                <span>Property Host / Owner</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                Full Legal Name:
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aarav Mehra"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none"
                />
              </div>
            </div>

            {/* Email & Phone Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    placeholder="name@email.com"
                    required
                    className="w-full pl-10 pr-3 py-2.5 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                  Mobile Number:
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                    className="w-full pl-10 pr-3 py-2.5 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* University / College (Student only) */}
            {role === 'student' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                  College / University / Coaching Institute:
                </label>
                <div className="relative">
                  <GraduationCap size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400" />
                  <input
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="e.g. Delhi University (SRCC, Hansraj), Christ, Symbiosis, IIT"
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                  Password:
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400 hover:text-colin-navy"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                  Confirm Password:
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Password Strength Meter */}
            {password && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] text-colin-charcoal-500">
                  <span>Strength: <strong>{strength.label}</strong></span>
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
            <div className="pt-2 flex items-start gap-2 text-xs text-colin-charcoal-600">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 rounded text-colin-teal focus:ring-colin-teal cursor-pointer"
              />
              <label htmlFor="terms" className="cursor-pointer leading-relaxed text-[11px]">
                I agree to the COLIN Verified Member Code of Conduct, zero harassment policy, and data privacy terms.
              </label>
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
                Complete Registration
              </Button>
            </div>
          </form>

          {/* Toggle to Login */}
          <div className="mt-6 pt-5 border-t border-colin-charcoal-100 text-center text-xs text-colin-charcoal-600">
            <span>Already have a COLIN account?</span>{' '}
            <Link
              to={`/login${redirectUrl !== '/' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
              className="font-bold text-colin-teal hover:underline"
            >
              Log In
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
