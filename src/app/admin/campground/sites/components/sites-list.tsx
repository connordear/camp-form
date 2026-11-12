"use client";

import { MapPinIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FeatureIcons } from "@/components/campground/feature-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/lib/campground/money";
import type { Campsite } from "@/lib/services/campground-service";
import { setSiteActive } from "../actions";
import { SiteActionsMenu } from "./site-actions-menu";
import { SiteDialog } from "./site-dialog";

interface SitesListProps {
  sites: Campsite[];
  bookingCounts: Record<string, number>;
  /** Ids of sites with nights an admin has blocked. */
  blockedSiteIds: string[];
}

function ActiveSwitch({ site }: { site: Campsite }) {
  const [isActive, setIsActive] = useState(site.isActive);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (checked: boolean) => {
    setIsSaving(true);
    setIsActive(checked);
    try {
      const result = await setSiteActive({ id: site.id, isActive: checked });
      if (!result.ok) {
        setIsActive(!checked);
        toast.error(result.error);
        return;
      }
      toast.success(
        checked ? `${site.name} activated` : `${site.name} deactivated`,
      );
    } catch {
      setIsActive(!checked);
      toast.error("Failed to update site");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Switch
      checked={isActive}
      onCheckedChange={handleChange}
      disabled={isSaving}
      aria-label={`${site.name} active`}
    />
  );
}

export function SitesList({
  sites,
  bookingCounts,
  blockedSiteIds,
}: SitesListProps) {
  const nextSortOrder =
    sites.reduce((max, s) => Math.max(max, s.sortOrder), 0) + 1;

  const addButton = (
    <SiteDialog
      defaultSortOrder={nextSortOrder}
      trigger={
        <Button>
          <PlusIcon className="size-4 mr-2" />
          Add Site
        </Button>
      }
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Campsites</h1>
          <p className="text-muted-foreground">
            Sites, features and nightly rates. Deactivated sites cannot be
            booked but keep their existing bookings.
          </p>
        </div>
        {addButton}
      </div>

      {sites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MapPinIcon className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No sites yet</h3>
            <p className="text-muted-foreground mb-4">
              Add the campground's sites to start taking bookings.
            </p>
            {addButton}
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0 gap-0 overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead className="text-right">Nightly rate</TableHead>
                  <TableHead className="text-right">Max people</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="sr-only">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => {
                  const bookingCount = bookingCounts[site.id] ?? 0;
                  return (
                    <TableRow
                      key={site.id}
                      className={!site.isActive ? "opacity-60" : undefined}
                    >
                      <TableCell>
                        <div className="font-medium">{site.name}</div>
                        {site.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                            {site.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {site.features.length === 0 ? (
                          <span className="text-muted-foreground">None</span>
                        ) : (
                          <FeatureIcons
                            features={site.features}
                            variant="compact"
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCents(site.nightlyRate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {site.maxOccupancy}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {bookingCount}
                      </TableCell>
                      <TableCell>
                        <ActiveSwitch key={String(site.isActive)} site={site} />
                      </TableCell>
                      <TableCell className="text-right">
                        <SiteActionsMenu
                          // Remount after a save so the edit form starts from the saved values.
                          key={site.updatedAt.toString()}
                          site={site}
                          bookingCount={bookingCount}
                          hasBlockedNights={blockedSiteIds.includes(site.id)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
