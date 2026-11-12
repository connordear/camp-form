import { expect, test } from "@playwright/test";
import {
  cleanupRegistrationFixture,
  createRegistrationFixture,
  E2E_CAMP_NAME,
  getRegistrationStatus,
} from "./fixtures/registration";
import { payWithTestCard } from "./fixtures/stripe-checkout";
import { authFile, USERS } from "./users";

// Pays for a camp registration with a Stripe test card and checks the
// webhook marks it registered. Needs `bun run stripe:listen` running.
test.use({ storageState: authFile("user") });

let registrationId: string;
let campDates: { startDate: string; endDate: string };

test.beforeEach(async () => {
  const fixture = await createRegistrationFixture(USERS.user.email);
  registrationId = fixture.registrationId;
  campDates = fixture;
});
test.afterEach(async () => {
  await cleanupRegistrationFixture(USERS.user.email);
});

test("checkout lists the camp's real dates", async ({ page }) => {
  // Regression: dates were shown a day early when the server ran west of UTC.
  const label = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
    });
  await page.goto("/registration/checkout");
  await expect(
    page.getByRole("checkbox", { name: new RegExp(E2E_CAMP_NAME) }),
  ).toHaveAccessibleName(
    new RegExp(`${label(campDates.startDate)} - ${label(campDates.endDate)}`),
  );
});

test("a camp registration checkout completes and is marked registered", async ({
  page,
}) => {
  test.setTimeout(120_000);

  await page.goto("/registration/checkout");
  await expect(
    page.getByRole("checkbox", { name: new RegExp(E2E_CAMP_NAME) }),
  ).toBeChecked();
  await page.getByRole("button", { name: /Go to Checkout/ }).click();
  await page.waitForURL(/\/registration\/checkout\/payment/);

  await payWithTestCard(page, {
    email: USERS.user.email,
    returnUrl: /\/registration\/checkout\/payment\/success/,
  });

  // The webhook arrives asynchronously via `stripe listen`.
  await expect
    .poll(async () => (await getRegistrationStatus(registrationId))?.status, {
      timeout: 30_000,
    })
    .toBe("registered");
  const { pricePaid } = (await getRegistrationStatus(registrationId)) ?? {};
  // $100.00 plus tax.
  expect(pricePaid).toBeGreaterThanOrEqual(10000);
});
