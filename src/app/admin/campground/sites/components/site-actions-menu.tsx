"use client";

import {
  CopyPlusIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Campsite } from "@/lib/services/campground-service";
import { duplicateSite } from "../actions";
import { DeleteSiteDialog } from "./delete-site-dialog";
import { SiteDialog } from "./site-dialog";

interface SiteActionsMenuProps {
  site: Campsite;
  bookingCount: number;
}

export function SiteActionsMenu({ site, bookingCount }: SiteActionsMenuProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canDelete = bookingCount === 0;

  const handleDuplicate = async () => {
    const toastId = toast.loading(`Duplicating ${site.name}...`);
    try {
      const copy = await duplicateSite(site.id);
      toast.success(`Created ${copy.name}`, { id: toastId });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to duplicate site",
        { id: toastId },
      );
    }
  };

  return (
    <>
      {/* Non-modal, so the dialogs opened from it get focus and pointer events. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${site.name}`}
          >
            <EllipsisVerticalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleDuplicate}>
            <CopyPlusIcon />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={!canDelete}
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2Icon />
            {canDelete ? "Delete" : "Delete (has bookings)"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SiteDialog site={site} open={editOpen} onOpenChange={setEditOpen} />
      {canDelete && (
        <DeleteSiteDialog
          site={site}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />
      )}
    </>
  );
}
