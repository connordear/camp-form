import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import {
  BOOKINGS_PAGE_SIZE,
  type BookingGroup,
  type BookingListParams,
  type BookingListView,
  partySizeError,
  stayCost,
} from "@/lib/campground/booking";
import {
  type BlockedRange,
  groupBlockedNights,
  isValidRange,
  monthStart,
  shiftMonth,
} from "@/lib/campground/calendar";
import { addDays, nightsBetween } from "@/lib/campground/dates";
import { sortTiers } from "@/lib/campground/policy";
import { db } from "@/lib/data/db";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "@/lib/data/pg-errors";
import { bookingNights, bookings, campsites, user } from "@/lib/data/schema";
import {
  type AdminBooking,
  BookingError,
  type BookingWithSite,
  releaseExpiredHolds,
} from "@/lib/services/booking-service";
import {
  type Campsite,
  getAllSites,
  getCampgroundSettings,
} from "@/lib/services/campground-service";

/** Longest stay or block an admin can enter in one go, as a typo guard. */
export const MAX_ADMIN_NIGHTS = 180;

function checkRange(from: string, to: string) {
  if (!isValidRange(from, to)) {
    throw new BookingError("The last date must be after the first.");
  }
  if (nightsBetween(from, to).length > MAX_ADMIN_NIGHTS) {
    throw new BookingError(
      `That is more than ${MAX_ADMIN_NIGHTS} nights. Enter it in parts.`,
    );
  }
}

async function getBookableSite(siteId: string): Promise<Campsite> {
  const [site] = await db
    .select()
    .from(campsites)
    .where(eq(campsites.id, siteId));
  if (!site) throw new BookingError("Site not found.");
  return site;
}

// ---------------------------------------------------------------------------
// Bookings taken by phone or email
// ---------------------------------------------------------------------------

export type AdminBookingInput = {
  siteId: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string;
  partySize: number;
  notes: string | null;
  adminNotes: string | null;
  /** Cents the guest paid by cash or e-transfer, tax included. */
  pricePaid: number;
};

/**
 * Record a booking the camp took and was paid for outside Stripe. It is
 * confirmed straight away. Season and stay-length rules do not apply, so
 * the office can make exceptions; the nights must still be free.
 *
 * If the guest's email matches an account, the booking is linked to it and
 * shows under their My bookings.
 */
