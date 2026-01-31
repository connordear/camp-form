"use client";

import { TentIcon } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  // Auto-select first camp (prioritize configured camps)
  const defaultCampId = campsWithYear[0]?.id ?? campsWithoutYear[0]?.id ?? "";
  const [selectedCampId, setSelectedCampId] = useState<string>(defaultCampId);

  // Find the selected camp
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
        <div className="space-y-6">
          {/* Camp selector dropdown */}
          <div className="space-y-2">
            <label
              htmlFor="camp-selector"
              className="text-sm font-medium text-muted-foreground"
            >
              Select Camp
            </label>
            <Select value={selectedCampId} onValueChange={setSelectedCampId}>
              <SelectTrigger id="camp-selector" className="w-full max-w-md">
                <SelectValue placeholder="Select a camp..." />
              </SelectTrigger>
              <SelectContent>
                {campsWithYear.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Configured for {year}</SelectLabel>
                    {campsWithYear.map((camp) => (
                      <SelectItem key={camp.id} value={camp.id}>
                        {camp.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {campsWithoutYear.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Not configured for {year}</SelectLabel>
                    {campsWithoutYear.map((camp) => (
                      <SelectItem key={camp.id} value={camp.id}>
                        {camp.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selected camp card */}
          {selectedCamp && <CampCard camp={selectedCamp} year={year} />}
        </div>
      )}
    </div>
  );
}
