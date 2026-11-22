// @vitest-environment jsdom
// Runs the real HMSProvider in a simulated browser and calls the real functions.
// Setup: npm install -D vitest jsdom   and add  "test": "vitest run"  to package.json scripts.
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { getFolioTotals } from '../src/utils/folio';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const P = 'hms_v2';
const BR = 'branch-1';

const room = (id: string, no: string) => ({ id, roomNumber: no, roomTypeId: 'std', branchId: BR, floor: 1, status: 'available', isActive: true, pricePerNight: 25000 });
const baseRes = (o: any) => ({ id: 'R1', branchId: BR, bookingCode: 'BK-1', roomId: 'r101', roomNumber: '101', roomTypeId: 'std', guestId: 'G1', guestName: 'Ann Test', guestPhone: '1',
  checkInDate: '2026-11-10', checkOutDate: '2026-11-13', adults: 1, children: 0, nightlyRate: 25000, totalNights: 3, totalAmount: 75000, amountPaid: 10000, paymentStatus: 'partial',
  bookingStatus: 'reserved', paymentMethod: 'cash', source: 'phone', createdAt: '2026-11-01 10:00', ...o });
const tx = (id: string, o: any) => ({ id, branchId: BR, reservationId: 'R1', guestId: 'G1', roomNumber: '101', timestamp: '2026-11-01 10:00', recordedBy: 'Test', ...o });

function seed(opts: { discount?: boolean; paid?: number; status?: string; config?: any } = {}) {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem(`${P}_room_types`, JSON.stringify([{ id: 'std', name: 'Standard', code: 'STD', basePrice: 25000, maxOccupancy: 2, capacity: 2, bedType: 'Queen', amenities: [], description: 'x', isActive: true }]));
  localStorage.setItem(`${P}_rooms`, JSON.stringify([room('r101', '101'), room('r102', '102')]));
  localStorage.setItem(`${P}_guests`, JSON.stringify([{ id: 'G1', name: 'Ann Test', phone: '1', email: '', idCardNumber: '', nationality: '', createdAt: '2026-11-01' }]));
  localStorage.setItem(`${P}_reservations`, JSON.stringify([baseRes({ bookingStatus: opts.status || 'reserved' })]));
  const txs: any[] = [tx('t1', { type: 'charge', category: 'room_charge', amount: 75000, description: 'Room' }), tx('t2', { type: 'payment', category: 'deposit', amount: opts.paid ?? 10000, paymentMethod: 'cash', description: 'Deposit' })];
  if (opts.discount) txs.push(tx('t3', { type: 'charge', category: 'discount', amount: -7500, description: 'Discount' }));
  localStorage.setItem(`${P}_transactions`, JSON.stringify(txs));
  localStorage.setItem(`${P}_branch_business_dates`, JSON.stringify({ [BR]: '2026-11-10' }));
  if (opts.config) localStorage.setItem(`${P}_config`, JSON.stringify(opts.config));
  sessionStorage.setItem(`${P}_user`, JSON.stringify({ id: 'u1', name: 'Manager Mia', username: 'mia', role: 'manager', branchId: BR, title: 'GM', email: '', phone: '', isActive: true }));
}

async function boot() {
  const { HMSProvider, useHMS } = await import('../src/context/HMSContext');
  let ctx: any = null;
  const Probe = () => { ctx = useHMS(); return null; };
  document.body.innerHTML = '<div id="root"></div>';
  const root = createRoot(document.getElementById('root')!);
  await act(async () => { root.render(React.createElement(HMSProvider, null, React.createElement(Probe))); });
  return { get: () => ctx, act, root };
}
const balance = (c: any, id = 'R1') => getFolioTotals(c.allTransactions, id).balance;

