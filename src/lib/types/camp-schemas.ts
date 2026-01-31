import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { campYears } from "@/lib/data/schema";

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
