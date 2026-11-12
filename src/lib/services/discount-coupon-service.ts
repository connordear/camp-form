import { and, eq } from "drizzle-orm";
import type Stripe from "stripe";
import { endOfDay } from "@/lib/campground/dates";
import { db } from "@/lib/data/db";
import { discounts } from "@/lib/data/schema";
import { stripe } from "@/lib/stripe";

type Discount = typeof discounts.$inferSelect;

/** The parts of a discount that its Stripe coupon is built from. */
export type CouponSource = Pick<
  Discount,
  "name" | "type" | "amount" | "conditionType" | "deadlineDate"
>;

/**
 * When a deadline discount's coupon stops being redeemable, in Unix seconds:
 * the end of the deadline day at camp. Undefined for other discounts.
 */
export function couponRedeemBy(discount: CouponSource): number | undefined {
  if (discount.conditionType !== "deadline" || !discount.deadlineDate) {
    return undefined;
  }
  return Math.floor(endOfDay(discount.deadlineDate).getTime() / 1000);
}

/** Creates the Stripe coupon for a discount and returns its id. */
export async function createStripeCoupon(
  discount: CouponSource,
): Promise<string> {
  const params: Stripe.CouponCreateParams = {
    name: discount.name,
    currency: "cad",
  };

  if (discount.type === "percentage") {
    params.percent_off = discount.amount;
  } else {
    params.amount_off = discount.amount;
  }

  const redeemBy = couponRedeemBy(discount);
  if (redeemBy !== undefined) {
    params.redeem_by = redeemBy;
  }

  const coupon = await stripe.coupons.create(params);
  return coupon.id;
}

/**
 * The coupon id to give Stripe for a discount at checkout.
 *
 * Coupons made before deadlines ran to the end of the day at camp expire at
 * 23:59:59 UTC, about six hours early in Alberta. The app still offers the
 * discount in those hours, and Stripe refuses an expired coupon, which fails
 * the whole checkout. So a deadline coupon that expires before the discount
 * does is replaced here, once, with one that lasts the full day.
 */
export async function getRedeemableCouponId(
  discount: Discount,
  now: Date = new Date(),
): Promise<string | null> {
  const couponId = discount.stripeCouponId;
  if (!couponId) return null;

  const redeemBy = couponRedeemBy(discount);
  // Not a deadline discount, or the deadline has passed: nothing to repair.
  if (redeemBy === undefined || redeemBy * 1000 <= now.getTime()) {
    return couponId;
  }

  const coupon = await stripe.coupons.retrieve(couponId);
  if (coupon.redeem_by === null || coupon.redeem_by >= redeemBy) {
    return couponId;
  }

  const replacementId = await createStripeCoupon(discount);
  // The old coupon is left to expire: open checkout sessions may still use it.
  await db
    .update(discounts)
    .set({ stripeCouponId: replacementId })
    .where(
      and(
        eq(discounts.id, discount.id),
        eq(discounts.stripeCouponId, couponId),
      ),
    );
  return replacementId;
}
