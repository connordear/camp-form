import { expect, test } from "@playwright/test";
import {
  cleanupRegistrationFixture,
  createRegistrationFixture,
  E2E_CAMP_NAME,
  getRegistrationStatus,
} from "./fixtures/registration";
import { authFile, USERS } from "./users";

// Pays for a camp registration with a Stripe test card and checks the
// webhook marks it registered. Needs `bun run stripe:listen` running.
test.use({ storageState: authFile("user") });

let registrationId: string;
let campDates: { startDate: string; endDate: string };

type Frame = ReturnType<import("@playwright/test").Page["frameLocator"]>;

/**
 * Stripe decides at runtime whether to ask for just a postal code or a full
 * billing address, so fill whichever fields are shown.
 */
async function fillBillingAddress(checkout: Frame) {
  const fillIfVisible = async (
    locator: ReturnType<Frame["locator"]>,
    value: string,
  ) => {
    if (await locator.isVisible().catch(() => false)) await locator.fill(value);
  };
  await fillIfVisible(checkout.getByPlaceholder("Address", { exact: true }), "1 Test Street");
  // Dismiss the address autocomplete suggestions, if any.
  await checkout.locator("body").press("Escape").catch(() => {});
  await fillIfVisible(checkout.getByPlaceholder("City", { exact: true }), "Mulhurst Bay");
  const province = checkout.getByLabel("Province");
  if (await province.isVisible().catch(() => false)) {
    await province.selectOption({ label: "Alberta" });
  }
  await fillIfVisible(checkout.getByPlaceholder(/postal|zip/i), "T0C 1A0");
}

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

  const checkout = page.frameLocator('iframe[name="embedded-checkout"]');
  // fill() waits for Stripe's form to load; the visibility checks used for
  // optional fields below do not, so the card number has to come first.
  await checkout
    .getByPlaceholder("1234 1234 1234 1234")
    .fill("4242424242424242");
  await checkout
    .getByRole("textbox", { name: "Email" })
    .fill(USERS.user.email);
  await checkout.getByPlaceholder("MM / YY").fill("12 / 34");
  await checkout.getByPlaceholder("CVC").fill("123");
  await checkout.getByLabel("Cardholder name").fill("E2E Parent");
  await fillBillingAddress(checkout);
  await checkout.getByRole("button", { name: /^Pay/ }).click();

  try {
    await page.waitForURL(/\/registration\/checkout\/payment\/success/, {
      timeout: 30_000,
    });
  } catch (err) {
    // Stripe's fraud protection sometimes answers automated payments with an
    // hCaptcha challenge, usually after several runs in a few minutes. The
    // test does not try to get past it.
    const challenged = page
      .frames()
      .some((f) => f.url().includes("hcaptcha.com/captcha"));
    throw new Error(
      challenged
        ? "Stripe showed an hCaptcha challenge after Pay. Wait a few minutes and run again."
        : "Payment did not complete; see the screenshot and trace.",
      { cause: err },
    );
  }

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
