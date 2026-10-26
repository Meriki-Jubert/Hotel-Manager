import React, { useState, useMemo } from 'react';
import { useHMS } from '../context/HMSContext';
import { Reservation } from '../types/hms';
import { calculateRoomMoveAdjustment } from '../utils/stayChanges';
import { checkAvailability } from '../utils/availability';
import { listNights, getLocalDateString } from '../utils/dateUtils';
import { useT } from '../i18n/LanguageContext';
import { tRoomMoveReason } from '../i18n/labels';
import { Shuffle, Check, AlertCircle, X } from 'lucide-react';

interface ChangeRoomModalProps {
  reservation: Reservation;
  onClose: () => void;
}

const REASON_KEYS = [
  'AC/fault',
  'guest request',
  'upgrade',
  'downgrade',
  'noise',
  'other'
];

export const ChangeRoomModal: React.FC<ChangeRoomModalProps> = ({ reservation, onClose }) => {
  const {
    changeRoom,
    formatMoney,
    currentUser,
    allRooms,
    allReservations,
    roomTypes,
    branches,
    branchBusinessDates,
    businessDate
  } = useHMS();
  const { t } = useT();

  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'owner';
  const targetBranchId = reservation.branchId || branches[0]?.id || '';
  const branchCurrentDate =
    (targetBranchId && branchBusinessDates[targetBranchId]) ||
    businessDate ||
    getLocalDateString();

  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [reasonCategory, setReasonCategory] = useState<string>('AC/fault');
  const [reasonCustom, setReasonCustom] = useState<string>('');
  const [keepCurrentRate, setKeepCurrentRate] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Compute remaining nights
  const remainingNightsList = useMemo(() => {
    return listNights(branchCurrentDate, reservation.checkOutDate);
  }, [branchCurrentDate, reservation.checkOutDate]);

  const remainingNights = Math.max(1, remainingNightsList.length);

  // Filter only valid target rooms in the same branch that are available and clean
  const validRooms = useMemo(() => {
    const branchRooms = allRooms.filter(
      (r) => (r.branchId || branches[0]?.id) === targetBranchId
    );
    const branchReservations = allReservations.filter(
      (res) => (res.branchId || branches[0]?.id) === targetBranchId
    );

    return branchRooms.filter((room) => {
      // Must not be current room
      if (room.id === reservation.roomId) return false;
      // Must be active
      if (room.isActive === false) return false;
      // Must be status 'available' (clean)
      if (room.status !== 'available') return false;

      // Must be free for remaining nights via checkAvailability
      const check = checkAvailability({
        branchId: targetBranchId,
        roomTypeId: room.roomTypeId,
        checkInDate: branchCurrentDate,
        checkOutDate: reservation.checkOutDate,
        rooms: branchRooms,
        reservations: branchReservations,
        excludeReservationId: reservation.id,
        requestedRoomId: room.id
      });

      return check.available;
    });
  }, [
    allRooms,
    allReservations,
    targetBranchId,
    reservation.roomId,
    reservation.id,
    branchCurrentDate,
    reservation.checkOutDate,
    branches
  ]);

  const selectedRoom = useMemo(() => {
    return validRooms.find((r) => r.id === selectedRoomId) || null;
  }, [validRooms, selectedRoomId]);

  // Live calculation of adjustment
  const adjustmentInfo = useMemo(() => {
    if (!selectedRoom) return { adjustmentAmount: 0 };
    return calculateRoomMoveAdjustment({
      remainingNights,
      oldRate: reservation.nightlyRate,
      newRate: selectedRoom.pricePerNight,
      keepCurrentRate
    });
  }, [selectedRoom, remainingNights, reservation.nightlyRate, keepCurrentRate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedRoomId) {
      setErrorMessage(t('changeRoom.errSelectRoom'));
      return;
    }

    const fullReason =
      reasonCategory === 'other'
        ? (reasonCustom.trim() || t('changeRoom.otherReasonDefault'))
        : reasonCustom.trim()
        ? `${reasonCategory}: ${reasonCustom.trim()}`
        : reasonCategory;

    if (!fullReason || fullReason.trim().length === 0) {
      setErrorMessage(t('changeRoom.errProvideReason'));
      return;
    }

    if (!keepCurrentRate && !isManager) {
      setErrorMessage(t('changeRoom.errOnlyManagerRate'));
      return;
    }

    setIsSubmitting(true);
    const result = changeRoom(reservation.id, selectedRoomId, fullReason, keepCurrentRate);
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setErrorMessage(result.error || t('changeRoom.errFail'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Shuffle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">{t('changeRoom.title')}</h2>
              <p className="text-xs text-slate-400">
                {t('changeRoom.subtitle', { number: reservation.roomNumber, name: reservation.guestName })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Stay Context */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs grid grid-cols-3 gap-2 text-slate-700">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('changeRoom.currentRoom')}</span>
              <span className="font-mono font-bold text-slate-900 text-sm">#{reservation.roomNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('changeRoom.remainingStay')}</span>
              <span className="font-semibold text-slate-900 text-xs">{t('changeRoom.nightsCount', { count: remainingNights })}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('changeRoom.currentRate')}</span>
              <span className="font-mono font-bold text-emerald-700 text-xs">{formatMoney(reservation.nightlyRate)}</span>
            </div>
          </div>

          {/* Target Room Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t('changeRoom.selectTarget')}
            </label>

            {validRooms.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">{t('changeRoom.noRoomsTitle')}</strong>
                  <span>
                    {t('changeRoom.noRoomsBody', { from: branchCurrentDate, to: reservation.checkOutDate })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {validRooms.map((room) => {
                  const type = roomTypes.find((t) => t.id === room.roomTypeId);
                  const isSelected = selectedRoomId === room.id;
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => {
                        setSelectedRoomId(room.id);
                        setErrorMessage(null);
                      }}
                      className={`w-full text-left p-3 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/80 border-l-4 border-l-blue-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-3" />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 font-mono text-sm">
                            Room #{room.roomNumber}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {type?.name || 'Standard'} • Floor {room.floor}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900">
                          {formatMoney(room.pricePerNight)}
                          <span className="text-[10px] text-slate-400 font-normal"> {t('changeRoom.perNight')}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {t('changeRoom.cleanVacant')}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reason Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t('changeRoom.reasonLabel')}
              </label>
              <select
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {REASON_KEYS.map((k) => (
                  <option key={k} value={k} className="text-slate-900">
                    {tRoomMoveReason(t, k)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t('changeRoom.notesLabel')}
              </label>
              <input
                type="text"
                placeholder={t('changeRoom.notesPlaceholder')}
                value={reasonCustom}
                onChange={(e) => setReasonCustom(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Rate Choice */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 block">
              {t('changeRoom.rateOptionTitle', { count: remainingNights })}
            </span>

            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="rateOption"
                  checked={keepCurrentRate}
                  onChange={() => setKeepCurrentRate(true)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="font-medium">
                  {t('changeRoom.keepCurrentRate', { rate: formatMoney(reservation.nightlyRate) })}
                </span>
              </label>

              <label
                className={`flex items-center gap-2 cursor-pointer ${
                  isManager ? 'text-slate-800' : 'text-slate-400 cursor-not-allowed opacity-60'
                }`}
              >
                <input
                  type="radio"
                  name="rateOption"
                  checked={!keepCurrentRate}
                  disabled={!isManager}
                  onChange={() => setKeepCurrentRate(false)}
                  className="w-4 h-4 text-blue-600 disabled:cursor-not-allowed"
                />
                <span className="font-medium">
                  {selectedRoom
                    ? t('changeRoom.useNewRate', { rate: formatMoney(selectedRoom.pricePerNight) })
                    : t('changeRoom.targetRoomRate')}
                  {!isManager && (
                    <span className="ml-1.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                      {t('changeRoom.managersOnly')}
                    </span>
                  )}
                </span>
              </label>
            </div>

            {/* Live Adjustment Calculation */}
            {!keepCurrentRate && selectedRoom && (
              <div className="pt-2 border-t border-slate-200 text-xs flex items-center justify-between">
                <span className="text-slate-600">
                  {t('changeRoom.rateDifference', { count: remainingNights })}
                </span>
                <span
                  className={`font-mono font-bold ${
                    adjustmentInfo.adjustmentAmount > 0
                      ? 'text-emerald-700'
                      : adjustmentInfo.adjustmentAmount < 0
                      ? 'text-blue-700'
                      : 'text-slate-700'
                  }`}
                >
                  {adjustmentInfo.adjustmentAmount > 0
                    ? t('changeRoom.diffCharge', { amount: formatMoney(adjustmentInfo.adjustmentAmount) })
                    : adjustmentInfo.adjustmentAmount < 0
                    ? t('changeRoom.diffCredit', { amount: formatMoney(Math.abs(adjustmentInfo.adjustmentAmount)) })
                    : t('changeRoom.noDifference')}
                </span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {errorMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedRoomId || validRooms.length === 0}
              className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? t('changeRoom.moving') : t('changeRoom.confirmBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
