import React, { useState, useMemo, useEffect } from 'react';
import { useHMS } from '../context/HMSContext';
import { Reservation, PaymentMethod } from '../types/hms';
import { calculateCancellationFee, CancellationFeeResult } from '../utils/cancellationPolicy';
import { getFolioTotals } from '../utils/folio';
import {
  X,
  AlertTriangle,
  AlertCircle,
  DollarSign,
  User,
  Calendar,
  CreditCard,
  Ban,
  ShieldAlert
} from 'lucide-react';

interface CancelReservationModalProps {
  reservation: Reservation;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CancelReservationModal: React.FC<CancelReservationModalProps> = ({
  reservation,
  onClose,
  onSuccess
}) => {
  const {
    cancelReservation,
    hotelConfig,
    currentUser,
    allTransactions,
    businessDate,
    formatMoney
  } = useHMS();

  const [isNoShow, setIsNoShow] = useState(false);
  const [fee, setFee] = useState(0);
  const [reason, setReason] = useState('');
  const [waiverReason, setWaiverReason] = useState('');
  const [settlement, setSettlement] = useState<'refund' | 'credit'>('refund');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Financial calculations
  const folioTotals = getFolioTotals(allTransactions, reservation.id);
  const totalDepositPaid = folioTotals.netPaid !== 0 || folioTotals.charges > 0
    ? folioTotals.netPaid
    : reservation.amountPaid;

  const policyResult: CancellationFeeResult = useMemo(
    () =>
      calculateCancellationFee({
        policy: hotelConfig.cancellationPolicy!,
        booking: reservation,
        businessDate,
        isNoShow
      }),
    [hotelConfig.cancellationPolicy, reservation, businessDate, isNoShow]
  );

  useEffect(() => {
    setFee(policyResult.suggestedFee);
  }, [policyResult]);

  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'owner';
  const needsWaiver = fee < policyResult.suggestedFee;
  const refundDue = Math.max(0, totalDepositPaid - fee);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!reason.trim()) {
      setErrorMsg('A cancellation reason is required.');
      return;
    }

    if (needsWaiver && !isManager) {
      setErrorMsg('Only managers and owners can override cancellation fees.');
      return;
    }

    if (needsWaiver && (!waiverReason || waiverReason.trim().length < 5)) {
      setErrorMsg('A valid reason of at least 5 characters is required for fee overrides.');
      return;
    }

    setSubmitting(true);
    try {
      const res = cancelReservation(
        reservation.id,
        reason.trim(),
        fee,
        isNoShow,
        settlement,
        paymentMethod,
        needsWaiver
          ? {
              suggestedFee: policyResult.suggestedFee,
              policyRuleText: policyResult.ruleText,
              feeOverrideReason: waiverReason.trim()
            }
          : {
              suggestedFee: policyResult.suggestedFee,
              policyRuleText: policyResult.ruleText
            }
      );

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to cancel reservation.');
        return;
      }

      if (onSuccess) onSuccess();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 text-slate-900">
        
