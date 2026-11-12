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
  generateBookingCancelledEmailHtml,
  generateBookingCancelledEmailText,
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
// and the guest can always see it on the site. Each sender returns whether
// the email went out, so admin screens can say when it did not.

/** Resend reports failures in its result rather than by throwing. */
async function send(email: Parameters<typeof sendEmail>[0]) {
  const { error } = await sendEmail(email);
  if (error) throw new Error(`${error.name}: ${error.message}`);
}

export async function sendBookingConfirmedEmail(
  booking: BookingWithSite,
): Promise<boolean> {
  if (!booking.guestEmail) return false;
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
      // Phone bookings for guests without an account have no page to visit.
      bookingUrl: booking.userId
        ? `${getBaseUrl()}/campground/bookings/${booking.id}`
        : null,
    };
    await send({
      to: booking.guestEmail,
      subject: `Booking confirmed: ${booking.site.name}, ${details.stay}`,
      text: generateBookingConfirmedEmailText(details),
      html: generateBookingConfirmedEmailHtml(details),
    });
    return true;
  } catch (err) {
    console.error(`Failed to send confirmation for booking ${booking.id}`, err);
    return false;
  }
}

export async function sendBookingUnavailableEmail(
  booking: BookingWithSite,
): Promise<boolean> {
  if (!booking.guestEmail) return false;
  try {
    const details = {
      guestName: booking.guestName,
      siteName: booking.site.name,
      stay: formatStayRange(booking.checkIn, booking.checkOut),
      refundAmount: formatCents(booking.refundAmount ?? 0),
      campgroundUrl: `${getBaseUrl()}/campground`,
    };
    await send({
      to: booking.guestEmail,
      subject: `Refund issued: ${booking.site.name} was no longer available`,
      text: generateBookingUnavailableEmailText(details),
      html: generateBookingUnavailableEmailHtml(details),
    });
    return true;
  } catch (err) {
    console.error(
      `Failed to send unavailable notice for booking ${booking.id}`,
      err,
    );
    return false;
  }
}

export async function sendBookingCancelledEmail(
  booking: BookingWithSite,
): Promise<boolean> {
  if (!booking.guestEmail) return false;
  try {
    const refund = booking.refundAmount ?? 0;
    const details = {
      guestName: booking.guestName,
      siteName: booking.site.name,
      stay: formatStayRange(booking.checkIn, booking.checkOut),
      refundAmount: formatCents(refund),
      hasRefund: refund > 0,
      refundToCard: booking.stripeRefundId !== null,
      campgroundUrl: `${getBaseUrl()}/campground`,
    };
    await send({
      to: booking.guestEmail,
      subject: `Booking cancelled: ${booking.site.name}, ${details.stay}`,
      text: generateBookingCancelledEmailText(details),
      html: generateBookingCancelledEmailHtml(details),
    });
    return true;
  } catch (err) {
    console.error(`Failed to send cancellation for booking ${booking.id}`, err);
    return false;
  }
}
