/**
 * Pure money helper functions for FCFA / integer currency handling.
 */

/**
 * Parses raw text input into a whole number (FCFA has no decimals).
 * Keeps digits only, '' -> 0, caps values above 999999999.
 */
export function parseMoneyInput(raw: string): number {
  if (!raw) return 0;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return 0;
  const val = parseInt(digits, 10);
  if (isNaN(val)) return 0;
  return Math.min(val, 999999999);
}

/**
 * Formats a money number with thousands separators according to language.
 * Uses space for 'fr' and comma for 'en'.
 */
export function formatMoneyInput(n: number, lang: string = 'fr'): string {
  if (typeof n !== 'number' || isNaN(n) || n === 0) return '';
  const numStr = String(Math.min(Math.max(0, Math.round(n)), 999999999));
  if (lang === 'fr') {
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
