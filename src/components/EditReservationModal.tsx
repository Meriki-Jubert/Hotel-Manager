import React, { useState, useMemo } from 'react';
import { useHMS } from '../context/HMSContext';
import { Reservation, BookingSource } from '../types/hms';
import { calculateStayNights, isValidDateString } from '../utils/dateUtils';
import { checkAvailability, getAvailableRoomCount } from '../utils/availability';
import { getCancellationPolicySummary } from '../utils/cancellationPolicy';
import {
  X,
  Calendar,
  Building,
  Edit,
  AlertCircle,
  CheckCircle2,
  BookmarkCheck,
  User,
  ShieldCheck
} from 'lucide-react';

interface EditReservationModalProps {
  reservation: Reservation;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditReservationModal: React.FC<EditReservationModalProps> = ({
  reservation,
  onClose,
  onSuccess
}) => {
  const {
    roomTypes,
    rooms,
    allRooms,
    allReservations,
    branches,
    businessDate,
    formatMoney,
    updateReservation,
    hotelConfig
  } = useHMS();

  const activeRoomTypes = roomTypes.filter((rt) => rt.isActive !== false);

  const [checkInDate, setCheckInDate] = useState(reservation.checkInDate);
  const [checkOutDate, setCheckOutDate] = useState(reservation.checkOutDate);
  const [roomTypeId, setRoomTypeId] = useState<string>(
    reservation.roomTypeId ||
      rooms.find((r) => r.id === reservation.roomId)?.roomTypeId ||
      activeRoomTypes[0]?.id ||
      ''
  );
  const [selectedRoomId, setSelectedRoomId] = useState<string>(reservation.roomId || '');
  const [adults, setAdults] = useState(reservation.adults);
  const [children, setChildren] = useState(reservation.children);
  const [rateType, setRateType] = useState<'flexible' | 'non_refundable'>(reservation.rateType || 'flexible');
  const [source, setSource] = useState<BookingSource>(reservation.source);
  const [specialRequests, setSpecialRequests] = useState(reservation.specialRequests || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveBranchId = useMemo(() => {
    return reservation.branchId || branches[0]?.id || 'branch-1';
  }, [reservation.branchId, branches]);

  const branchRooms = useMemo(() => {
    return allRooms.filter((r) => (r.branchId || branches[0]?.id || 'branch-1') === effectiveBranchId);
  }, [allRooms, effectiveBranchId, branches]);

  const branchReservations = useMemo(() => {
    return allReservations.filter((res) => (res.branchId || branches[0]?.id || 'branch-1') === effectiveBranchId);
  }, [allReservations, effectiveBranchId, branches]);

  // Total bookable room count using getAvailableRoomCount
  const availableRoomCount = useMemo(() => {
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate || !roomTypeId) return 0;
    return getAvailableRoomCount(
      effectiveBranchId,
      roomTypeId,
      checkInDate,
      checkOutDate,
      branchRooms,
      branchReservations,
      reservation.id
    );
  }, [effectiveBranchId, roomTypeId, checkInDate, checkOutDate, branchRooms, branchReservations, reservation.id]);

  // Specific room dropdown items using checkAvailability
  const availableRoomsForRange = useMemo(() => {
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate || !roomTypeId) {
      return [];
    }
    return branchRooms.filter((room) => {
      if (room.roomTypeId !== roomTypeId || room.isActive === false) return false;
      const check = checkAvailability({
        branchId: effectiveBranchId,
        roomTypeId,
        checkInDate,
        checkOutDate,
        rooms: branchRooms,
        reservations: branchReservations,
        excludeReservationId: reservation.id,
        requestedRoomId: room.id
      });
      return check.available;
    });
  }, [effectiveBranchId, roomTypeId, checkInDate, checkOutDate, branchRooms, branchReservations, reservation.id]);

  const currentRoomType = activeRoomTypes.find((rt) => rt.id === roomTypeId);
  const currentRoom = rooms.find((r) => r.id === selectedRoomId);

