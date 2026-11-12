// Sample campground bookings for trying out the admin panel. Development only.
//
// Re-running replaces the bookings and blocked nights this script made before
// (marked with SEED_MARKER) and leaves everything else alone. Online bookings
// get a real Stripe *test mode* payment, so refunds work from the admin panel.
//
// `--many` also adds a few hundred generated bookings, enough to page every
// tab of the admin bookings list. Those are paid offline (no Stripe calls), so
// cancelling one only records the refund.
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import {
  addDays,
  campgroundToday,
  nightsBetween,
} from "@/lib/campground/dates";
import { db } from "./db";
import * as schema from "./schema";
import { seedCampground } from "./seed-campground";

if (process.env.IS_DEV !== "true") {
  console.error(
    "❌ Error: Sample bookings can only be seeded in development (IS_DEV=true)",
  );
  process.exit(1);
}

const SEED_MARKER = "Sample booking (seed)";
const BLOCK_MARKER = "Maintenance (seed)";
const TIERS = [
  { minDaysBefore: 7, refundPercent: 100 },
  { minDaysBefore: 1, refundPercent: 50 },
];
const GST = 0.05;

type Plan = {
  site: number; // "Site N", 1-based position in sort order
  from: number; // days from today
  nights: number;
  guest: string;
  party: number;
  status: "confirmed" | "cancelled" | "expired" | "pending";
  source?: "online" | "admin";
  paidOffline?: boolean;
  notes?: string;
  adminNotes?: string;
  /** Attach to the user@test.com account, so it shows under My bookings. */
  mine?: boolean;
  cancelledBy?: "guest" | "admin";
  refundShare?: number; // of the price paid
};

// Planned so no two live bookings share a site and night.
const PLANS: Plan[] = [
  // Already left
  {
    site: 1,
    from: -20,
    nights: 3,
    guest: "Priya Raman",
    party: 4,
    status: "confirmed",
  },
  {
    site: 5,
    from: -14,
    nights: 2,
    guest: "Tom Becker",
    party: 2,
    status: "confirmed",
    mine: true,
  },
  {
    site: 9,
    from: -10,
    nights: 5,
    guest: "Hannah Klassen",
    party: 6,
    status: "confirmed",
    source: "admin",
    paidOffline: true,
    adminNotes: "Paid cash at the office.",
  },
  {
    site: 12,
    from: -6,
    nights: 2,
    guest: "Daniel Okafor",
    party: 3,
    status: "confirmed",
  },
  // Here now
  {
    site: 2,
    from: -1,
    nights: 3,
    guest: "Marie Tremblay",
    party: 4,
    status: "confirmed",
    notes: "Arriving late, around 9 pm.",
  },
  {
    site: 6,
    from: -2,
    nights: 4,
    guest: "Grace Wiebe",
    party: 5,
    status: "confirmed",
    source: "admin",
    paidOffline: true,
    adminNotes: "Booked by phone, e-transfer received.",
  },
  {
    site: 10,
    from: 0,
    nights: 2,
    guest: "Owen MacLeod",
    party: 2,
    status: "confirmed",
    mine: true,
  },
  // Coming up
  {
    site: 3,
    from: 3,
    nights: 2,
    guest: "Sofia Martins",
    party: 3,
    status: "confirmed",
  },
  {
    site: 4,
    from: 5,
    nights: 7,
    guest: "Ethan Friesen",
    party: 6,
    status: "confirmed",
    notes: "Two tents and one car.",
  },
  {
    site: 7,
    from: 9,
    nights: 3,
    guest: "Aisha Siddiqui",
    party: 4,
    status: "confirmed",
  },
  {
    site: 8,
    from: 12,
    nights: 2,
    guest: "Lucas Dubois",
    party: 2,
    status: "confirmed",
    source: "admin",
    paidOffline: true,
    adminNotes: "Church youth leader; will pay on arrival.",
  },
  {
    site: 11,
    from: 14,
    nights: 4,
    guest: "Chloe Penner",
    party: 6,
    status: "confirmed",
    mine: true,
  },
  {
    site: 13,
    from: 20,
    nights: 3,
    guest: "Noah Thiessen",
    party: 5,
    status: "confirmed",
  },
  {
    site: 1,
    from: 30,
    nights: 5,
    guest: "Emma Johnson",
    party: 4,
    status: "confirmed",
    notes: "Celebrating an anniversary.",
  },
  {
    site: 9,
    from: 45,
    nights: 2,
    guest: "Liam Harder",
    party: 2,
    status: "confirmed",
  },
  // Cancelled (nights released)
  {
    site: 2,
    from: 10,
    nights: 2,
    guest: "Mason Reimer",
    party: 3,
    status: "cancelled",
    cancelledBy: "guest",
    refundShare: 1,
  },
  {
    site: 5,
    from: 4,
    nights: 3,
    guest: "Olivia Chen",
    party: 4,
    status: "cancelled",
    cancelledBy: "guest",
    refundShare: 0.5,
  },
  {
    site: 12,
    from: 8,
    nights: 2,
    guest: "Jacob Neufeld",
    party: 2,
    status: "cancelled",
    cancelledBy: "admin",
    refundShare: 1,
    adminNotes: "Site flooded; moved them to next season.",
  },
  // Holds that ran out, and one still open
  {
    site: 3,
    from: 15,
    nights: 2,
    guest: "Ava Giesbrecht",
    party: 2,
    status: "expired",
  },
  {
    site: 6,
    from: 18,
    nights: 3,
    guest: "Ben Dyck",
    party: 4,
    status: "pending",
  },
];

