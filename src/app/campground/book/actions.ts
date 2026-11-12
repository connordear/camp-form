"use server";

import { requireAuth } from "@/lib/auth-helpers";
import { BookingError, createHold } from "@/lib/services/booking-service";
import {
  type BookingRequestData,
  bookingRequestSchema,
} from "@/lib/types/campground-schemas";

export type StartBookingResult =
  | { ok: true; bookingId: string; clientSecret: string }
  | { ok: false; error: string };

/** Hold the site and open a checkout for it. */
export async function startBooking(
  input: BookingRequestData,
): Promise<StartBookingResult> {
  const session = await requireAuth();

  const parsed = bookingRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check your booking details.",
    };
  }

  try {
    const result = await createHold(
      { id: session.user.id, email: session.user.email },
      parsed.data,
    );
    return { ok: true, ...result };
  } catch (err) {
    if (err instanceof BookingError) {
      return { ok: false, error: err.message };
    }
    console.error("Failed to start booking", err);
    return {
      ok: false,
      error: "Something went wrong starting your booking. Please try again.",
    };
  }
}
