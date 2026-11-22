import { PosItem, StockMovement, StockMovementType } from '../types/hms';

export type StockLevelState = 'untracked' | 'ok' | 'low' | 'out';

export interface StockLevelRow {
  itemId: string;
  level: number;
  state: StockLevelState;
}

export interface SaleLine {
  itemId: string;
  qty: number;
}

export interface StockShortage {
  itemId: string;
  requested: number;
  available: number;
}

export interface CanSellResult {
  ok: boolean;
  shortages: StockShortage[];
}

export interface StockMovementValidationResult {
  valid: boolean;
  errorKey?: string;
  errorVars?: Record<string, string | number>;
}

/**
 * Computes the current whole-number stock level for a single POS item in a branch
 * by summing all signed quantities of matching StockMovement records.
 */
export function getStockLevel(
  movements: StockMovement[],
  itemId: string,
  branchId: string
): number {
  let sum = 0;
  for (const m of movements) {
    if (m.itemId === itemId && m.branchId === branchId) {
      sum += m.quantity;
    }
  }
  return sum;
}

/**
 * Computes stock level and status badge state for all POS items in a branch.
 * Untracked items always return state 'untracked' (never 'low' or 'out').
 * Tracked items:
 *   - level <= 0 -> 'out'
 *   - level <= (lowStockThreshold ?? 5) -> 'low'
 *   - otherwise -> 'ok'
 */
export function getStockLevels(
  items: PosItem[],
  movements: StockMovement[],
  branchId: string
): StockLevelRow[] {
  return items.map((item) => {
    if (!item.trackStock) {
      return {
        itemId: item.id,
        level: 0,
        state: 'untracked'
      };
    }

    const level = getStockLevel(movements, item.id, branchId);
    const threshold = typeof item.lowStockThreshold === 'number' ? item.lowStockThreshold : 5;

    let state: StockLevelState;
    if (level <= 0) {
      state = 'out';
    } else if (level <= threshold) {
      state = 'low';
    } else {
      state = 'ok';
    }

    return {
      itemId: item.id,
      level,
      state
    };
  });
}

/**
 * Checks whether an order of lines can be sold from the branch's current stock.
 * - Only tracked items (item.trackStock === true) are checked.
 * - Multiple lines for the same itemId are summed before checking availability.
 * - If requested > available (or available <= 0 while requested > 0), returns ok: false with shortages.
 */
export function canSell(
  items: PosItem[],
  movements: StockMovement[],
  branchId: string,
  lines: SaleLine[]
): CanSellResult {
  const itemMap = new Map<string, PosItem>();
  for (const item of items) {
    itemMap.set(item.id, item);
  }

  const requestedByItem = new Map<string, number>();
  const orderedIds: string[] = [];

  for (const line of lines) {
    const qty = Number(line.qty) || 0;
    if (qty <= 0) continue;
    const item = itemMap.get(line.itemId);
    if (!item || !item.trackStock) continue;

    if (!requestedByItem.has(line.itemId)) {
      orderedIds.push(line.itemId);
    }
    requestedByItem.set(line.itemId, (requestedByItem.get(line.itemId) || 0) + qty);
  }

  const shortages: StockShortage[] = [];
  for (const itemId of orderedIds) {
    const requested = requestedByItem.get(itemId) || 0;
    const available = getStockLevel(movements, itemId, branchId);
    if (available <= 0 || requested > available) {
      shortages.push({
        itemId,
        requested,
        available
      });
    }
  }

  return {
    ok: shortages.length === 0,
    shortages
  };
}

/**
 * Validates a stock movement input against business rules and current branch stock level:
 * - quantity must be a whole number (integer)
 * - 'receive' and 'return': quantity > 0
 * - 'waste': quantity > 0, reason trimmed >= 3 chars, currentLevel - quantity >= 0
 * - 'adjust': signed non-zero integer, reason trimmed >= 3 chars, currentLevel + quantity >= 0
 * - 'opening': whole number >= 0, only allowed when no movements exist yet in that branch
 * - 'sale': negative integer, currentLevel + quantity >= 0
 */
export function validateStockMovement(
  input: {
    type: StockMovementType;
    quantity: number;
    reason?: string;
  },
  currentLevel: number,
  hasExistingMovements: boolean = false
): StockMovementValidationResult {
  const { type, quantity, reason } = input;

  if (typeof quantity !== 'number' || isNaN(quantity) || !Number.isInteger(quantity)) {
    return { valid: false, errorKey: 'err.stock.quantityWhole' };
  }

  const trimmedReason = typeof reason === 'string' ? reason.trim() : '';

  if (type === 'receive' || type === 'return') {
    if (quantity <= 0) {
      return { valid: false, errorKey: 'err.stock.quantityPositive' };
    }
    return { valid: true };
  }

  if (type === 'waste') {
    if (quantity <= 0) {
      return { valid: false, errorKey: 'err.stock.quantityPositive' };
    }
    if (trimmedReason.length < 3) {
      return { valid: false, errorKey: 'err.stock.reasonMin' };
    }
    if (currentLevel - quantity < 0) {
      return {
        valid: false,
        errorKey: 'err.stock.cannotDropBelowZero',
        errorVars: { level: currentLevel }
      };
    }
    return { valid: true };
  }

  if (type === 'adjust') {
    if (quantity === 0) {
      return { valid: false, errorKey: 'err.stock.adjustNonZero' };
    }
    if (trimmedReason.length < 3) {
      return { valid: false, errorKey: 'err.stock.reasonMin' };
    }
    if (currentLevel + quantity < 0) {
      return {
        valid: false,
        errorKey: 'err.stock.cannotDropBelowZero',
        errorVars: { level: currentLevel }
      };
    }
    return { valid: true };
  }

  if (type === 'opening') {
    if (hasExistingMovements) {
      return { valid: false, errorKey: 'err.stock.openingAlreadyExists' };
    }
    if (quantity < 0) {
      return { valid: false, errorKey: 'err.stock.openingNonNegative' };
    }
    return { valid: true };
  }

  if (type === 'sale') {
    if (quantity >= 0) {
      return { valid: false, errorKey: 'err.stock.quantityWhole' };
    }
    if (currentLevel + quantity < 0) {
      return {
        valid: false,
        errorKey: 'err.stock.cannotDropBelowZero',
        errorVars: { level: currentLevel }
      };
    }
    return { valid: true };
  }

  return { valid: false, errorKey: 'err.stock.invalidMovement' };
}
