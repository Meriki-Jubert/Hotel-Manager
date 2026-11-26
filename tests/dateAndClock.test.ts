import { describe, it, expect } from 'vitest';
import { listNights, addDaysToLocalDate, doDateRangesOverlap, calculateStayNights, isValidDateString, getNextLocalDateString } from '../../src/utils/dateUtils';
import { getHotelNow, parseHHMM, getDepartureStatus, isValidTimeZone } from '../../src/utils/hotelClock';

describe('date helpers', () => {
  it('listNights excludes the check-out day and crosses month ends', () => {
    expect(listNights('2026-11-10', '2026-11-13')).toEqual(['2026-11-10', '2026-11-11', '2026-11-12']);
    expect(listNights('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
    expect(listNights('2026-11-10', '2026-11-10')).toEqual([]);
  });
  it('adds days, including across a year end and a leap day', () => {
    expect(addDaysToLocalDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToLocalDate('2028-02-28', 1)).toBe('2028-02-29');
    expect(getNextLocalDateString('2026-11-30')).toBe('2026-12-01');
  });
  it('overlap: a check-out on the 10th does not overlap a check-in on the 10th', () => {
    expect(doDateRangesOverlap('2026-11-07', '2026-11-10', '2026-11-10', '2026-11-12')).toBe(false);
    expect(doDateRangesOverlap('2026-11-07', '2026-11-11', '2026-11-10', '2026-11-12')).toBe(true);
  });
  it('stay nights and date validation', () => {
    expect(calculateStayNights('2026-11-10', '2026-11-13')).toBe(3);
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('2026-11-10')).toBe(true);
    expect(isValidDateString('10/11/2026')).toBe(false);
  });
});

describe('hotel clock', () => {
  it('uses the hotel time zone, not the computer time zone (Douala is UTC+1)', () => {
    expect(getHotelNow('Africa/Douala', Date.UTC(2026, 10, 10, 22, 30)).time).toBe('23:30');
    const next = getHotelNow('Africa/Douala', Date.UTC(2026, 10, 10, 23, 30));
    expect(next.date).toBe('2026-11-11'); expect(next.time).toBe('00:30');
  });
  it('another time zone gives its own local date', () => {
    expect(getHotelNow('Europe/London', Date.UTC(2026, 10, 5, 22, 59)).time).toBe('22:59');
  });
  it('an invalid time zone falls back to Douala', () => {
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(getHotelNow('Mars/Olympus', Date.UTC(2026, 10, 10, 12, 0)).time).toBe('13:00');
  });
  it('parseHHMM', () => {
    expect(parseHHMM('12:00')).toBe(720); expect(parseHHMM('04:00')).toBe(240);
    expect(parseHHMM('25:00')).toBeNull(); expect(parseHHMM('abc')).toBeNull(); expect(parseHHMM('')).toBeNull();
  });
  it('departure status: upcoming, reminder, due, overdue', () => {
    const st = (time: string, date = '2026-11-10', coDate = '2026-11-10') =>
      getDepartureStatus({ checkOutDate: coDate, checkOutTime: '12:00', now: { date, time, minutes: parseHHMM(time)! }, reminderMinutes: 30 });
    expect(st('11:29').state).toBe('upcoming');
    expect(st('11:30')).toMatchObject({ state: 'reminder', minutesLeft: 30 });
    expect(st('12:00').state).toBe('due');
    expect(st('12:01').state).toBe('overdue');
    expect(st('08:00', '2026-11-11', '2026-11-10').state).toBe('overdue');
    expect(st('12:00', '2026-11-10', '2026-11-12').state).toBe('upcoming');
  });
});
