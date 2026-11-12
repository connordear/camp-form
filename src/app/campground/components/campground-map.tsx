"use client";

import { useEffect, useState } from "react";
import {
  type MapSite,
  type MarkerState,
  SiteMap,
} from "@/components/campground/site-map";
import { siteRowId } from "../search-params";

const HASH_PREFIX = "#site-";


function selectedFromHash(): string | null {
  return window.location.hash.startsWith(HASH_PREFIX)
    ? decodeURIComponent(window.location.hash.slice(HASH_PREFIX.length))
    : null;
}

interface CampgroundMapProps {
  sites: MapSite[];
  states: Record<string, MarkerState>;
  hasDates: boolean;
}

/**
 * The site map on the availability page. It shares one selection with the
 * site list through the URL hash: clicking a marker jumps to and highlights
 * that site's row, and hovering or focusing a row highlights its marker.
 */
export function CampgroundMap({ sites, states, hasDates }: CampgroundMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setSelectedId(selectedFromHash());
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  // Follow the list without making it a client component.
  useEffect(() => {
    const rowSite = (e: Event) =>
      (e.target as HTMLElement | null)
        ?.closest<HTMLElement>("[data-site-id]")
        ?.getAttribute("data-site-id") ?? null;
    const enter = (e: Event) => {
      const id = rowSite(e);
      if (id) setHighlightedId(id);
    };
    const leave = (e: Event) => {
      if (rowSite(e)) setHighlightedId(null);
    };
    document.addEventListener("pointerover", enter);
    document.addEventListener("pointerout", leave);
    document.addEventListener("focusin", enter);
    document.addEventListener("focusout", leave);
    return () => {
      document.removeEventListener("pointerover", enter);
      document.removeEventListener("pointerout", leave);
      document.removeEventListener("focusin", enter);
      document.removeEventListener("focusout", leave);
    };
  }, []);

  const select = (id: string) => {
    const row = document.getElementById(siteRowId(id));
    // Setting the hash scrolls to the row and lets CSS :target highlight it.
    window.location.hash = siteRowId(id);
    setSelectedId(id);
    row?.focus({ preventScroll: true });
  };

  return (
    <SiteMap
      sites={sites}
      states={states}
      selectedId={selectedId}
      highlightedId={highlightedId}
      onSelect={select}
      legend={hasDates}
      label={
        hasDates
          ? "Map of the campground. Each marker is a site, showing whether it is free for your dates. The list below has the same sites."
          : "Map of the campground showing where each site is. The list below has the same sites."
      }
    />
  );
}
