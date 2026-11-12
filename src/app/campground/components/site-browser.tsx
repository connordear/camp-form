"use client";

import {
  CalendarIcon,
  ListIcon,
  MapIcon,
  TentIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { FeatureIcons } from "@/components/campground/feature-icons";
import {
  type MapSite,
  type MarkerState,
  SiteMap,
} from "@/components/campground/site-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { nightsLabel, stayCost } from "@/lib/campground/booking";
import { formatCents } from "@/lib/campground/money";
import type { CampsiteFeature } from "@/lib/data/schema";
import { cn } from "@/lib/utils";
import { campgroundHref, siteRowId } from "../search-params";

export type BrowserSite = {
  id: string;
  name: string;
  features: CampsiteFeature[];
  description: string | null;
  maxOccupancy: number;
  nightlyRate: number;
  mapX: number | null;
  mapY: number | null;
};

export type BrowserRow = {
  site: BrowserSite;
  takenNights: string[];
  /** Availability was looked up for the chosen dates. */
  checked: boolean;
  /** Has every feature in the filter. */
  matches: boolean;
};

interface SiteBrowserProps {
  rows: BrowserRow[];
  nights: number | null;
  checkIn: string | null;
  checkOut: string | null;
  /** Booking is open but no dates are chosen yet. */
  needsDates: boolean;
  /** There are sites, just none with every feature in the filter. */
  filteredOut: boolean;
}

const FADED_NOTE = "doesn't match your filters";

function isAvailable(row: BrowserRow) {
  return row.checked && row.takenNights.length === 0;
}

function markerState(row: BrowserRow): MarkerState {
  if (!row.checked) return "neutral";
  return isAvailable(row) ? "available" : "unavailable";
}

/**
 * The sites as a list and a map side by side on wide screens, or one at a
 * time behind a List / Map switch on phones. Choosing a site on the map
 * opens a card next to its marker (a sheet at the bottom on phones) and
 * highlights its row; the page itself never jumps. Hovering either one
 * highlights the other.
 */
export function SiteBrowser({
  rows,
  nights,
  checkIn,
  checkOut,
  needsDates,
  filteredOut,
}: SiteBrowserProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const listScroller = useRef<HTMLDivElement>(null);

  const listed = rows.filter((r) => r.matches);
  const hasMap = rows.some((r) => r.site.mapX !== null && r.site.mapY !== null);
  const selectedRow = rows.find((r) => r.site.id === selectedId) ?? null;

  const mapSites: MapSite[] = rows.map(({ site }) => ({
    id: site.id,
    name: site.name,
    features: site.features,
    mapX: site.mapX,
    mapY: site.mapY,
    nightlyRate: site.nightlyRate,
  }));
  const states = Object.fromEntries(
    rows.map((r) => [r.site.id, markerState(r)]),
  );
  const fadedIds = new Set(
    rows.filter((r) => !r.matches).map((r) => r.site.id),
  );
  // Booked sites and sites outside the filter can't be chosen on the map.
  const disabledIds = new Set(
    rows
      .filter((r) => !r.matches || markerState(r) === "unavailable")
      .map((r) => r.site.id),
  );

  /** Bring a row into view inside the list's own scroll box only. */
  const revealRow = (id: string) => {
    const box = listScroller.current;
    const row = document.getElementById(siteRowId(id));
    if (!box || !row || box.scrollHeight <= box.clientHeight) return;
    const b = box.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? "auto"
      : "smooth";
    if (r.top < b.top) box.scrollBy({ top: r.top - b.top - 4, behavior });
    else if (r.bottom > b.bottom)
      box.scrollBy({ top: r.bottom - b.bottom + 4, behavior });
  };

  const selectFromMap = (id: string) => {
    if (id === selectedId) {
      setSelectedId(null);
      return;
    }
    setSelectedId(id);
    revealRow(id);
  };

  /** A click on a row: select its pin, or clear it if already selected. */
  const selectFromList = (id: string) => {
    if (id === selectedId) {
      setSelectedId(null);
      return;
    }
    setSelectedId(id);
    // Phones show one view at a time, so go to the map and its sheet.
    if (!window.matchMedia("(min-width: 768px)").matches) setView("map");
  };

  const card = (row: BrowserRow, onClose: () => void) => (
    <SiteSummary
      row={row}
      nights={nights}
      checkIn={checkIn}
      checkOut={checkOut}
      needsDates={needsDates}
      onClose={onClose}
    />
  );

  const list =
    listed.length === 0 ? (
      <Card>
        <CardContent className="flex flex-col items-center py-10 text-center">
          <TentIcon
            className="size-10 text-muted-foreground mb-3"
            aria-hidden
          />
          <p className="text-muted-foreground">
            {filteredOut
              ? "No sites have all of those features. Try removing a filter."
              : "No sites are listed yet."}
          </p>
        </CardContent>
      </Card>
    ) : (
      <ul className="space-y-2">
        {listed.map((row) => (
          <SiteRow
            key={row.site.id}
            row={row}
            nights={nights}
            checkIn={checkIn}
            checkOut={checkOut}
            highlighted={
              row.site.id === selectedId || row.site.id === hoveredMarkerId
            }
            onHover={setHoveredRowId}
            selected={row.site.id === selectedId}
            onSelect={hasMap ? selectFromList : undefined}
          />
        ))}
      </ul>
    );

  if (!hasMap) return list;

  return (
    <div className="space-y-3">
      {/* Phones: one view at a time. */}
      <fieldset className="inline-flex rounded-lg bg-muted p-1 md:hidden">
        <legend className="sr-only">Show sites as</legend>
        {(
          [
            ["list", "List", ListIcon],
            ["map", "Map", MapIcon],
          ] as const
        ).map(([value, text, Icon]) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={view === value ? "secondary" : "ghost"}
            className={cn(view === value && "bg-background shadow-sm")}
            aria-pressed={view === value}
            onClick={() => setView(value)}
          >
            <Icon aria-hidden />
            {text}
          </Button>
        ))}
      </fieldset>

      <div className="md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-6">
        {/*
          Wide screens: the map sets the row's height and the list scrolls
          inside it, so both fit on screen and the page never has to move.
        */}
        <div className={cn(view === "map" && "hidden", "md:relative md:block")}>
          <div
            ref={listScroller}
            className="md:absolute md:inset-0 md:overflow-y-auto md:overscroll-contain md:p-1"
          >
            {list}
          </div>
        </div>

        <div
          className={cn(view === "list" && "hidden", "md:block md:self-start")}
        >
          <SiteMap
            fit="sites"
            sites={mapSites}
            states={states}
            selectedId={selectedId}
            highlightedId={hoveredRowId}
            onSelect={selectFromMap}
            onHover={setHoveredMarkerId}
            onDismiss={() => setSelectedId(null)}
            disabledIds={disabledIds}
            fadedIds={fadedIds}
            fadedNote={FADED_NOTE}
            tooltip={false}
            legend={!needsDates && rows.some((r) => r.checked)}
            overlay={
              needsDates && (
                <p className="pointer-events-none absolute top-2 left-2 z-10 flex items-center gap-1.5 rounded-full border bg-background/90 px-3 py-1 text-xs font-medium text-foreground shadow-sm">
                  <CalendarIcon className="size-3.5" aria-hidden />
                  Pick dates to see availability
                </p>
              )
            }
            label={
              needsDates
                ? "Map of the campground showing where each site is. The list has the same sites."
                : "Map of the campground. Each marker is a site, showing whether it is free for your dates. The list has the same sites."
            }
          />
        </div>
      </div>

      {/* Phones: the chosen site in a sheet along the bottom of the map. */}
      {view === "map" && selectedRow && (
        <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t bg-popover text-popover-foreground shadow-[0_-8px_24px_rgb(0_0_0/0.15)] animate-in slide-in-from-bottom duration-200 md:hidden">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted" />
          {card(selectedRow, () => setSelectedId(null))}
        </div>
      )}
    </div>
  );
}

