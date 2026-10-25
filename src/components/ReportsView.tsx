import React, { useState, useMemo } from 'react';
import { useHMS } from '../context/HMSContext';
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
  Sparkles
} from 'lucide-react';

function formatCategoryLabel(cat: string): string {
  switch (cat) {
    case 'room_charge':
      return 'Room Charges (Nightly Accommodation)';
    case 'restaurant':
      return 'Restaurant & Dining Charges';
    case 'beverage':
      return 'Bar & Beverage Charges';
    case 'laundry':
      return 'Laundry & Valet Services';
    case 'maintenance_charge':
      return 'Damage & Maintenance Charges';
    case 'late_checkout':
      return 'Late Check-Out Fees';
    case 'cancellation_fee':
      return 'Cancellation Fees Retained';
    case 'no_show_fee':
      return 'No-Show Penalties';
    case 'tax':
      return 'Taxes & Statutory Levies';
    case 'discount':
      return 'Folio Discounts & Promotional Credits';
    case 'room_charge_void':
      return 'Early Departure Adjustments (Voided Nights)';
    default:
      return cat
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
  }
}

function formatMethodLabel(m: string): string {
  switch (m) {
    case 'cash':
      return 'Physical Cash Drawer';
    case 'momo':
      return 'MTN Mobile Money (MoMo)';
    case 'orange_money':
      return 'Orange Money (OM)';
    case 'card':
      return 'Credit / Debit Card (Electronic POS)';
    case 'bank_transfer':
      return 'Bank Wire / Direct Transfer';
    default:
      return m
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
  }
}

