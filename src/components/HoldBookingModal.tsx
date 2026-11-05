import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { Reservation } from '../types/hms';
import { useT } from '../i18n/LanguageContext';
import { resultMessage } from '../i18n/messages';
import { getHotelNow } from '../utils/hotelClock';
import { X, ShieldAlert, Calendar, Clock, User, Bookmark } from 'lucide-react';

interface HoldBookingModalProps {
  reservation: Reservation;
  onClose: () => void;
  onSuccess?: () => void;
}

export const HoldBookingModal: React.FC<HoldBookingModalProps> = ({
  reservation,
  onClose,
  onSuccess
}) => {
  const { t, formatDate } = useT();
  const { hotelConfig, holdReservation } = useHMS();
  const hotelNow = getHotelNow(hotelConfig.timeZone || 'Africa/Douala');

  // Default to today or reservation arrival date (whichever is later)
  const initialDate = reservation.checkInDate > hotelNow.date ? reservation.checkInDate : hotelNow.date;
  const initialTime = hotelConfig.autoNoShow?.cutoffTime || '23:59';

  const [date, setDate] = useState<string>(reservation.holdUntil?.date || initialDate);
  const [time, setTime] = useState<string>(reservation.holdUntil?.time || initialTime);
  const [reason, setReason] = useState<string>(reservation.holdUntil?.reason || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation: moment must be in future
    if (date < hotelNow.date || (date === hotelNow.date && time <= hotelNow.time)) {
      setError(t('err.hold.mustBeFuture'));
      return;
    }

    setIsSubmitting(true);
    const res = holdReservation(reservation.id, date, time, reason.trim() || undefined);
    setIsSubmitting(false);

    if (!res.success) {
      setError(resultMessage(t, res, 'err.hold.onlyReserved'));
      return;
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-slate-900 animate-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">{t('hold.title')}</h3>
              <p className="text-[11px] text-slate-400">
                {reservation.bookingCode} • #{reservation.roomNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-medium">
              {error}
            </div>
          )}

          {/* Reservation Summary */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {reservation.guestName}
              </span>
              <span className="font-mono text-slate-600">{reservation.guestPhone}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Arrival: {formatDate(reservation.checkInDate)}</span>
              <span>Departure: {formatDate(reservation.checkOutDate)}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            {t('hold.desc')}
          </p>

          {/* Hold Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {t('hold.date')}
              </label>
              <input
                type="date"
                value={date}
                min={hotelNow.date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {t('hold.time')}
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          {/* Optional Reason */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {t('hold.reason')}
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('hold.reasonPlaceholder')}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              {t('hold.confirmBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
