import { PaymentMethod } from '../types/hms';

export interface CalculateDiscountParams {
  type: 'percent' | 'fixed';
  value: number;
  chargesTotal: number;
}

export interface DiscountResult {
  discountAmount: number;
}

/**
 * Calculates discount amount.
 * Returns a whole number, never more than chargesTotal, never negative.
 * Percent must be 0-100, fixed must be > 0 (returns 0 for invalid input).
 */
export function calculateDiscount({
  type,
  value,
  chargesTotal
}: CalculateDiscountParams): DiscountResult {
  if (typeof chargesTotal !== 'number' || isNaN(chargesTotal) || chargesTotal <= 0) {
    return { discountAmount: 0 };
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return { discountAmount: 0 };
  }

  if (type === 'percent') {
    if (value < 0 || value > 100) {
      return { discountAmount: 0 };
    }
    const raw = (value / 100) * chargesTotal;
    const discountAmount = Math.min(chargesTotal, Math.max(0, Math.round(raw)));
    return { discountAmount };
  }

  if (type === 'fixed') {
    if (value <= 0) {
      return { discountAmount: 0 };
    }
    const discountAmount = Math.min(chargesTotal, Math.max(0, Math.round(value)));
    return { discountAmount };
  }

  return { discountAmount: 0 };
}

export interface SplitPaymentLine {
  method: PaymentMethod;
  amount: number;
}

export interface ValidateSplitPaymentParams {
  totalAmount: number;
  lines: SplitPaymentLine[];
}

export interface SplitPaymentValidationResult {
  valid: boolean;
  error?: string;
  errorKey?: string;
  errorVars?: Record<string, string | number>;
}

/**
 * Validates a split payment.
 * Valid only if every amount > 0 and the amounts add up exactly to totalAmount.
 */
export function validateSplitPayment({
  totalAmount,
  lines
}: ValidateSplitPaymentParams): SplitPaymentValidationResult {
  if (typeof totalAmount !== 'number' || isNaN(totalAmount) || totalAmount <= 0) {
    return {
      valid: false,
      error: 'Total payment amount must be greater than zero.',
      errorKey: 'split.totalMustBePositive'
    };
  }

  if (!Number.isInteger(totalAmount)) {
    return {
      valid: false,
      error: 'Amounts must be whole numbers (FCFA has no decimals).',
      errorKey: 'split.mustBeWholeNumber'
    };
  }

  if (!Array.isArray(lines) || lines.length === 0) {
    return {
      valid: false,
      error: 'At least one payment line is required.',
      errorKey: 'split.lineRequired'
    };
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (typeof line.amount !== 'number' || isNaN(line.amount) || line.amount <= 0) {
      return {
        valid: false,
        error: `Line ${i + 1} amount must be greater than zero.`,
        errorKey: 'split.lineAmountMustBePositive',
        errorVars: { index: i + 1 }
      };
    }
    if (!Number.isInteger(line.amount)) {
      return {
        valid: false,
        error: 'Amounts must be whole numbers (FCFA has no decimals).',
        errorKey: 'split.mustBeWholeNumber'
      };
    }
    if (!line.method) {
      return {
        valid: false,
        error: `Line ${i + 1} must have a valid payment method selected.`,
        errorKey: 'split.lineMethodRequired',
        errorVars: { index: i + 1 }
      };
    }
  }

  const sum = lines.reduce((acc, curr) => acc + curr.amount, 0);
  if (sum !== totalAmount) {
    return {
      valid: false,
      error: `Sum of split lines (${sum}) must equal the total amount (${totalAmount}).`,
      errorKey: 'split.sumMismatch',
      errorVars: { sum, total: totalAmount }
    };
  }

  return { valid: true };
}