interface SiteSummaryProps {
  row: BrowserRow;
  nights: number | null;
  checkIn: string | null;
  checkOut: string | null;
  needsDates: boolean;
  onClose: () => void;
}

/** What the map shows for the chosen site, beside its marker or in a sheet. */
function SiteSummary({
  row,
  nights,
  checkIn,
  checkOut,
  needsDates,
  onClose,
}: SiteSummaryProps) {
  const { site } = row;
  const available = isAvailable(row);
  return (
    <section aria-label={`${site.name} details`} className="space-y-1.5 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{site.name}</h3>
          <AvailabilityBadge row={row} nights={nights} />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-mt-1 -mr-1 size-7"
          aria-label="Close"
          onClick={onClose}
        >
          <XIcon aria-hidden />
        </Button>
      </div>
      <p className="text-sm">
        <span className="font-semibold">{formatCents(site.nightlyRate)}</span>
        <span className="text-muted-foreground"> / night</span>
        {nights !== null && (
          <span className="text-muted-foreground">
            {" "}
            · {formatCents(stayCost(site.nightlyRate, nights))} total
          </span>
        )}
      </p>
      <FeatureIcons features={site.features} size="xs" />
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <UsersIcon className="size-3.5" aria-hidden />
        Up to {site.maxOccupancy}{" "}
        {site.maxOccupancy === 1 ? "person" : "people"}
      </p>
      {available ? (
        <Button asChild size="sm" className="mt-1 w-full">
          <Link
            href={campgroundHref("/campground/book", {
              site: site.id,
              checkIn,
              checkOut,
            })}
          >
            Book {site.name}
          </Link>
        </Button>
      ) : needsDates ? (
        <p className="text-xs text-muted-foreground">
          Pick your dates above to book this site.
        </p>
      ) : null}
    </section>
  );
}

