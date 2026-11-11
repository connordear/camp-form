import { describe, expect, test } from "bun:test";
import type { CancellationTier } from "@/lib/data/schema";
import { addDays } from "./dates";
import {
  calculateRefund,
  describeDatedWindow,
  describeRefund,
  describeWindow,
  refundSchedule,
  refundWindows,
  type StaySettings,
  validateStay,
  validateTiers,
} from "./policy";

const TIERS: CancellationTier[] = [
  { minDaysBefore: 1, refundPercent: 50 },
  { minDaysBefore: 7, refundPercent: 100 },
];

describe("calculateRefund", () => {
  const checkIn = "2027-07-10";

  test("full refund at or beyond the top tier", () => {
    expect(calculateRefund(10000, TIERS, checkIn, "2027-07-01")).toEqual({
      percent: 100,
      amount: 10000,
    });
    expect(calculateRefund(10000, TIERS, checkIn, "2027-07-03")).toEqual({
      percent: 100,
      amount: 10000,
    });
  });

  test("middle tier just under the top boundary", () => {
    expect(calculateRefund(10000, TIERS, checkIn, "2027-07-04")).toEqual({
      percent: 50,
      amount: 5000,
    });
    expect(calculateRefund(10000, TIERS, checkIn, "2027-07-09")).toEqual({
      percent: 50,
      amount: 5000,
    });
  });

  test("no refund below the lowest tier", () => {
    expect(calculateRefund(10000, TIERS, checkIn, "2027-07-10")).toEqual({
      percent: 0,
      amount: 0,
    });
    expect(calculateRefund(10000, TIERS, checkIn, "2027-07-12")).toEqual({
      percent: 0,
      amount: 0,
    });
  });

  test("rounds to the nearest cent", () => {
    expect(
      calculateRefund(
        3333,
        [{ minDaysBefore: 0, refundPercent: 50 }],
        checkIn,
        "2027-07-10",
      ),
    ).toEqual({ percent: 50, amount: 1667 });
  });

  test("empty tiers mean no refund", () => {
    expect(calculateRefund(10000, [], checkIn, "2027-01-01")).toEqual({
      percent: 0,
      amount: 0,
    });
  });

  test("does not mutate the tiers", () => {
    const tiers = [...TIERS];
    calculateRefund(10000, tiers, checkIn, "2027-07-01");
    expect(tiers).toEqual(TIERS);
  });
});

describe("validateTiers", () => {
  test("accepts the default tiers in any order", () => {
    expect(validateTiers(TIERS)).toEqual([]);
    expect(validateTiers([...TIERS].reverse())).toEqual([]);
  });

  test("accepts an empty list", () => {
    expect(validateTiers([])).toEqual([]);
  });

  test("rejects out-of-range percentages", () => {
    expect(
      validateTiers([{ minDaysBefore: 7, refundPercent: 101 }]),
    ).toHaveLength(1);
    expect(
      validateTiers([{ minDaysBefore: 7, refundPercent: -1 }]),
    ).toHaveLength(1);
    expect(
      validateTiers([{ minDaysBefore: 7, refundPercent: 12.5 }]),
    ).toHaveLength(1);
  });

  test("rejects negative or fractional days", () => {
    expect(
      validateTiers([{ minDaysBefore: -1, refundPercent: 50 }]),
    ).toHaveLength(1);
    expect(
      validateTiers([{ minDaysBefore: 1.5, refundPercent: 50 }]),
    ).toHaveLength(1);
  });

  test("rejects duplicate days", () => {
    expect(
      validateTiers([
        { minDaysBefore: 7, refundPercent: 100 },
        { minDaysBefore: 7, refundPercent: 50 },
      ]),
    ).toContain("Each tier must have a different number of days.");
  });

  test("rejects a percentage that increases closer to check-in", () => {
    expect(
      validateTiers([
        { minDaysBefore: 7, refundPercent: 50 },
        { minDaysBefore: 1, refundPercent: 100 },
      ]),
    ).toHaveLength(1);
  });

  test("allows equal percentages across tiers", () => {
    expect(
      validateTiers([
        { minDaysBefore: 7, refundPercent: 50 },
        { minDaysBefore: 1, refundPercent: 50 },
      ]),
    ).toEqual([]);
  });
});

describe("refundWindows", () => {
  test("default tiers become windows that do not overlap", () => {
    expect(refundWindows(TIERS)).toEqual([
      { fromDays: 7, toDays: null, refundPercent: 100 },
      { fromDays: 1, toDays: 6, refundPercent: 50 },
      { fromDays: null, toDays: 0, refundPercent: 0 },
    ]);
  });

  test("merges neighbouring windows with the same percentage", () => {
    expect(
      refundWindows([
        { minDaysBefore: 14, refundPercent: 100 },
        { minDaysBefore: 7, refundPercent: 100 },
        { minDaysBefore: 2, refundPercent: 0 },
      ]),
    ).toEqual([
      { fromDays: 7, toDays: null, refundPercent: 100 },
      { fromDays: null, toDays: 6, refundPercent: 0 },
    ]);
  });

  test("a zero-day tier covers check-in day", () => {
    expect(refundWindows([{ minDaysBefore: 0, refundPercent: 25 }])).toEqual([
      { fromDays: 0, toDays: null, refundPercent: 25 },
      { fromDays: null, toDays: -1, refundPercent: 0 },
    ]);
  });

  test("no tiers means no refund at any time", () => {
    expect(refundWindows([])).toEqual([
      { fromDays: null, toDays: null, refundPercent: 0 },
    ]);
  });

  test("agrees with calculateRefund on every day", () => {
    const tiers: CancellationTier[] = [
      { minDaysBefore: 30, refundPercent: 100 },
      { minDaysBefore: 14, refundPercent: 75 },
      { minDaysBefore: 3, refundPercent: 25 },
    ];
    const windows = refundWindows(tiers);
    const checkIn = "2027-08-01";
    for (let d = 40; d >= -3; d--) {
      const window = windows.find(
        (w) =>
          (w.fromDays === null || d >= w.fromDays) &&
          (w.toDays === null || d <= w.toDays),
      );
      const today = addDays(checkIn, -d);
      expect(window?.refundPercent).toBe(
        calculateRefund(100, tiers, checkIn, today).percent,
      );
    }
  });
});

