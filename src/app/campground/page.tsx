import { CircleAlertIcon, TentIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FeatureIcons } from "@/components/campground/feature-icons";
import { PolicyTable } from "@/components/campground/policy-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatClockTime,
  formatStayRange,
  nightsLabel,
  stayCost,
} from "@/lib/campground/booking";
import { campgroundToday, formatDisplayDate } from "@/lib/campground/dates";
import { formatCents } from "@/lib/campground/money";
import { validateStay } from "@/lib/campground/policy";
import {
  getAvailability,
  type SiteAvailability,
} from "@/lib/services/booking-service";
import {
  getActiveSites,
  getCampgroundSettings,
} from "@/lib/services/campground-service";
import { CampgroundSearch } from "./components/campground-search";
import {
  campgroundHref,
  firstSelectableDate,
  lastSelectableDate,
  parseCampgroundSearch,
} from "./search-params";

export const metadata: Metadata = { title: "Campground booking" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CampgroundPage({ searchParams }: PageProps) {
  const search = parseCampgroundSearch(await searchParams);
  const settings = await getCampgroundSettings();
  const today = campgroundToday();

  const hasDates = !!(search.checkIn && search.checkOut);
  const stay = hasDates
    ? validateStay(
        search.checkIn as string,
        search.checkOut as string,
        settings,
        today,
      )
    : null;
  const nights = stay?.valid ? stay.nights : null;

  // Availability is only looked up for a valid stay while booking is open.
  const rows: Array<SiteAvailability & { checked: boolean }> =
    settings.isBookingOpen && nights !== null
      ? (
          await getAvailability(
            search.checkIn as string,
            search.checkOut as string,
          )
        ).map((r) => ({ ...r, checked: true }))
      : (await getActiveSites()).map((site) => ({
          site,
          takenNights: [],
          checked: false,
        }));

  const visible = rows.filter((r) =>
    search.features.every((f) => r.site.features.includes(f)),
  );
  const availableCount = visible.filter(
    (r) => r.checked && r.takenNights.length === 0,
  ).length;

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Book a campsite</h1>
        <p className="text-muted-foreground">
          Choose your dates to see which sites are free. Check-in from{" "}
          {formatClockTime(settings.checkInTime)}, check-out by{" "}
          {formatClockTime(settings.checkOutTime)}.
          {settings.seasonStart && settings.seasonEnd && (
            <>
              {" "}
              The season runs {formatDisplayDate(settings.seasonStart)} to{" "}
              {formatDisplayDate(settings.seasonEnd)}.
            </>
          )}
        </p>
      </div>

      {!settings.isBookingOpen && (
        <Card className="border-amber-500/50">
          <CardContent className="flex gap-3 items-start">
            <CircleAlertIcon
              className="size-5 text-amber-500 shrink-0 mt-0.5"
              aria-hidden
            />
            <p>
              Online booking isn't open yet. You can still look at the sites
              below. Please check back soon.
            </p>
          </CardContent>
        </Card>
      )}

      {settings.isBookingOpen && (
        <CampgroundSearch
          search={search}
          today={today}
          firstDate={firstSelectableDate(today, settings.seasonStart)}
          lastDate={lastSelectableDate(today, settings)}
        />
      )}

      {stay && !stay.valid && (
        <p role="alert" className="text-destructive">
          {stay.error}
        </p>
      )}

      <section aria-labelledby="sites-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="sites-heading" className="text-xl font-semibold">
            {nights !== null && search.checkIn && search.checkOut
              ? `Sites for ${formatStayRange(search.checkIn, search.checkOut)}`
              : "Our sites"}
          </h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {nights !== null && settings.isBookingOpen
              ? `${availableCount} of ${visible.length} ${visible.length === 1 ? "site" : "sites"} available, ${nightsLabel(nights)}`
              : `${visible.length} ${visible.length === 1 ? "site" : "sites"}`}
          </p>
        </div>

        {visible.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-10 text-center">
              <TentIcon
                className="size-10 text-muted-foreground mb-3"
                aria-hidden
              />
              <p className="text-muted-foreground">
                {rows.length === 0
                  ? "No sites are listed yet."
                  : "No sites have all of those features. Try removing a filter."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {visible.map(({ site, takenNights, checked }) => {
              const available = checked && takenNights.length === 0;
              return (
                <li key={site.id}>
                  <Card
                    className={checked && !available ? "opacity-70" : undefined}
                  >
                    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {site.name}
                          {checked &&
                            (available ? (
                              <Badge className="bg-green-600 text-white">
                                Available
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                {takenNights.length === nights
                                  ? "Booked"
                                  : `Booked ${takenNights.length} of ${nights} nights`}
                              </Badge>
                            ))}
                        </CardTitle>
                        <FeatureIcons features={site.features} />
                        {site.description && (
                          <CardDescription>{site.description}</CardDescription>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Up to {site.maxOccupancy}{" "}
                          {site.maxOccupancy === 1 ? "person" : "people"}
                        </p>
                      </div>
                      <div className="text-right space-y-2">
                        <p>
                          <span className="font-semibold">
                            {formatCents(site.nightlyRate)}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            / night
                          </span>
                        </p>
                        {nights !== null && (
                          <p className="text-sm text-muted-foreground">
                            {formatCents(stayCost(site.nightlyRate, nights))}{" "}
                            for {nightsLabel(nights)}, plus tax
                          </p>
                        )}
                        {available && (
                          <Button asChild>
                            <Link
                              href={campgroundHref("/campground/book", {
                                site: site.id,
                                checkIn: search.checkIn,
                                checkOut: search.checkOut,
                              })}
                              aria-label={`Book ${site.name}`}
                            >
                              Book
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Cancellation policy</CardTitle>
          <CardDescription>
            Refunds are a share of the full amount paid, tax included.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <PolicyTable
            tiers={settings.cancellationTiers}
            checkIn={nights !== null ? search.checkIn : null}
          />
          {settings.policyText && (
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {settings.policyText}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
