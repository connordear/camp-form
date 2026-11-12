import { describe, expect, test } from "bun:test";
import {
  formatMonth,
  gridSpans,
  groupBlockedNights,
  isMonthString,
  monthDays,
  parseMonthParam,
  shiftMonth,
} from "./calendar";

describe("months", () => {
  test("validates month strings", () => {
    expect(isMonthString("2027-07")).toBe(true);
    expect(isMonthString("2027-13")).toBe(false);
    expect(isMonthString("2027-7")).toBe(false);
    expect(isMonthString("2027-07-01")).toBe(false);
  });

  test("shifts across years", () => {
    expect(shiftMonth("2027-12", 1)).toBe("2028-01");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
    expect(shiftMonth("2027-07", 0)).toBe("2027-07");
  });

  test("lists every day, leap years included", () => {
    expect(monthDays("2027-07")).toHaveLength(31);
    expect(monthDays("2028-02")).toHaveLength(29);
    expect(monthDays("2027-02").at(-1)).toBe("2027-02-28");
  });

  test("formats and parses", () => {
    expect(formatMonth("2027-07")).toBe("July 2027");
    expect(parseMonthParam("2027-08", "2027-07-10")).toBe("2027-08");
    expect(parseMonthParam("nonsense", "2027-07-10")).toBe("2027-07");
    expect(parseMonthParam(undefined, "2027-07-10")).toBe("2027-07");
  });
});

describe("groupBlockedNights", () => {
  test("joins back-to-back nights with the same reason", () => {
    const ranges = groupBlockedNights([
      { siteId: "a", night: "2027-07-04", reason: "Repairs" },
      { siteId: "a", night: "2027-07-03", reason: "Repairs" },
      { siteId: "a", night: "2027-07-06", reason: "Repairs" },
      { siteId: "b", night: "2027-07-03", reason: "Repairs" },
      { siteId: "a", night: "2027-07-07", reason: "Staff" },
    ]);
    expect(
      ranges.map((r) => [r.siteId, r.from, r.to, r.reason, r.nights.length]),
    ).toEqual([
      ["a", "2027-07-03", "2027-07-05", "Repairs", 2],
      ["b", "2027-07-03", "2027-07-04", "Repairs", 1],
      ["a", "2027-07-06", "2027-07-07", "Repairs", 1],
      ["a", "2027-07-07", "2027-07-08", "Staff", 1],
    ]);
  });
});

describe("gridSpans", () => {
  const days = ["2027-07-01", "2027-07-02", "2027-07-03", "2027-07-04"];
  const key = (s: string) => s;

  test("free days and merged bookings", () => {
    const nights = new Map([
      ["2027-07-02", "b1"],
      ["2027-07-03", "b1"],
      ["2027-07-04", "b2"],
    ]);
    const spans = gridSpans(days, nights, key);
    expect(
      spans.map((s) => (s.kind === "free" ? s.date : [s.item, s.days])),
    ).toEqual(["2027-07-01", ["b1", 2], ["b2", 1]]);
  });

  test("marks stays that run past the edges of the month", () => {
    const nights = new Map([
      ["2027-06-30", "b1"],
      ["2027-07-01", "b1"],
      ["2027-07-04", "b2"],
      ["2027-07-05", "b2"],
    ]);
    const spans = gridSpans(days, nights, key);
    const first = spans[0];
    const last = spans.at(-1);
    expect(first.kind === "taken" && first.continuesBefore).toBe(true);
    expect(first.kind === "taken" && first.continuesAfter).toBe(false);
    expect(last?.kind === "taken" && last.continuesAfter).toBe(true);
  });
});