describe("describeWindow", () => {
  test("describes the default tiers", () => {
    expect(
      refundWindows(TIERS).map((w) => [
        describeWindow(w),
        describeRefund(w.refundPercent),
      ]),
    ).toEqual([
      ["7 days or more before check-in", "Full refund"],
      ["1 to 6 days before check-in", "50% refund"],
      ["On or after check-in day", "No refund"],
    ]);
  });

  test("single-day and zero-day windows", () => {
    expect(describeWindow({ fromDays: 1, toDays: 1, refundPercent: 50 })).toBe(
      "1 day before check-in",
    );
    expect(describeWindow({ fromDays: 0, toDays: 0, refundPercent: 50 })).toBe(
      "On check-in day",
    );
    expect(describeWindow({ fromDays: 0, toDays: 2, refundPercent: 50 })).toBe(
      "Check-in day, or up to 2 days before",
    );
    expect(
      describeWindow({ fromDays: null, toDays: -1, refundPercent: 0 }),
    ).toBe("After check-in day");
    expect(
      describeWindow({ fromDays: null, toDays: 2, refundPercent: 0 }),
    ).toBe("Less than 3 days before check-in");
  });
});

describe("refundSchedule", () => {
  test("turns windows into cancellation dates for a stay", () => {
    const schedule = refundSchedule(TIERS, "2027-07-10");
    expect(schedule).toEqual([
      { startDate: null, endDate: "2027-07-03", refundPercent: 100 },
      { startDate: "2027-07-04", endDate: "2027-07-09", refundPercent: 50 },
      { startDate: "2027-07-10", endDate: null, refundPercent: 0 },
    ]);
    expect(schedule.map((w) => describeDatedWindow(w))).toEqual([
      "On or before Jul 3, 2027",
      "Jul 4, 2027 to Jul 9, 2027",
      "On or after Jul 10, 2027",
    ]);
  });
});

describe("validateStay", () => {
  const settings: StaySettings = {
    seasonStart: "2027-05-15",
    seasonEnd: "2027-09-30",
    minNights: 2,
    maxNights: 7,
    maxAdvanceDays: 180,
  };
  const today = "2027-05-01";

  test("accepts a stay inside every limit", () => {
    expect(validateStay("2027-07-03", "2027-07-05", settings, today)).toEqual({
      valid: true,
      nights: 2,
    });
  });

  test("rejects invalid dates", () => {
    expect(
      validateStay("2027-02-30", "2027-03-02", settings, today).valid,
    ).toBe(false);
  });

  test("rejects check-out on or before check-in", () => {
    expect(
      validateStay("2027-07-05", "2027-07-05", settings, today).valid,
    ).toBe(false);
    expect(
      validateStay("2027-07-05", "2027-07-03", settings, today).valid,
    ).toBe(false);
  });

  test("rejects check-in in the past but allows today", () => {
    const s = { ...settings, seasonStart: null };
    expect(validateStay("2027-04-30", "2027-05-02", s, today).valid).toBe(
      false,
    );
    expect(validateStay("2027-05-01", "2027-05-03", s, today).valid).toBe(true);
  });

  test("enforces max advance days", () => {
    // 2027-05-01 + 180 days = 2027-10-28
    const s = { ...settings, seasonEnd: null };
    expect(validateStay("2027-10-28", "2027-10-30", s, today).valid).toBe(true);
    expect(validateStay("2027-10-29", "2027-10-31", s, today).valid).toBe(
      false,
    );
  });

  test("enforces the season, with seasonEnd as the last check-out", () => {
    expect(
      validateStay("2027-05-14", "2027-05-16", settings, today).valid,
    ).toBe(false);
    expect(
      validateStay("2027-05-15", "2027-05-17", settings, today).valid,
    ).toBe(true);
    expect(
      validateStay("2027-09-28", "2027-09-30", settings, today).valid,
    ).toBe(true);
    expect(
      validateStay("2027-09-29", "2027-10-01", settings, today).valid,
    ).toBe(false);
  });

  test("treats a null season as unbounded", () => {
    const s = { ...settings, seasonStart: null, seasonEnd: null };
    expect(validateStay("2027-05-02", "2027-05-04", s, today).valid).toBe(true);
  });

  test("enforces min and max nights", () => {
    expect(
      validateStay("2027-07-03", "2027-07-04", settings, today).valid,
    ).toBe(false);
    expect(
      validateStay("2027-07-03", "2027-07-10", settings, today).valid,
    ).toBe(true);
    expect(
      validateStay("2027-07-03", "2027-07-11", settings, today).valid,
    ).toBe(false);
  });
});
