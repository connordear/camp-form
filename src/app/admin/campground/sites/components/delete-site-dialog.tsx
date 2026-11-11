"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Campsite } from "@/lib/services/campground-service";
import { deleteSite } from "../actions";

interface DeleteSiteDialogProps {
  site: Campsite;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Asks the admin to type the site's name before deleting it. */
export function DeleteSiteDialog({
  site,
  open,
  onOpenChange,
}: DeleteSiteDialogProps) {
  const inputId = useId();
  const [typed, setTyped] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const matches = typed.trim() === site.name.trim();

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTyped("");
      setCopied(false);
    }
    onOpenChange(next);
  };

  const copyName = async () => {
    try {
      await navigator.clipboard.writeText(site.name);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy. Select the name and copy it instead.");
    }
  };

  const handleDelete = async () => {
    if (!matches) return;
    setIsDeleting(true);
    const toastId = toast.loading("Deleting site...");
    try {
      await deleteSite(site.id);
      toast.success(`${site.name} deleted`, { id: toastId });
      handleOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete site",
        {
          id: toastId,
        },
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleDelete();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {site.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the site. It cannot be undone. To stop
              taking bookings but keep the site, turn off Active instead.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label
              htmlFor={inputId}
              className="flex flex-wrap items-center gap-1"
            >
              Type
              <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
                {site.name}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-5"
                  onClick={copyName}
                  aria-label={copied ? "Copied" : "Copy site name"}
                >
                  {copied ? (
                    <CheckIcon className="size-3.5" />
                  ) : (
                    <CopyIcon className="size-3.5" />
                  )}
                </Button>
              </span>
              to confirm
            </Label>
            <Input
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={!matches || isDeleting}
            >
              Delete site
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
