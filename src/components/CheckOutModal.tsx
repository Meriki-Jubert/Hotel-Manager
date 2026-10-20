import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { Reservation, PaymentMethod } from '../types/hms';
import {
  X,
  LogOut,
  Receipt,
  CreditCard,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  User,
  Calendar,
  Building
} from 'lucide-react';

interface CheckOutModalProps {
  reservation: Reservation;
  onClose: () => void;
  onSuccess: () => void;
  onOpenFolio: () => void;
}

export const CheckOutModal: React.FC<CheckOutModalProps> = ({
  reservation,
  onClose,
  onSuccess,
  onOpenFolio
}) => {
  const { transactions, checkOutGuest, formatMoney } = useHMS();

  // Calculate charges & payments
  const resCharges = transactions.filter(
    (t) => t.reservationId === reservation.id && t.type === 'charge'
  );
  const resPayments = transactions.filter(
    (t) => t.reservationId === reservation.id && t.type === 'payment'
  );

  const totalCharges = resCharges.reduce((s, t) => s + t.amount, 0);
  const totalPaid = resPayments.reduce((s, t) => s + t.amount, 0);
  const remainingBalance = Math.max(0, totalCharges - totalPaid);

  const [settlementMethod, setSettlementMethod] = useState<PaymentMethod>('momo');
  const [keyReturned, setKeyReturned] = useState(true);
  const [minibarChecked, setMinibarChecked] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCheckout = () => {
    if (!keyReturned) {
      setErrorMsg('Please confirm physical room key/keycard return before checking out.');
      return;
    }

    const res = checkOutGuest(
      reservation.id,
      remainingBalance > 0 ? settlementMethod : undefined,
      remainingBalance > 0 ? remainingBalance : undefined
    );

    if (res.success) {
      onSuccess();
    } else {
      setErrorMsg(res.error || 'Failed to complete check out');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
        
        {/* Header - shrink-0 pinned at top */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Express Guest Check-Out</h2>
              <p className="text-xs text-slate-400">
                Folio Settlement & Room Status Turnover
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

        {errorMsg && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 text-xs text-rose-700 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        <div className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Guest Stay Brief */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <User className="w-4 h-4 text-emerald-600" />
                <span>{reservation.guestName}</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                  {reservation.bookingCode}
                </span>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-400" /> Room #{reservation.roomNumber}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {reservation.checkInDate} ➔ {reservation.checkOutDate} ({reservation.totalNights} nights)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenFolio}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-xs"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              <span>Full Folio</span>
            </button>
          </div>

          {/* Folio Financial Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Folio Financial Reconciliation
            </span>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Total Charges (Room + F&B + Services):</span>
                <span className="font-mono font-medium">{formatMoney(totalCharges)}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-700">
                <span>Total Payments & Deposits Received:</span>
                <span className="font-mono font-medium">-{formatMoney(totalPaid)}</span>
              </div>
              <div className="h-px bg-slate-200 my-1" />
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-900">Remaining Balance Due:</span>
                <span
                  className={`font-mono text-base ${
                    remainingBalance > 0 ? 'text-rose-600 font-extrabold' : 'text-emerald-600'
                  }`}
                >
                  {remainingBalance > 0 ? formatMoney(remainingBalance) : 'FULLY SETTLED (0 FCFA)'}
                </span>
              </div>
            </div>

            {/* Settlement payment selection if balance > 0 */}
            {remainingBalance > 0 && (
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Select Settlement Payment Method for Balance ({formatMoney(remainingBalance)}):
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {[
                    { id: 'momo', label: 'MTN MoMo' },
                    { id: 'orange_money', label: 'Orange Money' },
                    { id: 'cash', label: 'Cash' },
                    { id: 'card', label: 'Card' },
                    { id: 'bank_transfer', label: 'Transfer' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSettlementMethod(m.id as PaymentMethod)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        settlementMethod === m.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Front Desk Verification Checklist */}
          <div className="bg-amber-50/60 rounded-xl border border-amber-200 p-4 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-700" /> Front Desk Turnover Checklist
            </span>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={keyReturned}
                onChange={(e) => setKeyReturned(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span>Physical room key / electronic RFID keycard received and sanitized</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={minibarChecked}
                onChange={(e) => setMinibarChecked(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span>Minibar & room condition verified with housekeeping</span>
            </label>
          </div>

          {/* Notice of State Transition */}
          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <strong>System Action:</strong> Checking out this guest will mark Room #{reservation.roomNumber} as{' '}
            <span className="text-amber-700 font-bold">DIRTY</span> on the visual Room Matrix and automatically queue a cleaning task for Housekeeping.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCheckout}
              className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-md shadow-rose-700/20 flex items-center gap-2 transition-all hover:scale-[1.01]"
            >
              <LogOut className="w-4 h-4" />
              <span>Confirm Settlement & Check Out</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
