import { asc, count, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/data/db";
import {
  bookingNights,
  bookings,
  campgroundSettings,
  campsites,
} from "@/lib/data/schema";

export type Campsite = typeof campsites.$inferSelect;
export type CampgroundSettings = typeof campgroundSettings.$inferSelect;

export const CAMPGROUND_SETTINGS_ID = "default";

const siteOrder = [asc(campsites.sortOrder), asc(campsites.name)];

/** Every site, active or not, in display order. For admin. */
export async function getAllSites(): Promise<Campsite[]> {
  return db
    .select()
    .from(campsites)
    .orderBy(...siteOrder);
}

/** Sites open for new bookings, in display order. */
export async function getActiveSites(): Promise<Campsite[]> {
  return db
    .select()
    .from(campsites)
    .where(eq(campsites.isActive, true))
    .orderBy(...siteOrder);
}

export async function getSiteById(id: string): Promise<Campsite | undefined> {
  const [site] = await db.select().from(campsites).where(eq(campsites.id, id));
  return site;
}

/** Number of bookings (any status) per site id. Sites with none are omitted. */
export async function getBookingCountsBySite(): Promise<
  Record<string, number>
> {
  const rows = await db
    .select({ siteId: bookings.siteId, count: count() })
    .from(bookings)
    .groupBy(bookings.siteId);
  return Object.fromEntries(rows.map((r) => [r.siteId, r.count]));
}

/** Ids of sites with at least one night blocked by an admin (no booking). */
export async function getSiteIdsWithBlockedNights(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ siteId: bookingNights.siteId })
    .from(bookingNights)
    .where(isNull(bookingNights.bookingId));
  return rows.map((r) => r.siteId);
}

/**
 * The single settings row. Created with the schema defaults the first time
 * it is read, so callers never have to handle a missing row.
 */
export async function getCampgroundSettings(): Promise<CampgroundSettings> {
  const [existing] = await db
    .select()
    .from(campgroundSettings)
    .where(eq(campgroundSettings.id, CAMPGROUND_SETTINGS_ID));
  if (existing) return existing;

  await db
    .insert(campgroundSettings)
    .values({ id: CAMPGROUND_SETTINGS_ID })
    .onConflictDoNothing();

  const [created] = await db
    .select()
    .from(campgroundSettings)
    .where(eq(campgroundSettings.id, CAMPGROUND_SETTINGS_ID));
  return created;
}
