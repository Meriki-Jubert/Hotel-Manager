import { describe, it, expect } from 'vitest';
import { calculateCancellationFee, getCancellationPolicySummary } from '../src/utils/cancellationPolicy';
import { translate } from '../src/i18n/translate';

const policy = (tiers: any[], extra: any = {}) => ({ tiers, noShow: { feeType: 'nights', value: 1 }, allowNonRefundable: true, ...extra }) as any;
const booking = (o: any = {}) => ({ checkInDate: '2026-11-10', totalAmount: 75000, nightlyRate: 25000, totalNights: 3, rateType: 'flexible', ...o }) as any;
const fee = (p: any, today: string, o: any = {}, isNoShow = false) =>
  calculateCancellationFee({ policy: p, booking: booking(o), businessDate: today, isNoShow });
const std = policy([{ daysBeforeArrival: 3, feeType: 'nights', value: 1 }, { daysBeforeArrival: 1, feeType: 'percent', value: 100 }]);

describe('calculateCancellationFee', () => {
  it('is free outside every tier', () => {
    expect(fee(std, '2026-11-05').suggestedFee).toBe(0);
    expect(fee(std, '2026-11-06').suggestedFee).toBe(0);
  });
  it('charges one night inside the 3-day tier', () => {
    expect(fee(std, '2026-11-07').suggestedFee).toBe(25000);
    expect(fee(std, '2026-11-08').suggestedFee).toBe(25000);
  });
  it('the tier with the smallest matching days wins (1 day -> 100%)', () => {
    expect(fee(std, '2026-11-09').suggestedFee).toBe(75000);
    expect(fee(std, '2026-11-10').suggestedFee).toBe(75000);
    expect(fee(std, '2026-11-12').suggestedFee).toBe(75000);
  });
  it('no-show uses the no-show rule (nights or percent)', () => {
    expect(fee(std, '2026-11-10', {}, true).suggestedFee).toBe(25000);
    expect(fee(policy([], { noShow: { feeType: 'percent', value: 100 } }), '2026-11-10', {}, true).suggestedFee).toBe(75000);
  });
  it('non-refundable bookings owe the full total', () => {
    expect(fee(policy([]), '2026-11-01', { rateType: 'non_refundable' }).suggestedFee).toBe(75000);
  });
  it('an empty policy is free cancellation', () => {
    expect(fee(policy([]), '2026-11-09').suggestedFee).toBe(0);
  });
  it('rounds to a whole number and is capped at the booking total', () => {
    expect(fee(policy([{ daysBeforeArrival: 2, feeType: 'percent', value: 50 }]), '2026-11-09').suggestedFee).toBe(37500);
    expect(fee(policy([{ daysBeforeArrival: 2, feeType: 'nights', value: 2 }]), '2026-11-09', { totalAmount: 25000, totalNights: 1 }).suggestedFee).toBe(25000);
    expect(Number.isInteger(fee(policy([{ daysBeforeArrival: 3, feeType: 'percent', value: 7.5 }]), '2026-11-08', { totalAmount: 33333 }).suggestedFee)).toBe(true);
  });
  it('an old booking without a nightly rate falls back to total / nights', () => {
    expect(fee(std, '2026-11-07', { nightlyRate: undefined }).suggestedFee).toBe(25000);
  });
  it('counts days correctly across a month boundary', () => {
    expect(fee(std, '2026-10-30', { checkInDate: '2026-11-02' }).suggestedFee).toBe(25000);
  });
});

describe('every rule key resolves in both languages with its values', () => {
  const cases: Array<[string, any, string, boolean, any?]> = [
    ['free', std, '2026-11-05', false],
    ['tier nights', std, '2026-11-07', false],
    ['tier percent', policy([{ daysBeforeArrival: 3, feeType: 'percent', value: 50 }]), '2026-11-07', false],
    ['arrival day nights', std, '2026-11-10', false],
    ['after arrival', std, '2026-11-12', false],
    ['arrival day free', policy([]), '2026-11-10', false],
    ['after arrival free', policy([]), '2026-11-12', false],
    ['no-show nights', policy([]), '2026-11-10', true],
    ['no-show percent', policy([], { noShow: { feeType: 'percent', value: 100 } }), '2026-11-10', true],
    ['non-refundable', policy([]), '2026-11-01', false, { rateType: 'non_refundable' }],
    ['singular day', std, '2026-11-09', false]
  ];
  for (const [label, p, d, ns, o] of cases) {
    it(label, () => {
      const r = fee(p, d, o || {}, ns);
      for (const lang of ['en', 'fr'] as const) {
        const text = translate(lang, r.ruleKey, r.ruleVars);
        expect(text).not.toBe(r.ruleKey);
        expect(text).not.toMatch(/\{\w+\}/);
      }
      expect(r.ruleText.length).toBeGreaterThan(3);
    });
  }
});

describe('getCancellationPolicySummary', () => {
  it('mentions the free window in both languages', () => {
    const p = policy([{ daysBeforeArrival: 7, feeType: 'percent', value: 50 }]);
    expect(getCancellationPolicySummary(p, 'en')).toMatch(/7/);
    expect(getCancellationPolicySummary(p, 'fr')).toMatch(/Annulation/);
  });
  it('an empty or missing policy reads as free cancellation', () => {
    expect(getCancellationPolicySummary(policy([]), 'en')).toMatch(/Free cancellation/i);
    expect(getCancellationPolicySummary(undefined, 'fr')).toMatch(/gratuite/i);
  });
});
