import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProperties } from '../../context/PropertyContext';
import { Property, AccommodationType, GenderPreference } from '../../types';
import {
  Building2,
  PlusCircle,
  Edit3,
  Trash2,
  Eye,
  Pause,
  Play,
  RefreshCw,
  Search,
  CheckCircle2,
  X,
  AlertTriangle,
  ShieldCheck,
  Zap,
  MapPin,
  Calendar,
  Camera,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { CITIES, UNIVERSITIES_LIST } from '../../data/mockData';
import { PropertyPhotoUploader } from '../../components/owner/PropertyPhotoUploader';
import {
  PropertyPhoto,
  savePropertyPhotos,
  getPropertyPhotos,
  deletePropertyPhotos,
} from '../../utils/propertyImageStorage';

const COMMON_AMENITIES = [
  'High-Speed Wi-Fi (300 Mbps)',
  'Split Air Conditioning',
  '100% Full Power Backup (DG)',
  'Biometric 24/7 Security Entry',
  'Daily Room Housekeeping',
  'RO Drinking Water & Water Cooler',
  'Free Laundry Machine Usage',
  'Attached Private Bathroom',
  'Dedicated Ergonomic Study Desk',
  '3 Nutritious Daily Meals',
  'CCTV Surveillance & Guard',
  'Balcony / Garden View',
];

const DEFAULT_RULES = [
  'No smoking inside rooms',
  'Visitor registration at reception required',
  'Quiet hours after 10:30 PM',
  'Alcohol strictly prohibited on premises',
];

export const OwnerPropertiesPage: React.FC = () => {
  const { user } = useAuth();
  const {
    ownerProperties,
    addProperty,
    updateProperty,
    deleteProperty,
    toggleListingStatus,
    renewListing,
    subscription,
    rooms,
  } = useProperties();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [previewProperty, setPreviewProperty] = useState<Property | null>(null);
  const [renewalProperty, setRenewalProperty] = useState<Property | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Renewal duration & simulated checkout
  const [renewalDuration, setRenewalDuration] = useState<'6-month' | '12-month'>('12-month');
  const [renewalSuccess, setRenewalSuccess] = useState(false);

  // Uploaded Photos State
  const [formPhotos, setFormPhotos] = useState<PropertyPhoto[]>([]);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Property>>({
    title: '',
    category: 'pg',
    categoryLabel: 'Premium PG',
    gender: 'boys',
    city: 'Delhi NCR',
    neighborhood: '',
    fullAddress: '',
    landmark: '',
    nearbyUniversity: 'Delhi University (North Campus — SRCC, Hindu, Hansraj)',
    distanceToUniversity: '350m walk to Campus',
    distanceToMetro: '3 mins walk to Metro',
    rentMonthly: 12000,
    depositAmount: 12000,
    foodIncluded: true,
    roomType: 'Double Sharing Room with Attached Bath',
    sharingType: 'double',
    amenities: ['High-Speed Wi-Fi (300 Mbps)', 'Split Air Conditioning', 'Biometric 24/7 Security Entry', 'Daily Room Housekeeping'],
    description: '',
    featuredImage: '',
    galleryImages: [],
    houseRules: DEFAULT_RULES,
    listingDuration: '12-month',
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Open Form for Adding
  const handleOpenAdd = () => {
    // Check property limit per subscription tier
    if (ownerProperties.length >= subscription.propertyLimit) {
      alert(`Your current ${subscription.tier} plan allows a maximum of ${subscription.propertyLimit} properties. Please upgrade your subscription to add more properties.`);
      return;
    }

    setEditingProperty(null);
    setFormPhotos([]); // Always initialize with 0 photos for fresh additions
    setFormData({
      title: '',
      category: 'pg',
      categoryLabel: 'Premium PG',
      gender: 'boys',
      city: 'Delhi NCR',
      neighborhood: '',
      fullAddress: '',
      landmark: '',
      nearbyUniversity: 'Delhi University (North Campus — SRCC, Hindu, Hansraj)',
      distanceToUniversity: '400m from Campus Gate',
      distanceToMetro: '4 mins walk to Metro Station',
      rentMonthly: 12000,
      depositAmount: 12000,
      foodIncluded: true,
      roomType: 'Double Sharing with Attached Bath',
      sharingType: 'double',
      amenities: ['High-Speed Wi-Fi (300 Mbps)', 'Split Air Conditioning', 'Biometric 24/7 Security Entry', 'Daily Room Housekeeping'],
      description: 'Comfortable, safe, and academically oriented student accommodation.',
      featuredImage: '',
      galleryImages: [],
      houseRules: DEFAULT_RULES,
      listingDuration: '12-month',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open Form for Editing
  const handleOpenEdit = async (property: Property) => {
    setEditingProperty(property);
    setFormData({ ...property });
    setFormError(null);

    // Retrieve property photos from IndexedDB with owner isolation
    try {
      const stored = await getPropertyPhotos(property.id, user?.id);
      if (stored && stored.length > 0) {
        setFormPhotos(stored);
      } else if (property.galleryImages && property.galleryImages.length > 0) {
        // Fallback to galleryImages if present
        const legacy: PropertyPhoto[] = property.galleryImages.map((url, i) => ({
          id: `photo-${property.id}-${i}-${Date.now()}`,
          propertyId: property.id,
          ownerId: user?.id || 'usr-owner-01',
          name: `Photo ${i + 1}.jpg`,
          size: 450 * 1024,
          type: 'image/jpeg',
          dataUrl: url,
          isCover: url === property.featuredImage || i === 0,
          createdAt: new Date().toISOString(),
        }));
        setFormPhotos(legacy);
      } else if (property.featuredImage) {
        setFormPhotos([
          {
            id: `photo-${property.id}-0-${Date.now()}`,
            propertyId: property.id,
            ownerId: user?.id || 'usr-owner-01',
            name: 'Cover Photo.jpg',
            size: 450 * 1024,
            type: 'image/jpeg',
            dataUrl: property.featuredImage,
            isCover: true,
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        setFormPhotos([]);
      }
    } catch {
      setFormPhotos([]);
    }

    setIsFormOpen(true);
  };

  // Submit Form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.title?.trim()) {
      setFormError('Property title is required.');
      return;
    }
    if (!formData.fullAddress?.trim() || !formData.neighborhood?.trim()) {
      setFormError('Address and locality / neighborhood are required.');
      return;
    }
    if (!formData.rentMonthly || formData.rentMonthly <= 0) {
      setFormError('Monthly rent must be greater than zero.');
      return;
    }

    // Determine primary cover photo and gallery
    const coverPhoto = formPhotos.find((p) => p.isCover) || formPhotos[0];
    const featuredImageUrl = coverPhoto ? coverPhoto.dataUrl : '';
    const galleryUrls = formPhotos.map((p) => p.dataUrl);

    const propertyPayload: Partial<Property> = {
      ...formData,
      featuredImage: featuredImageUrl,
      galleryImages: galleryUrls,
    };

    if (editingProperty) {
      updateProperty(editingProperty.id, propertyPayload);
      if (user?.id) {
        await savePropertyPhotos(editingProperty.id, user.id, formPhotos);
      }
    } else {
      const created = addProperty(propertyPayload);
      if (created && created.id && user?.id) {
        await savePropertyPhotos(created.id, user.id, formPhotos);
      }
    }

    setIsFormOpen(false);
  };

  // Toggle Amenity in Form
  const toggleAmenity = (amenity: string) => {
    const current = formData.amenities || [];
    if (current.includes(amenity)) {
      setFormData({ ...formData, amenities: current.filter((a) => a !== amenity) });
    } else {
      setFormData({ ...formData, amenities: [...current, amenity] });
    }
  };

  // Confirm Listing Renewal (Demo Checkout)
  const handleConfirmRenewal = () => {
    if (!renewalProperty) return;
    renewListing(renewalProperty.id, renewalDuration);
    setRenewalSuccess(true);
    setTimeout(() => {
      setRenewalSuccess(false);
      setRenewalProperty(null);
    }, 2000);
  };

  // Filtered Properties
  const filteredProperties = ownerProperties.filter((p) => {
    if (statusFilter === 'active' && p.listingStatus === 'paused') return false;
    if (statusFilter === 'paused' && p.listingStatus !== 'paused') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.neighborhood.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-colin-navy font-display">
              Property Management
            </h1>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-colin-navy text-white">
              {ownerProperties.length} / {subscription.propertyLimit === 999 ? '∞' : subscription.propertyLimit} Properties
            </span>
          </div>
          <p className="text-xs text-colin-charcoal-500 mt-1">
            Publish, edit, pause, and renew verified accommodations visible to students on the COLIN marketplace.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenAdd}
          className="text-xs font-bold bg-colin-navy hover:bg-colin-navy-800 shadow-sm self-start sm:self-auto"
          leftIcon={<PlusCircle size={16} className="text-colin-orange" />}
        >
          Add New Property
        </Button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-colin-charcoal-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400" />
          <input
            type="text"
            placeholder="Search by title or locality..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold text-colin-charcoal-500">Filter:</span>
          {(['all', 'active', 'paused'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl capitalize transition-colors ${
                statusFilter === status
                  ? 'bg-colin-navy text-white shadow-sm'
                  : 'bg-colin-charcoal-100 text-colin-charcoal-600 hover:bg-colin-charcoal-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Properties List Table / Cards */}
      {filteredProperties.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-colin-charcoal-200 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-colin-navy-50 text-colin-navy flex items-center justify-center mx-auto">
            <Building2 size={32} className="text-colin-charcoal-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-colin-navy">No Properties Found</h3>
            <p className="text-xs text-colin-charcoal-500 max-w-sm mx-auto">
              {searchQuery ? 'No listings match your search query.' : 'You have not added any accommodations yet.'}
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={handleOpenAdd}>
            Add Your First Property
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => {
            const propRooms = rooms.filter((r) => r.propertyId === property.id);
            const propAvailableBeds = propRooms.reduce((acc, r) => acc + (r.status === 'available' ? r.availableBeds : 0), 0);
            const isPaused = property.listingStatus === 'paused';

            return (
              <div
                key={property.id}
                className="bg-white rounded-3xl border border-colin-charcoal-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Image with Badges */}
                  <div className="relative h-48 w-full overflow-hidden bg-colin-charcoal-100">
                    {property.featuredImage ? (
                      <img
                        src={property.featuredImage}
                        alt={property.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 space-y-1.5 p-4">
                        <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-200">
                          <Building2 size={20} className="text-colin-navy/40" />
                        </div>
                        <span className="text-xs font-bold text-colin-charcoal-600">No Photos Uploaded</span>
                        <span className="text-[10px] text-colin-charcoal-400">Click Edit to add photographs</span>
                      </div>
                    )}

                    {/* Photo Count Badge */}
                    {property.galleryImages && property.galleryImages.length > 0 && (
                      <div className="absolute bottom-3 left-3 bg-colin-navy-950/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 z-10">
                        <Camera size={11} className="text-colin-orange" />
                        <span>{property.galleryImages.length} Photo{property.galleryImages.length > 1 ? 's' : ''}</span>
                      </div>
                    )}

                    {/* Top Status Badges */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-sm ${
                        isPaused ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                      }`}>
                        {isPaused ? '○ Paused' : '● Active Listing'}
                      </span>
                      {property.isColinCertified && (
                        <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-colin-navy text-white shadow-sm flex items-center gap-1">
                          <ShieldCheck size={12} className="text-colin-teal" />
                          <span>Certified {property.certificationScore || 98}/100</span>
                        </span>
                      )}
                      {property.isSponsored && (
                        <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-colin-orange text-colin-navy-950 shadow-sm flex items-center gap-1">
                          <Zap size={12} className="fill-colin-navy-950" />
                          <span>Sponsored</span>
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 right-3 bg-colin-navy/85 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {property.categoryLabel}
                    </div>
                  </div>

                  {/* Body Specs */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-base font-extrabold text-colin-navy line-clamp-1">
                        {property.title}
                      </h3>
                      <p className="text-xs text-colin-charcoal-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="text-colin-teal shrink-0" />
                        <span className="truncate">{property.neighborhood}, {property.city}</span>
                      </p>
                    </div>

                    <div className="p-3 bg-colin-offwhite rounded-2xl border border-colin-charcoal-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-colin-charcoal-400 block font-semibold">Monthly Rent</span>
                        <span className="font-extrabold text-colin-navy">
                          ₹{property.rentMonthly.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-colin-charcoal-400 block font-semibold">Available Beds</span>
                        <span className="font-extrabold text-colin-teal">
                          {propAvailableBeds} beds ({propRooms.length} rooms)
                        </span>
                      </div>
                    </div>

                    {/* Listing Duration & Expiry */}
                    <div className="text-[11px] text-colin-charcoal-500 flex items-center justify-between pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>Expires: {property.listingExpiresAt || '2027-10-01'}</span>
                      </span>
                      <button
                        onClick={() => setRenewalProperty(property)}
                        className="text-colin-teal font-extrabold hover:underline"
                      >
                        Renew
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 bg-colin-offwhite/80 border-t border-colin-charcoal-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleListingStatus(property.id)}
                      className={`p-2 rounded-xl text-xs font-bold transition-colors ${
                        isPaused
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-colin-charcoal-100 text-colin-charcoal-700 hover:bg-colin-charcoal-200'
                      }`}
                      title={isPaused ? 'Publish Listing' : 'Pause Listing'}
                    >
                      {isPaused ? <Play size={14} /> : <Pause size={14} />}
                    </button>

                    <button
                      onClick={() => handleOpenEdit(property)}
                      className="p-2 rounded-xl text-xs font-bold bg-white text-colin-navy border border-colin-charcoal-200 hover:bg-colin-navy-50 transition-colors"
                      title="Edit Property"
                    >
                      <Edit3 size={14} />
                    </button>

                    <button
                      onClick={() => setPreviewProperty(property)}
                      className="p-2 rounded-xl text-xs font-bold bg-white text-colin-teal border border-colin-charcoal-200 hover:bg-colin-teal-50 transition-colors"
                      title="Preview Listing"
                    >
                      <Eye size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link to="/owner/rooms">
                      <Button variant="ghost" size="sm" className="text-xs font-bold px-2.5">
                        Rooms
                      </Button>
                    </Link>

                    <button
                      onClick={() => setDeleteConfirmId(property.id)}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Property"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= FORM MODAL (ADD / EDIT) ================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-colin-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-colin-charcoal-200 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto animate-scaleUp">
            
            <div className="flex items-center justify-between pb-3 border-b border-colin-charcoal-100">
              <div className="flex items-center gap-2">
                <Building2 size={20} className="text-colin-orange" />
                <h2 className="text-lg font-black text-colin-navy font-display">
                  {editingProperty ? 'Edit Property Listing' : 'Add New Accommodation'}
                </h2>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg text-colin-charcoal-400 hover:text-colin-navy"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Title & Category */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                  Property Title / Building Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. COLIN Residency — North Campus"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const val = e.target.value as AccommodationType;
                      const labelMap: Record<string, string> = {
                        pg: 'Student PG',
                        hostel: 'Hostel',
                        'rental-room': 'Rental Room',
                        'shared-flat': 'Shared Flat',
                        'co-living': 'Co-Living',
                      };
                      setFormData({ ...formData, category: val, categoryLabel: labelMap[val] || 'PG' });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy bg-white"
                  >
                    <option value="pg">PG (Paying Guest)</option>
                    <option value="hostel">Student Hostel</option>
                    <option value="rental-room">Rental Room</option>
                    <option value="shared-flat">Shared Flat</option>
                    <option value="co-living">Co-Living Space</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                    Gender Preference
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as GenderPreference })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy bg-white"
                  >
                    <option value="boys">Boys Only</option>
                    <option value="girls">Girls Only</option>
                    <option value="unisex">Co-ed / Unisex</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                    City
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy bg-white"
                  >
                    {CITIES.filter((c) => c !== 'All Cities').map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Address & Locality */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                    Locality / Neighborhood *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hudson Lane, GTB Nagar"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                    Landmark
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Behind GTB Nagar Metro Gate 2"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                  Full Physical Address *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Plot 42-B, Hudson Lane, GTB Nagar, Near Khalsa College Gate, Delhi - 110009"
                  value={formData.fullAddress}
                  onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none"
                />
              </div>

              {/* Nearby University & Metro */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                    Nearby College / University
                  </label>
                  <select
                    value={formData.nearbyUniversity}
                    onChange={(e) => setFormData({ ...formData, nearbyUniversity: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy bg-white"
                  >
                    {UNIVERSITIES_LIST.filter((u) => !u.startsWith('All')).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                    Proximity to Campus
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 350m walk to campus"
                    value={formData.distanceToUniversity}
                    onChange={(e) => setFormData({ ...formData, distanceToUniversity: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none"
                  />
                </div>
              </div>

              {/* Commercials: Rent, Deposit, Brokerage */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                    Monthly Rent (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={formData.rentMonthly}
                    onChange={(e) => setFormData({ ...formData, rentMonthly: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                    Security Deposit (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.depositAmount}
                    onChange={(e) => setFormData({ ...formData, depositAmount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                    Listing Duration
                  </label>
                  <select
                    value={formData.listingDuration}
                    onChange={(e) => setFormData({ ...formData, listingDuration: e.target.value as '6-month' | '12-month' })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy bg-white"
                  >
                    <option value="6-month">6 Months Listing</option>
                    <option value="12-month">12 Months Listing (Annual)</option>
                  </select>
                </div>
              </div>

              {/* PROPERTY PHOTOGRAPHS (0/8 Upload System) */}
              <PropertyPhotoUploader
                photos={formPhotos}
                onChange={setFormPhotos}
                ownerId={user?.id || 'usr-owner-01'}
                propertyId={editingProperty ? editingProperty.id : `new-prop-${Date.now()}`}
              />

              <div className="space-y-1">
                <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                  Property Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your student accommodation, amenities, study environment, and dining setup..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:ring-2 focus:ring-colin-navy focus:outline-none"
                />
              </div>

              {/* Amenities Multi-Checklist */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider">
                  Verified Amenities Checklist
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {COMMON_AMENITIES.map((amenity) => {
                    const checked = formData.amenities?.includes(amenity);
                    return (
                      <button
                        type="button"
                        key={amenity}
                        onClick={() => toggleAmenity(amenity)}
                        className={`text-left text-xs p-2 rounded-xl border flex items-center gap-2 transition-all ${
                          checked
                            ? 'bg-colin-navy text-white border-colin-navy font-bold'
                            : 'bg-white text-colin-charcoal-700 border-colin-charcoal-200 hover:bg-colin-charcoal-50'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                          checked ? 'bg-colin-teal border-colin-teal text-white' : 'border-colin-charcoal-400'
                        }`}>
                          {checked && '✓'}
                        </span>
                        <span className="truncate">{amenity}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-colin-charcoal-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="bg-colin-navy hover:bg-colin-navy-800"
                >
                  {editingProperty ? 'Save Changes' : 'Publish Property'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= PREVIEW MODAL ================= */}
      {previewProperty && (
        <div className="fixed inset-0 z-50 bg-colin-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 border border-colin-charcoal-200 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-colin-charcoal-100">
              <span className="text-xs font-bold text-colin-teal uppercase tracking-wider">
                Student Portal Preview
              </span>
              <button onClick={() => setPreviewProperty(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Interactive Preview Photo Gallery */}
            {previewProperty.featuredImage ? (
              <div className="space-y-2">
                <img
                  src={selectedPreviewImage || previewProperty.featuredImage}
                  alt={previewProperty.title}
                  className="w-full h-56 object-cover rounded-2xl border border-colin-charcoal-200"
                />
                {previewProperty.galleryImages && previewProperty.galleryImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {previewProperty.galleryImages.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedPreviewImage(imgUrl)}
                        className={`relative w-16 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                          (selectedPreviewImage || previewProperty.featuredImage) === imgUrl
                            ? 'border-colin-orange scale-105 shadow-sm'
                            : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-48 bg-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400 border border-slate-200">
                <Building2 size={32} className="text-colin-navy/40 mb-1" />
                <span className="text-xs font-bold text-colin-charcoal-600">No Photographs Uploaded</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-colin-navy">{previewProperty.title}</h3>
                <span className="text-base font-black text-colin-navy font-display">
                  ₹{previewProperty.rentMonthly.toLocaleString('en-IN')}/mo
                </span>
              </div>
              <p className="text-xs text-colin-charcoal-500">
                {previewProperty.neighborhood}, {previewProperty.city} • {previewProperty.distanceToUniversity}
              </p>
              <p className="text-xs text-colin-charcoal-700 leading-relaxed">
                {previewProperty.description}
              </p>

              <div className="pt-2">
                <div className="text-xs font-bold text-colin-navy mb-1.5">Amenities:</div>
                <div className="flex flex-wrap gap-1.5">
                  {previewProperty.amenities.map((a) => (
                    <span key={a} className="text-[11px] bg-colin-navy-50 text-colin-navy font-semibold px-2 py-0.5 rounded-md">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-colin-charcoal-100 flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setPreviewProperty(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= RENEWAL MODAL (Simulated Checkout) ================= */}
      {renewalProperty && (
        <div className="fixed inset-0 z-50 bg-colin-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-colin-charcoal-200 shadow-2xl space-y-5 animate-scaleUp">
            
            <div className="flex items-center justify-between pb-2 border-b border-colin-charcoal-100">
              <div className="flex items-center gap-2 text-colin-navy">
                <RefreshCw size={18} className="text-colin-teal" />
                <h3 className="text-base font-black">Renew Property Listing</h3>
              </div>
              <button onClick={() => setRenewalProperty(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-colin-charcoal-400">Target Listing</span>
                <p className="text-sm font-extrabold text-colin-navy">{renewalProperty.title}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                  Select Renewal Duration
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRenewalDuration('6-month')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      renewalDuration === '6-month'
                        ? 'border-colin-navy bg-colin-navy-50 text-colin-navy font-bold'
                        : 'border-colin-charcoal-200 hover:bg-colin-charcoal-50 text-colin-charcoal-700'
                    }`}
                  >
                    <div className="text-xs">6 Months</div>
                    <div className="text-sm font-extrabold text-colin-navy">₹999 (Simulated)</div>
                  </button>

                  <button
                    onClick={() => setRenewalDuration('12-month')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      renewalDuration === '12-month'
                        ? 'border-colin-navy bg-colin-navy-50 text-colin-navy font-bold'
                        : 'border-colin-charcoal-200 hover:bg-colin-charcoal-50 text-colin-charcoal-700'
                    }`}
                  >
                    <div className="text-xs">12 Months (Best Value)</div>
                    <div className="text-sm font-extrabold text-colin-navy">₹1,799 (Simulated)</div>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-colin-teal/10 rounded-2xl border border-colin-teal/30 text-xs text-colin-teal-900 space-y-1">
                <div className="font-bold">Demonstration Checkout Guarantee</div>
                <p className="text-[11px] text-colin-charcoal-600">
                  Renews your listing instantly without live card transactions. Extends activation and keeps student visit bookings active.
                </p>
              </div>
            </div>

            {renewalSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-center space-y-1">
                <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
                <div className="text-xs font-extrabold">Listing Successfully Renewed!</div>
                <p className="text-[11px]">Updated expiration date recorded.</p>
              </div>
            ) : (
              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setRenewalProperty(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-colin-navy hover:bg-colin-navy-800"
                  onClick={handleConfirmRenewal}
                >
                  Confirm & Renew
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-colin-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-colin-charcoal-200 shadow-2xl space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={22} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-colin-navy">Delete Property?</h3>
              <p className="text-xs text-colin-charcoal-500">
                Are you sure you want to permanently delete this accommodation? All associated room records and student enquiries will be archived.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                onClick={async () => {
                  deleteProperty(deleteConfirmId);
                  await deletePropertyPhotos(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
              >
                Yes, Delete
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
