"use client";

import { MapPinOffIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { SiteMap } from "@/components/campground/site-map";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { clampMapPercent } from "@/lib/campground/site-names";
import type { Campsite } from "@/lib/services/campground-service";
import { cn } from "@/lib/utils";
import { setSiteMapPosition } from "../actions";

type Position = { mapX: number | null; mapY: number | null };

/**
 * Place sites on the map: pick a site, then click where it is. Arrow keys
 * nudge the selected marker (Shift for bigger steps). Each change saves
 * straight away.
 */
export function MapPlacement({ sites }: { sites: Campsite[] }) {
  const [positions, setPositions] = useState<Record<string, Position>>(() =>
    Object.fromEntries(
      sites.map((s) => [s.id, { mapX: s.mapX, mapY: s.mapY }]),
    ),
  );
  const firstUnplaced = sites.find((s) => s.mapX === null)?.id;
  const [selectedId, setSelectedId] = useState<string | null>(
    firstUnplaced ?? sites[0]?.id ?? null,
  );
  // Saves in order, so a fast run of nudges ends where the marker shows.
  const saving = useRef(Promise.resolve());

  const save = (id: string, pos: Position) => {
    setPositions((p) => ({ ...p, [id]: pos }));
    saving.current = saving.current.then(async () => {
      try {
        await setSiteMapPosition({ id, ...pos });
      } catch {
        toast.error("Could not save the map position. Please try again.");
      }
    });
  };

  const selected = sites.find((s) => s.id === selectedId);
  const mapSites = sites.map((s) => ({ ...s, ...positions[s.id] }));
  const unplacedCount = sites.filter(
    (s) => positions[s.id]?.mapX === null,
  ).length;

  const place = (x: number, y: number) => {
    if (!selectedId) return;
    const wasPlaced = positions[selectedId]?.mapX !== null;
    save(selectedId, { mapX: clampMapPercent(x), mapY: clampMapPercent(y) });
    // Placing a new site moves on to the next one still to place.
    if (!wasPlaced) {
      const next = sites.find(
        (s) => s.id !== selectedId && positions[s.id]?.mapX === null,
      );
      if (next) setSelectedId(next.id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site map</CardTitle>
        <CardDescription>
          Pick a site, then click the map where it is. Use the arrow keys on a
          selected marker to fine-tune it (hold Shift for bigger steps). Guests
          see this map when booking.
          {unplacedCount > 0 &&
            ` ${unplacedCount} ${unplacedCount === 1 ? "site is" : "sites are"} not on the map yet.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <fieldset>
          <legend className="sr-only">Site to place</legend>
          <div className="flex flex-wrap gap-2">
            {sites.map((s) => {
              const isPlaced = positions[s.id]?.mapX !== null;
              return (
                <Button
                  key={s.id}
                  type="button"
                  size="sm"
                  variant={s.id === selectedId ? "default" : "outline"}
                  aria-pressed={s.id === selectedId}
                  className={cn(!isPlaced && "border-dashed")}
                  onClick={() => setSelectedId(s.id)}
                >
                  {s.name}
                  {!isPlaced && (
                    <span className="text-xs opacity-70">(not placed)</span>
                  )}
                </Button>
              );
            })}
          </div>
        </fieldset>

        <SiteMap
          sites={mapSites}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMapClick={place}
          onNudge={(id, dx, dy) => {
            const pos = positions[id];
            if (pos?.mapX == null || pos.mapY == null) return;
            save(id, {
              mapX: clampMapPercent(pos.mapX + dx),
              mapY: clampMapPercent(pos.mapY + dy),
            });
          }}
          fadedIds={
            new Set(sites.filter((s) => s.id !== selectedId).map((s) => s.id))
          }
          label={`Campground map. Click to place ${selected?.name ?? "the selected site"}.`}
        />

        {selected && positions[selected.id]?.mapX !== null && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => save(selected.id, { mapX: null, mapY: null })}
          >
            <MapPinOffIcon aria-hidden />
            Take {selected.name} off the map
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
