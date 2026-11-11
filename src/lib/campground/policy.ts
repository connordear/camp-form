import type { CancellationTier } from "@/lib/data/schema";
import { addDays, daysUntil, formatDisplayDate, isDateString } from "./dates";

/** Tiers ordered from the earliest cancellation (most days before) to the latest. */
export function sortTiers(tiers: CancellationTier[]): CancellationTier[] {
  return [...tiers].sort((a, b) => b.minDaysBefore - a.minDaysBefore);
}

/**
 * Refund owed when a booking is cancelled on `todayStr`.
 * The first tier (by `minDaysBefore`, descending) whose threshold is met
 * gives the percentage. No matching tier means no refund.
 */
export function calculateRefund(
  pricePaid: number,
  tiers: CancellationTier[],
  checkIn: string,
  todayStr: string,
): { percent: number; amount: number } {
  const days = daysUntil(checkIn, todayStr);
  const tier = sortTiers(tiers).find((t) => days >= t.minDaysBefore);
  const percent = tier?.refundPercent ?? 0;
  return { percent, amount: Math.round((pricePaid * percent) / 100) };
}

/**
 * Validate a set of cancellation tiers. Returns a list of problems; an empty
 * list means the tiers are valid. An empty tier list is valid (no refunds).
 */
export function validateTiers(tiers: CancellationTier[]): string[] {
  const errors: string[] = [];

  for (const tier of tiers) {
    if (!Number.isInteger(tier.minDaysBefore) || tier.minDaysBefore < 0) {
      errors.push("Days before check-in must be a whole number of 0 or more.");
    }
    if (
      !Number.isInteger(tier.refundPercent) ||
      tier.refundPercent < 0 ||
      tier.refundPercent > 100
    ) {
      errors.push("Refund percentage must be a whole number from 0 to 100.");
    }
  }

  const days = tiers.map((t) => t.minDaysBefore);
  if (new Set(days).size !== days.length) {
    errors.push("Each tier must have a different number of days.");
  }

  const sorted = sortTiers(tiers);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].refundPercent > sorted[i - 1].refundPercent) {
      errors.push(
        "Refund percentage cannot increase as check-in gets closer " +
          `(${sorted[i].minDaysBefore} days gives more than ${sorted[i - 1].minDaysBefore} days).`,
      );
    }
  }

  return [...new Set(errors)];
}

/**
 * One stretch of time with a single refund percentage. `fromDays` and
 * `toDays` are days before check-in (as `daysUntil(checkIn, cancelDate)`),
 * both inclusive. `toDays` null means "or more"; `fromDays` null means
 * "or later", including on and after check-in day.
 */
export type RefundWindow = {
  fromDays: number | null;
  toDays: number | null;
  refundPercent: number;
};

/**
 * Turn tiers into windows that do not overlap, from earliest cancellation
 * to latest, always ending with the no-refund window. Neighbouring windows
 * with the same percentage are merged.
 */
export function refundWindows(tiers: CancellationTier[]): RefundWindow[] {
  const sorted = sortTiers(tiers);
  const windows: RefundWindow[] = sorted.map((tier, i) => ({
    fromDays: tier.minDaysBefore,
    toDays: i === 0 ? null : sorted[i - 1].minDaysBefore - 1,
    refundPercent: tier.refundPercent,
  }));
  const lowest = sorted.at(-1);
  windows.push({
    fromDays: null,
    toDays: lowest ? lowest.minDaysBefore - 1 : null,
    refundPercent: 0,
  });

  const merged: RefundWindow[] = [];
  for (const w of windows) {
    const prev = merged.at(-1);
    if (prev && prev.refundPercent === w.refundPercent) {
      prev.fromDays = w.fromDays;
    } else {
      merged.push({ ...w });
    }
  }
  return merged;
}

export function describeRefund(percent: number): string {
  if (percent >= 100) return "Full refund";
  if (percent <= 0) return "No refund";
  return `${percent}% refund`;
}

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

