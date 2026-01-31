import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { campYearPrices, campYears } from "@/lib/data/schema";

// Camp schemas - use simple zod schemas for form validation
export const campInsertSchema = z.object({
  name: z.string().min(1, "Camp name is required"),
  description: z.string().nullable(),
});

export const campUpdateSchema = campInsertSchema.extend({
  id: z.string().min(1, "Camp ID is required"),
});

export type CampInsertForm = z.infer<typeof campInsertSchema>;
export type CampUpdateForm = z.infer<typeof campUpdateSchema>;

// CampYear schemas
export const campYearInsertSchema = createInsertSchema(campYears, {
  year: (schema) => schema.min(2000, "Year must be 2000 or later"),
  capacity: (schema) =>
    schema.min(0, "Capacity must be 0 or greater").nullable(),
  startDate: (schema) => schema.min(1, "Start date is required"),
  endDate: (schema) => schema.min(1, "End date is required"),
}).pick({
  year: true,
  campId: true,
  capacity: true,
  startDate: true,
  endDate: true,
});

export const campYearUpdateSchema = campYearInsertSchema;

export type CampYearInsertForm = z.infer<typeof campYearInsertSchema>;
export type CampYearUpdateForm = z.infer<typeof campYearUpdateSchema>;

// Combined schema for creating a new camp with its first year
export const createCampWithYearSchema = campInsertSchema.extend({
  year: z.number().min(2000, "Year must be 2000 or later"),
  capacity: z.number().min(0, "Capacity must be 0 or greater").nullable(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

export type CreateCampWithYearForm = z.infer<typeof createCampWithYearSchema>;

// CampYearPrice schemas
export const campYearPriceInsertSchema = createInsertSchema(campYearPrices, {
  name: (schema) => schema.min(1, "Price name is required"),
  price: (schema) => schema.min(0, "Price must be 0 or greater"),
}).pick({
  name: true,
  campId: true,
  year: true,
  price: true,
  isDayPrice: true,
});

export const campYearPriceUpdateSchema = campYearPriceInsertSchema.extend({
  id: z.string().min(1, "Price ID is required"),
});

export type CampYearPriceInsertForm = z.infer<typeof campYearPriceInsertSchema>;
export type CampYearPriceUpdateForm = z.infer<typeof campYearPriceUpdateSchema>;

// Schema for price entry in forms (without campId/year which are set from context)
export const priceEntrySchema = z.object({
  id: z.string().optional(), // Optional for new prices
  name: z.string().min(1, "Price name is required"),
  price: z.number().min(0, "Price must be 0 or greater"),
  isDayPrice: z.boolean(),
});

export type PriceEntry = z.infer<typeof priceEntrySchema>;

// Updated schema for creating a new camp with its first year AND prices
export const createCampWithYearAndPricesSchema =
  createCampWithYearSchema.extend({
    prices: z.array(priceEntrySchema).min(1, "At least one price is required"),
  });

export type CreateCampWithYearAndPricesForm = z.infer<
  typeof createCampWithYearAndPricesSchema
>;

// Schema for batch updating prices for a camp year
export const batchUpdatePricesSchema = z.object({
  campId: z.string().min(1, "Camp ID is required"),
  year: z.number().min(2000, "Year must be 2000 or later"),
  prices: z.array(priceEntrySchema).min(1, "At least one price is required"),
});

export type BatchUpdatePricesForm = z.infer<typeof batchUpdatePricesSchema>;
