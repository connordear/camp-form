import { expect, test } from "@playwright/test";
import {
  deleteE2ESites,
  E2E_SITE_PREFIX,
  getSettings,
  getSiteByName,
  restoreSettings,
  type SettingsRow,
} from "./fixtures/campground";
import { authFile } from "./users";

test.use({ storageState: authFile("admin") });

test.describe("campground sites", () => {
  const name = `${E2E_SITE_PREFIX} ${Date.now()}`;

  test.beforeAll(deleteE2ESites);
  test.afterAll(deleteE2ESites);

  test("create, edit, deactivate and delete a site", async ({ page }) => {
    await page.goto("/admin/campground/sites");
    const row = page.getByRole("row").filter({ hasText: name });

    // Create
    await page.getByRole("button", { name: "Add Site" }).first().click();
    const dialog = page.getByRole("dialog");
    const create = dialog.getByRole("button", { name: "Create Site" });
    await expect(create).toBeDisabled();
    await dialog.getByLabel("Site name").fill(name);
    await dialog.getByLabel("Nightly rate ($)").fill("abc");
    await create.click();
    await expect(dialog.getByText("Enter a rate in dollars")).toBeVisible();
    await dialog.getByLabel("Nightly rate ($)").fill("45.50");
    await dialog.getByLabel("Max people").fill("5");
    await dialog.getByRole("button", { name: "Power", exact: true }).click();
    await dialog.getByRole("button", { name: "Water", exact: true }).click();
    await expect(
      dialog.getByRole("button", { name: "Power", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await create.click();
    await expect(dialog).toBeHidden();
    await expect(row).toContainText("$45.50");
    await expect(row).toContainText("Power");
    await expect(row).toContainText("Water");

    let site = await getSiteByName(name);
    expect(site).toMatchObject({
      nightlyRate: 4550,
      maxOccupancy: 5,
      features: ["power", "water"],
      isActive: true,
    });

    // Edit
    await row.getByRole("button", { name: "Edit" }).click();
    await dialog.getByLabel("Nightly rate ($)").fill("50");
    await dialog.getByRole("button", { name: "Water", exact: true }).click();
    await dialog.getByRole("button", { name: "Save Changes" }).click();
    await expect(dialog).toBeHidden();
    await expect(row).toContainText("$50.00");
    await expect(row).not.toContainText("Water");
    site = await getSiteByName(name);
    expect(site).toMatchObject({ nightlyRate: 5000, features: ["power"] });

    // Deactivate
    await row.getByRole("switch").click();
    await expect(page.getByText(`${name} deactivated`)).toBeVisible();
    await page.reload();
    await expect(row.getByRole("switch")).not.toBeChecked();
    expect((await getSiteByName(name))?.isActive).toBe(false);

    // Delete (allowed because it has no bookings)
    await row.getByRole("button", { name: "Edit" }).click();
    await dialog.getByRole("button", { name: "Delete" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete" })
      .click();
    // While a dialog is open the table is aria-hidden, so wait for it to close.
    await expect(page.getByText("Site deleted")).toBeVisible();
    await expect(dialog).toBeHidden();
    await expect(row).toHaveCount(0);
    expect(await getSiteByName(name)).toBeUndefined();
  });
});

test.describe("campground settings", () => {
  let original: SettingsRow | undefined;

  test.beforeAll(async () => {
    original = await getSettings();
  });
  test.afterAll(async () => {
    await restoreSettings(original);
  });
  test.beforeEach(async () => {
    await restoreSettings(original);
  });

  test("shows the default policy as ranges that do not overlap", async ({
    page,
  }) => {
    test.skip(
      JSON.stringify(original?.cancellationTiers) !==
        JSON.stringify([
          { minDaysBefore: 7, refundPercent: 100 },
          { minDaysBefore: 1, refundPercent: 50 },
        ]),
      "Settings do not have the default tiers",
    );
    await page.goto("/admin/campground/settings");
    const preview = page.getByRole("table").first();
    await expect(preview.getByRole("row")).toHaveText([
      "When you cancelRefund",
      "7 days or more before check-inFull refund",
      "1 to 6 days before check-in50% refund",
      "On or after check-in dayNo refund",
    ]);
  });

  test("rejects tiers whose refund increases closer to check-in", async ({
    page,
  }) => {
    await page.goto("/admin/campground/settings");
    await page.getByRole("button", { name: "Add tier" }).click();
    const percents = page.getByLabel("Refund percentage");
    const days = page.getByLabel("Days before check-in");
    const last = (await percents.count()) - 1;
    await days.nth(last).fill("30");
    await percents.nth(last).fill("10");
    await expect(page.getByText(/cannot increase as check-in/)).toBeVisible();

    await page.getByRole("button", { name: "Save settings" }).click();
    await page.waitForTimeout(500);
    expect((await getSettings())?.cancellationTiers).toEqual(
      original?.cancellationTiers,
    );
  });

  test("rejects a maximum stay shorter than the minimum", async ({ page }) => {
    await page.goto("/admin/campground/settings");
    await page.getByLabel("Minimum nights").fill("5");
    await page.getByLabel("Maximum nights").fill("3");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(
      page.getByText("Maximum stay must be at least the minimum stay"),
    ).toBeVisible();
    expect((await getSettings())?.minNights).toBe(original?.minNights);
  });

  test("saves settings and sorts the tiers", async ({ page }) => {
    await page.goto("/admin/campground/settings");
    await page.getByLabel("Booking open").click();
    await page.getByLabel("Maximum nights").fill("10");
    await page.getByLabel("Check-in time").fill("15:00");

    // Add a check-in-day tier at 25%, then one far out, out of order.
    await page.getByRole("button", { name: "Add tier" }).click();
    await page.getByRole("button", { name: "Add tier" }).click();
    const days = page.getByLabel("Days before check-in");
    const percents = page.getByLabel("Refund percentage");
    const n = await days.count();
    await days.nth(n - 2).fill("0");
    await percents.nth(n - 2).fill("25");
    await days.nth(n - 1).fill("30");
    await percents.nth(n - 1).fill("100");

    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Settings saved")).toBeVisible();

    const saved = await getSettings();
    expect(saved).toMatchObject({
      isBookingOpen: !original?.isBookingOpen,
      maxNights: 10,
      checkInTime: "15:00",
    });
    const tiers = saved?.cancellationTiers ?? [];
    expect(tiers.map((t) => t.minDaysBefore)).toEqual(
      [...tiers.map((t) => t.minDaysBefore)].sort((a, b) => b - a),
    );
    expect(tiers[0]).toEqual({ minDaysBefore: 30, refundPercent: 100 });
    expect(tiers.at(-1)).toEqual({ minDaysBefore: 0, refundPercent: 25 });

    await page.reload();
    await expect(page.getByLabel("Days before check-in").first()).toHaveValue(
      "30",
    );
  });
});
