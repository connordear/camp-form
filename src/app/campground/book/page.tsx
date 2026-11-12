import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
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
  stayCost,
} from "@/lib/campground/booking";
import { campgroundToday } from "@/lib/campground/dates";
import { formatCents } from "@/lib/campground/money";
import { validateStay } from "@/lib/campground/policy";
import { authPathWithRedirect } from "@/lib/redirect";
import { getAvailability } from "@/lib/services/booking-service";
import { getCampgroundSettings } from "@/lib/services/campground-service";
import { campgroundHref, parseCampgroundSearch } from "../search-params";
import { BookingFlow } from "./components/booking-flow";

export const metadata: Metadata = { title: "Book your campsite" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function Problem({ message, backHref }: { message: string; backHref: string }) {
  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8 space-y-4">
      <h1 className="text-2xl font-bold">Book your campsite</h1>
      <p role="alert">{message}</p>
      <Button variant="outline" asChild>
        <Link href={backHref}>
          <ArrowLeftIcon className="size-4" aria-hidden />
          Back to available sites
        </Link>
      </Button>
    </div>
  );
}

export default async function BookPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const search = parseCampgroundSearch(raw);
  const siteId = typeof raw.site === "string" ? raw.site : null;
  const backHref = campgroundHref("/campground", search);

  const session = await getSession();
  if (!session) {
    redirect(
      authPathWithRedirect(
        "/sign-in",
        campgroundHref("/campground/book", { ...search, site: siteId ?? "" }),
      ),
    );
  }

  if (!siteId || !search.checkIn || !search.checkOut) {
    return (
      <Problem
        message="Choose your dates and a site first."
        backHref={backHref}
      />
    );
  }

  const settings = await getCampgroundSettings();
  if (!settings.isBookingOpen) {
    return (
      <Problem
        message="Online booking isn't open right now."
        backHref={backHref}
      />
    );
  }

  const stay = validateStay(
    search.checkIn,
    search.checkOut,
    settings,
    campgroundToday(),
  );
  if (!stay.valid) return <Problem message={stay.error} backHref={backHref} />;

  const availability = await getAvailability(search.checkIn, search.checkOut, {
    ignorePendingOf: session.user.id,
  });
  const entry = availability.find((a) => a.site.id === siteId);
  if (!entry) {
    return (
      <Problem
        message="That site isn't available for booking."
        backHref={backHref}
      />
    );
  }
  if (entry.takenNights.length > 0) {
    return (
      <Problem
        message={`${entry.site.name} is already booked for some of those nights. Please choose another site or different dates.`}
        backHref={backHref}
      />
    );
  }

  const { site } = entry;
  const subtotal = stayCost(site.nightlyRate, stay.nights);

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8 space-y-6">
      <h1 className="text-3xl font-bold">Book {site.name}</h1>

      <div className="grid gap-6 md:grid-cols-[1fr_22rem] items-start">
        <Card>
          <CardHeader>
            <CardTitle>Your details</CardTitle>
            <CardDescription>
              We'll send the confirmation to {session.user.email}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BookingFlow
              siteId={site.id}
              checkIn={search.checkIn}
              checkOut={search.checkOut}
              maxOccupancy={site.maxOccupancy}
              defaultName={session.user.name ?? ""}
              backHref={backHref}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{site.name}</CardTitle>
              <CardDescription>
                {formatStayRange(search.checkIn, search.checkOut)},{" "}
                {nightsLabel(stay.nights)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <FeatureIcons features={site.features} />
              {site.description && (
                <p className="text-muted-foreground">{site.description}</p>
              )}
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-muted-foreground">Check-in</dt>
                <dd>From {formatClockTime(settings.checkInTime)}</dd>
                <dt className="text-muted-foreground">Check-out</dt>
                <dd>By {formatClockTime(settings.checkOutTime)}</dd>
                <dt className="text-muted-foreground">Rate</dt>
                <dd>
                  {formatCents(site.nightlyRate)} × {nightsLabel(stay.nights)}
                </dd>
                <dt className="font-medium">Subtotal</dt>
                <dd className="font-medium">
                  {formatCents(subtotal)}{" "}
                  <span className="text-muted-foreground font-normal">
                    plus tax
                  </span>
                </dd>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cancellation policy</CardTitle>
              <CardDescription>
                For this stay. Refunds are a share of the full amount paid, tax
                included.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <PolicyTable
                tiers={settings.cancellationTiers}
                checkIn={search.checkIn}
              />
              {settings.policyText && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {settings.policyText}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
