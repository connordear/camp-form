"use client";

import { TentIcon } from "lucide-react";
import type { CampWithYear } from "@/lib/services/camp-service";
import { AddCampDialog } from "./add-camp-dialog";
import { CampCard } from "./camp-card";

interface CampsListProps {
  camps: CampWithYear[];
  year: number;
}

export function CampsList({ camps, year }: CampsListProps) {
  const campsWithYear = camps.filter((camp) => camp.campYear !== null);
  const campsWithoutYear = camps.filter((camp) => camp.campYear === null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Camps</h1>
          <p className="text-muted-foreground">
            Manage camp configurations for {year}
          </p>
        </div>
        <AddCampDialog year={year} />
      </div>

      {camps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <TentIcon className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No camps yet</h3>
          <p className="text-muted-foreground mb-4">
            Get started by creating your first camp.
          </p>
          <AddCampDialog year={year} />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Camps configured for this year */}
          {campsWithYear.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-muted-foreground">
                Configured for {year} ({campsWithYear.length})
              </h2>
              <div className="grid gap-4">
                {campsWithYear.map((camp) => (
                  <CampCard key={camp.id} camp={camp} year={year} />
                ))}
              </div>
            </div>
          )}

          {/* Camps not configured for this year */}
          {campsWithoutYear.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-muted-foreground">
                Not configured for {year} ({campsWithoutYear.length})
              </h2>
              <p className="text-sm text-muted-foreground">
                These camps exist but don&apos;t have {year} pricing/dates set
                up yet.
              </p>
              <div className="grid gap-4">
                {campsWithoutYear.map((camp) => (
                  <CampCard key={camp.id} camp={camp} year={year} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
