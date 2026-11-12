import { Badge } from "@/components/ui/badge";
import type { Booking } from "@/lib/services/booking-service";

/** What the guest should read for a booking's state. */
export function bookingStatusLabel(booking: Booking): string {
  switch (booking.status) {
    case "confirmed":
      return "Confirmed";
    case "pending":
      return "Awaiting payment";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return booking.refundAmount !== null ? "Refunded" : "Hold expired";
  }
}

export function BookingStatusBadge({ booking }: { booking: Booking }) {
  const label = bookingStatusLabel(booking);
  if (booking.status === "confirmed") {
    return <Badge className="bg-green-600 text-white">{label}</Badge>;
  }
  if (booking.status === "pending") {
    return <Badge variant="outline">{label}</Badge>;
  }
  return <Badge variant="secondary">{label}</Badge>;
}
