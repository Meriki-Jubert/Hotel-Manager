import React, { useState, useMemo } from 'react';
import { useHMS } from '../context/HMSContext';
import { useT } from '../i18n/LanguageContext';
import { tFolioCategory, tPaymentMethod } from '../i18n/labels';
import {
  buildRevenueByCategory,
  buildPaymentsByMethod,
  buildOccupancy,
  buildOutstandingBalances,
  buildCancellations,
  toCsv,
  downloadCsv,
  ReportRange
} from '../utils/reports';
import {
  buildReportPdf,
  downloadReportPdf,
  formatPdfMoney,
  ReportPdfSection
} from '../utils/reportPdf';
import {
  Printer,
  Download,
  Calendar,
  Building2,
  DollarSign,
  CreditCard,
  BedDouble,
  AlertTriangle,
  UserX,
  FileSpreadsheet,
  CheckCircle2,
  Receipt,
  FileText
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { t } = useT();
  const {
    allTransactions,
    allReservations,
    allRooms,
    branches,
    activeBranchId,
    currentUser,
    hotelConfig,
    formatMoney,
    businessDate
  } = useHMS();

  const isOwner = currentUser?.role === 'owner';

  // Default date range: this month
  const defaultDates = useMemo(() => {
    const base = businessDate || new Date().toISOString().slice(0, 10);
    const [y, m] = base.split('-').map(Number);
    const from = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { from, to };
  }, [businessDate]);

  const [fromDate, setFromDate] = useState<string>(defaultDates.from);
  const [toDate, setToDate] = useState<string>(defaultDates.to);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    isOwner ? (activeBranchId || 'all') : (activeBranchId || branches[0]?.id || 'branch-1')
  );

  const range: ReportRange = useMemo(
    () => ({
      branchId: selectedBranchId,
      from: fromDate,
      to: toDate
    }),
    [selectedBranchId, fromDate, toDate]
  );

  // Pure reports computation
  const revenueReport = useMemo(
    () => buildRevenueByCategory(allTransactions, range),
    [allTransactions, range]
  );

  const paymentsReport = useMemo(
    () => buildPaymentsByMethod(allTransactions, range),
    [allTransactions, range]
  );

  const occupancyReport = useMemo(
    () => buildOccupancy(allReservations, allRooms, range),
    [allReservations, allRooms, range]
  );

  const outstandingReport = useMemo(
    () => buildOutstandingBalances(allReservations, allTransactions, range),
    [allReservations, allTransactions, range]
  );

  const cancellationsReport = useMemo(
    () => buildCancellations(allReservations, range),
    [allReservations, range]
  );

  const activeBranchName = useMemo(() => {
    if (selectedBranchId === 'all') return t('reports.allBranches');
    return branches.find((b) => b.id === selectedBranchId)?.name || 'Selected Branch';
  }, [selectedBranchId, branches, t]);

  // CSV download handlers
  const handleDownloadRevenueCsv = () => {
    const csv = toCsv(revenueReport.rows, [
      { key: 'category', label: t('reports.col.category'), format: (val) => tFolioCategory(t, String(val)) },
      { key: 'amount', label: t('reports.col.amount', { currency: hotelConfig.defaultCurrency }) }
    ]);
    downloadCsv(`revenue-by-category-${range.from}-to-${range.to}`, csv);
  };

  const handleDownloadPaymentsCsv = () => {
    const csv = toCsv(paymentsReport.rows, [
      { key: 'method', label: t('reports.col.paymentMethod'), format: (val) => tPaymentMethod(t, String(val)) },
      { key: 'amount', label: t('reports.col.netCollected', { currency: hotelConfig.defaultCurrency }) }
    ]);
    downloadCsv(`payments-by-method-${range.from}-to-${range.to}`, csv);
  };

  const handleDownloadOccupancyCsv = () => {
    const csv = toCsv(occupancyReport.rows, [
      { key: 'date', label: t('reports.col.nightDate') },
      { key: 'occupiedRooms', label: t('reports.col.occupiedRooms') },
      { key: 'totalRooms', label: t('reports.col.totalRooms') },
      { key: 'occupancyPercent', label: t('reports.col.occupancyRate') }
    ]);
    downloadCsv(`occupancy-and-adr-${range.from}-to-${range.to}`, csv);
  };

  const handleDownloadOutstandingCsv = () => {
    const csv = toCsv(outstandingReport.rows, [
      { key: 'bookingCode', label: t('reports.col.bookingCode') },
      { key: 'guestName', label: t('reports.col.guestName') },
      { key: 'roomNumber', label: t('reports.col.roomNumber') },
      { key: 'guestPhone', label: t('reports.col.phone') },
      { key: 'checkInDate', label: t('reports.col.checkIn') },
      { key: 'checkOutDate', label: t('reports.col.checkOut') },
      { key: 'totalCharges', label: t('reports.col.totalCharges', { currency: hotelConfig.defaultCurrency }) },
      { key: 'totalPaid', label: t('reports.col.totalPaid', { currency: hotelConfig.defaultCurrency }) },
      { key: 'balance', label: t('reports.col.balanceDue', { currency: hotelConfig.defaultCurrency }) }
    ]);
    downloadCsv(`outstanding-balances-${range.from}-to-${range.to}`, csv);
  };

  const handleDownloadCancellationsCsv = () => {
    const csv = toCsv(cancellationsReport.rows, [
      { key: 'bookingCode', label: t('reports.col.bookingCode') },
      { key: 'guestName', label: t('reports.col.guestName') },
      { key: 'roomNumber', label: t('reports.col.roomNumber') },
      { key: 'checkInDate', label: t('reports.col.scheduledCheckIn') },
      { key: 'cancelledAt', label: t('reports.col.cancelledDate') },
      { key: 'isNoShow', label: t('reports.col.status'), format: (val) => (val ? 'No-Show' : 'Cancelled') },
      { key: 'feeKept', label: t('reports.col.feeRetained', { currency: hotelConfig.defaultCurrency }) },
      { key: 'refund', label: t('reports.col.refundIssued', { currency: hotelConfig.defaultCurrency }) },
      { key: 'reason', label: t('reports.col.reason') },
      { key: 'feeOverrideReason', label: t('reports.col.feeOverrideReason') }
    ]);
    downloadCsv(`cancellations-and-noshows-${range.from}-to-${range.to}`, csv);
  };

  // PDF Section definitions for single & full export
  const getRevenueSection = (): ReportPdfSection => ({
    title: t('reports.revenueByCategory'),
    note: t('reports.revenueNote'),
    columns: [
      { label: t('reports.col.category'), key: 'category', align: 'left' },
      { label: t('reports.col.type'), key: 'type', align: 'left' },
      { label: t('reports.col.amount', { currency: hotelConfig.defaultCurrency }), key: 'amount', align: 'right' }
    ],
    rows: revenueReport.rows.map((row) => ({
      category: tFolioCategory(t, row.category),
      type:
        row.amount < 0 || row.category === 'discount' || row.category === 'room_charge_void'
          ? t('reports.type.credit')
          : t('reports.type.charge'),
      amount: formatPdfMoney(row.amount)
    })),
    totalRow: {
      category: t('reports.totalNetRevenueLabel'),
      type: '',
      amount: formatPdfMoney(revenueReport.total)
    }
  });

  const getPaymentsSection = (): ReportPdfSection => ({
    title: t('reports.paymentsByMethod'),
    note: t('reports.paymentsNote'),
    columns: [
      { label: t('reports.col.paymentMethod'), key: 'method', align: 'left' },
      { label: t('reports.col.netCollected', { currency: hotelConfig.defaultCurrency }), key: 'amount', align: 'right' }
    ],
    rows: paymentsReport.rows.map((row) => ({
      method: tPaymentMethod(t, String(row.method)),
      amount: formatPdfMoney(row.amount)
    })),
    totalRow: {
      method: t('reports.totalCollectionsLabel'),
      amount: formatPdfMoney(paymentsReport.total)
    }
  });

  const getOccupancySection = (): ReportPdfSection => ({
    title: t('reports.occupancyAndAdr'),
    note: t('reports.occupancyNote'),
    columns: [
      { label: t('reports.col.nightDate'), key: 'date', align: 'left' },
      { label: t('reports.col.occupiedRooms'), key: 'occupied', align: 'right' },
      { label: t('reports.col.totalRooms'), key: 'total', align: 'right' },
      { label: t('reports.col.occupancyRate'), key: 'percent', align: 'right' }
    ],
    rows: occupancyReport.rows.map((row) => ({
      date: row.date,
      occupied: String(row.occupiedRooms),
      total: String(row.totalRooms),
      percent: `${row.occupancyPercent}%`
    })),
    totalRow: {
      date: t('reports.periodSummary'),
      occupied: `${occupancyReport.totalOccupiedNights}`,
      total: `${occupancyReport.totalRooms}`,
      percent: `${t('reports.avgOccupancy', { pct: occupancyReport.averageOccupancyPercent })} | ${t('reports.periodAdr', { amount: formatPdfMoney(occupancyReport.adr) })}`
    }
  });

  const getOutstandingSection = (): ReportPdfSection => ({
    title: t('reports.outstandingBalances'),
    note: t('reports.outstandingNote'),
    columns: [
      { label: t('reports.col.bookingCode'), key: 'booking', align: 'left' },
      { label: t('reports.col.guestName'), key: 'guest', align: 'left' },
      { label: t('reports.col.roomNumber'), key: 'room', align: 'left' },
      { label: t('reports.col.checkIn'), key: 'stay', align: 'left' },
      { label: t('reports.col.totalCharges', { currency: hotelConfig.defaultCurrency }), key: 'charges', align: 'right' },
      { label: t('reports.col.totalPaid', { currency: hotelConfig.defaultCurrency }), key: 'paid', align: 'right' },
      { label: t('reports.col.balanceDue', { currency: hotelConfig.defaultCurrency }), key: 'balance', align: 'right' }
    ],
    rows: outstandingReport.rows.map((row) => ({
      booking: row.bookingCode,
      guest: row.guestName,
      room: `#${row.roomNumber}`,
      stay: `${row.checkInDate} -> ${row.checkOutDate}`,
      charges: formatPdfMoney(row.totalCharges),
      paid: formatPdfMoney(row.totalPaid),
      balance: formatPdfMoney(row.balance)
    })),
    totalRow: {
      booking: t('reports.totalOutstanding', { amount: formatPdfMoney(outstandingReport.total) }),
      guest: '',
      room: '',
      stay: '',
      charges: '',
      paid: '',
      balance: formatPdfMoney(outstandingReport.total)
    }
  });

  const getCancellationsSection = (): ReportPdfSection => ({
    title: t('reports.cancellationsAndNoShows'),
    note: t('reports.cancellationsNote'),
    columns: [
      { label: t('reports.col.bookingCode'), key: 'booking', align: 'left' },
      { label: t('reports.col.guestName'), key: 'guest', align: 'left' },
      { label: t('reports.col.roomNumber'), key: 'room', align: 'left' },
      { label: t('reports.col.status'), key: 'status', align: 'left' },
      { label: t('reports.col.cancelledDate'), key: 'date', align: 'left' },
      { label: t('reports.col.feeRetained', { currency: hotelConfig.defaultCurrency }), key: 'fee', align: 'right' },
      { label: t('reports.col.refundIssued', { currency: hotelConfig.defaultCurrency }), key: 'refund', align: 'right' },
      { label: t('reports.col.reason'), key: 'reason', align: 'left' }
    ],
    rows: cancellationsReport.rows.map((row) => ({
      booking: row.bookingCode,
      guest: row.guestName,
      room: `#${row.roomNumber}`,
      status: row.isNoShow ? 'No-Show' : 'Cancelled',
      date: row.cancelledAt ? row.cancelledAt.slice(0, 10) : row.checkInDate,
      fee: formatPdfMoney(row.feeKept),
      refund: formatPdfMoney(row.refund),
      reason: [row.reason, row.feeOverrideReason ? `[Override: ${row.feeOverrideReason}]` : ''].filter(Boolean).join(' ')
    })),
    totalRow: {
      booking: t('reports.totalFeesRetained', { amount: formatPdfMoney(cancellationsReport.totalFeeKept) }),
      guest: '',
      room: '',
      status: '',
      date: '',
      fee: formatPdfMoney(cancellationsReport.totalFeeKept),
      refund: formatPdfMoney(cancellationsReport.totalRefunded),
      reason: ''
    }
  });

  const getPdfMeta = (title: string) => ({
    title,
    hotelName: hotelConfig.name,
    branchName: activeBranchName,
    from: fromDate,
    to: toDate,
    generatedBy: currentUser?.name || 'Staff',
    generatedAt: `${businessDate || new Date().toISOString().slice(0, 10)} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
    tOrLang: t
  });

  const handleDownloadFullPdf = () => {
    const doc = buildReportPdf({
      ...getPdfMeta(t('reports.title')),
      sections: [
        getRevenueSection(),
        getPaymentsSection(),
        getOccupancySection(),
        getOutstandingSection(),
        getCancellationsSection()
      ]
    });
    downloadReportPdf(`full-report-${fromDate}-to-${toDate}.pdf`, doc);
  };

  const handleDownloadRevenuePdf = () => {
    const doc = buildReportPdf({
      ...getPdfMeta(t('reports.revenueByCategory')),
      sections: [getRevenueSection()]
    });
    downloadReportPdf(`revenue-by-category-${fromDate}-to-${toDate}.pdf`, doc);
  };

  const handleDownloadPaymentsPdf = () => {
    const doc = buildReportPdf({
      ...getPdfMeta(t('reports.paymentsByMethod')),
      sections: [getPaymentsSection()]
    });
    downloadReportPdf(`payments-by-method-${fromDate}-to-${toDate}.pdf`, doc);
  };

  const handleDownloadOccupancyPdf = () => {
    const doc = buildReportPdf({
      ...getPdfMeta(t('reports.occupancyAndAdr')),
      sections: [getOccupancySection()]
    });
    downloadReportPdf(`occupancy-and-adr-${fromDate}-to-${toDate}.pdf`, doc);
  };

  const handleDownloadOutstandingPdf = () => {
    const doc = buildReportPdf({
      ...getPdfMeta(t('reports.outstandingBalances')),
      sections: [getOutstandingSection()]
    });
    downloadReportPdf(`outstanding-balances-${fromDate}-to-${toDate}.pdf`, doc);
  };

  const handleDownloadCancellationsPdf = () => {
    const doc = buildReportPdf({
      ...getPdfMeta(t('reports.cancellationsAndNoShows')),
      sections: [getCancellationsSection()]
    });
    downloadReportPdf(`cancellations-and-noshows-${fromDate}-to-${toDate}.pdf`, doc);
  };

  const setMonthPreset = (offsetMonths: number = 0) => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const from = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setFromDate(from);
    setToDate(to);
  };

  return (
    <div className="space-y-6">
      {/* Print-Only Header */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6 text-slate-900">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wide">{hotelConfig.name}</h1>
            <p className="text-xs text-slate-600 font-medium">{hotelConfig.address}, {hotelConfig.city}</p>
            {hotelConfig.taxId && (
              <p className="text-xs text-slate-600">Tax ID / NIU: {hotelConfig.taxId}</p>
            )}
          </div>
          <div className="text-right text-xs">
            <h2 className="text-lg font-bold">{t('reports.title')}</h2>
            <p className="font-semibold text-slate-800">Branch: {activeBranchName}</p>
            <p className="text-slate-600">Period: {fromDate} to {toDate}</p>
            <p className="text-slate-400 text-[10px] mt-1">
              {t('pdf.printedBy', { name: currentUser?.name || 'Staff', date: new Date().toLocaleString() })}
            </p>
          </div>
        </div>
      </div>

      {/* Screen Controls & Header Bar (Hidden in Print) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              {t('reports.title')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('reports.subtitle')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadFullPdf}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              title={t('reports.exportFullPdf')}
            >
              <FileText className="w-4 h-4" />
              <span>{t('reports.exportFullPdf')}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              title={t('common.print')}
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>{t('common.print')}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end text-xs">
          {/* Branch Picker */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('reports.branchScope')}</span>
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            >
              {isOwner && (
                <option value="all">{t('reports.allBranches')}</option>
              )}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.city}){b.isActive ? '' : ' - Inactive'}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range: From */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('reports.from')}</span>
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          {/* Date Range: To */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('reports.to')}</span>
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          {/* Presets */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMonthPreset(0)}
              className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold transition-colors cursor-pointer text-center"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setMonthPreset(-1)}
              className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold transition-colors cursor-pointer text-center"
            >
              Last Month
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">{t('reports.netRevenueTotal', { amount: '' })}</span>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {formatMoney(revenueReport.total)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">{t('reports.revenueNote')}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">{t('reports.netCollectionsTotal', { amount: '' })}</span>
          <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">
            {formatMoney(paymentsReport.total)}
          </div>
          <span className="text-[10px] text-emerald-600 mt-1 block">{t('reports.paymentsNote')}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">{t('reports.occupancyAndAdr')}</span>
          <div className="text-xl font-bold text-indigo-700 mt-1 font-mono flex items-baseline gap-2">
            <span>{occupancyReport.averageOccupancyPercent}%</span>
            <span className="text-xs font-semibold text-slate-600">ADR: {formatMoney(occupancyReport.adr)}</span>
          </div>
          <span className="text-[10px] text-indigo-600 mt-1 block">
            {t('reports.totalOccupiedNights', { nights: occupancyReport.totalOccupiedNights })}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">{t('reports.outstandingBalances')}</span>
          <div className="text-xl font-bold text-amber-700 mt-1 font-mono">
            {formatMoney(outstandingReport.total)}
          </div>
          <span className="text-[10px] text-amber-600 mt-1 block">
            {t('reports.outstandingNote')}
          </span>
        </div>
      </div>

      {/* SECTION 1: Revenue by Category */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-slate-300 print:shadow-none">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 print:bg-transparent">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('reports.revenueByCategory')}</h3>
              <p className="text-[11px] text-slate-500">
                {t('reports.revenueNote')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={handleDownloadRevenuePdf}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              title={t('reports.exportPdf')}
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>{t('reports.exportPdf')}</span>
            </button>
            <button
              onClick={handleDownloadRevenueCsv}
              disabled={revenueReport.rows.length === 0}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title={t('reports.exportCsv')}
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('reports.exportCsv')}</span>
            </button>
          </div>
        </div>

        {revenueReport.rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">{t('pdf.noData')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">{t('reports.col.category')}</th>
                  <th className="py-2.5 px-4 text-center">{t('reports.col.type')}</th>
                  <th className="py-2.5 px-4 text-right">{t('reports.col.amount', { currency: hotelConfig.defaultCurrency })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {revenueReport.rows.map((row) => {
                  const isNegative =
                    row.amount < 0 || row.category === 'discount' || row.category === 'room_charge_void';
                  return (
                    <tr key={row.category} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-semibold text-slate-800">
                        {tFolioCategory(t, row.category)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isNegative
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isNegative ? t('reports.type.credit') : t('reports.type.charge')}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono font-semibold whitespace-nowrap ${
                          isNegative ? 'text-rose-600' : 'text-slate-900'
                        }`}
                      >
                        {formatMoney(row.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100/80 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={2} className="py-3 px-4 text-slate-800 uppercase tracking-wider text-[11px]">
                    {t('reports.totalNetRevenueLabel')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-950 text-sm">
                    {formatMoney(revenueReport.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 2: Payments by Method */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-slate-300 print:shadow-none">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 print:bg-transparent">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('reports.paymentsByMethod')}</h3>
              <p className="text-[11px] text-slate-500">
                {t('reports.paymentsNote')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={handleDownloadPaymentsPdf}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              title={t('reports.exportPdf')}
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>{t('reports.exportPdf')}</span>
            </button>
            <button
              onClick={handleDownloadPaymentsCsv}
              disabled={paymentsReport.rows.length === 0}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title={t('reports.exportCsv')}
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('reports.exportCsv')}</span>
            </button>
          </div>
        </div>

        {paymentsReport.rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">{t('pdf.noData')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">{t('reports.col.paymentMethod')}</th>
                  <th className="py-2.5 px-4 text-right">{t('reports.col.netCollected', { currency: hotelConfig.defaultCurrency })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentsReport.rows.map((row) => (
                  <tr key={row.method} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span>{tPaymentMethod(t, String(row.method))}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                      {formatMoney(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100/80 font-bold border-t-2 border-slate-300">
                <tr>
                  <td className="py-3 px-4 text-slate-800 uppercase tracking-wider text-[11px]">
                    {t('reports.totalCollectionsLabel')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-800 text-sm">
                    {formatMoney(paymentsReport.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 3: Occupancy & ADR */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-slate-300 print:shadow-none">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 print:bg-transparent">
          <div className="flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-teal-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('reports.occupancyAndAdr')}</h3>
              <p className="text-[11px] text-slate-500">
                {t('reports.occupancyNote')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={handleDownloadOccupancyPdf}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              title={t('reports.exportPdf')}
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>{t('reports.exportPdf')}</span>
            </button>
            <button
              onClick={handleDownloadOccupancyCsv}
              disabled={occupancyReport.rows.length === 0}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title={t('reports.exportCsv')}
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('reports.exportCsv')}</span>
            </button>
          </div>
        </div>

        {/* Occupancy Summary Stats Bar */}
        <div className="p-4 bg-teal-50/40 border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">{t('reports.col.totalRooms')}</span>
            <div className="font-bold text-slate-900 mt-0.5">{occupancyReport.totalRooms}</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">{t('reports.totalOccupiedNights', { nights: occupancyReport.totalOccupiedNights })}</span>
            <div className="font-bold text-teal-700 mt-0.5">{occupancyReport.totalOccupiedNights}</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">{t('reports.avgOccupancy', { pct: occupancyReport.averageOccupancyPercent })}</span>
            <div className="font-bold text-slate-900 mt-0.5">{occupancyReport.averageOccupancyPercent}%</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">{t('reports.periodAdr', { amount: formatMoney(occupancyReport.adr) })}</span>
            <div className="font-bold text-slate-900 mt-0.5 font-mono">{formatMoney(occupancyReport.adr)}</div>
          </div>
        </div>

        {occupancyReport.rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <BedDouble className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">{t('pdf.noData')}</p>
          </div>
        ) : (
          <div>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">{t('reports.col.nightDate')}</th>
                    <th className="py-2.5 px-4 text-center">{t('reports.col.occupiedRooms')}</th>
                    <th className="py-2.5 px-4 text-center">{t('reports.col.totalRooms')}</th>
                    <th className="py-2.5 px-4 text-right">{t('reports.col.occupancyRate')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {occupancyReport.rows.map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50/70">
                      <td className="py-2 px-4 font-mono font-medium text-slate-800">{row.date}</td>
                      <td className="py-2 px-4 text-center font-bold text-teal-700">{row.occupiedRooms}</td>
                      <td className="py-2 px-4 text-center text-slate-500">{row.totalRooms}</td>
                      <td className="py-2 px-4 text-right font-mono font-semibold text-slate-900">
                        {row.occupancyPercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Note under the Occupancy table */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 font-medium">
              Uses the current number of active rooms.
            </div>
          </div>
        )}
      </section>

      {/* SECTION 4: Outstanding Balances */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-slate-300 print:shadow-none">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 print:bg-transparent">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('reports.outstandingBalances')}</h3>
              <p className="text-[11px] text-slate-500">
                {t('reports.outstandingNote')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={handleDownloadOutstandingPdf}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              title={t('reports.exportPdf')}
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>{t('reports.exportPdf')}</span>
            </button>
            <button
              onClick={handleDownloadOutstandingCsv}
              disabled={outstandingReport.rows.length === 0}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title={t('reports.exportCsv')}
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('reports.exportCsv')}</span>
            </button>
          </div>
        </div>

        {outstandingReport.rows.length === 0 ? (
          <div className="p-8 text-center text-emerald-700 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-slate-800">{t('reports.noOutstanding')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">{t('reports.col.bookingCode')} / {t('reports.col.guestName')}</th>
                  <th className="py-2.5 px-4 text-center">{t('reports.col.roomNumber')}</th>
                  <th className="py-2.5 px-4">{t('reports.col.phone')}</th>
                  <th className="py-2.5 px-4">{t('reports.col.checkIn')} / {t('reports.col.checkOut')}</th>
                  <th className="py-2.5 px-4 text-right">{t('reports.col.totalCharges', { currency: hotelConfig.defaultCurrency })}</th>
                  <th className="py-2.5 px-4 text-right">{t('reports.col.totalPaid', { currency: hotelConfig.defaultCurrency })}</th>
                  <th className="py-2.5 px-4 text-right">{t('reports.col.balanceDue', { currency: hotelConfig.defaultCurrency })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outstandingReport.rows.map((row) => (
                  <tr key={row.reservationId} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-slate-900">{row.guestName}</div>
                      <span className="font-mono text-[10px] text-slate-400">{row.bookingCode}</span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-700">
                      #{row.roomNumber}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">
                      {row.guestPhone}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">
                      {row.checkInDate} to {row.checkOutDate}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                      {formatMoney(row.totalCharges)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-700">
                      {formatMoney(row.totalPaid)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                      {formatMoney(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100/80 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={6} className="py-3 px-4 text-slate-800 uppercase tracking-wider text-[11px]">
                    {t('reports.totalOutstanding', { amount: formatMoney(outstandingReport.total) })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-amber-800 text-sm">
                    {formatMoney(outstandingReport.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 5: Cancellations and No-Shows */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-slate-300 print:shadow-none">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 print:bg-transparent">
          <div className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('reports.cancellationsAndNoShows')}</h3>
              <p className="text-[11px] text-slate-500">
                {t('reports.cancellationsNote')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={handleDownloadCancellationsPdf}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              title={t('reports.exportPdf')}
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>{t('reports.exportPdf')}</span>
            </button>
            <button
              onClick={handleDownloadCancellationsCsv}
              disabled={cancellationsReport.rows.length === 0}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title={t('reports.exportCsv')}
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('reports.exportCsv')}</span>
            </button>
          </div>
        </div>

        {cancellationsReport.rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <UserX className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">{t('reports.noCancellations')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">{t('reports.col.bookingCode')} / {t('reports.col.guestName')}</th>
                  <th className="py-2.5 px-4 text-center">{t('reports.col.status')}</th>
                  <th className="py-2.5 px-4">{t('reports.col.cancelledDate')}</th>
                  <th className="py-2.5 px-4 text-right">{t('reports.col.feeRetained', { currency: hotelConfig.defaultCurrency })}</th>
                  <th className="py-2.5 px-4 text-right">{t('reports.col.refundIssued', { currency: hotelConfig.defaultCurrency })}</th>
                  <th className="py-2.5 px-4">{t('reports.col.reason')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cancellationsReport.rows.map((row) => (
                  <tr key={row.reservationId} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-slate-900">{row.guestName}</div>
                      <span className="font-mono text-[10px] text-slate-400">
                        {row.bookingCode} • #{row.roomNumber}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.isNoShow
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {row.isNoShow ? 'No-Show' : 'Cancelled'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">
                      {row.cancelledAt || row.checkInDate}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatMoney(row.feeKept)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                      {formatMoney(row.refund)}
                    </td>
                    <td className="py-2.5 px-4 max-w-xs">
                      <p className="text-slate-800 font-medium">{row.reason || 'No reason specified'}</p>
                      {row.feeOverrideReason && (
                        <p className="text-[10px] text-amber-700 bg-amber-50 p-1 rounded mt-1 border border-amber-200">
                          <span className="font-bold">Override:</span> {row.feeOverrideReason}
                          {row.feeOverriddenBy ? ` (${row.feeOverriddenBy})` : ''}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100/80 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-slate-800 uppercase tracking-wider text-[11px]">
                    {t('reports.totalFeesRetained', { amount: formatMoney(cancellationsReport.totalFeeKept) })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-950 text-sm">
                    {formatMoney(cancellationsReport.totalFeeKept)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-rose-800 text-sm">
                    {formatMoney(cancellationsReport.totalRefunded)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
