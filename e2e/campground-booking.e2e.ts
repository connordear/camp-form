import { expect, test } from "@playwright/test";
import { addDays, campgroundToday } from "@/lib/campground/dates";
import { stripe } from "@/lib/stripe";
import {
  createE2ESite,
  deleteE2ESites,
  E2E_SITE_PREFIX,
  expireHoldNow,
  getBookingsForSite,
  getNightsForSite,
  getSettings,
  openBooking,
  restoreSettings,
  type SettingsRow,
} from "./fixtures/campground";
import { payWithTestCard } from "./fixtures/stripe-checkout";
import { authFile, USERS } from "./users";

// Guest booking: browsing, signing in on the way, holds, and payment.
// The payment and webhook tests need `bun run stripe:listen` running.

const SITE_NAME = `${E2E_SITE_PREFIX} Booking`;
// Far enough ahead to be inside the full-refund window, clear of real data.
const checkIn = addDays(campgroundToday(), 60);
const checkOut = addDays(checkIn, 2);

let original: SettingsRow | undefined;
let siteId: string;

const searchUrl = () =>
  `/campground?checkIn=${checkIn}&checkOut=${checkOut}`;
const bookUrl = () =>
  `/campground/book?site=${siteId}&checkIn=${checkIn}&checkOut=${checkOut}`;

test.beforeEach(async () => {
  original = await getSettings();
  await deleteE2ESites();
  await openBooking();
  const site = await createE2ESite({
    name: SITE_NAME,
    features: ["power", "water"],
    nightlyRate: 4000,
    maxOccupancy: 4,
  });
  siteId = site.id;
});

test.afterEach(async () => {
  await deleteE2ESites();
  await restoreSettings(original);
});

function siteCard(page: import("@playwright/test").Page) {
  // The site's card. Feature icons are list items too, but have no price.
  return page
    .getByRole("listitem")
    .filter({ hasText: SITE_NAME })
    .filter({ hasText: "/ night" });
}

async function fillGuestDetails(page: import("@playwright/test").Page) {
  await page.getByLabel("Phone number").fill("780-555-0123");
  await page.getByLabel(/Number of people/).fill("2");
}

test.describe("signed out", () => {
  test("shows availability and filters by feature", async ({ page }) => {
    await page.goto(searchUrl());
    const card = siteCard(page);
    await expect(card.getByText("Available")).toBeVisible();
    await expect(card.getByText("Power")).toBeVisible();
    // $40 x 2 nights.
    await expect(card.getByText(/\$80\.00 for 2 nights/)).toBeVisible();

    await page.getByRole("button", { name: "Sewer", exact: true }).click();
    await expect(page).toHaveURL(/features=sewer/);
    await expect(siteCard(page)).toHaveCount(0);
  });

  test("booking sends the guest to sign in and back to the form", async ({
    page,
  }) => {
    await page.goto(searchUrl());
    await siteCard(page)
      .getByRole("link", { name: `Book ${SITE_NAME}` })
      .click();
    await expect(page).toHaveURL(/\/sign-in\?redirect=/);

    await page.getByLabel("Email").fill(USERS.user.email);
    await page.getByLabel("Password").fill(USERS.user.password);
    await page.getByRole("button", { name: "Sign In with Email" }).click();

    await page.waitForURL(/\/campground\/book\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get("site")).toBe(siteId);
    expect(url.searchParams.get("checkIn")).toBe(checkIn);
    expect(url.searchParams.get("checkOut")).toBe(checkOut);
    await expect(
      page.getByRole("heading", { name: `Book ${SITE_NAME}` }),
    ).toBeVisible();
  });

  test("an off-site redirect falls back to the default", async ({ page }) => {
    await page.goto("/sign-in?redirect=//example.com");
    await page.getByLabel("Email").fill(USERS.user.email);
    await page.getByLabel("Password").fill(USERS.user.password);
    await page.getByRole("button", { name: "Sign In with Email" }).click();
    await page.waitForURL(/\/registration\/overview/);
  });
});

