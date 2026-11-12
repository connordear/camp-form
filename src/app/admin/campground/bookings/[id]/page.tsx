import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingStatusBadge } from "@/components/campground/booking-status";
import { FeatureIcons } from "@/components/campground/feature-icons";
import { PolicyTable } from "@/components/campground/policy-table";
import { SiteLocationMap } from "@/components/campground/site-location-map";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { adminPage } from "@/lib/auth-helpers";
import { formatStayRange, nightsLabel } from "@/lib/campground/booking";
import { monthOf } from "@/lib/campground/calendar";
import { CAMPGROUND_TIMEZONE, daysUntil } from "@/lib/campground/dates";
import { formatCents } from "@/lib/campground/money";
import { getAdminBooking } from "@/lib/services/booking-admin-service";
import { policyRefund } from "@/lib/services/booking-service";
import { getAllSites } from "@/lib/services/campground-service";
import { AdminNotesForm } from "./components/admin-notes-form";
import { CancelBookingDialog } from "./components/cancel-booking-dialog";

type PageProps = { params: Promise<{ id: string }> };

const timestamp = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAMPGROUND_TIMEZONE,
  dateStyle: "medium",
  timeStyle: "short",
});

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

async function AdminBookingPage({ params }: PageProps) {
  const { id } = await params;
  const [booking, allSites] = await Promise.all([
    getAdminBooking(id),
    getAllSites(),
  ]);
  if (!booking) notFound();
  const mapSites = allSites.filter(
    (s) => s.isActive || s.id === booking.siteId,
  );

  const nights = daysUntil(booking.checkOut, booking.checkIn);
  const stay = formatStayRange(booking.checkIn, booking.checkOut);
  const paid = booking.pricePaid;
  const canCancel = booking.status === "confirmed";

  return (
    <div className="max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link
          href={`/admin/campground/bookings?month=${monthOf(booking.checkIn)}`}
        >
          <ArrowLeftIcon aria-hidden />
          Bookings
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
            {booking.site.name}, {stay}
            <BookingStatusBadge booking={booking} />
          </h1>
          <p className="text-muted-foreground">
            {nightsLabel(nights)} · {booking.guestName} ·{" "}
            {booking.source === "admin" ? "Phone booking" : "Booked online"}
          </p>
        </div>
        {canCancel && (
          <CancelBookingDialog
            bookingId={booking.id}
            summary={`${booking.guestName}, ${booking.site.name}, ${stay}`}
            pricePaid={paid ?? 0}
            paidOffline={booking.paidOffline}
            policy={policyRefund(booking)}
            guestEmail={booking.guestEmail}
          />
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Guest</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <Row label="Name">{booking.guestName}</Row>
              <Row label="Phone">
                <a href={`tel:${booking.guestPhone}`} className="underline">
                  {booking.guestPhone}
                </a>
              </Row>
              <Row label="Email">
                {booking.guestEmail ? (
                  <a
                    href={`mailto:${booking.guestEmail}`}
                    className="underline"
                  >
                    {booking.guestEmail}
                  </a>
                ) : (
                  "None"
                )}
              </Row>
              <Row label="Account">
                {booking.user
                  ? `${booking.user.name} (${booking.user.email})`
                  : "No account"}
              </Row>
              <Row label="People">{booking.partySize}</Row>
              {booking.notes && (
                <Row label="Notes">
                  <span className="whitespace-pre-line">{booking.notes}</span>
                </Row>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <Row label="Subtotal">
                {formatCents(booking.subtotal)} before tax
              </Row>
              <Row label="Paid">
                {paid === null
                  ? "Not paid"
                  : `${formatCents(paid)}${booking.paidOffline ? ", offline" : ", by card"}`}
              </Row>
              {booking.refundAmount !== null && (
                <Row label="Refunded">
                  {formatCents(booking.refundAmount)}
                  {booking.paidOffline && booking.refundAmount > 0
                    ? " (to hand back)"
                    : ""}
                </Row>
              )}
              {booking.cancelledAt && (
                <Row label="Cancelled">
                  {timestamp.format(booking.cancelledAt)}
                  {booking.cancelledBy === "guest"
                    ? " by the guest"
                    : " by an admin"}
                </Row>
              )}
              <Row label="Booked">{timestamp.format(booking.createdAt)}</Row>
              {booking.stripePaymentIntentId && (
                <Row label="Stripe payment">
                  <code className="text-xs">
                    {booking.stripePaymentIntentId}
                  </code>
                </Row>
              )}
              {booking.stripeRefundId && (
                <Row label="Stripe refund">
                  <code className="text-xs">{booking.stripeRefundId}</code>
                </Row>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Site</CardTitle>
            <CardDescription>
              {formatCents(booking.site.nightlyRate)} a night today, up to{" "}
              {booking.site.maxOccupancy} people
            </CardDescription>
          </CardHeader>
          <CardContent>
            {booking.site.features.length > 0 ? (
              <FeatureIcons features={booking.site.features} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No features listed for this site.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Office notes</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminNotesForm
              bookingId={booking.id}
              initial={booking.adminNotes}
            />
          </CardContent>
        </Card>
      </div>

      <SiteLocationMap sites={mapSites} siteId={booking.siteId} />

      <Card>
        <CardHeader>
          <CardTitle>Cancellation policy</CardTitle>
          <CardDescription>
            The terms this booking was made under. Later changes to the settings
            don't affect it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PolicyTable
            tiers={booking.cancellationTiers}
            checkIn={booking.checkIn}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default adminPage(AdminBookingPage);
