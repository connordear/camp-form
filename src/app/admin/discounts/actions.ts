"use server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type Stripe from "stripe";
import { db } from "@/lib/data/db";
import { discounts } from "@/lib/data/schema";
import { stripe } from "@/lib/stripe";
import {
  type DiscountFormData,
  type DiscountUpdateData,
  discountFormSchema,
  discountUpdateSchema,
} from "@/lib/types/discount-schemas";

async function requireAdmin() {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return sessionClaims;
}

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

/**
 * Creates a new discount with Stripe coupon sync
 */
export async function createDiscount(data: DiscountFormData) {
  await requireAdmin();

  const validated = discountFormSchema.parse(data);

  // Create Stripe coupon first
  const stripeCouponId = await createStripeCoupon(validated);

  // Create database record
  const [newDiscount] = await db
    .insert(discounts)
    .values({
      name: validated.name,
      description: validated.description ?? null,
      type: validated.type,
      amount: validated.amount,
      conditionType: validated.conditionType,
      deadlineDate: validated.deadlineDate ?? null,
      minCampers: validated.minCampers ?? null,
      isActive: validated.isActive,
      stripeCouponId,
    })
    .returning();

  revalidatePath("/admin/discounts");
  return newDiscount;
}

/**
 * Updates an existing discount with Stripe coupon sync
 */
export async function updateDiscount(data: DiscountUpdateData) {
  await requireAdmin();

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

  // Update database record
  const [updatedDiscount] = await db
    .update(discounts)
    .set({
      name: validated.name,
      description: validated.description ?? null,
      type: validated.type,
      amount: validated.amount,
      conditionType: validated.conditionType,
      deadlineDate: validated.deadlineDate ?? null,
      minCampers: validated.minCampers ?? null,
      isActive: validated.isActive,
      stripeCouponId: newStripeCouponId,
    })
    .where(eq(discounts.id, validated.id))
    .returning();

  revalidatePath("/admin/discounts");
  return updatedDiscount;
}

/**
 * Toggles a discount's active status
 */
export async function toggleDiscountActive(id: string) {
  await requireAdmin();

  const [existingDiscount] = await db
    .select()
    .from(discounts)
    .where(eq(discounts.id, id));

  if (!existingDiscount) {
    throw new Error("Discount not found");
  }

  const [updatedDiscount] = await db
    .update(discounts)
    .set({
      isActive: !existingDiscount.isActive,
    })
    .where(eq(discounts.id, id))
    .returning();

  revalidatePath("/admin/discounts");
  return updatedDiscount;
}

/**
 * Deletes a discount and its Stripe coupon
 */
export async function deleteDiscount(id: string) {
  await requireAdmin();

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

  // Delete database record
  const [deletedDiscount] = await db
    .delete(discounts)
    .where(eq(discounts.id, id))
    .returning();

  revalidatePath("/admin/discounts");
  return deletedDiscount;
}
