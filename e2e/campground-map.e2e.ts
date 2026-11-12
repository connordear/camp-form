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
  test("map markers show availability and select the site in the list", async ({
    page,
  }) => {
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

    // Before dates: neutral markers.
    await page.goto("/campground");
    await expect(
      page.getByRole("button", { name: `${SITE_NAME}, power, water`, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: new RegExp(`^${E2E_SITE_PREFIX} Map 43`) }),
    ).toHaveCount(0);

    await page.goto(`/campground?checkIn=${checkIn}&checkOut=${checkOut}`);
    const freeMarker = page.getByRole("button", {
      name: `${SITE_NAME}, power, water, available`,
    });
    await expect(freeMarker).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: `${E2E_SITE_PREFIX} Map 42, not available`,
      }),
    ).toBeVisible();

    // Choosing a marker jumps to and highlights that site's row.
    await freeMarker.click();
    await expect(page).toHaveURL(new RegExp(`#site-${free.id}$`));
    await expect(freeMarker).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(`#site-${free.id}`)).toBeInViewport();
    await expect(
      page.locator(`#site-${free.id}`).getByRole("link", {
        name: `Book ${SITE_NAME}`,
      }),
    ).toBeVisible();
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
