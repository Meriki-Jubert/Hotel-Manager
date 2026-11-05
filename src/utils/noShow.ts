import { Reservation, HotelConfig, AutoNoShowConfig } from '../types/hms';
import { HotelNow } from './hotelClock';

export interface NoShowTarget {
  reservationId: string;
}

/**
 * Adds an integer number of days to a 'YYYY-MM-DD' date string using pure calendar arithmetic.
 * Does not suffer from daylight savings or local timezone shifts.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  if (days === 0) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks whether the moment (targetDate, targetTime) is strictly in the future compared to (nowDate, nowTime).
 */
export function isMomentFuture(
  targetDate: string,
  targetTime: string,
  nowDate: string,
  nowTime: string
): boolean {
  if (targetDate > nowDate) return true;
  if (targetDate < nowDate) return false;
  return targetTime > nowTime;
}

/**
 * Checks whether the cutoff moment (targetDate, targetTime) has arrived or passed compared to (nowDate, nowTime).
 */
export function hasCutoffPassed(
  targetDate: string,
  targetTime: string,
  nowDate: string,
  nowTime: string
): boolean {
  if (targetDate < nowDate) return true;
  if (targetDate > nowDate) return false;
  return nowTime >= targetTime;
}

/**
 * Computes reservations that have exceeded the automatic no-show cutoff moment.
 * Considers ONLY 'reserved' reservations across all branches.
 */
export function computeNoShows({
  now,
  reservations,
  hotelConfig
}: {
  now: HotelNow;
  reservations: Reservation[];
  hotelConfig: HotelConfig;
}): NoShowTarget[] {
  const autoNoShowConfig: AutoNoShowConfig = {
    enabled: hotelConfig.autoNoShow?.enabled !== false,
    afterDays: typeof hotelConfig.autoNoShow?.afterDays === 'number' ? hotelConfig.autoNoShow.afterDays : 0,
    cutoffTime: hotelConfig.autoNoShow?.cutoffTime || '23:59'
  };

  if (!autoNoShowConfig.enabled) {
    return [];
  }

  const results: NoShowTarget[] = [];

  for (const res of reservations) {
    // Never include checked_in, checked_out or cancelled bookings
    if (res.bookingStatus !== 'reserved') {
      continue;
    }

    // If holdUntil is set and is in the future compared to now, skip!
    if (res.holdUntil) {
      if (isMomentFuture(res.holdUntil.date, res.holdUntil.time, now.date, now.time)) {
        continue;
      }
    }

    // Cutoff moment is arrival date + afterDays at cutoffTime in the hotel's clock
    const cutoffDate = addDaysToDateString(res.checkInDate, autoNoShowConfig.afterDays);
    const cutoffTime = autoNoShowConfig.cutoffTime;

    if (hasCutoffPassed(cutoffDate, cutoffTime, now.date, now.time)) {
      results.push({ reservationId: res.id });
    }
  }

  return results;
}
