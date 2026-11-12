import { addDays, isDateString } from "@/lib/campground/dates";
import { CAMPSITE_FEATURES, type CampsiteFeature } from "@/lib/data/schema";

export type CampgroundSearch = {
  checkIn: string | null;
  checkOut: string | null;
  features: CampsiteFeature[];
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Read the stay and feature filter from the URL, dropping anything invalid. */
export function parseCampgroundSearch(params: RawParams): CampgroundSearch {
  const checkIn = first(params.checkIn);
  const checkOut = first(params.checkOut);
  const features = (first(params.features) ?? "")
    .split(",")
    .filter((f): f is CampsiteFeature =>
      (CAMPSITE_FEATURES as readonly string[]).includes(f),
    );
  return {
    checkIn: checkIn && isDateString(checkIn) ? checkIn : null,
    checkOut: checkOut && isDateString(checkOut) ? checkOut : null,
    features,
  };
}

/** Build a /campground (or other) URL with the given stay and filter. */
export function campgroundHref(
  path: string,
  search: Partial<CampgroundSearch> & { site?: string },
): string {
  const params = new URLSearchParams();
  if (search.site) params.set("site", search.site);
  if (search.checkIn) params.set("checkIn", search.checkIn);
  if (search.checkOut) params.set("checkOut", search.checkOut);
  if (search.features?.length)
    params.set("features", search.features.join(","));
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/**
 * The last date the calendar offers: a check-out no later than the season end,
 * and no later than the furthest allowed check-in plus the longest stay.
 */
export function lastSelectableDate(
  today: string,
  settings: {
    maxAdvanceDays: number;
    maxNights: number;
    seasonEnd: string | null;
  },
): string {
  const furthest = addDays(today, settings.maxAdvanceDays + settings.maxNights);
  return settings.seasonEnd && settings.seasonEnd < furthest
    ? settings.seasonEnd
    : furthest;
}

/** The first date the calendar offers: today, or the season start if later. */
export function firstSelectableDate(
  today: string,
  seasonStart: string | null,
): string {
  return seasonStart && seasonStart > today ? seasonStart : today;
}

/** Id of a site's row in the list; the map links to it with a URL hash. */
export const siteRowId = (siteId: string) => `site-${siteId}`;
