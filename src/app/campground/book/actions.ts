"use server";

import { type ActionResult, failure } from "@/lib/action-result";
import { requireAuth } from "@/lib/auth-helpers";
import { createHold, type HoldResult } from "@/lib/services/booking-service";
import {
  type BookingRequestData,
  bookingRequestSchema,
} from "@/lib/types/campground-schemas";

/** Hold the site and open a checkout for it. */
export async function startBooking(
  input: BookingRequestData,
): Promise<ActionResult<HoldResult>> {
  const session = await requireAuth();

  const parsed = bookingRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check your booking details.",
    };
  }

  try {
    const hold = await createHold(
      { id: session.user.id, email: session.user.email },
      parsed.data,
    );
    return { ok: true, data: hold };
  } catch (err) {
    return failure(
      err,
      "Something went wrong starting your booking. Please try again.",
    );
  }
}
