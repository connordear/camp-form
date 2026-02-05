import { z } from "zod";
import { DISCOUNT_CONDITION_TYPES, DISCOUNT_TYPES } from "@/lib/data/schema";

// Base discount schema for form validation
export const discountFormSchema = z
  .object({
    name: z.string().min(1, "Discount name is required"),
    description: z.string().nullable(),
    type: z.enum(DISCOUNT_TYPES),
    amount: z.number().min(1, "Amount must be greater than 0"),
    conditionType: z.enum(DISCOUNT_CONDITION_TYPES),
    deadlineDate: z.string().nullable(),
    minCampers: z.number().min(2).nullable(),
    isActive: z.boolean(),
  })
  .refine(
    (data) => {
      // Deadline-based discounts require a deadline date
      if (data.conditionType === "deadline" && !data.deadlineDate) {
        return false;
      }
      return true;
    },
    {
      message: "Deadline date is required for deadline-based discounts",
      path: ["deadlineDate"],
    },
  )
  .refine(
    (data) => {
      // Sibling-based discounts require minCampers
      if (data.conditionType === "sibling" && !data.minCampers) {
        return false;
      }
      return true;
    },
    {
      message: "Minimum campers is required for sibling-based discounts",
      path: ["minCampers"],
    },
  );

export type DiscountFormData = z.infer<typeof discountFormSchema>;

// Schema for updating an existing discount
// We need to recreate the schema with id since refined schemas can't be extended
export const discountUpdateSchema = z
  .object({
    id: z.string().min(1, "Discount ID is required"),
    name: z.string().min(1, "Discount name is required"),
    description: z.string().nullable(),
    type: z.enum(DISCOUNT_TYPES),
    amount: z.number().min(1, "Amount must be greater than 0"),
    conditionType: z.enum(DISCOUNT_CONDITION_TYPES),
    deadlineDate: z.string().nullable(),
    minCampers: z.number().min(2).nullable(),
    isActive: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.conditionType === "deadline" && !data.deadlineDate) {
        return false;
      }
      return true;
    },
    {
      message: "Deadline date is required for deadline-based discounts",
      path: ["deadlineDate"],
    },
  )
  .refine(
    (data) => {
      if (data.conditionType === "sibling" && !data.minCampers) {
        return false;
      }
      return true;
    },
    {
      message: "Minimum campers is required for sibling-based discounts",
      path: ["minCampers"],
    },
  );

export type DiscountUpdateData = z.infer<typeof discountUpdateSchema>;

// Condition type display labels
export const CONDITION_TYPE_LABELS: Record<
  (typeof DISCOUNT_CONDITION_TYPES)[number],
  string
> = {
  deadline: "Before Date",
  sibling: "Multiple Campers",
};

// Discount type display labels
export const DISCOUNT_TYPE_LABELS: Record<
  (typeof DISCOUNT_TYPES)[number],
  string
> = {
  percentage: "Percentage",
  fixed: "Fixed Amount",
};
