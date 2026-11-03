import React, { useState, useMemo } from 'react';
import { useProperties } from '../../context/PropertyContext';
import { Enquiry, EnquiryStatus } from '../../types';
import {
  MessageSquareText,
  Search,
  Phone,
  Mail,
  Send,
  Building2,
  FileText,
  X,
  MessageCircle,
  Calendar,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../components/common/Button';

const STATUS_OPTIONS: EnquiryStatus[] = [
  'New',
  'Contacted',
  'Interested',
  'Visit Scheduled',
  'Converted',
  'Closed',
];

export const OwnerEnquiriesPage: React.FC = () => {
  const { enquiries, updateEnquiryStatus, addEnquiryNote } = useProperties();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Selected Enquiry for View / Notes Modal
  const [activeEnquiry, setActiveEnquiry] = useState<Enquiry | null>(null);
  const [newNoteText, setNewNoteText] = useState('');

  // Demonstration Contact Drawer / Modal
  const [contactModalEnquiry, setContactModalEnquiry] = useState<Enquiry | null>(null);
  const [contactMode, setContactMode] = useState<'whatsapp' | 'email' | 'call'>('whatsapp');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSentSuccess, setContactSentSuccess] = useState(false);

  // Filtered Enquiries
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((e) => {
      if (selectedStatus !== 'all' && e.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.studentName.toLowerCase().includes(q) ||
          e.propertyTitle.toLowerCase().includes(q) ||
          e.message.toLowerCase().includes(q) ||
          (e.studentUniversity && e.studentUniversity.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [enquiries, selectedStatus, searchQuery]);

  // Derived count metrics
  const newCount = enquiries.filter((e) => e.status === 'New').length;
  const contactedCount = enquiries.filter((e) => e.status === 'Contacted').length;
  const visitScheduledCount = enquiries.filter((e) => e.status === 'Visit Scheduled').length;
  const convertedCount = enquiries.filter((e) => e.status === 'Converted').length;

  // Add internal note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEnquiry || !newNoteText.trim()) return;
    addEnquiryNote(activeEnquiry.id, newNoteText.trim());
    setNewNoteText('');
    // refresh active enquiry reference
    const updated = enquiries.find((enq) => enq.id === activeEnquiry.id);
    if (updated) {
      setActiveEnquiry({
        ...updated,
        internalNotes: updated.internalNotes ? [...updated.internalNotes, newNoteText.trim()] : [newNoteText.trim()],
      });
    }
  };

  // Open Contact Dialog
  const handleOpenContact = (enquiry: Enquiry, mode: 'whatsapp' | 'email' | 'call') => {
    setContactModalEnquiry(enquiry);
    setContactMode(mode);
    setContactSentSuccess(false);

    if (mode === 'whatsapp') {
      setContactMessage(
        `Hello ${enquiry.studentName}, thank you for enquiring about ${enquiry.propertyTitle}. We have open beds available for your desired move-in date. Would you like to schedule an in-person physical inspection visit this week?`
      );
    } else if (mode === 'email') {
      setContactMessage(
        `Dear ${enquiry.studentName},\n\nWe received your enquiry for ${enquiry.propertyTitle} via the COLIN Verified Student Accommodation Platform.\n\nOur property is physically inspected and verified. Please let us know if you would like to book a guided campus visit pass.\n\nBest regards,\nProperty Host Management`
      );
    } else {
      setContactMessage('');
    }
  };

  // Submit Demonstration Contact
  const handleSendContact = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSentSuccess(true);
    if (contactModalEnquiry) {
      // Auto-update status to 'Contacted' if it was 'New'
      if (contactModalEnquiry.status === 'New') {
        updateEnquiryStatus(contactModalEnquiry.id, 'Contacted');
      }
      addEnquiryNote(
        contactModalEnquiry.id,
        `Host sent ${contactMode.toUpperCase()} communication on ${new Date().toLocaleDateString('en-IN')}`
      );
    }
    setTimeout(() => {
      setContactSentSuccess(false);
      setContactModalEnquiry(null);
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-colin-navy font-display flex items-center gap-2">
            <MessageSquareText size={28} className="text-colin-orange" />
            <span>Student Enquiry Management</span>
          </h1>
          <p className="text-xs text-colin-charcoal-500 mt-1">
            Track student leads from DU, Christ, Symbiosis and IIT campuses. Follow up with prospective scholars and log internal notes.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold text-colin-navy bg-white border border-colin-charcoal-200 px-3 py-1.5 rounded-xl shadow-sm">
            Total Leads: {enquiries.length}
          </span>
          {newCount > 0 && (
            <span className="text-xs font-extrabold bg-colin-orange text-white px-3 py-1.5 rounded-xl shadow-sm">
              {newCount} New
            </span>
          )}
        </div>
      </div>

      {/* KPI Pipeline Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setSelectedStatus(selectedStatus === 'New' ? 'all' : 'New')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            selectedStatus === 'New'
              ? 'bg-colin-navy text-white border-colin-navy shadow-sm'
              : 'bg-white text-colin-charcoal-700 border-colin-charcoal-200 hover:border-colin-orange'
          }`}
        >
          <span className="text-[10px] font-bold uppercase opacity-80 block">New Enquiries</span>
          <span className="text-2xl font-black font-display">{newCount}</span>
          <span className="text-[11px] block opacity-80">Awaiting initial reply</span>
        </button>

        <button
          onClick={() => setSelectedStatus(selectedStatus === 'Contacted' ? 'all' : 'Contacted')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            selectedStatus === 'Contacted'
              ? 'bg-colin-navy text-white border-colin-navy shadow-sm'
              : 'bg-white text-colin-charcoal-700 border-colin-charcoal-200 hover:border-colin-teal'
          }`}
        >
          <span className="text-[10px] font-bold uppercase opacity-80 block">Contacted</span>
          <span className="text-2xl font-black font-display">{contactedCount}</span>
          <span className="text-[11px] block opacity-80">Message or call sent</span>
        </button>

        <button
          onClick={() => setSelectedStatus(selectedStatus === 'Visit Scheduled' ? 'all' : 'Visit Scheduled')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            selectedStatus === 'Visit Scheduled'
              ? 'bg-colin-navy text-white border-colin-navy shadow-sm'
              : 'bg-white text-colin-charcoal-700 border-colin-charcoal-200 hover:border-emerald-500'
          }`}
        >
          <span className="text-[10px] font-bold uppercase opacity-80 block">Visit Scheduled</span>
          <span className="text-2xl font-black font-display">{visitScheduledCount}</span>
          <span className="text-[11px] block opacity-80">Physical visit pending</span>
        </button>

        <button
          onClick={() => setSelectedStatus(selectedStatus === 'Converted' ? 'all' : 'Converted')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            selectedStatus === 'Converted'
              ? 'bg-colin-navy text-white border-colin-navy shadow-sm'
              : 'bg-white text-colin-charcoal-700 border-colin-charcoal-200 hover:border-colin-teal'
          }`}
        >
          <span className="text-[10px] font-bold uppercase opacity-80 block">Converted</span>
          <span className="text-2xl font-black font-display">{convertedCount}</span>
          <span className="text-[11px] block opacity-80">Room booked / deposit paid</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-colin-charcoal-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-colin-charcoal-400" />
          <input
            type="text"
            placeholder="Search by student name or college..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-colin-charcoal-500 shrink-0">Status:</span>
          <button
            onClick={() => setSelectedStatus('all')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl shrink-0 transition-colors ${
              selectedStatus === 'all'
                ? 'bg-colin-navy text-white shadow-sm'
                : 'bg-colin-charcoal-100 text-colin-charcoal-600 hover:bg-colin-charcoal-200'
            }`}
          >
            All
          </button>
          {STATUS_OPTIONS.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl shrink-0 transition-colors ${
                selectedStatus === st
                  ? 'bg-colin-navy text-white shadow-sm'
                  : 'bg-colin-charcoal-100 text-colin-charcoal-600 hover:bg-colin-charcoal-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Enquiries List */}
      {filteredEnquiries.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-colin-charcoal-200 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-colin-navy-50 text-colin-navy flex items-center justify-center mx-auto">
            <MessageSquareText size={32} className="text-colin-charcoal-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-colin-navy">No Enquiries Found</h3>
            <p className="text-xs text-colin-charcoal-500 max-w-sm mx-auto">
              No student messages match the current status or search filter.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEnquiries.map((enquiry) => {
            return (
              <div
                key={enquiry.id}
                className="bg-white rounded-3xl border border-colin-charcoal-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Left: Student & Message */}
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-colin-navy">
                      {enquiry.studentName}
                    </span>
                    <span className="text-xs text-colin-charcoal-500 font-semibold">
                      ({enquiry.studentUniversity || 'College Scholar'})
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        enquiry.status === 'New'
                          ? 'bg-colin-orange text-white'
                          : enquiry.status === 'Visit Scheduled'
                          ? 'bg-emerald-600 text-white'
                          : enquiry.status === 'Converted'
                          ? 'bg-colin-teal text-white'
                          : 'bg-colin-charcoal-100 text-colin-charcoal-700'
                      }`}
                    >
                      {enquiry.status}
                    </span>
                  </div>

                  <p className="text-xs text-colin-charcoal-700 leading-relaxed bg-colin-offwhite p-3 rounded-2xl border border-colin-charcoal-100">
                    "{enquiry.message}"
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-colin-charcoal-500">
                    <span className="font-bold text-colin-navy flex items-center gap-1">
                      <Building2 size={12} className="text-colin-teal" />
                      {enquiry.propertyTitle}
                    </span>
                    {enquiry.preferredMoveIn && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        Move-in: {enquiry.preferredMoveIn}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      Received: {enquiry.date}
                    </span>
                    {enquiry.internalNotes && enquiry.internalNotes.length > 0 && (
                      <span className="text-colin-teal font-bold flex items-center gap-1">
                        <FileText size={12} />
                        {enquiry.internalNotes.length} Internal Notes
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Contact & Status Controls */}
                <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
                  {/* Status Dropdown */}
                  <div className="space-y-1 w-full sm:w-auto">
                    <label className="text-[10px] font-bold text-colin-charcoal-400 uppercase tracking-wider block">
                      Pipeline Stage
                    </label>
                    <select
                      value={enquiry.status}
                      onChange={(e) => updateEnquiryStatus(enquiry.id, e.target.value as EnquiryStatus)}
                      className="text-xs font-bold text-colin-navy bg-colin-offwhite border border-colin-charcoal-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-colin-navy"
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Contact Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenContact(enquiry, 'whatsapp')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      title="Simulated WhatsApp Contact"
                    >
                      <MessageCircle size={14} />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => handleOpenContact(enquiry, 'email')}
                      className="px-3 py-1.5 rounded-xl bg-colin-navy-50 text-colin-navy hover:bg-colin-navy-100 border border-colin-navy-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      title="Simulated Email Contact"
                    >
                      <Mail size={14} />
                      <span>Email</span>
                    </button>

                    <button
                      onClick={() => setActiveEnquiry(enquiry)}
                      className="px-3 py-1.5 rounded-xl bg-white text-colin-charcoal-700 hover:bg-colin-charcoal-100 border border-colin-charcoal-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      title="View Notes & Details"
                    >
                      <FileText size={14} />
                      <span>Notes</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= VIEW & NOTES MODAL ================= */}
      {activeEnquiry && (
        <div className="fixed inset-0 z-50 bg-colin-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-colin-charcoal-200 shadow-2xl space-y-5 animate-scaleUp">
            
            <div className="flex items-center justify-between pb-3 border-b border-colin-charcoal-100">
              <div>
                <h3 className="text-base font-black text-colin-navy font-display">
                  Enquiry Details & Internal Notes
                </h3>
                <span className="text-xs text-colin-charcoal-400">
                  {activeEnquiry.studentName} • {activeEnquiry.propertyTitle}
                </span>
              </div>
              <button onClick={() => setActiveEnquiry(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Student Contact Info (Masked if private) */}
            <div className="p-3 bg-colin-offwhite rounded-2xl border border-colin-charcoal-100 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-colin-charcoal-500 font-semibold">Phone Contact:</span>
                <span className="font-bold text-colin-navy">
                  {activeEnquiry.privacyRestricted ? '+91 98*** ***** (Protected)' : activeEnquiry.studentPhone}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-colin-charcoal-500 font-semibold">Student Email:</span>
                <span className="font-bold text-colin-navy">
                  {activeEnquiry.privacyRestricted ? 'scholar***@colin.in (Protected)' : activeEnquiry.studentEmail}
                </span>
              </div>
            </div>

            {/* Internal Notes History */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-colin-charcoal-700 uppercase tracking-wider block">
                Internal Management Notes ({activeEnquiry.internalNotes?.length || 0})
              </span>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {(!activeEnquiry.internalNotes || activeEnquiry.internalNotes.length === 0) ? (
                  <p className="text-xs text-colin-charcoal-400 italic">
                    No notes recorded yet. Add notes regarding parental calls, room choices, or follow-ups below.
                  </p>
                ) : (
                  activeEnquiry.internalNotes.map((note, idx) => (
                    <div key={idx} className="p-2.5 bg-colin-navy-50/70 rounded-xl text-xs text-colin-charcoal-700 border border-colin-navy-100">
                      {note}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add New Note Form */}
            <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-colin-charcoal-100">
              <label className="text-xs font-bold text-colin-charcoal-700 uppercase block">
                Add New Host Note
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Student requested ground floor room due to ankle injury..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy"
                />
                <Button type="submit" variant="primary" size="sm" className="bg-colin-navy hover:bg-colin-navy-800">
                  Save Note
                </Button>
              </div>
            </form>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setActiveEnquiry(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DEMONSTRATION CONTACT MODAL ================= */}
      {contactModalEnquiry && (
        <div className="fixed inset-0 z-50 bg-colin-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-colin-charcoal-200 shadow-2xl space-y-5 animate-scaleUp">
            
            <div className="flex items-center justify-between pb-3 border-b border-colin-charcoal-100">
              <div className="flex items-center gap-2">
                {contactMode === 'whatsapp' ? (
                  <MessageCircle size={20} className="text-emerald-600" />
                ) : contactMode === 'email' ? (
                  <Mail size={20} className="text-colin-navy" />
                ) : (
                  <Phone size={20} className="text-colin-teal" />
                )}
                <h3 className="text-base font-black text-colin-navy">
                  Contact Student via {contactMode.toUpperCase()}
                </h3>
              </div>
              <button onClick={() => setContactModalEnquiry(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-colin-charcoal-400">Recipient Student</span>
                <p className="text-sm font-black text-colin-navy">
                  {contactModalEnquiry.studentName} ({contactModalEnquiry.studentUniversity || 'Student'})
                </p>
                <p className="text-xs text-colin-charcoal-500">
                  {contactMode === 'whatsapp' ? contactModalEnquiry.studentPhone : contactModalEnquiry.studentEmail}
                </p>
              </div>

              {contactMode === 'call' ? (
                <div className="p-4 bg-colin-navy-50 rounded-2xl border border-colin-navy-100 text-center space-y-2">
                  <Phone size={28} className="mx-auto text-colin-navy" />
                  <p className="text-xs font-bold text-colin-navy">
                    Simulated Direct Campus Call
                  </p>
                  <p className="text-xs text-colin-charcoal-600">
                    Calling {contactModalEnquiry.studentPhone} via COLIN Verified Host Dialler...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSendContact} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                      Draft Message
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy"
                    />
                  </div>

                  {contactSentSuccess ? (
                    <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>Message Dispatched via Demonstration Gateway!</span>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => setContactModalEnquiry(null)}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        className="bg-colin-navy hover:bg-colin-navy-800"
                        leftIcon={<Send size={13} />}
                      >
                        Send {contactMode.toUpperCase()}
                      </Button>
                    </div>
                  )}
                </form>
              )}
            </div>

            {contactMode === 'call' && (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setContactModalEnquiry(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setContactSentSuccess(true);
                    addEnquiryNote(contactModalEnquiry.id, `Phone call logged by host on ${new Date().toLocaleDateString('en-IN')}`);
                    setTimeout(() => {
                      setContactSentSuccess(false);
                      setContactModalEnquiry(null);
                    }, 1500);
                  }}
                  className="bg-colin-navy"
                >
                  Log Call as Completed
                </Button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