test.describe("signed in", () => {
  test.use({ storageState: authFile("user") });

  test("a second guest cannot hold a site that is already held", async ({
    page,
    browser,
  }) => {
    test.setTimeout(60_000);
    const other = await browser.newContext({
      storageState: authFile("admin"),
    });
    const otherPage = await other.newPage();
    try {
      // Both open the form while the site is still free.
      await page.goto(bookUrl());
      await otherPage.goto(bookUrl());

      await fillGuestDetails(page);
      await page.getByRole("button", { name: "Continue to payment" }).click();
      await expect(page.getByText(/holding this site for you/)).toBeVisible();

      await fillGuestDetails(otherPage);
      await otherPage
        .getByRole("button", { name: "Continue to payment" })
        .click();
      await expect(
        otherPage.getByRole("alert").getByText(/someone else just booked/),
      ).toBeVisible();

      const bookings = await getBookingsForSite(siteId);
      expect(bookings.map((b) => b.status)).toEqual(["pending"]);
      expect(await getNightsForSite(siteId)).toHaveLength(2);
    } finally {
      await other.close();
    }
  });

  test("an expired hold frees the site", async ({ page }) => {
    await page.goto(bookUrl());
    await fillGuestDetails(page);
    await page.getByRole("button", { name: "Continue to payment" }).click();
    await expect(page.getByText(/holding this site for you/)).toBeVisible();

    await page.goto(searchUrl());
    await expect(siteCard(page).getByText("Booked")).toBeVisible();

    const [booking] = await getBookingsForSite(siteId);
    await expireHoldNow(booking.id);

    await page.reload();
    await expect(siteCard(page).getByText("Available")).toBeVisible();
    const [after] = await getBookingsForSite(siteId);
    expect(after.status).toBe("expired");
    expect(await getNightsForSite(siteId)).toHaveLength(0);
  });

  test("the expiry webhook releases an abandoned checkout", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(bookUrl());
    await fillGuestDetails(page);
    await page.getByRole("button", { name: "Continue to payment" }).click();
    await expect(page.getByText(/holding this site for you/)).toBeVisible();

    const [booking] = await getBookingsForSite(siteId);
    expect(booking.stripeSessionId).toBeTruthy();
    // Stripe sends checkout.session.expired, forwarded by `stripe listen`.
    await stripe.checkout.sessions.expire(booking.stripeSessionId as string);

    await expect
      .poll(async () => (await getBookingsForSite(siteId))[0]?.status, {
        timeout: 30_000,
      })
      .toBe("expired");
    expect(await getNightsForSite(siteId)).toHaveLength(0);
  });

  test("a guest books and pays for a site", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(searchUrl());
    await siteCard(page)
      .getByRole("link", { name: `Book ${SITE_NAME}` })
      .click();
    await page.waitForURL(/\/campground\/book\?/);

    // The policy is shown with real dates for this stay.
    await expect(page.getByText(/On or before/)).toBeVisible();

    await fillGuestDetails(page);
    await page.getByLabel(/Notes/).fill("Arriving late");
    await page.getByRole("button", { name: "Continue to payment" }).click();

    await payWithTestCard(page, {
      returnUrl: /\/campground\/bookings\/[^/?]+\?session_id=/,
    });
    await expect(page.getByText("You're booked!")).toBeVisible();

    const [booking] = await getBookingsForSite(siteId);
    expect(booking.status).toBe("confirmed");
    expect(booking.userId).not.toBeNull();
    expect(booking.notes).toBe("Arriving late");
    expect(booking.holdExpiresAt).toBeNull();
    // $80.00 plus tax.
    expect(booking.pricePaid).toBeGreaterThanOrEqual(8000);
    expect(booking.cancellationTiers).toEqual([
      { minDaysBefore: 7, refundPercent: 100 },
      { minDaysBefore: 1, refundPercent: 50 },
    ]);
    expect(await getNightsForSite(siteId)).toHaveLength(2);

    // Coming back to the return URL (or a webhook retry) changes nothing.
    await page.reload();
    await expect(page.getByText("You're booked!")).toBeVisible();
    const [again] = await getBookingsForSite(siteId);
    expect(again.updatedAt.getTime()).toBe(booking.updatedAt.getTime());

    // The site is now taken for those dates, and listed under My bookings.
    await page.goto(searchUrl());
    await expect(siteCard(page).getByText("Booked")).toBeVisible();
    await page.goto("/campground/bookings");
    await expect(
      page.getByRole("link").filter({ hasText: SITE_NAME }),
    ).toContainText("Confirmed");
  });

  test("another user's booking is not visible", async ({ browser, page }) => {
    await page.goto(bookUrl());
    await fillGuestDetails(page);
    await page.getByRole("button", { name: "Continue to payment" }).click();
    await expect(page.getByText(/holding this site for you/)).toBeVisible();
    const [booking] = await getBookingsForSite(siteId);

    const other = await browser.newContext({
      storageState: authFile("admin"),
    });
    try {
      const otherPage = await other.newPage();
      const response = await otherPage.goto(
        `/campground/bookings/${booking.id}`,
      );
      expect(response?.status()).toBe(404);
    } finally {
      await other.close();
    }
  });
});

test.describe("admin", () => {
  test.use({ storageState: authFile("admin") });

  test("sees a guest's booking in the bookings list", async ({
    page,
    browser,
  }) => {
    // The guest starts a booking, which holds the site.
    const guest = await browser.newContext({
      storageState: authFile("user"),
    });
    try {
      const guestPage = await guest.newPage();
      await guestPage.goto(bookUrl());
      await fillGuestDetails(guestPage);
      await guestPage.getByLabel(/Notes/).fill("Bringing a canoe");
      await guestPage
        .getByRole("button", { name: "Continue to payment" })
        .click();
      await expect(guestPage.getByText(/holding this site/)).toBeVisible();
    } finally {
      await guest.close();
    }

    await page.goto("/admin/campground/bookings");
    await expect(
      page.getByRole("heading", { name: "Campsite bookings" }),
    ).toBeVisible();
    const row = page.getByRole("row").filter({ hasText: SITE_NAME });
    await expect(row).toContainText("Awaiting payment");
    await expect(row).toContainText("780-555-0123");
    await expect(row).toContainText("Bringing a canoe");

    // Search narrows the list; other views do not show the hold.
    await page.getByLabel("Search bookings").fill("no such guest");
    await expect(row).toHaveCount(0);
    await page.getByLabel("Search bookings").fill("canoe");
    await expect(row).toHaveCount(1);
    await page.getByRole("button", { name: /^Past/ }).click();
    await expect(row).toHaveCount(0);
  });
});
