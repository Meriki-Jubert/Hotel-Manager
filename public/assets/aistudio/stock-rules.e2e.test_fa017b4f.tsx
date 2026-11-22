// @vitest-environment jsdom
// Real HMSProvider in a simulated browser: stock rules, POS sales, roles, branches.
import { describe, it, expect } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { getStockLevel } from '../src/utils/stock';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const P = 'hms_v2', B1 = 'branch-1', B2 = 'branch-2';
const items = [
  { id: 'beer', name: 'Club Beer', category: 'Beverages', price: 1000, available: true, isActive: true, trackStock: true, lowStockThreshold: 5, unit: 'bottle' },
  { id: 'rice', name: 'Rice Plate', category: 'Meals', price: 3000, available: true, isActive: true, trackStock: false },
  { id: 'sold', name: 'Sold Out Item', category: 'Snacks', price: 500, available: false, isActive: true, trackStock: false }
];
function seed(role = 'front_desk', stock = 5, opts: { twoBranches?: boolean } = {}) {
  localStorage.clear(); sessionStorage.clear();
  const branches = [{ id: B1, name: 'Main', city: 'Buea', address: '', phone: '', isActive: true }];
  if (opts.twoBranches) branches.push({ id: B2, name: 'Second', city: 'Limbe', address: '', phone: '', isActive: true });
  localStorage.setItem(`${P}_branches`, JSON.stringify(branches));
  localStorage.setItem(`${P}_room_types`, JSON.stringify([{ id: 'std', name: 'Standard', code: 'STD', basePrice: 25000, capacity: 2, bedType: 'Q', amenities: [], description: 'x', isActive: true }]));
  localStorage.setItem(`${P}_rooms`, JSON.stringify([{ id: 'r101', roomNumber: '101', roomTypeId: 'std', branchId: B1, floor: 1, status: 'occupied', currentReservationId: 'R1', isActive: true, pricePerNight: 25000 }]));
  localStorage.setItem(`${P}_guests`, JSON.stringify([{ id: 'G1', name: 'Ann', phone: '1', email: '', idCardNumber: '1', nationality: '', createdAt: '2026-11-01' }]));
  localStorage.setItem(`${P}_reservations`, JSON.stringify([
    { id: 'R1', branchId: B1, bookingCode: 'BK-1', roomId: 'r101', roomNumber: '101', roomTypeId: 'std', guestId: 'G1', guestName: 'Ann', guestPhone: '1', checkInDate: '2026-11-20', checkOutDate: '2026-11-30', adults: 1, children: 0, nightlyRate: 25000, totalNights: 10, totalAmount: 250000, amountPaid: 0, paymentStatus: 'unpaid', bookingStatus: 'checked_in', paymentMethod: 'cash', source: 'phone', createdAt: '2026-11-01 10:00' },
    { id: 'R2', branchId: B1, bookingCode: 'BK-2', roomId: 'r101', roomNumber: '101', roomTypeId: 'std', guestId: 'G1', guestName: 'Ann', guestPhone: '1', checkInDate: '2026-12-20', checkOutDate: '2026-12-22', adults: 1, children: 0, nightlyRate: 25000, totalNights: 2, totalAmount: 50000, amountPaid: 0, paymentStatus: 'unpaid', bookingStatus: 'reserved', paymentMethod: 'cash', source: 'phone', createdAt: '2026-11-01 10:00' }
  ]));
  localStorage.setItem(`${P}_transactions`, JSON.stringify([]));
  localStorage.setItem(`${P}_pos_items`, JSON.stringify(items));
  localStorage.setItem(`${P}_stock_movements`, JSON.stringify(stock > 0 ? [{ id: 'sm0', branchId: B1, itemId: 'beer', type: 'opening', quantity: stock, createdAt: '2026-11-01 08:00', recordedBy: 'T' }] : []));
  localStorage.setItem(`${P}_branch_business_dates`, JSON.stringify({ [B1]: '2026-11-22', [B2]: '2026-11-22' }));
  localStorage.setItem(`${P}_active_branch`, role === 'owner' ? 'all' : B1);
  sessionStorage.setItem(`${P}_user`, JSON.stringify({ id: 'u1', name: 'Tester', username: 't', role, branchId: role === 'owner' ? undefined : B1, title: '', email: '', phone: '', isActive: true }));
}
async function boot() {
  const { HMSProvider, useHMS } = await import('../src/context/HMSContext');
  let ctx: any = null; const Probe = () => { ctx = useHMS(); return null; };
  document.body.innerHTML = '<div id="root"></div>';
  const root = createRoot(document.getElementById('root')!);
  await act(async () => { root.render(React.createElement(HMSProvider, null, React.createElement(Probe))); });
  return { get: () => ctx };
}
const level = (c: any, id = 'beer', br = B1) => getStockLevel(c.allStockMovements ?? c.stockMovements, id, br);
const charges = (c: any) => c.allTransactions.filter((t: any) => t.category === 'restaurant' && t.reservationId === 'R1');
const room = (lines: any[], extra: any = {}) => ({ lines, mode: 'room', reservationId: 'R1', ...extra });
const tick = () => act(async () => { await new Promise(r => setTimeout(r, 5)); });