function AvailabilityBadge({
  row,
  nights,
}: {
  row: BrowserRow;
  nights: number | null;
}) {
  if (!row.checked) return null;
  if (isAvailable(row))
    return <Badge className="bg-green-600 text-white">Available</Badge>;
  return (
    <Badge variant="secondary">
      {row.takenNights.length === nights
        ? "Booked"
        : `Booked ${row.takenNights.length} of ${nights} nights`}
    </Badge>
  );
}

interface SiteRowProps {
  row: BrowserRow;
  nights: number | null;
  checkIn: string | null;
  checkOut: string | null;
  highlighted: boolean;
  onHover: (id: string | null) => void;
  selected: boolean;
  /** Without it (no map), the row isn't clickable. */
  onSelect?: (id: string) => void;
}

function SiteRow({
  row,
  nights,
  checkIn,
  checkOut,
  highlighted,
  onHover,
  selected,
  onSelect,
}: SiteRowProps) {
  const { site, checked } = row;
  const available = isAvailable(row);
  const placed = site.mapX !== null && site.mapY !== null;
  const selectable = onSelect && placed;
  return (
    <li
      id={siteRowId(site.id)}
      data-site-id={site.id}
      data-highlighted={highlighted || undefined}
      className={cn(
        "relative rounded-xl border bg-card p-3 text-card-foreground shadow-sm transition-colors",
        selectable && "cursor-pointer hover:bg-accent/40",
        checked && !available && "opacity-70",
        highlighted && "ring-2 ring-amber-400",
      )}
      onMouseEnter={() => onHover(site.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(site.id)}
      onBlur={() => onHover(null)}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
          {selectable ? (
            // Stretched over the whole row, so a click anywhere selects it.
            <button
              type="button"
              className="text-left after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-sky-500"
              aria-label={`Show ${site.name} on the map`}
              aria-pressed={selected}
              onClick={() => onSelect(site.id)}
            >
              {site.name}
            </button>
          ) : (
            site.name
          )}
          <AvailabilityBadge row={row} nights={nights} />
        </h3>
        <p className="shrink-0 whitespace-nowrap">
          <span className="font-semibold">{formatCents(site.nightlyRate)}</span>
          <span className="text-sm text-muted-foreground"> / night</span>
        </p>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <FeatureIcons features={site.features} size="xs" />
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <UsersIcon className="size-3.5" aria-hidden />
          Up to {site.maxOccupancy}{" "}
          {site.maxOccupancy === 1 ? "person" : "people"}
        </span>
      </div>
      {site.description && (
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
          {site.description}
        </p>
      )}
      {(nights !== null || available) && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {nights !== null &&
              `${formatCents(stayCost(site.nightlyRate, nights))} for ${nightsLabel(nights)} + tax`}
          </p>
          {available && (
            // Above the row's stretched button, so it stays clickable.
            <Button asChild size="sm" className="relative z-10 ml-auto">
              <Link
                href={campgroundHref("/campground/book", {
                  site: site.id,
                  checkIn,
                  checkOut,
                })}
                aria-label={`Book ${site.name}`}
              >
                Book
              </Link>
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
