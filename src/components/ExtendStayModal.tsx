import React, { useState, useMemo } from 'react';
import { useHMS } from '../context/HMSContext';
import { Reservation } from '../types/hms';
import { calculateExtension } from '../utils/stayChanges';
import { checkAvailability } from '../utils/availability';
import { getNextLocalDateString } from '../utils/dateUtils';
import { useT } from '../i18n/LanguageContext';
import { PlusCircle, AlertCircle, X, Check } from 'lucide-react';

interface ExtendStayModalProps {
  reservation: Reservation;
  onClose: () => void;
}

export const ExtendStayModal: React.FC<ExtendStayModalProps> = ({ reservation, onClose }) => {
  const {
    extendStay,
    formatMoney,
    allRooms,
    allReservations,
    branches
  } = useHMS();
  const { t } = useT();

  const minDate = getNextLocalDateString(reservation.checkOutDate);
  const [newCheckOutDate, setNewCheckOutDate] = useState<string>(minDate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const targetBranchId = reservation.branchId || branches[0]?.id || '';
  const currentRoom = allRooms.find((r) => r.id === reservation.roomId);

  // Live calculation of nights and cost
  const extensionInfo = useMemo(() => {
    return calculateExtension({
      nightlyRate: reservation.nightlyRate,
      currentCheckOut: reservation.checkOutDate,
      newCheckOut: newCheckOutDate
    });
  }, [reservation.nightlyRate, reservation.checkOutDate, newCheckOutDate]);

  // Live availability check for the new nights
  const availabilityStatus = useMemo(() => {
    if (!currentRoom || extensionInfo.addedNights <= 0) {
      return { available: false, reason: t('extendStay.errMustBeAfter') };
    }

    const branchRooms = allRooms.filter(
      (r) => (r.branchId || branches[0]?.id) === targetBranchId
    );
    const branchReservations = allReservations.filter(
      (res) => (res.branchId || branches[0]?.id) === targetBranchId
    );

    return checkAvailability({
      branchId: targetBranchId,
      roomTypeId: currentRoom.roomTypeId,
      checkInDate: reservation.checkOutDate,
      checkOutDate: newCheckOutDate,
      rooms: branchRooms,
      reservations: branchReservations,
      excludeReservationId: reservation.id,
      requestedRoomId: currentRoom.id
    });
  }, [
    currentRoom,
    extensionInfo.addedNights,
    allRooms,
    allReservations,
    targetBranchId,
    reservation.checkOutDate,
    reservation.id,
    newCheckOutDate,
    branches,
    t
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (extensionInfo.addedNights <= 0) {
      setErrorMessage(t('extendStay.errMustBeAfter'));
      return;
    }

    if (!availabilityStatus.available) {
      setErrorMessage(availabilityStatus.reason || t('extendStay.errNotAvailable'));
      return;
    }

    setIsSubmitting(true);
    const result = extendStay(reservation.id, newCheckOutDate);
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setErrorMessage(result.error || t('extendStay.errFail'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">{t('extendStay.title')}</h2>
              <p className="text-xs text-slate-400">
                {t('extendStay.subtitle', { number: reservation.roomNumber, name: reservation.guestName })}
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Current Reservation Info */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs grid grid-cols-2 gap-2 text-slate-700">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('extendStay.currentDeparture')}</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{reservation.checkOutDate}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('extendStay.nightlyRate')}</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">{formatMoney(reservation.nightlyRate)}</span>
            </div>
          </div>

          {/* New Check-Out Date Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t('extendStay.newCheckOut')}
            </label>
            <div className="relative">
              <input
                type="date"
                min={minDate}
                value={newCheckOutDate}
                onChange={(e) => {
                  setNewCheckOutDate(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full text-sm font-semibold p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {t('extendStay.selectDateHint', { date: reservation.checkOutDate })}
            </p>
          </div>

          {/* Live Calculation Preview */}
          <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
              {t('extendStay.previewHeading')}
            </span>
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span>{t('extendStay.addedNights')}</span>
              <span className="font-mono font-bold text-slate-900">
                {t('extendStay.nightsCount', { count: extensionInfo.addedNights, plural: extensionInfo.addedNights === 1 ? '' : 's' })}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span>{t('extendStay.additionalCharges')}</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                +{formatMoney(extensionInfo.addedAmount)}
              </span>
            </div>
          </div>

          {/* Availability Status / Reason */}
          {!availabilityStatus.available && extensionInfo.addedNights > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">{t('extendStay.notAvailableTitle')}</strong>
                <span>{availabilityStatus.reason || t('extendStay.notAvailableDefault')}</span>
              </div>
            </div>
          )}

          {availabilityStatus.available && extensionInfo.addedNights > 0 && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t('extendStay.availableSuccess', { number: reservation.roomNumber })}</span>
            </div>
          )}

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
              disabled={isSubmitting || extensionInfo.addedNights <= 0 || !availabilityStatus.available}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? t('extendStay.extending') : t('extendStay.confirmBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