  const nights = useMemo(() => {
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) return 1;
    return calculateStayNights(checkInDate, checkOutDate);
  }, [checkInDate, checkOutDate]);

  const nightlyRate = currentRoom ? currentRoom.pricePerNight : currentRoomType ? currentRoomType.basePrice : 0;
  const newTotalAmount = nightlyRate * nights;
  const balanceDue = Math.max(0, newTotalAmount - reservation.amountPaid);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isValidDateString(checkInDate) || !isValidDateString(checkOutDate)) {
      setErrorMsg('Please enter valid dates.');
      return;
    }
    if (checkOutDate <= checkInDate) {
      setErrorMsg('Check-out date must be strictly after check-in date.');
      return;
    }
    if (checkInDate < businessDate) {
      setErrorMsg(`Check-in date cannot be in the past (Hotel business date: ${businessDate}).`);
      return;
    }
    if (adults < 1) {
      setErrorMsg('At least 1 adult is required.');
      return;
    }
    if (currentRoomType && adults + children > currentRoomType.maxCapacity) {
      setErrorMsg(
        `Total guests (${adults + children}) exceeds maximum capacity (${currentRoomType.maxCapacity}) for ${currentRoomType.name}.`
      );
      return;
    }

    if (selectedRoomId) {
      const roomAvailable = availableRoomsForRange.some((r) => r.id === selectedRoomId);
      if (!roomAvailable) {
        setErrorMsg('The selected room is not available for these dates.');
        return;
      }
    } else {
      if (availableRoomCount === 0) {
        setErrorMsg(`All rooms of type ${currentRoomType?.name} are booked for the selected dates.`);
        return;
      }
    }

    const res = updateReservation(reservation.id, {
      checkInDate,
      checkOutDate,
      roomTypeId,
      roomId: selectedRoomId || undefined,
      adults,
      children,
      source,
      rateType,
      specialRequests: specialRequests.trim() || undefined
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to update reservation.');
      return;
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
        
        {/* Header - shrink-0 pinned at top */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Edit Reservation <span className="font-mono text-champagne-gold-400">{reservation.bookingCode}</span>
              </h2>
              <p className="text-xs text-slate-300">
                Guest: <strong className="text-white">{reservation.guestName}</strong> ({reservation.guestPhone})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - scrollable */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-slate-900 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Check-in Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                min={businessDate}
                required
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Check-out Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                min={checkInDate || businessDate}
                required
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Room Type & Specific Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Room Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={roomTypeId}
                onChange={(e) => {
                  setRoomTypeId(e.target.value);
                  setSelectedRoomId('');
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {activeRoomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} ({formatMoney(rt.basePrice)}/nt)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Specific Room</span>
                <span className="text-[10px] font-semibold text-emerald-700">
                  {availableRoomCount} {availableRoomCount === 1 ? 'room' : 'rooms'} available
                </span>
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="">Auto-assign at Check-in (Hold Room Type)</option>
                {availableRoomsForRange.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room #{r.roomNumber} (Floor {r.floor} • {formatMoney(r.pricePerNight)}/nt)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Guest Count & Source */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Adults</label>
              <input
                type="number"
                min={1}
                max={currentRoomType?.maxCapacity || 10}
                value={adults}
                onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Children</label>
              <input
                type="number"
                min={0}
                max={5}
                value={children}
                onChange={(e) => setChildren(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as BookingSource)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="Phone">Phone</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Walk-In">Walk-In</option>
                <option value="Direct Website">Website</option>
                <option value="Agency">Agency</option>
                <option value="OTA - Booking.com">OTA</option>
                <option value="Corporate">Corporate</option>
              </select>
            </div>
          </div>

          {/* Special Requests */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Special Requests</label>
            <textarea
              rows={2}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Pricing Summary */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">New Rate</span>
              <span className="font-mono font-bold text-slate-800">{nights} nts × {formatMoney(nightlyRate)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Stay</span>
              <span className="font-mono font-bold text-slate-900">{formatMoney(newTotalAmount)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Deposit Paid</span>
              <span className="font-mono font-bold text-emerald-700">{formatMoney(reservation.amountPaid)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Balance Due</span>
              <span className={`font-mono font-bold ${balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatMoney(balanceDue)}
              </span>
            </div>
          </div>

          {/* Cancellation Policy Terms & Non-Refundable Toggle */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5 shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Cancellation Terms:
              </span>
              <span className="text-slate-600 font-medium text-right">
                {getCancellationPolicySummary(hotelConfig.cancellationPolicy)}
              </span>
            </div>

            {hotelConfig.cancellationPolicy?.allowNonRefundable && (
              <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-3">
                <div>
                  <label htmlFor="editResNonRefundable" className="font-bold text-slate-800 cursor-pointer block">
                    Non-refundable Rate
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Full stay amount applies as fee if cancelled or no-show
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="editResNonRefundable"
                  checked={rateType === 'non_refundable'}
                  onChange={(e) => setRateType(e.target.checked ? 'non_refundable' : 'flexible')}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
