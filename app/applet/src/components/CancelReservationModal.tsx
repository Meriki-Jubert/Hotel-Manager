import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { Reservation, PaymentMethod } from '../types/hms';
import {
  X,
  AlertTriangle,
  UserX,
  DollarSign,
  FileText,
  AlertCircle,
  CreditCard
} from 'lucide-react';

interface CancelReservationModalProps {
  reservation: Reservation;
  initialIsNoShow?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CancelReservationModal: React.FC<CancelReservationModalProps> = ({
  reservation,
  initialIsNoShow = false,
  onClose,
  onSuccess
}) => {
  const { cancelReservation, formatMoney, transactions } = useHMS();
  const [isNoShow, setIsNoShow] = useState(initialIsNoShow);
  const [reason, setReason] = useState(
    initialIsNoShow ? 'Guest failed to arrive on the scheduled check-in date without notification' : ''
  );
  const [fee, setFee] = useState<number>(0);
  const [settlementChoice, setSettlementChoice] = useState<'refund' | 'credit'>('refund');
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('cash');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Calculate deposit / payments paid for this reservation
  const reservationTransactions = transactions.filter(
    (t) => t.reservationId === reservation.id && !t.voided
  );
  const totalPaymentsPaid = reservationTransactions
    .filter((t) => t.type === 'payment' || t.category === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = fee - totalPaymentsPaid; // if negative, refund is due. if positive, balance due.

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!reason.trim()) {
      setErrorMsg('A cancellation reason is strictly required.');
      return;
    }

    const res = cancelReservation(
      reservation.id,
      reason,
      fee,
      isNoShow,
      settlementChoice,
      refundMethod
    );
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to cancel reservation.');
      return;
    }
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
        {/* Header - shrink-0 pinned at top */}
        <div className="bg-rose-950 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-rose-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                {isNoShow ? 'Record Guest No-Show' : 'Cancel Reservation'}
              </h2>
              <p className="text-xs text-rose-200 font-mono">
                {reservation.bookingCode} • {reservation.guestName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-300 hover:text-white hover:bg-rose-900 transition-colors cursor-pointer"
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

          {/* Toggle Type */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setIsNoShow(false);
                setReason('');
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                !isNoShow ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Standard Cancellation
            </button>
            <button
              type="button"
              onClick={() => {
                setIsNoShow(true);
                setReason('Guest failed to arrive on the scheduled check-in date without notification');
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                isNoShow ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Mark as No-Show
            </button>
          </div>

          {/* Warning banner */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span>
                Cancelling will release Room <strong>#{reservation.roomNumber}</strong> back to open inventory for these dates ({reservation.checkInDate} to {reservation.checkOutDate}).
              </span>
            </div>
          </div>

          {/* Cancellation Reason (REQUIRED) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isNoShow ? 'No-Show Explanation / Notes' : 'Cancellation Reason'}{' '}
              <span className="text-rose-500">* (Required)</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder={
                isNoShow
                  ? 'Describe details (e.g. Phone unreachable, no arrival by midnight)...'
                  : 'Specify reason (e.g. Guest travel plans changed, emergency, weather)...'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white resize-none text-slate-900"
            />
          </div>

          {/* Optional Fee & Accounting Summary */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Cancellation / Penalty Fee
              </label>
              <span className="text-[10px] text-slate-500 font-mono">Original Room Charge: {formatMoney(reservation.totalAmount)}</span>
            </div>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                min={0}
                step={1000}
                value={fee}
                onChange={(e) => setFee(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900"
              />
            </div>

            {/* Accounting Settlement Summary */}
            <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Deposit / Payments Paid:</span>
                <span className="font-mono font-bold text-emerald-700">{formatMoney(totalPaymentsPaid)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Cancellation Fee:</span>
                <span className="font-mono font-bold text-rose-700">{formatMoney(fee)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                <span>
                  {netBalance < 0 ? 'Refund Due to Guest:' : netBalance > 0 ? 'Remaining Balance Due:' : 'Net Folio Balance:'}
                </span>
                <span className={`font-mono ${netBalance < 0 ? 'text-emerald-700' : netBalance > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                  {formatMoney(Math.abs(netBalance))} {netBalance < 0 ? '(Refund)' : netBalance > 0 ? '(Due)' : ''}
                </span>
              </div>
            </div>

            {netBalance < 0 && (
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Select Settlement for Excess Deposit ({formatMoney(Math.abs(netBalance))})
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettlementChoice('refund')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      settlementChoice === 'refund'
                        ? 'bg-rose-50 border-rose-500 text-rose-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold">Refund Now</div>
                    <div className="text-[10px] text-slate-500 font-normal">Issue cash/MoMo refund immediately</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettlementChoice('credit')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      settlementChoice === 'credit'
                        ? 'bg-rose-50 border-rose-500 text-rose-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold">Keep as Credit</div>
                    <div className="text-[10px] text-slate-500 font-normal">Retain deposit as guest profile credit</div>
                  </button>
                </div>

                {settlementChoice === 'refund' && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Refund Payout Channel
                    </label>
                    <select
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-semibold text-slate-900"
                    >
                      <option value="cash">Cash Refund</option>
                      <option value="momo">MTN Mobile Money (MoMo)</option>
                      <option value="orange_money">Orange Money</option>
                      <option value="card">Bank Card / POS</option>
                      <option value="bank_transfer">Bank Wire Transfer</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Keep Booking
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UserX className="w-4 h-4" />
              <span>Confirm {isNoShow ? 'No-Show' : 'Cancellation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
