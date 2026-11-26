import { describe, it, expect } from 'vitest';
import { getFolioTotals, sumPaymentsByMethod } from '../../src/utils/folio';
import { getGuestStats } from '../../src/utils/guestStats';

const R = 'R1';
const tx = (o: any) => ({ reservationId: R, ...o }) as any;

describe('getFolioTotals', () => {
  it('cancelled booking with fee and refund ends at 0 (voided room charge ignored)', () => {
    const t = getFolioTotals([
      tx({ type: 'charge', category: 'room_charge', amount: 75000, voided: true }),
      tx({ type: 'payment', category: 'deposit', amount: 10000, paymentMethod: 'cash' }),
      tx({ type: 'charge', category: 'cancellation_fee', amount: 5000 }),
      tx({ type: 'payment', category: 'refund', amount: -5000, paymentMethod: 'momo' })
    ], R);
    expect(t.balance).toBe(0); expect(t.charges).toBe(5000); expect(t.netPaid).toBe(5000);
  });
  it('fee larger than the deposit leaves the difference due', () => {
    const t = getFolioTotals([
      tx({ type: 'charge', category: 'room_charge', amount: 75000, voided: true }),
      tx({ type: 'payment', category: 'deposit', amount: 10000 }),
      tx({ type: 'charge', category: 'cancellation_fee', amount: 15000 })
    ], R);
    expect(t.balance).toBe(5000);
  });
  it('kept-as-credit shows a negative balance (credit)', () => {
    const t = getFolioTotals([
      tx({ type: 'charge', category: 'room_charge', amount: 75000, voided: true }),
      tx({ type: 'payment', category: 'deposit', amount: 10000 }),
      tx({ type: 'charge', category: 'cancellation_fee', amount: 5000 })
    ], R);
    expect(t.balance).toBe(-5000);
  });
  it('ignores voided charges and voided payments', () => {
    const t = getFolioTotals([
      tx({ type: 'charge', category: 'room_charge', amount: 50000 }),
      tx({ type: 'charge', category: 'restaurant', amount: 5000, voided: true }),
      tx({ type: 'payment', category: 'payment', amount: 20000, voided: true }),
      tx({ type: 'payment', category: 'payment', amount: 30000 })
    ], R);
    expect(t.balance).toBe(20000);
  });
  it('negative charges (discounts, early departure) reduce the charges', () => {
    const t = getFolioTotals([
      tx({ type: 'charge', category: 'room_charge', amount: 75000 }),
      tx({ type: 'charge', category: 'discount', amount: -7500 }),
      tx({ type: 'charge', category: 'room_charge_void', amount: -25000 })
    ], R);
    expect(t.charges).toBe(42500);
  });
  it('ignores other reservations and handles an empty list', () => {
    expect(getFolioTotals([{ reservationId: 'R2', type: 'charge', amount: 999 } as any], R).balance).toBe(0);
    expect(getFolioTotals([], R).balance).toBe(0);
  });
});

describe('sumPaymentsByMethod (what is physically in each drawer)', () => {
  const list = [
    tx({ type: 'payment', category: 'deposit', amount: 10000, paymentMethod: 'cash' }),
    tx({ type: 'payment', category: 'payment', amount: 15000, paymentMethod: 'momo' }),
    tx({ type: 'payment', category: 'refund', amount: -5000, paymentMethod: 'momo' }),
    tx({ type: 'payment', category: 'payment', amount: 7000, paymentMethod: 'cash', voided: true })
  ];
  it('ignores voided payments and nets refunds', () => {
    expect(sumPaymentsByMethod(list, 'cash')).toBe(10000);
    expect(sumPaymentsByMethod(list, 'momo')).toBe(10000);
    expect(sumPaymentsByMethod(list, 'card')).toBe(0);
  });
  it('supports a filter function', () => {
    expect(sumPaymentsByMethod(list, 'momo', (t) => t.amount > 0)).toBe(15000);
  });
});

describe('getGuestStats', () => {
  const rs = (id: string, status: string) => ({ id, guestId: 'G1', bookingStatus: status }) as any;
  it('visits count only checked-in and checked-out stays', () => {
    const s = getGuestStats('G1', [rs('a', 'reserved'), rs('b', 'cancelled'), rs('c', 'checked_in'), rs('d', 'checked_out')], []);
    expect(s.visits).toBe(2);
  });
  it('a refunded cancellation counts only the fee kept', () => {
    const t = [
      { reservationId: 'x', type: 'payment', category: 'deposit', amount: 10000 },
      { reservationId: 'x', type: 'charge', category: 'cancellation_fee', amount: 5000 },
      { reservationId: 'x', type: 'payment', category: 'refund', amount: -5000 }
    ] as any;
    const r: any = { ...rs('x', 'cancelled'), cancellationFee: 5000 };
    expect(getGuestStats('G1', [r], t).totalSpent).toBe(5000);
  });
  it('kept-as-credit counts only the fee, not the credit', () => {
    const t = [
      { reservationId: 'x', type: 'payment', category: 'deposit', amount: 10000 },
      { reservationId: 'x', type: 'charge', category: 'cancellation_fee', amount: 5000 }
    ] as any;
    const r: any = { ...rs('x', 'cancelled'), cancellationFee: 5000 };
    expect(getGuestStats('G1', [r], t).totalSpent).toBe(5000);
  });
  it('a settled stay counts what was paid; other guests are ignored', () => {
    const t = [{ reservationId: 'y', type: 'charge', amount: 50000 }, { reservationId: 'y', type: 'payment', amount: 50000 }] as any;
    expect(getGuestStats('G1', [rs('y', 'checked_out')], t).totalSpent).toBe(50000);
    expect(getGuestStats('G2', [rs('y', 'checked_out')], t).visits).toBe(0);
  });
});
