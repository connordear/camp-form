import { eq, inArray, like } from "drizzle-orm";
import { db } from "@/lib/data/db";
import * as schema from "@/lib/data/schema";

export const E2E_SITE_PREFIX = "E2E Site";

/** Delete the e2e sites, and any bookings and nights on them. */
export async function deleteE2ESites() {
  const sites = await db
    .select({ id: schema.campsites.id })
    .from(schema.campsites)
    .where(like(schema.campsites.name, `${E2E_SITE_PREFIX}%`));
  const ids = sites.map((s) => s.id);
  if (ids.length === 0) return;
  await db
    .delete(schema.bookingNights)
    .where(inArray(schema.bookingNights.siteId, ids));
  await db.delete(schema.bookings).where(inArray(schema.bookings.siteId, ids));
  await db.delete(schema.campsites).where(inArray(schema.campsites.id, ids));
}

export async function createE2ESite(
  values: Partial<typeof schema.campsites.$inferInsert> & { name: string },
) {
  const [site] = await db
    .insert(schema.campsites)
    .values({ nightlyRate: 4000, maxOccupancy: 4, sortOrder: -1, ...values })
    .returning();
  return site;
}

/** Open booking with no season limits, keeping the other settings. */
export async function openBooking() {
  const current = await getSettings();
  await restoreSettings({
    ...(current ?? ({ id: "default" } as SettingsRow)),
    id: "default",
    isBookingOpen: true,
    seasonStart: null,
    seasonEnd: null,
    minNights: 1,
    maxNights: 14,
    maxAdvanceDays: 365,
    checkInTime: current?.checkInTime ?? "14:00",
    checkOutTime: current?.checkOutTime ?? "11:00",
    cancellationTiers: [
      { minDaysBefore: 7, refundPercent: 100 },
      { minDaysBefore: 1, refundPercent: 50 },
    ],
    policyText: null,
    createdAt: current?.createdAt ?? new Date(),
    updatedAt: new Date(),
  });
}

export async function getBookingsForSite(siteId: string) {
  return db
    .select()
    .from(schema.bookings)
    .where(eq(schema.bookings.siteId, siteId));
}

export async function getNightsForSite(siteId: string) {
  return db
    .select()
    .from(schema.bookingNights)
    .where(eq(schema.bookingNights.siteId, siteId));
}

/** Make a hold look as if it ran out a minute ago. */
export async function expireHoldNow(bookingId: string) {
  await db
    .update(schema.bookings)
    .set({ holdExpiresAt: new Date(Date.now() - 60_000) })
    .where(eq(schema.bookings.id, bookingId));
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

type BookingRow = typeof schema.bookings.$inferSelect;

/**
 * A confirmed booking paid by card, as if a guest had gone through checkout.
 * The payment is a real Stripe test charge made server side (no checkout
 * page, so no captcha), so cancelling it makes a real Stripe refund.
 */
export async function createPaidBooking(input: {
  siteId: string;
  checkIn: string;
  checkOut: string;
  pricePaid: number;
  guestName?: string;
  userId?: string | null;
  tiers?: Array<{ minDaysBefore: number; refundPercent: number }>;
}): Promise<BookingRow> {
  const { stripe } = await import("@/lib/stripe");
  const { nightsBetween } = await import("@/lib/campground/dates");
  const intent = await stripe.paymentIntents.create({
    amount: input.pricePaid,
    currency: "cad",
    payment_method: "pm_card_visa",
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    metadata: { kind: "campsite_booking", e2e: "true" },
  });
  const nights = nightsBetween(input.checkIn, input.checkOut);
  const [booking] = await db
    .insert(schema.bookings)
    .values({
      siteId: input.siteId,
      userId: input.userId ?? null,
      guestName: input.guestName ?? "Card Guest",
      guestEmail: null,
      guestPhone: "780-555-0199",
      partySize: 2,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      status: "confirmed",
      source: "online",
      subtotal: input.pricePaid,
      pricePaid: input.pricePaid,
      stripePaymentIntentId: intent.id,
      cancellationTiers: input.tiers ?? [
        { minDaysBefore: 7, refundPercent: 100 },
        { minDaysBefore: 1, refundPercent: 50 },
      ],
    })
    .returning();
  await db.insert(schema.bookingNights).values(
    nights.map((night) => ({
      siteId: input.siteId,
      night,
      bookingId: booking.id,
      price: Math.round(input.pricePaid / nights.length),
    })),
  );
  return booking;
}

export async function getBooking(id: string) {
  const [row] = await db
    .select()
    .from(schema.bookings)
    .where(eq(schema.bookings.id, id));
  return row;
}

export async function setCancellationTiers(
  tiers: Array<{ minDaysBefore: number; refundPercent: number }>,
) {
  await db
    .update(schema.campgroundSettings)
    .set({ cancellationTiers: tiers })
    .where(eq(schema.campgroundSettings.id, "default"));
}
