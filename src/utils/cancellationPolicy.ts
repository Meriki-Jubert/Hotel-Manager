import { CancellationPolicy, Reservation } from '../types/hms';
import { translate, Language } from '../i18n/translate';

export interface CalculateCancellationFeeArgs {
  policy: CancellationPolicy;
  booking: Pick<
    Reservation,
    'checkInDate' | 'totalAmount' | 'nightlyRate' | 'rateType' | 'totalNights'
  >;
  businessDate: string;
  isNoShow?: boolean;
}

export interface CancellationFeeResult {
  suggestedFee: number;
  ruleText: string;
}

/** Whole calendar days from dateA to dateB using local dates (YYYY-MM-DD). */
function wholeDaysBetween(dateA: string, dateB: string): number {
  const partsA = dateA.split('-').map(Number);
  const partsB = dateB.split('-').map(Number);
  if (partsA.length !== 3 || partsB.length !== 3 || partsA.some(isNaN) || partsB.some(isNaN)) {
    return 0;
  }
  const a = new Date(partsA[0], partsA[1] - 1, partsA[2]);
  const b = new Date(partsB[0], partsB[1] - 1, partsB[2]);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function computeFeeAmount(
  feeType: 'percent' | 'nights',
  value: number,
  totalAmount: number,
  nightlyRate: number
): number {
  if (feeType === 'percent') {
    return (value / 100) * totalAmount;
  }
  return value * nightlyRate;
}

/**
 * Pure cancellation fee calculator.
 * - Days before arrival = whole days between businessDate and booking.checkInDate.
 * - A tier applies when cancellation is made N or fewer days before arrival;
 *   the matching tier with the SMALLEST daysBeforeArrival wins.
 * - No matching tier => fee 0 (free cancellation).
 * - No-show uses policy.noShow.
 * - rateType 'non_refundable' => full booking total.
 * - Result rounded to whole number and capped at booking total.
 */
export function calculateCancellationFee({
  policy,
  booking,
  businessDate,
  isNoShow
}: CalculateCancellationFeeArgs): CancellationFeeResult {
  const total = typeof booking.totalAmount === 'number' ? booking.totalAmount : 0;
  const nights = typeof booking.totalNights === 'number' && booking.totalNights > 0 ? booking.totalNights : 1;
  const nightly =
    typeof booking.nightlyRate === 'number' && booking.nightlyRate > 0
      ? booking.nightlyRate
      : total / Math.max(1, nights);
  const rateType = booking.rateType || 'flexible';

  if (rateType === 'non_refundable') {
    const fee = Math.round(Math.max(0, total));
    return {
      suggestedFee: fee,
      ruleText: 'Non-refundable rate: full booking total applies'
    };
  }

  const safePolicy: CancellationPolicy = policy || {
    tiers: [],
    noShow: { feeType: 'nights', value: 1 },
    allowNonRefundable: false
  };

  if (isNoShow) {
    const noShow = safePolicy.noShow || { feeType: 'nights' as const, value: 1 };
    const raw = computeFeeAmount(noShow.feeType, noShow.value, total, nightly);
    const fee = Math.min(Math.round(Math.max(0, raw)), total);
    const ruleText =
      noShow.feeType === 'percent'
        ? `No-show: ${noShow.value}% of booking total`
        : `No-show: ${noShow.value} night${noShow.value === 1 ? '' : 's'} charge`;
    return { suggestedFee: fee, ruleText };
  }

  const daysBefore = wholeDaysBetween(businessDate, booking.checkInDate);
  const tiers = Array.isArray(safePolicy.tiers) ? safePolicy.tiers : [];

  const timingText =
    daysBefore === 0
      ? 'Cancelled on the arrival day'
      : daysBefore < 0
      ? 'Cancelled after the arrival date'
      : `Cancelled ${daysBefore} day${daysBefore === 1 ? '' : 's'} before arrival`;

  const matching = tiers.filter(
    (t) => typeof t.daysBeforeArrival === 'number' && t.daysBeforeArrival >= daysBefore
  );

  if (matching.length === 0) {
    return {
      suggestedFee: 0,
      ruleText: `${timingText}: free cancellation`
    };
  }

  matching.sort((a, b) => a.daysBeforeArrival - b.daysBeforeArrival);
  const tier = matching[0];
  const raw = computeFeeAmount(tier.feeType, tier.value, total, nightly);
  const fee = Math.min(Math.round(Math.max(0, raw)), total);

  const feeDesc =
    tier.feeType === 'percent'
      ? `${tier.value}% of booking total`
      : `${tier.value} night${tier.value === 1 ? '' : 's'} charge`;

  const ruleText = `${timingText}: ${feeDesc}`;

  return { suggestedFee: fee, ruleText };
}

/**
 * One-line summary of the free-cancellation window for the new-reservation modal.
 */
export function getCancellationPolicySummary(
  policy: CancellationPolicy | undefined,
  tOrLang?: ((key: any, vars?: any) => string) | Language
): string {
  const safe =
    policy || {
      tiers: [],
      noShow: { feeType: 'nights' as const, value: 1 },
      allowNonRefundable: false
    };

  const tr =
    typeof tOrLang === 'function'
      ? tOrLang
      : typeof tOrLang === 'string'
      ? (k: string, v?: any) => translate(tOrLang, k, v)
      : (k: string, v?: any) => translate('en', k, v);

  const tiers = Array.isArray(safe.tiers) ? safe.tiers : [];
  if (tiers.length === 0) {
    return tr('policy.freeCancellation');
  }
  const maxDays = Math.max(...tiers.map((t) => t.daysBeforeArrival));
  if (maxDays <= 0) {
    return tr('policy.feesMayApply');
  }
  return tr('policy.freeUntilDays', { days: maxDays, plural: maxDays === 1 ? '' : 's' });
}

export const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
  tiers: [],
  noShow: { feeType: 'nights', value: 1 },
  allowNonRefundable: false
};
