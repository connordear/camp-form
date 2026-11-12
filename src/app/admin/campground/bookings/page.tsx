import { adminPage } from "@/lib/auth-helpers";
import { campgroundToday } from "@/lib/campground/dates";
import { getAllBookings } from "@/lib/services/booking-service";
import { BookingsList } from "./components/bookings-list";

// Read-only for now. Phase 3 adds the month grid, cancel and refund, phone
// bookings and blocked nights.
async function CampgroundBookingsPage() {
  const bookings = await getAllBookings();
  return <BookingsList bookings={bookings} today={campgroundToday()} />;
}

export default adminPage(CampgroundBookingsPage);
