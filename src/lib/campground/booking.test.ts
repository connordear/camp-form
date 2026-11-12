import { describe, expect, test } from "bun:test";
import {
  bookingGroup,
  bookingLineItemName,
  formatClockTime,
  formatStayRange,
  holdTimes,
  nightsLabel,
  partySizeError,
  stayCost,
} from "./booking";

describe("holdTimes", () => {
  test("the session clears Stripe's 30-minute minimum and the hold outlives it", () => {
    const now = new Date("2027-07-01T12:00:00Z");
    const { sessionExpiresAt, holdExpiresAt } = holdTimes(now);
    expect(sessionExpiresAt.toISOString()).toBe("2027-07-01T12:32:00.000Z");
    expect(holdExpiresAt.toISOString()).toBe("2027-07-01T12:37:00.000Z");
  });
});

describe("formatStayRange", () => {
  test("same month", () => {
    expect(formatStayRange("2027-07-03", "2027-07-05")).toBe(
      "Jul 3 to 5, 2027",
    );
  });

  test("across months", () => {
    expect(formatStayRange("2027-07-30", "2027-08-02")).toBe(
      "Jul 30 to Aug 2, 2027",
    );
  });

  test("across years", () => {
    expect(formatStayRange("2027-12-30", "2028-01-02")).toBe(
      "Dec 30, 2027 to Jan 2, 2028",
    );
  });
});

describe("bookingLineItemName", () => {
  test("names the site, stay and nights", () => {
    expect(bookingLineItemName("Site 7", "2027-07-03", "2027-07-05")).toBe(
      "Site 7, Jul 3 to 5, 2027, 2 nights",
    );
    expect(bookingLineItemName("Site 7", "2027-07-03", "2027-07-04")).toBe(
      "Site 7, Jul 3 to 4, 2027, 1 night",
    );
  });
});

describe("stayCost and nightsLabel", () => {
  test("multiplies the nightly rate", () => {
    expect(stayCost(4500, 3)).toBe(13500);
    expect(nightsLabel(1)).toBe("1 night");
    expect(nightsLabel(3)).toBe("3 nights");
  });
});

describe("partySizeError", () => {
  test("accepts sizes up to the maximum", () => {
    expect(partySizeError(1, 6)).toBeNull();
    expect(partySizeError(6, 6)).toBeNull();
  });

  test("rejects empty, fractional and oversize parties", () => {
    expect(partySizeError(0, 6)).not.toBeNull();
    expect(partySizeError(2.5, 6)).not.toBeNull();
    expect(partySizeError(Number.NaN, 6)).not.toBeNull();
    expect(partySizeError(7, 6)).toBe("This site fits at most 6 people.");
  });
});

describe("formatClockTime", () => {
  test("converts 24-hour times", () => {
    expect(formatClockTime("14:00")).toBe("2:00 PM");
    expect(formatClockTime("11:30")).toBe("11:30 AM");
    expect(formatClockTime("00:15")).toBe("12:15 AM");
    expect(formatClockTime("12:00")).toBe("12:00 PM");
  });
});

describe("bookingGroup", () => {
  const today = "2027-07-10";
  const b = (
    status: "pending" | "confirmed" | "cancelled" | "expired",
    checkOut = "2027-07-12",
    refundAmount: number | null = null,
  ) => ({ status, checkOut, refundAmount });

  test("confirmed stays are upcoming until check-out day", () => {
    expect(bookingGroup(b("confirmed", "2027-07-11"), today)).toBe("upcoming");
    expect(bookingGroup(b("confirmed", "2027-07-10"), today)).toBe("past");
  });

  test("holds, cancellations and expiries", () => {
    expect(bookingGroup(b("pending"), today)).toBe("upcoming");
    expect(bookingGroup(b("cancelled"), today)).toBe("cancelled");
    expect(bookingGroup(b("expired"), today)).toBe("expired");
    expect(bookingGroup(b("expired", "2027-07-12", 5000), today)).toBe(
      "cancelled",
    );
  });
});
