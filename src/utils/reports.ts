import {
  FolioTransaction,
  Reservation,
  Room,
  PaymentMethod
} from '../types/hms';
import { getFolioTotals } from './folio';
import { addDaysToLocalDate } from './dateUtils';

export interface ReportRange {
  branchId?: string; // branch id or 'all'
  from: string;      // YYYY-MM-DD
  to: string;        // YYYY-MM-DD
}

export interface RevenueCategoryRow {
  category: string;
  amount: number;
}

export type RevenueByCategoryResult = RevenueCategoryRow[] & {
  rows: RevenueCategoryRow[];
  total: number;
};

/**
 * Builds revenue totals grouped by transaction category for non-voided charges.
 * Discounts and room_charge_void are shown as negative amounts, plus a total.
 */
export function buildRevenueByCategory(
  transactions: FolioTransaction[],
  range: ReportRange
): RevenueByCategoryResult {
  const catTotals = new Map<string, number>();

  for (const t of transactions) {
    if (t.voided) continue;

    // Filter by branch
    if (range.branchId && range.branchId !== 'all' && t.branchId && t.branchId !== range.branchId) {
      continue;
    }

    // Filter by date range (first 10 characters: YYYY-MM-DD)
    const day = t.timestamp ? t.timestamp.slice(0, 10) : '';
    if (day < range.from || day > range.to) {
      continue;
    }

    // Only charges or adjustments (discounts / voids)
    const isDiscountOrVoid = t.category === 'discount' || t.category === 'room_charge_void';
    if (t.type !== 'charge' && !isDiscountOrVoid) {
      continue;
    }

    const cat = t.category;
    let amt = t.amount;
    if (isDiscountOrVoid) {
      amt = -Math.abs(amt);
    }

    catTotals.set(cat, (catTotals.get(cat) || 0) + amt);
  }

  // Define preferred display order for neat presentation
  const preferredOrder = [
    'room_charge',
    'restaurant',
    'beverage',
    'laundry',
    'maintenance_charge',
    'late_checkout',
    'cancellation_fee',
    'no_show_fee',
    'tax',
    'discount',
    'room_charge_void'
  ];

  const rows: RevenueCategoryRow[] = [];
  for (const cat of preferredOrder) {
    if (catTotals.has(cat)) {
      rows.push({ category: cat, amount: catTotals.get(cat)! });
      catTotals.delete(cat);
    }
  }
  // Any leftover categories
  for (const [category, amount] of catTotals.entries()) {
    rows.push({ category, amount });
  }

  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  const result = [...rows] as RevenueByCategoryResult;
  result.rows = rows;
  result.total = total;
  return result;
}

export interface PaymentMethodRow {
  method: PaymentMethod | string;
  amount: number;
}

export type PaymentsByMethodResult = PaymentMethodRow[] & {
  rows: PaymentMethodRow[];
  total: number;
};

/**
 * Builds payments grouped by payment method across the date range.
 * Refunds reduce the method's total, plus a total.
 */
export function buildPaymentsByMethod(
  transactions: FolioTransaction[],
  range: ReportRange
): PaymentsByMethodResult {
  const methodTotals = new Map<string, number>();

  for (const t of transactions) {
    if (t.voided) continue;

    // Filter by branch
    if (range.branchId && range.branchId !== 'all' && t.branchId && t.branchId !== range.branchId) {
      continue;
    }

    // Filter by date range (first 10 chars)
    const day = t.timestamp ? t.timestamp.slice(0, 10) : '';
    if (day < range.from || day > range.to) {
      continue;
    }

    // Only payments and refunds
    const isPaymentType = t.type === 'payment';
    const isRefundCat = t.category === 'refund';
    if (!isPaymentType && !isRefundCat) {
      continue;
    }

    const method = t.paymentMethod || 'cash';
    let delta = t.amount;
    if (isRefundCat) {
      delta = -Math.abs(t.amount);
    }

    methodTotals.set(method, (methodTotals.get(method) || 0) + delta);
  }

  const preferredMethods: PaymentMethod[] = ['cash', 'momo', 'orange_money', 'card', 'bank_transfer'];
  const rows: PaymentMethodRow[] = [];

  for (const m of preferredMethods) {
    if (methodTotals.has(m)) {
      rows.push({ method: m, amount: methodTotals.get(m)! });
      methodTotals.delete(m);
    }
  }
  for (const [method, amount] of methodTotals.entries()) {
    rows.push({ method, amount });
  }

  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  const result = [...rows] as PaymentsByMethodResult;
  result.rows = rows;
  result.total = total;
  return result;
}

