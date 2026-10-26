import React, { useState, useMemo } from 'react';
import { useHMS } from '../context/HMSContext';
import { Reservation } from '../types/hms';
import { calculateShortening } from '../utils/stayChanges';
import { addDaysToLocalDate, getLocalDateString } from '../utils/dateUtils';
import { useT } from '../i18n/LanguageContext';
import { MinusCircle, AlertTriangle, X, ShieldAlert } from 'lucide-react';

interface ShortenStayModalProps {
  reservation: Reservation;
  onClose: () => void;
}

export const ShortenStayModal: React.FC<ShortenStayModalProps> = ({ reservation, onClose }) => {
  const {
    shortenStay,
    formatMoney,
    currentUser,
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

  // New check-out must be at least one night after the branch's business date
  const minDate = addDaysToLocalDate(branchCurrentDate, 1);
  // And must be strictly before current check-out date
  const maxDate = addDaysToLocalDate(reservation.checkOutDate, -1);

  const canShorten = minDate <= maxDate;

  const [newCheckOutDate, setNewCheckOutDate] = useState<string>(canShorten ? minDate : '');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live calculation of removed nights and credit amount
  const shorteningInfo = useMemo(() => {
    return calculateShortening({
      nightlyRate: reservation.nightlyRate,
      currentCheckOut: reservation.checkOutDate,
      newCheckOut: newCheckOutDate
    });
  }, [reservation.nightlyRate, reservation.checkOutDate, newCheckOutDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isManager) {
      setErrorMessage(t('shortenStay.errUnauthorized'));
      return;
    }

    if (!reason || reason.trim().length < 5) {
      setErrorMessage(t('shortenStay.errReasonLength'));
      return;
    }

    if (shorteningInfo.removedNights <= 0) {
      setErrorMessage(t('shortenStay.errMustBeBefore'));
      return;
    }

    setIsSubmitting(true);
    const result = shortenStay(reservation.id, newCheckOutDate, reason.trim());
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setErrorMessage(result.error || t('shortenStay.errFail'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <MinusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">{t('shortenStay.title')}</h2>
              <p className="text-xs text-slate-400">
                {t('shortenStay.subtitle', { number: reservation.roomNumber, name: reservation.guestName })}
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
          {!isManager && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{t('shortenStay.unauthorized')}</span>
            </div>
          )}

          {!canShorten && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">{t('shortenStay.cannotShortenTitle')}</strong>
                <span>
                  {t('shortenStay.cannotShortenBody', { checkOut: reservation.checkOutDate, minDate, today: branchCurrentDate })}
                </span>
              </div>
            </div>
          )}

          {/* Current Reservation Info */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs grid grid-cols-2 gap-2 text-slate-700">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('shortenStay.currentDeparture')}</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{reservation.checkOutDate}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('shortenStay.nightlyRate')}</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">{formatMoney(reservation.nightlyRate)}</span>
            </div>
          </div>

          {/* New Check-Out Date Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t('shortenStay.newDeparture')}
            </label>
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={newCheckOutDate}
              onChange={(e) => {
                setNewCheckOutDate(e.target.value);
                setErrorMessage(null);
              }}
              disabled={!canShorten || !isManager}
              className="w-full text-sm font-semibold p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              {t('shortenStay.dateHint', { today: branchCurrentDate, checkOut: reservation.checkOutDate })}
            </p>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t('shortenStay.reasonLabel')}
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setErrorMessage(null);
              }}
              disabled={!canShorten || !isManager}
              placeholder={t('shortenStay.reasonPlaceholder')}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
              required
            />
          </div>

          {/* Live Calculation Preview */}
          {shorteningInfo.removedNights > 0 && (
            <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
                {t('shortenStay.previewHeading')}
              </span>
              <div className="flex items-center justify-between text-xs text-slate-700">
                <span>{t('shortenStay.nightsRemoved')}</span>
                <span className="font-mono font-bold text-slate-900">
                  {t('shortenStay.nightsRemovedCount', { count: shorteningInfo.removedNights, plural: shorteningInfo.removedNights === 1 ? '' : 's' })}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-700">
                <span>{t('shortenStay.creditAmount')}</span>
                <span className="font-mono font-bold text-blue-700 text-sm">
                  {formatMoney(shorteningInfo.creditAmount)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 italic pt-1 border-t border-amber-200">
                {t('shortenStay.voidNote')}
              </p>
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
              disabled={
                !canShorten ||
                !isManager ||
                isSubmitting ||
                shorteningInfo.removedNights <= 0 ||
                reason.trim().length < 5
              }
              className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? t('shortenStay.shortening') : t('shortenStay.confirmBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
