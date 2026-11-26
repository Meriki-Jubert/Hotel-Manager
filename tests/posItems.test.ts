import { describe, it, expect } from 'vitest';
import { validatePosItem } from '../src/utils/posItems';

const items: any[] = [{ id: '1', name: 'Grilled Fish', category: 'Meals', price: 5000 }, { id: '2', name: 'Club Beer', category: 'Beverages', price: 1000 }];
const v = (i: any, e?: string) => validatePosItem(i, items, e);

describe('validatePosItem', () => {
  it('accepts a valid new item', () => expect(v({ name: 'Ndole', category: 'Meals', price: 3500 }).valid).toBe(true));
  it('refuses empty, one-character and spaces-only names', () => {
    for (const name of ['', 'A', '   ']) expect(v({ name, category: 'Meals', price: 100 }).valid).toBe(false);
  });
  it('refuses an unknown category', () => expect(v({ name: 'Ndole', category: 'Spa', price: 100 }).valid).toBe(false));
  it('refuses zero, negative, decimal and NaN prices', () => {
    for (const price of [0, -100, 10.5, NaN]) expect(v({ name: 'Ndole', category: 'Meals', price }).valid).toBe(false);
  });
  it('refuses a duplicate name whatever the case or spaces', () => {
    expect(v({ name: '  grilled FISH ', category: 'Meals', price: 5000 }).valid).toBe(false);
  });
  it('editing keeps the own name, but cannot take another item\'s name', () => {
    expect(v({ name: 'Grilled Fish', category: 'Meals', price: 5500 }, '1').valid).toBe(true);
    expect(v({ name: 'Club Beer', category: 'Meals', price: 5500 }, '1').valid).toBe(false);
  });
  it('invalid results carry a translatable key', () => {
    const r: any = v({ name: '', category: 'Meals', price: 100 });
    expect(r.errorKey).toBeTruthy();
  });
});