describe('Stock rules on the REAL context', () => {
  it('sale of 3 from 5 leaves 2, posts ONE folio charge and ONE sale movement linked to the booking', async () => {
    seed(); const app = await boot();
    let r: any; await act(async () => { r = app.get().processPosOrder(room([{ itemId: 'beer', qty: 3 }])); });
    const c = app.get(); const sale = (c.allStockMovements ?? c.stockMovements).filter((m: any) => m.type === 'sale');
    expect(r.success).toBe(true); expect(level(c)).toBe(2); expect(charges(c).length).toBe(1); expect(charges(c)[0].amount).toBe(3000);
    expect(sale.length).toBe(1); expect(sale[0].quantity).toBe(-3); expect(sale[0].reservationId).toBe('R1');
  });
  it('order of 6 with 5 in stock is refused and nothing changes (no charge, no movement)', async () => {
    seed(); const app = await boot();
    let r: any; await act(async () => { r = app.get().processPosOrder(room([{ itemId: 'beer', qty: 6 }])); });
    const c = app.get(); expect(r.success).toBe(false); expect(r.errorKey).toBe('err.stock.insufficient'); expect(level(c)).toBe(5); expect(charges(c).length).toBe(0);
  });
  it('the same order twice in the same moment sells once', async () => {
    seed(); const app = await boot();
    await act(async () => { app.get().processPosOrder(room([{ itemId: 'beer', qty: 2 }])); app.get().processPosOrder(room([{ itemId: 'beer', qty: 2 }])); });
    const c = app.get(); expect(level(c)).toBe(3); expect(charges(c).length).toBe(1);
  });
  it('two real orders on different ticks both sell; the next one at 0 is refused', async () => {
    seed(); const app = await boot();
    await act(async () => { app.get().processPosOrder(room([{ itemId: 'beer', qty: 3 }])); }); await tick();
    await act(async () => { app.get().processPosOrder(room([{ itemId: 'beer', qty: 2 }])); }); await tick();
    expect(level(app.get())).toBe(0);
    let r: any; await act(async () => { r = app.get().processPosOrder(room([{ itemId: 'beer', qty: 1 }])); });
    expect(r.success).toBe(false); expect(level(app.get())).toBe(0); expect(charges(app.get()).length).toBe(2);
  });
  it('several lines of the same item are added up before checking stock (2 + 2 with 3 in stock)', async () => {
    seed('front_desk', 3); const app = await boot();
    let r: any; await act(async () => { r = app.get().processPosOrder(room([{ itemId: 'beer', qty: 2 }, { itemId: 'beer', qty: 2 }])); });
    expect(r.success).toBe(false); expect(level(app.get())).toBe(3);
  });
  it('untracked items sell without touching stock; an item switched off ("In stock today") is refused', async () => {
    seed(); const app = await boot();
    let r: any; await act(async () => { r = app.get().processPosOrder(room([{ itemId: 'rice', qty: 2 }])); });
    expect(r.success).toBe(true); expect(level(app.get())).toBe(5); expect(charges(app.get()).length).toBe(1);
    await tick(); await act(async () => { r = app.get().processPosOrder(room([{ itemId: 'sold', qty: 1 }])); });
    expect(r.success).toBe(false);
  });
  it('a room order for a guest who is not checked in is refused WITHOUT taking stock', async () => {
    seed(); const app = await boot();
    let r: any; await act(async () => { r = app.get().processPosOrder({ lines: [{ itemId: 'beer', qty: 2 }], mode: 'room', reservationId: 'R2' }); });
    expect(r.success).toBe(false); expect(level(app.get())).toBe(5);
  });
  it('fractional quantities are refused (stock is counted in whole units)', async () => {
    seed(); const app = await boot();
    let r: any; await act(async () => { r = app.get().processPosOrder(room([{ itemId: 'beer', qty: 1.5 }])); });
    console.log('   fractional order 1.5 -> success:', r.success, '| stock level now:', level(app.get()));
    expect(r.success).toBe(false); expect(Number.isInteger(level(app.get()))).toBe(true);
  });
  it('voiding a POS charge does NOT put the stock back', async () => {
    seed('manager'); const app = await boot();
    await act(async () => { app.get().processPosOrder(room([{ itemId: 'beer', qty: 3 }])); });
    const txId = charges(app.get())[0].id; let ok: any;
    await act(async () => { ok = app.get().voidTransaction(txId, 'Customer changed mind'); });
    expect(ok).toBe(true); expect(level(app.get())).toBe(2);
  });
  it('same receive twice in the same moment records only one movement (double click)', async () => {
    seed(); const app = await boot();
    await act(async () => { app.get().recordStockMovement('beer', 'receive', 12, 'Delivery'); app.get().recordStockMovement('beer', 'receive', 12, 'Delivery'); });
    console.log('   level after a double receive of 12 on top of 5:', level(app.get()), '(17 = guarded, 29 = posted twice)');
    expect(level(app.get())).toBe(17);
  });
  it('movement rules: waste below 0, adjust without reason, receive 0 and fractional are refused; opening only once', async () => {
    seed(); const app = await boot(); const rec = async (...a: any[]) => { let r: any; await act(async () => { r = (app.get().recordStockMovement as any)(...a); }); await tick(); return r; };
    expect((await rec('beer', 'waste', 9, 'Spoiled')).success).toBe(false);
    expect((await rec('beer', 'adjust', -1, '')).success).toBe(false);
    expect((await rec('beer', 'receive', 0, 'x')).success).toBe(false);
    expect((await rec('beer', 'receive', 2.5, 'x')).success).toBe(false);
    expect((await rec('beer', 'opening', 10, '')).success).toBe(false);
    expect((await rec('beer', 'waste', 2, 'Broken')).success).toBe(true); expect(level(app.get())).toBe(3);
    expect((await rec('beer', 'adjust', -1, 'Stock count')).success).toBe(true); expect(level(app.get())).toBe(2);
  });
  it('front desk can ADD items but cannot change a price, switch off, or delete; housekeeping cannot record stock or sell', async () => {
    seed('front_desk'); let app = await boot(); let r: any;
    await act(async () => { r = app.get().addPosItem({ name: 'Orange Juice', category: 'Beverages', price: 800, available: true, trackStock: true, unit: 'glass' }, { openingStock: 10 }); });
    console.log('   front desk addPosItem ->', JSON.stringify({ success: r.success, key: r.errorKey })); expect(r.success).toBe(true);
    const newId = r.item?.id; expect(newId).toBeTruthy();
    await tick(); await act(async () => { r = app.get().updatePosItem('beer', { price: 1500 }); }); console.log('   price change ->', JSON.stringify({ success: r.success, key: r.errorKey })); expect(r.success).toBe(false);
    await act(async () => { r = app.get().updatePosItem('beer', { lowStockThreshold: 8, unit: 'btl' }); }); console.log('   threshold/unit edit ->', JSON.stringify({ success: r.success, key: r.errorKey })); expect(r.success).toBe(true);
    await act(async () => { r = app.get().togglePosItemActive('beer', false); }); expect(r.success).toBe(false);
    await act(async () => { r = app.get().deletePosItem('beer'); }); expect(r.success).toBe(false);
    expect(level(app.get(), newId)).toBe(10);
    seed('housekeeping'); app = await boot();
    await act(async () => { r = app.get().recordStockMovement('beer', 'receive', 5, 'x'); }); expect(r.success).toBe(false);
    await act(async () => { r = app.get().processPosOrder(room([{ itemId: 'rice', qty: 1 }])); }); expect(r.success).toBe(false);
  });
  it('stock is separate per branch; an owner must pick a branch first', async () => {
    seed('manager', 5, { twoBranches: true }); let app = await boot(); let r: any;
    await act(async () => { r = app.get().recordStockMovement('beer', 'receive', 20, 'Delivery', B2); }); expect(r.success).toBe(true);
    expect(level(app.get(), 'beer', B1)).toBe(5); expect(level(app.get(), 'beer', B2)).toBe(20);
    seed('owner', 5, { twoBranches: true }); app = await boot();
    await act(async () => { r = app.get().recordStockMovement('beer', 'receive', 1, 'x'); }); console.log('   owner without branch ->', JSON.stringify({ success: r.success, key: r.errorKey })); expect(r.success).toBe(false);
  });
});
