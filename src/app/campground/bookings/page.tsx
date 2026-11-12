import { TentIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingStatusBadge } from "@/components/campground/booking-status";
import { FeatureIcons } from "@/components/campground/feature-icons";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/auth-helpers";
import {
  type BookingGroup,
  bookingGroup,
  formatStayRange,
  nightsLabel,
} from "@/lib/campground/booking";
import { campgroundToday, daysUntil } from "@/lib/campground/dates";
import { formatCents } from "@/lib/campground/money";
import { authPathWithRedirect } from "@/lib/redirect";
import {
  type BookingWithSite,
  getUserBookings,
} from "@/lib/services/booking-service";

export const metadata: Metadata = { title: "My campsite bookings" };

function BookingRow({ booking }: { booking: BookingWithSite }) {
  const nights = daysUntil(booking.checkOut, booking.checkIn);
  return (
    <li>
      <Link
        href={`/campground/bookings/${booking.id}`}
        className="block rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Card className="hover:bg-accent/50 transition-colors">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-medium flex items-center gap-2">
                {booking.site.name}
                <BookingStatusBadge booking={booking} />
              </p>
              <p className="text-sm text-muted-foreground">
                {formatStayRange(booking.checkIn, booking.checkOut)},{" "}
                {nightsLabel(nights)}
              </p>
              <FeatureIcons
                features={booking.site.features}
                variant="compact"
              />
            </div>
            {booking.pricePaid !== null && (
              <p className="text-sm tabular-nums">
                {formatCents(booking.pricePaid)}
              </p>
            )}
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}

function Section({
  title,
  bookings,
}: {
  title: string;
  bookings: BookingWithSite[];
}) {
  if (bookings.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <ul className="space-y-3">
        {bookings.map((b) => (
          <BookingRow key={b.id} booking={b} />
        ))}
      </ul>
    </section>
  );
}

export default async function MyBookingsPage() {
  const session = await getSession();
  if (!session)
    redirect(authPathWithRedirect("/sign-in", "/campground/bookings"));

  const all = await getUserBookings(session.user.id);
  const today = campgroundToday();

  const inGroup = (group: BookingGroup) =>
    all.filter((b) => bookingGroup(b, today) === group);
  const upcoming = inGroup("upcoming").sort((a, b) =>
    a.checkIn.localeCompare(b.checkIn),
  );
  const past = inGroup("past");
  // Plain expired holds were never paid for, so they are not listed.
  const cancelled = inGroup("cancelled");
  const isEmpty = upcoming.length + past.length + cancelled.length === 0;

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8 space-y-8">
      <h1 className="text-3xl font-bold">My campsite bookings</h1>

      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center py-10 text-center">
            <TentIcon
              className="size-10 text-muted-foreground mb-3"
              aria-hidden
            />
            <p className="text-muted-foreground">You have no bookings yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Section title="Upcoming" bookings={upcoming} />
          <Section title="Past" bookings={past} />
          <Section title="Cancelled and refunded" bookings={cancelled} />
        </>
      )}
    </div>
  );
}
