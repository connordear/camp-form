import { addDays, daysUntil, isDateString } from "./dates";

/**
 * Helpers for the admin month grid and blocked nights. Months are "YYYY-MM"
 * strings and dates are "YYYY-MM-DD", like everywhere else in the campground.
 */

const MONTH_RE = /^(\d{4})-(\d{2})$/;

export function isMonthString(value: string): boolean {
  const match = MONTH_RE.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

/** The month a date falls in, e.g. "2027-07-03" -> "2027-07". */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** The first day of a month, e.g. "2027-07" -> "2027-07-01". */
export function monthStart(month: string): string {
  return `${month}-01`;
}

/** Move a month forward or back, e.g. shiftMonth("2027-12", 1) -> "2028-01". */
export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + by;
  const year = Math.floor(index / 12);
  const mon = (index % 12) + 1;
  return `${year}-${String(mon).padStart(2, "0")}`;
}

/** Every date in a month, in order. */
export function monthDays(month: string): string[] {
  const start = monthStart(month);
  const next = monthStart(shiftMonth(month, 1));
  const count = daysUntil(next, start);
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

/** "July 2027". */
export function formatMonth(month: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${monthStart(month)}T00:00:00Z`));
}

/** The month to show: the `?month=` value if valid, otherwise today's month. */
export function parseMonthParam(
  value: string | undefined,
  today: string,
): string {
  return value && isMonthString(value) ? value : monthOf(today);
}

export type BlockedNight = { siteId: string; night: string; reason: string };

/** A run of back-to-back blocked nights on one site with the same reason. */
export type BlockedRange = {
  siteId: string;
  /** First blocked night. */
  from: string;
  /** Morning after the last blocked night (exclusive, like check-out). */
  to: string;
  reason: string;
  nights: string[];
};

/** Group blocked nights into ranges, by site, then by date. */
export function groupBlockedNights(rows: BlockedNight[]): BlockedRange[] {
  const sorted = [...rows].sort(
    (a, b) =>
      a.siteId.localeCompare(b.siteId) || a.night.localeCompare(b.night),
  );
  const ranges: BlockedRange[] = [];
  for (const row of sorted) {
    const last = ranges.at(-1);
    if (
      last &&
      last.siteId === row.siteId &&
      last.reason === row.reason &&
      last.to === row.night
    ) {
      last.nights.push(row.night);
      last.to = addDays(row.night, 1);
    } else {
      ranges.push({
        siteId: row.siteId,
        from: row.night,
        to: addDays(row.night, 1),
        reason: row.reason,
        nights: [row.night],
      });
    }
  }
  return ranges.sort(
    (a, b) => a.from.localeCompare(b.from) || a.siteId.localeCompare(b.siteId),
  );
}

/** One cell of a site's row in the month grid. */
export type GridSpan<T> =
  | { kind: "free"; date: string }
  | {
      kind: "taken";
      /** First day of the month the span covers. */
      start: string;
      days: number;
      item: T;
      /** The booking or block carries on from the previous month. */
      continuesBefore: boolean;
      /** The booking or block carries on into the next month. */
      continuesAfter: boolean;
    };

/**
 * Lay one site's nights out across a month. Back-to-back nights that belong to
 * the same booking or block (same `key`) become one span.
 */
export function gridSpans<T>(
  days: string[],
  nights: Map<string, T>,
  key: (item: T) => string,
): GridSpan<T>[] {
  const spans: GridSpan<T>[] = [];
  let i = 0;
  while (i < days.length) {
    const item = nights.get(days[i]);
    if (item === undefined) {
      spans.push({ kind: "free", date: days[i] });
      i++;
      continue;
    }
    const k = key(item);
    let j = i + 1;
    while (j < days.length) {
      const next = nights.get(days[j]);
      if (next === undefined || key(next) !== k) break;
      j++;
    }
    const before = nights.get(addDays(days[i], -1));
    const after = nights.get(addDays(days[j - 1], 1));
    spans.push({
      kind: "taken",
      start: days[i],
      days: j - i,
      item,
      continuesBefore: i === 0 && before !== undefined && key(before) === k,
      continuesAfter:
        j === days.length && after !== undefined && key(after) === k,
    });
    i = j;
  }
  return spans;
}

/** Whether a date string is valid and the range runs forward. */
export function isValidRange(from: string, to: string): boolean {
  return isDateString(from) && isDateString(to) && to > from;
}
