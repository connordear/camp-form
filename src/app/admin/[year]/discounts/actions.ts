"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { adminAction } from "@/lib/auth-helpers";
import { db } from "@/lib/data/db";
import { discounts } from "@/lib/data/schema";
import { stripe } from "@/lib/stripe";
import {
  type DiscountFormData,
  discountFormSchema,
  discountUpdateSchema,
} from "@/lib/types/discount-schemas";

export type Discount = typeof discounts.$inferSelect;

/**
 * Creates a Stripe coupon for a discount
 */
async function createStripeCoupon(data: DiscountFormData): Promise<string> {
  const couponParams: Stripe.CouponCreateParams = {
    name: data.name,
    currency: "cad",
  };

  if (data.type === "percentage") {
    couponParams.percent_off = data.amount;
  } else {
    couponParams.amount_off = data.amount;
  }

  // Set redemption deadline if applicable
  if (data.conditionType === "deadline" && data.deadlineDate) {
    const deadline = new Date(data.deadlineDate);
    deadline.setHours(23, 59, 59, 999);
    couponParams.redeem_by = Math.floor(deadline.getTime() / 1000);
  }

  const coupon = await stripe.coupons.create(couponParams);
  return coupon.id;
}

/**
 * Updates a Stripe coupon (creates new one since Stripe coupons are mostly immutable)
 * Returns the new coupon ID
 */
async function updateStripeCoupon(
  oldCouponId: string | null,
  data: DiscountFormData,
): Promise<string> {
  // Archive old coupon if it exists
  if (oldCouponId) {
    try {
      await stripe.coupons.del(oldCouponId);
    } catch {
      // Coupon might already be deleted or invalid, continue
      console.warn(`Could not delete old coupon ${oldCouponId}`);
    }
  }

  // Create new coupon
  return createStripeCoupon(data);
}

export const getAllDiscountsForAdmin = adminAction(
  async (): Promise<Discount[]> => {
    return db.select().from(discounts);
  },
);

export const createDiscount = adminAction(async (data: unknown) => {
  const validated = discountFormSchema.parse(data);

  // Create Stripe coupon first
  const stripeCouponId = await createStripeCoupon(validated);

  const [newDiscount] = await db
    .insert(discounts)
    .values({
      name: validated.name,
      description: validated.description,
      type: validated.type,
      amount: validated.amount,
      conditionType: validated.conditionType,
      deadlineDate: validated.deadlineDate,
      minCampers: validated.minCampers,
      isActive: validated.isActive,
      stripeCouponId,
    })
    .returning();

  revalidatePath("/admin/[year]/discounts");
  return newDiscount;
});

export const updateDiscount = adminAction(async (data: unknown) => {
  const validated = discountUpdateSchema.parse(data);

  // Get existing discount to find old coupon ID
  const [existingDiscount] = await db
    .select()
    .from(discounts)
    .where(eq(discounts.id, validated.id));

  if (!existingDiscount) {
    throw new Error("Discount not found");
  }

  // Update Stripe coupon (creates new one)
  const newStripeCouponId = await updateStripeCoupon(
    existingDiscount.stripeCouponId,
    validated,
  );

  const [updatedDiscount] = await db
    .update(discounts)
    .set({
      name: validated.name,
      description: validated.description,
      type: validated.type,
      amount: validated.amount,
      conditionType: validated.conditionType,
      deadlineDate: validated.deadlineDate,
      minCampers: validated.minCampers,
      isActive: validated.isActive,
      stripeCouponId: newStripeCouponId,
    })
    .where(eq(discounts.id, validated.id))
    .returning();

  if (!updatedDiscount) {
    throw new Error("Discount not found");
  }

  revalidatePath("/admin/[year]/discounts");
  return updatedDiscount;
});

export const deleteDiscount = adminAction(async (id: string) => {
  const [existingDiscount] = await db
    .select()
    .from(discounts)
    .where(eq(discounts.id, id));

  if (!existingDiscount) {
    throw new Error("Discount not found");
  }

  // Delete Stripe coupon
  if (existingDiscount.stripeCouponId) {
    try {
      await stripe.coupons.del(existingDiscount.stripeCouponId);
    } catch {
      console.warn(
        `Could not delete Stripe coupon ${existingDiscount.stripeCouponId}`,
      );
    }
  }

  const [deletedDiscount] = await db
    .delete(discounts)
    .where(eq(discounts.id, id))
    .returning();

  if (!deletedDiscount) {
    throw new Error("Discount not found");
  }

  revalidatePath("/admin/[year]/discounts");
  return deletedDiscount;
});

export const toggleDiscountActive = adminAction(async (id: string) => {
  // Get current discount
  const [discount] = await db
    .select()
    .from(discounts)
    .where(eq(discounts.id, id));

  if (!discount) {
    throw new Error("Discount not found");
  }

  // Toggle isActive
  const [updatedDiscount] = await db
    .update(discounts)
    .set({ isActive: !discount.isActive })
    .where(eq(discounts.id, id))
    .returning();

  revalidatePath("/admin/[year]/discounts");
  return updatedDiscount;
});

export const redirectToCurrentYear = adminAction(async (): Promise<never> => {
  const currentYear = new Date().getFullYear();
  redirect(`/admin/${currentYear}/discounts`);
});
