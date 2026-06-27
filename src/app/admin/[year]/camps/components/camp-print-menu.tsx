"use client";

import {
  ChevronDownIcon,
  FileTextIcon,
  HeartPulseIcon,
  Loader2Icon,
  PrinterIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CampPrintType } from "../actions";

type CampPrintMenuProps = {
  disabled?: boolean;
  loading?: boolean;
  onPrint: (type: CampPrintType) => void;
};

export function CampPrintMenu({
  disabled = false,
  loading = false,
  onPrint,
}: CampPrintMenuProps) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), 150);
  }

  function handlePrint(type: CampPrintType) {
    setOpen(false);
    onPrint(type);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || loading}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => {
            event.stopPropagation();
            if (event.pointerType === "mouse") {
              event.preventDefault();
            }
          }}
          onPointerEnter={(event) => {
            if (event.pointerType !== "mouse") return;
            clearCloseTimer();
            setOpen(true);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType !== "mouse") return;
            scheduleClose();
          }}
        >
          {loading ? (
            <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <PrinterIcon className="mr-1.5 size-3.5" />
          )}
          Print
          <ChevronDownIcon className="ml-1 size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(event) => event.stopPropagation()}
        onPointerEnter={clearCloseTimer}
        onPointerLeave={scheduleClose}
      >
        <DropdownMenuItem
          className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
          onSelect={() => handlePrint("registration")}
        >
          <FileTextIcon className="size-4" />
          Registration
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
          onSelect={() => handlePrint("medical")}
        >
          <HeartPulseIcon className="size-4" />
          Medical
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
