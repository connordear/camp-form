// Pure booking helpers: no database, no Stripe. Unit tested.
import { daysUntil, isDateString } from "./dates";

/**
 * Stripe's shortest allowed checkout session lifetime is 30 minutes. The hold
 * on the site lasts a little longer, so a guest can never pay for a site whose
 * hold has already been released.
 */
export const CHECKOUT_SESSION_MINUTES = 30;
export const HOLD_GRACE_MINUTES = 5;

export function holdTimes(now: Date = new Date()): {
  sessionExpiresAt: Date;
  holdExpiresAt: Date;
} {
  const minute = 60 * 1000;
  const sessionExpiresAt = new Date(
    now.getTime() + CHECKOUT_SESSION_MINUTES * minute,
  );
  return {
    sessionExpiresAt,
    holdExpiresAt: new Date(
      sessionExpiresAt.getTime() + HOLD_GRACE_MINUTES * minute,
    ),
  };
}

function parts(dateStr: string) {
  if (!isDateString(dateStr)) throw new Error(`Invalid date: ${dateStr}`);
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const month = new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    month: "short",
  }).format(date);
  return { year: y, month, day: d };
}

/**
 * A stay for people, without repeating what both dates share:
 * "Jul 3 to 5, 2027", "Jul 30 to Aug 2, 2027", "Dec 30, 2027 to Jan 2, 2028".
 */
export function formatStayRange(checkIn: string, checkOut: string): string {
  const a = parts(checkIn);
  const b = parts(checkOut);
  if (a.year !== b.year) {
    return `${a.month} ${a.day}, ${a.year} to ${b.month} ${b.day}, ${b.year}`;
  }
  if (a.month !== b.month) {
    return `${a.month} ${a.day} to ${b.month} ${b.day}, ${b.year}`;
  }
  return `${a.month} ${a.day} to ${b.day}, ${b.year}`;
}

export function nightsLabel(nights: number): string {
  return `${nights} ${nights === 1 ? "night" : "nights"}`;
}

/** The single Stripe line item name, e.g. "Site 7, Jul 3 to 5, 2027, 2 nights". */
export function bookingLineItemName(
  siteName: string,
  checkIn: string,
  checkOut: string,
): string {
  const nights = daysUntil(checkOut, checkIn);
  return `${siteName}, ${formatStayRange(checkIn, checkOut)}, ${nightsLabel(nights)}`;
}

/** Subtotal in cents, before tax, for a flat nightly rate. */
export function stayCost(nightlyRate: number, nights: number): number {
  return nightlyRate * nights;
}

/** Party size must be a whole number from 1 to the site's maximum. */
export function partySizeError(
  partySize: number,
  maxOccupancy: number,
): string | null {
  if (!Number.isInteger(partySize) || partySize < 1) {
    return "Party size must be at least 1.";
  }
  if (partySize > maxOccupancy) {
    return `This site fits at most ${maxOccupancy} ${maxOccupancy === 1 ? "person" : "people"}.`;
  }
  return null;
}

/** "14:00" → "2:00 PM". Settings store check-in and check-out as 24-hour HH:MM. */
export function formatClockTime(hhmm: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!match) return hhmm;
  const hours = Number(match[1]);
  const suffix = hours < 12 ? "AM" : "PM";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${match[2]} ${suffix}`;
}

export type BookingGroup = "upcoming" | "past" | "cancelled" | "expired";

/**
 * Where a booking belongs in a list. Unpaid holds count as upcoming while
 * they last. Expired holds that were refunded (paid too late) count as
 * cancelled; plain expired holds were never paid for.
 */
export function bookingGroup(
  booking: {
    status: "pending" | "confirmed" | "cancelled" | "expired";
    checkOut: string;
    refundAmount: number | null;
  },
  today: string,
): BookingGroup {
  switch (booking.status) {
    case "pending":
      return "upcoming";
    case "confirmed":
      return booking.checkOut > today ? "upcoming" : "past";
    case "cancelled":
      return "cancelled";
    case "expired":
      return booking.refundAmount !== null ? "cancelled" : "expired";
  }
}