export const ReportsView: React.FC = () => {
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
    if (selectedBranchId === 'all') return 'All Branches (Portfolio)';
    return branches.find((b) => b.id === selectedBranchId)?.name || 'Selected Branch';
  }, [selectedBranchId, branches]);

  // CSV download handlers
  const handleDownloadRevenueCsv = () => {
    const csv = toCsv(revenueReport.rows, [
      { key: 'category', label: 'Category', format: (val) => formatCategoryLabel(String(val)) },
      { key: 'amount', label: `Amount (${hotelConfig.defaultCurrency})` }
    ]);
    downloadCsv(`revenue-by-category-${range.from}-to-${range.to}`, csv);
  };

  const handleDownloadPaymentsCsv = () => {
    const csv = toCsv(paymentsReport.rows, [
      { key: 'method', label: 'Payment Method', format: (val) => formatMethodLabel(String(val)) },
      { key: 'amount', label: `Net Amount (${hotelConfig.defaultCurrency})` }
    ]);
    downloadCsv(`payments-by-method-${range.from}-to-${range.to}`, csv);
  };

  const handleDownloadOccupancyCsv = () => {
    const csv = toCsv(occupancyReport.rows, [
      { key: 'date', label: 'Night (Date)' },
      { key: 'occupiedRooms', label: 'Occupied Rooms' },
      { key: 'totalRooms', label: 'Total Active Rooms' },
      { key: 'occupancyPercent', label: 'Occupancy Rate (%)' }
    ]);
    downloadCsv(`occupancy-and-adr-${range.from}-to-${range.to}`, csv);
  };

  const handleDownloadOutstandingCsv = () => {
    const csv = toCsv(outstandingReport.rows, [
      { key: 'bookingCode', label: 'Booking Code' },
      { key: 'guestName', label: 'Guest Name' },
      { key: 'roomNumber', label: 'Room #' },
      { key: 'guestPhone', label: 'Phone' },
      { key: 'checkInDate', label: 'Check-In' },
      { key: 'checkOutDate', label: 'Check-Out' },
      { key: 'totalCharges', label: `Total Charges (${hotelConfig.defaultCurrency})` },
      { key: 'totalPaid', label: `Total Paid (${hotelConfig.defaultCurrency})` },
      { key: 'balance', label: `Balance Due (${hotelConfig.defaultCurrency})` }
    ]);
    downloadCsv(`outstanding-balances-${range.from}-to-${range.to}`, csv);
  };

  const handleDownloadCancellationsCsv = () => {
    const csv = toCsv(cancellationsReport.rows, [
      { key: 'bookingCode', label: 'Booking Code' },
      { key: 'guestName', label: 'Guest Name' },
      { key: 'roomNumber', label: 'Room #' },
      { key: 'checkInDate', label: 'Scheduled Check-In' },
      { key: 'cancelledAt', label: 'Cancelled / No-Show Date' },
      { key: 'isNoShow', label: 'Status', format: (val) => (val ? 'No-Show' : 'Cancelled') },
      { key: 'feeKept', label: `Fee Retained (${hotelConfig.defaultCurrency})` },
      { key: 'refund', label: `Refund Issued (${hotelConfig.defaultCurrency})` },
      { key: 'reason', label: 'Reason' },
      { key: 'feeOverrideReason', label: 'Fee Override Reason' }
    ]);
    downloadCsv(`cancellations-and-noshows-${range.from}-to-${range.to}`, csv);
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
            <h2 className="text-lg font-bold">MANAGEMENT REPORT</h2>
            <p className="font-semibold text-slate-800">Branch: {activeBranchName}</p>
            <p className="text-slate-600">Period: {fromDate} to {toDate}</p>
            <p className="text-slate-400 text-[10px] mt-1">
              Printed on {new Date().toLocaleString()} by {currentUser?.name} ({currentUser?.role})
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
              Management & Operational Reports
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Financial auditing, revenue breakdown, room occupancy metrics, and debtor analysis.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              title="Print entire report"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end text-xs">
          {/* Branch Picker */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Property Branch</span>
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            >
              {isOwner && (
                <option value="all">All Branches (Consolidated Portfolio)</option>
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
              <span>From Date</span>
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
              <span>To Date</span>
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
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Net Revenue</span>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {formatMoney(revenueReport.total)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Charges net of discounts & voids</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Collections</span>
          <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">
            {formatMoney(paymentsReport.total)}
          </div>
          <span className="text-[10px] text-emerald-600 mt-1 block">Net of refunds across all methods</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Occupancy & ADR</span>
          <div className="text-xl font-bold text-indigo-700 mt-1 font-mono flex items-baseline gap-2">
            <span>{occupancyReport.averageOccupancyPercent}%</span>
            <span className="text-xs font-semibold text-slate-600">ADR: {formatMoney(occupancyReport.adr)}</span>
          </div>
          <span className="text-[10px] text-indigo-600 mt-1 block">
            {occupancyReport.totalOccupiedNights} room nights occupied
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Outstanding Balances</span>
          <div className="text-xl font-bold text-amber-700 mt-1 font-mono">
            {formatMoney(outstandingReport.total)}
          </div>
          <span className="text-[10px] text-amber-600 mt-1 block">
            {outstandingReport.rows.length} checked-in guests with due balance
          </span>
        </div>
      </div>

      {/* SECTION 1: Revenue by Category */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-slate-300 print:shadow-none">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 print:bg-transparent">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Revenue by Category</h3>
              <p className="text-[11px] text-slate-500">
                Detailed charges by department with discounts and room charge voids factored as reductions.
              </p>
            </div>
          </div>
          <button
            onClick={handleDownloadRevenueCsv}
            disabled={revenueReport.rows.length === 0}
            className="no-print px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download CSV</span>
          </button>
        </div>

        {revenueReport.rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No revenue data available</p>
            <p className="text-slate-400 mt-0.5">No billable charges or discounts were recorded in the selected period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Transaction Category</th>
                  <th className="py-2.5 px-4 text-center">Type</th>
                  <th className="py-2.5 px-4 text-right">Amount ({hotelConfig.defaultCurrency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {revenueReport.rows.map((row) => {
                  const isNegative = row.amount < 0 || row.category === 'discount' || row.category === 'room_charge_void';
                  return (
                    <tr key={row.category} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-semibold text-slate-800">
                        {formatCategoryLabel(row.category)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isNegative
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isNegative ? 'Reduction / Credit' : 'Revenue Charge'}
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
                    Total Net Revenue
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
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 print:bg-transparent">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Payments by Payment Method</h3>
              <p className="text-[11px] text-slate-500">
                Cash and digital payment collections. Guest refunds directly reduce the corresponding channel.
              </p>
            </div>
          </div>
          <button
            onClick={handleDownloadPaymentsCsv}
            disabled={paymentsReport.rows.length === 0}
            className="no-print px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download CSV</span>
          </button>
        </div>

        {paymentsReport.rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No payment records found</p>
            <p className="text-slate-400 mt-0.5">No guest payments or refunds were logged during this range.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Payment Method / Gateway</th>
                  <th className="py-2.5 px-4 text-right">Net Collections ({hotelConfig.defaultCurrency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentsReport.rows.map((row) => (
                  <tr key={row.method} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span>{formatMethodLabel(String(row.method))}</span>
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
                    Total Payments Received (Net of Refunds)
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
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 print:bg-transparent">
          <div className="flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-teal-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Occupancy & Average Daily Rate (ADR)</h3>
              <p className="text-[11px] text-slate-500">
                Nightly room utilization for checked-in and completed stays across active inventory.
              </p>
            </div>
          </div>
          <button
            onClick={handleDownloadOccupancyCsv}
            disabled={occupancyReport.rows.length === 0}
            className="no-print px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download CSV</span>
          </button>
        </div>

        {/* Occupancy Summary Stats Bar */}
        <div className="p-4 bg-teal-50/40 border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Active Inventory</span>
            <div className="font-bold text-slate-900 mt-0.5">{occupancyReport.totalRooms} Rooms</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Room Nights Occupied</span>
            <div className="font-bold text-teal-700 mt-0.5">{occupancyReport.totalOccupiedNights} Nights</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Average Occupancy</span>
            <div className="font-bold text-slate-900 mt-0.5">{occupancyReport.averageOccupancyPercent}%</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Average Daily Rate (ADR)</span>
            <div className="font-bold text-slate-900 mt-0.5 font-mono">{formatMoney(occupancyReport.adr)}</div>
          </div>
        </div>

        {occupancyReport.rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <BedDouble className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No occupancy data available</p>
            <p className="text-slate-400 mt-0.5">No nights found within the specified date range.</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Night (Date)</th>
                  <th className="py-2.5 px-4 text-center">Occupied Rooms</th>
                  <th className="py-2.5 px-4 text-center">Total Active Rooms</th>
                  <th className="py-2.5 px-4 text-right">Occupancy Rate (%)</th>
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
        )}
      </section>

      {/* SECTION 4: Outstanding Balances */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-slate-300 print:shadow-none">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 print:bg-transparent">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Outstanding In-House Balances</h3>
              <p className="text-[11px] text-slate-500">
                Currently checked-in guests with unpaid charges and pending settlement.
              </p>
            </div>
          </div>
          <button
            onClick={handleDownloadOutstandingCsv}
            disabled={outstandingReport.rows.length === 0}
            className="no-print px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download CSV</span>
          </button>
        </div>

        {outstandingReport.rows.length === 0 ? (
          <div className="p-8 text-center text-emerald-700 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-slate-800">All Guest Folios Balanced</p>
            <p className="text-slate-500 mt-0.5">There are no checked-in guests with outstanding receivables.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Booking / Guest</th>
                  <th className="py-2.5 px-4 text-center">Room #</th>
                  <th className="py-2.5 px-4">Phone</th>
                  <th className="py-2.5 px-4">Stay Dates</th>
                  <th className="py-2.5 px-4 text-right">Total Charges</th>
                  <th className="py-2.5 px-4 text-right">Amount Paid</th>
                  <th className="py-2.5 px-4 text-right">Balance Due</th>
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
                      Room #{row.roomNumber}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">
                      {row.guestPhone}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">
                      {row.checkInDate} → {row.checkOutDate}
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
                    Total Pending Receivables
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
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 print:bg-transparent">
          <div className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-rose-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Cancellations & No-Shows</h3>
              <p className="text-[11px] text-slate-500">
                Cancelled reservations and no-shows within the date range, audited with penalties and refunds.
              </p>
            </div>
          </div>
          <button
            onClick={handleDownloadCancellationsCsv}
            disabled={cancellationsReport.rows.length === 0}
            className="no-print px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download CSV</span>
          </button>
        </div>

        {cancellationsReport.rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <UserX className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No cancellations or no-shows</p>
            <p className="text-slate-400 mt-0.5">Zero booking cancellations or no-shows recorded during this reporting window.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Booking / Guest</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4">Date Recorded</th>
                  <th className="py-2.5 px-4 text-right">Fee Kept</th>
                  <th className="py-2.5 px-4 text-right">Refund Issued</th>
                  <th className="py-2.5 px-4">Reason & Audit Overrides</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cancellationsReport.rows.map((row) => (
                  <tr key={row.reservationId} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-slate-900">{row.guestName}</div>
                      <span className="font-mono text-[10px] text-slate-400">
                        {row.bookingCode} • Room #{row.roomNumber}
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
                    Total Retained / Refunded
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
