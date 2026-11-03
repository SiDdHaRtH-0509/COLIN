import React, { useState, useMemo } from 'react';
import { useProperties } from '../../context/PropertyContext';
import { Room, SharingType, RoomStatus } from '../../types';
import {
  BedDouble,
  Building2,
  PlusCircle,
  Edit3,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Button } from '../../components/common/Button';

export const OwnerRoomsPage: React.FC = () => {
  const {
    ownerProperties,
    rooms,
    addRoom,
    updateRoom,
    deleteRoom,
    updateRoomOccupancy,
  } = useProperties();

  // Selected Property for filtering
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(() => {
    return ownerProperties.length > 0 ? ownerProperties[0].id : '';
  });

  // Modal States
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    roomNumber: string;
    roomType: SharingType;
    floor: string;
    monthlyRent: number;
    depositAmount: number;
    totalBeds: number;
    availableBeds: number;
    status: RoomStatus;
    amenities: string[];
    description: string;
  }>({
    roomNumber: '',
    roomType: 'double',
    floor: '1st Floor',
    monthlyRent: 12000,
    depositAmount: 12000,
    totalBeds: 2,
    availableBeds: 1,
    status: 'available',
    amenities: ['Split AC', 'Attached Bath', 'Wi-Fi'],
    description: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Active Property
  const activeProperty = ownerProperties.find((p) => p.id === selectedPropertyId) || ownerProperties[0];

  // Filtered Rooms for selected property
  const propertyRooms = useMemo(() => {
    if (!activeProperty) return [];
    return rooms.filter((r) => r.propertyId === activeProperty.id);
  }, [rooms, activeProperty]);

  // Derived occupancy metrics for this property
  const totalRooms = propertyRooms.length;
  const maintenanceRoomsCount = propertyRooms.filter((r) => r.status === 'maintenance').length;

  const totalBeds = propertyRooms.reduce((acc, r) => acc + r.totalBeds, 0);
  const availableBeds = propertyRooms.reduce((acc, r) => acc + (r.status === 'available' ? r.availableBeds : 0), 0);
  const occupiedBeds = Math.max(0, totalBeds - availableBeds);
  const occupancyPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingRoom(null);
    const defaultRent = activeProperty?.rentMonthly || 12000;
    setFormData({
      roomNumber: `Room ${propertyRooms.length + 101}`,
      roomType: 'double',
      floor: '1st Floor',
      monthlyRent: defaultRent,
      depositAmount: defaultRent,
      totalBeds: 2,
      availableBeds: 2,
      status: 'available',
      amenities: ['Split AC', 'Attached Bath', 'Wi-Fi'],
      description: 'Well-ventilated student room with individual study setups.',
    });
    setFormError(null);
    setIsRoomModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      floor: room.floor,
      monthlyRent: room.monthlyRent,
      depositAmount: room.depositAmount,
      totalBeds: room.totalBeds,
      availableBeds: room.availableBeds,
      status: room.status,
      amenities: room.amenities || [],
      description: room.description || '',
    });
    setFormError(null);
    setIsRoomModalOpen(true);
  };

  // Submit Room
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.roomNumber.trim()) {
      setFormError('Room number or title is required.');
      return;
    }
    if (formData.monthlyRent <= 0) {
      setFormError('Monthly rent must be greater than zero.');
      return;
    }
    if (formData.totalBeds < 1) {
      setFormError('Total beds must be at least 1.');
      return;
    }
    if (formData.availableBeds > formData.totalBeds) {
      setFormError('Available beds cannot exceed total beds in this room.');
      return;
    }
    if (formData.availableBeds < 0) {
      setFormError('Available beds cannot be negative.');
      return;
    }

    if (!activeProperty) return;

    if (editingRoom) {
      updateRoom(editingRoom.id, {
        ...formData,
      });
    } else {
      addRoom({
        propertyId: activeProperty.id,
        ...formData,
      });
    }

    setIsRoomModalOpen(false);
  };

  // Quick toggle occupancy
  const handleQuickStatusChange = (room: Room, newStatus: RoomStatus) => {
    let nextAvailableBeds = room.availableBeds;
    if (newStatus === 'occupied') {
      nextAvailableBeds = 0;
    } else if (newStatus === 'available' && room.availableBeds === 0) {
      nextAvailableBeds = room.totalBeds;
    }
    updateRoomOccupancy(room.id, newStatus, nextAvailableBeds);
  };

  // Quick increment/decrement bed count
  const handleAdjustBeds = (room: Room, delta: number) => {
    const nextCount = room.availableBeds + delta;
    if (nextCount < 0 || nextCount > room.totalBeds) return;
    const nextStatus: RoomStatus = nextCount === 0 ? 'occupied' : 'available';
    updateRoomOccupancy(room.id, nextStatus, nextCount);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-colin-navy font-display flex items-center gap-2">
            <BedDouble size={28} className="text-colin-teal" />
            <span>Room & Bed Management</span>
          </h1>
          <p className="text-xs text-colin-charcoal-500 mt-1">
            Maintain independent room-level inventory, configure beds per room, and synchronize live availability with student discovery.
          </p>
        </div>

        {activeProperty && (
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            className="text-xs font-bold bg-colin-navy hover:bg-colin-navy-800 shadow-sm self-start sm:self-auto"
            leftIcon={<PlusCircle size={16} className="text-colin-orange" />}
          >
            Add Room to {activeProperty.title.split('—')[0].trim()}
          </Button>
        )}
      </div>

      {/* Property Selector Bar */}
      <div className="bg-white rounded-2xl p-4 border border-colin-charcoal-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Building2 size={18} className="text-colin-navy shrink-0" />
          <div className="space-y-0.5 flex-1 sm:flex-initial">
            <label className="text-[10px] font-bold text-colin-charcoal-400 uppercase tracking-wider block">
              Active Property Portfolio
            </label>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="text-xs font-bold text-colin-navy bg-colin-offwhite border border-colin-charcoal-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-colin-navy"
            >
              {ownerProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.neighborhood}, {p.city})
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeProperty && (
          <div className="flex items-center gap-3 text-xs text-colin-charcoal-500">
            <span className="font-bold text-colin-navy">Base Rent: ₹{activeProperty.rentMonthly.toLocaleString('en-IN')}/mo</span>
            <span>•</span>
            <span className="font-bold text-colin-teal">{totalBeds} Total Beds</span>
          </div>
        )}
      </div>

      {/* Property Occupancy KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-colin-charcoal-200 shadow-sm">
          <span className="text-[10px] font-bold text-colin-charcoal-400 uppercase block">Total Rooms</span>
          <span className="text-2xl font-black text-colin-navy font-display">{totalRooms}</span>
          <span className="text-[11px] text-colin-charcoal-500 block">in this building</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-colin-charcoal-200 shadow-sm">
          <span className="text-[10px] font-bold text-colin-charcoal-400 uppercase block">Available Beds</span>
          <span className="text-2xl font-black text-emerald-600 font-display">{availableBeds}</span>
          <span className="text-[11px] text-emerald-600 font-semibold block">open for booking</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-colin-charcoal-200 shadow-sm">
          <span className="text-[10px] font-bold text-colin-charcoal-400 uppercase block">Occupied Beds</span>
          <span className="text-2xl font-black text-colin-navy font-display">{occupiedBeds}</span>
          <span className="text-[11px] text-colin-charcoal-500 block">of {totalBeds} beds</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-colin-charcoal-200 shadow-sm">
          <span className="text-[10px] font-bold text-colin-charcoal-400 uppercase block">Occupancy Rate</span>
          <span className="text-2xl font-black text-colin-orange font-display">{occupancyPercent}%</span>
          <span className="text-[11px] text-colin-charcoal-500 block">{maintenanceRoomsCount} in maintenance</span>
        </div>
      </div>

      {/* Rooms Table / Cards Grid */}
      {propertyRooms.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-colin-charcoal-200 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-colin-navy-50 text-colin-navy flex items-center justify-center mx-auto">
            <BedDouble size={32} className="text-colin-teal" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-colin-navy">No Rooms Configured</h3>
            <p className="text-xs text-colin-charcoal-500 max-w-sm mx-auto">
              Add individual rooms to set per-room rents, total beds, and occupancy statuses.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={handleOpenAdd}>
            Add First Room
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {propertyRooms.map((room) => {
            const isAvailable = room.status === 'available';
            const isOccupied = room.status === 'occupied';

            return (
              <div
                key={room.id}
                className="bg-white rounded-3xl border border-colin-charcoal-200 shadow-sm hover:shadow-md transition-all p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Line: Room Number & Status */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-colin-navy">
                        {room.roomNumber}
                      </h3>
                      <span className="text-[11px] text-colin-charcoal-400">
                        {room.floor} • {room.roomType.toUpperCase()} Sharing
                      </span>
                    </div>

                    <select
                      value={room.status}
                      onChange={(e) => handleQuickStatusChange(room, e.target.value as RoomStatus)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl border focus:outline-none ${
                        isAvailable
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : isOccupied
                          ? 'bg-colin-navy-50 text-colin-navy border-colin-navy-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      <option value="available">Available</option>
                      <option value="occupied">Occupied</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>

                  {/* Bed Counters HUD */}
                  <div className="p-3 bg-colin-offwhite rounded-2xl border border-colin-charcoal-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-colin-charcoal-400 font-bold uppercase block">
                        Bed Availability
                      </span>
                      <span className="text-sm font-extrabold text-colin-navy">
                        {room.availableBeds} / {room.totalBeds} Beds Open
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAdjustBeds(room, -1)}
                        disabled={room.availableBeds <= 0}
                        className="w-7 h-7 rounded-lg bg-white border border-colin-charcoal-200 font-bold text-xs text-colin-charcoal-700 hover:bg-colin-charcoal-50 disabled:opacity-40"
                        title="Reduce available bed"
                      >
                        -
                      </button>
                      <button
                        onClick={() => handleAdjustBeds(room, 1)}
                        disabled={room.availableBeds >= room.totalBeds}
                        className="w-7 h-7 rounded-lg bg-white border border-colin-charcoal-200 font-bold text-xs text-colin-charcoal-700 hover:bg-colin-charcoal-50 disabled:opacity-40"
                        title="Increase available bed"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Rent & Deposit */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-colin-charcoal-400 block">Monthly Rent</span>
                      <span className="font-extrabold text-colin-navy">
                        ₹{room.monthlyRent.toLocaleString('en-IN')}/mo
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-colin-charcoal-400 block">Deposit</span>
                      <span className="font-semibold text-colin-charcoal-600">
                        ₹{room.depositAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Amenities */}
                  {room.amenities && room.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {room.amenities.map((a) => (
                        <span key={a} className="text-[10px] bg-colin-charcoal-100 text-colin-charcoal-700 font-medium px-2 py-0.5 rounded-md">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Edit/Delete */}
                <div className="pt-3 border-t border-colin-charcoal-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenEdit(room)}
                    className="p-1.5 rounded-lg text-colin-charcoal-600 hover:text-colin-navy hover:bg-colin-charcoal-100 transition-colors"
                    title="Edit Room"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(room.id)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Room"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= ADD / EDIT ROOM MODAL ================= */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 bg-colin-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-colin-charcoal-200 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-colin-charcoal-100">
              <div className="flex items-center gap-2">
                <BedDouble size={20} className="text-colin-teal" />
                <h3 className="text-base font-black text-colin-navy font-display">
                  {editingRoom ? `Edit ${editingRoom.roomNumber}` : 'Add Room to Inventory'}
                </h3>
              </div>
              <button onClick={() => setIsRoomModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                    Room No. / Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Room 101"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                    Floor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1st Floor"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                    Sharing Type
                  </label>
                  <select
                    value={formData.roomType}
                    onChange={(e) => {
                      const type = e.target.value as SharingType;
                      const bedsMap: Record<SharingType, number> = {
                        single: 1,
                        double: 2,
                        triple: 3,
                        multi: 4,
                      };
                      const defaultBeds = bedsMap[type] || 2;
                      setFormData({
                        ...formData,
                        roomType: type,
                        totalBeds: defaultBeds,
                        availableBeds: defaultBeds,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy bg-white"
                  >
                    <option value="single">Single Room (1 Bed)</option>
                    <option value="double">Double Sharing (2 Beds)</option>
                    <option value="triple">Triple Sharing (3 Beds)</option>
                    <option value="multi">Four / Multi Sharing (4+ Beds)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                    Initial Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as RoomStatus })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy bg-white"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                    Total Beds in Room *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.totalBeds}
                    onChange={(e) => setFormData({ ...formData, totalBeds: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                    Available Open Beds *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={formData.totalBeds}
                    required
                    value={formData.availableBeds}
                    onChange={(e) => setFormData({ ...formData, availableBeds: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                    Monthly Rent (₹) *
                  </label>
                  <input
                    type="number"
                    min={1000}
                    required
                    value={formData.monthlyRent}
                    onChange={(e) => setFormData({ ...formData, monthlyRent: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                    Deposit (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.depositAmount}
                    onChange={(e) => setFormData({ ...formData, depositAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-colin-charcoal-700 uppercase">
                  Description / Features
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Balcony attached, corner room, peaceful lane view"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-colin-charcoal-300 focus:outline-none focus:ring-2 focus:ring-colin-navy"
                />
              </div>

              <div className="pt-3 border-t border-colin-charcoal-100 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsRoomModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="bg-colin-navy hover:bg-colin-navy-800">
                  {editingRoom ? 'Save Changes' : 'Add Room'}
                </Button>
              </div>
            </form>
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
              <h3 className="text-base font-extrabold text-colin-navy">Remove Room?</h3>
              <p className="text-xs text-colin-charcoal-500">
                Are you sure you want to remove this room from inventory? This will automatically update overall property availability for students.
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
                onClick={() => {
                  deleteRoom(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
              >
                Yes, Remove
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
