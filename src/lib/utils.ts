import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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

export function getAge(dob: string) {
  const birthDate = new Date(dob);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  // If the birth month hasn't happened yet, or it's the same month but the day hasn't passed
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
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
  const asUtc = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  };
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  };
  const start = asUtc(startDate).toLocaleDateString("en-US", options);
  const end = asUtc(endDate).toLocaleDateString("en-US", {
    ...options,
    year: "numeric",
  });
  return `${start} - ${end}`;
}
