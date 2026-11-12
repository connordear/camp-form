import {
  describeDatedWindow,
  describeRefund,
  describeWindow,
  refundSchedule,
  refundWindows,
} from "@/lib/campground/policy";
import type { CancellationTier } from "@/lib/data/schema";

interface PolicyTableProps {
  tiers: CancellationTier[];
  /** With a check-in date, the windows show real dates. */
  checkIn?: string | null;
}

/** The cancellation policy as windows that never overlap. */
export function PolicyTable({ tiers, checkIn }: PolicyTableProps) {
  const rows: Array<[string, string]> = checkIn
    ? refundSchedule(tiers, checkIn).map((w) => [
        describeDatedWindow(w),
        describeRefund(w.refundPercent),
      ])
    : refundWindows(tiers).map((w) => [
        describeWindow(w),
        describeRefund(w.refundPercent),
      ]);

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
