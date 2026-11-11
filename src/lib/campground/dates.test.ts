import { describe, expect, test } from "bun:test";
import {
  addDays,
  campgroundToday,
  daysUntil,
  formatDisplayDate,
  isDateString,
  nightsBetween,
} from "./dates";

describe("isDateString", () => {
  test("accepts real dates", () => {
    expect(isDateString("2027-07-03")).toBe(true);
    expect(isDateString("2028-02-29")).toBe(true);
  });

  test("rejects malformed and impossible dates", () => {
    expect(isDateString("2027-7-3")).toBe(false);
    expect(isDateString("2027-02-29")).toBe(false);
    expect(isDateString("2027-13-01")).toBe(false);
    expect(isDateString("")).toBe(false);
    expect(isDateString("2027-07-03T00:00:00Z")).toBe(false);
  });
});

describe("addDays", () => {
  test("crosses month and year boundaries", () => {
    expect(addDays("2027-01-31", 1)).toBe("2027-02-01");
    expect(addDays("2027-12-31", 1)).toBe("2028-01-01");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
  });

  test("is unaffected by daylight saving changes", () => {
    // Clocks change in Canada on 2027-03-14 and 2027-11-07.
    expect(addDays("2027-03-13", 1)).toBe("2027-03-14");
    expect(addDays("2027-03-14", 1)).toBe("2027-03-15");
    expect(addDays("2027-11-06", 2)).toBe("2027-11-08");
  });
});

describe("nightsBetween", () => {
  test("excludes the check-out date", () => {
    expect(nightsBetween("2027-07-03", "2027-07-05")).toEqual([
      "2027-07-03",
      "2027-07-04",
    ]);
  });

  test("single night", () => {
    expect(nightsBetween("2027-07-03", "2027-07-04")).toEqual(["2027-07-03"]);
  });

  test("spans a month boundary", () => {
    expect(nightsBetween("2027-07-30", "2027-08-02")).toEqual([
      "2027-07-30",
      "2027-07-31",
      "2027-08-01",
    ]);
  });

  test("returns nothing when check-out is not after check-in", () => {
    expect(nightsBetween("2027-07-03", "2027-07-03")).toEqual([]);
    expect(nightsBetween("2027-07-05", "2027-07-03")).toEqual([]);
  });
});

describe("daysUntil", () => {
  test("counts whole days", () => {
    expect(daysUntil("2027-07-10", "2027-07-03")).toBe(7);
    expect(daysUntil("2027-07-03", "2027-07-03")).toBe(0);
    expect(daysUntil("2027-07-02", "2027-07-03")).toBe(-1);
  });

  test("spans daylight saving changes", () => {
    expect(daysUntil("2027-03-20", "2027-03-10")).toBe(10);
  });

  test("throws on invalid input", () => {
    expect(() => daysUntil("nope", "2027-07-03")).toThrow();
  });
});

describe("campgroundToday", () => {
  test("uses the campground time zone, not UTC", () => {
    // 03:00 UTC on 4 July is still 3 July in Edmonton (UTC-6 in summer).
    expect(campgroundToday(new Date("2027-07-04T03:00:00Z"))).toBe(
      "2027-07-03",
    );
    expect(campgroundToday(new Date("2027-07-04T07:00:00Z"))).toBe(
      "2027-07-04",
    );
  });
});

describe("formatDisplayDate", () => {
  test("formats without shifting the day", () => {
    expect(formatDisplayDate("2027-07-03")).toBe("Jul 3, 2027");
    expect(formatDisplayDate("2027-01-01")).toBe("Jan 1, 2027");
  });
});
