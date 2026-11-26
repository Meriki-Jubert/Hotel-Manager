import { describe, it, expect } from 'vitest';
import { checkAvailability, getAvailableRoomCount, reservationCoversNight } from '../../src/utils/availability';

const B = 'b1', T = 'std';
const room = (id: string, active = true, branch = B, type = T) => ({ id, branchId: branch, roomTypeId: type, isActive: active }) as any;
const rooms2 = [room('101'), room('102')];
let n = 0;
const res = (ci: string, co: string, roomId?: string, status = 'reserved', branch = B, type = T) =>
  ({ id: 'r' + n++, branchId: branch, roomTypeId: type, roomId, checkInDate: ci, checkOutDate: co, bookingStatus: status }) as any;
const check = (ci: string, co: string, rs: any[] = [], extra: any = {}, rooms = rooms2) =>
  checkAvailability({ branchId: B, roomTypeId: T, checkInDate: ci, checkOutDate: co, rooms, reservations: rs, ...extra });

describe('availability: night by night', () => {
  it('is available when there are no bookings', () => expect(check('2026-11-10', '2026-11-13').available).toBe(true));
  it('refuses a third booking when two type-only bookings fill both rooms', () => {
    const full = [res('2026-11-10', '2026-11-13'), res('2026-11-10', '2026-11-13')];
    const r = check('2026-11-10', '2026-11-13', full);
    expect(r.available).toBe(false);
    expect(r.reasonKey).toBeTruthy();
  });
  it('refuses a specific room when type-only bookings already fill the type', () => {
    const full = [res('2026-11-10', '2026-11-13'), res('2026-11-10', '2026-11-13')];
    expect(check('2026-11-10', '2026-11-13', full, { requestedRoomId: '101' }).available).toBe(false);
  });
  it('allows back-to-back bookings (check-out day is free)', () => {
    expect(check('2026-11-13', '2026-11-15', [res('2026-11-10', '2026-11-13', '101')], { requestedRoomId: '101' }).available).toBe(true);
  });
  it('accepts nights 1-3, 3-5 and 2-4 with two rooms', () => {
    const rs = [res('2026-11-01', '2026-11-03'), res('2026-11-03', '2026-11-05')];
    expect(check('2026-11-02', '2026-11-04', rs).available).toBe(true);
  });
  it('refuses when both rooms are busy on one night inside the range', () => {
    const rs = [res('2026-11-01', '2026-11-05'), res('2026-11-01', '2026-11-05')];
    expect(check('2026-11-02', '2026-11-04', rs).available).toBe(false);
  });
  it('a deactivated room reduces capacity', () => {
    expect(check('2026-11-10', '2026-11-12', [res('2026-11-10', '2026-11-12')], {}, [room('101'), room('102', false)]).available).toBe(false);
  });
  it('ignores cancelled and checked-out bookings', () => {
    const rs = [res('2026-11-10', '2026-11-13', undefined, 'cancelled'), res('2026-11-10', '2026-11-13', undefined, 'checked_out')];
    expect(check('2026-11-10', '2026-11-13', rs).available).toBe(true);
  });
  it('ignores bookings of other branches and other room types', () => {
    const rs = [res('2026-11-10', '2026-11-13', undefined, 'reserved', 'b2'), res('2026-11-10', '2026-11-13', undefined, 'reserved', B, 'suite')];
    expect(check('2026-11-10', '2026-11-13', rs).available).toBe(true);
  });
  it('editing a booking excludes itself', () => {
    const self = res('2026-11-10', '2026-11-13', '101');
    const other = res('2026-11-10', '2026-11-13', '102');
    expect(check('2026-11-10', '2026-11-14', [self, other], { requestedRoomId: '101', excludeReservationId: self.id }).available).toBe(true);
  });
  it('a specific room that is taken is refused, the free one is accepted', () => {
    const rs = [res('2026-11-10', '2026-11-13', '101')];
    expect(check('2026-11-11', '2026-11-12', rs, { requestedRoomId: '101' }).available).toBe(false);
    expect(check('2026-11-11', '2026-11-12', rs, { requestedRoomId: '102' }).available).toBe(true);
  });
  it('rejects empty and inverted date ranges', () => {
    expect(check('2026-11-10', '2026-11-10').available).toBe(false);
    expect(check('2026-11-12', '2026-11-10').available).toBe(false);
  });
  it('counts bookings that are currently checked in', () => {
    const rs = [res('2026-11-01', '2026-11-05', '101', 'checked_in'), res('2026-11-01', '2026-11-05', '102', 'checked_in')];
    expect(check('2026-11-02', '2026-11-03', rs).available).toBe(false);
  });
  it('works across a month end', () => {
    const rs = [res('2026-10-30', '2026-11-02'), res('2026-10-30', '2026-11-02')];
    expect(check('2026-10-31', '2026-11-01', rs).available).toBe(false);
    expect(check('2026-11-02', '2026-11-04', rs).available).toBe(true);
  });
});

describe('getAvailableRoomCount', () => {
  it('counts free rooms for the whole range (the minimum over the nights)', () => {
    const rs = [res('2026-11-10', '2026-11-12')];
    expect(getAvailableRoomCount(B, T, '2026-11-10', '2026-11-12', rooms2, rs)).toBe(1);
    expect(getAvailableRoomCount(B, T, '2026-11-12', '2026-11-14', rooms2, rs)).toBe(2);
  });
  it('is 0 for an invalid range or an unknown room type', () => {
    expect(getAvailableRoomCount(B, T, '2026-11-12', '2026-11-10', rooms2, [])).toBe(0);
    expect(getAvailableRoomCount(B, 'ghost', '2026-11-10', '2026-11-12', rooms2, [])).toBe(0);
  });
});

describe('reservationCoversNight', () => {
  const cover = (r: any, night: string, ex?: string) => reservationCoversNight(r, night, B, T, rooms2, ex);
  it('covers the check-in night but not the check-out day', () => {
    const r = res('2026-11-10', '2026-11-12');
    expect(cover(r, '2026-11-10')).toBe(true);
    expect(cover(r, '2026-11-11')).toBe(true);
    expect(cover(r, '2026-11-12')).toBe(false);
  });
  it('only reserved and checked-in bookings count', () => {
    expect(cover(res('2026-11-10', '2026-11-12', undefined, 'cancelled'), '2026-11-10')).toBe(false);
    expect(cover(res('2026-11-10', '2026-11-12', undefined, 'checked_out'), '2026-11-10')).toBe(false);
    expect(cover(res('2026-11-10', '2026-11-12', undefined, 'checked_in'), '2026-11-10')).toBe(true);
  });
  it('a booking of another branch is ignored, and the excluded booking is ignored', () => {
    expect(cover(res('2026-11-10', '2026-11-12', undefined, 'reserved', 'b2'), '2026-11-10')).toBe(false);
    const r = res('2026-11-10', '2026-11-12');
    expect(cover(r, '2026-11-10', r.id)).toBe(false);
  });
  it('matches by the assigned room type when the booking has another room type id', () => {
    const r = res('2026-11-10', '2026-11-12', '101', 'reserved', B, 'other-type');
    expect(cover(r, '2026-11-10')).toBe(true);
  });
});
