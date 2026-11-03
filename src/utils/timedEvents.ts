import { Reservation, FolioTransaction, HotelConfig } from '../types/hms';
import { HotelNow, getDepartureStatus } from './hotelClock';
import { getFolioTotals } from './folio';

export interface DepartureReminder {
  key: string;
  reservationId: string;
  minutesLeft: number;
}

export interface DepartureOverdue {
  reservationId: string;
  minutesOverdue: number;
  balance: number;
}

export interface AutoCheckOutTarget {
  reservationId: string;
}

export interface TimedEventsResult {
  reminders: DepartureReminder[];
  overdue: DepartureOverdue[];
  autoCheckOuts: AutoCheckOutTarget[];
}

/**
 * Computes timed events (reminders, overdue guests, and auto-checkout candidates).
 * Considers ONLY 'checked_in' reservations across all branches.
 */
export function computeTimedEvents({
  now,
  reservations,
  transactions,
  hotelConfig
}: {
  now: HotelNow;
  reservations: Reservation[];
  transactions: FolioTransaction[];
  hotelConfig: HotelConfig;
}): TimedEventsResult {
  const reminders: DepartureReminder[] = [];
  const overdue: DepartureOverdue[] = [];
  const autoCheckOuts: AutoCheckOutTarget[] = [];

  const reminderMinutes = typeof hotelConfig.checkOutReminderMinutes === 'number'
    ? hotelConfig.checkOutReminderMinutes
    : 30;
  const autoCheckOutMode = hotelConfig.autoCheckOut ?? 'settled_only';

  for (const res of reservations) {
    if (res.bookingStatus !== 'checked_in') {
      continue;
    }

    const checkOutTime = (res as any).checkOutTime || hotelConfig.checkOutTime || '12:00';

    const depStatus = getDepartureStatus({
      checkOutDate: res.checkOutDate,
      checkOutTime,
      now,
      reminderMinutes
    });

    if (depStatus.state === 'reminder' || depStatus.state === 'due') {
      reminders.push({
        key: `${res.id}:${res.checkOutDate}:${checkOutTime}:reminder`,
        reservationId: res.id,
        minutesLeft: Math.max(0, depStatus.minutesLeft)
      });
    } else if (depStatus.state === 'overdue') {
      const folio = getFolioTotals(transactions, res.id);
      const balance = folio.balance;
      const minutesOverdue = Math.abs(depStatus.minutesLeft);

      if (autoCheckOutMode === 'settled_only' && balance <= 0) {
        autoCheckOuts.push({ reservationId: res.id });
      } else {
        // A guest with balance > 0 is NEVER auto checked out: they appear in overdue with the balance.
        // If autoCheckOut is 'off', nothing is checked out automatically; guests only appear as overdue.
        overdue.push({
          reservationId: res.id,
          minutesOverdue,
          balance
        });
      }
    }
  }

  return { reminders, overdue, autoCheckOuts };
}
