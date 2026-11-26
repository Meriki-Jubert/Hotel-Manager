import { describe, it, expect } from 'vitest';
import { buildRevenueByCategory, buildPaymentsByMethod, buildOccupancy, buildOutstandingBalances, buildCancellations, buildStockMovementsReport, toCsv } from '../../src/utils/reports';

const R = { branchId: 'b1', from: '2026-11-01', to: '2026-11-30' };

describe('revenue by category', () => {
  const tx: any[] = [
    { reservationId: 'x', branchId: 'b1', timestamp: '2026-11-05 10:00', type: 'charge', category: 'room_charge', amount: 75000, voided: true },
    { reservationId: 'y', branchId: 'b1', timestamp: '2026-11-06 10:00', type: 'charge', category: 'room_charge', amount: 50000 },
    { reservationId: 'y', branchId: 'b1', timestamp: '2026-11-07 10:00', type: 'charge', category: 'restaurant', amount: 5000 },
    { reservationId: 'y', branchId: 'b1', timestamp: '2026-11-07 11:00', type: 'charge', category: 'discount', amount: -7500 },
    { reservationId: 'y', branchId: 'b1', timestamp: '2026-11-08 11:00', type: 'charge', category: 'room_charge_void', amount: -25000 },
    { reservationId: 'z', branchId: 'b1', timestamp: '2026-11-09 11:00', type: 'charge', category: 'cancellation_fee', amount: 5000 },
    { reservationId: 'w', branchId: 'b1', timestamp: '2026-12-01 09:00', type: 'charge', category: 'room_charge', amount: 99999 },
    { reservationId: 'v', branchId: 'b2', timestamp: '2026-11-10 09:00', type: 'charge', category: 'room_charge', amount: 88888 },
    { reservationId: 'y', branchId: 'b1', timestamp: '2026-11-10 09:00', type: 'payment', category: 'payment', amount: 20000, paymentMethod: 'cash' }
  ];
  it('ignores voided, out-of-range, other-branch entries and payments; discounts are negative', () => {
    const r = buildRevenueByCategory(tx, R);
    expect(r.rows).toEqual([
      { category: 'room_charge', amount: 50000 }, { category: 'restaurant', amount: 5000 }, { category: 'cancellation_fee', amount: 5000 },
      { category: 'discount', amount: -7500 }, { category: 'room_charge_void', amount: -25000 }
    ]);
    expect(r.total).toBe(27500);
  });
  it('all branches includes the other branch; range ends are inclusive', () => {
    expect(buildRevenueByCategory(tx, { ...R, branchId: 'all' }).rows.find((x) => x.category === 'room_charge')?.amount).toBe(50000 + 88888);
    expect(buildRevenueByCategory(tx, { branchId: 'b1', from: '2026-11-06', to: '2026-11-06' }).total).toBe(50000);
  });
});

describe('payments by method', () => {
  const pay: any[] = [
    { branchId: 'b1', timestamp: '2026-11-05 10:00', type: 'payment', category: 'deposit', amount: 10000, paymentMethod: 'cash' },
    { branchId: 'b1', timestamp: '2026-11-05 10:05', type: 'payment', category: 'payment', amount: 15000, paymentMethod: 'momo' },
    { branchId: 'b1', timestamp: '2026-11-06 10:00', type: 'payment', category: 'refund', amount: -5000, paymentMethod: 'momo' },
    { branchId: 'b1', timestamp: '2026-11-06 10:00', type: 'payment', category: 'payment', amount: 7000, paymentMethod: 'cash', voided: true },
    { branchId: 'b1', timestamp: '2026-11-07 10:00', type: 'payment', category: 'payment', amount: 3000 }
  ];
  it('refunds reduce the method, voided are ignored, a missing method counts as cash', () => {
    const r = buildPaymentsByMethod(pay, R);
    expect(r.rows).toEqual([{ method: 'cash', amount: 13000 }, { method: 'momo', amount: 10000 }]);
    expect(r.total).toBe(23000);
  });
});

describe('occupancy and ADR', () => {
  const rooms: any[] = [{ id: 'r1', branchId: 'b1', isActive: true }, { id: 'r2', branchId: 'b1', isActive: true }, { id: 'r3', branchId: 'b1', isActive: false }, { id: 'r4', branchId: 'b2', isActive: true }];
  const res = (id: string, st: string, ci: string, co: string, rate: number, b = 'b1') => ({ id, branchId: b, bookingStatus: st, checkInDate: ci, checkOutDate: co, nightlyRate: rate, totalNights: 1, totalAmount: rate }) as any;
  const rs = [res('A', 'checked_in', '2026-11-01', '2026-11-04', 25000), res('B', 'checked_out', '2026-11-02', '2026-11-03', 30000), res('C', 'reserved', '2026-11-01', '2026-11-04', 99999), res('D', 'cancelled', '2026-11-01', '2026-11-04', 99999), res('E', 'checked_in', '2026-11-01', '2026-11-04', 77777, 'b2')];
  it('counts per night; the check-out day is free; reserved, cancelled and other branches are ignored', () => {
    const oc = buildOccupancy(rs, rooms, { branchId: 'b1', from: '2026-11-01', to: '2026-11-04' });
    expect(oc.rows.map((r) => r.occupiedRooms)).toEqual([1, 2, 1, 0]);
    expect(oc.totalRooms).toBe(2);
    expect(oc.averageOccupancyPercent).toBe(50);
    expect(oc.roomRevenue).toBe(105000);
    expect(oc.adr).toBe(26250);
  });
  it('a stay crossing the range edge only counts its in-range nights', () => {
    expect(buildOccupancy([res('S', 'checked_in', '2026-10-30', '2026-11-03', 10000)], rooms, { branchId: 'b1', from: '2026-11-01', to: '2026-11-02' }).totalOccupiedNights).toBe(2);
  });
  it('an empty hotel does not divide by zero', () => {
    const oc = buildOccupancy([], [], { branchId: 'b1', from: '2026-11-01', to: '2026-11-02' });
    expect(oc.averageOccupancyPercent).toBe(0); expect(oc.adr).toBe(0);
  });
});

