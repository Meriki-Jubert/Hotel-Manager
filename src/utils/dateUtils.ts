/**
 * Local timezone date utilities for Hotel Management System.
 * Ensures all dates and business day rollovers respect local calendar days
 * rather than UTC day shifts.
 */

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getNextLocalDateString(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getLocalDateString(d);
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  date.setDate(date.getDate() + 1);
  return getLocalDateString(date);
}

export function addDaysToLocalDate(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return getLocalDateString(d);
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}

export function getLocalTimestampString(d: Date = new Date()): string {
  const date = getLocalDateString(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${date} ${hours}:${minutes}`;
}

/**
 * Checks whether two date ranges [startA, endA] and [startB, endB] overlap.
 * Date strings must be in 'YYYY-MM-DD' format.
 * Note: A checkout on date X does NOT overlap with a checkin on date X (startA < endB && endA > startB).
 */
export function doDateRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && endA > startB;
}

export function calculateStayNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return 1;
  const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return (
    d.getFullYear() === parts[0] &&
    d.getMonth() === parts[1] - 1 &&
    d.getDate() === parts[2]
  );
}

export function listNights(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  let curr = checkIn;
  while (curr < checkOut) {
    nights.push(curr);
    curr = addDaysToLocalDate(curr, 1);
  }
  return nights;
}
