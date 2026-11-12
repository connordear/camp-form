import { describe, expect, test } from "bun:test";
import { formatDateRangeWithYear, getAge, getDaysBetweenDates } from "./utils";

describe("formatDateRangeWithYear", () => {
  test("shows the stored dates in any server time zone", () => {
    const original = process.env.TZ;
    try {
      for (const tz of ["America/Edmonton", "UTC", "Pacific/Auckland"]) {
        process.env.TZ = tz;
        expect(formatDateRangeWithYear("2026-11-18", "2026-11-20")).toBe(
          "Nov 18 - Nov 20, 2026",
        );
        expect(formatDateRangeWithYear("2026-12-30", "2027-01-02")).toBe(
          "Dec 30 - Jan 2, 2027",
        );
      }
    } finally {
      process.env.TZ = original;
    }
  });
});

// Runs `fn` with the process in each time zone, restoring it afterwards.
function inTimeZones(fn: () => void) {
  const original = process.env.TZ;
  try {
    for (const tz of ["America/Edmonton", "UTC", "Pacific/Auckland"]) {
      process.env.TZ = tz;
      fn();
    }
  } finally {
    process.env.TZ = original;
  }
}

describe("getAge", () => {
  test("changes on the birthday itself in any time zone", () => {
    inTimeZones(() => {
      expect(getAge("2015-06-01", "2026-05-31")).toBe(10);
      expect(getAge("2015-06-01", "2026-06-01")).toBe(11);
    });
  });

  test("is NaN for a missing date of birth", () => {
    expect(getAge("")).toBeNaN();
  });
});

describe("getDaysBetweenDates", () => {
  test("counts calendar days across a daylight saving change", () => {
    inTimeZones(() => {
      expect(getDaysBetweenDates("2026-07-05", "2026-07-10")).toBe(5);
      expect(getDaysBetweenDates("2026-07-05", "2026-07-10", true)).toBe(6);
      // Clocks go back on 1 Nov 2026 in Alberta.
      expect(getDaysBetweenDates("2026-10-30", "2026-11-03")).toBe(4);
    });
  });
});
