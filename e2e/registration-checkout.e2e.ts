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

test.beforeAll(async () => {
  ({ registrationId } = await createRegistrationFixture(USERS.user.email));
});
test.afterAll(async () => {
  await cleanupRegistrationFixture(USERS.user.email);
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
  const email = checkout.getByLabel("Email");
  if (await email.isEditable().catch(() => false)) {
    await email.fill(USERS.user.email);
  }
  await checkout.getByPlaceholder("1234 1234 1234 1234").fill("4242424242424242");
  await checkout.getByPlaceholder("MM / YY").fill("12 / 34");
  await checkout.getByPlaceholder("CVC").fill("123");
  await checkout.getByLabel("Cardholder name").fill("E2E Parent");
  const postal = checkout.getByPlaceholder(/postal|zip/i);
  if (await postal.isVisible().catch(() => false)) {
    await postal.fill("T0C 1A0");
  }
  await checkout.getByRole("button", { name: /^Pay/ }).click();

  await page.waitForURL(/\/registration\/checkout\/payment\/success/, {
    timeout: 60_000,
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
