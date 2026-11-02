import { PosItem } from '../types/hms';

export const POS_CATEGORIES: ReadonlyArray<PosItem['category']> = [
  'Meals',
  'Beverages',
  'Breakfast',
  'Snacks',
  'Laundry',
  'Room Amenities'
];

export interface ValidatePosItemInput {
  name: string;
  category: string;
  price: number;
}

export interface ValidatePosItemResult {
  valid: boolean;
  error?: string;
  errorKey?: string;
  errorVars?: Record<string, string | number>;
}

/**
 * Validates a POS / Menu item.
 * - name: required (trimmed, min 2 chars)
 * - category: must be one of the existing categories
 * - price: must be a whole number > 0
 * - name: must be unique (case-insensitive) among other items
 */
export function validatePosItem(
  { name, category, price }: ValidatePosItemInput,
  existingItems: PosItem[],
  editingId?: string
): ValidatePosItemResult {
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (trimmedName.length < 2) {
    return {
      valid: false,
      error: 'Item name is required and must be at least 2 characters.',
      errorKey: 'pos.nameTooShort'
    };
  }

  if (!POS_CATEGORIES.includes(category as PosItem['category'])) {
    return {
      valid: false,
      error: `Invalid category. Allowed categories are: ${POS_CATEGORIES.join(', ')}.`,
      errorKey: 'pos.invalidCategory'
    };
  }

  if (typeof price !== 'number' || isNaN(price) || !Number.isInteger(price) || price <= 0) {
    return {
      valid: false,
      error: 'Price must be a whole number greater than 0 (FCFA has no decimals).',
      errorKey: 'pos.invalidPrice'
    };
  }

  const normalizedName = trimmedName.toLowerCase();
  const isDuplicate = existingItems.some(
    (item) => item.id !== editingId && item.name.trim().toLowerCase() === normalizedName
  );

  if (isDuplicate) {
    return {
      valid: false,
      error: `An item named "${trimmedName}" already exists in the menu.`,
      errorKey: 'pos.duplicateName',
      errorVars: { name: trimmedName }
    };
  }

  return { valid: true };
}
