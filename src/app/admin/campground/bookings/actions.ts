"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, failure } from "@/lib/action-result";
import { adminAction } from "@/lib/auth-helpers";
import { addDays } from "@/lib/campground/dates";
import {
  blockNights,
  createAdminBooking,
  unblockNights,
  updateAdminNotes,
} from "@/lib/services/booking-admin-service";
import {
  sendBookingCancelledEmail,
  sendBookingConfirmedEmail,
} from "@/lib/services/booking-emails";
import { cancelBooking } from "@/lib/services/booking-service";
import {
  type AdminBookingData,
  adminBookingSchema,
  type BlockNightsData,
  blockNightsSchema,
} from "@/lib/types/campground-schemas";

const BOOKINGS_PATH = "/admin/campground/bookings";

/** Whether the email to the guest went out, when one was asked for. */
export type EmailOutcome = { emailFailed: boolean };

function refresh() {
  revalidatePath(BOOKINGS_PATH, "layout");
  revalidatePath("/campground", "layout");
}

export const createPhoneBooking = adminAction(
  async (
    input: AdminBookingData,
  ): Promise<ActionResult<{ bookingId: string } & EmailOutcome>> => {
    const parsed = adminBookingSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Check the booking details.",
      };
    }
    const { sendConfirmation, ...data } = parsed.data;
    try {
      const booking = await createAdminBooking(data);
      const emailFailed =
        sendConfirmation && !(await sendBookingConfirmedEmail(booking));
      refresh();
      return { ok: true, data: { bookingId: booking.id, emailFailed } };
    } catch (err) {
      return failure(err, "Could not save the booking. Please try again.");
    }
  },
);

export const cancelBookingAsAdmin = adminAction(
  async (input: {
    bookingId: string;
    /** Cents. The policy amount, or the admin's own. */
    refundAmount: number;
    notifyGuest: boolean;
  }): Promise<ActionResult<EmailOutcome>> => {
    try {
      const booking = await cancelBooking(String(input.bookingId), {
        by: "admin",
        refundAmount: Number(input.refundAmount),
      });
      const emailFailed =
        input.notifyGuest && !(await sendBookingCancelledEmail(booking));
      refresh();
      return { ok: true, data: { emailFailed } };
    } catch (err) {
      return failure(err, "Could not cancel the booking. Please try again.");
    }
  },
);

export const saveAdminNotes = adminAction(
  async (input: {
    bookingId: string;
    adminNotes: string;
  }): Promise<ActionResult<null>> => {
    const notes = String(input.adminNotes ?? "").trim();
    if (notes.length > 1000) {
      return { ok: false, error: "Keep office notes under 1000 characters." };
    }
    try {
      await updateAdminNotes(String(input.bookingId), notes || null);
      refresh();
      return { ok: true, data: null };
    } catch (err) {
      return failure(err, "Could not save the notes. Please try again.");
    }
  },
);

export const blockSiteNights = adminAction(
  async (input: BlockNightsData): Promise<ActionResult<null>> => {
    const parsed = blockNightsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Check the dates.",
      };
    }
    const { siteId, firstNight, lastNight, reason } = parsed.data;
    try {
      await blockNights({
        siteId,
        from: firstNight,
        to: addDays(lastNight, 1),
        reason,
      });
      refresh();
      return { ok: true, data: null };
    } catch (err) {
      return failure(err, "Could not block those nights. Please try again.");
    }
  },
);

export const unblockSiteNights = adminAction(
  async (input: {
    siteId: string;
    from: string;
    to: string;
  }): Promise<ActionResult<null>> => {
    try {
      await unblockNights({
        siteId: String(input.siteId),
        from: String(input.from),
        to: String(input.to),
      });
      refresh();
      return { ok: true, data: null };
    } catch (err) {
      return failure(err, "Could not unblock those nights. Please try again.");
    }
  },
);
