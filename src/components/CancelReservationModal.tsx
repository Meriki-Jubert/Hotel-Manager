import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { Reservation, PaymentMethod } from '../types/hms';
import {
  X,
  AlertTriangle,
  UserX,
  DollarSign,
  AlertCircle
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
  const { cancelReservation, transactions, formatMoney } = useHMS();

  const [isNoShow, setIsNoShow] = useState(initialIsNoShow);
  const [reason, setReason] = useState(
    initialIsNoShow ? 'Guest failed to arrive on the scheduled check-in date without notification' : ''
  );
  const [fee, setFee] = useState<number>(0);
  const [settlementChoice, setSettlementChoice] = useState<'refund' | 'credit'>('refund');
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('momo');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live calculation of deposit / payments received
  const reservationTxs = transactions.filter((t) => t.reservationId === reservation.id && !t.voided);
  const depositPaid = reservationTxs
    .filter((t) => t.type === 'payment' || t.category === 'payment' || t.category === 'deposit')
    .reduce((s, t) => s + t.amount, 0);

  const refundDue = depositPaid > fee ? depositPaid - fee : 0;
  const balanceDue = fee > depositPaid ? fee - depositPaid : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!reason.trim()) {
      setErrorMsg('A cancellation reason is strictly required.');
      return;
    }

    if (fee < 0) {
      setErrorMsg('Cancellation fee cannot be negative.');
      return;
    }

    if (fee > reservation.totalAmount) {
      setErrorMsg(`Cancellation fee cannot exceed original booking total (${formatMoney(reservation.totalAmount)}).`);
      return;
    }

    const res = cancelReservation(
      reservation.id,
      reason,
      fee,
      isNoShow,
      refundDue > 0 ? settlementChoice : undefined,
      refundDue > 0 && settlementChoice === 'refund' ? refundMethod : undefined
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
        {/* Header */}
        <div className="bg-rose-950 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-rose-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
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

        {/* Form Body */}
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
                Cancelling will release Room <strong>#{reservation.roomNumber}</strong> back to open inventory for these dates ({reservation.checkInDate} to {reservation.checkOutDate}). Full room charge will be voided.
              </span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isNoShow ? 'No-Show Explanation / Notes' : 'Cancellation Reason'}{' '}
              <span className="text-rose-500">* (Required)</span>
            </label>
            <textarea
              required
              rows={2}
              placeholder={
                isNoShow
                  ? 'Describe details (e.g. Phone unreachable, no arrival by midnight)...'
                  : 'Specify reason (e.g. Guest travel plans changed, emergency)...'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white resize-none"
            />
          </div>

          {/* Fee Input */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Cancellation / No-Show Fee Penalty
              </label>
              <span className="text-[10px] text-slate-500">Max: {formatMoney(reservation.totalAmount)}</span>
            </div>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                min={0}
                max={reservation.totalAmount}
                step={1000}
                value={fee}
                onChange={(e) => setFee(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900"
              />
            </div>
          </div>

          {/* Financial Summary & Settlement */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Folio Settlement & Refund Summary
            </span>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Deposit / Payments Paid:</span>
                <span className="font-mono font-bold text-emerald-700">{formatMoney(depositPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span>Applied Fee:</span>
                <span className="font-mono font-bold text-rose-700">{formatMoney(fee)}</span>
              </div>
              <div className="h-px bg-slate-200 my-1" />
              <div className="flex justify-between font-bold text-sm">
                <span className="text-slate-900">
                  {refundDue > 0 ? 'Refund Due to Guest:' : balanceDue > 0 ? 'Remaining Balance Due:' : 'Net Folio Balance:'}
                </span>
                <span
                  className={`font-mono ${
                    refundDue > 0 ? 'text-blue-600 font-extrabold' : balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {refundDue > 0 ? formatMoney(refundDue) : balanceDue > 0 ? formatMoney(balanceDue) : '0 FCFA (Fully Settled)'}
                </span>
              </div>
            </div>

            {refundDue > 0 && (
              <div className="pt-2 border-t border-slate-200 space-y-2.5">
                <span className="text-xs font-bold text-slate-700 block">
                  Select Refund / Credit Option:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettlementChoice('refund')}
                    className={`p-2.5 rounded-lg border text-xs font-bold text-left transition-all ${
                      settlementChoice === 'refund'
                        ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>Refund Now</div>
                    <span className="text-[10px] font-normal text-slate-500 block">Issue immediate refund</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettlementChoice('credit')}
                    className={`p-2.5 rounded-lg border text-xs font-bold text-left transition-all ${
                      settlementChoice === 'credit'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>Keep as Credit</div>
                    <span className="text-[10px] font-normal text-slate-500 block">Save deposit as guest credit</span>
                  </button>
                </div>

                {settlementChoice === 'refund' && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Refund Payout Channel:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'cash', label: 'Cash' },
                        { id: 'momo', label: 'MTN MoMo' },
                        { id: 'orange_money', label: 'Orange Money' }
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setRefundMethod(m.id as PaymentMethod)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            refundMethod === m.id
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {balanceDue > 0 && (
              <p className="text-[11px] text-rose-700 font-semibold pt-1">
                The remaining balance of {formatMoney(balanceDue)} will stay visible on the guest folio for collection.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
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
