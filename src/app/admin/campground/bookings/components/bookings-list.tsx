"use client";

import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
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
  BOOKINGS_PAGE_SIZE,
  type BookingListView,
  formatStayRange,
  nightsLabel,
} from "@/lib/campground/booking";
import { CAMPGROUND_TIMEZONE, daysUntil } from "@/lib/campground/dates";
import { formatCents } from "@/lib/campground/money";
import type { BookingsPage } from "@/lib/services/booking-admin-service";

const VIEWS: Array<{ value: BookingListView; label: string }> = [
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

interface BookingsListProps {
  bookings: BookingsPage;
  view: BookingListView;
  /** The search as the server applied it. */
  query: string;
}

export function BookingsList({ bookings, view, query }: BookingsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tableBox = useRef<HTMLDivElement>(null);
  const { counts, page, totalPages } = bookings;
  const visible = bookings.bookings;

  // Follow the URL (back button, links) unless the admin is mid-typing.
  useEffect(() => {
    if (!debounce.current) setSearch(query);
  }, [query]);
  useEffect(() => () => clearTimeout(debounce.current ?? undefined), []);

  // Each new page, tab or search starts at the top of the table.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reruns on purpose
  useEffect(() => {
    tableBox.current
      ?.querySelector("[data-slot=table-container]")
      ?.scrollTo({ top: 0 });
  }, [page, view, query]);

  /** Change the list's URL params, keeping the calendar month. */
  const navigate = (changes: { view?: string; q?: string; page?: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      const keep =
        value !== undefined &&
        value !== "" &&
        !(key === "view" && value === "upcoming") &&
        !(key === "page" && value === 1);
      if (keep) params.set(key, String(value));
      else params.delete(key);
    }
    // A new tab or search starts again at the first page.
    if (changes.page === undefined) params.delete("page");
    const qs = params.toString();
    startTransition(() =>
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }),
    );
  };

  const onSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(debounce.current ?? undefined);
    debounce.current = setTimeout(() => {
      debounce.current = null;
      navigate({ q: value.trim() });
    }, 300);
  };

  const first = (page - 1) * BOOKINGS_PAGE_SIZE + 1;
  const last = first + visible.length - 1;

  return (
    <section
      className="space-y-4"
      aria-labelledby="bookings-list-heading"
      aria-busy={isPending}
    >
      <h2 id="bookings-list-heading" className="text-lg font-semibold">
        All bookings
      </h2>

      <div className="flex flex-wrap items-center gap-4">
        <ButtonGroup aria-label="Show bookings">
          {VIEWS.map((v) => (
            <Button
              key={v.value}
              variant={view === v.value ? "default" : "outline"}
              size="sm"
              aria-pressed={view === v.value}
              onClick={() => navigate({ view: v.value })}
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
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
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
          {/* A fixed-height window, so paging never moves the pager and a
              page of 50 does not run down the screen. */}
          <CardContent
            ref={tableBox}
            className="p-0 [&>[data-slot=table-container]]:max-h-[min(36rem,70vh)]"
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_var(--border)] [&_tr]:border-b-0">
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
                      <Link
                        href={`/admin/campground/bookings/${b.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {formatStayRange(b.checkIn, b.checkOut)}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {nightsLabel(daysUntil(b.checkOut, b.checkIn))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {b.site.name}
                      {b.source === "admin" && (
                        <div className="text-xs text-muted-foreground">
                          Phone booking
                        </div>
                      )}
                    </TableCell>
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

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground tabular-nums">
            Showing {first} to {last} of {counts[view]}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label="Previous page"
              disabled={page <= 1 || isPending}
              onClick={() => navigate({ page: page - 1 })}
            >
              <ChevronLeftIcon className="size-4" aria-hidden />
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              aria-label="Next page"
              disabled={page >= totalPages || isPending}
              onClick={() => navigate({ page: page + 1 })}
            >
              <ChevronRightIcon className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
