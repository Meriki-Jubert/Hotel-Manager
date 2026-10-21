import React, { useState, useMemo, useEffect } from 'react';
import { useHMS } from '../context/HMSContext';
import { Reservation, PaymentMethod } from '../types/hms';
import { calculateCancellationFee, CancellationFeeResult } from '../utils/cancellationPolicy';
import { X, AlertTriangle, DollarSign, FileText } from 'lucide-react';

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

  const policyResult: CancellationFeeResult = useMemo(
    () => calculateCancellationFee({
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (needsWaiver && !isManager) {
      setErrorMsg('Only managers can override cancellation fees.');
      return;
    }
    if (needsWaiver && (!waiverReason || waiverReason.trim().length < 5)) {
      setErrorMsg('A valid reason (min 5 characters) is required for fee overrides.');
      return;
    }

    const res = cancelReservation(
      reservation.id,
      reason,
      fee,
      isNoShow,
      settlement,
      paymentMethod,
      needsWaiver ? {
        suggestedFee: policyResult.suggestedFee,
        policyRuleText: policyResult.ruleText,
        feeOverrideReason: waiverReason
      } : {
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
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Cancel Reservation {reservation.bookingCode}</h2>
          <button type="button" onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {errorMsg && <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg">{errorMsg}</div>}

        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isNoShow} onChange={(e) => setIsNoShow(e.target.checked)} />
            Mark as No-Show
          </label>

          <div className="p-4 bg-slate-50 rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span>Suggested Fee ({policyResult.ruleText}):</span>
              <span className="font-bold">{formatMoney(policyResult.suggestedFee)}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <input
                type="number"
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                className="w-full p-2 border rounded-lg text-sm"
              />
            </div>
          </div>

          {needsWaiver && (
            <textarea
              placeholder="Reason for fee override..."
              value={waiverReason}
              onChange={(e) => setWaiverReason(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm"
            />
          )}

          <textarea
            required
            placeholder="Cancellation reason..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2 border rounded-lg text-sm"
          />

          <select value={settlement} onChange={(e) => setSettlement(e.target.value as 'refund' | 'credit')} className="w-full p-2 border rounded-lg text-sm">
            <option value="refund">Refund now</option>
            <option value="credit">Keep as credit</option>
          </select>
          
          {settlement === 'refund' && (
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="w-full p-2 border rounded-lg text-sm">
              <option value="cash">Cash</option>
              <option value="momo">MTN MoMo</option>
              <option value="orange_money">Orange Money</option>
            </select>
          )}

          <button type="submit" className="w-full p-3 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700">Confirm Cancellation</button>
        </div>
      </form>
    </div>
  );
};
