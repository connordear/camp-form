"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { FeatureIcons } from "@/components/campground/feature-icons";
import {
  type Crop,
  cropToPoints,
  FULL_CROP,
} from "@/lib/campground/map-layout";
import { formatCents } from "@/lib/campground/money";
import { siteMarkerLabel } from "@/lib/campground/site-names";
import type { CampsiteFeature } from "@/lib/data/schema";
import { CAMPSITE_FEATURE_LABELS } from "@/lib/types/campground-schemas";
import { cn } from "@/lib/utils";

/** The illustrated background. Swap the file to change the drawing. */
export const MAP_IMAGE = "/campground/map.svg";
/** Width and height of the drawing's viewBox. Markers are placed by percent. */
const MAP_WIDTH = 1130;
const MAP_HEIGHT = 500;

export type MapSite = {
  id: string;
  name: string;
  features: readonly CampsiteFeature[];
  mapX: number | null;
  mapY: number | null;
  /** Cents per night. Spoken in the marker's name when given. */
  nightlyRate?: number;
};

/** Neutral before dates are picked; available or not once they are. */
export type MarkerState = "neutral" | "available" | "unavailable";

const STATE_WORDS: Record<MarkerState, string | null> = {
  neutral: null,
  available: "available",
  unavailable: "not available",
};

// The drawing has its own light background in both themes, so markers use
// fixed colours rather than theme tokens.
const STATE_STYLES: Record<MarkerState, string> = {
  neutral: "bg-white text-[#082616] border-[#082616]",
  available: "bg-[#15803d] text-white border-white",
  unavailable:
    "bg-stone-300 text-stone-600 border-stone-500 line-through decoration-2",
};

/** Diagonal hatching, so unavailable never relies on colour alone. */
const UNAVAILABLE_HATCH = {
  backgroundImage:
    "repeating-linear-gradient(135deg, rgb(0 0 0 / 0.12) 0 3px, transparent 3px 6px)",
};

export function markerAccessibleName(
  site: MapSite,
  state: MarkerState,
  note?: string,
): string {
  const parts = [site.name];
  if (site.nightlyRate !== undefined)
    parts.push(`${formatCents(site.nightlyRate)} a night`);
  parts.push(
    ...site.features.map((f) => CAMPSITE_FEATURE_LABELS[f].toLowerCase()),
  );
  const word = STATE_WORDS[state];
  if (word) parts.push(word);
  if (note) parts.push(note);
  return parts.join(", ");
}

const isPlaced = (s: MapSite): s is MapSite & { mapX: number; mapY: number } =>
  s.mapX !== null && s.mapY !== null;

interface SiteMapProps {
  sites: MapSite[];
  /** Marker state per site id. Missing means neutral. */
  states?: Record<string, MarkerState>;
  selectedId?: string | null;
  /** Highlighted from elsewhere, e.g. hovering the site's row in a list. */
  highlightedId?: string | null;
  /** Without it, markers are not interactive (a "where is it" map). */
  onSelect?: (id: string) => void;
  /** Hovering or focusing a marker, so a list can highlight its row. */
  onHover?: (id: string | null) => void;
  /** Markers drawn but not clickable, e.g. booked sites. */
  disabledIds?: ReadonlySet<string>;
  /** Sites drawn faintly, for reference. */
  fadedIds?: ReadonlySet<string>;
  /** Added to a faded marker's name, e.g. "doesn't match your filters". */
  fadedNote?: string;
  /**
   * "all" shows the whole drawing (it scrolls sideways on phones). "sites"
   * zooms to the area around the markers so it fits any width.
   */
  fit?: "all" | "sites";
  /** Show the site's name and features beside the hovered marker. */
  tooltip?: boolean;
  /** Escape, or a click on the map away from the markers. */
  onDismiss?: () => void;
  /** Drawn over the map, e.g. a hint to pick dates. */
  overlay?: ReactNode;
  /** Admin placement: a click on the map, in percent from left and top. */
  onMapClick?: (x: number, y: number) => void;
  /** Admin placement: arrow keys on the selected marker. */
  onNudge?: (id: string, dx: number, dy: number) => void;
  /** Describes the map for screen readers. */
  label: string;
  legend?: boolean;
  className?: string;
}

