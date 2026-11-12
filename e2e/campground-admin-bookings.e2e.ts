import { expect, type Page, test } from "@playwright/test";
import { monthOf } from "@/lib/campground/calendar";
import { addDays, campgroundToday } from "@/lib/campground/dates";
import { stripe } from "@/lib/stripe";
import {
  createE2ESite,
  createPaidBooking,
  deleteE2ESites,
  E2E_SITE_PREFIX,
  getBooking,
  getBookingsForSite,
  getNightsForSite,
  getSettings,
  openBooking,
  restoreSettings,
  type SettingsRow,
  setCancellationTiers,
} from "./fixtures/campground";
import { authFile } from "./users";

// Phase 3: what the office does with bookings. Card refunds are real Stripe
// test refunds, so these need the Stripe test keys (no webhook listener).

test.use({ storageState: authFile("admin") });

const SITE_NAME = `${E2E_SITE_PREFIX} Office`;
const today = campgroundToday();
const checkIn = addDays(today, 60);
const checkOut = addDays(checkIn, 2);

let original: SettingsRow | undefined;
let siteId: string;

test.beforeEach(async () => {
  original = await getSettings();
  await deleteE2ESites();
  await openBooking();
  const site = await createE2ESite({
    name: SITE_NAME,
    nightlyRate: 4000,
    maxOccupancy: 4,
  });
  siteId = site.id;
});

test.afterEach(async () => {
  await deleteE2ESites();
  await restoreSettings(original);
});

const gridUrl = (date: string) =>
  `/admin/campground/bookings?month=${monthOf(date)}`;

/** The site's card on the public availability page for the test stay. */
async function guestSiteStatus(page: Page) {
  await page.goto(`/campground?checkIn=${checkIn}&checkOut=${checkOut}`);
  return page
    .getByRole("listitem")
    .filter({ hasText: SITE_NAME })
    .filter({ hasText: "/ night" });
}

async function pickSite(page: Page) {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").click();
  await page
    .getByRole("option", { name: new RegExp(`^${SITE_NAME}`) })
    .click();
}

test("a phone booking is saved, shown on the grid, and cancelled", async ({
  page,
}) => {
  await page.goto(gridUrl(checkIn));
  await page.getByRole("button", { name: "New booking" }).click();
  const dialog = page.getByRole("dialog");
  await pickSite(page);
  await dialog.getByLabel("Check-in").fill(checkIn);
  await dialog.getByLabel("Check-out").fill(checkOut);
  await expect(dialog).toContainText("2 nights at $40.00 = $80.00 before tax");
  await dialog.getByLabel("Guest name").fill("Phone Guest");
  await dialog.getByLabel("Phone").fill("780-555-0142");
  await dialog.getByLabel("People").fill("3");
  await dialog.getByLabel(/Amount paid/).fill("84.00");
  await dialog.getByLabel("Office notes").fill("Paid cash at the office");
  await dialog.getByRole("button", { name: "Save booking" }).click();

  // Lands on the new booking.
  await page.waitForURL(/\/admin\/campground\/bookings\/[^/?]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    SITE_NAME,
  );
  await expect(page.getByText("Phone booking")).toBeVisible();
  await expect(page.getByText("$84.00, offline")).toBeVisible();

  const [booking] = await getBookingsForSite(siteId);
  expect(booking).toMatchObject({
    status: "confirmed",
    source: "admin",
    paidOffline: true,
    pricePaid: 8400,
    subtotal: 8000,
    partySize: 3,
    adminNotes: "Paid cash at the office",
  });
  expect(await getNightsForSite(siteId)).toHaveLength(2);

  // On the month grid, and taken for guests.
  await page.goto(gridUrl(checkIn));
  await expect(
    page.getByRole("link", { name: /Phone Guest, 3 people, confirmed/ }),
  ).toBeVisible();
  await expect((await guestSiteStatus(page)).getByText("Booked")).toBeVisible();

  // Cancel with a refund other than the policy's.
  await page.goto(`/admin/campground/bookings/${booking.id}`);
  await page.getByRole("button", { name: "Cancel booking" }).click();
  const cancel = page.getByRole("dialog");
  // 60 days out: full refund under the default tiers.
  await expect(cancel.getByText("Policy: $84.00")).toBeVisible();
  await expect(cancel).toContainText("no money moves here");
  await cancel.getByRole("button", { name: "Different amount" }).click();
  await cancel.getByLabel("Refund amount ($)").fill("100");
  await expect(cancel.getByText("Can't be more than the $84.00 paid")).toBeVisible();
  await cancel.getByLabel("Refund amount ($)").fill("50");
  await cancel.getByRole("button", { name: "Cancel and refund $50.00" }).click();
  await expect(cancel).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Cancelled",
  );
  await expect(page.getByText("$50.00 (to hand back)")).toBeVisible();

  const after = await getBooking(booking.id);
  expect(after).toMatchObject({
    status: "cancelled",
    cancelledBy: "admin",
    refundAmount: 5000,
    stripeRefundId: null,
  });
  expect(await getNightsForSite(siteId)).toHaveLength(0);

  // The nights can be booked again.
  await expect(
    (await guestSiteStatus(page)).getByText("Available"),
  ).toBeVisible();
});

