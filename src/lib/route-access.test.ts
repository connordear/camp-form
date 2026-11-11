import { describe, expect, test } from "bun:test";
import { getAllowedRolesForPath, isPublicRoute } from "./route-access";

const ADMIN_ONLY = ["admin"];
const PANEL = ["admin", "hcp", "staff"];

describe("getAllowedRolesForPath", () => {
  test.each([
    "/admin/2026/users",
    "/admin/2026/users/abc",
    "/admin/2026/discounts",
    "/admin/2026/camps",
    "/admin/2027/camps/xyz",
    "/admin/campground",
    "/admin/campground/sites",
    "/admin/campground/settings",
  ])("%s is admin only", (path) => {
    expect(getAllowedRolesForPath(path)).toEqual(ADMIN_ONLY);
  });

  test.each([
    "/admin",
    "/admin/2026/registrations",
    "/admin/2026/registrations/abc",
    "/admin/campgroundx",
  ])("%s is open to the admin panel roles", (path) => {
    expect(getAllowedRolesForPath(path)).toEqual(PANEL);
  });

  test("non-admin paths have no role rule", () => {
    expect(getAllowedRolesForPath("/registration/overview")).toBeNull();
    expect(getAllowedRolesForPath("/campground/book")).toBeNull();
  });
});

describe("isPublicRoute", () => {
  test("public pages", () => {
    expect(isPublicRoute("/")).toBe(true);
    expect(isPublicRoute("/campground")).toBe(true);
    expect(isPublicRoute("/api/webhooks/stripe")).toBe(true);
  });

  test("campground pages beyond browsing need sign-in", () => {
    expect(isPublicRoute("/campground/book")).toBe(false);
    expect(isPublicRoute("/campground/bookings")).toBe(false);
  });
});
