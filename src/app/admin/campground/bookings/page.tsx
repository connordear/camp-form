import { adminPage } from "@/lib/auth-helpers";
import { parseMonthParam } from "@/lib/campground/calendar";
import { campgroundToday } from "@/lib/campground/dates";
import {
  getMonthGrid,
  getUpcomingBlocks,
} from "@/lib/services/booking-admin-service";
import { getAllBookings } from "@/lib/services/booking-service";
import { getAllSites } from "@/lib/services/campground-service";
import { BlockNightsDialog } from "./components/block-nights-dialog";
import { BlockedNights } from "./components/blocked-nights";
import { BookingsList } from "./components/bookings-list";
import { MonthGrid } from "./components/month-grid";
import { PhoneBookingDialog } from "./components/phone-booking-dialog";

type PageProps = { searchParams: Promise<{ month?: string }> };

async function CampgroundBookingsPage({ searchParams }: PageProps) {
  const today = campgroundToday();
  const month = parseMonthParam((await searchParams).month, today);
  // The grid releases lapsed holds first, so the list below is current too.
  const grid = await getMonthGrid(month);
  const [bookings, blocks, sites] = await Promise.all([
    getAllBookings(),
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

      <MonthGrid month={month} today={today} grid={grid} />
      <BookingsList bookings={bookings} today={today} />
      <BlockedNights ranges={blocks} />
    </div>
  );
}

export default adminPage(CampgroundBookingsPage);
