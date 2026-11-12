import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatMonth,
  type GridSpan,
  gridSpans,
  monthDays,
  monthOf,
  shiftMonth,
} from "@/lib/campground/calendar";
import type {
  GridNight,
  MonthGrid as MonthGridData,
} from "@/lib/services/booking-admin-service";
import { cn } from "@/lib/utils";

const weekday = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  weekday: "narrow",
});

function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

const SITE_COL_REM = 7;
/** The narrowest a day gets before the grid scrolls sideways. */
const DAY_COL_REM = 2.25;

const isWeekend = (date: string) => [0, 6].includes(dayOfWeek(date));

/** Hatching for blocked nights, so they never rely on colour alone. */
const HATCH = {
  backgroundImage:
    "repeating-linear-gradient(135deg, var(--muted) 0 5px, transparent 5px 10px)",
};

function nightKey(night: GridNight): string {
  return night.kind === "booking"
    ? `b:${night.bookingId}`
    : `x:${night.reason}`;
}

function spanLabel(night: GridNight): string {
  if (night.kind === "block") return `Blocked: ${night.reason}`;
  const people = `${night.partySize} ${night.partySize === 1 ? "person" : "people"}`;
  const status = night.status === "pending" ? "awaiting payment" : "confirmed";
  return `${night.guestName}, ${people}, ${status}`;
}

function TakenCell({
  span,
}: {
  span: Extract<GridSpan<GridNight>, { kind: "taken" }>;
}) {
  const { item: night } = span;
  const label = spanLabel(night);
  const shape = cn(
    "flex h-8 items-center gap-1 overflow-hidden whitespace-nowrap rounded-md px-1.5 text-xs",
    span.continuesBefore && "rounded-l-none",
    span.continuesAfter && "rounded-r-none",
  );
  const text = (
    <>
      {span.continuesBefore && <span aria-hidden>‹</span>}
      <span className="truncate">
        {night.kind === "booking" ? night.guestName : night.reason}
      </span>
      {span.continuesAfter && (
        <span aria-hidden className="ml-auto">
          ›
        </span>
      )}
    </>
  );

  return (
    <td colSpan={span.days} className="border-b p-0.5">
      {night.kind === "booking" ? (
        <Link
          href={`/admin/campground/bookings/${night.bookingId}`}
          title={label}
          aria-label={label}
          className={cn(
            shape,
            "font-medium outline-offset-2 hover:opacity-90",
            night.status === "confirmed"
              ? "bg-primary text-primary-foreground dark:ring-1 dark:ring-white/25"
              : "border border-dashed border-foreground/50 bg-muted text-foreground",
          )}
        >
          {text}
        </Link>
      ) : (
        <div
          title={label}
          className={cn(shape, "border text-muted-foreground")}
          style={HATCH}
        >
          <span className="sr-only">Blocked: </span>
          {text}
        </div>
      )}
    </td>
  );
}

interface MonthGridProps {
  month: string;
  today: string;
  grid: MonthGridData;
}

/** Sites down the side, days across the top, bookings and blocks as bars. */
export function MonthGrid({ month, today, grid }: MonthGridProps) {
  const days = monthDays(month);
  const href = (m: string) => `/admin/campground/bookings?month=${m}`;
  const thisMonth = monthOf(today);

  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-lg">{formatMonth(month)}</CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" asChild>
            <Link
              href={href(shiftMonth(month, -1))}
              aria-label="Previous month"
            >
              <ChevronLeftIcon aria-hidden />
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={href(thisMonth)}>This month</Link>
          </Button>
          <Button variant="outline" size="icon-sm" asChild>
            <Link href={href(shiftMonth(month, 1))} aria-label="Next month">
              <ChevronRightIcon aria-hidden />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {grid.sites.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No sites yet. Add them under Sites.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            {/* Fixed layout keeps every day the same width, whatever the
                bars inside say. The days share the full width, and scroll
                sideways once they would get narrower than DAY_COL_REM. */}
            <table
              className="w-full table-fixed border-separate border-spacing-0 text-sm"
              style={{
                minWidth: `${SITE_COL_REM + days.length * DAY_COL_REM}rem`,
              }}
            >
              <colgroup>
                <col style={{ width: `${SITE_COL_REM}rem` }} />
                {days.map((d) => (
                  <col key={d} />
                ))}
              </colgroup>
              <caption className="sr-only">
                Bookings and blocked nights for {formatMonth(month)}, by site
              </caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-10 border-b border-r bg-card px-2 text-left font-medium"
                  >
                    Site
                  </th>
                  {days.map((d) => (
                    <th
                      key={d}
                      scope="col"
                      className={cn(
                        "border-b px-0 py-1 text-center text-xs font-normal",
                        isWeekend(d) && "bg-muted/60",
                        d === today && "text-primary dark:text-foreground",
                      )}
                    >
                      <div className="text-muted-foreground">
                        {weekday.format(new Date(`${d}T00:00:00Z`))}
                      </div>
                      <div
                        className={cn(
                          "mx-auto flex size-6 items-center justify-center rounded-full tabular-nums",
                          d === today &&
                            "bg-primary font-semibold text-primary-foreground dark:bg-primary-foreground dark:text-primary",
                        )}
                      >
                        {Number(d.slice(8))}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.sites.map((site) => {
                  const nights = new Map(
                    Object.entries(grid.nights[site.id] ?? {}),
                  );
                  return (
                    <tr key={site.id}>
                      <th
                        scope="row"
                        className="sticky left-0 z-10 truncate border-b border-r bg-card px-2 text-left font-medium"
                      >
                        {site.name}
                        {!site.isActive && (
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            (inactive)
                          </span>
                        )}
                      </th>
                      {gridSpans(days, nights, nightKey).map((span) =>
                        span.kind === "free" ? (
                          <td
                            key={span.date}
                            className={cn(
                              "h-9 border-b",
                              isWeekend(span.date) && "bg-muted/60",
                            )}
                          />
                        ) : (
                          <TakenCell key={span.start} span={span} />
                        ),
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-primary dark:ring-1 dark:ring-white/25" />
            Confirmed
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm border border-dashed border-foreground/50 bg-muted" />
            Awaiting payment
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm border" style={HATCH} />
            Blocked
          </li>
          <li>
            Bars run from the first night to the last; check-out is the next
            morning.
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
