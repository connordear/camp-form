import type Stripe from "stripe";
import {
  sendBookingConfirmedEmail,
  sendBookingUnavailableEmail,
} from "@/lib/services/booking-emails";
import {
  type ConfirmOutcome,
  confirmBookingFromSession,
} from "@/lib/services/booking-service";

/**
 * Confirm a paid booking checkout and email the guest. Called by the Stripe
 * webhook and by the return page, whichever gets there first; the email goes
 * out once because only the call that changes the booking gets an outcome.
 */
export async function completeBookingCheckout(
  session: Stripe.Checkout.Session,
): Promise<ConfirmOutcome> {
  const outcome = await confirmBookingFromSession(session);
  if (outcome.kind === "confirmed") {
    await sendBookingConfirmedEmail(outcome.booking);
  } else if (outcome.kind === "refunded") {
    await sendBookingUnavailableEmail(outcome.booking);
  }
  return outcome;
}