// Nights an admin has blocked: [site, from, nights]
const BLOCKS: Array<[number, number, number]> = [
  [13, 2, 3],
  [7, 25, 2],
];

async function createTestPayment(amount: number): Promise<string | null> {
  try {
    const { stripe } = await import("@/lib/stripe");
    const intent = await stripe.paymentIntents.create({
      amount,
      currency: "cad",
      payment_method: "pm_card_visa",
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: { kind: "campsite_booking", seed: "true" },
    });
    return intent.id;
  } catch (err) {
    console.warn(
      `   ⚠️  Stripe test payment failed, leaving one booking without it (refunds won't work for it): ${(err as Error).message}`,
    );
    return null;
  }
}

/** Same bookings on every run, so the list looks the same each time. */
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

const FIRST_NAMES = [
  "Ada",
  "Ben",
  "Cara",
  "Dev",
  "Ella",
  "Finn",
  "Gwen",
  "Hugo",
  "Iris",
  "Jon",
  "Kira",
  "Leo",
  "Maya",
  "Nate",
  "Opal",
  "Paul",
  "Quinn",
  "Rosa",
  "Sam",
  "Tess",
];
const LAST_NAMES = [
  "Armstrong",
  "Bergen",
  "Cardinal",
  "Doerksen",
  "Enns",
  "Fehr",
  "Gagnon",
  "Hiebert",
  "Isaac",
  "Janzen",
  "Kroeker",
  "Loewen",
  "Martens",
  "Nickel",
  "Olfert",
  "Peters",
  "Quiring",
  "Rempel",
  "Sawatzky",
  "Toews",
];

type Site = typeof schema.campsites.$inferSelect;

/**
 * Lots of bookings for trying the admin list's paging: back-to-back stays on
 * every site from 90 days ago to 90 days ahead, plus cancellations and
 * abandoned checkouts, which hold no nights. Nights that are already taken
 * are skipped.
 */
