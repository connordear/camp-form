import { createSelectSchema } from "drizzle-zod";
import { campers, camps, campYears, registrations } from "@/lib/data/schema";

export const baseCampSchema = createSelectSchema(camps);
export const campYearSchema = createSelectSchema(campYears);
export const baseCamperSchema = createSelectSchema(campers);

export const campSchema = baseCampSchema.merge(campYearSchema);

export const registrationStatusSchema = createSelectSchema(registrations).pick({
  status: true,
});