export interface OccupancyRow {
  date: string;
  occupiedRooms: number;
  totalRooms: number;
  occupancyPercent: number;
}

export type OccupancyResult = OccupancyRow[] & {
  rows: OccupancyRow[];
  totalOccupiedNights: number;
  totalAvailableNights: number;
  averageOccupancyPercent: number;
  roomRevenue: number;
  adr: number;
  ADR: number;
  totalRooms: number;
};

/**
 * Builds occupancy per night for the specified range.
 * One row per night { date, occupiedRooms, totalRooms, occupancyPercent }
 * counting reservations with status 'checked_in' or 'checked_out' where checkIn <= night < checkOut,
 * and only active rooms of the branch.
 * Calculates ADR = room revenue / occupied room nights for the period.
 */
export function buildOccupancy(
  reservations: Reservation[],
  rooms: Room[],
  range: ReportRange
): OccupancyResult {
  // Filter active rooms in target branch
  const activeRooms = rooms.filter((r) => {
    if (r.isActive === false) return false;
    if (range.branchId && range.branchId !== 'all') {
      const bId = r.branchId || 'branch-1';
      return bId === range.branchId;
    }
    return true;
  });
  const totalRoomsCount = activeRooms.length;

  // Filter reservations by status and branch
  const eligibleReservations = reservations.filter((r) => {
    if (r.bookingStatus !== 'checked_in' && r.bookingStatus !== 'checked_out') {
      return false;
    }
    if (range.branchId && range.branchId !== 'all') {
      const bId = r.branchId || 'branch-1';
      return bId === range.branchId;
    }
    return true;
  });

  const rows: OccupancyRow[] = [];
  let totalRoomRevenue = 0;

  // Step through each night from range.from to range.to
  let curr = range.from;
  while (curr <= range.to) {
    const night = curr;
    // Count reservations where checkIn <= night < checkOut
    const matching = eligibleReservations.filter(
      (r) => r.checkInDate <= night && night < r.checkOutDate
    );
    const occupiedRooms = matching.length;
    const occupancyPercent = totalRoomsCount > 0
      ? Math.round((occupiedRooms / totalRoomsCount) * 1000) / 10
      : 0;

    rows.push({
      date: night,
      occupiedRooms,
      totalRooms: totalRoomsCount,
      occupancyPercent
    });

    // Room revenue for this night based on nightly rates
    for (const res of matching) {
      const rate = res.nightlyRate || (res.totalNights > 0 ? Math.round(res.totalAmount / res.totalNights) : 0);
      totalRoomRevenue += rate;
    }

    curr = addDaysToLocalDate(curr, 1);
  }

  const totalOccupiedNights = rows.reduce((sum, r) => sum + r.occupiedRooms, 0);
  const totalAvailableNights = rows.reduce((sum, r) => sum + r.totalRooms, 0);
  const averageOccupancyPercent = totalAvailableNights > 0
    ? Math.round((totalOccupiedNights / totalAvailableNights) * 1000) / 10
    : 0;
  const adr = totalOccupiedNights > 0 ? Math.round(totalRoomRevenue / totalOccupiedNights) : 0;

  const result = [...rows] as OccupancyResult;
  result.rows = rows;
  result.totalOccupiedNights = totalOccupiedNights;
  result.totalAvailableNights = totalAvailableNights;
  result.averageOccupancyPercent = averageOccupancyPercent;
  result.roomRevenue = totalRoomRevenue;
  result.adr = adr;
  result.ADR = adr;
  result.totalRooms = totalRoomsCount;
  return result;
}

export interface OutstandingBalanceRow {
  reservationId: string;
  bookingCode: string;
  guestName: string;
  guestPhone: string;
  roomNumber: string;
  branchId?: string;
  checkInDate: string;
  checkOutDate: string;
  totalCharges: number;
  totalPaid: number;
  balance: number;
}

export type OutstandingBalancesResult = OutstandingBalanceRow[] & {
  rows: OutstandingBalanceRow[];
  total: number;
};

/**
 * Builds list of guests with status 'checked_in' whose getFolioTotals balance is above 0.
 */
