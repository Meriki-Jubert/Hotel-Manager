import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { Reservation } from '../types/hms';
import { useT } from '../i18n/LanguageContext';
import { resultMessage } from '../i18n/messages';
import { X, RotateCcw, AlertTriangle, User, Calendar, DollarSign } from 'lucide-react';

interface ReinstateNoShowModalProps {
  reservation: Reservation;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReinstateNoShowModal: React.FC<ReinstateNoShowModalProps> = ({
  reservation,
  onClose,
  onSuccess
}) => {
  const { t, formatDate } = useT();
  const { reinstateNoShow, formatMoney } = useHMS();

  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (reason.trim().length < 5) {
      setError(t('err.reinstate.reasonMinLength'));
      return;
    }

    setIsSubmitting(true);
    const res = reinstateNoShow(reservation.id, reason.trim());
    setIsSubmitting(false);

    if (!res.success) {
      setError(resultMessage(t, res, 'err.reinstate.roomNotAvailable'));
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
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">{t('reinstate.title')}</h3>
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
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Reservation Summary */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {reservation.guestName}
              </span>
              <span className="font-mono text-slate-600">#{reservation.roomNumber}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>{formatDate(reservation.checkInDate)} → {formatDate(reservation.checkOutDate)}</span>
              {typeof reservation.cancellationFee === 'number' && (
                <span className="font-semibold text-rose-600">
                  Fee: {formatMoney(reservation.cancellationFee)}
                </span>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            {t('reinstate.desc')}
          </p>

          {/* Reason Input */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {t('reinstate.reason')}
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('reinstate.reasonPlaceholder')}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              required
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
              disabled={isSubmitting || reason.trim().length < 5}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? t('reinstate.checkingAvailability') : t('reinstate.confirmBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
