import { createSelectSchema } from "drizzle-zod";
import { camps, campYears, registrations } from "@/lib/data/schema";

export const baseCampSchema = createSelectSchema(camps);
export const campYearSchema = createSelectSchema(campYears);

export const campSchema = baseCampSchema.merge(campYearSchema);

export const registrationStatusSchema = createSelectSchema(registrations).pick({
  status: true,
});