async function seedManyBookings(sites: Site[], today: string, now: Date) {
  const random = seededRandom(20_260_701);
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];
  const guest = () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;

  const taken = new Set(
    (
      await db
        .select({
          siteId: schema.bookingNights.siteId,
          night: schema.bookingNights.night,
        })
        .from(schema.bookingNights)
    ).map((n) => `${n.siteId}|${n.night}`),
  );

  type Row = typeof schema.bookings.$inferInsert;
  const rows: Array<{ booking: Row; site: Site; nights: string[] }> = [];
  const add = (
    site: Site,
    from: number,
    nightCount: number,
    status: Plan["status"],
  ) => {
    const checkIn = addDays(today, from);
    const checkOut = addDays(checkIn, nightCount);
    const nights = nightsBetween(checkIn, checkOut);
    const holds = status === "confirmed";
    if (holds && nights.some((n) => taken.has(`${site.id}|${n}`))) return;
    if (holds) for (const n of nights) taken.add(`${site.id}|${n}`);

    const name = guest();
    const subtotal = site.nightlyRate * nightCount;
    const pricePaid =
      status === "expired" ? null : Math.round(subtotal * (1 + GST));
    const created = new Date(
      now.getTime() -
        Math.max(1, 30 - from + Math.floor(random() * 20)) * 86_400_000,
    );
    rows.push({
      site,
      nights: holds ? nights : [],
      booking: {
        siteId: site.id,
        userId: null,
        guestName: name,
        guestEmail: emailFor(`${name} ${rows.length}`),
        guestPhone: `780-555-${String(2000 + rows.length).slice(-4)}`,
        partySize: Math.min(1 + Math.floor(random() * 6), site.maxOccupancy),
        notes: random() < 0.15 ? "Bringing a dog." : null,
        adminNotes: SEED_MARKER,
        checkIn,
        checkOut,
        status,
        source: status === "expired" ? "online" : "admin",
        holdExpiresAt: null,
        subtotal,
        pricePaid,
        paidOffline: status !== "expired",
        cancellationTiers: TIERS,
        cancelledAt:
          status === "cancelled"
            ? new Date(created.getTime() + 86_400_000)
            : null,
        cancelledBy:
          status === "cancelled" ? (random() < 0.5 ? "guest" : "admin") : null,
        refundAmount:
          status === "cancelled" && pricePaid
            ? Math.round(pricePaid * pick([0, 0.5, 1]))
            : null,
        createdAt: created,
        updatedAt: created,
      },
    });
  };

  for (const site of sites.filter((s) => s.isActive)) {
    let day = -90 + Math.floor(random() * 4);
    while (day < 90) {
      const nightCount = 1 + Math.floor(random() * 4);
      add(site, day, nightCount, "confirmed");
      day += nightCount + Math.floor(random() * 5);
    }
  }
  for (let i = 0; i < 70; i++) {
    const from = Math.floor(random() * 180) - 90;
    add(pick(sites), from, 1 + Math.floor(random() * 4), "cancelled");
    add(pick(sites), from, 1 + Math.floor(random() * 4), "expired");
  }

  await db.transaction(async (tx) => {
    const ids = await tx
      .insert(schema.bookings)
      .values(rows.map((r) => r.booking))
      .returning({ id: schema.bookings.id });
    const nights = rows.flatMap((r, i) =>
      r.nights.map((night) => ({
        siteId: r.site.id,
        night,
        bookingId: ids[i].id,
        price: r.site.nightlyRate,
      })),
    );
    for (let i = 0; i < nights.length; i += 1000) {
      await tx.insert(schema.bookingNights).values(nights.slice(i, i + 1000));
    }
  });

  const count = (status: Plan["status"]) =>
    rows.filter((r) => r.booking.status === status).length;
  console.log(
    `   ✅ Added ${rows.length} generated bookings: ${count("confirmed")} stays, ${count("cancelled")} cancelled, ${count("expired")} expired holds`,
  );
}

