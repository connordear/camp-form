import { eq } from "drizzle-orm";
import { db } from "@/lib/data/db";
import { discounts } from "@/lib/data/schema";

export type Discount = typeof discounts.$inferSelect;

export interface RegistrationForDiscount {
  camperId: string;
  price: number; // unit price in cents
  quantity: number; // numDays or 1
}

export interface ApplicableDiscount {
  discount: Discount;
  /** The calculated savings for this discount in cents */
  savings: number;
}

export interface DiscountEvaluationResult {
  applicableDiscounts: ApplicableDiscount[];
  totalSavings: number;
  subtotal: number;
  total: number;
}

/**
 * Fetches all active discounts from the database
 */
export async function getActiveDiscounts(): Promise<Discount[]> {
  return db.select().from(discounts).where(eq(discounts.isActive, true));
}

/**
 * Fetches all discounts (active and inactive) for admin management
 */
export async function getAllDiscounts(): Promise<Discount[]> {
  return db.select().from(discounts);
}

/**
 * Fetches a single discount by ID
 */
export async function getDiscountById(id: string): Promise<Discount | null> {
  const [discount] = await db
    .select()
    .from(discounts)
    .where(eq(discounts.id, id));
  return discount ?? null;
}

/**
 * Evaluates which discounts apply to a set of registrations
 * and calculates the savings for each.
 *
 * @param registrations - The registrations being checked out
 * @returns Object containing applicable discounts, savings, and totals
 */
export async function evaluateDiscounts(
  registrations: RegistrationForDiscount[],
): Promise<DiscountEvaluationResult> {
  const activeDiscounts = await getActiveDiscounts();

  // Calculate subtotal
  const subtotal = registrations.reduce(
    (sum, reg) => sum + reg.price * reg.quantity,
    0,
  );

  // Get unique campers in checkout
  const uniqueCamperIds = new Set(registrations.map((r) => r.camperId));
  const numCampers = uniqueCamperIds.size;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const applicableDiscounts: ApplicableDiscount[] = [];

  for (const discount of activeDiscounts) {
    let isApplicable = false;

    switch (discount.conditionType) {
      case "deadline":
        // Check if current date is before the deadline
        if (discount.deadlineDate) {
          const deadline = new Date(discount.deadlineDate);
          // Set deadline to end of day for comparison
          deadline.setHours(23, 59, 59, 999);
          isApplicable = today <= deadline;
        }
        break;

      case "sibling":
        // Check if there are enough campers
        if (discount.minCampers) {
          isApplicable = numCampers >= discount.minCampers;
        }
        break;
    }

    if (isApplicable && discount.stripeCouponId) {
      // Calculate savings based on discount type
      let savings = 0;
      if (discount.type === "percentage") {
        savings = Math.round(subtotal * (discount.amount / 100));
      } else {
        // Fixed amount - apply once to total
        savings = Math.min(discount.amount, subtotal);
      }

      applicableDiscounts.push({
        discount,
        savings,
      });
    }
  }

  // Calculate total savings (discounts stack)
  const totalSavings = applicableDiscounts.reduce(
    (sum, ad) => sum + ad.savings,
    0,
  );

  // Ensure we don't go below zero
  const total = Math.max(0, subtotal - totalSavings);

  return {
    applicableDiscounts,
    totalSavings,
    subtotal,
    total,
  };
}

/**
 * Formats a discount amount for display
 */
export function formatDiscountAmount(discount: Discount): string {
  if (discount.type === "percentage") {
    return `${discount.amount}% off`;
  }
  return `$${(discount.amount / 100).toFixed(2)} off`;
}

/**
 * Formats savings amount in dollars
 */
export function formatSavings(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
