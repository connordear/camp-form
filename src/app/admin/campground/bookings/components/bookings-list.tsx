"use client";

import { CalendarDaysIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { BookingStatusBadge } from "@/components/campground/booking-status";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type BookingGroup,
  bookingGroup,
  formatStayRange,
  nightsLabel,
} from "@/lib/campground/booking";
import { CAMPGROUND_TIMEZONE, daysUntil } from "@/lib/campground/dates";
import { formatCents } from "@/lib/campground/money";
import type { AdminBooking } from "@/lib/services/booking-service";

type View = BookingGroup | "all";

const VIEWS: Array<{ value: View; label: string }> = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired holds" },
  { value: "all", label: "All" },
];

const bookedOn = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAMPGROUND_TIMEZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});

function matches(booking: AdminBooking, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return [
    booking.guestName,
    booking.guestEmail,
    booking.guestPhone,
    booking.user?.email,
    booking.site.name,
    booking.notes,
  ].some((v) => v?.toLowerCase().includes(q));
}

interface BookingsListProps {
  bookings: AdminBooking[];
  today: string;
}

export function BookingsList({ bookings, today }: BookingsListProps) {
  const [view, setView] = useState<View>("upcoming");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<View, number> = {
      upcoming: 0,
      past: 0,
      cancelled: 0,
      expired: 0,
      all: bookings.length,
    };
    for (const b of bookings) c[bookingGroup(b, today)]++;
    return c;
  }, [bookings, today]);

  const visible = useMemo(() => {
    const list = bookings.filter(
      (b) =>
        (view === "all" || bookingGroup(b, today) === view) &&
        matches(b, query.trim()),
    );
    // Upcoming reads best soonest first; everything else newest first.
    return view === "upcoming"
      ? [...list].sort((a, b) => a.checkIn.localeCompare(b.checkIn))
      : list;
  }, [bookings, today, view, query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Campsite bookings</h1>
        <p className="text-muted-foreground">
          Every online booking. Cancelling, refunds and phone bookings are
          coming; for now, refunds are made in the Stripe dashboard.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <ButtonGroup aria-label="Show bookings">
          {VIEWS.map((v) => (
            <Button
              key={v.value}
              variant={view === v.value ? "default" : "outline"}
              size="sm"
              aria-pressed={view === v.value}
              onClick={() => setView(v.value)}
            >
              {v.label}
              <span className="tabular-nums opacity-70">{counts[v.value]}</span>
            </Button>
          ))}
        </ButtonGroup>
        <div className="relative flex-1 min-w-56 max-w-sm">
          <SearchIcon
            className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search guest, phone, email or site"
            aria-label="Search bookings"
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarDaysIcon
              className="size-12 text-muted-foreground mb-4"
              aria-hidden
            />
            <p className="text-muted-foreground">
              {query
                ? "No bookings match that search."
                : "No bookings here yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0 gap-0 overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dates</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead className="text-right">People</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead>Booked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-medium">
                        {formatStayRange(b.checkIn, b.checkOut)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {nightsLabel(daysUntil(b.checkOut, b.checkIn))}
                      </div>
                    </TableCell>
                    <TableCell>{b.site.name}</TableCell>
                    <TableCell>
                      <div className="font-medium">{b.guestName}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.guestPhone}
                        {b.guestEmail && <> · {b.guestEmail}</>}
                      </div>
                      {b.notes && (
                        <div
                          className="text-xs text-muted-foreground line-clamp-2 max-w-xs"
                          title={b.notes}
                        >
                          “{b.notes}”
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {b.partySize}
                    </TableCell>
                    <TableCell>
                      <BookingStatusBadge booking={b} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">
                      {b.pricePaid !== null ? formatCents(b.pricePaid) : "—"}
                      {b.refundAmount !== null && (
                        <div className="text-xs text-muted-foreground">
                          Refunded {formatCents(b.refundAmount)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {bookedOn.format(b.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
