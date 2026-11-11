"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  addDays,
  campgroundToday,
  formatDisplayDate,
} from "@/lib/campground/dates";
import {
  describeDatedWindow,
  describeRefund,
  describeWindow,
  refundSchedule,
  refundWindows,
  validateTiers,
} from "@/lib/campground/policy";
import type { CancellationTier } from "@/lib/data/schema";

interface TierEditorProps {
  value: CancellationTier[];
  onChange: (tiers: CancellationTier[]) => void;
}

function numberOrNaN(value: string): number {
  return value === "" ? Number.NaN : Number(value);
}

function displayNumber(value: number): string | number {
  return Number.isNaN(value) ? "" : value;
}

/**
 * Edits the list of "N or more days before check-in refunds X%" tiers.
 * Rows stay in the order the admin entered them while editing; they are
 * sorted when saved.
 */
export function TierEditor({ value, onChange }: TierEditorProps) {
  const errors = validateTiers(value);
  const hasNaN = value.some(
    (t) => Number.isNaN(t.minDaysBefore) || Number.isNaN(t.refundPercent),
  );

  const updateTier = (index: number, patch: Partial<CancellationTier>) => {
    onChange(value.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const removeTier = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const addTier = () => {
    const lowest = value.reduce(
      (min, t) => Math.min(min, t.minDaysBefore),
      Number.POSITIVE_INFINITY,
    );
    const minDaysBefore = Number.isFinite(lowest) ? Math.max(0, lowest - 1) : 7;
    onChange([...value, { minDaysBefore, refundPercent: 0 }]);
  };

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((tier, index) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: rows have no stable id and are edited in place
              key={index}
              className="flex flex-wrap items-center gap-2 text-sm"
            >
              <span>Cancel</span>
              <Input
                type="number"
                min={0}
                step={1}
                className="w-20"
                aria-label="Days before check-in"
                value={displayNumber(tier.minDaysBefore)}
                onChange={(e) =>
                  updateTier(index, {
                    minDaysBefore: numberOrNaN(e.target.value),
                  })
                }
              />
              <span>or more days before check-in, refund</span>
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                className="w-20"
                aria-label="Refund percentage"
                value={displayNumber(tier.refundPercent)}
                onChange={(e) =>
                  updateTier(index, {
                    refundPercent: numberOrNaN(e.target.value),
                  })
                }
              />
              <span>%</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeTier(index)}
                aria-label="Remove tier"
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addTier}>
        <PlusIcon className="size-4 mr-1" />
        Add tier
      </Button>

      {hasNaN ? (
        <FieldError>
          Fill in every day and percentage, or remove the row.
        </FieldError>
      ) : errors.length > 0 ? (
        <FieldError>{errors.join(" ")}</FieldError>
      ) : (
        <PolicyPreview tiers={value} />
      )}
    </div>
  );
}

function PreviewTable({ rows }: { rows: Array<[string, string]> }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th className="font-medium pb-1 pr-4">When you cancel</th>
          <th className="font-medium pb-1">Refund</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([when, refund]) => (
          <tr key={when} className="border-t border-border/60">
            <td className="py-1.5 pr-4">{when}</td>
            <td className="py-1.5">{refund}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Shows the policy as guests will read it: once relative to check-in, and
 * once with real dates for an example stay a month from today.
 */
function PolicyPreview({ tiers }: { tiers: CancellationTier[] }) {
  const exampleCheckIn = addDays(campgroundToday(), 30);

  return (
    <div className="rounded-md bg-muted p-3 space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Guests will see:</p>
        <PreviewTable
          rows={refundWindows(tiers).map((w) => [
            describeWindow(w),
            describeRefund(w.refundPercent),
          ])}
        />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          On a booking checking in {formatDisplayDate(exampleCheckIn)}:
        </p>
        <PreviewTable
          rows={refundSchedule(tiers, exampleCheckIn).map((w) => [
            describeDatedWindow(w),
            describeRefund(w.refundPercent),
          ])}
        />
        <p className="text-xs text-muted-foreground">
          Days are counted by calendar date in campground time, so each day runs
          until midnight.
        </p>
      </div>
    </div>
  );
}
