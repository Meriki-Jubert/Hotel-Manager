// @vitest-environment jsdom
// Runs the real providers inside React.StrictMode (which doubles effects in development)
// with a booking whose arrival date is long past, and checks that the automatic no-show
// happens exactly once (one fee, one log entry).
import { describe, it, expect } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { getFolioTotals } from '../src/utils/folio';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const P = 'hms_v2', BR = 'branch-1';
const tx = (id: string, o: any) => ({ id, branchId: BR, reservationId: 'R1', guestId: 'G1', roomNumber: '101', timestamp: '2026-11-01 10:00', recordedBy: 'T', ...o });
function seed() {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem(`${P}_room_types`, JSON.stringify([{ id: 'std', name: 'Standard', code: 'STD', basePrice: 25000, capacity: 2, bedType: 'Q', amenities: [], description: 'x', isActive: true }]));
  localStorage.setItem(`${P}_rooms`, JSON.stringify([{ id: 'r101', roomNumber: '101', roomTypeId: 'std', branchId: BR, floor: 1, status: 'available', isActive: true, pricePerNight: 25000 }]));
  localStorage.setItem(`${P}_guests`, JSON.stringify([{ id: 'G1', name: 'Ann', phone: '1', email: '', idCardNumber: '', nationality: '', createdAt: '2026-11-01' }]));
  localStorage.setItem(`${P}_reservations`, JSON.stringify([{ id: 'R1', branchId: BR, bookingCode: 'BK-1', roomId: 'r101', roomNumber: '101', roomTypeId: 'std', guestId: 'G1', guestName: 'Ann', guestPhone: '1', checkInDate: '2026-11-05', checkOutDate: '2026-11-08', adults: 1, children: 0, nightlyRate: 25000, totalNights: 3, totalAmount: 75000, amountPaid: 10000, paymentStatus: 'partial', bookingStatus: 'reserved', paymentMethod: 'cash', source: 'phone', createdAt: '2026-11-01 10:00' }]));
  localStorage.setItem(`${P}_transactions`, JSON.stringify([tx('t1', { type: 'charge', category: 'room_charge', amount: 75000, description: 'Room' }), tx('t2', { type: 'payment', category: 'deposit', amount: 10000, paymentMethod: 'cash', description: 'Dep' })]));
  localStorage.setItem(`${P}_branch_business_dates`, JSON.stringify({ [BR]: '2026-11-10' }));
  sessionStorage.setItem(`${P}_user`, JSON.stringify({ id: 'u1', name: 'Mia', username: 'mia', role: 'manager', branchId: BR, title: 'GM', email: '', phone: '', isActive: true }));
}
describe('React StrictMode (development) with the real timed-events hook', () => {
  it('app load catch-up marks the overdue booking no-show exactly once', async () => {
    seed();
    const { HMSProvider, useHMS } = await import('../src/context/HMSContext');
    const { LanguageProvider } = await import('../src/i18n/LanguageContext');
    const { HotelClockProvider } = await import('../src/context/HotelClockContext');
    let ctx: any = null; const Probe = () => { ctx = useHMS(); return null; };
    document.body.innerHTML = '<div id="root"></div>';
    const root = createRoot(document.getElementById('root')!);
    await act(async () => { root.render(React.createElement(React.StrictMode, null, React.createElement(HMSProvider, null, React.createElement(LanguageProvider, null, React.createElement(HotelClockProvider, null, React.createElement(Probe)))))); });
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });
    const fees = ctx.allTransactions.filter((t: any) => t.category === 'no_show_fee' && !t.voided);
    const res = ctx.allReservations.find((r: any) => r.id === 'R1');
    const logs = ctx.staffActivityLogs.filter((l: any) => /Auto no-show/.test(l.action));
    expect(res.bookingStatus).toBe('cancelled');
    expect(fees.length).toBe(1);
    expect(logs.length).toBe(1);
    expect(getFolioTotals(ctx.allTransactions, 'R1').balance).toBe(15000);
  });
});