/**
 * The campground drawing with a marker per placed site. Markers sit at
 * `mapX`/`mapY` percent of the drawing, so it scales to any width. Sites
 * that have not been placed are left off.
 */
export function SiteMap({
  sites,
  states = {},
  selectedId = null,
  highlightedId = null,
  onSelect,
  onHover,
  disabledIds,
  fadedIds,
  fadedNote,
  fit = "all",
  tooltip = true,
  onDismiss,
  overlay,
  onMapClick,
  onNudge,
  label,
  legend = false,
  className,
}: SiteMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const placed = sites.filter(isPlaced);
  const scroller = useRef<HTMLDivElement>(null);
  const plane = useRef<HTMLDivElement>(null);

  const crop: Crop =
    fit === "sites"
      ? cropToPoints(placed.map((s) => ({ x: s.mapX, y: s.mapY })))
      : FULL_CROP;
  const aspect = `${crop.width * MAP_WIDTH} / ${crop.height * MAP_HEIGHT}`;

  const selected = placed.find((s) => s.id === selectedId);
  const tooltipId = tooltip ? (hoveredId ?? highlightedId ?? selectedId) : null;
  const tooltipSite = placed.find((s) => s.id === tooltipId);

  // On a narrow screen the whole drawing scrolls sideways. Start with the
  // selected site, or the middle of all the markers, in view.
  const focusX = (() => {
    if (fit !== "all") return null;
    if (selected) return selected.mapX;
    const xs = placed.map((s) => s.mapX);
    return xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : null;
  })();
  // biome-ignore lint/correctness/useExhaustiveDependencies: only on first render, so it never fights the guest's own scrolling
  useEffect(() => {
    const el = scroller.current;
    if (!el || focusX === null || el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft = (focusX / 100) * el.scrollWidth - el.clientWidth / 2;
  }, []);

  const handleMapClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Clicks on a marker select it.
    if (target.closest("[data-marker]")) return;
    if (onMapClick && plane.current) {
      const rect = plane.current.getBoundingClientRect();
      onMapClick(
        ((e.clientX - rect.left) / rect.width) * 100,
        ((e.clientY - rect.top) / rect.height) * 100,
      );
      return;
    }
    onDismiss?.();
  };

  const handleKeyDown = (e: KeyboardEvent, id: string) => {
    if (!onNudge) return;
    const step = e.shiftKey ? 5 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    onNudge(id, ...move);
  };

  const hover = (id: string | null) => {
    setHoveredId(id);
    onHover?.(id);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Escape clears the selection; the markers hold the focus
    <div
      className={cn("space-y-2", className)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && selectedId && onDismiss) {
          e.stopPropagation();
          onDismiss();
        }
      }}
    >
      <div
        ref={scroller}
        className={cn(
          "rounded-lg border",
          // The whole drawing keeps a usable size and scrolls sideways.
          fit === "all" ? "overflow-x-auto" : "overflow-hidden",
        )}
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions: placing by click is a pointer shortcut; markers also move with the arrow keys */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: see above; Escape clears the selection */}
        <div
          className={cn(
            "relative",
            // Wide enough that the 13 markers along the loop don't overlap.
            fit === "all" && "min-w-[820px]",
            onMapClick && "cursor-crosshair",
          )}
          style={{ aspectRatio: aspect }}
          onClick={handleMapClick}
        >
          <div
            ref={plane}
            className="absolute"
            style={{
              left: `${(-crop.x / crop.width) * 100}%`,
              top: `${(-crop.y / crop.height) * 100}%`,
              width: `${(100 / crop.width) * 100}%`,
              height: `${(100 / crop.height) * 100}%`,
            }}
          >
            {/* biome-ignore lint/performance/noImgElement: a static SVG; next/image adds nothing here */}
            <img
              src={MAP_IMAGE}
              alt={label}
              className="absolute inset-0 size-full select-none"
              draggable={false}
            />
            {placed.map((site) => {
              const state = states[site.id] ?? "neutral";
              const isSelected = site.id === selectedId;
              const isFaded = fadedIds?.has(site.id) ?? false;
              const isHighlighted =
                !isSelected &&
                (site.id === highlightedId || site.id === hoveredId);
              const name = markerAccessibleName(
                site,
                state,
                isFaded ? fadedNote : undefined,
              );
              const shape = cn(
                "absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold shadow-md transition-[transform,opacity]",
                STATE_STYLES[state],
                state === "unavailable" && "opacity-85",
                isSelected && "z-20 scale-110 ring-4 ring-amber-400",
                isHighlighted && "z-10 scale-110 ring-4 ring-amber-300/80",
                isFaded && "opacity-35 shadow-none",
              );
              const style = {
                left: `${site.mapX}%`,
                top: `${site.mapY}%`,
                ...(state === "unavailable" ? UNAVAILABLE_HATCH : {}),
              };
              const text = siteMarkerLabel(site.name);
              const pointer = {
                onMouseEnter: () => hover(site.id),
                onMouseLeave: () => hover(null),
              };

              return onSelect && !disabledIds?.has(site.id) ? (
                <button
                  key={site.id}
                  type="button"
                  data-marker
                  className={cn(
                    shape,
                    "cursor-pointer hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-500",
                  )}
                  style={style}
                  aria-label={name}
                  aria-pressed={isSelected}
                  onClick={() => onSelect(site.id)}
                  onKeyDown={(e) => handleKeyDown(e, site.id)}
                  onFocus={() => hover(site.id)}
                  onBlur={() => hover(null)}
                  {...pointer}
                >
                  {text}
                </button>
              ) : (
                <span
                  key={site.id}
                  data-marker
                  className={shape}
                  style={style}
                  role="img"
                  aria-label={
                    isSelected && !onSelect ? `${name} (this booking)` : name
                  }
                  {...(onSelect ? pointer : {})}
                >
                  {text}
                </span>
              );
            })}

            {tooltipSite && (
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute z-30 w-max max-w-56 -translate-x-1/2 rounded-md border bg-popover px-2.5 py-1.5 text-popover-foreground shadow-md",
                  tooltipSite.mapY > 25
                    ? "-translate-y-[calc(100%+22px)]"
                    : "translate-y-[22px]",
                )}
                style={{
                  left: `${tooltipSite.mapX}%`,
                  top: `${tooltipSite.mapY}%`,
                }}
              >
                <p className="text-sm font-medium">{tooltipSite.name}</p>
                {tooltipSite.features.length > 0 && (
                  <FeatureIcons
                    features={tooltipSite.features}
                    variant="compact"
                    className="mt-1"
                  />
                )}
              </div>
            )}
          </div>

          {overlay}
        </div>
      </div>

      {legend && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-3.5 rounded-full border-2",
                STATE_STYLES.available,
              )}
            />
            Available
          </li>
          <li className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-3.5 rounded-full border-2",
                STATE_STYLES.unavailable,
              )}
              style={UNAVAILABLE_HATCH}
            />
            Not available
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3.5 rounded-full border-2 border-[#082616] bg-white ring-2 ring-amber-400" />
            Selected
          </li>
          {fadedIds && fadedIds.size > 0 && fadedNote && (
            <li className="flex items-center gap-1.5">
              <span className="size-3.5 rounded-full border-2 border-[#082616] bg-white opacity-35" />
              {fadedNote[0].toUpperCase() + fadedNote.slice(1)}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
