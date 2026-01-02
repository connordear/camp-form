"use client";

import { useStore } from "@tanstack/react-form";
import { AlertCircle, CheckCircle2, Cloud, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFormContext } from "@/hooks/use-camp-form";
import type { AppFormApi } from "@/lib/types/common-types";
import { cn } from "@/lib/utils";

export type AutoSaveStatus =
  | "idle"
  | "debouncing"
  | "saving"
  | "saved"
  | "error";
type SaveType = "draft" | "complete";

const Dot = ({ delay }: { delay: string }) => (
  <span
    className="inline-block h-1 w-1 animate-bounce rounded-full bg-blue-500"
    style={{ animationDuration: "0.6s", animationDelay: delay }}
  />
);

type AutoSaverProps<T> = {
  onSave: (values: T) => Promise<void>;
  debounceMs?: number;
};

export default function AutoSaver<T>({
  onSave,
  debounceMs = 1500,
}: AutoSaverProps<T>) {
  const form = useFormContext() as unknown as AppFormApi<T>;

  const values = useStore(form.store, (state) => state.values);
  const isDirty = useStore(form.store, (state) => state.isDirty);
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);
  const isValid = useStore(form.store, (state) => state.isValid); // <--- Watch Validity

  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [savedType, setSavedType] = useState<SaveType>("draft"); // <--- New State
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    if (!isDirty || isSubmitting) return;

    setStatus("debouncing");

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      try {
        setStatus("saving");

        await onSave(values as T);

        setLastSaved(new Date());
        // Determine type based on current validity
        setSavedType(isValid ? "complete" : "draft");
        setStatus("saved");

        form.reset(values as T);
      } catch (err) {
        console.error("Auto-save failed", err);
        setStatus("error");
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [values, isDirty, isSubmitting, isValid, debounceMs, onSave, form]);

  //if (status === "idle" && !lastSaved) return null;

  // --- UI RENDER ---

  const isComplete = savedType === "complete";

  return (
    <div className="flex items-center justify-end pointer-events-none">
      <div
        className={cn(
          "pointer-events-auto group flex h-8 items-center rounded-full border bg-white shadow-sm transition-all duration-500 ease-in-out",
          status === "error" ? "border-red-200" : "border-slate-200",
        )}
      >
        {/* TEXT LABEL */}
        <div className="max-w-0 overflow-hidden opacity-0 transition-all duration-500 ease-in-out group-hover:max-w-xs group-hover:opacity-100">
          <div className="pl-3 text-[10px] font-medium uppercase tracking-wide text-slate-500 whitespace-nowrap pr-1 flex items-center">
            <span className="pt-[1px]">
              {status === "debouncing" && "Waiting for edits"}
              {status === "saving" && "Syncing..."}
              {status === "error" && "Sync failed"}
            </span>
            {/* DIFFERENT TEXT FOR DRAFT vs COMPLETE */}
            {(status === "saved" || status === "idle") && (
              <span className="pt-[1px]">
                {isComplete ? "All changes saved " : "Draft saved "}
                {lastSaved && (
                  <span className="text-slate-400 normal-case">
                    {lastSaved.toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* ICON */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">
          {(status === "saved" || status === "idle") &&
            (isComplete ? (
              // COMPLETE: Solid Check or Double Check
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              // DRAFT: Cloud Icon or Hollow Check
              <Cloud className="h-3.5 w-3.5 text-slate-400" />
            ))}

          {status === "saving" && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
          )}

          {status === "debouncing" && (
            <div className="flex items-center space-x-0.5">
              <Dot delay="0s" />
              <Dot delay="0.1s" />
              <Dot delay="0.2s" />
            </div>
          )}

          {status === "error" && (
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          )}
        </div>
      </div>
    </div>
  );
}
