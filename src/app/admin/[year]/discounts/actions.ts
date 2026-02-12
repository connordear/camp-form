"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminAction } from "@/lib/auth-helpers";
import { db } from "@/lib/data/db";
import { discounts } from "@/lib/data/schema";
import {
  discountFormSchema,
  discountUpdateSchema,
} from "@/lib/types/discount-schemas";

export type Discount = typeof discounts.$inferSelect;

export const getAllDiscountsForAdmin = adminAction(
  async (): Promise<Discount[]> => {
    return db.select().from(discounts);
  },
);

export const createDiscount = adminAction(async (data: unknown) => {
  const validated = discountFormSchema.parse(data);

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
    })
    .returning();

  revalidatePath("/admin/[year]/discounts");
  return newDiscount;
});

export const updateDiscount = adminAction(async (data: unknown) => {
  const validated = discountUpdateSchema.parse(data);

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