describe('Money and booking rules on the REAL HMS context (cancel, no-show, reinstate, auto check-out)', () => {
  it('auto no-show then reinstate returns the folio to the exact same balance (with a discount)', async () => {
    seed({ discount: true });
    const app = await boot();
    const before = balance(app.get());
    expect(before).toBe(75000 - 7500 - 10000);
    let r: any; await act(async () => { r = app.get().autoMarkNoShow('R1'); });
    const c1 = app.get(); const res1 = c1.allReservations.find((x: any) => x.id === 'R1');
    expect(r.success).toBe(true);
    expect(res1.bookingStatus).toBe('cancelled'); expect(res1.autoNoShow).toBe(true); expect(res1.isNoShow).toBe(true); expect(res1.settlement).toBe('credit');
    const afterNoShow = getFolioTotals(c1.allTransactions, 'R1');
    console.log('after no-show -> charges', afterNoShow.charges, 'netPaid', afterNoShow.netPaid, 'balance', afterNoShow.balance, '| fee tx:', c1.allTransactions.filter((t: any) => t.category === 'no_show_fee').map((t: any) => t.amount));
    expect(c1.allTransactions.filter((t: any) => t.category === 'no_show_fee' && !t.voided).length).toBe(1);
    expect(c1.allTransactions.filter((t: any) => (t.category === 'room_charge' || t.category === 'discount') && !t.voided).length).toBe(0);
    await act(async () => { r = app.get().reinstateNoShow('R1', 'Guest arrived late'); });
    const c2 = app.get(); const res2 = c2.allReservations.find((x: any) => x.id === 'R1');
    expect(r.success).toBe(true);
    expect(res2.bookingStatus).toBe('reserved'); expect(res2.autoNoShow).toBeUndefined();
    expect(balance(c2)).toBe(before);
    expect(c2.allTransactions.filter((t: any) => t.category === 'no_show_fee' && !t.voided).length).toBe(0);
  });

  it('calling autoMarkNoShow twice in the same moment must not post the fee twice', async () => {
    seed({});
    const app = await boot();
    await act(async () => { app.get().autoMarkNoShow('R1'); app.get().autoMarkNoShow('R1'); });
    const fees = app.get().allTransactions.filter((t: any) => t.category === 'no_show_fee' && !t.voided);
    console.log('fee entries after a double call:', fees.length);
    expect(fees.length).toBe(1);
  });

  it('reinstate is refused when the room was rebooked meanwhile (no money changes)', async () => {
    seed({});
    const app = await boot();
    await act(async () => { app.get().autoMarkNoShow('R1'); });
    // book both rooms of the type for the same dates by other guests
    let ok: any[] = [];
    for (const [id, rid, no] of [['R2', 'r101', '101'], ['R3', 'r102', '102']] as any) {
      await act(async () => { ok.push(app.get().createReservation({ guestName: 'Other ' + id, phone: '9' + id, email: '', idCardNumber: '', nationality: 'X', roomTypeId: 'std', roomId: rid, checkInDate: '2026-11-10', checkOutDate: '2026-11-13', adults: 1, children: 0, source: 'phone', paymentMethod: 'cash', depositAmount: 0 } as any)); });
    }
    console.log('rebooking results:', ok.map((x: any) => x?.success));
    const balBefore = balance(app.get());
    let r: any; await act(async () => { r = app.get().reinstateNoShow('R1', 'Guest arrived late'); });
    console.log('reinstate result when rooms are taken:', JSON.stringify({ success: r.success, key: r.errorKey }));
    expect(r.success).toBe(false);
    expect(balance(app.get())).toBe(balBefore);
  });

  it('reinstate: a reason shorter than 5 characters is refused', async () => {
    seed({});
    const app = await boot();
    await act(async () => { app.get().autoMarkNoShow('R1'); });
    let r: any; await act(async () => { r = app.get().reinstateNoShow('R1', 'abc'); });
    expect(r.success).toBe(false); expect(r.errorKey).toBeTruthy();
  });

  it('manual cancel with fee + refund ends at balance 0, including a prior discount', async () => {
    seed({ discount: true });
    const app = await boot();
    let r: any; await act(async () => { r = app.get().cancelReservation('R1', 'Guest ill', 5000, false, 'refund', 'cash', { suggestedFee: 0 } as any); });
    console.log('cancel result:', JSON.stringify({ success: r.success, key: r.errorKey }));
    const t = getFolioTotals(app.get().allTransactions, 'R1');
    console.log('after cancel -> charges', t.charges, 'netPaid', t.netPaid, 'balance', t.balance);
    expect(r.success).toBe(true); expect(t.balance).toBe(0);
  });

  it('manual cancel called twice in the same moment (double click) must not post the fee twice', async () => {
    seed({});
    const app = await boot();
    await act(async () => { app.get().cancelReservation('R1', 'Guest ill', 5000, false, 'credit', undefined, { suggestedFee: 0 } as any); app.get().cancelReservation('R1', 'Guest ill', 5000, false, 'credit', undefined, { suggestedFee: 0 } as any); });
    const fees = app.get().allTransactions.filter((t: any) => t.category === 'cancellation_fee' && !t.voided);
    console.log('cancellation fee entries after a double call:', fees.length);
    expect(fees.length).toBe(1);
  });

  it('auto check-out: settled guest checked out, room dirty; balance owed and credit are refused', async () => {
    for (const [paid, label] of [[75000, 'settled'], [60000, 'owes 15000'], [80000, 'credit 5000']] as any) {
      seed({ status: 'checked_in', paid, config: { checkOutTime: '12:00', autoCheckOut: 'settled_only', timeZone: 'Africa/Douala' } });
      const rs = JSON.parse(localStorage.getItem(`${P}_rooms`)!); rs[0].status = 'occupied'; rs[0].currentReservationId = 'R1'; localStorage.setItem(`${P}_rooms`, JSON.stringify(rs));
      const app = await boot();
      let r: any; await act(async () => { r = app.get().autoCheckOutGuest('R1'); });
      const res = app.get().allReservations.find((x: any) => x.id === 'R1'); const rm = app.get().allRooms.find((x: any) => x.id === 'r101');
      console.log(label.padEnd(12), '-> success', r.success, 'key', r.errorKey, '| status', res.bookingStatus, '| room', rm.status, '| keyReturned', res.keyReturned);
      if (label === 'settled') { expect(res.bookingStatus).toBe('checked_out'); expect(rm.status).toBe('dirty'); expect(res.keyReturned).toBe(false); }
      else { expect(res.bookingStatus).toBe('checked_in'); expect(r.success).toBe(false); }
    }
  });

  it('auto check-out called twice in the same moment writes one log entry', async () => {
    seed({ status: 'checked_in', paid: 75000, config: { checkOutTime: '12:00', autoCheckOut: 'settled_only', timeZone: 'Africa/Douala' } });
    const app = await boot();
    const before = app.get().staffActivityLogs.filter((l: any) => /Auto check-out/.test(l.action)).length;
    await act(async () => { app.get().autoCheckOutGuest('R1'); app.get().autoCheckOutGuest('R1'); });
    const after = app.get().staffActivityLogs.filter((l: any) => /Auto check-out/.test(l.action)).length;
    console.log('auto check-out log entries after a double call:', after - before);
    expect(after - before).toBe(1);
  });
});
