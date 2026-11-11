import { eq, like } from "drizzle-orm";
import { db } from "@/lib/data/db";
import * as schema from "@/lib/data/schema";

export const E2E_SITE_PREFIX = "E2E Site";

export async function deleteE2ESites() {
  await db
    .delete(schema.campsites)
    .where(like(schema.campsites.name, `${E2E_SITE_PREFIX}%`));
}

export async function getSiteByName(name: string) {
  const [site] = await db
    .select()
    .from(schema.campsites)
    .where(eq(schema.campsites.name, name));
  return site;
}

export type SettingsRow = typeof schema.campgroundSettings.$inferSelect;

export async function getSettings(): Promise<SettingsRow | undefined> {
  const [row] = await db
    .select()
    .from(schema.campgroundSettings)
    .where(eq(schema.campgroundSettings.id, "default"));
  return row;
}

/** Put the settings row back exactly as it was (or remove it if it was missing). */
export async function restoreSettings(row: SettingsRow | undefined) {
  if (!row) {
    await db
      .delete(schema.campgroundSettings)
      .where(eq(schema.campgroundSettings.id, "default"));
    return;
  }
  const { id, createdAt, ...values } = row;
  await db
    .insert(schema.campgroundSettings)
    .values(row)
    .onConflictDoUpdate({ target: schema.campgroundSettings.id, set: values });
}
