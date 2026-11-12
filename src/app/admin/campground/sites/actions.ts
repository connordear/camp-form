"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { UserError, withUserErrors } from "@/lib/action-result";
import { adminAction } from "@/lib/auth-helpers";
import { duplicateSiteName } from "@/lib/campground/site-names";
import { db } from "@/lib/data/db";
import {
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
  pgErrorCode,
} from "@/lib/data/pg-errors";
import { campsites } from "@/lib/data/schema";
import { getAllSites } from "@/lib/services/campground-service";
import {
  campsiteFormSchema,
  campsiteUpdateSchema,
} from "@/lib/types/campground-schemas";

const SITES_PATH = "/admin/campground/sites";

// Site names are unique ignoring case and surrounding spaces (see the
// campsites_name_unique index).
function isNameTaken(err: unknown): boolean {
  return pgErrorCode(err) === PG_UNIQUE_VIOLATION;
}

function nameTakenError(name: string): UserError {
  return new UserError(
    `A site named "${name}" already exists. Choose a different name.`,
  );
}

export const createSite = adminAction(
  withUserErrors(async (data: unknown) => {
    const validated = campsiteFormSchema.parse(data);
    try {
      const [site] = await db.insert(campsites).values(validated).returning();
      revalidatePath(SITES_PATH);
      return site;
    } catch (err) {
      if (isNameTaken(err)) throw nameTakenError(validated.name);
      throw err;
    }
  }),
);

export const updateSite = adminAction(
  withUserErrors(async (data: unknown) => {
    const { id, ...values } = campsiteUpdateSchema.parse(data);
    try {
      const [site] = await db
        .update(campsites)
        .set(values)
        .where(eq(campsites.id, id))
        .returning();
      if (!site) throw new UserError("Site not found");
      revalidatePath(SITES_PATH);
      return site;
    } catch (err) {
      if (isNameTaken(err)) throw nameTakenError(values.name);
      throw err;
    }
  }),
);

export const setSiteActive = adminAction(
  withUserErrors(
    async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const [site] = await db
        .update(campsites)
        .set({ isActive: Boolean(isActive) })
        .where(eq(campsites.id, String(id)))
        .returning();
      if (!site) throw new UserError("Site not found");
      revalidatePath(SITES_PATH);
      return site;
    },
  ),
);

const DUPLICATE_ATTEMPTS = 3;

/**
 * Copy a site with a new name (see duplicateSiteName). The copy goes to the
 * end of the list and is not placed on the map, so markers never overlap.
 */
export const duplicateSite = adminAction(
  withUserErrors(async (id: string) => {
    // Two duplicates at once can pick the same name; the unique index refuses
    // the second, which then picks again from the fresh list.
    for (let attempt = 1; ; attempt++) {
      const sites = await getAllSites();
      const site = sites.find((s) => s.id === String(id));
      if (!site) throw new UserError("Site not found");

      try {
        const [copy] = await db
          .insert(campsites)
          .values({
            name: duplicateSiteName(
              site.name,
              sites.map((s) => s.name),
            ),
            features: site.features,
            nightlyRate: site.nightlyRate,
            maxOccupancy: site.maxOccupancy,
            description: site.description,
            isActive: site.isActive,
            sortOrder: Math.max(...sites.map((s) => s.sortOrder)) + 1,
          })
          .returning();
        revalidatePath(SITES_PATH);
        return copy;
      } catch (err) {
        if (!isNameTaken(err)) throw err;
        if (attempt >= DUPLICATE_ATTEMPTS) {
          throw new UserError("Could not duplicate the site. Try again.");
        }
      }
    }
  }),
);

/**
 * Delete a site that has never been used. The `restrict` foreign keys refuse
 * the delete while a booking or a blocked night references the site; such
 * sites must be deactivated instead.
 */
export const deleteSite = adminAction(
  withUserErrors(async (id: string) => {
    try {
      const [site] = await db
        .delete(campsites)
        .where(eq(campsites.id, String(id)))
        .returning();
      if (!site) throw new UserError("Site not found");
      revalidatePath(SITES_PATH);
      return site;
    } catch (err) {
      if (pgErrorCode(err) === PG_FOREIGN_KEY_VIOLATION) {
        throw new UserError(
          "This site has bookings or blocked nights and cannot be deleted. Deactivate it instead.",
        );
      }
      throw err;
    }
  }),
);
