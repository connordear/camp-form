import { describe, expect, test } from "bun:test";
import { duplicateSiteName } from "./site-names";

describe("duplicateSiteName", () => {
  test("increments a trailing number", () => {
    expect(duplicateSiteName("Site 1", ["Site 1"])).toBe("Site 2");
    expect(duplicateSiteName("Site 9", ["Site 9"])).toBe("Site 10");
    expect(duplicateSiteName("Lakeside 12", [])).toBe("Lakeside 13");
    expect(duplicateSiteName("7", ["7"])).toBe("8");
  });

  test("skips numbers already in use", () => {
    expect(duplicateSiteName("Site 1", ["Site 1", "Site 2", "site 3"])).toBe(
      "Site 4",
    );
  });

  test("keeps zero padding", () => {
    expect(duplicateSiteName("Site 01", ["Site 01"])).toBe("Site 02");
    expect(duplicateSiteName("Site 09", ["Site 09"])).toBe("Site 10");
  });

  test("adds (copy) when the name does not end in a number", () => {
    expect(duplicateSiteName("Site A", ["Site A"])).toBe("Site A (copy)");
    expect(duplicateSiteName("Site 1 East", [])).toBe("Site 1 East (copy)");
    expect(duplicateSiteName("Site A (copy)", [])).toBe("Site A (copy) (copy)");
  });

  test("treats a very long trailing number as part of the name", () => {
    expect(duplicateSiteName("Lot 10000000000000000000", [])).toBe(
      "Lot 10000000000000000000 (copy)",
    );
    expect(duplicateSiteName("Permit 9007199254740993", [])).toBe(
      "Permit 9007199254740993 (copy)",
    );
    expect(duplicateSiteName("Site 999999999999999", [])).toBe(
      "Site 1000000000000000",
    );
  });

  test("numbers further copies", () => {
    expect(
      duplicateSiteName("Site A", [
        "Site A",
        "Site A (copy)",
        "Site A (copy 2)",
      ]),
    ).toBe("Site A (copy 3)");
  });

  test("ignores surrounding spaces", () => {
    expect(duplicateSiteName("  Site 1 ", ["Site 1"])).toBe("Site 2");
  });
});
