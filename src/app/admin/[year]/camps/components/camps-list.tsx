"use client";

import { CalendarIcon, TentIcon, UsersIcon } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CampWithYear } from "@/lib/services/camp-service";
import { AddCampDialog } from "./add-camp-dialog";
import { CampCard } from "./camp-card";

interface CampsListProps {
  camps: CampWithYear[];
  year: number;
}

export function CampsList({ camps, year }: CampsListProps) {
  const [selectedCampId, setSelectedCampId] = useState<string | null>(null);
  const selectedCamp = camps.find((c) => c.id === selectedCampId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {camps.map((camp) => (
            <button
              key={camp.id}
              onClick={() => setSelectedCampId(camp.id)}
              className="text-left p-4 rounded-lg border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold truncate">{camp.name}</h3>
                {camp.campYear ? (
                  <span className="shrink-0 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded-full">
                    Configured
                  </span>
                ) : (
                  <span className="shrink-0 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    Not configured
                  </span>
                )}
              </div>
              {camp.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {camp.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                {camp.campYear?.capacity && (
                  <span className="flex items-center gap-1">
                    <UsersIcon className="size-3" />
                    {camp.campYear.capacity}
                  </span>
                )}
                {camp.campYear?.startDate && camp.campYear?.endDate && (
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="size-3" />
                    {new Date(camp.campYear.startDate).toLocaleDateString()} -{" "}
                    {new Date(camp.campYear.endDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog
        open={!!selectedCampId}
        onOpenChange={(open) => !open && setSelectedCampId(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>{selectedCamp?.name ?? "Camp"}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 pb-6">
            {selectedCamp && <CampCard camp={selectedCamp} year={year} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
