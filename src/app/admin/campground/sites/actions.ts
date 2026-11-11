"use server";

import { eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { adminAction } from "@/lib/auth-helpers";
import { duplicateSiteName } from "@/lib/campground/site-names";
import { db } from "@/lib/data/db";
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from "@/lib/data/pg-errors";
import { campsites } from "@/lib/data/schema";
import {
  getBookingCountsBySite,
  getSiteById,
} from "@/lib/services/campground-service";
import {
  campsiteFormSchema,
  campsiteUpdateSchema,
} from "@/lib/types/campground-schemas";

const SITES_PATH = "/admin/campground/sites";

export const createSite = adminAction(async (data: unknown) => {
  const validated = campsiteFormSchema.parse(data);
  const [site] = await db.insert(campsites).values(validated).returning();
  revalidatePath(SITES_PATH);
  return site;
});

export const updateSite = adminAction(async (data: unknown) => {
  const { id, ...values } = campsiteUpdateSchema.parse(data);
  const [site] = await db
    .update(campsites)
    .set(values)
    .where(eq(campsites.id, id))
    .returning();
  if (!site) throw new Error("Site not found");
  revalidatePath(SITES_PATH);
  return site;
});

export const setSiteActive = adminAction(
  async ({ id, isActive }: { id: string; isActive: boolean }) => {
    const [site] = await db
      .update(campsites)
      .set({ isActive: Boolean(isActive) })
      .where(eq(campsites.id, String(id)))
      .returning();
    if (!site) throw new Error("Site not found");
    revalidatePath(SITES_PATH);
    return site;
  },
);

/**
 * Copy a site with a new name (see duplicateSiteName). The copy goes to the
 * end of the list and is not placed on the map, so markers never overlap.
 */
export const duplicateSite = adminAction(async (id: string) => {
  const site = await getSiteById(String(id));
  if (!site) throw new Error("Site not found");

  const existing = await db.select({ name: campsites.name }).from(campsites);
  const [{ value: maxSortOrder }] = await db
    .select({ value: max(campsites.sortOrder) })
    .from(campsites);

  const [copy] = await db
    .insert(campsites)
    .values({
      name: duplicateSiteName(
        site.name,
        existing.map((s) => s.name),
      ),
      features: site.features,
      nightlyRate: site.nightlyRate,
      maxOccupancy: site.maxOccupancy,
      description: site.description,
      isActive: site.isActive,
      sortOrder: (maxSortOrder ?? 0) + 1,
    })
    .returning();

  revalidatePath(SITES_PATH);
  return copy;
});

/**
 * Delete a site that has never been booked. Sites with bookings must be
 * deactivated instead; the `restrict` foreign keys also enforce this.
 */
export const deleteSite = adminAction(async (id: string) => {
  const site = await getSiteById(String(id));
  if (!site) throw new Error("Site not found");

  const counts = await getBookingCountsBySite();
  if ((counts[site.id] ?? 0) > 0) {
    throw new Error(
      "This site has bookings and cannot be deleted. Deactivate it instead.",
    );
  }

  try {
    await db.delete(campsites).where(eq(campsites.id, site.id));
  } catch (err) {
    // A booking or blocked night still references the site.
    if (pgErrorCode(err) === PG_FOREIGN_KEY_VIOLATION) {
      throw new Error(
        "This site has bookings or blocked nights and cannot be deleted. Deactivate it instead.",
      );
    }
    throw err;
  }

  revalidatePath(SITES_PATH);
  return site;
});
