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
  /** An admin has blocked nights on the site (they hold no booking). */
  hasBlockedNights: boolean;
}

export function SiteActionsMenu({
  site,
  bookingCount,
  hasBlockedNights,
}: SiteActionsMenuProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  // Mirrors the foreign keys that stop deleteSite.
  const deleteBlockedBy =
    bookingCount > 0
      ? "has bookings"
      : hasBlockedNights
        ? "has blocked nights"
        : null;
  const canDelete = deleteBlockedBy === null;

  const handleDuplicate = async () => {
    if (isDuplicating) return;
    setIsDuplicating(true);
    const toastId = toast.loading(`Duplicating ${site.name}...`);
    try {
      const result = await duplicateSite(site.id);
      if (result.ok) {
        toast.success(`Created ${result.data.name}`, { id: toastId });
      } else {
        toast.error(result.error, { id: toastId });
      }
    } catch {
      toast.error("Failed to duplicate site", { id: toastId });
    } finally {
      setIsDuplicating(false);
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
          <DropdownMenuItem disabled={isDuplicating} onSelect={handleDuplicate}>
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
            {canDelete ? "Delete" : `Delete (${deleteBlockedBy})`}
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