export function buildOutstandingBalances(
  reservations: Reservation[],
  transactions: FolioTransaction[],
  rangeOrBranchId?: ReportRange | string
): OutstandingBalancesResult {
  const branchId = typeof rangeOrBranchId === 'string'
    ? rangeOrBranchId
    : rangeOrBranchId?.branchId;

  const rows: OutstandingBalanceRow[] = [];

  for (const r of reservations) {
    if (r.bookingStatus !== 'checked_in') continue;

    if (branchId && branchId !== 'all') {
      const bId = r.branchId || 'branch-1';
      if (bId !== branchId) continue;
    }

    const totals = getFolioTotals(transactions, r.id);
    if (totals.balance > 0) {
      rows.push({
        reservationId: r.id,
        bookingCode: r.bookingCode,
        guestName: r.guestName,
        guestPhone: r.guestPhone,
        roomNumber: r.roomNumber,
        branchId: r.branchId,
        checkInDate: r.checkInDate,
        checkOutDate: r.checkOutDate,
        totalCharges: totals.charges,
        totalPaid: totals.netPaid,
        balance: totals.balance
      });
    }
  }

  // Sort by highest balance due first
  rows.sort((a, b) => b.balance - a.balance);

  const total = rows.reduce((sum, r) => sum + r.balance, 0);

  const result = [...rows] as OutstandingBalancesResult;
  result.rows = rows;
  result.total = total;
  return result;
}

export interface CancellationReportRow {
  reservationId: string;
  bookingCode: string;
  guestName: string;
  guestPhone: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  cancelledAt: string;
  isNoShow: boolean;
  feeKept: number;
  refund: number;
  reason: string;
  feeOverrideReason: string;
  feeOverriddenBy?: string;
}

export type CancellationsResult = CancellationReportRow[] & {
  rows: CancellationReportRow[];
  totalFeeKept: number;
  totalRefunded: number;
};

/**
 * Builds cancelled and no-show bookings in the range with fee kept, refund, reason
 * and any fee override reason.
 */
export function buildCancellations(
  reservations: Reservation[],
  range: ReportRange
): CancellationsResult {
  const rows: CancellationReportRow[] = [];

  for (const r of reservations) {
    if (r.bookingStatus !== 'cancelled') continue;

    if (range.branchId && range.branchId !== 'all') {
      const bId = r.branchId || 'branch-1';
      if (bId !== range.branchId) continue;
    }

    // Determine event date for range comparison
    const eventDay = r.cancelledAt ? r.cancelledAt.slice(0, 10) : r.checkInDate;
    if (eventDay < range.from || eventDay > range.to) {
      continue;
    }

    const isNoShow = (r.cancellationReason || '').toLowerCase().startsWith('no-show');

    rows.push({
      reservationId: r.id,
      bookingCode: r.bookingCode,
      guestName: r.guestName,
      guestPhone: r.guestPhone,
      roomNumber: r.roomNumber,
      checkInDate: r.checkInDate,
      checkOutDate: r.checkOutDate,
      cancelledAt: r.cancelledAt || '',
      isNoShow,
      feeKept: r.cancellationFee ?? 0,
      refund: r.refundAmount ?? 0,
      reason: r.cancellationReason || '',
      feeOverrideReason: r.feeOverrideReason || '',
      feeOverriddenBy: r.feeOverriddenBy || ''
    });
  }

  // Sort descending by event date / cancelledAt
  rows.sort((a, b) => (b.cancelledAt || b.checkInDate).localeCompare(a.cancelledAt || a.checkInDate));

  const totalFeeKept = rows.reduce((sum, r) => sum + r.feeKept, 0);
  const totalRefunded = rows.reduce((sum, r) => sum + r.refund, 0);

  const result = [...rows] as CancellationsResult;
  result.rows = rows;
  result.totalFeeKept = totalFeeKept;
  result.totalRefunded = totalRefunded;
  return result;
}

export interface CsvColumnConfig<T = any> {
  key: keyof T | string;
  label: string;
  format?: (val: any, row: T) => string | number;
}

export type CsvColumn<T = any> = string | CsvColumnConfig<T>;

/**
 * Escapes CSV field per RFC 4180 (quotes commas, double quotes, and line breaks).
 */
export function escapeCsvValue(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serializes rows and column configurations into a CSV string.
 * Escapes commas, quotes, and line breaks.
 */
export function toCsv<T = any>(
  rows: T[],
  columns: CsvColumn<T>[]
): string {
  if (!columns || columns.length === 0) return '';

  const colConfigs: CsvColumnConfig<T>[] = columns.map((col) => {
    if (typeof col === 'string') {
      return { key: col, label: col };
    }
    return col;
  });

  const headerLine = colConfigs.map((c) => escapeCsvValue(c.label)).join(',');
  const rowLines = rows.map((row: any) =>
    colConfigs
      .map((c) => {
        const rawVal = row[c.key];
        const formatted = c.format ? c.format(rawVal, row) : rawVal;
        return escapeCsvValue(formatted);
      })
      .join(',')
  );

  return [headerLine, ...rowLines].join('\r\n');
}

/**
 * Triggers client-side download of a CSV string with a UTF-8 BOM so Excel properly
 * displays accents and special characters (such as FCFA).
 */
export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
