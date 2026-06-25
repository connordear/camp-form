"use client";

import { EyeIcon, Printer, TentIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CampWithYear } from "@/lib/services/camp-service";
import { AddCampDialog } from "./add-camp-dialog";
import { CampForm } from "./camp-form";
import { CampRegistrationsDialog } from "./camp-registrations-dialog";

type CampWithCounts = CampWithYear & {
  registeredCount: number;
  draftCount: number;
};

interface CampsListProps {
  camps: CampWithCounts[];
  year: number;
}

export function CampsList({ camps, year }: CampsListProps) {
  const [selectedCampId, setSelectedCampId] = useState<string | null>(null);
  const selectedCamp = camps.find((c) => c.id === selectedCampId);
  const [registrationsCampId, setRegistrationsCampId] = useState<string | null>(
    null,
  );
  const registrationsCamp = camps.find((c) => c.id === registrationsCampId);

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

      <Card className="p-0">
        <CardContent className="p-0 overflow-x-auto">
          <Table className="overflow-x-auto">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">
                  Description
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Capacity</TableHead>
                <TableHead className="hidden md:table-cell">Draft</TableHead>
                <TableHead className="hidden md:table-cell">
                  Registered
                </TableHead>
                <TableHead className="hidden lg:table-cell">Dates</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {camps.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <TentIcon className="size-8 text-muted-foreground mb-2" />
                      <p>
                        No camps yet. Create your first camp to get started.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                camps.map((camp) => (
                  <TableRow
                    key={camp.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedCampId(camp.id)}
                  >
                    <TableCell>
                      <span className="font-medium">{camp.name}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-xs">
                      <span className="text-muted-foreground line-clamp-1 block truncate">
                        {camp.description || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {camp.campYear ? (
                        <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded-full">
                          Configured
                        </span>
                      ) : (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          Not configured
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-muted-foreground">
                        {camp.campYear?.capacity ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-muted-foreground">
                        {camp.draftCount}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-muted-foreground">
                        {camp.registeredCount}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-muted-foreground">
                        {camp.campYear?.startDate && camp.campYear?.endDate
                          ? `${new Date(camp.campYear.startDate).toLocaleDateString()} - ${new Date(camp.campYear.endDate).toLocaleDateString()}`
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRegistrationsCampId(camp.id);
                          }}
                        >
                          <EyeIcon className="size-3.5 mr-1.5" />
                          View
                        </Button>
                        {camp.registeredCount > 0 && (
                          <a
                            href={`/admin/${year}/camps/${camp.id}/registrations-print`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border bg-background hover:bg-muted transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Printer className="size-3" />
                            Print
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedCampId}
        onOpenChange={(open) => !open && setSelectedCampId(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>{selectedCamp?.name ?? "Camp"}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 pb-6">
            {selectedCamp && <CampForm camp={selectedCamp} year={year} />}
          </div>
        </DialogContent>
      </Dialog>

      {registrationsCamp && (
        <CampRegistrationsDialog
          camp={{ id: registrationsCamp.id, name: registrationsCamp.name }}
          year={year}
          open={!!registrationsCampId}
          onOpenChange={(open) => !open && setRegistrationsCampId(null)}
        />
      )}
    </div>
  );
}
