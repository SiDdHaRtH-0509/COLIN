import React, { useState } from 'react';
import { useProperties } from '../../context/PropertyContext';
import {
  Settings,
  Building,
  Lock,
  Bell,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '../../components/common/Button';

export const OwnerSettingsPage: React.FC = () => {
  const { ownerProfile, updateOwnerProfile } = useProperties();

  // Active Settings Tab
  const [activeTab, setActiveTab] = useState<'profile' | 'banking' | 'notifications' | 'security'>('profile');

  // Profile Form State
  const [businessName, setBusinessName] = useState(ownerProfile.businessName);
  const [ownerName, setOwnerName] = useState(ownerProfile.ownerName);
  const [email, setEmail] = useState(ownerProfile.email);
  const [phone, setPhone] = useState(ownerProfile.phone);
  const [address, setAddress] = useState(ownerProfile.address);
  const [city, setCity] = useState(ownerProfile.city);
  const [gstin, setGstin] = useState(ownerProfile.gstin || '');
  const [pan, setPan] = useState(ownerProfile.pan || '');
  const [avatar, setAvatar] = useState(ownerProfile.avatar);

  // Bank Form State
  const [accountNumber, setAccountNumber] = useState(ownerProfile.bankAccount?.accountNumber || '50200038921045');
  const [ifsc, setIfsc] = useState(ownerProfile.bankAccount?.ifsc || 'HDFC0000084');
  const [beneficiaryName, setBeneficiaryName] = useState(ownerProfile.bankAccount?.beneficiaryName || 'Col. Rajesh Sharma');
  const [bankName, setBankName] = useState(ownerProfile.bankAccount?.bankName || 'HDFC Bank, Mall Road');

  // Notifications State
  const [notifWhatsapp, setNotifWhatsapp] = useState(ownerProfile.notificationPreferences?.whatsapp ?? true);
  const [notifEmail, setNotifEmail] = useState(ownerProfile.notificationPreferences?.email ?? true);
  const [notifSms, setNotifSms] = useState(ownerProfile.notificationPreferences?.sms ?? true);
  const [notifInstant, setNotifInstant] = useState(ownerProfile.notificationPreferences?.instantEnquiryAlerts ?? true);

  // Password Demo State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Global Save Status
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Handle Profile Save
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOwnerProfile({
      businessName,
      ownerName,
      email,
      phone,
      address,
      city,
      gstin,
      pan,
      avatar,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Handle Bank Save
  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOwnerProfile({
      bankAccount: {
        accountNumber,
        ifsc,
        beneficiaryName,
        bankName,
      },
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Handle Notifications Save
  const handleNotifSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOwnerProfile({
      notificationPreferences: {
        whatsapp: notifWhatsapp,
        email: notifEmail,
        sms: notifSms,
        instantEnquiryAlerts: notifInstant,
      },
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Handle Password Submit
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('Password must contain at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please verify.');
      return;
    }

    setPasswordSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(false), 3000);
  };

  // Handle Avatar Change Demo
  const handleAvatarSelect = (url: string) => {
    setAvatar(url);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-colin-navy font-display flex items-center gap-2">
            <Settings size={28} className="text-colin-navy" />
            <span>Business Profile & Settings</span>
          </h1>
          <p className="text-xs text-colin-charcoal-500 mt-1">
            Manage your hostel operator identity, payout accounts, alert preferences, and account security.
          </p>
        </div>

        {saveSuccess && (
          <div className="bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5 animate-fadeIn">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>Changes Saved Successfully!</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-colin-charcoal-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`text-xs font-extrabold px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'profile'
              ? 'bg-colin-navy text-white shadow-sm'
              : 'text-colin-charcoal-600 hover:bg-colin-charcoal-100'
          }`}
        >
          <Building size={14} />
          <span>Business Identity</span>
        </button>

        <button
          onClick={() => setActiveTab('banking')}
          className={`text-xs font-extrabold px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'banking'
              ? 'bg-colin-navy text-white shadow-sm'
              : 'text-colin-charcoal-600 hover:bg-colin-charcoal-100'
          }`}
        >
          <CreditCard size={14} />
          <span>Payout Bank Account</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`text-xs font-extrabold px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'notifications'
              ? 'bg-colin-navy text-white shadow-sm'
              : 'text-colin-charcoal-600 hover:bg-colin-charcoal-100'
          }`}
        >
          <Bell size={14} />
          <span>Alerts & Notifications</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`text-xs font-extrabold px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'security'
              ? 'bg-colin-navy text-white shadow-sm'
              : 'text-colin-charcoal-600 hover:bg-colin-charcoal-100'
          }`}
        >
          <Lock size={14} />
          <span>Password & Security</span>
        </button>
      </div>

      {/* ================= TAB 1: BUSINESS PROFILE ================= */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200/90 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={avatar}
                alt={ownerName}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-colin-orange"
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-colin-teal text-white rounded-full flex items-center justify-center text-[10px] shadow">
                ✓
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-colin-navy">Operator Photo / Brand Avatar</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAvatarSelect('https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80')}
                  className="text-[11px] font-bold text-colin-teal hover:underline"
                >
                  Avatar 1 (Executive)
                </button>
                <span className="text-colin-charcoal-300">•</span>
                <button
                  type="button"
                  onClick={() => handleAvatarSelect('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80')}
                  className="text-[11px] font-bold text-colin-teal hover:underline"
                >
                  Avatar 2 (Formal)
                </button>
                <span className="text-colin-charcoal-300">•</span>
                <button
                  type="button"
                  onClick={() => handleAvatarSelect('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80')}
                  className="text-[11px] font-bold text-colin-teal hover:underline"
                >
                  Avatar 3 (Hostel Manager)
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                Hostel Brand / Operating Business Name *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy font-bold text-colin-navy"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                Owner / Managing Partner Name *
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                Business Contact Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                Official Phone / WhatsApp Number *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                Registered Business / Building Address *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                Operating City
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none bg-white font-medium"
              >
                <option>Delhi NCR</option>
                <option>Bengaluru</option>
                <option>Pune</option>
                <option>Mumbai</option>
                <option>Kota</option>
                <option>Hyderabad</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                GSTIN (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 07AAACS1429B1Z8"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                PAN (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. AAACS1429B"
                value={pan}
                onChange={(e) => setPan(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-colin-charcoal-100 flex justify-end">
            <Button type="submit" variant="primary" size="md" className="bg-colin-navy">
              Save Business Profile
            </Button>
          </div>
        </form>
      )}

      {/* ================= TAB 2: PAYOUT BANK ACCOUNT ================= */}
      {activeTab === 'banking' && (
        <form onSubmit={handleBankSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200/90 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-colin-navy font-display">
              Payout Bank Account Configuration
            </h2>
            <p className="text-xs text-colin-charcoal-500">
              Student visit deposits (₹150 minus 55% refund guarantee) and advance move-in balances are remitted directly to this account via NEFT/IMPS.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                Beneficiary Name (As on Bank Passbook) *
              </label>
              <input
                type="text"
                required
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                Bank Name & Branch *
              </label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                Account Number *
              </label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                IFSC Code *
              </label>
              <input
                type="text"
                required
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none font-mono uppercase font-bold"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-colin-charcoal-100 flex justify-end">
            <Button type="submit" variant="primary" size="md" className="bg-colin-navy">
              Save Payout Account
            </Button>
          </div>
        </form>
      )}

      {/* ================= TAB 3: NOTIFICATIONS ================= */}
      {activeTab === 'notifications' && (
        <form onSubmit={handleNotifSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200/90 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-colin-navy font-display">
              Lead & Inspection Alert Preferences
            </h2>
            <p className="text-xs text-colin-charcoal-500">
              Configure real-time communication channels for new student enquiries and confirmed visit passes.
            </p>
          </div>

          <div className="divide-y divide-colin-charcoal-100">
            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-colin-navy block">WhatsApp Instant Alerts</span>
                <span className="text-[11px] text-colin-charcoal-500">
                  Receive instant WhatsApp alerts when a student submits an accommodation enquiry.
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifWhatsapp}
                onChange={(e) => setNotifWhatsapp(e.target.checked)}
                className="w-4 h-4 rounded text-colin-navy focus:ring-colin-navy"
              />
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-colin-navy block">SMS Dispatch</span>
                <span className="text-[11px] text-colin-charcoal-500">
                  Receive SMS confirmation whenever an in-person visit slot is booked with paid pass.
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifSms}
                onChange={(e) => setNotifSms(e.target.checked)}
                className="w-4 h-4 rounded text-colin-navy focus:ring-colin-navy"
              />
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-colin-navy block">Instant Enquiry Alerts</span>
                <span className="text-[11px] text-colin-charcoal-500">
                  Priority real-time notification push on the Owner Dashboard when a student contacts.
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifInstant}
                onChange={(e) => setNotifInstant(e.target.checked)}
                className="w-4 h-4 rounded text-colin-navy focus:ring-colin-navy"
              />
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-colin-navy block">Email Digests & Reports</span>
                <span className="text-[11px] text-colin-charcoal-500">
                  Weekly occupancy metrics, campus admission alerts, and billing receipts.
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifEmail}
                onChange={(e) => setNotifEmail(e.target.checked)}
                className="w-4 h-4 rounded text-colin-navy focus:ring-colin-navy"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-colin-charcoal-100 flex justify-end">
            <Button type="submit" variant="primary" size="md" className="bg-colin-navy">
              Save Notification Preferences
            </Button>
          </div>
        </form>
      )}

      {/* ================= TAB 4: PASSWORD & SECURITY ================= */}
      {activeTab === 'security' && (
        <form onSubmit={handlePasswordSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200/90 shadow-sm max-w-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-colin-navy font-display">
              Change Account Password
            </h2>
            <p className="text-xs text-colin-charcoal-500">
              Demonstration interface to test host account credential updates and security verification.
            </p>
          </div>

          {passwordError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>Password updated successfully!</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                Current Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                New Password (Minimum 6 characters)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-colin-charcoal-400 hover:text-colin-navy"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-colin-charcoal-100 flex justify-end">
            <Button type="submit" variant="primary" size="md" className="bg-colin-navy">
              Update Password
            </Button>
          </div>
        </form>
      )}

    </div>
  );
};
