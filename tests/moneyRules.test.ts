import { describe, it, expect } from 'vitest';
import { calculateExtension, calculateShortening, calculateRoomMoveAdjustment } from '../src/utils/stayChanges';
import { calculateDiscount, validateSplitPayment } from '../src/utils/folioAdjustments';
import { calculateTaxBreakdown } from '../src/utils/tax';
import { parseMoneyInput, formatMoneyInput } from '../src/utils/money';

describe('stay changes', () => {
  it('extends: 2 nights at 25,000 = 50,000, across a month end too', () => {
    expect(calculateExtension({ nightlyRate: 25000, currentCheckOut: '2026-11-10', newCheckOut: '2026-11-12' })).toEqual({ addedNights: 2, addedAmount: 50000 });
    expect(calculateExtension({ nightlyRate: 30000, currentCheckOut: '2026-10-30', newCheckOut: '2026-11-02' })).toEqual({ addedNights: 3, addedAmount: 90000 });
  });
  it('extension to the same or an earlier date adds nothing', () => {
    expect(calculateExtension({ nightlyRate: 25000, currentCheckOut: '2026-11-10', newCheckOut: '2026-11-10' }).addedAmount).toBe(0);
    expect(calculateExtension({ nightlyRate: 25000, currentCheckOut: '2026-11-10', newCheckOut: '2026-11-09' }).addedNights).toBe(0);
  });
  it('shortens: credit for the removed nights, nothing for a later date', () => {
    expect(calculateShortening({ nightlyRate: 25000, currentCheckOut: '2026-11-10', newCheckOut: '2026-11-09' })).toEqual({ removedNights: 1, creditAmount: 25000 });
    expect(calculateShortening({ nightlyRate: 20000, currentCheckOut: '2026-11-02', newCheckOut: '2026-10-30' })).toEqual({ removedNights: 3, creditAmount: 60000 });
    expect(calculateShortening({ nightlyRate: 25000, currentCheckOut: '2026-11-10', newCheckOut: '2026-11-12' }).creditAmount).toBe(0);
  });
  it('room move: keep rate = 0, upgrade positive, downgrade negative, no nights = 0', () => {
    expect(calculateRoomMoveAdjustment({ remainingNights: 3, oldRate: 25000, newRate: 40000, keepCurrentRate: true }).adjustmentAmount).toBe(0);
    expect(calculateRoomMoveAdjustment({ remainingNights: 3, oldRate: 25000, newRate: 40000, keepCurrentRate: false }).adjustmentAmount).toBe(45000);
    expect(calculateRoomMoveAdjustment({ remainingNights: 2, oldRate: 40000, newRate: 25000, keepCurrentRate: false }).adjustmentAmount).toBe(-30000);
    expect(calculateRoomMoveAdjustment({ remainingNights: 0, oldRate: 25000, newRate: 40000, keepCurrentRate: false }).adjustmentAmount).toBe(0);
  });
});

describe('discounts', () => {
  const d = (type: 'percent' | 'fixed', value: number, chargesTotal: number) => calculateDiscount({ type, value, chargesTotal }).discountAmount;
  it('percent and fixed', () => { expect(d('percent', 10, 75000)).toBe(7500); expect(d('fixed', 5000, 75000)).toBe(5000); });
  it('never more than the charges, never negative, invalid input gives 0', () => {
    expect(d('percent', 100, 75000)).toBe(75000);
    expect(d('fixed', 90000, 75000)).toBe(75000);
    expect(d('percent', 120, 75000)).toBe(0);
    expect(d('percent', -5, 75000)).toBe(0);
    expect(d('fixed', 0, 75000)).toBe(0);
    expect(d('percent', 10, 0)).toBe(0);
  });
  it('result is a whole number', () => { expect(d('percent', 7.5, 33333)).toBe(2500); });
});

describe('split payments', () => {
  const v = (total: number, amounts: number[]) => validateSplitPayment({ totalAmount: total, lines: amounts.map((amount) => ({ method: 'cash' as any, amount })) });
  it('accepts lines that add up exactly', () => expect(v(40000, [25000, 15000]).valid).toBe(true));
  it('refuses mismatches, zero, negative, empty and fractional amounts', () => {
    expect(v(40000, [25000, 10000]).valid).toBe(false);
    expect(v(40000, [40000, 0]).valid).toBe(false);
    expect(v(40000, [50000, -10000]).valid).toBe(false);
    expect(v(40000, []).valid).toBe(false);
    expect(v(100, [50.5, 49.5]).valid).toBe(false);
  });
});

describe('tax breakdown (prices include tax)', () => {
  const tb = (total: number, rate: number) => calculateTaxBreakdown({ totalIncludingTax: total, ratePercent: rate });
  it('exact case', () => expect(tb(119250, 19.25)).toEqual({ net: 100000, tax: 19250 }));
  it('rounding case', () => expect(tb(75000, 19.25)).toEqual({ net: 62893, tax: 12107 }));
  it('no tax when the rate is 0, negative or invalid', () => {
    expect(tb(75000, 0)).toEqual({ net: 75000, tax: 0 });
    expect(tb(50000, -5)).toEqual({ net: 50000, tax: 0 });
    expect(tb(50000, NaN)).toEqual({ net: 50000, tax: 0 });
  });
  it('credit, zero and invalid totals give 0/0', () => {
    expect(tb(-7500, 19.25)).toEqual({ net: 0, tax: 0 });
    expect(tb(0, 19.25)).toEqual({ net: 0, tax: 0 });
    expect(tb(NaN, 19.25)).toEqual({ net: 0, tax: 0 });
  });
  it('net + tax always equals the total (1..5000 at 19.25% and 10%)', () => {
    for (const rate of [19.25, 10]) for (let n = 1; n <= 5000; n++) {
      const r = tb(n, rate);
      expect(r.net + r.tax).toBe(n); expect(r.tax).toBeGreaterThanOrEqual(0); expect(r.net).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('money input helpers', () => {
  it('parses digits only', () => {
    for (const raw of ['75003', '75 003', '75,003', '75.003', 'FCFA 75003', '  75003  ']) expect(parseMoneyInput(raw)).toBe(75003);
  });
  it('empty, letters-only and huge values', () => {
    expect(parseMoneyInput('')).toBe(0); expect(parseMoneyInput('abc')).toBe(0);
    expect(parseMoneyInput('99999999999999')).toBe(999999999);
  });
  it('formats with the language separator and shows nothing for 0', () => {
    expect(formatMoneyInput(1234567, 'en')).toBe('1,234,567');
    expect(formatMoneyInput(1234567, 'fr')).toBe('1 234 567');
    expect(formatMoneyInput(0, 'fr')).toBe('');
    expect(formatMoneyInput(NaN as any, 'en')).toBe('');
  });
});