/** "When you cancel" wording for a window, relative to check-in. */
export function describeWindow({ fromDays, toDays }: RefundWindow): string {
  if (fromDays === null) {
    if (toDays === null) return "Any time";
    if (toDays < 0) return "After check-in day";
    if (toDays === 0) return "On or after check-in day";
    return `Less than ${days(toDays + 1)} before check-in`;
  }
  if (toDays === null) {
    return fromDays === 0
      ? "Any time up to and including check-in day"
      : `${days(fromDays)} or more before check-in`;
  }
  if (fromDays === toDays) {
    return fromDays === 0
      ? "On check-in day"
      : `${days(fromDays)} before check-in`;
  }
  return fromDays === 0
    ? `Check-in day, or up to ${days(toDays)} before`
    : `${fromDays} to ${days(toDays)} before check-in`;
}

export type DatedRefundWindow = {
  /** First cancellation date in the window; null means no earliest date. */
  startDate: string | null;
  /** Last cancellation date in the window; null means no latest date. */
  endDate: string | null;
  refundPercent: number;
};

/** The refund windows for a specific stay, as cancellation dates. */
export function refundSchedule(
  tiers: CancellationTier[],
  checkIn: string,
): DatedRefundWindow[] {
  return refundWindows(tiers).map((w) => ({
    startDate: w.toDays === null ? null : addDays(checkIn, -w.toDays),
    endDate: w.fromDays === null ? null : addDays(checkIn, -w.fromDays),
    refundPercent: w.refundPercent,
  }));
}

/** "When you cancel" wording for a dated window, e.g. "Jul 4 to Jul 9, 2027". */
export function describeDatedWindow(
  { startDate, endDate }: DatedRefundWindow,
  format: (date: string) => string = formatDisplayDate,
): string {
  if (startDate === null && endDate === null) return "Any time";
  if (startDate === null) return `On or before ${format(endDate as string)}`;
  if (endDate === null) return `On or after ${format(startDate)}`;
  if (startDate === endDate) return `On ${format(startDate)}`;
  return `${format(startDate)} to ${format(endDate)}`;
}

export type StaySettings = {
  seasonStart: string | null;
  seasonEnd: string | null;
  minNights: number;
  maxNights: number;
  maxAdvanceDays: number;
};

export type StayValidation =
  | { valid: true; nights: number }
  | { valid: false; error: string };

/**
 * Check a requested stay against the campground settings.
 * A null season start or end leaves that side of the season unbounded.
 */
export function validateStay(
  checkIn: string,
  checkOut: string,
  settings: StaySettings,
  todayStr: string,
): StayValidation {
  if (!isDateString(checkIn) || !isDateString(checkOut)) {
    return { valid: false, error: "Dates must be valid calendar dates." };
  }

  const nights = daysUntil(checkOut, checkIn);
  if (nights <= 0) {
    return { valid: false, error: "Check-out must be after check-in." };
  }

  const daysAhead = daysUntil(checkIn, todayStr);
  if (daysAhead < 0) {
    return { valid: false, error: "Check-in cannot be in the past." };
  }
  if (daysAhead > settings.maxAdvanceDays) {
    return {
      valid: false,
      error: `Bookings open at most ${settings.maxAdvanceDays} days in advance.`,
    };
  }

  if (settings.seasonStart && checkIn < settings.seasonStart) {
    return {
      valid: false,
      error: `The season starts on ${settings.seasonStart}.`,
    };
  }
  if (settings.seasonEnd && checkOut > settings.seasonEnd) {
    return {
      valid: false,
      error: `The last check-out date of the season is ${settings.seasonEnd}.`,
    };
  }

  if (nights < settings.minNights) {
    return {
      valid: false,
      error: `The minimum stay is ${settings.minNights} ${settings.minNights === 1 ? "night" : "nights"}.`,
    };
  }
  if (nights > settings.maxNights) {
    return {
      valid: false,
      error: `The maximum stay is ${settings.maxNights} ${settings.maxNights === 1 ? "night" : "nights"}.`,
    };
  }

  return { valid: true, nights };
}
