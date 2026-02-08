"use client";

import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DATE_FORMAT = "yyyy-MM-dd";

type DateRangePickerProps = {
  /** The form instance from useAppForm */
  // biome-ignore lint/suspicious/noExplicitAny: Form types are complex and vary by form instance
  form: any;
  /** Field name for the start date */
  startDateField: string;
  /** Field name for the end date */
  endDateField: string;
  /** Earliest year in the dropdown (default: 5 years ago) */
  fromYear?: number;
  /** Latest year in the dropdown (default: 10 years ahead) */
  toYear?: number;
  /** Additional class names for the trigger button */
  className?: string;
};

export default function DateRangePicker({
  form,
  startDateField,
  endDateField,
  fromYear = new Date().getFullYear() - 5,
  toYear = new Date().getFullYear() + 10,
  className,
}: DateRangePickerProps) {
  // Get initial values from form
  const initialStart = form.getFieldValue(startDateField) as string;
  const initialEnd = form.getFieldValue(endDateField) as string;

  // Use local state to track values and trigger re-renders
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: initialStart
      ? parse(initialStart, DATE_FORMAT, new Date())
      : undefined,
    to: initialEnd ? parse(initialEnd, DATE_FORMAT, new Date()) : undefined,
  });

  // Handle date selection - update both local state and form
  const handleSelect = (range: DateRange | undefined) => {
    setDateRange(range);

    if (range?.from) {
      form.setFieldValue(startDateField, format(range.from, DATE_FORMAT));
    } else {
      form.setFieldValue(startDateField, "");
    }
    if (range?.to) {
      form.setFieldValue(endDateField, format(range.to, DATE_FORMAT));
    } else {
      form.setFieldValue(endDateField, "");
    }
  };

  const formatDisplay = () => {
    if (dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, DATE_FORMAT)} - ${format(dateRange.to, DATE_FORMAT)}`;
    }
    if (dateRange?.from) {
      return format(dateRange.from, DATE_FORMAT);
    }
    return null;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start px-2.5 font-normal",
            !dateRange?.from && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDisplay() ?? <span>Pick a date range</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={handleSelect}
          defaultMonth={dateRange?.from}
          captionLayout="dropdown"
          fromYear={fromYear}
          toYear={toYear}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