        {/* Header - pinned at top */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Cancel Reservation</span>
                <span className="font-mono text-xs font-normal text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60">
                  {reservation.bookingCode}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Fee calculation, folio settlement, and room inventory release
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification banner */}
        {errorMsg && (
          <div className="bg-rose-50 border-b border-rose-200 px-5 py-3 text-xs text-rose-800 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Form Body - scrollable */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 text-slate-900">
          
          {/* Guest Stay Brief */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <User className="w-4 h-4 text-slate-600" />
                <span>{reservation.guestName}</span>
              </div>
              {reservation.rateType === 'non_refundable' && (
                <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full border border-rose-200">
                  Non-refundable Rate
                </span>
              )}
            </div>

            <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {reservation.checkInDate} ➔ {reservation.checkOutDate} ({reservation.totalNights} night{reservation.totalNights === 1 ? '' : 's'})
              </span>
              <span className="text-slate-400">•</span>
              <span>
                Room: <strong className="text-slate-800">#{reservation.roomNumber}</strong>
              </span>
              <span className="text-slate-400">•</span>
              <span>
                Stay Cost: <strong className="text-slate-900 font-mono">{formatMoney(reservation.totalAmount)}</strong>
              </span>
              <span className="text-slate-400">•</span>
              <span>
                Paid: <strong className="text-emerald-700 font-mono">{formatMoney(totalDepositPaid)}</strong>
              </span>
            </div>
          </div>

          {/* Mark as No-Show Toggle */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <label htmlFor="noShowCheckbox" className="text-xs font-bold text-slate-900 cursor-pointer block">
                Mark Booking as No-Show
              </label>
              <p className="text-[11px] text-slate-600">
                Check this if the guest did not arrive on their check-in date
              </p>
            </div>
            <input
              type="checkbox"
              id="noShowCheckbox"
              checked={isNoShow}
              onChange={(e) => setIsNoShow(e.target.checked)}
              className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
            />
          </div>

          {/* Suggested Fee & Policy Rule Display */}
          <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-900 tracking-wider block">
                  Applicable Cancellation Policy
                </span>
                <p className="text-xs font-semibold text-slate-900 mt-0.5">
                  {policyResult.ruleText}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-amber-900 tracking-wider block">
                  Suggested Fee
                </span>
                <span className="text-base font-mono font-bold text-rose-700">
                  {formatMoney(policyResult.suggestedFee)}
                </span>
              </div>
            </div>

            {/* Fee to Charge Input */}
            <div className="pt-2 border-t border-amber-200/80">
              <label htmlFor="cancellationFeeInput" className="block text-xs font-bold text-slate-800 mb-1">
                Fee to Charge Guest ({hotelConfig.defaultCurrency}) <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <DollarSign className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  id="cancellationFeeInput"
                  min={0}
                  max={reservation.totalAmount}
                  value={fee}
                  onChange={(e) => setFee(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full pl-9 pr-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Max fee is capped at the total booking stay amount ({formatMoney(reservation.totalAmount)}).
              </p>
            </div>
          </div>

          {/* Fee Override Section (Visible only when fee < suggested fee) */}
          {needsWaiver && (
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Manager Fee Override Required</span>
              </div>
              <p className="text-[11px] text-rose-700">
                You are charging {formatMoney(fee)}, which is less than the suggested fee of {formatMoney(policyResult.suggestedFee)}.
                {!isManager && (
                  <strong className="block text-rose-900 mt-1">
                    Warning: Only Manager and Owner roles can authorize this fee reduction.
                  </strong>
                )}
              </p>
              <div>
                <label htmlFor="waiverReasonInput" className="block text-xs font-bold text-slate-800 mb-1">
                  Override Justification (Min. 5 characters) <span className="text-rose-600">*</span>
                </label>
                <textarea
                  id="waiverReasonInput"
                  rows={2}
                  required
                  placeholder="e.g. Documented medical emergency approved by manager..."
                  value={waiverReason}
                  onChange={(e) => setWaiverReason(e.target.value)}
                  className="w-full p-2.5 bg-white text-slate-900 border border-rose-300 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none font-medium"
                />
              </div>
            </div>
          )}

          {/* Cancellation Reason */}
          <div>
            <label htmlFor="cancellationReasonInput" className="block text-xs font-bold text-slate-800 mb-1">
              Cancellation Reason / Front Desk Notes <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="cancellationReasonInput"
              rows={2}
              required
              placeholder="e.g. Guest called to cancel due to flight schedule change..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none font-medium"
            />
          </div>

          {/* Settlement Options (When guest paid more than the fee) */}
          {totalDepositPaid > fee ? (
            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-900 tracking-wider block">
                    Deposit Balance Resolution
                  </span>
                  <span className="text-xs text-slate-700 font-medium">
                    Guest paid {formatMoney(totalDepositPaid)} — Fee {formatMoney(fee)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-900 tracking-wider block">
                    Net Return to Guest
                  </span>
                  <span className="text-sm font-mono font-bold text-emerald-700">
                    {formatMoney(refundDue)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label htmlFor="settlementSelect" className="block text-xs font-bold text-slate-800 mb-1">
                    Settlement Option
                  </label>
                  <select
                    id="settlementSelect"
                    value={settlement}
                    onChange={(e) => setSettlement(e.target.value as 'refund' | 'credit')}
                    className="w-full p-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="refund">Issue Immediate Refund</option>
                    <option value="credit">Keep as Guest Credit</option>
                  </select>
                </div>

                {settlement === 'refund' && (
                  <div>
                    <label htmlFor="refundMethodSelect" className="block text-xs font-bold text-slate-800 mb-1">
                      Refund Payment Channel
                    </label>
                    <select
                      id="refundMethodSelect"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full p-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="cash">Cash (Front Desk)</option>
                      <option value="momo">MTN Mobile Money</option>
                      <option value="orange_money">Orange Money</option>
                      <option value="credit_card">Credit / Debit Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span>Deposit Balance:</span>
              <span className="font-mono font-semibold text-slate-800">
                {totalDepositPaid === 0 ? 'No advance deposit paid' : `Deposit (${formatMoney(totalDepositPaid)}) applied toward cancellation fee`}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Ban className="w-4 h-4" />
              <span>{submitting ? 'Processing...' : 'Confirm Cancellation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
