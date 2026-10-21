import { Reservation, FolioTransaction } from '../types/hms';
import { getFolioTotals } from './folio';

export interface GuestStats {
  visits: number;
  totalSpent: number;
}

/**
 * Derives guest statistics dynamically from reservations and transactions:
 * - visits: number of reservations with status 'checked_in' or 'checked_out' (never 'reserved' or 'cancelled')
 * - totalSpent: sum of getFolioTotals(...).netPaid over non-cancelled reservations;
 *   for cancelled reservations, only the fee kept: min(netPaid, cancellationFee)
 */
export function getGuestStats(
  guestId: string,
  reservations: Reservation[],
  transactions: FolioTransaction[]
): GuestStats {
  const guestReservations = reservations.filter((r) => r.guestId === guestId);

  const visits = guestReservations.filter(
    (r) => r.bookingStatus === 'checked_in' || r.bookingStatus === 'checked_out'
  ).length;

  let totalSpent = 0;
  for (const r of guestReservations) {
    const totals = getFolioTotals(transactions, r.id);
    if (r.bookingStatus === 'cancelled') {
      const fee = typeof r.cancellationFee === 'number' && r.cancellationFee > 0 ? r.cancellationFee : 0;
      totalSpent += Math.min(Math.max(0, totals.netPaid), fee);
    } else {
      totalSpent += Math.max(0, totals.netPaid);
    }
  }

  return { visits, totalSpent };
}
