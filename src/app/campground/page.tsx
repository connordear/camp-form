import { CircleAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import { PolicyTable } from "@/components/campground/policy-table";
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
} from "@/lib/campground/booking";
import { campgroundToday, formatDisplayDate } from "@/lib/campground/dates";
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
import { type BrowserRow, SiteBrowser } from "./components/site-browser";
import {
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
  const browserRows: BrowserRow[] = rows.map(
    ({ site, takenNights, checked }) => ({
      site: {
        id: site.id,
        name: site.name,
        features: site.features,
        description: site.description,
        maxOccupancy: site.maxOccupancy,
        nightlyRate: site.nightlyRate,
        mapX: site.mapX,
        mapY: site.mapY,
      },
      takenNights,
      checked,
      matches: search.features.every((f) => site.features.includes(f)),
    }),
  );

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8 space-y-6">
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

        <SiteBrowser
          rows={browserRows}
          nights={nights}
          checkIn={search.checkIn}
          checkOut={search.checkOut}
          needsDates={settings.isBookingOpen && nights === null}
          filteredOut={rows.length > 0}
        />
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
