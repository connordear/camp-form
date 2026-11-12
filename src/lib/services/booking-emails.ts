import {
  formatClockTime,
  formatStayRange,
  nightsLabel,
} from "@/lib/campground/booking";
import { daysUntil } from "@/lib/campground/dates";
import { formatCents } from "@/lib/campground/money";
import {
  describeDatedWindow,
  describeRefund,
  refundSchedule,
} from "@/lib/campground/policy";
import {
  generateBookingConfirmedEmailHtml,
  generateBookingConfirmedEmailText,
  generateBookingUnavailableEmailHtml,
  generateBookingUnavailableEmailText,
  sendEmail,
} from "@/lib/email";
import type { BookingWithSite } from "@/lib/services/booking-service";
import { getCampgroundSettings } from "@/lib/services/campground-service";
import { getBaseUrl } from "@/lib/utils";

// Email failures are logged, never thrown: the booking itself has succeeded
// and the guest can always see it on the site.

export async function sendBookingConfirmedEmail(booking: BookingWithSite) {
  if (!booking.guestEmail) return;
  try {
    const settings = await getCampgroundSettings();
    const details = {
      guestName: booking.guestName,
      siteName: booking.site.name,
      stay: formatStayRange(booking.checkIn, booking.checkOut),
      nights: nightsLabel(daysUntil(booking.checkOut, booking.checkIn)),
      checkInTime: formatClockTime(settings.checkInTime),
      checkOutTime: formatClockTime(settings.checkOutTime),
      amountPaid: formatCents(booking.pricePaid ?? 0),
      // The booking's own snapshot, not today's settings.
      refundSchedule: refundSchedule(
        booking.cancellationTiers,
        booking.checkIn,
      ).map(
        (w) =>
          [describeDatedWindow(w), describeRefund(w.refundPercent)] as [
            string,
            string,
          ],
      ),
      policyText: settings.policyText,
      bookingUrl: `${getBaseUrl()}/campground/bookings/${booking.id}`,
    };
    await sendEmail({
      to: booking.guestEmail,
      subject: `Booking confirmed: ${booking.site.name}, ${details.stay}`,
      text: generateBookingConfirmedEmailText(details),
      html: generateBookingConfirmedEmailHtml(details),
    });
  } catch (err) {
    console.error(`Failed to send confirmation for booking ${booking.id}`, err);
  }
}

export async function sendBookingUnavailableEmail(booking: BookingWithSite) {
  if (!booking.guestEmail) return;
  try {
    const details = {
      guestName: booking.guestName,
      siteName: booking.site.name,
      stay: formatStayRange(booking.checkIn, booking.checkOut),
      refundAmount: formatCents(booking.refundAmount ?? 0),
      campgroundUrl: `${getBaseUrl()}/campground`,
    };
    await sendEmail({
      to: booking.guestEmail,
      subject: `Refund issued: ${booking.site.name} was no longer available`,
      text: generateBookingUnavailableEmailText(details),
      html: generateBookingUnavailableEmailHtml(details),
    });
  } catch (err) {
    console.error(
      `Failed to send unavailable notice for booking ${booking.id}`,
      err,
    );
  }
}
