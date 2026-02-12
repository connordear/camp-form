"use client";

import { CalendarIcon, PlusIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAdminYear } from "@/hooks/use-admin-year";

interface YearSelectorProps {
  availableYears: number[];
  collapsed?: boolean;
}

export function YearSelector({
  availableYears,
  collapsed = false,
}: YearSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentYear } = useAdminYear();
  const [isAddYearOpen, setIsAddYearOpen] = useState(false);
  const [newYear, setNewYear] = useState("");

  const currentYearValue = new Date().getFullYear();

  // Generate a list of years: available years + some future years
  const allYears = new Set([
    ...availableYears,
    currentYearValue,
    currentYearValue + 1,
  ]);
  const sortedYears = Array.from(allYears).sort((a, b) => b - a);

  const navigateToYear = (year: number) => {
    // Replace the year in the pathname: /admin/2025/registrations -> /admin/2026/registrations
    const newPath = pathname.replace(/^(\/admin\/)\d{4}/, `$1${year}`);
    router.push(newPath);
  };

  const handleValueChange = (value: string) => {
    if (value === "add-new") {
      setNewYear("");
      setIsAddYearOpen(true);
    } else {
      navigateToYear(parseInt(value, 10));
    }
  };

  const handleAddYear = () => {
    const parsed = parseInt(newYear, 10);
    if (!isNaN(parsed) && parsed >= 2000 && parsed <= 2100) {
      navigateToYear(parsed);
      setIsAddYearOpen(false);
    }
  };

  const selectTrigger = (
    <SelectTrigger
      className={collapsed ? "w-10 px-0 justify-center" : "w-[140px]"}
      hideChevron={collapsed}
    >
      <CalendarIcon className="size-4 shrink-0" />
      {!collapsed && <SelectValue placeholder="Select year" className="ml-1" />}
    </SelectTrigger>
  );

  return (
    <>
      <Select value={currentYear.toString()} onValueChange={handleValueChange}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>{selectTrigger}</TooltipTrigger>
            <TooltipContent side="right">Year: {currentYear}</TooltipContent>
          </Tooltip>
        ) : (
          selectTrigger
        )}
        <SelectContent>
          {sortedYears.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
              {!availableYears.includes(year) && (
                <span className="text-muted-foreground ml-1">(new)</span>
              )}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value="add-new">
            <PlusIcon className="size-4 mr-1" />
            Other year...
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={isAddYearOpen} onOpenChange={setIsAddYearOpen}>
        <DialogContent className="sm:max-w-[300px]">
          <DialogHeader>
            <DialogTitle>Go to year</DialogTitle>
            <DialogDescription>
              Enter a year to view camp data for that year.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="number"
              placeholder="e.g. 2027"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              min={2000}
              max={2100}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddYear();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddYearOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddYear}>Go</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
