import { AlertCircle, Check, Loader2 } from "lucide-react";
import type { AutoSaveStatus } from "@/app/registration/overview/use-auto-save-overview";
import { cn } from "@/lib/utils";

const Dot = ({ delay }: { delay: string }) => (
  <span
    className="inline-block h-1 w-1 animate-bounce rounded-full bg-blue-500"
    style={{ animationDuration: "0.6s", animationDelay: delay }}
  />
);

export default function AutoSaveIndicator({
  status,
  lastSaved,
}: {
  status: AutoSaveStatus;
  lastSaved: Date | null;
}) {
  if (status === "idle" && !lastSaved) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center justify-end">
      <div
        className={cn(
          // Base: Fixed height (32px), pill shape, shadow
          "group flex h-8 items-center rounded-full border bg-white shadow-sm transition-all duration-500 ease-in-out",
          // Hover: No width change here, we let the inner content push it
          status === "error" ? "border-red-200" : "border-gray-200",
        )}
      >
        {/* TEXT CONTAINER: Animates max-width for smooth slide reveal */}
        <div className="max-w-0 overflow-hidden opacity-0 transition-all duration-500 ease-in-out group-hover:max-w-xs group-hover:opacity-100">
          <div className="pl-3 text-[10px] font-medium uppercase tracking-wide text-gray-500 whitespace-nowrap">
            {status === "debouncing" && "Waiting for edits"}
            {status === "saving" && "Saving..."}
            {(status === "saved" || status === "idle") &&
              lastSaved &&
              `Saved ${lastSaved.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
            {status === "error" && "Error saving"}
          </div>
        </div>

        {/* ICON: Perfectly square/round container, fixed size */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">
          {/* STATE: Saved / Idle */}
          {(status === "saved" || status === "idle") && (
            <Check className="h-3.5 w-3.5 text-green-500" strokeWidth={3} />
          )}

          {/* STATE: Saving */}
          {status === "saving" && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
          )}

          {/* STATE: Debouncing */}
          {status === "debouncing" && (
            <div className="flex items-center space-x-0.5">
              <Dot delay="0s" />
              <Dot delay="0.1s" />
              <Dot delay="0.2s" />
            </div>
          )}

          {/* STATE: Error */}
          {status === "error" && (
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          )}
        </div>
      </div>
    </div>
  );
}
