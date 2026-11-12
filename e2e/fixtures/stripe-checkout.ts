import type { Page } from "@playwright/test";

type Frame = ReturnType<Page["frameLocator"]>;

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
  await fillIfVisible(
    checkout.getByPlaceholder("Address", { exact: true }),
    "1 Test Street",
  );
  // Dismiss the address autocomplete suggestions, if any.
  await checkout
    .locator("body")
    .press("Escape")
    .catch(() => {});
  await fillIfVisible(
    checkout.getByPlaceholder("City", { exact: true }),
    "Mulhurst Bay",
  );
  const province = checkout.getByLabel("Province");
  if (await province.isVisible().catch(() => false)) {
    await province.selectOption({ label: "Alberta" });
  }
  await fillIfVisible(checkout.getByPlaceholder(/postal|zip/i), "T0C 1A0");
}

/**
 * Pay in the embedded checkout with Stripe's 4242 test card, then wait for
 * the return URL.
 */
export async function payWithTestCard(
  page: Page,
  { email, returnUrl }: { email?: string; returnUrl: RegExp },
) {
  const checkout = page.frameLocator('iframe[name="embedded-checkout"]');
  // fill() waits for Stripe's form to load; the visibility checks used for
  // optional fields do not, so the card number has to come first.
  await checkout
    .getByPlaceholder("1234 1234 1234 1234")
    .fill("4242424242424242");
  const emailBox = checkout.getByRole("textbox", { name: "Email" });
  if (email && (await emailBox.isEditable().catch(() => false))) {
    await emailBox.fill(email);
  }
  await checkout.getByPlaceholder("MM / YY").fill("12 / 34");
  await checkout.getByPlaceholder("CVC").fill("123");
  await checkout.getByLabel("Cardholder name").fill("E2E Guest");
  await fillBillingAddress(checkout);
  await checkout.getByRole("button", { name: /^Pay/ }).click();

  try {
    await page.waitForURL(returnUrl, { timeout: 30_000 });
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
}
