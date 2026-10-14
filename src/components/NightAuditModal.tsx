import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { NightAuditReport } from '../types/hms';
import {
  X,
  Moon,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
  RotateCw,
  Printer,
  ShieldCheck,
  Building
} from 'lucide-react';

interface NightAuditModalProps {
  onClose: () => void;
}

export const NightAuditModal: React.FC<NightAuditModalProps> = ({ onClose }) => {
  const {
    rooms,
    reservations,
    transactions,
    runNightAudit,
    businessDate,
    formatMoney,
    nightAuditReports
  } = useHMS();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [actualCashFloat, setActualCashFloat] = useState<number>(175000);
  const [auditNotes, setAuditNotes] = useState('Standard night shift closure. All folios verified.');
  const [completedReport, setCompletedReport] = useState<NightAuditReport | null>(null);

  // Compute active metrics for current day
  const inHouseCount = rooms.filter((r) => r.status === 'occupied').length;
  const totalRooms = rooms.length;
  const estRoomRev = reservations
    .filter((r) => r.bookingStatus === 'checked_in')
    .reduce((s, r) => s + r.nightlyRate, 0);

  const cashCollected = transactions
    .filter((t) => t.type === 'payment' && t.paymentMethod === 'cash')
    .reduce((s, t) => s + t.amount, 0);

  const momoCollected = transactions
    .filter((t) => t.type === 'payment' && t.paymentMethod === 'momo')
    .reduce((s, t) => s + t.amount, 0);

  const orangeCollected = transactions
    .filter((t) => t.type === 'payment' && t.paymentMethod === 'orange_money')
    .reduce((s, t) => s + t.amount, 0);

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
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">End-of-Day Night Audit Routine</h2>
                <span className="text-xs bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800 font-mono">
                  Date: {businessDate}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ledger reconciliation, recurring charges posting, and business date rollover
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-semibold shrink-0">
          {[
            { num: 1, title: 'In-House Review' },
            { num: 2, title: 'Room Rate Posting' },
            { num: 3, title: 'Cash Reconciliation' },
            { num: 4, title: 'Audit Report' }
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
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-1">
                <h3 className="font-bold text-sm text-indigo-950">
                  Step 1: Occupancy & In-House Guest Audit
                </h3>
                <p className="text-indigo-800">
                  Verify that all currently checked-in guests are active in the system before batch folio calculations.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">Occupied Rooms</span>
                  <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                    {inHouseCount} / {totalRooms}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">Occupancy Rate</span>
                  <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block">
                    {((inHouseCount / totalRooms) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">Est. Nightly Rev</span>
                  <span className="text-sm font-bold font-mono text-slate-900 mt-2 block">
                    {formatMoney(estRoomRev)}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">Open Folios</span>
                  <span className="text-xl font-bold font-mono text-indigo-700 mt-1 block">
                    {inHouseCount} Active
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 font-bold text-slate-700 uppercase text-[10px]">
                  Active Guest Occupancies Pending Rollover:
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
                          {formatMoney(res.nightlyRate)} / nt
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
                  Step 2: Automated Nightly Room Charges Posting
                </h3>
                <p className="text-indigo-800">
                  The system will automatically post recurring accommodation charges and applicable local tourism taxes to each active folio for the date {businessDate}.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Batch Room Rates Validated</span>
                </div>
                <p className="text-slate-600">
                  All {inHouseCount} active in-house guest folios will be stamped with their agreed contract rates. No manual ledger entry is required.
                </p>
                <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-xs flex justify-between">
                  <span>Batch Post Total (Room Charges):</span>
                  <strong className="text-slate-900">{formatMoney(estRoomRev)}</strong>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-1">
                <h3 className="font-bold text-sm text-indigo-950">
                  Step 3: Shift Drawer & Mobile Money Reconciliation
                </h3>
                <p className="text-indigo-800">
                  Enter physical cash in drawer to detect any cashier float discrepancies.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 block">System Expected Collections:</span>
                  <div className="space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span>Shift Opening Float:</span>
                      <span className="font-mono">{formatMoney(150000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cash Received:</span>
                      <span className="font-mono">{formatMoney(cashCollected)}</span>
                    </div>
                    <div className="flex justify-between text-yellow-800 font-medium">
                      <span>MTN MoMo Received:</span>
                      <span className="font-mono">{formatMoney(momoCollected)}</span>
                    </div>
                    <div className="flex justify-between text-orange-800 font-medium">
                      <span>Orange Money Received:</span>
                      <span className="font-mono">{formatMoney(orangeCollected)}</span>
                    </div>
                    <div className="h-px bg-slate-200 my-1" />
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>Expected Physical Cash Drawer:</span>
                      <span className="font-mono">{formatMoney(expectedCashTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <label className="font-bold text-slate-800 block mb-1">
                      Actual Physical Cash Counted in Drawer (FCFA):
                    </label>
                    <input
                      type="number"
                      value={actualCashFloat}
                      onChange={(e) => setActualCashFloat(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-sm"
                    />
                  </div>

                  <div className="p-2.5 rounded-lg border bg-white flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Cash Float Discrepancy:</span>
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
                        ? '0 FCFA (Balanced)'
                        : `${discrepancy > 0 ? '+' : ''}${formatMoney(discrepancy)}`}
                    </span>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Audit Notes / Comments:</label>
                    <input
                      type="text"
                      value={auditNotes}
                      onChange={(e) => setAuditNotes(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
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
                  Night Audit Rollover Successfully Completed!
                </h3>
                <p className="text-emerald-800 text-xs">
                  Business date rolled over from <strong>{completedReport.date}</strong> to the next operational day.
                </p>
              </div>

              {/* Report Summary Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Daily Flash Report Summary
                  </span>
                  <span className="font-mono text-slate-500">{completedReport.timestamp}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Occupancy</span>
                    <strong className="font-mono text-emerald-700">{completedReport.occupancyRate}%</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">ADR (Avg Daily Rate)</span>
                    <strong className="font-mono text-slate-800">{formatMoney(completedReport.adr)}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">RevPAR</span>
                    <strong className="font-mono text-slate-800">{formatMoney(completedReport.revPar)}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Gross Revenue</span>
                    <strong className="font-mono text-slate-900">{formatMoney(completedReport.totalGrossRevenue)}</strong>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-600 space-y-1 text-xs">
                  <div>Cash Collected: <strong>{formatMoney(completedReport.cashCollected)}</strong></div>
                  <div>MTN MoMo Collected: <strong>{formatMoney(completedReport.momoCollected)}</strong></div>
                  <div>Discrepancy: <strong>{completedReport.discrepancy === 0 ? 'None (0)' : formatMoney(completedReport.discrepancy)}</strong></div>
                  <div>Audited By: <strong>{completedReport.auditedBy}</strong></div>
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
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Back
            </button>
          )}

          {step < 3 && (
            <button
              onClick={() => setStep((s) => (s + 1) as any)}
              className="ml-auto px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all"
            >
              Proceed to Next Step
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleExecuteAudit}
              className="ml-auto px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md transition-all flex items-center gap-1.5"
            >
              <Moon className="w-4 h-4" />
              <span>Finalize & Roll Over Business Date</span>
            </button>
          )}

          {step === 4 && (
            <button
              onClick={onClose}
              className="ml-auto px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
            >
              Close Night Audit
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
