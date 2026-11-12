import { and, asc, desc, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import type Stripe from "stripe";
import { siteConfig } from "@/config/site";
import { UserError } from "@/lib/action-result";
import {
  bookingLineItemName,
  holdTimes,
  partySizeError,
  stayCost,
} from "@/lib/campground/booking";
import { campgroundToday, nightsBetween } from "@/lib/campground/dates";
import { formatCents } from "@/lib/campground/money";
import {
  calculateRefund,
  sortTiers,
  validateStay,
} from "@/lib/campground/policy";
import { db } from "@/lib/data/db";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "@/lib/data/pg-errors";
import { bookingNights, bookings, campsites } from "@/lib/data/schema";
import {
  type Campsite,
  getActiveSites,
  getCampgroundSettings,
} from "@/lib/services/campground-service";
import { stripe } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/utils";

export type Booking = typeof bookings.$inferSelect;
export type BookingWithSite = Booking & { site: Campsite };

/** Checkout sessions created for campsite bookings carry this metadata kind. */
export const CAMPSITE_BOOKING_KIND = "campsite_booking";

/** Shown to guests when the nights were taken between browsing and booking. */
export const SITE_UNAVAILABLE_MESSAGE =
  "Sorry, someone else just booked this site for some of those nights. Please pick another site or different dates.";

/** A problem the guest can fix. The message is safe to show them. */
export class BookingError extends UserError {
  constructor(message: string) {
    super(message);
    this.name = "BookingError";
  }
}

// ---------------------------------------------------------------------------
// Holds
// ---------------------------------------------------------------------------

/**
 * Free the nights of every pending booking whose hold has run out. This is the
 * fallback for a missed `checkout.session.expired` webhook, so it runs before
 * anything that reads or claims availability.
 */
export async function releaseExpiredHolds(now: Date = new Date()) {
  await db.transaction(async (tx) => {
    const expired = await tx
      .update(bookings)
      .set({ status: "expired", updatedAt: now })
      .where(
        and(eq(bookings.status, "pending"), lt(bookings.holdExpiresAt, now)),
      )
      .returning({ id: bookings.id });
    if (expired.length === 0) return;
    await tx.delete(bookingNights).where(
      inArray(
        bookingNights.bookingId,
        expired.map((b) => b.id),
      ),
    );
  });
}

/**
 * Release one pending booking: delete its nights and mark it expired. Does
 * nothing if it is no longer pending (for example, it was just confirmed).
 */
async function expirePendingBooking(bookingId: string) {
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(bookings)
      .set({ status: "expired", updatedAt: new Date() })
      .where(and(eq(bookings.id, bookingId), eq(bookings.status, "pending")))
      .returning({ id: bookings.id });
    if (updated.length === 0) return;
    await tx
      .delete(bookingNights)
      .where(eq(bookingNights.bookingId, bookingId));
  });
}

/**
 * Cancel a user's unpaid holds before they start a new one, so one person
 * cannot hold several sites while browsing. A hold whose checkout has already
 * been paid is left for the webhook to confirm.
 */
async function releaseUserPendingBookings(userId: string) {
  const pending = await db
    .select({ id: bookings.id, stripeSessionId: bookings.stripeSessionId })
    .from(bookings)
    .where(and(eq(bookings.userId, userId), eq(bookings.status, "pending")));

  for (const booking of pending) {
    // No session yet means another createHold for this user (a second tab or
    // a double submit) is still opening its checkout. Releasing it now would
    // leave that checkout paying for a released hold. If it never gets a
    // session, its hold lapses on its own.
    if (!booking.stripeSessionId) continue;
    const session = await stripe.checkout.sessions.retrieve(
      booking.stripeSessionId,
    );
    if (session.status === "complete") continue;
    if (session.status === "open") {
      try {
        await stripe.checkout.sessions.expire(booking.stripeSessionId);
      } catch (err) {
        // It may have been paid a moment ago; then the webhook confirms it.
        const latest = await stripe.checkout.sessions.retrieve(
          booking.stripeSessionId,
        );
        if (latest.status === "complete") continue;
        throw err;
      }
    }
    await expirePendingBooking(booking.id);
  }
}

