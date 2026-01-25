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
