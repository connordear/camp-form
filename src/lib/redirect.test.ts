import { describe, expect, test } from "bun:test";
import {
  authPathWithRedirect,
  DEFAULT_AFTER_SIGN_IN,
  getSafeRedirect,
} from "./redirect";

describe("getSafeRedirect", () => {
  test("accepts same-site paths, with query strings", () => {
    expect(getSafeRedirect("/registration/camper")).toBe(
      "/registration/camper",
    );
    expect(
      getSafeRedirect("/campground/book?site=abc&checkIn=2027-07-03"),
    ).toBe("/campground/book?site=abc&checkIn=2027-07-03");
    expect(getSafeRedirect("/")).toBe("/");
  });

  test("falls back when missing", () => {
    expect(getSafeRedirect(null)).toBe(DEFAULT_AFTER_SIGN_IN);
    expect(getSafeRedirect(undefined)).toBe(DEFAULT_AFTER_SIGN_IN);
    expect(getSafeRedirect("")).toBe(DEFAULT_AFTER_SIGN_IN);
    expect(getSafeRedirect(null, "/campground")).toBe("/campground");
  });

  test("rejects other sites", () => {
    for (const bad of [
      "https://example.com",
      "http://example.com/path",
      "//example.com",
      "///example.com",
      "/\\example.com",
      "\\\\example.com",
      "javascript:alert(1)",
      "example.com",
      "/\t/example.com",
      "/\n/example.com",
    ]) {
      expect(getSafeRedirect(bad)).toBe(DEFAULT_AFTER_SIGN_IN);
    }
  });
});

describe("authPathWithRedirect", () => {
  test("encodes the destination", () => {
    expect(
      authPathWithRedirect("/sign-in", "/campground/book?site=a&checkIn=b"),
    ).toBe("/sign-in?redirect=%2Fcampground%2Fbook%3Fsite%3Da%26checkIn%3Db");
  });

  test("drops unsafe or missing destinations", () => {
    expect(authPathWithRedirect("/sign-up", "//example.com")).toBe("/sign-up");
    expect(authPathWithRedirect("/sign-up", null)).toBe("/sign-up");
  });
});
