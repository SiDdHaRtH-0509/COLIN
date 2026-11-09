/**
 * COLIN Admin Control Centre — Property Verification & Inspection Queue
 * Phase 4A / Sprint Completion: Live Queue for Moderating Owner Listings
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Building,
  MapPin,
  User,
  Image as ImageIcon,
  AlertCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useProperties } from '../../context/PropertyContext';
import { Button } from '../../components/common/Button';

interface PendingProperty {
  id: string;
  name: string;
  slug: string;
  propertyType: string;
  genderPolicy: string;
  city: string;
  addressLine1: string;
  totalRooms: number;
  totalBeds: number;
  availableBeds: number;
  verificationStatus: string;
  createdAt: string;
  owner?: {
    userId: string;
    businessName: string | null;
    user?: {
      email: string;
      profile?: {
        firstName: string;
        lastName: string;
      };
    };
  };
  photos?: Array<{
    id: string;
    photoStorageUrl: string;
    thumbnailUrl: string;
    isCover: boolean;
  }>;
}

export const AdminVerificationQueuePage: React.FC = () => {
  const { properties, updateProperty } = useProperties();
  const [pendingProperties, setPendingProperties] = useState<PendingProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<PendingProperty | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPendingQueue = async () => {
    setIsLoading(true);
    setFeedbackMessage(null);
    try {
      const res = await apiClient.get<PendingProperty[]>('/api/v1/admin/properties/pending');
      if (res.success && Array.isArray(res.data)) {
        setPendingProperties(res.data);
      } else {
        // Fallback: derive pending from local properties if backend offline
        const localPending = properties
          .filter((p) => (p.verificationStatus !== 'approved' && p.verificationStatus !== 'rejected') || !p.isColinCertified)
          .map((p) => ({
            id: p.id,
            name: p.title,
            slug: p.id,
            propertyType: p.category.toUpperCase(),
            genderPolicy: p.gender === 'girls' ? 'GIRLS_ONLY' : p.gender === 'boys' ? 'BOYS_ONLY' : 'COED',
            city: p.city,
            addressLine1: p.fullAddress || p.neighborhood,
            totalRooms: p.availableRooms || 4,
            totalBeds: p.availableBeds || 8,
            availableBeds: p.availableBeds || 4,
            verificationStatus: 'PENDING_VERIFICATION',
            createdAt: p.createdAt || new Date().toISOString(),
            owner: {
              userId: p.ownerId || 'owner-1',
              businessName: p.ownerName || 'Host Partner',
              user: {
                email: p.ownerEmail || 'host@colin.in',
                profile: { firstName: p.ownerName || 'Host', lastName: '' },
              },
            },
            photos: p.featuredImage ? [{ id: 'p1', photoStorageUrl: p.featuredImage, thumbnailUrl: p.featuredImage, isCover: true }] : [],
          }));
        setPendingProperties(localPending);
      }
    } catch {
      // Offline fallback
      const localPending = properties
        .filter((p) => (p.verificationStatus !== 'approved' && p.verificationStatus !== 'rejected') || !p.isColinCertified)
        .map((p) => ({
          id: p.id,
          name: p.title,
          slug: p.id,
          propertyType: p.category.toUpperCase(),
          genderPolicy: p.gender === 'girls' ? 'GIRLS_ONLY' : p.gender === 'boys' ? 'BOYS_ONLY' : 'COED',
          city: p.city,
          addressLine1: p.fullAddress || p.neighborhood,
          totalRooms: p.availableRooms || 4,
          totalBeds: p.availableBeds || 8,
          availableBeds: p.availableBeds || 4,
          verificationStatus: 'PENDING_VERIFICATION',
          createdAt: p.createdAt || new Date().toISOString(),
        }));
      setPendingProperties(localPending);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingQueue();
  }, []);

  const handleApprove = async (propertyId: string) => {
    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      const res = await apiClient.post(`/api/v1/admin/properties/${propertyId}/approve`, {
        auditNotes: 'COLIN on-site quality and safety standards verified.',
      });

      if (res.success) {
        setFeedbackMessage({ type: 'success', text: `Property ${selectedProperty?.name || propertyId} approved and certified live!` });
        // Update local property state
        updateProperty(propertyId, {
          isColinCertified: true,
          verificationStatus: 'approved',
          inspectionApproved: true,
        });
        setPendingProperties((prev) => prev.filter((p) => p.id !== propertyId));
        setSelectedProperty(null);
      } else {
        setFeedbackMessage({ type: 'error', text: res.message || 'Failed to approve property.' });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Approval request failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (propertyId: string) => {
    if (!rejectReason.trim()) {
      setFeedbackMessage({ type: 'error', text: 'Please specify a rejection reason.' });
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiClient.post(`/api/v1/admin/properties/${propertyId}/reject`, {
        rejectionReason: rejectReason.trim(),
      });

      if (res.success) {
        setFeedbackMessage({ type: 'success', text: `Listing rejected. Feedback sent to property owner.` });
        updateProperty(propertyId, {
          isColinCertified: false,
          verificationStatus: 'rejected',
        });
        setPendingProperties((prev) => prev.filter((p) => p.id !== propertyId));
        setSelectedProperty(null);
        setShowRejectModal(false);
        setRejectReason('');
      } else {
        setFeedbackMessage({ type: 'error', text: res.message || 'Failed to reject property.' });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Rejection request failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredProperties = pendingProperties.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.owner?.businessName && p.owner.businessName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-colin-charcoal-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-colin-teal/10 text-colin-teal rounded-lg">
              <ShieldCheck size={18} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-colin-teal">Quality Operations</span>
          </div>
          <h1 className="text-2xl font-black text-colin-navy font-display">Property Verification Queue</h1>
          <p className="text-xs text-colin-charcoal-500 mt-1">
            Review submitted owner accommodations, inspect photographic evidence, and grant official COLIN Verified badges.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-center">
            <div className="text-[10px] font-extrabold uppercase text-amber-700">Pending Review</div>
            <div className="text-xl font-black text-amber-900">{pendingProperties.length}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPendingQueue}
            disabled={isLoading}
            leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
          >
            Refresh Queue
          </Button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button onClick={() => setFeedbackMessage(null)} className="text-xs font-bold underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-colin-charcoal-200">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400" />
          <input
            type="text"
            placeholder="Search pending queue by property, city, or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-colin-charcoal-200 focus:outline-none focus:ring-2 focus:ring-colin-teal/30 focus:border-colin-teal"
          />
        </div>
        <div className="text-xs text-colin-charcoal-500 font-semibold">
          Showing <span className="text-colin-navy font-bold">{filteredProperties.length}</span> pending submissions
        </div>
      </div>

      {/* Main Verification Queue Table */}
      <div className="bg-white rounded-3xl border border-colin-charcoal-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-colin-charcoal-400">
            <RefreshCw size={32} className="animate-spin mx-auto mb-3 text-colin-teal" />
            <p className="text-sm font-semibold">Loading verification pipeline from database...</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-colin-navy">Verification Queue is Empty</h3>
            <p className="text-xs text-colin-charcoal-500 max-w-sm mx-auto mt-1">
              All submitted host accommodations have been reviewed and approved or no submissions are pending.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-colin-charcoal-200 text-colin-charcoal-600 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Property / Listing</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Type & Capacity</th>
                  <th className="py-3.5 px-4">Owner / Host</th>
                  <th className="py-3.5 px-4">Submitted</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-colin-charcoal-100">
                {filteredProperties.map((prop) => (
                  <tr key={prop.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-colin-navy text-sm">{prop.name}</div>
                      <div className="text-[11px] font-mono text-colin-charcoal-400 mt-0.5">{prop.id}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-colin-navy">{prop.city}</div>
                      <div className="text-colin-charcoal-500 truncate max-w-[180px]">{prop.addressLine1}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-block px-2 py-0.5 rounded font-bold text-[10px] bg-colin-teal/10 text-colin-teal uppercase mb-1">
                        {prop.propertyType} • {prop.genderPolicy}
                      </span>
                      <div className="text-colin-charcoal-500 font-medium">{prop.totalRooms} Rooms / {prop.totalBeds} Beds</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-colin-navy">{prop.owner?.businessName || 'Property Host'}</div>
                      <div className="text-colin-charcoal-500">{prop.owner?.user?.email || 'N/A'}</div>
                    </td>
                    <td className="py-4 px-4 text-colin-charcoal-500 font-medium">
                      {new Date(prop.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setSelectedProperty(prop)}
                        leftIcon={<Eye size={13} />}
                      >
                        Inspect & Verify
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Property Inspection Detail Drawer */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-colin-navy-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl p-6 border border-colin-charcoal-200 shadow-2xl flex flex-col space-y-4 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-colin-charcoal-100">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-colin-teal/10 text-colin-teal rounded-xl">
                  <Building size={20} />
                </span>
                <div>
                  <h3 className="font-black text-colin-navy text-lg">{selectedProperty.name}</h3>
                  <div className="text-xs text-colin-charcoal-500">ID: {selectedProperty.id}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedProperty(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Specs & Policy */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[10px] uppercase font-bold text-colin-charcoal-400">Type</div>
                  <div className="font-bold text-colin-navy text-sm">{selectedProperty.propertyType}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[10px] uppercase font-bold text-colin-charcoal-400">Policy</div>
                  <div className="font-bold text-colin-navy text-sm">{selectedProperty.genderPolicy}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[10px] uppercase font-bold text-colin-charcoal-400">Total Rooms</div>
                  <div className="font-bold text-colin-navy text-sm">{selectedProperty.totalRooms}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[10px] uppercase font-bold text-colin-charcoal-400">Available Beds</div>
                  <div className="font-bold text-colin-navy text-sm">{selectedProperty.availableBeds} / {selectedProperty.totalBeds}</div>
                </div>
              </div>

              {/* Physical Address */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <div className="text-[10px] uppercase font-bold text-colin-charcoal-400 flex items-center gap-1">
                  <MapPin size={12} />
                  <span>Physical Address & Location</span>
                </div>
                <p className="font-bold text-colin-navy text-xs">{selectedProperty.addressLine1}</p>
                <p className="text-colin-charcoal-500 text-xs">{selectedProperty.city}, India</p>
              </div>

              {/* Owner Host Information */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <div className="text-[10px] uppercase font-bold text-colin-charcoal-400 flex items-center gap-1">
                  <User size={12} />
                  <span>Owner Account (Shielded Direct Contact)</span>
                </div>
                <p className="font-bold text-colin-navy text-xs">{selectedProperty.owner?.businessName || 'Property Host'}</p>
                <p className="text-colin-teal text-xs font-semibold">{selectedProperty.owner?.user?.email || 'N/A'}</p>
              </div>

              {/* Photos Gallery */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase font-bold text-colin-charcoal-400 flex items-center gap-1">
                  <ImageIcon size={12} />
                  <span>Inspection Photos & Proof Assets ({selectedProperty.photos?.length || 0}/8)</span>
                </div>
                {selectedProperty.photos && selectedProperty.photos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {selectedProperty.photos.map((photo, i) => (
                      <div key={photo.id || i} className="relative rounded-xl overflow-hidden aspect-video border border-slate-200">
                        <img
                          src={photo.photoStorageUrl || photo.thumbnailUrl}
                          alt="Inspection Evidence"
                          className="w-full h-full object-cover"
                        />
                        {photo.isCover && (
                          <span className="absolute top-1 left-1 bg-colin-teal text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                            Cover Photo
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-xs font-medium border border-amber-200">
                    No photographic assets uploaded yet. Inspection checklist must verify on-site safety.
                  </div>
                )}
              </div>
            </div>

            {/* Moderation Actions Footer */}
            <div className="pt-4 border-t border-colin-charcoal-100 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="md"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                leftIcon={<XCircle size={16} />}
              >
                Reject Listing
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={() => handleApprove(selectedProperty.id)}
                disabled={actionLoading}
                leftIcon={<CheckCircle2 size={16} />}
              >
                {actionLoading ? 'Approving...' : 'Approve & Issue COLIN Verified Badge'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-colin-navy-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-colin-charcoal-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-600 font-bold">
              <AlertCircle size={20} />
              <h4 className="text-base font-black text-colin-navy">Reject Property Verification</h4>
            </div>
            <p className="text-xs text-colin-charcoal-600">
              Provide specific feedback to the property host indicating why this listing cannot be certified.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Fire safety equipment missing or photos do not match declared room dimensions."
              className="w-full p-3 text-xs rounded-xl border border-colin-charcoal-200 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowRejectModal(false)}>
                Cancel
              </Button>
              <Button
                variant="accent"
                size="sm"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => handleReject(selectedProperty.id)}
                disabled={actionLoading || !rejectReason.trim()}
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
