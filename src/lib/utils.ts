import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  ageOn,
  campgroundToday,
  daysUntil,
  formatDisplayDate,
  formatMonthDay,
  isDateString,
} from "@/lib/campground/dates";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBaseUrl() {
  if (typeof window !== "undefined") {
    // If on client, use the window location
    return window.location.origin;
  }

  // If on server, check env vars
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Vercel specific (automatic)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Fallback to localhost
  return "http://localhost:3000";
}

/**
 * Age today, at camp, for a "YYYY-MM-DD" date of birth. Pass `today` to make
 * it deterministic in tests.
 */
export function getAge(dob: string, today: string = campgroundToday()) {
  if (!isDateString(dob)) return Number.NaN;
  return ageOn(dob, today);
}

/**
 * Calculates the number of days between two dates.
 * @param startDate - Start date (Date object, string, or timestamp)
 * @param endDate - End date (Date object, string, or timestamp)
 * @param inclusive - If true, adds 1 day (e.g., Mon to Fri becomes 5 days instead of 4)
 */
export function getDaysBetweenDates(
  startDate: string | Date | number,
  endDate: string | Date | number,
  inclusive: boolean = false,
): number {
  // Plain "YYYY-MM-DD" strings are calendar dates: count them as such, so
  // the result does not depend on the local time zone or daylight saving.
  if (
    typeof startDate === "string" &&
    typeof endDate === "string" &&
    isDateString(startDate) &&
    isDateString(endDate)
  ) {
    const days = Math.abs(daysUntil(endDate, startDate));
    return inclusive ? days + 1 : days;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Validate dates
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    console.error("Invalid date passed to getDaysBetweenDates", {
      startDate,
      endDate,
    });
    return 0;
  }

  // Reset hours to midnight to ensure clean day calculation
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return inclusive ? diffDays + 1 : diffDays;
}

export function formatDateRange(dateStr1: string, dateStr2: string) {
  const d1 = new Date(dateStr1 + "T00:00:00");
  const d2 = new Date(dateStr2 + "T00:00:00");

  const month = d1.toLocaleString("en-US", { month: "short" });
  const day1 = d1.getDate();
  const day2 = d2.getDate();

  return `${month}. ${day1} - ${day2}`;
}

export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * "Nov 18 - Nov 20, 2026" from two "YYYY-MM-DD" date strings. The strings are
 * read as calendar dates, so the result does not depend on the time zone the
 * code runs in. (`new Date("2026-11-18")` is midnight UTC, which is still
 * Nov 17 in Alberta.)
 */
export function formatDateRangeWithYear(
  startDate: string,
  endDate: string,
): string {
  return `${formatMonthDay(startDate)} - ${formatDisplayDate(endDate)}`;
}
