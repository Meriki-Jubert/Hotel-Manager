import { describe, it, expect } from 'vitest';
import { en } from '../../src/i18n/en';
import { fr } from '../../src/i18n/fr';
import { translate } from '../../src/i18n/translate';
import { tRoomStatus, tBookingStatus, tPaymentMethod, tBookingSource, tFolioCategory, tRoomMoveReason } from '../../src/i18n/labels';

const E: Record<string, string> = en as any;
const F: Record<string, string> = fr as any;
const keys = Object.keys(E);
const ph = (s: string) => (s.match(/\{[a-zA-Z0-9_]+\}/g) || []).sort();

describe('dictionaries', () => {
  it('French has exactly the English keys', () => {
    expect(keys.filter((k) => !(k in F))).toEqual([]);
    expect(Object.keys(F).filter((k) => !(k in E))).toEqual([]);
  });
  it('no empty values', () => {
    expect(keys.filter((k) => !String(E[k]).trim() || !String(F[k]).trim())).toEqual([]);
  });
  it('the {placeholders} of every key are identical in both languages', () => {
    expect(keys.filter((k) => JSON.stringify(ph(E[k])) !== JSON.stringify(ph(F[k])))).toEqual([]);
  });
  it('French uses one term for Night Audit ("Clôture journalière"), never "audit de nuit"', () => {
    expect(keys.filter((k) => /audit de nuit/i.test(F[k]))).toEqual([]);
  });
  it('French never uses the English abbreviation "nts"', () => {
    expect(keys.filter((k) => /\bnts\b/.test(F[k]))).toEqual([]);
  });
});

describe('translate()', () => {
  it('falls back to English, then to the key', () => {
    expect(translate('fr', 'definitely.missing.key')).toBe('definitely.missing.key');
  });
  it('replaces every occurrence of a placeholder and inserts special characters literally', () => {
    (en as any).__t = 'Hi {name}, {name}!'; (fr as any).__t = 'Salut {name}, {name} !';
    expect(translate('en', '__t', { name: 'Ann' })).toBe('Hi Ann, Ann!');
    expect(translate('fr', '__t', { name: 'A$&B' })).toBe('Salut A$&B, A$&B !');
    expect(translate('en', '__t', { other: 'x' })).toBe('Hi {name}, {name}!');
    delete (en as any).__t; delete (fr as any).__t;
  });
});

describe('label helpers never show a raw key', () => {
  const tFor = (lang: 'en' | 'fr') => (key: string, vars?: any) => translate(lang, key, vars);
  const sets: Array<[string, (t: any, v: string) => string, string[]]> = [
    ['room status', tRoomStatus, ['available', 'occupied', 'reserved', 'dirty', 'cleaning', 'maintenance']],
    ['booking status', tBookingStatus, ['reserved', 'checked_in', 'checked_out', 'cancelled']],
    ['payment method', tPaymentMethod, ['cash', 'momo', 'orange_money', 'card', 'bank_transfer']],
    ['booking source', tBookingSource, ['Walk-In', 'Phone', 'WhatsApp', 'Direct Website', 'OTA - Booking.com', 'Corporate', 'Agency']],
    ['folio category', tFolioCategory, ['room_charge', 'restaurant', 'beverage', 'laundry', 'maintenance_charge', 'late_checkout', 'cancellation_fee', 'no_show_fee', 'room_charge_void', 'discount', 'payment', 'deposit', 'tax', 'refund']],
    ['room move reason', tRoomMoveReason, ['AC/fault', 'guest request', 'upgrade', 'downgrade', 'noise', 'other']]
  ];
  for (const [label, fn, values] of sets) {
    it(label, () => {
      for (const lang of ['en', 'fr'] as const) for (const v of values) {
        const out = fn(tFor(lang), v);
        expect(out, `${label} ${v} (${lang})`).toBeTruthy();
        expect(out, `${label} ${v} (${lang})`).not.toMatch(/^[a-z]+(\.[A-Za-z_]+)+$/);
      }
    });
  }
});
