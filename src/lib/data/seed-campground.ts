import { count } from "drizzle-orm";
import { db } from "./db";
import type { CampsiteFeature } from "./schema";
import * as schema from "./schema";

// Marker positions on public/campground/map.svg (percent from left and top):
// the 13 sites along the outside of the east side of the loop, north to south.
// Admins can move them on the Sites page.
const PLACEHOLDER_MAP_POSITIONS = [
  [54.8, 10.6],
  [60.9, 13.8],
  [66.3, 18.7],
  [70.8, 25.1],
  [74.2, 32.7],
  [76.3, 41.2],
  [77.0, 50.0],
  [76.3, 58.8],
  [74.2, 67.3],
  [70.8, 74.9],
  [66.3, 81.3],
  [60.9, 86.2],
  [54.8, 89.4],
].map(([mapX, mapY]) => ({ mapX, mapY }));

// Placeholder sites. The owner will supply real names, features and rates.
// Rates are cents per night, before tax.
const PLACEHOLDER_SITES: Array<typeof schema.campsites.$inferInsert> = [
  ...[1, 2, 3, 4].map((n) => ({
    name: `Site ${n}`,
    features: ["fire_pit", "picnic_table", "shade"] satisfies CampsiteFeature[],
    nightlyRate: 3000,
    maxOccupancy: 4,
  })),
  ...[5, 6, 7, 8].map((n) => ({
    name: `Site ${n}`,
    features: ["fire_pit", "picnic_table", "water"] satisfies CampsiteFeature[],
    nightlyRate: 4000,
    maxOccupancy: 6,
  })),
  ...[9, 10, 11, 12, 13].map((n) => ({
    name: `Site ${n}`,
    features: [
      "power",
      "water",
      "fire_pit",
      "picnic_table",
    ] satisfies CampsiteFeature[],
    nightlyRate: 5500,
    maxOccupancy: 6,
  })),
].map((site, i) => ({
  ...site,
  sortOrder: i + 1,
  ...PLACEHOLDER_MAP_POSITIONS[i],
}));

/**
 * Safe to run against any database, including production: creates the
 * settings row if missing (booking stays closed) and adds the placeholder
 * sites only when there are no sites yet. Never deletes anything.
 */
export async function seedCampground() {
  console.log("⛺ Seeding campground...");

  await db
    .insert(schema.campgroundSettings)
    .values({ id: "default" })
    .onConflictDoNothing();

  const [{ value: siteCount }] = await db
    .select({ value: count() })
    .from(schema.campsites);

  if (siteCount > 0) {
    console.log(`   ⏭  ${siteCount} sites already exist, leaving them alone`);
    return;
  }

  await db.insert(schema.campsites).values(PLACEHOLDER_SITES);
  console.log(`   ✅ Created ${PLACEHOLDER_SITES.length} placeholder sites`);
}

if (import.meta.main) {
  seedCampground()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Campground seeding failed:", err);
      process.exit(1);
    });
}
