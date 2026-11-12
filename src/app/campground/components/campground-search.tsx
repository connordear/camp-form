"use client";

import { format, parse } from "date-fns";
import { CalendarIcon, CheckIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatStayRange } from "@/lib/campground/booking";
import { CAMPSITE_FEATURES, type CampsiteFeature } from "@/lib/data/schema";
import {
  CAMPSITE_FEATURE_ICONS,
  CAMPSITE_FEATURE_LABELS,
} from "@/lib/types/campground-schemas";
import { cn } from "@/lib/utils";
import {
  campgroundHref,
  type CampgroundSearch as Search,
} from "../search-params";

const DATE_FORMAT = "yyyy-MM-dd";

// The calendar works in the browser's local time. Converting through the date
// string alone keeps the day the guest clicked, whatever their time zone.
const toLocalDate = (dateStr: string) =>
  parse(dateStr, DATE_FORMAT, new Date());
const toDateString = (date: Date) => format(date, DATE_FORMAT);

interface CampgroundSearchProps {
  search: Search;
  /** Today at the campground. */
  today: string;
  /** Last date a stay may start or end, from season and advance limits. */
  lastDate: string | null;
  /** First date a stay may start, from the season. */
  firstDate: string;
}

export function CampgroundSearch({
  search,
  today,
  firstDate,
  lastDate,
}: CampgroundSearchProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(
    search.checkIn
      ? {
          from: toLocalDate(search.checkIn),
          to: search.checkOut ? toLocalDate(search.checkOut) : undefined,
        }
      : undefined,
  );

  const go = (next: Search) =>
    startTransition(() =>
      router.replace(campgroundHref("/campground", next), { scroll: false }),
    );

  const handleSelect = (next: DateRange | undefined) => {
    setRange(next);
    if (next?.from && next.to && next.to > next.from) {
      setOpen(false);
      go({
        ...search,
        checkIn: toDateString(next.from),
        checkOut: toDateString(next.to),
      });
    }
  };

  const clearDates = () => {
    setRange(undefined);
    go({ ...search, checkIn: null, checkOut: null });
  };

  const toggleFeature = (feature: CampsiteFeature) => {
    const features = search.features.includes(feature)
      ? search.features.filter((f) => f !== feature)
      : CAMPSITE_FEATURES.filter(
          (f) => f === feature || search.features.includes(f),
        );
    go({ ...search, features });
  };

  const label =
    search.checkIn && search.checkOut
      ? formatStayRange(search.checkIn, search.checkOut)
      : "Choose your dates";

  return (
    <div className="space-y-4" aria-busy={isPending}>
      <div className="flex flex-wrap items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="lg"
              className={cn(
                "justify-start font-normal min-w-64",
                !search.checkIn && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="size-4" aria-hidden />
              {label}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={range}
              onSelect={handleSelect}
              numberOfMonths={isMobile ? 1 : 2}
              defaultMonth={range?.from ?? toLocalDate(firstDate)}
              startMonth={toLocalDate(today)}
              endMonth={lastDate ? toLocalDate(lastDate) : undefined}
              disabled={[
                { before: toLocalDate(firstDate) },
                ...(lastDate ? [{ after: toLocalDate(lastDate) }] : []),
              ]}
              autoFocus
            />
            <p className="px-3 pb-3 text-xs text-muted-foreground max-w-72">
              Pick your check-in day, then your check-out day.
            </p>
          </PopoverContent>
        </Popover>
        {search.checkIn && (
          <Button variant="ghost" size="sm" onClick={clearDates}>
            <XIcon className="size-4" aria-hidden />
            Clear dates
          </Button>
        )}
      </div>

      <fieldset>
        <legend className="text-sm font-medium mb-2">
          Only show sites with
        </legend>
        <div className="flex flex-wrap gap-2">
          {CAMPSITE_FEATURES.map((feature) => {
            const selected = search.features.includes(feature);
            const Icon = CAMPSITE_FEATURE_ICONS[feature];
            return (
              <Button
                key={feature}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                aria-pressed={selected}
                onClick={() => toggleFeature(feature)}
              >
                {selected ? (
                  <CheckIcon className="size-3.5" aria-hidden />
                ) : (
                  <Icon className="size-3.5" aria-hidden />
                )}
                {CAMPSITE_FEATURE_LABELS[feature]}
              </Button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
