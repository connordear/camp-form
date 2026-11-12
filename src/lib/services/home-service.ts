import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { bookingGroup } from "@/lib/campground/booking";
import { campgroundToday } from "@/lib/campground/dates";
import { db } from "@/lib/data/db";
import { bookings, campers, campYears, registrations } from "@/lib/data/schema";

/** The year of the next summer's camps: the earliest year with a camp not yet over. */
export async function getUpcomingCampYear(): Promise<number | null> {
  const [row] = await db
    .select({ year: campYears.year })
    .from(campYears)
    .where(gte(campYears.endDate, campgroundToday()))
    .orderBy(asc(campYears.year))
    .limit(1);
  return row?.year ?? null;
}

export type UserCampStatus = {
  camperCount: number;
  registeredCount: number;
  inProgressCount: number;
  year: number | null;
};

/** The signed-in family's campers and registrations for the coming summer. */
export async function getUserCampStatus(
  userId: string,
  year: number | null,
): Promise<UserCampStatus> {
  const userCampers = await db
    .select({ id: campers.id })
    .from(campers)
    .where(eq(campers.userId, userId));
  if (userCampers.length === 0 || year === null) {
    return {
      camperCount: userCampers.length,
      registeredCount: 0,
      inProgressCount: 0,
      year,
    };
  }
  const regs = await db
    .select({ status: registrations.status })
    .from(registrations)
    .where(
      and(
        inArray(
          registrations.camperId,
          userCampers.map((c) => c.id),
        ),
        eq(registrations.campYear, year),
      ),
    );
  return {
    camperCount: userCampers.length,
    registeredCount: regs.filter((r) => r.status === "registered").length,
    inProgressCount: regs.filter((r) => r.status === "draft").length,
    year,
  };
}

export type UserCampgroundStatus = {
  next: { siteName: string; checkIn: string; checkOut: string } | null;
  upcomingCount: number;
};

/** The signed-in guest's next confirmed stay. */
export async function getUserCampgroundStatus(
  userId: string,
): Promise<UserCampgroundStatus> {
  const rows = await db.query.bookings.findMany({
    where: and(eq(bookings.userId, userId), eq(bookings.status, "confirmed")),
    with: { site: { columns: { name: true } } },
    orderBy: [asc(bookings.checkIn)],
  });
  const today = campgroundToday();
  const upcoming = rows.filter((b) => bookingGroup(b, today) === "upcoming");
  const first = upcoming[0];
  return {
    next: first
      ? {
          siteName: first.site.name,
          checkIn: first.checkIn,
          checkOut: first.checkOut,
        }
      : null,
    upcomingCount: upcoming.length,
  };
}
