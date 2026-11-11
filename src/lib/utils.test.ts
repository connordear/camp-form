import { describe, expect, test } from "bun:test";
import { formatDateRangeWithYear } from "./utils";

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
