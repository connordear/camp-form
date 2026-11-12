import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  ClockIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookingStatusBadge } from "@/components/campground/booking-status";
import { FeatureIcons } from "@/components/campground/feature-icons";
import { PolicyTable } from "@/components/campground/policy-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth-helpers";
import {
  formatClockTime,
  formatStayRange,
  nightsLabel,
} from "@/lib/campground/booking";
import { CAMPGROUND_TIMEZONE, daysUntil } from "@/lib/campground/dates";
import { formatCents } from "@/lib/campground/money";
import { authPathWithRedirect } from "@/lib/redirect";
import { completeBookingCheckout } from "@/lib/services/booking-checkout";
import {
  type BookingWithSite,
  getUserBooking,
} from "@/lib/services/booking-service";
import { getCampgroundSettings } from "@/lib/services/campground-service";
import { stripe } from "@/lib/stripe";
import { campgroundHref } from "../../search-params";

export const metadata: Metadata = { title: "Campsite booking" };

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CAMPGROUND_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * Coming back from Stripe, confirm straight away rather than waiting for the
 * webhook. Only a paid session that belongs to this booking counts.
 */
async function confirmOnReturn(
  booking: BookingWithSite,
  sessionId: string | undefined,
): Promise<boolean> {
  if (!sessionId || booking.status === "confirmed") return false;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.bookingId !== booking.id) return false;
    if (session.status !== "complete") return false;
    const outcome = await completeBookingCheckout(session);
    return outcome.kind !== "noop";
  } catch (err) {
    // The webhook will still confirm it.
    console.error(`Could not confirm booking ${booking.id} on return`, err);
    return false;
  }
}

export default async function BookingPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { session_id: sessionId } = await searchParams;

  const session = await getSession();
  if (!session) {
    redirect(authPathWithRedirect("/sign-in", `/campground/bookings/${id}`));
  }

  let booking = await getUserBooking(session.user.id, id);
  if (!booking) notFound();

  if (await confirmOnReturn(booking, sessionId)) {
    booking = (await getUserBooking(session.user.id, id)) ?? booking;
  }

  const settings = await getCampgroundSettings();
  const nights = daysUntil(booking.checkOut, booking.checkIn);
  const stay = formatStayRange(booking.checkIn, booking.checkOut);
  const retryHref = campgroundHref("/campground", {
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
  });

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8 space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/campground/bookings">
          <ArrowLeftIcon className="size-4" aria-hidden />
          My bookings
        </Link>
      </Button>

      {booking.status === "confirmed" && sessionId && (
        <div className="flex gap-3 items-start rounded-lg border border-green-600/40 bg-green-50 dark:bg-green-950 p-4">
          <CheckCircle2Icon
            className="size-5 text-green-600 shrink-0 mt-0.5"
            aria-hidden
          />
          <div>
            <p className="font-medium">You're booked!</p>
            <p className="text-sm text-muted-foreground">
              A confirmation email is on its way to {booking.guestEmail}.
            </p>
          </div>
        </div>
      )}

      {booking.status === "pending" && (
        <div className="flex gap-3 items-start rounded-lg border p-4">
          <ClockIcon className="size-5 shrink-0 mt-0.5" aria-hidden />
          <div className="text-sm">
            {sessionId ? (
              <p>
                We're confirming your payment. This usually takes a few seconds;
                refresh the page to check.
              </p>
            ) : (
              <p>
                Payment hasn't been completed.
                {booking.holdExpiresAt &&
                  ` We're holding the site until ${formatTime(booking.holdExpiresAt)}.`}{" "}
                <Link
                  href={campgroundHref("/campground/book", {
                    site: booking.siteId,
                    checkIn: booking.checkIn,
                    checkOut: booking.checkOut,
                  })}
                  className="underline"
                >
                  Start payment again
                </Link>
              </p>
            )}
          </div>
        </div>
      )}

      {booking.status === "expired" && (
        <div className="flex gap-3 items-start rounded-lg border border-amber-500/50 p-4">
          <CircleAlertIcon
            className="size-5 text-amber-500 shrink-0 mt-0.5"
            aria-hidden
          />
          <div className="text-sm space-y-1">
            {booking.refundAmount !== null ? (
              <p>
                Your payment arrived after the hold on this site ran out, and
                someone else booked it in the meantime. We've refunded the full{" "}
                {formatCents(booking.refundAmount)}. Sorry about that.
              </p>
            ) : (
              <p>
                This hold expired before payment was completed, so the site was
                released.
              </p>
            )}
            <Link href={retryHref} className="underline">
              See sites for these dates
            </Link>
          </div>
        </div>
      )}

      {booking.status === "cancelled" && (
        <div className="flex gap-3 items-start rounded-lg border p-4">
          <CircleAlertIcon className="size-5 shrink-0 mt-0.5" aria-hidden />
          <div className="text-sm space-y-1">
            <p className="font-medium">This booking was cancelled.</p>
            <p>
              {!booking.refundAmount
                ? "No refund was due under the cancellation policy."
                : booking.stripeRefundId
                  ? `We've refunded ${formatCents(booking.refundAmount)} to your card. It usually takes 5 to 10 business days to appear.`
                  : `You're owed a refund of ${formatCents(booking.refundAmount)}. The camp office will arrange it with you.`}
            </p>
            <Link href={retryHref} className="underline">
              See sites for these dates
            </Link>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex flex-wrap items-center gap-2">
            {booking.site.name}
            <BookingStatusBadge booking={booking} />
          </CardTitle>
          <CardDescription>
            {stay}, {nightsLabel(nights)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FeatureIcons features={booking.site.features} />
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Check-in</dt>
            <dd>From {formatClockTime(settings.checkInTime)}</dd>
            <dt className="text-muted-foreground">Check-out</dt>
            <dd>By {formatClockTime(settings.checkOutTime)}</dd>
            <dt className="text-muted-foreground">Name</dt>
            <dd>{booking.guestName}</dd>
            <dt className="text-muted-foreground">Phone</dt>
            <dd>{booking.guestPhone}</dd>
            <dt className="text-muted-foreground">People</dt>
            <dd>{booking.partySize}</dd>
            {booking.notes && (
              <>
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="whitespace-pre-line">{booking.notes}</dd>
              </>
            )}
            <dt className="text-muted-foreground">
              {booking.pricePaid !== null ? "Paid" : "Subtotal"}
            </dt>
            <dd>
              {booking.pricePaid !== null
                ? `${formatCents(booking.pricePaid)}, tax included`
                : `${formatCents(booking.subtotal)} plus tax`}
            </dd>
          </dl>
        </CardContent>
      </Card>

      {booking.status === "confirmed" && (
        <Card>
          <CardHeader>
            <CardTitle>Cancellation policy</CardTitle>
            <CardDescription>
              The terms you booked under. To cancel or change this booking,
              please contact the camp office.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PolicyTable
              tiers={booking.cancellationTiers}
              checkIn={booking.checkIn}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
