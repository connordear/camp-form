import { expect, test } from "@playwright/test";
import { authFile } from "./users";

// The exact proxy rules (C1) are unit tested in src/lib/route-access.test.ts.
// These check what each role actually experiences in the browser.

const ADMIN_ONLY_PATHS = [
  "/admin/2026/users",
  "/admin/2026/discounts",
  "/admin/2026/camps",
  "/admin/campground",
  "/admin/campground/bookings",
  "/admin/campground/sites",
  "/admin/campground/settings",
];

for (const role of ["staff", "hcp"] as const) {
  test.describe(`as ${role}`, () => {
    test.use({ storageState: authFile(role) });

    for (const path of ADMIN_ONLY_PATHS) {
      test(`is turned away from ${path}`, async ({ page }) => {
        await page.goto(path);
        await expect(page).not.toHaveURL(/\/admin/);
      });
    }

    test("can open registrations, without campground links", async ({
      page,
    }) => {
      await page.goto("/admin/2026/registrations");
      await expect(
        page.getByRole("heading", { name: "Registrations", level: 1 }),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: "Sites" })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Bookings" })).toHaveCount(
        0,
      );
      await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
    });
  });
}

test.describe("as a regular user", () => {
  test.use({ storageState: authFile("user") });

  test("is turned away from the admin panel", async ({ page }) => {
    await page.goto("/admin/2026/registrations");
    await expect(page).not.toHaveURL(/\/admin/);
    await page.goto("/admin/campground/sites");
    await expect(page).not.toHaveURL(/\/admin/);
  });
});

test.describe("signed out", () => {
  test("is sent to sign-in from campground admin", async ({ page }) => {
    await page.goto("/admin/campground/sites");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe("as admin", () => {
  test.use({ storageState: authFile("admin") });

  for (const path of ADMIN_ONLY_PATHS) {
    test(`can open ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(path));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }

  test("/admin/campground lands on Bookings", async ({ page }) => {
    await page.goto("/admin/campground");
    await expect(page).toHaveURL(/\/admin\/campground\/bookings$/);
  });

  test("camp links keep the year from a campground page", async ({ page }) => {
    await page.goto("/admin/campground/sites");
    const year = new Date().getFullYear();
    await expect(
      page.getByRole("link", { name: "Registrations" }),
    ).toHaveAttribute("href", `/admin/${year}/registrations`);
    await expect(page.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/admin/campground/settings",
    );
  });

  test("picking a year from a campground page opens that year", async ({
    page,
  }) => {
    await page.goto("/admin/campground/sites");
    const year = new Date().getFullYear();
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: String(year + 1) }).click();
    await expect(page).toHaveURL(`/admin/${year + 1}/registrations`);
  });
});
