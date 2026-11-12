import { expect, test } from "@playwright/test";
import {
  cleanupRegistrationFixture,
  createPastYearDraftFixture,
  E2E_CAMPER,
  registrationExists,
} from "./fixtures/registration";
import { authFile, USERS } from "./users";

test.use({ storageState: authFile("user") });

test.afterEach(async () => {
  await cleanupRegistrationFixture(USERS.user.email);
});

test("a draft from an earlier year neither breaks the overview nor is deleted by saving", async ({
  page,
}) => {
  const { registrationId } = await createPastYearDraftFixture(
    USERS.user.email,
  );
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto("/registration/overview");
  // The camper shows, without the old registration's camp.
  await expect(
    page.locator(`input[value="${E2E_CAMPER.firstName}"]`),
  ).toBeVisible();
  expect(pageErrors).toEqual([]);

  await page.getByRole("button", { name: /Save & Continue/ }).click();
  await expect(page).toHaveURL(/\/registration\/camper/);
  expect(await registrationExists(registrationId)).toBe(true);
});