export async function createAdminBooking(
  input: AdminBookingInput,
): Promise<BookingWithSite> {
  checkRange(input.checkIn, input.checkOut);
  const site = await getBookableSite(input.siteId);
  if (!site.isActive) {
    throw new BookingError(
      `${site.name} is inactive. Turn it back on under Sites to book it.`,
    );
  }
  const partyError = partySizeError(input.partySize, site.maxOccupancy);
  if (partyError) throw new BookingError(partyError);
  if (!Number.isInteger(input.pricePaid) || input.pricePaid < 0) {
    throw new BookingError("Enter the amount paid, $0.00 or more.");
  }

  await releaseExpiredHolds();
  const settings = await getCampgroundSettings();
  const nights = nightsBetween(input.checkIn, input.checkOut);

  const account = input.guestEmail
    ? await db.query.user.findFirst({
        where: eq(sql`lower(${user.email})`, input.guestEmail.toLowerCase()),
        columns: { id: true },
      })
    : undefined;

  let bookingId: string;
  try {
    bookingId = await db.transaction(async (tx) => {
      const [booking] = await tx
        .insert(bookings)
        .values({
          siteId: site.id,
          userId: account?.id ?? null,
          guestName: input.guestName,
          guestEmail: input.guestEmail,
          guestPhone: input.guestPhone,
          partySize: input.partySize,
          notes: input.notes,
          adminNotes: input.adminNotes,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          status: "confirmed",
          source: "admin",
          paidOffline: true,
          subtotal: stayCost(site.nightlyRate, nights.length),
          pricePaid: input.pricePaid,
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
      throw new BookingError(
        `${site.name} is already booked, held or blocked for some of those nights.`,
      );
    }
    throw err;
  }

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { site: true },
  });
  if (!booking) throw new Error(`Booking ${bookingId} disappeared`);
  return booking;
}

export async function getAdminBooking(
  id: string,
): Promise<AdminBooking | undefined> {
  // So a lapsed hold never reads as still held.
  await releaseExpiredHolds();
  return db.query.bookings.findFirst({
    where: eq(bookings.id, id),
    with: {
      site: true,
      user: { columns: { name: true, email: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Bookings list
// ---------------------------------------------------------------------------

/** Each tab as SQL. Must match `bookingGroup`, which the badges use. */
function groupCondition(group: BookingGroup, today: string): SQL {
  switch (group) {
    case "upcoming":
      return or(
        eq(bookings.status, "pending"),
        and(eq(bookings.status, "confirmed"), gt(bookings.checkOut, today)),
      ) as SQL;
    case "past":
      return and(
        eq(bookings.status, "confirmed"),
        lte(bookings.checkOut, today),
      ) as SQL;
    case "cancelled":
      // A late payment refunded because the site was taken counts here too.
      return or(
        eq(bookings.status, "cancelled"),
        and(eq(bookings.status, "expired"), isNotNull(bookings.refundAmount)),
      ) as SQL;
    case "expired":
      return and(
        eq(bookings.status, "expired"),
        isNull(bookings.refundAmount),
      ) as SQL;
  }
}

/** Matches the search box against guest, contact, account, site and notes. */
function searchCondition(query: string): SQL | undefined {
  if (!query) return undefined;
  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  return or(
    ilike(bookings.guestName, pattern),
    ilike(bookings.guestEmail, pattern),
    ilike(bookings.guestPhone, pattern),
    ilike(bookings.notes, pattern),
    ilike(user.email, pattern),
    ilike(campsites.name, pattern),
  );
}

export type BookingsPage = {
  bookings: AdminBooking[];
  /** Bookings in each tab that match the search. */
  counts: Record<BookingListView, number>;
  page: number;
  totalPages: number;
};

/**
 * One page of the admin bookings list. Filtering, counting and paging all
 * happen in SQL, since every abandoned checkout stays as an expired row.
 */
export async function getBookingsPage(
  { view, query, page }: BookingListParams,
  today: string,
): Promise<BookingsPage> {
  const search = searchCondition(query);
  const countIn = (group: BookingGroup) =>
    sql<number>`count(*) filter (where ${groupCondition(group, today)})::int`;

  const [counts] = await db
    .select({
      upcoming: countIn("upcoming"),
      past: countIn("past"),
      cancelled: countIn("cancelled"),
      expired: countIn("expired"),
      all: sql<number>`count(*)::int`,
    })
    .from(bookings)
    .innerJoin(campsites, eq(bookings.siteId, campsites.id))
    .leftJoin(user, eq(bookings.userId, user.id))
    .where(search);

  const totalPages = Math.max(1, Math.ceil(counts[view] / BOOKINGS_PAGE_SIZE));
  const current = Math.min(page, totalPages);

  const rows = await db
    .select({
      booking: bookings,
      site: campsites,
      user: { name: user.name, email: user.email },
    })
    .from(bookings)
    .innerJoin(campsites, eq(bookings.siteId, campsites.id))
    .leftJoin(user, eq(bookings.userId, user.id))
    .where(
      and(view === "all" ? undefined : groupCondition(view, today), search),
    )
    // Upcoming reads best soonest first; everything else newest first.
    .orderBy(
      ...(view === "upcoming"
        ? [asc(bookings.checkIn), asc(bookings.createdAt)]
        : [desc(bookings.checkIn), desc(bookings.createdAt)]),
      asc(bookings.id),
    )
    .limit(BOOKINGS_PAGE_SIZE)
    .offset((current - 1) * BOOKINGS_PAGE_SIZE);

  return {
    bookings: rows.map((r) => ({ ...r.booking, site: r.site, user: r.user })),
    counts,
    page: current,
    totalPages,
  };
}

export async function updateAdminNotes(id: string, adminNotes: string | null) {
  const updated = await db
    .update(bookings)
    .set({ adminNotes, updatedAt: new Date() })
    .where(eq(bookings.id, id))
    .returning({ id: bookings.id });
  if (updated.length === 0) throw new BookingError("Booking not found.");
}

// ---------------------------------------------------------------------------
// Blocked nights
// ---------------------------------------------------------------------------

export type BlockInput = {
  siteIds: string[];
  /** First night blocked. */
  from: string;
  /** Morning after the last night blocked (exclusive). */
  to: string;
  reason: string;
};

/**
 * Take nights off sale on one or more sites, for repairs, staff use and so
 * on. All or nothing: if any night on any of the sites is already booked,
 * held or blocked, nothing is blocked.
 */
export async function blockNights(input: BlockInput) {
  checkRange(input.from, input.to);
  const siteIds = [...new Set(input.siteIds)];
  if (siteIds.length === 0) throw new BookingError("Pick at least one site.");
  const sites = await db
    .select({ id: campsites.id, name: campsites.name })
    .from(campsites)
    .where(inArray(campsites.id, siteIds));
  if (sites.length !== siteIds.length) {
    throw new BookingError("Site not found.");
  }
  await releaseExpiredHolds();

  const nights = nightsBetween(input.from, input.to);
  try {
    // One insert, so the (site_id, night) key rejects the lot on any clash.
    await db.insert(bookingNights).values(
      sites.flatMap((site) =>
        nights.map((night) => ({
          siteId: site.id,
          night,
          bookingId: null,
          price: 0,
          blockReason: input.reason,
        })),
      ),
    );
  } catch (err) {
    if (pgErrorCode(err) !== PG_UNIQUE_VIOLATION) throw err;
    // Only to name the sites in the message; the insert already decided.
    const taken = await db
      .selectDistinct({ siteId: bookingNights.siteId })
      .from(bookingNights)
      .where(
        and(
          inArray(bookingNights.siteId, siteIds),
          gte(bookingNights.night, input.from),
          lt(bookingNights.night, input.to),
        ),
      );
    const takenIds = new Set(taken.map((t) => t.siteId));
    const names = sites.filter((s) => takenIds.has(s.id)).map((s) => s.name);
    const who = names.length > 0 ? listNames(names) : "A site";
    throw new BookingError(
      `${who} ${names.length > 1 ? "are" : "is"} already booked, held or blocked for some of those nights. Nothing was blocked.`,
    );
  }
}

/** "A", "A and B", "A, B and C". */
function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** Put blocked nights back on sale. Booked nights are never touched. */
export async function unblockNights({
  siteId,
  from,
  to,
}: {
  siteId: string;
  from: string;
  to: string;
}) {
  // No night limit here: the list merges back-to-back blocks into one range,
  // which can be longer than any single block was allowed to be.
  if (!isValidRange(from, to)) {
    throw new BookingError("The last date must be after the first.");
  }
  await db
    .delete(bookingNights)
    .where(
      and(
        eq(bookingNights.siteId, siteId),
        isNull(bookingNights.bookingId),
        gte(bookingNights.night, from),
        lt(bookingNights.night, to),
      ),
    );
}

export type BlockedRangeWithSite = BlockedRange & { siteName: string };

/** Blocks that are still to come (or under way), soonest first. */
export async function getUpcomingBlocks(
  today: string,
): Promise<BlockedRangeWithSite[]> {
  const rows = await db
    .select({
      siteId: bookingNights.siteId,
      siteName: campsites.name,
      night: bookingNights.night,
      reason: bookingNights.blockReason,
    })
    .from(bookingNights)
    .innerJoin(campsites, eq(bookingNights.siteId, campsites.id))
    .where(
      and(isNull(bookingNights.bookingId), gte(bookingNights.night, today)),
    )
    .orderBy(asc(bookingNights.night));
  const names = new Map(rows.map((r) => [r.siteId, r.siteName]));
  return groupBlockedNights(
    rows.map((r) => ({ ...r, reason: r.reason ?? "" })),
  ).map((range) => ({ ...range, siteName: names.get(range.siteId) ?? "" }));
}

// ---------------------------------------------------------------------------
// Month grid
// ---------------------------------------------------------------------------

/** What occupies one night of one site. */
export type GridNight =
  | {
      kind: "booking";
      bookingId: string;
      guestName: string;
      status: "pending" | "confirmed";
      partySize: number;
    }
  | { kind: "block"; reason: string };

export type MonthGrid = {
  sites: Campsite[];
  /** siteId -> night -> what holds it. Includes one day either side. */
  nights: Record<string, Record<string, GridNight>>;
};

/**
 * Every site and what holds each of its nights in `month` ("YYYY-MM"), plus
 * one night either side so the grid can show stays that cross the edges.
 * Inactive sites are shown only if something is on them that month.
 */
export async function getMonthGrid(month: string): Promise<MonthGrid> {
  await releaseExpiredHolds();
  const from = addDays(monthStart(month), -1);
  const to = addDays(monthStart(shiftMonth(month, 1)), 1);

  const [allSites, rows] = await Promise.all([
    getAllSites(),
    db
      .select({
        siteId: bookingNights.siteId,
        night: bookingNights.night,
        blockReason: bookingNights.blockReason,
        bookingId: bookings.id,
        guestName: bookings.guestName,
        status: bookings.status,
        partySize: bookings.partySize,
      })
      .from(bookingNights)
      .leftJoin(bookings, eq(bookingNights.bookingId, bookings.id))
      .where(and(gte(bookingNights.night, from), lt(bookingNights.night, to))),
  ]);

  const nights: MonthGrid["nights"] = {};
  for (const row of rows) {
    const site = nights[row.siteId] ?? {};
    nights[row.siteId] = site;
    if (row.bookingId === null) {
      site[row.night] = { kind: "block", reason: row.blockReason ?? "" };
    } else if (row.status === "pending" || row.status === "confirmed") {
      site[row.night] = {
        kind: "booking",
        bookingId: row.bookingId,
        guestName: row.guestName ?? "",
        status: row.status,
        partySize: row.partySize ?? 0,
      };
    }
  }

  const sites = allSites.filter((s) => s.isActive || nights[s.id]);
  return { sites, nights };
}
