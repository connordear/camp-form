/**
 * Date helpers for the campground.
 *
 * All campground dates are plain "YYYY-MM-DD" strings (what Drizzle returns
 * for `date` columns). They are never passed through `new Date()` without an
 * explicit time zone: arithmetic is done in UTC on the date alone, and "today"
 * is always computed in the campground's own time zone.
 */

// TODO: confirm with the owner (see docs/campground-booking-plan.md, section 10).
export const CAMPGROUND_TIMEZONE = "America/Edmonton";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** True for a real calendar date in "YYYY-MM-DD" form. */
export function isDateString(value: string): boolean {
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

function toUtcMs(dateStr: string): number {
  if (!isDateString(dateStr)) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Shift a date string by a whole number of days. */
export function addDays(dateStr: string, days: number): string {
  return fromUtcMs(toUtcMs(dateStr) + days * MS_PER_DAY);
}

/**
 * Today's date at the campground, as "YYYY-MM-DD".
 * Pass `now` to make it deterministic in tests.
 */
export function campgroundToday(now: Date = new Date()): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CAMPGROUND_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Whole days from `todayStr` to `dateStr`. Positive when `dateStr` is in the
 * future, 0 when it is today, negative when it is in the past.
 */
export function daysUntil(dateStr: string, todayStr: string): number {
  return Math.round((toUtcMs(dateStr) - toUtcMs(todayStr)) / MS_PER_DAY);
}

/**
 * The nights a stay occupies: `checkIn` up to but not including `checkOut`.
 * A 3 July to 5 July stay returns ["…-07-03", "…-07-04"].
 * Returns an empty array when `checkOut` is not after `checkIn`.
 */
export function nightsBetween(checkIn: string, checkOut: string): string[] {
  const count = daysUntil(checkOut, checkIn);
  const nights: string[] = [];
  for (let i = 0; i < count; i++) {
    nights.push(addDays(checkIn, i));
  }
  return nights;
}

/** A date string for people, e.g. "Jul 3, 2027". Never shifted by time zone. */
export function formatDisplayDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(toUtcMs(dateStr)));
}
