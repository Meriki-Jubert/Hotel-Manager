import React, { useState } from 'react';
import { useHMS } from '../../context/HMSContext';
import { Room } from '../../types/hms';
import { DeactivatePromptModal, DeactivatePromptState } from './shared';
import {
  Bed,
  PlusCircle,
  Hash,
  Edit3,
  Trash2,
  X,
  AlertCircle
} from 'lucide-react';

export interface RoomSettingsProps {
  onNavigateToRoomTypes?: () => void;
}

export const RoomSettings: React.FC<RoomSettingsProps> = ({ onNavigateToRoomTypes }) => {
  const {
    roomTypes,
    allRooms,
    branches,
    activeBranchId,
    hasMultipleActiveBranches,
    formatMoney,
    addRoom,
    bulkAddRooms,
    updateRoom,
    deleteRoom,
    toggleRoomActive
  } = useHMS();

  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const defaultBranchId = (activeBranchId && activeBranchId !== 'all') ? activeBranchId : (branches[0]?.id || 'branch-1');

  // Single room form state
  const [roomFormNumber, setRoomFormNumber] = useState('');
  const [roomFormFloor, setRoomFormFloor] = useState<number>(1);
  const [roomFormTypeId, setRoomFormTypeId] = useState<string>(roomTypes[0]?.id || '');
  const [roomFormBranchId, setRoomFormBranchId] = useState<string>(defaultBranchId);
  const [roomFormPrice, setRoomFormPrice] = useState<number | ''>(roomTypes[0]?.basePrice || 35000);
  const [roomFormImage, setRoomFormImage] = useState('');
  const [roomFormError, setRoomFormError] = useState<string | null>(null);

  // Bulk add form state
  const [bulkTypeId, setBulkTypeId] = useState<string>(roomTypes[0]?.id || '');
  const [bulkBranchId, setBulkBranchId] = useState<string>(defaultBranchId);
  const [bulkFloor, setBulkFloor] = useState<number>(1);
  const [bulkStartNum, setBulkStartNum] = useState<number>(101);
  const [bulkEndNum, setBulkEndNum] = useState<number>(110);
  const [bulkPrice, setBulkPrice] = useState<number | ''>(roomTypes[0]?.basePrice || 35000);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Branch filter for rooms inventory list
  const [roomFilterBranchId, setRoomFilterBranchId] = useState<string>('all');

  const [deactivatePrompt, setDeactivatePrompt] = useState<DeactivatePromptState | null>(null);

  const openAddRoom = () => {
    setEditingRoom(null);
    const initialTypeId = roomTypes[0]?.id || '';
    const initialPrice = roomTypes[0]?.basePrice || 35000;
    const initialBranch = (activeBranchId && activeBranchId !== 'all') ? activeBranchId : (branches[0]?.id || 'branch-1');
    setRoomFormNumber('');
    setRoomFormFloor(1);
    setRoomFormTypeId(initialTypeId);
    setRoomFormBranchId(initialBranch);
    setRoomFormPrice(initialPrice);
    setRoomFormImage('');
    setRoomFormError(null);
    setShowAddRoomModal(true);
  };

  const openEditRoom = (r: Room) => {
    setEditingRoom(r);
    setRoomFormNumber(r.roomNumber);
    setRoomFormFloor(r.floor);
    setRoomFormTypeId(r.roomTypeId);
    setRoomFormBranchId(r.branchId || ((activeBranchId && activeBranchId !== 'all') ? activeBranchId : (branches[0]?.id || 'branch-1')));
    setRoomFormPrice(r.pricePerNight);
    setRoomFormImage(r.image || '');
    setRoomFormError(null);
    setShowAddRoomModal(true);
  };

  const openBulkAddModal = () => {
    const initialBranch = (activeBranchId && activeBranchId !== 'all') ? activeBranchId : (branches[0]?.id || 'branch-1');
    setBulkTypeId(roomTypes[0]?.id || '');
    setBulkBranchId(initialBranch);
    setBulkFloor(1);
    setBulkStartNum(101);
    setBulkEndNum(110);
    setBulkPrice(roomTypes[0]?.basePrice || 35000);
    setBulkError(null);
    setShowBulkAddModal(true);
  };

  const handleRoomTypeSelectionChange = (newTypeId: string) => {
    setRoomFormTypeId(newTypeId);
    const matchedType = roomTypes.find((rt) => rt.id === newTypeId);
    if (matchedType) {
      setRoomFormPrice(matchedType.basePrice);
    }
  };

  const handleBulkTypeSelectionChange = (newTypeId: string) => {
    setBulkTypeId(newTypeId);
    const matchedType = roomTypes.find((rt) => rt.id === newTypeId);
    if (matchedType) {
      setBulkPrice(matchedType.basePrice);
    }
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setRoomFormError(null);

    const num = roomFormNumber.trim();
    if (!num) {
      setRoomFormError('Room number is required.');
      return;
    }
    if (!roomFormTypeId) {
      setRoomFormError('Please select a room type.');
      return;
    }
    if (!roomFormBranchId) {
      setRoomFormError('Please select a branch.');
      return;
    }
    if (roomFormFloor === undefined || isNaN(Number(roomFormFloor))) {
      setRoomFormError('Floor must be a valid number.');
      return;
    }
    if (!roomFormPrice || Number(roomFormPrice) <= 0) {
      setRoomFormError('Price per night must be greater than 0.');
      return;
    }

    if (editingRoom) {
      const res = updateRoom(editingRoom.id, {
        roomNumber: num,
        floor: Number(roomFormFloor),
        roomTypeId: roomFormTypeId,
        branchId: roomFormBranchId,
        pricePerNight: Number(roomFormPrice),
        image: roomFormImage.trim() || undefined
      });
      if (!res.success) {
        setRoomFormError(res.error || 'Failed to update room.');
        return;
      }
    } else {
      const res = addRoom({
        roomNumber: num,
        floor: Number(roomFormFloor),
        roomTypeId: roomFormTypeId,
        branchId: roomFormBranchId,
        pricePerNight: Number(roomFormPrice),
        image: roomFormImage.trim() || undefined
      });
      if (!res.success) {
        setRoomFormError(res.error || 'Failed to create room.');
        return;
      }
    }

    setShowAddRoomModal(false);
  };

  const handleExecuteBulkAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError(null);

    if (!bulkTypeId) {
      setBulkError('Please select a room type.');
      return;
    }
    if (!bulkBranchId) {
      setBulkError('Please select a branch.');
      return;
    }
    if (isNaN(bulkStartNum) || isNaN(bulkEndNum)) {
      setBulkError('Start and End room numbers must be valid numbers.');
      return;
    }
    if (bulkStartNum > bulkEndNum) {
      setBulkError('Start room number cannot be greater than End room number.');
      return;
    }
    if (!bulkPrice || Number(bulkPrice) <= 0) {
      setBulkError('Price per night must be greater than 0.');
      return;
    }

    const res = bulkAddRooms({
      startNumber: Number(bulkStartNum),
      endNumber: Number(bulkEndNum),
      floor: Number(bulkFloor),
      roomTypeId: bulkTypeId,
      branchId: bulkBranchId,
      pricePerNight: Number(bulkPrice)
    });

    if (!res.success) {
      setBulkError(res.error || 'Failed to bulk-add rooms.');
      return;
    }

    setShowBulkAddModal(false);
  };

  const handleDeleteRoom = (r: Room) => {
    const res = deleteRoom(r.id);
    if (!res.success) {
      if (res.canDeactivateInstead) {
        setDeactivatePrompt({
          isOpen: true,
          type: 'room',
          id: r.id,
          title: `Cannot Delete Room #${r.roomNumber}`,
          message: `${res.error} Would you like to deactivate this room instead? Deactivated rooms will remain in financial audit logs but won't be offered for new bookings.`
        });
      }
    }
  };

  const handleConfirmDeactivate = () => {
    if (!deactivatePrompt) return;
    toggleRoomActive(deactivatePrompt.id, false);
    setDeactivatePrompt(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Bed className="w-4 h-4 text-purple-600" />
            Physical Rooms Inventory & Numbers
          </h3>
          <p className="text-xs text-slate-500">
            Manage individual rooms, assign floor levels and room categories, or bulk-generate rooms
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasMultipleActiveBranches && (
            <div className="flex items-center gap-1.5 text-xs bg-slate-100 p-1 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-600 pl-1">Branch:</span>
              <select
                value={roomFilterBranchId}
                onChange={(e) => setRoomFilterBranchId(e.target.value)}
                className="p-1 bg-white border border-slate-300 rounded text-xs font-semibold focus:outline-none"
              >
                <option value="all">All Branches ({allRooms.length})</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({allRooms.filter((r) => r.branchId === b.id).length})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => {
              if (roomTypes.length === 0) {
                onNavigateToRoomTypes?.();
                return;
              }
              openBulkAddModal();
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-sm transition-all cursor-pointer"
          >
            <Hash className="w-4 h-4 text-champagne-gold-400" />
            <span>Bulk Add Rooms</span>
          </button>

          <button
            onClick={() => {
              if (roomTypes.length === 0) {
                onNavigateToRoomTypes?.();
                return;
              }
              openAddRoom();
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs shadow-sm transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Single Room</span>
          </button>
        </div>
      </div>

      {allRooms.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 mx-auto flex items-center justify-center">
            <Bed className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm text-slate-800">No Hotel Rooms Created Yet</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Add individual rooms or use the Bulk Add feature (e.g. rooms 101 to 110 on Floor 1) to quickly populate your property.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                if (roomTypes.length === 0) {
                  onNavigateToRoomTypes?.();
                } else {
                  openAddRoom();
                }
              }}
              className="px-4 py-2 bg-purple-600 text-white font-bold rounded-lg text-xs shadow-sm cursor-pointer"
            >
              {roomTypes.length === 0 ? 'Create Room Types First' : 'Add Single Room'}
            </button>
            {roomTypes.length > 0 && (
              <button
                onClick={openBulkAddModal}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg text-xs shadow-sm cursor-pointer"
              >
                Bulk Add Rooms (Fast)
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-[10px] font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Room #</th>
                  {hasMultipleActiveBranches && (
                    <th className="py-3 px-4">Branch</th>
                  )}
                  <th className="py-3 px-4">Floor</th>
                  <th className="py-3 px-4">Room Category</th>
                  <th className="py-3 px-4 text-right">Nightly Price</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4">Inventory State</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(roomFilterBranchId === 'all'
                  ? allRooms
                  : allRooms.filter((r) => r.branchId === roomFilterBranchId)
                ).map((r) => {
                  const rType = roomTypes.find((t) => t.id === r.roomTypeId);
                  const rBranch = branches.find((b) => b.id === r.branchId);
                  const isDeactivated = r.isActive === false;

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isDeactivated ? 'bg-slate-50/50 opacity-60' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-bold font-mono text-slate-900 text-sm">
                        #{r.roomNumber}
                      </td>
                      {hasMultipleActiveBranches && (
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">
                            {rBranch?.name || 'Main Branch'}
                          </span>
                          {rBranch?.city && (
                            <span className="text-[10px] text-slate-400 block">
                              {rBranch.city}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="py-3 px-4 text-slate-600">
                        Floor {r.floor}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">
                          {rType?.name || 'Unknown Type'}
                        </span>
                        {rType && (
                          <span className="ml-1.5 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {rType.code}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatMoney(r.pricePerNight)}
                      </td>
                      <td className="py-3 px-4 capitalize font-semibold text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              r.status === 'available'
                                ? 'bg-emerald-500'
                                : r.status === 'occupied'
                                ? 'bg-rose-500'
                                : r.status === 'reserved'
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isDeactivated
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isDeactivated ? 'Deactivated' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => toggleRoomActive(r.id, isDeactivated)}
                            className={`text-[11px] font-semibold px-2 py-1 rounded transition-colors cursor-pointer ${
                              isDeactivated
                                ? 'text-emerald-700 hover:bg-emerald-50'
                                : 'text-amber-700 hover:bg-amber-50'
                            }`}
                            title={isDeactivated ? 'Activate room' : 'Deactivate room'}
                          >
                            {isDeactivated ? 'Activate' : 'Deactivate'}
                          </button>

                          <button
                            onClick={() => openEditRoom(r)}
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                            title="Edit Room"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteRoom(r)}
                            className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded cursor-pointer"
                            title="Delete Room"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SINGLE ROOM */}
      {showAddRoomModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Bed className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  {editingRoom ? `Edit Room #${editingRoom.roomNumber}` : 'Add New Hotel Room'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddRoomModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {roomFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">{roomFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Room Number *</label>
                  <input
                    type="text"
                    value={roomFormNumber}
                    onChange={(e) => setRoomFormNumber(e.target.value)}
                    placeholder="e.g. 101"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Floor Level *</label>
                  <input
                    type="number"
                    value={roomFormFloor}
                    onChange={(e) => setRoomFormFloor(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Branch *</label>
                <select
                  value={roomFormBranchId}
                  onChange={(e) => setRoomFormBranchId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  {branches.filter((b) => b.isActive).map((b) => (
                    <option key={b.id} value={b.id} className="text-slate-900">
                      {b.name} ({b.city || 'No city'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Rooms are created per branch and room numbers are unique within that branch.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Room Type Category *</label>
                <select
                  value={roomFormTypeId}
                  onChange={(e) => handleRoomTypeSelectionChange(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id} className="text-slate-900">
                      {rt.name} ({rt.code}) - {formatMoney(rt.basePrice)}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Selecting a category automatically sets the nightly rate default below.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nightly Price (FCFA) *</label>
                <input
                  type="number"
                  step="500"
                  min="1"
                  value={roomFormPrice}
                  onChange={(e) => setRoomFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Optional Photo URL</label>
                <input
                  type="url"
                  value={roomFormImage}
                  onChange={(e) => setRoomFormImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  {editingRoom ? 'Save Changes' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BULK ADD ROOMS */}
      {showBulkAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-champagne-gold-400" />
                <h3 className="font-bold text-sm sm:text-base">Bulk Add Hotel Rooms</h3>
              </div>
              <button
                onClick={() => setShowBulkAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteBulkAdd} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <p className="text-slate-600 text-xs">
                Quickly populate a corridor or floor with sequential room numbers (e.g. rooms 101 to 110).
              </p>

              {bulkError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">{bulkError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Branch *</label>
                <select
                  value={bulkBranchId}
                  onChange={(e) => setBulkBranchId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {branches.filter((b) => b.isActive).map((b) => (
                    <option key={b.id} value={b.id} className="text-slate-900">
                      {b.name} ({b.city || 'No city'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Room Type Category *</label>
                <select
                  value={bulkTypeId}
                  onChange={(e) => handleBulkTypeSelectionChange(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id} className="text-slate-900">
                      {rt.name} ({rt.code}) - {formatMoney(rt.basePrice)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Floor Level *</label>
                  <input
                    type="number"
                    value={bulkFloor}
                    onChange={(e) => setBulkFloor(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Room # *</label>
                  <input
                    type="number"
                    value={bulkStartNum}
                    onChange={(e) => setBulkStartNum(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="101"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Room # *</label>
                  <input
                    type="number"
                    value={bulkEndNum}
                    onChange={(e) => setBulkEndNum(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="110"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Price per Night (FCFA) *</label>
                <input
                  type="number"
                  step="500"
                  min="1"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-[11px]">
                <strong>Preview:</strong> Will generate{' '}
                <span className="font-bold text-slate-900">
                  {Math.max(0, bulkEndNum - bulkStartNum + 1)}
                </span>{' '}
                rooms on Floor {bulkFloor}. All rooms will start with status <strong>AVAILABLE</strong>.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBulkAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  Generate Rooms Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate prompt modal */}
      {deactivatePrompt && (
        <DeactivatePromptModal
          prompt={deactivatePrompt}
          onCancel={() => setDeactivatePrompt(null)}
          onConfirm={handleConfirmDeactivate}
        />
      )}
    </div>
  );
};