test("card refunds follow the tiers the booking was made under", async ({
  page,
}) => {
  test.setTimeout(120_000);
  // Default tiers: 7+ days 100%, 1 to 6 days 50%, check-in day 0%.
  const cases = [
    { daysBefore: 7, refund: 9000 },
    { daysBefore: 6, refund: 4500 },
    { daysBefore: 1, refund: 4500 },
    { daysBefore: 0, refund: 0 },
  ];
  const bookings = [];
  for (const c of cases) {
    const start = addDays(today, c.daysBefore);
    bookings.push(
      await createPaidBooking({
        siteId,
        checkIn: start,
        checkOut: addDays(start, 1),
        pricePaid: 9000,
        guestName: `Card Guest ${c.daysBefore}`,
      }),
    );
  }

  // Changing the settings afterwards must not change what these refund.
  await setCancellationTiers([{ minDaysBefore: 30, refundPercent: 10 }]);

  for (const [i, c] of cases.entries()) {
    const booking = bookings[i];
    await page.goto(`/admin/campground/bookings/${booking.id}`);
    await page.getByRole("button", { name: "Cancel booking" }).click();
    const dialog = page.getByRole("dialog");
    const dollars = `$${(c.refund / 100).toFixed(2)}`;
    await expect(dialog.getByText(`Policy: ${dollars}`)).toBeVisible();
    await expect(dialog).toContainText("back to the guest's card");
    await dialog
      .getByRole("button", {
        name: c.refund > 0 ? `Cancel and refund ${dollars}` : "Cancel with no refund",
      })
      .click();
    await expect(dialog).toBeHidden();

    const after = await getBooking(booking.id);
    expect(after.status).toBe("cancelled");
    expect(after.refundAmount).toBe(c.refund);
    if (c.refund > 0) {
      expect(after.stripeRefundId).toBeTruthy();
      const refund = await stripe.refunds.retrieve(after.stripeRefundId as string);
      expect(refund.amount).toBe(c.refund);
      expect(refund.payment_intent).toBe(booking.stripePaymentIntentId);
    } else {
      expect(after.stripeRefundId).toBeNull();
    }
  }
  expect(await getNightsForSite(siteId)).toHaveLength(0);
});

test("blocked nights are off sale until unblocked", async ({ page }) => {
  await page.goto(gridUrl(checkIn));
  await page.getByRole("button", { name: "Block nights" }).click();
  const dialog = page.getByRole("dialog");
  await pickSite(page);
  await dialog.getByLabel("First night").fill(checkIn);
  await dialog.getByLabel("Last night").fill(addDays(checkIn, 1));
  await dialog.getByLabel("Reason").fill("Power repairs");
  await dialog.getByRole("button", { name: "Block nights" }).click();
  await expect(dialog).toBeHidden();

  const blocked = page
    .getByRole("region", { name: "Blocked nights" })
    .getByRole("listitem")
    .filter({ hasText: SITE_NAME });
  await expect(blocked).toContainText("2 nights · Power repairs");
  await expect(page.getByTitle("Blocked: Power repairs")).toBeVisible();
  const nights = await getNightsForSite(siteId);
  expect(nights).toHaveLength(2);
  expect(nights.every((n) => n.bookingId === null)).toBe(true);

  // Guests see it as taken, and the office can't book over it either.
  await expect((await guestSiteStatus(page)).getByText("Booked")).toBeVisible();
  await page.goto(gridUrl(checkIn));
  await page.getByRole("button", { name: "New booking" }).click();
  await pickSite(page);
  await dialog.getByLabel("Check-in").fill(checkIn);
  await dialog.getByLabel("Check-out").fill(checkOut);
  await dialog.getByLabel("Guest name").fill("Clash Guest");
  await dialog.getByLabel("Phone").fill("780-555-0100");
  await dialog.getByLabel(/Amount paid/).fill("80");
  await dialog.getByRole("button", { name: "Save booking" }).click();
  await expect(
    page.getByText(/already booked, held or blocked/),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  expect(await getBookingsForSite(siteId)).toHaveLength(0);

  // Unblock.
  await page
    .getByRole("button", { name: new RegExp(`^Unblock ${SITE_NAME}`) })
    .click();
  await expect(blocked).toHaveCount(0);
  expect(await getNightsForSite(siteId)).toHaveLength(0);
  await expect(
    (await guestSiteStatus(page)).getByText("Available"),
  ).toBeVisible();
});
