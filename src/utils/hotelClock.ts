/**
 * Hotel Clock & Time Utilities
 * Supports time zone calculations independent of host machine's timezone.
 */

export interface HotelNow {
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:MM'
  minutes: number; // minutes since midnight (0..1439)
}

export type DepartureState = 'upcoming' | 'reminder' | 'due' | 'overdue';

export interface DepartureStatus {
  state: DepartureState;
  minutesLeft: number;
}

export const COMMON_TIME_ZONES = [
  'Africa/Douala',
  'Africa/Lagos',
  'Africa/Kinshasa',
  'Africa/Brazzaville',
  'Africa/Libreville',
  'Africa/Malabo',
  'Africa/Bangui',
  'Africa/Ndjamena',
  'Africa/Abidjan',
  'Africa/Accra',
  'Africa/Dakar',
  'Africa/Johannesburg',
  'Africa/Nairobi',
  'Africa/Cairo',
  'Africa/Casablanca',
  'Europe/Paris',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Brussels',
  'Europe/Madrid',
  'Europe/Rome',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Hong_Kong',
  'Asia/Kolkata',
  'Australia/Sydney',
  'UTC'
];

/**
 * Checks if an IANA timezone string is recognized.
 */
export function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Computes hotel current date, 24h time and minutes since midnight in the given IANA timezone,
 * independent of the computer's own zone. Falls back to 'Africa/Douala' if zone is invalid.
 */
export function getHotelNow(timeZone?: string, nowMs: number = Date.now()): HotelNow {
  const tz = timeZone && isValidTimeZone(timeZone) ? timeZone : 'Africa/Douala';

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });

  const parts = formatter.formatToParts(new Date(nowMs));
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(map.minute, 10);

  const date = `${map.year}-${map.month}-${map.day}`;
  const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const minutes = hour * 60 + minute;

  return { date, time, minutes };
}

/**
 * Parses 'HH:MM' string into minutes since midnight (0..1439).
 * Returns null if invalid.
 */
export function parseHHMM(str: string): number | null {
  if (typeof str !== 'string') return null;
  const match = str.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);

  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/**
 * Computes departure state and minutesLeft relative to hotel clock now.
 * - If checkOutDate < now.date: always 'overdue' (minutesLeft is negative).
 * - If checkOutDate === now.date:
 *     - minutesLeft < 0: 'overdue'
 *     - minutesLeft === 0: 'due'
 *     - 0 < minutesLeft <= reminderMinutes: 'reminder'
 *     - minutesLeft > reminderMinutes: 'upcoming'
 * - If checkOutDate > now.date: 'upcoming'
 */
export function getDepartureStatus({
  checkOutDate,
  checkOutTime,
  now,
  reminderMinutes
}: {
  checkOutDate: string;
  checkOutTime: string;
  now: HotelNow;
  reminderMinutes: number;
}): DepartureStatus {
  const targetMinutes = parseHHMM(checkOutTime) ?? 720;

  if (checkOutDate < now.date) {
    const dayDiff = Math.round(
      (new Date(checkOutDate + 'T00:00:00Z').getTime() - new Date(now.date + 'T00:00:00Z').getTime()) / 86400000
    );
    const minutesLeft = dayDiff * 1440 + (targetMinutes - now.minutes);
    return {
      state: 'overdue',
      minutesLeft
    };
  }

  if (checkOutDate > now.date) {
    const dayDiff = Math.round(
      (new Date(checkOutDate + 'T00:00:00Z').getTime() - new Date(now.date + 'T00:00:00Z').getTime()) / 86400000
    );
    const minutesLeft = dayDiff * 1440 + (targetMinutes - now.minutes);
    return {
      state: 'upcoming',
      minutesLeft
    };
  }

  // Same date: checkOutDate === now.date
  const minutesLeft = targetMinutes - now.minutes;

  if (minutesLeft < 0) {
    return { state: 'overdue', minutesLeft };
  }
  if (minutesLeft === 0) {
    return { state: 'due', minutesLeft };
  }
  if (minutesLeft <= reminderMinutes) {
    return { state: 'reminder', minutesLeft };
  }
  return { state: 'upcoming', minutesLeft };
}

/**
 * Formats a duration in minutes into a human-readable string:
 * e.g. 65 -> "1 h 5 min", 12 -> "12 min"
 */
export function formatMinutes(minutes: number): string {
  const total = Math.abs(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/**
 * Formats hotel date and time in the active language:
 * e.g. "Fri 5 Nov 2026 · 14:32" (en) or "ven. 5 nov. 2026 · 14:32" (fr)
 */
export function formatHotelDateTime(dateStr: string, timeStr: string, lang: 'en' | 'fr'): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dateFormatted = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(dt);

  return `${dateFormatted} · ${timeStr}`;
}
