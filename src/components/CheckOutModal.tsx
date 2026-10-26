import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { Reservation, PaymentMethod } from '../types/hms';
import { validateSplitPayment } from '../utils/folioAdjustments';
import { useT } from '../i18n/LanguageContext';
import { tPaymentMethod } from '../i18n/labels';
import {
  X,
  LogOut,
  Receipt,
  KeyRound,
  AlertCircle,
  User,
  Calendar,
  Building,
  Split,
  PlusCircle,
  Trash2
} from 'lucide-react';

import { getFolioTotals } from '../utils/folio';

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
  const { t } = useT();

  // Calculate charges & payments using shared getFolioTotals
  const totals = getFolioTotals(transactions, reservation.id);
  const totalCharges = totals.charges;
  const totalPaid = totals.netPaid;
  const remainingBalance = Math.max(0, totals.balance);

  const [settlementMethod, setSettlementMethod] = useState<PaymentMethod>('momo');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitLines, setSplitLines] = useState<Array<{ id: string; method: PaymentMethod; amount: number }>>(() => {
    const half = Math.round(remainingBalance / 2);
    return [
      { id: '1', method: 'momo', amount: half },
      { id: '2', method: 'cash', amount: remainingBalance - half }
    ];
  });
  const [keyReturned, setKeyReturned] = useState(true);
  const [minibarChecked, setMinibarChecked] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddSplitLine = () => {
    setSplitLines((prev) => [
      ...prev,
      { id: String(Date.now() + Math.random()), method: 'cash', amount: 0 }
    ]);
  };

  const handleRemoveSplitLine = (id: string) => {
    if (splitLines.length <= 1) return;
    setSplitLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleUpdateSplitLine = (id: string, field: 'method' | 'amount', val: any) => {
    setSplitLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: val } : l))
    );
  };

  const handleCheckout = () => {
    setErrorMsg(null);
    if (!keyReturned) {
      setErrorMsg(t('checkOut.errKeyRequired'));
      return;
    }

    if (remainingBalance > 0 && isSplitPayment) {
      const validation = validateSplitPayment({
        totalAmount: remainingBalance,
        lines: splitLines.map((l) => ({ method: l.method, amount: Number(l.amount) }))
      });

      if (!validation.valid) {
        setErrorMsg(validation.error || t('checkOut.errSplitConfig'));
        return;
      }

      const res = checkOutGuest(
        reservation.id,
        undefined,
        remainingBalance,
        splitLines.map((l) => ({ method: l.method, amount: Number(l.amount) }))
      );

      if (res.success) {
        onSuccess();
      } else {
        setErrorMsg(res.error || t('checkOut.errFail'));
      }
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
      setErrorMsg(res.error || t('checkOut.errFail'));
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
              <h2 className="text-base sm:text-lg font-bold">{t('checkOut.title')}</h2>
              <p className="text-xs text-slate-400">
                {t('checkOut.subtitle')}
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
                  {reservation.checkInDate} ➔ {reservation.checkOutDate} ({t('checkOut.nightsCount', { count: reservation.totalNights })})
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenFolio}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-xs"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('checkOut.fullFolio')}</span>
            </button>
          </div>

          {/* Folio Financial Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('checkOut.reconciliationTitle')}
            </span>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>{t('checkOut.totalCharges')}</span>
                <span className="font-mono font-medium">{formatMoney(totalCharges)}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-700">
                <span>{t('checkOut.totalPayments')}</span>
                <span className="font-mono font-medium">-{formatMoney(totalPaid)}</span>
              </div>
              <div className="h-px bg-slate-200 my-1" />
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-900">{t('checkOut.remainingBalance')}</span>
                <span
                  className={`font-mono text-base ${
                    remainingBalance > 0 ? 'text-rose-600 font-extrabold' : 'text-emerald-600'
                  }`}
                >
                  {remainingBalance > 0 ? formatMoney(remainingBalance) : t('checkOut.fullySettled')}
                </span>
              </div>
            </div>

            {/* Settlement payment selection if balance > 0 */}
            {remainingBalance > 0 && (
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    {t('checkOut.settlementForBalance', { amount: formatMoney(remainingBalance) })}
                  </label>
                  <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSplitPayment(false);
                        setErrorMsg(null);
                      }}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        !isSplitPayment
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t('checkOut.singlePayment')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSplitPayment(true);
                        setErrorMsg(null);
                        const half = Math.round(remainingBalance / 2);
                        setSplitLines([
                          { id: '1', method: 'momo', amount: half },
                          { id: '2', method: 'cash', amount: remainingBalance - half }
                        ]);
                      }}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                        isSplitPayment
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Split className="w-3.5 h-3.5" />
                      <span>{t('checkOut.splitPayment')}</span>
                    </button>
                  </div>
                </div>

                {!isSplitPayment ? (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {[
                      { id: 'momo', label: tPaymentMethod(t, 'momo') },
                      { id: 'orange_money', label: tPaymentMethod(t, 'orange_money') },
                      { id: 'cash', label: tPaymentMethod(t, 'cash') },
                      { id: 'card', label: tPaymentMethod(t, 'card') },
                      { id: 'bank_transfer', label: tPaymentMethod(t, 'bank_transfer') }
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
                ) : (
                  <div className="space-y-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">
                        {t('checkOut.splitAllocation', { count: splitLines.length })}
                      </span>
                      <button
                        type="button"
                        onClick={handleAddSplitLine}
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>{t('checkOut.addMethod')}</span>
                      </button>
                    </div>

                    {splitLines.map((line, idx) => (
                      <div key={line.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-300">
                        <span className="text-[10px] font-bold text-slate-400 w-5">#{idx + 1}</span>
                        <div className="flex-1">
                          <select
                            value={line.method}
                            onChange={(e) => handleUpdateSplitLine(line.id, 'method', e.target.value as PaymentMethod)}
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded text-slate-900 font-medium"
                          >
                            <option value="momo">{tPaymentMethod(t, 'momo')}</option>
                            <option value="orange_money">{tPaymentMethod(t, 'orange_money')}</option>
                            <option value="cash">{tPaymentMethod(t, 'cash')}</option>
                            <option value="card">{tPaymentMethod(t, 'card')}</option>
                            <option value="bank_transfer">{tPaymentMethod(t, 'bank_transfer')}</option>
                          </select>
                        </div>
                        <div className="w-28">
                          <input
                            type="number"
                            min="100"
                            step="100"
                            value={line.amount}
                            onChange={(e) => handleUpdateSplitLine(line.id, 'amount', Number(e.target.value))}
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900"
                            placeholder={t('checkOut.amountPlaceholder')}
                            required
                          />
                        </div>
                        {splitLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSplitLine(line.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title={t('checkOut.removeLineTooltip')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Reconciliation summary */}
                    {(() => {
                      const allocated = splitLines.reduce((acc, l) => acc + (Number(l.amount) || 0), 0);
                      const diff = remainingBalance - allocated;
                      return (
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                          <span className="text-slate-600">
                            {t('checkOut.allocatedSummary', { allocated: formatMoney(allocated), total: formatMoney(remainingBalance) })}
                          </span>
                          <span
                            className={`font-semibold font-mono ${
                              diff === 0
                                ? 'text-emerald-700'
                                : diff > 0
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {diff === 0 ? t('checkOut.balanced') : diff > 0 ? t('checkOut.remainingDiff', { amount: formatMoney(diff) }) : t('checkOut.overDiff', { amount: formatMoney(Math.abs(diff)) })}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Front Desk Verification Checklist */}
          <div className="bg-amber-50/60 rounded-xl border border-amber-200 p-4 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-700" /> {t('checkOut.checklistTitle')}
            </span>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={keyReturned}
                onChange={(e) => setKeyReturned(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span>{t('checkOut.keyReturnedCheck')}</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={minibarChecked}
                onChange={(e) => setMinibarChecked(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span>{t('checkOut.minibarCheck')}</span>
            </label>
          </div>

          {/* Notice of State Transition */}
          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            {t('checkOut.stateNotice', { number: reservation.roomNumber })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleCheckout}
              className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-md shadow-rose-700/20 flex items-center gap-2 transition-all hover:scale-[1.01] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('checkOut.confirmBtn')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
