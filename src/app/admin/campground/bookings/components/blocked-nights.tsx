"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatStayRange, nightsLabel } from "@/lib/campground/booking";
import { formatDisplayDate } from "@/lib/campground/dates";
import type { BlockedRangeWithSite } from "@/lib/services/booking-admin-service";
import { unblockSiteNights } from "../actions";

/** The nights themselves, e.g. "Jul 3, 2027" or "Jul 3 to 5, 2027". */
function nightsRange(r: BlockedRangeWithSite): string {
  const last = r.nights.at(-1) ?? r.from;
  return last === r.from
    ? formatDisplayDate(r.from)
    : formatStayRange(r.from, last);
}

function UnblockButton({ range }: { range: BlockedRangeWithSite }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      aria-label={`Unblock ${range.siteName}, ${nightsRange(range)}`}
      onClick={() =>
        startTransition(async () => {
          const result = await unblockSiteNights({
            siteId: range.siteId,
            from: range.from,
            to: range.to,
          });
          if (result.ok) toast.success("Nights unblocked");
          else toast.error(result.error);
        })
      }
    >
      Unblock
    </Button>
  );
}

/** Upcoming blocked nights, with a way to put them back on sale. */
export function BlockedNights({ ranges }: { ranges: BlockedRangeWithSite[] }) {
  return (
    <Card role="region" aria-labelledby="blocked-nights-heading">
      <CardHeader>
        <CardTitle className="text-lg">
          <h2 id="blocked-nights-heading">Blocked nights</h2>
        </CardTitle>
        <CardDescription>Nights taken off sale, from today on.</CardDescription>
      </CardHeader>
      <CardContent>
        {ranges.length === 0 ? (
          <p className="text-sm text-muted-foreground">No nights blocked.</p>
        ) : (
          <ul className="divide-y">
            {ranges.map((r) => (
              <li
                key={`${r.siteId}-${r.from}`}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <div className="text-sm">
                  <div className="font-medium">
                    {r.siteName}: {nightsRange(r)}
                  </div>
                  <div className="text-muted-foreground">
                    {nightsLabel(r.nights.length)} · {r.reason}
                  </div>
                </div>
                <UnblockButton range={r} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