async function seedCampgroundBookings({ many = false } = {}) {
  await seedCampground();

  const sites = await db
    .select()
    .from(schema.campsites)
    .orderBy(asc(schema.campsites.sortOrder));
  if (sites.length === 0) throw new Error("No campsites to book");

  const mine = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, "user@test.com"),
  });
  if (!mine) {
    console.log(
      "   ℹ️  user@test.com not found (run db:seed:users); bookings stay unlinked",
    );
  }

  // Clear what an earlier run made. Nights go with their bookings.
  const old = await db
    .delete(schema.bookings)
    .where(eq(schema.bookings.adminNotes, SEED_MARKER))
    .returning({ id: schema.bookings.id });
  const oldNoted = await db
    .delete(schema.bookings)
    .where(
      inArray(
        schema.bookings.guestEmail,
        PLANS.map((p) => emailFor(p.guest)),
      ),
    )
    .returning({ id: schema.bookings.id });
  await db
    .delete(schema.bookingNights)
    .where(
      and(
        isNull(schema.bookingNights.bookingId),
        eq(schema.bookingNights.blockReason, BLOCK_MARKER),
      ),
    );
  if (old.length + oldNoted.length > 0) {
    console.log(
      `   🧹 Removed ${old.length + oldNoted.length} sample bookings from an earlier run`,
    );
  }

  const today = campgroundToday();
  const now = new Date();
  let made = 0;
  let skipped = 0;

  for (const plan of PLANS) {
    const site = sites[(plan.site - 1) % sites.length];
    const checkIn = addDays(today, plan.from);
    const checkOut = addDays(checkIn, plan.nights);
    const nights = nightsBetween(checkIn, checkOut);
    const subtotal = site.nightlyRate * plan.nights;
    const source = plan.source ?? "online";
    const paid = plan.status === "confirmed" || plan.status === "cancelled";
    const pricePaid = paid ? Math.round(subtotal * (1 + GST)) : null;
    const holdsNights =
      plan.status === "confirmed" || plan.status === "pending";

    if (holdsNights) {
      const taken = await db
        .select({ night: schema.bookingNights.night })
        .from(schema.bookingNights)
        .where(
          and(
            eq(schema.bookingNights.siteId, site.id),
            inArray(schema.bookingNights.night, nights),
          ),
        );
      if (taken.length > 0) {
        console.log(
          `   ⏭  ${site.name} is already taken ${checkIn} to ${checkOut}, skipping ${plan.guest}`,
        );
        skipped++;
        continue;
      }
    }

    const paymentIntent =
      paid && source === "online" && pricePaid
        ? await createTestPayment(pricePaid)
        : null;
    const refundAmount =
      plan.status === "cancelled" && pricePaid
        ? Math.round(pricePaid * (plan.refundShare ?? 0))
        : null;
    const created = new Date(
      now.getTime() - Math.max(1, 20 - plan.from) * 86_400_000,
    );

    const [booking] = await db
      .insert(schema.bookings)
      .values({
        siteId: site.id,
        userId: plan.mine && mine ? mine.id : null,
        guestName: plan.guest,
        guestEmail: plan.mine && mine ? mine.email : emailFor(plan.guest),
        guestPhone: `780-555-${String(1000 + made).slice(-4)}`,
        partySize: Math.min(plan.party, site.maxOccupancy),
        notes: plan.notes ?? null,
        adminNotes: plan.adminNotes ?? SEED_MARKER,
        checkIn,
        checkOut,
        status: plan.status,
        source,
        holdExpiresAt:
          plan.status === "pending"
            ? new Date(now.getTime() + 25 * 60_000)
            : null,
        subtotal,
        pricePaid,
        paidOffline: plan.paidOffline ?? false,
        cancellationTiers: TIERS,
        stripePaymentIntentId: paymentIntent,
        cancelledAt:
          plan.status === "cancelled"
            ? new Date(now.getTime() - 2 * 86_400_000)
            : null,
        cancelledBy: plan.cancelledBy ?? null,
        refundAmount,
        createdAt: created,
        updatedAt: created,
      })
      .returning();

    if (holdsNights) {
      await db.insert(schema.bookingNights).values(
        nights.map((night) => ({
          siteId: site.id,
          night,
          bookingId: booking.id,
          price: site.nightlyRate,
        })),
      );
    }
    made++;
  }

  let blocked = 0;
  for (const [siteNo, from, count] of BLOCKS) {
    const site = sites[(siteNo - 1) % sites.length];
    const nights = nightsBetween(
      addDays(today, from),
      addDays(today, from + count),
    );
    const rows = await db
      .insert(schema.bookingNights)
      .values(
        nights.map((night) => ({
          siteId: site.id,
          night,
          bookingId: null,
          blockReason: BLOCK_MARKER,
        })),
      )
      .onConflictDoNothing()
      .returning();
    blocked += rows.length;
  }

  console.log(
    `   ✅ Created ${made} sample bookings${skipped ? ` (${skipped} skipped, site already taken)` : ""} and ${blocked} blocked nights`,
  );

  if (many) await seedManyBookings(sites, today, now);
}

/** Seeded guests get a placeholder address, which also marks them as seeded. */
function emailFor(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`;
}

if (import.meta.main) {
  seedCampgroundBookings({ many: process.argv.includes("--many") })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seeding sample bookings failed:", err);
      process.exit(1);
    });
}
