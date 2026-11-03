import React, { useState, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStudent } from '../../context/StudentContext';
import { useToast } from '../../context/ToastContext';
import { validateProfilePhotoFile, readFileAsDataUrl } from '../../utils/imageStorage';
import { CITIES, UNIVERSITIES_LIST } from '../../data/mockData';
import {
  Mail,
  Phone,
  Crown,
  CheckCircle2,
  LogOut,
  GraduationCap,
  MapPin,
  Calendar,
  ShieldCheck,
  Building,
  User,
  Sliders,
  Utensils,
  Wind,
  Wifi,
  Shirt,
  Lock,
  RotateCcw,
  Sparkles,
  Info,
  CircleDot,
  Bell,
  Eye,
  Camera,
  Upload,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '../../components/common/Button';

export const StudentProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const { showToast } = useToast();
  const {
    studentPreferences,
    updateStudentPreferences,
    updateProfilePhoto,
    removeProfilePhoto,
    profileCompletionPercent,
    missingProfileFields,
    wishlist,
    upcomingVisitsCount,
    comparisonList,
    premiumSubscription,
  } = useStudent();

  // Active Tab State in Main Section
  const [activeTab, setActiveTab] = useState<'academic' | 'accommodation' | 'lifestyle' | 'privacy'>('academic');

  // Form State
  const [formData, setFormData] = useState({
    fullName: studentPreferences.fullName || user?.name || 'Aarav Mehra',
    email: studentPreferences.email || user?.email || 'aarav.mehra@colin.in',
    phone: studentPreferences.phone || user?.phone || '+91 98765 43210',
    avatar: studentPreferences.avatar || user?.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
    gender: studentPreferences.gender || 'boys',
    university: studentPreferences.university || user?.university || UNIVERSITIES_LIST[0],
    course: studentPreferences.course || 'B.Com (Hons)',
    academicYear: studentPreferences.academicYear || '2nd Year (Undergraduate)',
    campusLocation: studentPreferences.campusLocation || 'North Campus (Vishwavidyalaya)',
    preferredCity: studentPreferences.preferredCity || 'Delhi NCR',
    maxBudget: studentPreferences.maxBudget || 15000,
    accommodationType: studentPreferences.accommodationType || 'PG',
    sharingPreference: studentPreferences.sharingPreference || 'double',
    foodPreference: studentPreferences.foodPreference || 'Vegetarian',
    moveInDate: studentPreferences.moveInDate || '2026-08-01',
    acRequired: studentPreferences.acRequired !== undefined ? studentPreferences.acRequired : true,
    wifiRequired: studentPreferences.wifiRequired !== undefined ? studentPreferences.wifiRequired : true,
    laundryRequired: studentPreferences.laundryRequired !== undefined ? studentPreferences.laundryRequired : true,
    securityRequired: studentPreferences.securityRequired !== undefined ? studentPreferences.securityRequired : true,
    foodIncludedRequired: studentPreferences.foodIncludedRequired || false,
    profileVisibility: studentPreferences.profileVisibility !== undefined ? studentPreferences.profileVisibility : true,
    whatsappAlerts: studentPreferences.whatsappAlerts !== undefined ? studentPreferences.whatsappAlerts : true,
    emailNewsletter: studentPreferences.emailNewsletter !== undefined ? studentPreferences.emailNewsletter : false,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Unsaved changes check
  const isDirty = useMemo(() => {
    return (
      formData.fullName !== (studentPreferences.fullName || user?.name || '') ||
      formData.email !== (studentPreferences.email || user?.email || '') ||
      formData.phone !== (studentPreferences.phone || user?.phone || '') ||
      formData.gender !== studentPreferences.gender ||
      formData.university !== studentPreferences.university ||
      formData.course !== studentPreferences.course ||
      formData.academicYear !== studentPreferences.academicYear ||
      formData.campusLocation !== studentPreferences.campusLocation ||
      formData.preferredCity !== studentPreferences.preferredCity ||
      Number(formData.maxBudget) !== Number(studentPreferences.maxBudget) ||
      formData.accommodationType !== studentPreferences.accommodationType ||
      formData.sharingPreference !== studentPreferences.sharingPreference ||
      formData.foodPreference !== studentPreferences.foodPreference ||
      formData.moveInDate !== studentPreferences.moveInDate ||
      formData.acRequired !== studentPreferences.acRequired ||
      formData.wifiRequired !== studentPreferences.wifiRequired ||
      formData.laundryRequired !== studentPreferences.laundryRequired ||
      formData.securityRequired !== studentPreferences.securityRequired ||
      formData.foodIncludedRequired !== studentPreferences.foodIncludedRequired ||
      formData.profileVisibility !== (studentPreferences.profileVisibility !== undefined ? studentPreferences.profileVisibility : true) ||
      formData.whatsappAlerts !== (studentPreferences.whatsappAlerts !== undefined ? studentPreferences.whatsappAlerts : true) ||
      formData.emailNewsletter !== (studentPreferences.emailNewsletter !== undefined ? studentPreferences.emailNewsletter : false)
    );
  }, [formData, studentPreferences, user]);

  // Photo upload and management handlers
  const handlePhotoUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateProfilePhotoFile(file);
    if (!validation.valid) {
      showToast(validation.error || 'Please select a valid image file.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setPhotoUploading(true);
      const dataUrl = await readFileAsDataUrl(file);
      await updateProfilePhoto(dataUrl);
      setFormData((prev) => ({ ...prev, avatar: dataUrl }));
      showToast('Profile photo updated and saved to device storage.', 'success');
    } catch {
      showToast('Could not process the selected image. Please try another file.', 'error');
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhotoClick = async () => {
    try {
      setPhotoUploading(true);
      await removeProfilePhoto();
      const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
      setFormData((prev) => ({ ...prev, avatar: defaultAvatar }));
      showToast('Profile photo has been reset to default.', 'info');
    } catch {
      showToast('Could not remove photo. Please try again.', 'error');
    } finally {
      setPhotoUploading(false);
    }
  };

  // Handle Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Validation
    if (!formData.fullName.trim()) {
      setValidationError('Full Name cannot be empty.');
      return;
    }
    if (!formData.email.includes('@')) {
      setValidationError('Please enter a valid student email address.');
      return;
    }
    if (formData.phone.trim().length < 10) {
      setValidationError('Please provide a valid 10-digit mobile number.');
      return;
    }

    updateStudentPreferences({
      ...formData,
      maxBudget: Number(formData.maxBudget),
    });

    setSavedSuccess(true);
    showToast('Your student preferences and living criteria were saved successfully.', 'success');
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Handle Reset / Cancel
  const handleCancel = () => {
    setFormData({
      fullName: studentPreferences.fullName,
      email: studentPreferences.email,
      phone: studentPreferences.phone,
      avatar: studentPreferences.avatar,
      gender: studentPreferences.gender,
      university: studentPreferences.university,
      course: studentPreferences.course,
      academicYear: studentPreferences.academicYear,
      campusLocation: studentPreferences.campusLocation,
      preferredCity: studentPreferences.preferredCity,
      maxBudget: studentPreferences.maxBudget,
      accommodationType: studentPreferences.accommodationType,
      sharingPreference: studentPreferences.sharingPreference,
      foodPreference: studentPreferences.foodPreference,
      moveInDate: studentPreferences.moveInDate,
      acRequired: studentPreferences.acRequired,
      wifiRequired: studentPreferences.wifiRequired,
      laundryRequired: studentPreferences.laundryRequired,
      securityRequired: studentPreferences.securityRequired,
      foodIncludedRequired: studentPreferences.foodIncludedRequired,
      profileVisibility: studentPreferences.profileVisibility !== undefined ? studentPreferences.profileVisibility : true,
      whatsappAlerts: studentPreferences.whatsappAlerts !== undefined ? studentPreferences.whatsappAlerts : true,
      emailNewsletter: studentPreferences.emailNewsletter !== undefined ? studentPreferences.emailNewsletter : false,
    });
    setValidationError('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn pb-24">
      {/* Top Banner Notice */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-colin-charcoal-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-colin-teal bg-colin-teal/10 px-2.5 py-0.5 rounded-full border border-colin-teal/20">
              Scholar Profile & Preferences
            </span>
            <span className="text-xs text-colin-charcoal-500 font-medium">
              Real-time synchronization across discovery filters and dashboard
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-colin-navy tracking-tight font-display">
            Student Profile Management
          </h1>
          <p className="text-xs text-colin-charcoal-500 max-w-xl">
            Keep your student academic records and living preferences up to date. COLIN uses these preferences to tailor recommendations and filter verified stays.
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-3">
          <div className="bg-colin-navy-50 px-3.5 py-2 rounded-2xl border border-colin-navy-100 text-center">
            <span className="text-xs font-black text-colin-navy block">{wishlist.length}</span>
            <span className="text-[10px] text-colin-charcoal-500 font-semibold">Shortlisted</span>
          </div>
          <div className="bg-colin-teal/10 px-3.5 py-2 rounded-2xl border border-colin-teal/20 text-center">
            <span className="text-xs font-black text-colin-teal block">{upcomingVisitsCount}</span>
            <span className="text-[10px] text-colin-charcoal-500 font-semibold">Visits</span>
          </div>
          <div className="bg-amber-50 px-3.5 py-2 rounded-2xl border border-amber-200 text-center">
            <span className="text-xs font-black text-amber-800 block">{comparisonList.length}/3</span>
            <span className="text-[10px] text-colin-charcoal-500 font-semibold">Comparing</span>
          </div>
        </div>
      </div>

      {/* Success & Error Feedback */}
      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 flex items-center gap-2.5 animate-fadeIn shadow-xs">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <div className="font-semibold">
            Profile & preferences saved successfully! Your dashboard recommendations and search filters have been updated.
          </div>
        </div>
      )}

      {validationError && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-xs text-rose-900 flex items-center gap-2.5 animate-fadeIn shadow-xs">
          <Info size={18} className="text-rose-600 shrink-0" />
          <div className="font-semibold">{validationError}</div>
        </div>
      )}

      {/* Two-Column Grid: Left Student Identity Card + Right Profile Management Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT SECTION: STUDENT IDENTITY CARD ================= */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-colin-charcoal-200/90 shadow-brand space-y-6 lg:sticky lg:top-24">
          {/* Avatar & Core Identity */}
          <div className="text-center space-y-3 pb-5 border-b border-colin-charcoal-100">
            <div className="relative inline-block mx-auto group">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                data-testid="profile-photo-input"
                onChange={handlePhotoFileChange}
              />
              <img
                src={formData.avatar}
                alt={formData.fullName}
                className="w-24 h-24 rounded-full object-cover border-4 border-colin-teal shadow-md mx-auto group-hover:opacity-85 transition-opacity"
              />
              <button
                type="button"
                onClick={handlePhotoUploadClick}
                disabled={photoUploading}
                aria-label="Change profile photo"
                className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs cursor-pointer"
                title="Click to change photo"
              >
                {photoUploading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <Camera size={18} />
                    <span className="text-[9px] font-bold mt-0.5">Change</span>
                  </>
                )}
              </button>
              <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white" title="Active Student">
                <CheckCircle2 size={14} />
              </div>
            </div>

            {/* Photo Action Buttons */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={handlePhotoUploadClick}
                disabled={photoUploading}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold bg-colin-navy text-white hover:bg-colin-navy-800 transition-colors shadow-xs disabled:opacity-50"
              >
                {photoUploading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Upload size={12} />
                )}
                <span>Upload Photo</span>
              </button>

              <button
                type="button"
                onClick={handleRemovePhotoClick}
                disabled={photoUploading}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                title="Reset to default photo"
              >
                <Trash2 size={12} />
                <span>Remove</span>
              </button>
            </div>
            <p className="text-[10px] text-colin-charcoal-400">
              Supports JPG, PNG or WebP up to 5 MB
            </p>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-colin-navy font-display">
                {formData.fullName}
              </h2>
              <div className="text-xs text-colin-charcoal-500 font-medium flex items-center justify-center gap-1">
                <GraduationCap size={13} className="text-colin-teal" />
                <span className="truncate max-w-[220px]">{formData.university.split('(')[0]}</span>
              </div>
              <p className="text-[11px] text-colin-charcoal-400">
                {formData.course} • {formData.academicYear}
              </p>
            </div>

            {/* Membership Pill */}
            <div className="pt-1">
              {premiumSubscription?.active ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full shadow-xs">
                  <Crown size={12} /> COLIN Premium Scholar
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase text-colin-teal bg-colin-teal/10 border border-colin-teal/20 px-3 py-1 rounded-full">
                  <ShieldCheck size={12} /> Enrolled University Student
                </span>
              )}
            </div>
          </div>

          {/* Quick Details List */}
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-colin-charcoal-600 py-1 border-b border-colin-charcoal-100/60">
              <span className="flex items-center gap-1.5 text-colin-charcoal-400">
                <Mail size={13} className="text-colin-teal" />
                <span>Email:</span>
              </span>
              <span className="font-semibold text-colin-navy truncate max-w-[170px]">{formData.email}</span>
            </div>

            <div className="flex items-center justify-between text-colin-charcoal-600 py-1 border-b border-colin-charcoal-100/60">
              <span className="flex items-center gap-1.5 text-colin-charcoal-400">
                <Phone size={13} className="text-colin-teal" />
                <span>Mobile:</span>
              </span>
              <span className="font-semibold text-colin-navy">{formData.phone}</span>
            </div>

            <div className="flex items-center justify-between text-colin-charcoal-600 py-1 border-b border-colin-charcoal-100/60">
              <span className="flex items-center gap-1.5 text-colin-charcoal-400">
                <MapPin size={13} className="text-colin-orange" />
                <span>Campus Area:</span>
              </span>
              <span className="font-semibold text-colin-navy truncate max-w-[150px]">{formData.campusLocation}</span>
            </div>

            <div className="flex items-center justify-between text-colin-charcoal-600 py-1">
              <span className="flex items-center gap-1.5 text-colin-charcoal-400">
                <Calendar size={13} className="text-colin-teal" />
                <span>Member Since:</span>
              </span>
              <span className="font-semibold text-colin-navy">{user?.memberSince || 'September 2026'}</span>
            </div>
          </div>

          {/* Dynamic Profile Completion Status & Guidance */}
          <div className="bg-colin-navy-50/80 rounded-2xl p-4 border border-colin-navy-100 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-colin-navy flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-colin-teal" />
                <span>Profile Completion:</span>
              </span>
              <span className="font-black text-colin-orange">{profileCompletionPercent}%</span>
            </div>

            <div className="w-full h-2 rounded-full bg-colin-navy-200/50 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-colin-teal to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${profileCompletionPercent}%` }}
              />
            </div>

            <div className="space-y-1 pt-1">
              {missingProfileFields.length === 0 ? (
                <p className="text-[11px] text-emerald-800 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>All profile fields fully completed!</span>
                </p>
              ) : (
                <div className="space-y-1">
                  <p className="text-[10px] text-colin-charcoal-500 font-semibold">
                    Complete remaining fields for priority match:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {missingProfileFields.slice(0, 3).map((f) => (
                      <span key={f} className="text-[9px] font-bold text-colin-navy bg-white px-2 py-0.5 rounded border border-colin-navy-200">
                        + {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Identity Card Actions */}
          <div className="pt-2 border-t border-colin-charcoal-100 space-y-2">
            <button
              onClick={() => {
                logout();
                window.location.href = '/';
              }}
              className="w-full text-xs font-bold text-rose-600 hover:bg-rose-50 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-rose-200"
            >
              <LogOut size={14} />
              <span>Sign Out of Student Account</span>
            </button>
          </div>
        </div>

        {/* ================= MAIN SECTION: PROFILE MANAGEMENT ================= */}
        <div className="lg:col-span-8 space-y-6">
          {/* Navigation Tabs */}
          <div className="bg-white rounded-2xl p-2 border border-colin-charcoal-200/90 shadow-sm flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('academic')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'academic'
                  ? 'bg-colin-navy text-white shadow-xs'
                  : 'text-colin-charcoal-600 hover:bg-slate-100'
              }`}
            >
              <User size={14} />
              <span>Personal & Academic</span>
            </button>

            <button
              onClick={() => setActiveTab('accommodation')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'accommodation'
                  ? 'bg-colin-navy text-white shadow-xs'
                  : 'text-colin-charcoal-600 hover:bg-slate-100'
              }`}
            >
              <Building size={14} />
              <span>Accommodation & Budget</span>
            </button>

            <button
              onClick={() => setActiveTab('lifestyle')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'lifestyle'
                  ? 'bg-colin-navy text-white shadow-xs'
                  : 'text-colin-charcoal-600 hover:bg-slate-100'
              }`}
            >
              <Sliders size={14} />
              <span>Lifestyle & Amenities</span>
            </button>

            <button
              onClick={() => setActiveTab('privacy')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'privacy'
                  ? 'bg-colin-navy text-white shadow-xs'
                  : 'text-colin-charcoal-600 hover:bg-slate-100'
              }`}
            >
              <Lock size={14} />
              <span>Account & Privacy</span>
            </button>
          </div>

          {/* Form Container */}
          <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-colin-charcoal-200/90 shadow-brand space-y-6">
            {/* TAB 1: PERSONAL & ACADEMIC INFORMATION */}
            {activeTab === 'academic' && (
              <div className="space-y-6">
                <div className="space-y-1 pb-3 border-b border-colin-charcoal-100">
                  <h3 className="text-lg font-black text-colin-navy font-display flex items-center gap-2">
                    <User size={18} className="text-colin-teal" />
                    <span>Personal & Academic Records</span>
                  </h3>
                  <p className="text-xs text-colin-charcoal-500">
                    Provide verified scholar contact and university enrollment details.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                      Student Full Name:
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-teal focus:outline-none"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                      Student Email Address:
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-teal focus:outline-none"
                    />
                  </div>

                  {/* Mobile Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                      Mobile / WhatsApp Number:
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-teal focus:outline-none"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                      Gender Category:
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-colin-charcoal-300 bg-colin-offwhite focus:bg-white focus:ring-2 focus:ring-colin-teal focus:outline-none"
                    >
                      <option value="boys">Male / Boys</option>
                      <option value="girls">Female / Girls</option>
                      <option value="unisex">Prefer Not to Specify / Co-ed</option>
                    </select>
                  </div>

                  {/* College / University Dropdown */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                      College / University Campus:
                    </label>
                    <select
                      value={formData.university}
                      onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-colin-charcoal-300 bg-colin-offwhite focus:bg-white focus:ring-2 focus:ring-colin-teal focus:outline-none"
                    >
                      {UNIVERSITIES_LIST.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  {/* Course / Program */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                      Degree / Program:
                    </label>
                    <input
                      type="text"
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      placeholder="e.g. B.Com (Hons), B.Tech CSE, MBA"
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-teal focus:outline-none"
                    />
                  </div>

                  {/* Academic Year */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                      Current Academic Year:
                    </label>
                    <select
                      value={formData.academicYear}
                      onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-colin-charcoal-300 bg-colin-offwhite focus:bg-white focus:ring-2 focus:ring-colin-teal focus:outline-none"
                    >
                      <option value="1st Year (Freshman)">1st Year (Freshman)</option>
                      <option value="2nd Year (Undergraduate)">2nd Year (Undergraduate)</option>
                      <option value="3rd Year (Final Year UG)">3rd Year (Final Year UG)</option>
                      <option value="Postgraduate / Master's">Postgraduate / Master's</option>
                      <option value="PhD / Research Scholar">PhD / Research Scholar</option>
                    </select>
                  </div>

                  {/* Campus Location */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                      Specific Campus Enclave / Gate:
                    </label>
                    <input
                      type="text"
                      value={formData.campusLocation}
                      onChange={(e) => setFormData({ ...formData, campusLocation: e.target.value })}
                      placeholder="e.g. North Campus (Vishwavidyalaya), South Campus (Satya Niketan), Koramangala Gate"
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-teal focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ACCOMMODATION & BUDGET PREFERENCES */}
            {activeTab === 'accommodation' && (
              <div className="space-y-6">
                <div className="space-y-1 pb-3 border-b border-colin-charcoal-100">
                  <h3 className="text-lg font-black text-colin-navy font-display flex items-center gap-2">
                    <Building size={18} className="text-colin-teal" />
                    <span>Accommodation & Target Budget</span>
                  </h3>
                  <p className="text-xs text-colin-charcoal-500">
                    Defines your default discovery filters and personalized dashboard recommendations.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Preferred City */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                      Target City Hub:
                    </label>
                    <select
                      value={formData.preferredCity}
                      onChange={(e) => setFormData({ ...formData, preferredCity: e.target.value })}
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-colin-charcoal-300 bg-colin-offwhite focus:bg-white focus:ring-2 focus:ring-colin-teal focus:outline-none"
                    >
                      {CITIES.filter((c) => c !== 'All Cities').map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Accommodation Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                      Accommodation Type:
                    </label>
                    <select
                      value={formData.accommodationType}
                      onChange={(e) => setFormData({ ...formData, accommodationType: e.target.value })}
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-colin-charcoal-300 bg-colin-offwhite focus:bg-white focus:ring-2 focus:ring-colin-teal focus:outline-none"
                    >
                      <option value="PG">PG (Paying Guest)</option>
                      <option value="Hostel">Student Hostel</option>
                      <option value="Rental Room">Independent Rental Room</option>
                      <option value="Shared Flat">Shared Student Apartment</option>
                      <option value="Co-living">Premium Co-living Space</option>
                    </select>
                  </div>

                  {/* Room Sharing Preference */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                      Room Sharing Preference:
                    </label>
                    <select
                      value={formData.sharingPreference}
                      onChange={(e) => setFormData({ ...formData, sharingPreference: e.target.value })}
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-colin-charcoal-300 bg-colin-offwhite focus:bg-white focus:ring-2 focus:ring-colin-teal focus:outline-none"
                    >
                      <option value="single">Single Room (Private)</option>
                      <option value="double">Double Sharing (2 Beds)</option>
                      <option value="triple">Triple Sharing (3 Beds)</option>
                      <option value="any">Any Room Configuration</option>
                    </select>
                  </div>

                  {/* Food Preference */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                      Food / Mess Dietary Preference:
                    </label>
                    <select
                      value={formData.foodPreference}
                      onChange={(e) => setFormData({ ...formData, foodPreference: e.target.value })}
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-colin-charcoal-300 bg-colin-offwhite focus:bg-white focus:ring-2 focus:ring-colin-teal focus:outline-none"
                    >
                      <option value="Vegetarian">Pure Vegetarian</option>
                      <option value="Non-Vegetarian">Non-Vegetarian / Eggetarian</option>
                      <option value="Jain">Strict Jain Meals</option>
                      <option value="Self-Cook">Self-Cooking Preferred</option>
                    </select>
                  </div>

                  {/* Target Move-In Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                      Target Move-In Date:
                    </label>
                    <input
                      type="date"
                      value={formData.moveInDate}
                      onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-teal focus:outline-none"
                    />
                  </div>

                  {/* Monthly Budget Slider & Input */}
                  <div className="space-y-2 sm:col-span-2 pt-2 border-t border-colin-charcoal-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-colin-charcoal-700 uppercase">
                        Maximum Monthly Rent Budget:
                      </span>
                      <span className="font-black text-colin-navy text-base">
                        ₹{formData.maxBudget.toLocaleString('en-IN')} / month
                      </span>
                    </div>

                    <input
                      type="range"
                      min={6000}
                      max={25000}
                      step={500}
                      value={formData.maxBudget}
                      onChange={(e) => setFormData({ ...formData, maxBudget: Number(e.target.value) })}
                      className="w-full accent-colin-teal cursor-pointer"
                    />

                    <div className="flex justify-between text-[10px] text-colin-charcoal-400 font-semibold">
                      <span>₹6,000</span>
                      <span>₹15,000 (Recommended DU Average)</span>
                      <span>₹25,000+</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: LIFESTYLE & AMENITIES PREFERENCES */}
            {activeTab === 'lifestyle' && (
              <div className="space-y-6">
                <div className="space-y-1 pb-3 border-b border-colin-charcoal-100">
                  <h3 className="text-lg font-black text-colin-navy font-display flex items-center gap-2">
                    <Sliders size={18} className="text-colin-teal" />
                    <span>Lifestyle & Must-Have Amenities</span>
                  </h3>
                  <p className="text-xs text-colin-charcoal-500">
                    Select your essential requirements for comfortable campus living.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Air Conditioning */}
                  <label className="flex items-center justify-between p-3.5 rounded-2xl border border-colin-charcoal-200 hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Wind size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-colin-navy">Air Conditioning (AC)</div>
                        <div className="text-[11px] text-colin-charcoal-500">Mandatory cooling for summers</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.acRequired}
                      onChange={(e) => setFormData({ ...formData, acRequired: e.target.checked })}
                      className="w-4 h-4 rounded text-colin-teal focus:ring-colin-teal cursor-pointer"
                    />
                  </label>

                  {/* High-Speed Wi-Fi */}
                  <label className="flex items-center justify-between p-3.5 rounded-2xl border border-colin-charcoal-200 hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Wifi size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-colin-navy">High-Speed Wi-Fi (100+ Mbps)</div>
                        <div className="text-[11px] text-colin-charcoal-500">Required for college assignments & lectures</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.wifiRequired}
                      onChange={(e) => setFormData({ ...formData, wifiRequired: e.target.checked })}
                      className="w-4 h-4 rounded text-colin-teal focus:ring-colin-teal cursor-pointer"
                    />
                  </label>

                  {/* Laundry Facility */}
                  <label className="flex items-center justify-between p-3.5 rounded-2xl border border-colin-charcoal-200 hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Shirt size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-colin-navy">In-House Laundry / Washing Machine</div>
                        <div className="text-[11px] text-colin-charcoal-500">Free or shared automatic washing machines</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.laundryRequired}
                      onChange={(e) => setFormData({ ...formData, laundryRequired: e.target.checked })}
                      className="w-4 h-4 rounded text-colin-teal focus:ring-colin-teal cursor-pointer"
                    />
                  </label>

                  {/* 24x7 Security & Biometrics */}
                  <label className="flex items-center justify-between p-3.5 rounded-2xl border border-colin-charcoal-200 hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Lock size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-colin-navy">24x7 Biometric Security & CCTV</div>
                        <div className="text-[11px] text-colin-charcoal-500">Gated access with guard security for safety</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.securityRequired}
                      onChange={(e) => setFormData({ ...formData, securityRequired: e.target.checked })}
                      className="w-4 h-4 rounded text-colin-teal focus:ring-colin-teal cursor-pointer"
                    />
                  </label>

                  {/* Meals Included in Rent */}
                  <label className="flex items-center justify-between p-3.5 rounded-2xl border border-colin-charcoal-200 hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-colin-orange flex items-center justify-center">
                        <Utensils size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-colin-navy">Daily Mess Meals Included</div>
                        <div className="text-[11px] text-colin-charcoal-500">3 meals included in base monthly rent</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.foodIncludedRequired}
                      onChange={(e) => setFormData({ ...formData, foodIncludedRequired: e.target.checked })}
                      className="w-4 h-4 rounded text-colin-teal focus:ring-colin-teal cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 4: ACCOUNT & PRIVACY */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="space-y-1 pb-3 border-b border-colin-charcoal-100">
                  <h3 className="text-lg font-black text-colin-navy font-display flex items-center gap-2">
                    <Lock size={18} className="text-colin-teal" />
                    <span>Account Security & Privacy Settings</span>
                  </h3>
                  <p className="text-xs text-colin-charcoal-500">
                    Manage your data visibility, communication preferences, and security settings.
                  </p>
                </div>

                {/* Interactive Privacy Preferences */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-colin-charcoal-700 tracking-wider">
                    Communication & Sharing Controls
                  </h4>

                  {/* Toggle 1: Host Visibility */}
                  <label className="flex items-center justify-between p-3.5 rounded-2xl border border-colin-charcoal-200 hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-colin-teal/15 text-colin-teal flex items-center justify-center">
                        <Eye size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-colin-navy">Share Profile with Verified Hosts</div>
                        <div className="text-[11px] text-colin-charcoal-500">Allows verified property hosts to see your campus and budget when booking a visit pass</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.profileVisibility}
                      onChange={(e) => setFormData({ ...formData, profileVisibility: e.target.checked })}
                      className="w-4 h-4 rounded text-colin-teal focus:ring-colin-teal cursor-pointer"
                    />
                  </label>

                  {/* Toggle 2: WhatsApp Alerts */}
                  <label className="flex items-center justify-between p-3.5 rounded-2xl border border-colin-charcoal-200 hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Phone size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-colin-navy">Instant WhatsApp Visit & Pass Alerts</div>
                        <div className="text-[11px] text-colin-charcoal-500">Receive QR passes, host contact details, and ₹82.50 refund receipts directly on WhatsApp</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.whatsappAlerts}
                      onChange={(e) => setFormData({ ...formData, whatsappAlerts: e.target.checked })}
                      className="w-4 h-4 rounded text-colin-teal focus:ring-colin-teal cursor-pointer"
                    />
                  </label>

                  {/* Toggle 3: Email Newsletter */}
                  <label className="flex items-center justify-between p-3.5 rounded-2xl border border-colin-charcoal-200 hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                        <Bell size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-colin-navy">Campus Housing Digest & Availability Alerts</div>
                        <div className="text-[11px] text-colin-charcoal-500">Weekly email updates when new verified PGs or hostels open near your university</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.emailNewsletter}
                      onChange={(e) => setFormData({ ...formData, emailNewsletter: e.target.checked })}
                      className="w-4 h-4 rounded text-colin-teal focus:ring-colin-teal cursor-pointer"
                    />
                  </label>
                </div>

                <div className="space-y-4 text-xs pt-2">
                  <div className="p-4 bg-colin-offwhite rounded-2xl border border-colin-charcoal-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-colin-navy">
                      <ShieldCheck size={16} className="text-colin-teal" />
                      <span>Role & Authorization:</span>
                    </div>
                    <p className="text-colin-charcoal-600 leading-relaxed">
                      Signed in as <strong>{user?.name}</strong> with role <strong>Student ({user?.role})</strong>. Your account is isolated to the Student Workspace and protected from unauthorized Property Owner redirects.
                    </p>
                  </div>

                  <div className="p-4 bg-colin-offwhite rounded-2xl border border-colin-charcoal-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-colin-navy">
                      <Info size={16} className="text-colin-orange" />
                      <span>Privacy & Data Protection:</span>
                    </div>
                    <p className="text-colin-charcoal-600 leading-relaxed">
                      All preferences are stored locally in your browser storage. Contact information is only shared with verified property owners when you confirm an in-person visit slot pass.
                    </p>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
                    <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-emerald-600" />
                      <span>Zero Spam Commitment:</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      COLIN connects students directly with verified hosts. No brokers, no spam calls, and no unauthorized third-party marketing.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions: Save Changes and Cancel */}
            <div className="pt-4 border-t border-colin-charcoal-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={!isDirty}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    isDirty
                      ? 'text-colin-charcoal-600 hover:bg-slate-100 cursor-pointer'
                      : 'text-slate-300 cursor-not-allowed'
                  }`}
                >
                  <RotateCcw size={14} />
                  <span>Cancel & Reset</span>
                </button>

                {isDirty && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full animate-pulse">
                    <CircleDot size={12} className="text-amber-600" />
                    <span>Unsaved Changes</span>
                  </span>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="text-xs font-bold"
                rightIcon={<CheckCircle2 size={16} />}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
