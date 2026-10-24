export interface CalculateTaxBreakdownParams {
  totalIncludingTax: number;
  ratePercent: number;
}

export interface TaxBreakdownResult {
  net: number;
  tax: number;
}

/**
 * Calculates the tax breakdown for tax-inclusive prices.
 * - tax = Math.round(totalIncludingTax * ratePercent / (100 + ratePercent))
 * - net = totalIncludingTax - tax
 * - Returns whole numbers only.
 * - If totalIncludingTax <= 0 or ratePercent <= 0 or invalid: tax = 0 and net = the total (never negative).
 */
export function calculateTaxBreakdown({
  totalIncludingTax,
  ratePercent
}: CalculateTaxBreakdownParams): TaxBreakdownResult {
  if (
    typeof totalIncludingTax !== 'number' ||
    isNaN(totalIncludingTax) ||
    totalIncludingTax <= 0 ||
    typeof ratePercent !== 'number' ||
    isNaN(ratePercent) ||
    ratePercent <= 0
  ) {
    const safeNet = Math.max(0, Math.round(totalIncludingTax || 0));
    return {
      net: safeNet,
      tax: 0
    };
  }

  const roundedTotal = Math.round(totalIncludingTax);
  const tax = Math.round((roundedTotal * ratePercent) / (100 + ratePercent));
  const net = roundedTotal - tax;

  return {
    net: Math.max(0, net),
    tax: Math.max(0, tax)
  };
}
