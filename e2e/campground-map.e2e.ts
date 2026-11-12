import { expect, test } from "@playwright/test";
import { addDays, campgroundToday } from "@/lib/campground/dates";
import {
  createE2ESite,
  createPaidBooking,
  deleteE2ESites,
  E2E_SITE_PREFIX,
  getSettings,
  getSiteByName,
  openBooking,
  restoreSettings,
  type SettingsRow,
} from "./fixtures/campground";
import { authFile } from "./users";

const SITE_NAME = `${E2E_SITE_PREFIX} Map 41`;
const checkIn = addDays(campgroundToday(), 60);
const checkOut = addDays(checkIn, 2);

let original: SettingsRow | undefined;

test.beforeEach(async () => {
  original = await getSettings();
  await deleteE2ESites();
  await openBooking();
});

test.afterEach(async () => {
  await deleteE2ESites();
  await restoreSettings(original);
});

test.describe("admin", () => {
  test.use({ storageState: authFile("admin") });

  test("places a site on the map, nudges it and takes it off", async ({
    page,
  }) => {
    await createE2ESite({ name: SITE_NAME, features: ["power"] });
    await page.goto("/admin/campground/sites");

    await page
      .getByRole("button", { name: `${SITE_NAME} (not placed)` })
      .click();
    const map = page.getByRole("img", { name: /Click to place/ });
    const box = await map.boundingBox();
    if (!box) throw new Error("map not visible");
    // Click a quarter of the way across and halfway down.
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.5);

    const marker = page.getByRole("button", {
      name: `${SITE_NAME}, power`,
      exact: true,
    });
    await expect(marker).toBeVisible();
    await expect
      .poll(async () => (await getSiteByName(SITE_NAME))?.mapX ?? null)
      .not.toBeNull();
    const placed = await getSiteByName(SITE_NAME);
    expect(placed.mapX).toBeCloseTo(25, 0);
    expect(placed.mapY).toBeCloseTo(50, 0);

    // Arrow keys fine-tune it.
    await marker.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Shift+ArrowUp");
    await expect
      .poll(async () => (await getSiteByName(SITE_NAME))?.mapY)
      .toBeCloseTo((placed.mapY as number) - 5, 1);
    expect((await getSiteByName(SITE_NAME)).mapX).toBeCloseTo(
      (placed.mapX as number) + 1,
      1,
    );

    await page
      .getByRole("button", { name: `Take ${SITE_NAME} off the map` })
      .click();
    await expect(marker).toHaveCount(0);
    await expect
      .poll(async () => (await getSiteByName(SITE_NAME))?.mapX ?? null)
      .toBeNull();
  });
});

test.describe("guest", () => {
  test("markers show availability and select rows, and rows select markers", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const free = await createE2ESite({
      name: SITE_NAME,
      features: ["power", "water"],
      mapX: 30,
      mapY: 40,
    });
    const taken = await createE2ESite({
      name: `${E2E_SITE_PREFIX} Map 42`,
      mapX: 40,
      mapY: 40,
    });
    await createPaidBooking({
      siteId: taken.id,
      checkIn,
      checkOut,
      pricePaid: 8000,
    });
    // Not placed: in the list, not on the map.
    await createE2ESite({ name: `${E2E_SITE_PREFIX} Map 43` });

    // Before dates: neutral markers, with the price, and a hint.
    await page.goto("/campground");
    await expect(
      page.getByRole("button", {
        name: `${SITE_NAME}, $40.00 a night, power, water`,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: new RegExp(`^${E2E_SITE_PREFIX} Map 43`),
      }),
    ).toHaveCount(0);
    await expect(page.getByText("Pick dates to see availability")).toBeVisible();

    await page.goto(`/campground?checkIn=${checkIn}&checkOut=${checkOut}`);
    const freeMarker = page.getByRole("button", {
      name: `${SITE_NAME}, $40.00 a night, power, water, available`,
    });
    await expect(freeMarker).toBeVisible();
    // Booked: drawn, but not something to click.
    await expect(
      page.getByRole("img", {
        name: `${E2E_SITE_PREFIX} Map 42, $40.00 a night, not available`,
      }),
    ).toBeVisible();

    // Hovering a row highlights its marker, and the other way round.
    const row = page.locator(`#site-${free.id}`);
    await row.hover();
    await expect(freeMarker).toHaveClass(/ring-amber-300/);
    await freeMarker.hover();
    await expect(row).toHaveAttribute("data-highlighted", "true");

    // Choosing a marker highlights its row; the page doesn't move.
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await freeMarker.click();
    await expect(freeMarker).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
    await expect(row).toBeInViewport();
    await expect(row).toHaveAttribute("data-highlighted", "true");
    await expect(
      row.getByRole("link", { name: `Book ${SITE_NAME}` }),
    ).toBeVisible();
    expect(page.url()).not.toContain("#");

    // Escape clears it.
    await page.keyboard.press("Escape");
    await expect(freeMarker).toHaveAttribute("aria-pressed", "false");

    // Clicking anywhere on a row selects its marker.
    await row.click({ position: { x: 40, y: 60 } });
    await expect(freeMarker).toHaveAttribute("aria-pressed", "true");

    // Filtering dims the markers that don't match instead of removing them.
    await page.goto(
      `/campground?checkIn=${checkIn}&checkOut=${checkOut}&features=power`,
    );
    await expect(
      page.getByRole("img", {
        name: /^E2E.* Map 42, .*doesn't match your filters$/,
      }),
    ).toBeVisible();
  });

  test("phones switch between list and map, with a sheet for the site", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await createE2ESite({
      name: SITE_NAME,
      features: ["power"],
      mapX: 30,
      mapY: 40,
    });
    await page.goto(`/campground?checkIn=${checkIn}&checkOut=${checkOut}`);

    await page.getByRole("button", { name: `Show ${SITE_NAME} on the map` }).click();
    const sheet = page.getByRole("region", { name: `${SITE_NAME} details` });
    await expect(sheet).toBeVisible();
    await expect(
      sheet.getByRole("link", { name: `Book ${SITE_NAME}` }),
    ).toBeVisible();
    await sheet.getByRole("button", { name: "Close" }).click();
    await expect(sheet).toHaveCount(0);

    await page.getByRole("button", { name: "List" }).click();
    await expect(page.locator("[data-site-id]").first()).toBeVisible();
  });
});

test.describe("signed in", () => {
  test.use({ storageState: authFile("user") });

  test("the booking page shows where the site is", async ({ page }) => {
    const site = await createE2ESite({
      name: SITE_NAME,
      mapX: 50,
      mapY: 50,
    });
    const users = await import("./users");
    const { db } = await import("@/lib/data/db");
    const owner = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.email, users.USERS.user.email),
    });
    const booking = await createPaidBooking({
      siteId: site.id,
      checkIn,
      checkOut,
      pricePaid: 8000,
      userId: owner?.id,
    });
    await page.goto(`/campground/bookings/${booking.id}`);
    await expect(page.getByText("Where it is")).toBeVisible();
    await expect(
      page.getByRole("img", { name: `${SITE_NAME} (this booking)` }),
    ).toBeVisible();
  });
});
