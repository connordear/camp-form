/**
 * Date helpers for the campground.
 *
 * All campground dates are plain "YYYY-MM-DD" strings (what Drizzle returns
 * for `date` columns). They are never passed through `new Date()` without an
 * explicit time zone: arithmetic is done in UTC on the date alone, and "today"
 * is always computed in the campground's own time zone.
 */

// The camp and the campground share one property, so this is the time zone
// for every "what day is it" question in the app, camp deadlines included.
// TODO: confirm with the owner (see docs/campground-booking-plan.md, section 10).
export const CAMPGROUND_TIMEZONE = "America/Edmonton";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * `Date.UTC` for any year. `Date.UTC` itself reads years 0 to 99 as 1900 to
 * 1999, which would turn a mistyped birth year like 0015 into 1915.
 */
export function utcDateMs(y: number, m: number, d: number): number {
  const date = new Date(Date.UTC(2000, m - 1, d));
  date.setUTCFullYear(y);
  return date.getTime();
}

/** True for a real calendar date in "YYYY-MM-DD" form. */
export function isDateString(value: string): boolean {
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(utcDateMs(y, m, d));
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
  return utcDateMs(y, m, d);
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

/** A date string without its year, e.g. "Jul 3". Never shifted by time zone. */
export function formatMonthDay(dateStr: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(toUtcMs(dateStr)));
}

/**
 * Age in whole years on `todayStr` for someone born on `birthDateStr`.
 * Compares calendar dates, so the birthday counts from its first minute.
 */
export function ageOn(birthDateStr: string, todayStr: string): number {
  toUtcMs(birthDateStr);
  toUtcMs(todayStr);
  const years = Number(todayStr.slice(0, 4)) - Number(birthDateStr.slice(0, 4));
  // "MM-DD" strings compare in calendar order.
  return todayStr.slice(5) < birthDateStr.slice(5) ? years - 1 : years;
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

/** Milliseconds `timeZone` is ahead of UTC at `instant` (negative west of UTC). */
function timeZoneOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  const wallClockAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return wallClockAsUtc - Math.floor(instant / 1000) * 1000;
}

/**
 * The last millisecond of `dateStr` in `timeZone` (23:59:59.999 local time),
 * as a real instant. Use it for deadlines that run "through" a date.
 */
export function endOfDay(
  dateStr: string,
  timeZone: string = CAMPGROUND_TIMEZONE,
): Date {
  // Midnight starting the next day, local time, minus one millisecond.
  const nextMidnightAsUtc = toUtcMs(addDays(dateStr, 1));
  let instant =
    nextMidnightAsUtc - timeZoneOffsetMs(nextMidnightAsUtc, timeZone);
  // Re-check in case the guess landed on the other side of a DST change.
  instant = nextMidnightAsUtc - timeZoneOffsetMs(instant, timeZone);
  return new Date(instant - 1);
}
