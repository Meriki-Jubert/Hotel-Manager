import React, { useState, useMemo } from 'react';
import { useHMS } from '../context/HMSContext';
import { useT } from '../i18n/LanguageContext';
import { tPaymentMethod, tBookingSource, tRoomStatus } from '../i18n/labels';
import { Reservation, Room, PaymentMethod } from '../types/hms';
import {
  X,
  LogIn,
  AlertTriangle,
  CheckCircle2,
  Bed,
  User,
  Calendar,
  CreditCard,
  DollarSign,
  AlertCircle,
  Sparkles,
  ShieldAlert,
  FileText
} from 'lucide-react';

interface ConvertCheckInModalProps {
  reservation: Reservation;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ConvertCheckInModal: React.FC<ConvertCheckInModalProps> = ({
  reservation,
  onClose,
  onSuccess
}) => {
  const { t, formatDate } = useT();
  const {
    rooms,
    roomTypes,
    formatMoney,
    convertReservationToCheckIn,
    getAvailableRoomsForDateRange,
    businessDate,
    guests
  } = useHMS();

  const guest = guests.find((g) => g.id === reservation.guestId);

  // Find room type
  const targetRoomTypeId =
    reservation.roomTypeId ||
    rooms.find((r) => r.id === reservation.roomId)?.roomTypeId ||
    '';
  const roomType = roomTypes.find((rt) => rt.id === targetRoomTypeId);

  const isFutureArrival = reservation.checkInDate > businessDate;

  // Available rooms for this stay (clean and bookable)
  const availableCandidateRooms = useMemo(() => {
    if (!targetRoomTypeId) return [];
    const candidateRooms = getAvailableRoomsForDateRange(
      targetRoomTypeId,
      reservation.checkInDate,
      reservation.checkOutDate,
      reservation.id
    );
    // Filter for switch room: clean, available today, not taken tonight, active, and status not occupied/dirty/cleaning/maintenance
    return candidateRooms.filter(
      (r) =>
        r.isActive !== false &&
        r.status !== 'occupied' &&
        r.status !== 'dirty' &&
        r.status !== 'cleaning' &&
        r.status !== 'maintenance'
    );
  }, [targetRoomTypeId, reservation, getAvailableRoomsForDateRange]);

  // Current assigned room or first candidate
  const initialRoomId = useMemo(() => {
    if (reservation.roomId && reservation.roomId !== 'unassigned') {
      const current = rooms.find((r) => r.id === reservation.roomId);
      if (current) return current.id;
    }
    return availableCandidateRooms[0]?.id || rooms.find((r) => r.roomTypeId === targetRoomTypeId)?.id || '';
  }, [reservation.roomId, rooms, availableCandidateRooms, targetRoomTypeId]);

  const [selectedRoomId, setSelectedRoomId] = useState<string>(initialRoomId);
  const [idCardNumber, setIdCardNumber] = useState<string>(
    guest?.idCardNumber || ''
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [additionalPayment, setAdditionalPayment] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const isRoomOccupied = selectedRoom ? selectedRoom.status === 'occupied' : false;
  const isRoomDirty = selectedRoom ? (selectedRoom.status === 'dirty' || selectedRoom.status === 'cleaning') : false;
  const isRoomMaintenance = selectedRoom ? selectedRoom.status === 'maintenance' : false;
  const isRoomDeactivated = selectedRoom ? selectedRoom.isActive === false : false;
  const isRoomBlocked = isRoomOccupied || isRoomDirty || isRoomMaintenance || isRoomDeactivated;

  const balanceDue = Math.max(0, reservation.totalAmount - reservation.amountPaid);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isFutureArrival) {
      setErrorMsg(t('convertCheckIn.earlyBlockedErr', { date: formatDate(reservation.checkInDate), today: formatDate(businessDate) }));
      return;
    }

    if (!selectedRoomId) {
      setErrorMsg(t('convertCheckIn.selectValidRoomErr'));
      return;
    }

    if (isRoomBlocked) {
      setErrorMsg(
        isRoomDeactivated
          ? t('convertCheckIn.deactivatedErr', { number: selectedRoom?.roomNumber || '' })
          : isRoomOccupied
          ? t('convertCheckIn.occupiedErr', { number: selectedRoom?.roomNumber || '' })
          : t('convertCheckIn.statusErr', { number: selectedRoom?.roomNumber || '', status: selectedRoom?.status || '' })
      );
      return;
    }

    if (!idCardNumber.trim()) {
      setErrorMsg(t('convertCheckIn.idRequiredErr'));
      return;
    }

    const res = convertReservationToCheckIn({
      reservationId: reservation.id,
      roomId: selectedRoomId,
      paymentMethod: additionalPayment > 0 ? paymentMethod : undefined,
      additionalDeposit: additionalPayment > 0 ? additionalPayment : undefined,
      idCardNumber: idCardNumber.trim()
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to check in guest.');
      return;
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  // All rooms of same type in same branch for switch room selection when assigned room is blocked
  const branchId = reservation.branchId || rooms.find((r) => r.id === reservation.roomId)?.branchId || '';
  const switchRoomCandidates = rooms.filter(
    (r) =>
      (r.branchId || branchId) === branchId &&
      r.roomTypeId === targetRoomTypeId &&
      r.isActive !== false &&
      r.status !== 'occupied' &&
      r.status !== 'dirty' &&
      r.status !== 'cleaning' &&
      r.status !== 'maintenance' &&
      getAvailableRoomsForDateRange(targetRoomTypeId, reservation.checkInDate, reservation.checkOutDate, reservation.id).some((cand) => cand.id === r.id)
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
        
        {/* Header - shrink-0 pinned at top */}
        <div className="bg-emerald-950 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-emerald-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                {t('convertCheckIn.title')}
              </h2>
              <p className="text-xs text-emerald-200 font-mono">
                {t('convertCheckIn.headerSub', { code: reservation.bookingCode, date: formatDate(reservation.checkInDate) })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - scrollable */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-slate-900 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* Check-In Valve Blocker Banner if future arrival */}
          {isFutureArrival && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="block font-bold text-amber-950">
                  {t('convertCheckIn.valveHeader', { date: formatDate(reservation.checkInDate) })}
                </strong>
                <p className="text-amber-800 leading-relaxed">
                  {t('convertCheckIn.valveBody', { today: formatDate(businessDate) })}
                </p>
              </div>
            </div>
          )}

          {/* Pre-filled Guest Summary */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400" />
                <span>{reservation.guestName}</span>
              </div>
              <span className="text-xs font-mono text-slate-600 font-semibold">{reservation.guestPhone}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
              <div>
                {t('convertCheckIn.dates', { checkIn: formatDate(reservation.checkInDate), checkOut: formatDate(reservation.checkOutDate) })}
              </div>
              <div>
                {t('convertCheckIn.stay', { nights: reservation.totalNights, adults: reservation.adults })}
              </div>
              <div>
                {t('convertCheckIn.category', { category: roomType?.name || 'Standard' })}
              </div>
              <div>
                {t('convertCheckIn.channel', { channel: tBookingSource(t, reservation.source) })}
              </div>
            </div>
          </div>

          {/* Required ID Card Input */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-500" />
              <span>{t('convertCheckIn.idCardLabel')}</span>
            </label>
            <input
              type="text"
              required
              value={idCardNumber}
              onChange={(e) => setIdCardNumber(e.target.value)}
              placeholder={t('convertCheckIn.idCardPlaceholder')}
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* Room Selection & Cleanliness / Status Blockers */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Bed className="w-4 h-4 text-slate-500" />
                {t('convertCheckIn.assignRoom')}
              </label>
              <span className="text-[10px] text-emerald-700 font-bold">
                {t('convertCheckIn.cleanAvailable', { count: switchRoomCandidates.length })}
              </span>
            </div>

            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
            >
              {rooms
                .filter((r) => (r.branchId || branchId) === branchId && r.roomTypeId === targetRoomTypeId)
                .map((r) => {
                  const isBlocked = r.status === 'occupied' || r.status === 'dirty' || r.status === 'cleaning' || r.status === 'maintenance' || r.isActive === false;
                  return (
                    <option key={r.id} value={r.id} disabled={isBlocked} className={`font-semibold ${isBlocked ? 'text-slate-400 bg-slate-100' : 'text-slate-900'}`}>
                      {t('convertCheckIn.roomOption', {
                        number: r.roomNumber,
                        floor: r.floor,
                        status: r.isActive === false ? 'DEACTIVATED' : tRoomStatus(t, r.status).toUpperCase(),
                        rate: formatMoney(r.pricePerNight),
                        blocked: isBlocked ? '[BLOCKED]' : ''
                      })}
                    </option>
                  );
                })}
            </select>

            {/* Room Status Blockers & Switch Room Warnings */}
            {isRoomDeactivated && (
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">{t('convertCheckIn.deactivatedTitle', { number: selectedRoom?.roomNumber || '' })}</strong>
                  <span>{t('convertCheckIn.deactivatedBody')}</span>
                </div>
              </div>
            )}

            {isRoomOccupied && (
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">{t('convertCheckIn.occupiedTitle', { number: selectedRoom?.roomNumber || '' })}</strong>
                  <span>{t('convertCheckIn.occupiedBody')}</span>
                </div>
              </div>
            )}

            {isRoomDirty && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">{t('convertCheckIn.dirtyTitle', { number: selectedRoom?.roomNumber || '', status: selectedRoom ? tRoomStatus(t, selectedRoom.status).toUpperCase() : '' })}</strong>
                  <span>{t('convertCheckIn.dirtyBody')}</span>
                </div>
              </div>
            )}

            {isRoomMaintenance && (
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">{t('convertCheckIn.maintTitle')}</strong>
                  <span>{t('convertCheckIn.maintBody', { number: selectedRoom?.roomNumber || '' })}</span>
                </div>
              </div>
            )}
          </div>

          {/* Folio Balance & Additional Settlement at Check-In */}
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                {t('convertCheckIn.folioHeading')}
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-700">
                {t('convertCheckIn.totalStayPaid', { total: formatMoney(reservation.totalAmount), paid: formatMoney(reservation.amountPaid) })}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('convertCheckIn.collectPayment', { remaining: formatMoney(balanceDue) })}
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={additionalPayment}
                    onChange={(e) => setAdditionalPayment(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 placeholder-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('convertCheckIn.paymentMethod')}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  disabled={additionalPayment <= 0}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900 disabled:opacity-50"
                >
                  <option value="cash" className="text-slate-900">{tPaymentMethod(t, 'cash')}</option>
                  <option value="momo" className="text-slate-900">{tPaymentMethod(t, 'momo')}</option>
                  <option value="orange_money" className="text-slate-900">{tPaymentMethod(t, 'orange_money')}</option>
                  <option value="card" className="text-slate-900">{tPaymentMethod(t, 'card')}</option>
                  <option value="bank_transfer" className="text-slate-900">{tPaymentMethod(t, 'bank_transfer')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons - shrink-0 */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={!selectedRoomId || isRoomBlocked || isFutureArrival || !idCardNumber.trim()}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>
                {isFutureArrival
                  ? t('convertCheckIn.btnBlockedFuture', { date: formatDate(reservation.checkInDate) })
                  : isRoomBlocked
                  ? t('convertCheckIn.btnBlockedSwitch')
                  : !idCardNumber.trim()
                  ? t('convertCheckIn.btnBlockedId')
                  : t('convertCheckIn.btnSubmit')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
