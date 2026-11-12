import { adminPage } from "@/lib/auth-helpers";
import {
  bookingListSearch,
  parseBookingListParams,
} from "@/lib/campground/booking";
import { parseMonthParam } from "@/lib/campground/calendar";
import { campgroundToday } from "@/lib/campground/dates";
import {
  getBookingsPage,
  getMonthGrid,
  getUpcomingBlocks,
} from "@/lib/services/booking-admin-service";
import { getAllSites } from "@/lib/services/campground-service";
import { BlockNightsDialog } from "./components/block-nights-dialog";
import { BlockedNights } from "./components/blocked-nights";
import { BookingsList } from "./components/bookings-list";
import { MonthGrid } from "./components/month-grid";
import { PhoneBookingDialog } from "./components/phone-booking-dialog";

type PageProps = {
  searchParams: Promise<{
    month?: string;
    view?: string;
    q?: string;
    page?: string;
  }>;
};

async function CampgroundBookingsPage({ searchParams }: PageProps) {
  const today = campgroundToday();
  const params = await searchParams;
  const month = parseMonthParam(params.month, today);
  const list = parseBookingListParams(params);
  // The grid releases lapsed holds first, so the list below is current too.
  // The grid shows every booking in the month; only the list is paged.
  const grid = await getMonthGrid(month);
  const [bookings, blocks, sites] = await Promise.all([
    getBookingsPage(list, today),
    getUpcomingBlocks(today),
    getAllSites(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Campsite bookings</h1>
          <p className="text-muted-foreground">
            Click a booking to see its details, cancel or refund it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BlockNightsDialog sites={sites} />
          <PhoneBookingDialog sites={sites} />
        </div>
      </div>

      <MonthGrid
        month={month}
        today={today}
        grid={grid}
        keepParams={bookingListSearch({ ...list, page: bookings.page })}
      />
      <BookingsList bookings={bookings} view={list.view} query={list.query} />
      <BlockedNights ranges={blocks} />
    </div>
  );
}

export default adminPage(CampgroundBookingsPage);
