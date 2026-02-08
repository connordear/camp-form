"use client";

import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFieldContext } from "@/hooks/use-camp-form";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  /** Earliest year in the dropdown (default: 120 years ago) */
  fromYear?: number;
  /** Latest year in the dropdown (default: current year) */
  toYear?: number;
  /** Placeholder text when no date is selected */
  placeholder?: string;
  /** Additional class names for the trigger button */
  className?: string;
};

const DATE_FORMAT = "yyyy-MM-dd";

export default function DatePicker({
  fromYear = new Date().getFullYear() - 120,
  toYear = new Date().getFullYear(),
  placeholder = "Pick a date",
  className,
}: DatePickerProps) {
  const field = useFieldContext<string | null>();

  // Parse string value to Date for the calendar
  const dateValue = field.state.value
    ? parse(field.state.value, DATE_FORMAT, new Date())
    : undefined;

  // Handle date selection - convert Date to string for form storage
  const handleSelect = (date: Date | undefined) => {
    if (date) {
      field.handleChange(format(date, DATE_FORMAT));
    } else {
      field.handleChange(null);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start px-2.5 font-normal",
            !field.state.value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {field.state.value ? field.state.value : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
          defaultMonth={dateValue}
          captionLayout="dropdown"
          fromYear={fromYear}
          toYear={toYear}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
