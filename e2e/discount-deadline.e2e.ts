import { expect, test } from "@playwright/test";
import { like } from "drizzle-orm";
import {
  addDays,
  campgroundToday,
  formatDisplayDate,
} from "@/lib/campground/dates";
import { db } from "@/lib/data/db";
import { discounts } from "@/lib/data/schema";
import { authFile } from "./users";

// Inactive and not auto-applied, so they never affect checkout tests.
const PREFIX = "E2E Deadline";
const today = campgroundToday();
const yesterday = addDays(today, -1);

const cleanup = () => db.delete(discounts).where(like(discounts.name, `${PREFIX}%`));

test.use({ storageState: authFile("admin") });

test.beforeAll(async () => {
  await cleanup();
  await db.insert(discounts).values(
    [
      { name: `${PREFIX} today`, deadlineDate: today },
      { name: `${PREFIX} yesterday`, deadlineDate: yesterday },
    ].map((d) => ({
      ...d,
      type: "percentage" as const,
      amount: 10,
      conditionType: "deadline" as const,
      isActive: false,
      autoApply: false,
    })),
  );
});
test.afterAll(cleanup);

test("deadline dates show as stored and expire after the day ends at camp", async ({
  page,
}) => {
  const year = Number(today.slice(0, 4));
  await page.goto(`/admin/${year}/discounts`);

  const card = (name: string) =>
    page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByText(name, { exact: true }) });

  const todayCard = card(`${PREFIX} today`);
  await expect(todayCard).toContainText(formatDisplayDate(today));
  await expect(todayCard).not.toContainText("(Expired)");

  const yesterdayCard = card(`${PREFIX} yesterday`);
  await expect(yesterdayCard).toContainText(formatDisplayDate(yesterday));
  await expect(yesterdayCard).toContainText("(Expired)");
});

