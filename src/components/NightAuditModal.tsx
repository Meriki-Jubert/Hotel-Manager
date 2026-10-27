import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { useT } from '../i18n/LanguageContext';
import { NightAuditReport } from '../types/hms';
import { SelectBranchNotice } from './SelectBranchNotice';
import {
  X,
  Moon,
  CheckCircle2
} from 'lucide-react';
import { sumPaymentsByMethod } from '../utils/folio';

interface NightAuditModalProps {
  onClose: () => void;
}

export const NightAuditModal: React.FC<NightAuditModalProps> = ({ onClose }) => {
  const { t, formatDate, formatNumber } = useT();
  const {
    rooms,
    reservations,
    transactions,
    runNightAudit,
    businessDate,
    formatMoney,
    hasMultipleActiveBranches,
    activeBranch,
    activeBranchId
  } = useHMS();

  if (activeBranchId === 'all') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden relative p-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 z-10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <SelectBranchNotice screenName={t('audit.screenName')} />
        </div>
      </div>
    );
  }

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [actualCashFloat, setActualCashFloat] = useState<number>(175000);
  const [auditNotes, setAuditNotes] = useState(t('audit.defaultNotes'));
  const [completedReport, setCompletedReport] = useState<NightAuditReport | null>(null);

  // Compute active metrics for current day
  const inHouseCount = rooms.filter((r) => r.status === 'occupied').length;
  const totalRooms = rooms.length;
  const estRoomRev = reservations
    .filter((r) => r.bookingStatus === 'checked_in')
    .reduce((s, r) => s + r.nightlyRate, 0);

  const cashCollected = sumPaymentsByMethod(transactions, 'cash');
  const momoCollected = sumPaymentsByMethod(transactions, 'momo');
  const orangeCollected = sumPaymentsByMethod(transactions, 'orange_money');

  const expectedCashTotal = 150000 + cashCollected; // Base opening float + cash collected
  const discrepancy = actualCashFloat - expectedCashTotal;

  const handleExecuteAudit = () => {
    const report = runNightAudit(expectedCashTotal, actualCashFloat, auditNotes);
    setCompletedReport(report);
    setStep(4);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold">{t('audit.title')}</h2>
                {hasMultipleActiveBranches && activeBranch && activeBranchId !== 'all' && (
                  <span className="text-xs bg-teal-950 text-teal-300 px-2 py-0.5 rounded border border-teal-800">
                    {activeBranch.name}
                  </span>
                )}
                <span className="text-xs bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800 font-mono">
                  {t('audit.date', { date: formatDate(businessDate) })}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {t('audit.subtitle')}
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

        {/* Step Indicator */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-semibold shrink-0">
          {[
            { num: 1, title: t('audit.step1') },
            { num: 2, title: t('audit.step2') },
            { num: 3, title: t('audit.step3') },
            { num: 4, title: t('audit.step4') }
          ].map((st) => (
            <div
              key={st.num}
              className={`flex items-center gap-1.5 ${
                step >= st.num ? 'text-indigo-900 font-bold' : 'text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step === st.num
                    ? 'bg-indigo-600 text-white'
                    : step > st.num
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-300 text-slate-600'
                }`}
              >
                {step > st.num ? '✓' : st.num}
              </span>
              <span className="hidden sm:inline">{st.title}</span>
            </div>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs text-slate-900">
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-1">
                <h3 className="font-bold text-sm text-indigo-950">
                  {t('audit.step1Heading')}
                </h3>
                <p className="text-indigo-800">
                  {t('audit.step1Sub')}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">{t('audit.occupiedRooms')}</span>
                  <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                    {inHouseCount} / {totalRooms}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">{t('audit.occupancyRate')}</span>
                  <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block">
                    {totalRooms > 0 ? ((inHouseCount / totalRooms) * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">{t('audit.estNightlyRev')}</span>
                  <span className="text-sm font-bold font-mono text-slate-900 mt-2 block">
                    {formatMoney(estRoomRev)}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">{t('audit.openFolios')}</span>
                  <span className="text-xl font-bold font-mono text-indigo-700 mt-1 block">
                    {t('audit.activeCount', { count: inHouseCount })}
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 font-bold text-slate-700 uppercase text-[10px]">
                  {t('audit.activeGuestsPending')}
                </div>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {reservations
                    .filter((r) => r.bookingStatus === 'checked_in')
                    .map((res) => (
                      <div key={res.id} className="p-2.5 flex justify-between items-center text-xs">
                        <div>
                          <strong className="text-slate-900 font-mono">Room #{res.roomNumber}</strong>: {res.guestName}
                        </div>
                        <div className="font-mono text-slate-600">
                          {t('audit.perNight', { rate: formatMoney(res.nightlyRate) })}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-1">
                <h3 className="font-bold text-sm text-indigo-950">
                  {t('audit.step2Heading')}
                </h3>
                <p className="text-indigo-800">
                  {t('audit.step2Sub', { date: formatDate(businessDate) })}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('audit.batchValidated')}</span>
                </div>
                <p className="text-slate-600">
                  {t('audit.batchDesc', { count: inHouseCount })}
                </p>
                <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-xs flex justify-between">
                  <span>{t('audit.batchTotal')}</span>
                  <strong className="text-slate-900">{formatMoney(estRoomRev)}</strong>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-1">
                <h3 className="font-bold text-sm text-indigo-950">
                  {t('audit.step3Heading')}
                </h3>
                <p className="text-indigo-800">
                  {t('audit.step3Sub')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 block">{t('audit.expectedCollections')}</span>
                  <div className="space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span>{t('audit.openingFloat')}</span>
                      <span className="font-mono">{formatMoney(150000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('audit.cashReceived')}</span>
                      <span className="font-mono">{formatMoney(cashCollected)}</span>
                    </div>
                    <div className="flex justify-between text-yellow-800 font-medium">
                      <span>{t('audit.momoReceived')}</span>
                      <span className="font-mono">{formatMoney(momoCollected)}</span>
                    </div>
                    <div className="flex justify-between text-orange-800 font-medium">
                      <span>{t('audit.orangeReceived')}</span>
                      <span className="font-mono">{formatMoney(orangeCollected)}</span>
                    </div>
                    <div className="h-px bg-slate-200 my-1" />
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{t('audit.expectedCash')}</span>
                      <span className="font-mono">{formatMoney(expectedCashTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <label className="font-bold text-slate-800 block mb-1">
                      {t('audit.actualCashLabel')}
                    </label>
                    <input
                      type="number"
                      value={actualCashFloat}
                      onChange={(e) => setActualCashFloat(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-sm text-slate-900"
                    />
                  </div>

                  <div className="p-2.5 rounded-lg border bg-white flex items-center justify-between">
                    <span className="font-semibold text-slate-700">{t('audit.discrepancyLabel')}</span>
                    <span
                      className={`font-mono font-bold ${
                        discrepancy === 0
                          ? 'text-emerald-600'
                          : discrepancy > 0
                          ? 'text-blue-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {discrepancy === 0
                        ? t('audit.balanced')
                        : `${discrepancy > 0 ? '+' : ''}${formatMoney(discrepancy)}`}
                    </span>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">{t('audit.notesLabel')}</label>
                    <input
                      type="text"
                      value={auditNotes}
                      onChange={(e) => setAuditNotes(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && completedReport && (
            <div className="space-y-4">
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-base text-emerald-950">
                  {t('audit.step4Success')}
                </h3>
                <p className="text-emerald-800 text-xs">
                  {t('audit.step4Sub', { date: formatDate(completedReport.date) })}
                </p>
              </div>

              {/* Report Summary Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    {t('audit.flashReport')}
                  </span>
                  <span className="font-mono text-slate-500">{completedReport.timestamp}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">{t('audit.occupancyRate')}</span>
                    <strong className="font-mono text-emerald-700">{completedReport.occupancyRate}%</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">{t('audit.adr')}</span>
                    <strong className="font-mono text-slate-800">{formatMoney(completedReport.adr)}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">{t('audit.revPar')}</span>
                    <strong className="font-mono text-slate-800">{formatMoney(completedReport.revPar)}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">{t('audit.grossRevenue')}</span>
                    <strong className="font-mono text-slate-900">{formatMoney(completedReport.totalGrossRevenue)}</strong>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-600 space-y-1 text-xs">
                  <div>{t('audit.cashCollected', { amount: formatMoney(completedReport.cashCollected) })}</div>
                  <div>{t('audit.momoCollected', { amount: formatMoney(completedReport.momoCollected) })}</div>
                  <div>{t('audit.discrepancy', { amount: completedReport.discrepancy === 0 ? t('audit.noneZero') : formatMoney(completedReport.discrepancy) })}</div>
                  <div>{t('audit.auditedBy', { name: completedReport.auditedBy })}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          {step > 1 && step < 4 && (
            <button
              onClick={() => setStep((s) => (s - 1) as any)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              {t('audit.backBtn')}
            </button>
          )}

          {step < 3 && (
            <button
              onClick={() => setStep((s) => (s + 1) as any)}
              className="ml-auto px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all cursor-pointer"
            >
              {t('audit.nextStepBtn')}
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleExecuteAudit}
              className="ml-auto px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Moon className="w-4 h-4" />
              <span>{t('audit.finalizeBtn')}</span>
            </button>
          )}

          {step === 4 && (
            <button
              onClick={onClose}
              className="ml-auto px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
            >
              {t('audit.closeBtn')}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
