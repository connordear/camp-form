"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { FeatureIcons } from "@/components/campground/feature-icons";
import { siteMarkerLabel } from "@/lib/campground/site-names";
import type { CampsiteFeature } from "@/lib/data/schema";
import { CAMPSITE_FEATURE_LABELS } from "@/lib/types/campground-schemas";
import { cn } from "@/lib/utils";

/** The illustrated background. Swap the file to change the drawing. */
export const MAP_IMAGE = "/campground/map.svg";

export type MapSite = {
  id: string;
  name: string;
  features: readonly CampsiteFeature[];
  mapX: number | null;
  mapY: number | null;
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
): string {
  const parts = [
    site.name,
    ...site.features.map((f) => CAMPSITE_FEATURE_LABELS[f].toLowerCase()),
  ];
  const word = STATE_WORDS[state];
  if (word) parts.push(word);
  return parts.join(", ");
}

interface SiteMapProps {
  sites: MapSite[];
  /** Marker state per site id. Missing means neutral. */
  states?: Record<string, MarkerState>;
  selectedId?: string | null;
  /** Highlighted from elsewhere, e.g. hovering the site's row in a list. */
  highlightedId?: string | null;
  /** Without it, markers are not interactive (a "where is it" map). */
  onSelect?: (id: string) => void;
  /** Sites drawn faintly, for reference. */
  fadedIds?: ReadonlySet<string>;
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
  fadedIds,
  onMapClick,
  onNudge,
  label,
  legend = false,
  className,
}: SiteMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const placed = sites.filter((s) => s.mapX !== null && s.mapY !== null);
  const activeId = hoveredId ?? highlightedId ?? selectedId;
  const active = placed.find((s) => s.id === activeId);
  const scroller = useRef<HTMLDivElement>(null);

  // On a narrow screen the map scrolls sideways. Start with the selected
  // site, or the middle of all the markers, in view.
  const focusX = (() => {
    const chosen = placed.find((s) => s.id === selectedId);
    if (chosen?.mapX != null) return chosen.mapX;
    const xs = placed.map((s) => s.mapX as number);
    return xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : null;
  })();
  // biome-ignore lint/correctness/useExhaustiveDependencies: only on first render, so it never fights the guest's own scrolling
  useEffect(() => {
    const el = scroller.current;
    if (!el || focusX === null || el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft = (focusX / 100) * el.scrollWidth - el.clientWidth / 2;
  }, []);

  const handleMapClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!onMapClick) return;
    // Clicks on a marker select it rather than placing.
    if ((e.target as HTMLElement).closest("[data-marker]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onMapClick(
      ((e.clientX - rect.left) / rect.width) * 100,
      ((e.clientY - rect.top) / rect.height) * 100,
    );
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

  return (
    <div className={cn("space-y-2", className)}>
      {/* On narrow screens the map keeps a usable size and scrolls sideways. */}
      <div ref={scroller} className="overflow-x-auto rounded-lg border">
        {/* biome-ignore lint/a11y/noStaticElementInteractions: placing by click is a pointer shortcut; markers also move with the arrow keys */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: see above */}
        <div
          className={cn(
            "relative aspect-[5/3] min-w-[560px]",
            onMapClick && "cursor-crosshair",
          )}
          onClick={handleMapClick}
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
            const isHighlighted =
              !isSelected &&
              (site.id === highlightedId || site.id === hoveredId);
            const name = markerAccessibleName(site, state);
            const shape = cn(
              "absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold shadow-md transition-transform",
              STATE_STYLES[state],
              state === "unavailable" && "opacity-85",
              isSelected && "z-20 scale-110 ring-4 ring-amber-400",
              isHighlighted && "z-10 ring-4 ring-amber-300/80",
              fadedIds?.has(site.id) && "opacity-40",
            );
            const style = {
              left: `${site.mapX}%`,
              top: `${site.mapY}%`,
              ...(state === "unavailable" ? UNAVAILABLE_HATCH : {}),
            };
            const text = siteMarkerLabel(site.name);
            const hover = {
              onMouseEnter: () => setHoveredId(site.id),
              onMouseLeave: () => setHoveredId(null),
              onFocus: () => setHoveredId(site.id),
              onBlur: () => setHoveredId(null),
            };

            return onSelect ? (
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
                {...hover}
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
                aria-label={isSelected ? `${name} (this booking)` : name}
              >
                {text}
              </span>
            );
          })}

          {active && active.mapX !== null && active.mapY !== null && (
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute z-30 w-max max-w-56 -translate-x-1/2 rounded-md border bg-popover px-2.5 py-1.5 text-popover-foreground shadow-md",
                active.mapY > 25
                  ? "-translate-y-[calc(100%+22px)]"
                  : "translate-y-[22px]",
              )}
              style={{ left: `${active.mapX}%`, top: `${active.mapY}%` }}
            >
              <p className="text-sm font-medium">{active.name}</p>
              {active.features.length > 0 && (
                <FeatureIcons
                  features={active.features}
                  variant="compact"
                  className="mt-1"
                />
              )}
            </div>
          )}
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
        </ul>
      )}
    </div>
  );
}
