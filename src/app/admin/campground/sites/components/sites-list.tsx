"use client";

import { MapPinIcon, PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { CAMPSITE_FEATURE_LABELS } from "@/lib/types/campground-schemas";
import { setSiteActive } from "../actions";
import { SiteDialog } from "./site-dialog";

interface SitesListProps {
  sites: Campsite[];
  bookingCounts: Record<string, number>;
}

function ActiveSwitch({ site }: { site: Campsite }) {
  const [isActive, setIsActive] = useState(site.isActive);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (checked: boolean) => {
    setIsSaving(true);
    setIsActive(checked);
    try {
      await setSiteActive({ id: site.id, isActive: checked });
      toast.success(
        checked ? `${site.name} activated` : `${site.name} deactivated`,
      );
    } catch (err) {
      setIsActive(!checked);
      toast.error(err instanceof Error ? err.message : "Failed to update site");
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

export function SitesList({ sites, bookingCounts }: SitesListProps) {
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
            Sites, types and nightly rates. Deactivated sites cannot be booked
            but keep their existing bookings.
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
        <Card>
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
                          <div className="flex flex-wrap gap-1">
                            {site.features.map((feature) => (
                              <Badge key={feature} variant="secondary">
                                {CAMPSITE_FEATURE_LABELS[feature]}
                              </Badge>
                            ))}
                          </div>
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
                        <SiteDialog
                          site={site}
                          canDelete={bookingCount === 0}
                          trigger={
                            <Button variant="outline" size="sm">
                              <PencilIcon className="size-4 mr-1" />
                              Edit
                            </Button>
                          }
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
