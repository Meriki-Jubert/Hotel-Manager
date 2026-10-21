import { FolioTransaction, PaymentMethod } from '../types/hms';

export interface FolioTotals {
  charges: number;
  payments: number;
  refunds: number;
  netPaid: number;
  balance: number;
}

/**
 * Calculates folio financial totals for a reservation.
 * Every calculation ignores transactions with voided === true.
 * - charges: sum of non-voided type 'charge'
 * - payments: sum of non-voided type 'payment' with positive amount
 * - refunds: absolute value of non-voided negative payments (category 'refund' or negative amount)
 * - netPaid: payments - refunds
 * - balance: charges - netPaid (negative means the guest has credit)
 */
export function getFolioTotals(
  transactions: FolioTransaction[],
  reservationId: string
): FolioTotals {
  let charges = 0;
  let payments = 0;
  let refunds = 0;

  for (const t of transactions) {
    if (t.voided || t.reservationId !== reservationId) continue;

    if (t.type === 'charge') {
      charges += t.amount;
    } else if (t.type === 'payment') {
      if (t.amount > 0) {
        payments += t.amount;
      } else {
        refunds += Math.abs(t.amount);
      }
    }
  }

  const netPaid = payments - refunds;
  const balance = charges - netPaid;

  return {
    charges,
    payments,
    refunds,
    netPaid,
    balance
  };
}

/**
 * Sums payments by payment method across transactions.
 * Ignores voided entries and keeps refunds as negatives, so drawer totals match physical money.
 */
export function sumPaymentsByMethod(
  transactions: FolioTransaction[],
  method: PaymentMethod,
  filterFn?: (t: FolioTransaction) => boolean
): number {
  let sum = 0;
  for (const t of transactions) {
    if (t.voided) continue;
    if (t.type !== 'payment') continue;
    if (t.paymentMethod !== method) continue;
    if (filterFn && !filterFn(t)) continue;

    sum += t.amount;
  }
  return sum;
}