export type HoldInput = {
  siteId: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestPhone: string;
  partySize: number;
  notes: string | null;
};

export type HoldResult = { bookingId: string; clientSecret: string };

/**
 * Hold a site for a guest and open a Stripe checkout for it.
 * Throws BookingError for anything the guest can fix.
 */
export async function createHold(
  user: { id: string; email: string },
  input: HoldInput,
): Promise<HoldResult> {
  await releaseExpiredHolds();

  const settings = await getCampgroundSettings();
  if (!settings.isBookingOpen) {
    throw new BookingError("Online booking is not open right now.");
  }

  const stay = validateStay(
    input.checkIn,
    input.checkOut,
    settings,
    campgroundToday(),
  );
  if (!stay.valid) throw new BookingError(stay.error);

  const [site] = await db
    .select()
    .from(campsites)
    .where(eq(campsites.id, input.siteId));
  if (!site || !site.isActive) {
    throw new BookingError("That site is not available for booking.");
  }

  const partyError = partySizeError(input.partySize, site.maxOccupancy);
  if (partyError) throw new BookingError(partyError);

  await releaseUserPendingBookings(user.id);

  const nights = nightsBetween(input.checkIn, input.checkOut);
  const subtotal = stayCost(site.nightlyRate, nights.length);
  const { sessionExpiresAt, holdExpiresAt } = holdTimes();

  // Claim the nights. The (site_id, night) primary key rejects any night that
  // is already held, booked or blocked, so never check first and insert later.
  let bookingId: string;
  try {
    bookingId = await db.transaction(async (tx) => {
      const [booking] = await tx
        .insert(bookings)
        .values({
          siteId: site.id,
          userId: user.id,
          guestName: input.guestName,
          guestEmail: user.email,
          guestPhone: input.guestPhone,
          partySize: input.partySize,
          notes: input.notes,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          status: "pending",
          source: "online",
          holdExpiresAt,
          subtotal,
          cancellationTiers: sortTiers(settings.cancellationTiers),
        })
        .returning({ id: bookings.id });
      await tx.insert(bookingNights).values(
        nights.map((night) => ({
          siteId: site.id,
          night,
          bookingId: booking.id,
          price: site.nightlyRate,
        })),
      );
      return booking.id;
    });
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) {
      throw new BookingError(SITE_UNAVAILABLE_MESSAGE);
    }
    throw err;
  }

  try {
    const metadata = { kind: CAMPSITE_BOOKING_KIND, bookingId };
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "cad",
            unit_amount: subtotal,
            product_data: {
              name: bookingLineItemName(
                site.name,
                input.checkIn,
                input.checkOut,
              ),
              metadata,
            },
          },
          quantity: 1,
          tax_rates: [process.env.TAX_RATE!],
        },
      ],
      metadata,
      payment_intent_data: { metadata },
      allow_promotion_codes: false,
      expires_at: Math.floor(sessionExpiresAt.getTime() / 1000),
      billing_address_collection: "required",
      return_url: `${getBaseUrl()}/campground/bookings/${bookingId}?session_id={CHECKOUT_SESSION_ID}`,
      branding_settings: {
        display_name: siteConfig.name,
        font_family: "roboto",
        border_style: "rounded",
      },
    });

    await db
      .update(bookings)
      .set({ stripeSessionId: session.id, updatedAt: new Date() })
      .where(eq(bookings.id, bookingId));

    return { bookingId, clientSecret: session.client_secret ?? "" };
  } catch (err) {
    // No checkout means no way to pay: give the nights back straight away.
    await expirePendingBooking(bookingId);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

export type SiteAvailability = {
  site: Campsite;
  /** Nights in the requested range that are already taken. */
  takenNights: string[];
};

/**
 * Every active site, with the nights from `from` up to (not including) `to`
 * that are held, booked or blocked.
 *
 * `ignorePendingOf`: leave out this user's own unpaid holds, which they
 * release by starting a new booking anyway.
 */
export async function getAvailability(
  from: string,
  to: string,
  { ignorePendingOf }: { ignorePendingOf?: string } = {},
): Promise<SiteAvailability[]> {
  await releaseExpiredHolds();

  const [sites, rows] = await Promise.all([
    getActiveSites(),
    db
      .select({
        siteId: bookingNights.siteId,
        night: bookingNights.night,
        userId: bookings.userId,
        status: bookings.status,
      })
      .from(bookingNights)
      .leftJoin(bookings, eq(bookingNights.bookingId, bookings.id))
      .where(and(gte(bookingNights.night, from), lt(bookingNights.night, to)))
      .orderBy(asc(bookingNights.night)),
  ]);
  const taken = rows.filter(
    (r) =>
      !(
        ignorePendingOf &&
        r.status === "pending" &&
        r.userId === ignorePendingOf
      ),
  );

  const bySite = new Map<string, string[]>();
  for (const row of taken) {
    const list = bySite.get(row.siteId) ?? [];
    list.push(row.night);
    bySite.set(row.siteId, list);
  }
  return sites.map((site) => ({
    site,
    takenNights: bySite.get(site.id) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Reading bookings
// ---------------------------------------------------------------------------

/** One booking, only if it belongs to `userId`. */
export async function getUserBooking(
  userId: string,
  bookingId: string,
): Promise<BookingWithSite | undefined> {
  // So a lapsed hold never reads as still held.
  await releaseExpiredHolds();
  return db.query.bookings.findFirst({
    where: and(eq(bookings.id, bookingId), eq(bookings.userId, userId)),
    with: { site: true },
  });
}

export async function getUserBookings(
  userId: string,
): Promise<BookingWithSite[]> {
  await releaseExpiredHolds();
  return db.query.bookings.findMany({
    where: eq(bookings.userId, userId),
    with: { site: true },
    orderBy: [desc(bookings.checkIn)],
  });
}

export type AdminBooking = BookingWithSite & {
  user: { name: string; email: string } | null;
};

/** Every booking, newest stay first. For the admin bookings page. */
export async function getAllBookings(): Promise<AdminBooking[]> {
  return db.query.bookings.findMany({
    with: {
      site: true,
      user: { columns: { name: true, email: true } },
    },
    orderBy: [desc(bookings.checkIn), desc(bookings.createdAt)],
  });
}

// ---------------------------------------------------------------------------
// Payment outcomes (webhook, and the return page as a shortcut)
// ---------------------------------------------------------------------------

export type ConfirmOutcome =
  /** This call confirmed the booking. Send the confirmation email. */
  | { kind: "confirmed"; booking: BookingWithSite }
  /** Paid after the hold lapsed and the site was taken. Refunded in full. */
  | { kind: "refunded"; booking: BookingWithSite }
  /** Already handled, or nothing to do. */
  | { kind: "noop" };

async function loadBookingWithSite(id: string) {
  return db.query.bookings.findFirst({
    where: eq(bookings.id, id),
    with: { site: true },
  });
}

/**
 * Confirm the booking a completed checkout session paid for. Safe to call any
 * number of times for the same session: only the first call that changes the
 * booking returns "confirmed" or "refunded".
 */
export async function confirmBookingFromSession(
  session: Stripe.Checkout.Session,
): Promise<ConfirmOutcome> {
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) {
    console.error(`Campsite checkout ${session.id} has no bookingId`);
    return { kind: "noop" };
  }
  // A $0 stay completes with "no_payment_required" and no payment intent.
  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    return { kind: "noop" };
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);
  const amountPaid = session.amount_total ?? 0;

  const result = await db.transaction(async (tx) => {
    // Lock the row so a concurrent releaseExpiredHolds or webhook retry waits.
    const [booking] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .for("update");
    if (!booking) {
      console.error(
        `Campsite checkout ${session.id}: booking ${bookingId} not found`,
      );
      return "noop" as const;
    }

    const confirm = () =>
      tx
        .update(bookings)
        .set({
          status: "confirmed",
          pricePaid: amountPaid,
          stripePaymentIntentId: paymentIntentId,
          stripeSessionId: session.id,
          holdExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, bookingId));

    if (booking.status === "pending") {
      await confirm();
      return "confirmed" as const;
    }

    if (booking.status === "expired" && booking.refundAmount === null) {
      // Paid after the hold was released. Take the nights back if they are
      // still free (savepoint, so a conflict does not abort the transaction).
      const nights = nightsBetween(booking.checkIn, booking.checkOut);
      // Rates are flat per stay, so every night cost the same.
      const nightlyPrice = Math.round(booking.subtotal / nights.length);
      try {
        await tx.transaction(async (sp) => {
          await sp.insert(bookingNights).values(
            nights.map((night) => ({
              siteId: booking.siteId,
              night,
              bookingId: booking.id,
              price: nightlyPrice,
            })),
          );
        });
        await confirm();
        return "confirmed" as const;
      } catch (err) {
        if (pgErrorCode(err) !== PG_UNIQUE_VIOLATION) throw err;
        return "refund" as const;
      }
    }

    // Confirmed already (a retry), cancelled, or expired and refunded.
    return "noop" as const;
  });

  if (result === "noop") return { kind: "noop" };

  if (result === "refund") {
    console.error(
      `CAMPSITE BOOKING RACE: booking ${bookingId} was paid after its hold expired and the site was taken. Refunding in full.`,
    );
    let refund: { id: string | null; amount: number } = { id: null, amount: 0 };
    if (amountPaid > 0) {
      if (!paymentIntentId) {
        throw new Error(`Booking ${bookingId}: no payment intent to refund`);
      }
      // Concurrent callers get the same refund back from the idempotency key.
      const created = await stripe.refunds.create(
        {
          payment_intent: paymentIntentId,
          metadata: { kind: CAMPSITE_BOOKING_KIND, bookingId },
        },
        { idempotencyKey: `booking-unavailable-refund-${bookingId}` },
      );
      refund = { id: created.id, amount: created.amount };
    }
    // Only one caller records the refund, and only that one reports it.
    const updated = await db
      .update(bookings)
      .set({
        pricePaid: amountPaid,
        stripePaymentIntentId: paymentIntentId,
        stripeSessionId: session.id,
        refundAmount: refund.amount,
        stripeRefundId: refund.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.status, "expired"),
          isNull(bookings.refundAmount),
        ),
      )
      .returning({ id: bookings.id });
    if (updated.length === 0) return { kind: "noop" };
  }

  const booking = await loadBookingWithSite(bookingId);
  if (!booking) return { kind: "noop" };
  return result === "confirmed"
    ? { kind: "confirmed", booking }
    : { kind: "refunded", booking };
}

/** Release the hold of an abandoned checkout. Safe to call more than once. */
export async function expireBookingFromSession(
  session: Stripe.Checkout.Session,
) {
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) return;
  // Only the session this booking is waiting on may release it.
  const [booking] = await db
    .select({ stripeSessionId: bookings.stripeSessionId })
    .from(bookings)
    .where(eq(bookings.id, bookingId));
  if (!booking || booking.stripeSessionId !== session.id) return;
  await expirePendingBooking(bookingId);
}

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

/**
 * What the policy refunds if this booking is cancelled on `today`, from the
 * booking's own tier snapshot (never today's settings).
 */
export function policyRefund(
  booking: Pick<Booking, "pricePaid" | "cancellationTiers" | "checkIn">,
  today: string = campgroundToday(),
): { percent: number; amount: number } {
  return calculateRefund(
    booking.pricePaid ?? 0,
    booking.cancellationTiers,
    booking.checkIn,
    today,
  );
}

/**
 * Refund a cancelled booking through Stripe, once. If an earlier attempt
 * already refunded it (and then failed to save), that refund is reused, so a
 * retry on a later day, with a different policy amount, never refunds twice.
 * The idempotency key covers a double submit; it includes the amount so a
 * retry with a corrected amount is not refused by Stripe.
 */
async function cancellationRefund(
  bookingId: string,
  paymentIntentId: string,
  amount: number,
  by: CancelOptions["by"],
): Promise<Stripe.Refund> {
  const earlier = await stripe.refunds.list({
    payment_intent: paymentIntentId,
    limit: 100,
  });
  const existing = earlier.data.find(
    (r) =>
      r.metadata?.kind === CAMPSITE_BOOKING_KIND &&
      r.metadata?.bookingId === bookingId &&
      r.metadata?.cancelledBy !== undefined &&
      r.status !== "failed" &&
      r.status !== "canceled",
  );
  if (existing) return existing;

  return stripe.refunds.create(
    {
      payment_intent: paymentIntentId,
      amount,
      reason: "requested_by_customer",
      metadata: { kind: CAMPSITE_BOOKING_KIND, bookingId, cancelledBy: by },
    },
    { idempotencyKey: `booking-refund-${bookingId}-${amount}` },
  );
}

export type CancelOptions = {
  by: "guest" | "admin";
  /**
   * Admins only: refund this many cents instead of the policy amount.
   * Between 0 and the amount paid.
   */
  refundAmount?: number;
};

/**
 * Cancel a confirmed booking, refund it and free its nights.
 *
 * Stripe-paid bookings are refunded through Stripe. For bookings paid
 * offline, the amount is only recorded, so the camp knows what to hand back.
 * The caller sends the cancellation email.
 */
export async function cancelBooking(
  bookingId: string,
  { by, refundAmount }: CancelOptions,
): Promise<BookingWithSite> {
  const booking = await loadBookingWithSite(bookingId);
  if (!booking) throw new BookingError("Booking not found.");
  if (booking.status !== "confirmed") {
    throw new BookingError("Only confirmed bookings can be cancelled.");
  }

  const paid = booking.pricePaid ?? 0;
  let amount: number;
  if (refundAmount === undefined) {
    amount = policyRefund(booking).amount;
  } else {
    if (by !== "admin") {
      throw new Error("Only admins can choose the refund amount");
    }
    if (!Number.isInteger(refundAmount) || refundAmount < 0) {
      throw new BookingError("Enter a refund of $0.00 or more.");
    }
    if (refundAmount > paid) {
      throw new BookingError(
        `The refund cannot be more than the ${formatCents(paid)} paid.`,
      );
    }
    amount = refundAmount;
  }

  let stripeRefundId: string | null = null;
  if (amount > 0 && !booking.paidOffline) {
    if (!booking.stripePaymentIntentId) {
      throw new Error(`Booking ${bookingId} has no payment to refund`);
    }
    const refund = await cancellationRefund(
      bookingId,
      booking.stripePaymentIntentId,
      amount,
      by,
    );
    stripeRefundId = refund.id;
    amount = refund.amount;
  }

  const now = new Date();
  const cancelled = await db.transaction(async (tx) => {
    const updated = await tx
      .update(bookings)
      .set({
        status: "cancelled",
        cancelledAt: now,
        cancelledBy: by,
        refundAmount: amount,
        stripeRefundId,
        holdExpiresAt: null,
        updatedAt: now,
      })
      .where(and(eq(bookings.id, bookingId), eq(bookings.status, "confirmed")))
      .returning({ id: bookings.id });
    if (updated.length === 0) return false;
    await tx
      .delete(bookingNights)
      .where(eq(bookingNights.bookingId, bookingId));
    return true;
  });
  if (!cancelled) {
    throw new BookingError("This booking has already been cancelled.");
  }

  const result = await loadBookingWithSite(bookingId);
  if (!result) throw new Error(`Booking ${bookingId} disappeared`);
  return result;
}
