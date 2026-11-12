"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CAMPSITE_FEATURES, type CampsiteFeature } from "@/lib/data/schema";
import {
  CAMPSITE_FEATURE_ICONS,
  CAMPSITE_FEATURE_LABELS,
} from "@/lib/types/campground-schemas";
import { cn } from "@/lib/utils";

interface FeatureIconsProps {
  features: readonly CampsiteFeature[];
  /**
   * "labelled": icon and label side by side, for roomy layouts.
   * "compact": icons only, each with a tooltip and a screen-reader label.
   */
  variant?: "labelled" | "compact";
  /** Text size for "labelled"; "xs" for tight spots like map cards. */
  size?: "sm" | "xs";
  className?: string;
}

/**
 * One icon per feature, always in catalogue order so the same feature sits in
 * the same place on every site. Renders nothing for a site with no features.
 */
export function FeatureIcons({
  features,
  variant = "labelled",
  size = "sm",
  className,
}: FeatureIconsProps) {
  const ordered = CAMPSITE_FEATURES.filter((f) => features.includes(f));
  if (ordered.length === 0) return null;

  if (variant === "compact") {
    return (
      <ul
        className={cn("flex flex-wrap items-center gap-1.5", className)}
        aria-label="Features"
      >
        {ordered.map((feature) => {
          const Icon = CAMPSITE_FEATURE_ICONS[feature];
          const label = CAMPSITE_FEATURE_LABELS[feature];
          return (
            <li key={feature}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground"
                    // Focusable so keyboard users can reach the tooltip too.
                    // biome-ignore lint/a11y/noNoninteractiveTabindex: tooltip trigger
                    tabIndex={0}
                  >
                    <Icon className="size-4" aria-hidden />
                    <span className="sr-only">{label}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul
      className={cn(
        "flex flex-wrap items-center gap-y-1",
        size === "xs" ? "gap-x-2.5" : "gap-x-3",
        className,
      )}
      aria-label="Features"
    >
      {ordered.map((feature) => {
        const Icon = CAMPSITE_FEATURE_ICONS[feature];
        return (
          <li
            key={feature}
            className={cn(
              "inline-flex items-center gap-1 text-muted-foreground",
              size === "xs" ? "text-xs" : "text-sm",
            )}
          >
            <Icon
              className={size === "xs" ? "size-3.5" : "size-4"}
              aria-hidden
            />
            {CAMPSITE_FEATURE_LABELS[feature]}
          </li>
        );
      })}
    </ul>
  );
}