describe('outstanding balances and cancellations', () => {
  it('lists checked-in guests with a positive balance, ignoring voided charges', () => {
    const rsv: any[] = [{ id: 'A', branchId: 'b1', bookingStatus: 'checked_in', bookingCode: 'BK1', guestName: 'Ann', guestPhone: '1', roomNumber: '101', checkInDate: '2026-11-01', checkOutDate: '2026-11-04' }];
    const t: any[] = [
      { reservationId: 'A', type: 'charge', category: 'room_charge', amount: 75000 },
      { reservationId: 'A', type: 'payment', category: 'deposit', amount: 20000 },
      { reservationId: 'A', type: 'charge', category: 'restaurant', amount: 5000, voided: true }
    ];
    expect(buildOutstandingBalances(rsv, t, 'b1').rows.map((r) => r.balance)).toEqual([55000]);
  });
  it('lists cancellations in range, detects no-shows, totals fee and refunds', () => {
    const c = (id: string, reason: string, at: string, fee: number, refund: number, extra: any = {}) => ({ id, branchId: 'b1', bookingStatus: 'cancelled', bookingCode: id, guestName: 'g', guestPhone: 'p', roomNumber: '1', checkInDate: '2026-11-20', checkOutDate: '2026-11-22', cancelledAt: at, cancellationReason: reason, cancellationFee: fee, refundAmount: refund, ...extra }) as any;
    const r = buildCancellations([c('c1', 'No-Show: did not arrive', '2026-11-20 09:00', 25000, 0), c('c2', 'Guest ill', '2026-11-10 09:00', 5000, 5000), c('c3', 'Old', '2026-10-10 09:00', 1000, 0), c('c4', 'x', '2026-11-12 09:00', 25000, 0, { isNoShow: true, autoNoShow: true })], R);
    // newest cancellation first
    expect(r.rows.map((x) => [x.bookingCode, x.isNoShow])).toEqual([['c1', true], ['c4', true], ['c2', false]]);
    expect(r.totalFeeKept).toBe(55000); expect(r.totalRefunded).toBe(5000);
  });
});

describe('stock movements report', () => {
  const items: any[] = [{ id: 'beer', name: 'Club Beer', trackStock: true, unit: 'bottle' }];
  const mv = (type: string, quantity: number, createdAt: string, branchId = 'b1') => ({ id: Math.random() + '', branchId, itemId: 'beer', type, quantity, createdAt }) as any;
  it('summarises received, sold, wasted, adjusted and the closing level for the range', () => {
    const r = buildStockMovementsReport(items, [mv('opening', 24, '2026-10-20 08:00'), mv('receive', 12, '2026-11-02 08:00'), mv('sale', -5, '2026-11-03 20:00'), mv('waste', -2, '2026-11-04 09:00'), mv('adjust', -1, '2026-11-05 09:00'), mv('receive', 99, '2026-12-05 09:00'), mv('receive', 50, '2026-11-06 09:00', 'b2')], R);
    const row = r.rows.find((x) => x.itemId === 'beer')!;
    expect(row).toMatchObject({ received: 12, sold: 5, wasted: 2, adjusted: -1, closingLevel: 24 + 12 - 5 - 2 - 1 });
  });
});

describe('CSV export', () => {
  const line = (v: any) => toCsv([{ a: v }], ['a']).split('\r\n')[1];
  it('escapes commas, quotes and line breaks', () => {
    expect(toCsv([{ n: 'Doe, John', m: 'He said "hi"', x: 'a\nb' }], ['n', 'm', 'x']).split('\r\n')[1]).toBe('"Doe, John","He said ""hi""","a\nb"');
  });
  it('neutralises spreadsheet formulas in text, but keeps real numbers numeric', () => {
    for (const bad of ['=1+1', '+cmd', '-2+3', '@SUM(A1)']) expect(line(bad).startsWith("'")).toBe(true);
    expect(line(-5000)).toBe('-5000'); expect(line(0)).toBe('0'); expect(line('normal text')).toBe('normal text');
  });
});
