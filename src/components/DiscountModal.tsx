import React, { useState, useMemo } from 'react';
import { useHMS } from '../context/HMSContext';
import { Reservation } from '../types/hms';
import { calculateDiscount } from '../utils/folioAdjustments';
import { Tag, X, AlertCircle, Percent, DollarSign, Check } from 'lucide-react';

interface DiscountModalProps {
  reservation: Reservation;
  chargesTotal: number;
  onClose: () => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({
  reservation,
  chargesTotal,
  onClose
}) => {
  const { applyDiscount, formatMoney } = useHMS();

  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState<number>(10);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live calculation
  const { discountAmount } = useMemo(() => {
    return calculateDiscount({
      type: discountType,
      value: Number(value),
      chargesTotal
    });
  }, [discountType, value, chargesTotal]);

  const newChargesTotal = Math.max(0, chargesTotal - discountAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (chargesTotal <= 0) {
      setErrorMsg('Cannot apply discount: folio has no active charges.');
      return;
    }

    if (!reason || reason.trim().length < 5) {
      setErrorMsg('Reason must be at least 5 characters long.');
      return;
    }

    if (discountAmount <= 0) {
      setErrorMsg('Please specify a valid discount amount greater than zero.');
      return;
    }

    if (chargesTotal - discountAmount < 0) {
      setErrorMsg('Discount cannot exceed the total folio charges.');
      return;
    }

    setIsSubmitting(true);
    const result = applyDiscount(reservation.id, discountType, Number(value), reason.trim());
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setErrorMsg(result.error || 'Failed to apply discount.');
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Managerial Discount</h2>
              <p className="text-xs text-slate-400">
                Folio #{reservation.bookingCode} • Room #{reservation.roomNumber}
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Type Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Discount Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setDiscountType('percent');
                  setValue(10);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  discountType === 'percent'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>Percentage (%)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiscountType('fixed');
                  setValue(5000);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  discountType === 'fixed'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Fixed Amount (FCFA)</span>
              </button>
            </div>
          </div>

          {/* Value Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {discountType === 'percent' ? 'Discount Percentage (%)' : 'Discount Amount (FCFA)'}
            </label>
            <input
              type="number"
              min={discountType === 'percent' ? 1 : 500}
              max={discountType === 'percent' ? 100 : chargesTotal}
              step={discountType === 'percent' ? 1 : 500}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-full text-sm font-semibold p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              required
            />
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Reason for Discount <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. VIP goodwill gesture / AC issue compensation (min 5 chars)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">Minimum 5 characters. Audited in staff log.</p>
          </div>

          {/* Live Preview */}
          <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-2 text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block">
              Folio Impact Preview
            </span>
            <div className="flex justify-between items-center text-slate-700">
              <span>Current Total Charges:</span>
              <span className="font-mono font-medium">{formatMoney(chargesTotal)}</span>
            </div>
            <div className="flex justify-between items-center text-amber-900 font-semibold">
              <span>Discount Amount:</span>
              <span className="font-mono text-sm font-bold">-{formatMoney(discountAmount)}</span>
            </div>
            <div className="h-px bg-amber-200 my-1" />
            <div className="flex justify-between items-center font-bold text-slate-900">
              <span>New Total Charges:</span>
              <span className="font-mono text-emerald-700 text-sm">{formatMoney(newChargesTotal)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || discountAmount <= 0 || reason.trim().length < 5}
              className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-slate-950 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Applying...' : 'Apply Discount'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
