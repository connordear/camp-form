import { createSelectSchema } from "drizzle-zod";

import { z } from "zod";

import {
  campers,
  camps,
  campYearPrices,
  campYears,
  registrations,
} from "@/lib/data/schema";

export const baseCampSchema = createSelectSchema(camps);
export const campYearSchema = createSelectSchema(campYears);
export const baseCamperSchema = createSelectSchema(campers);
export const priceSchema = createSelectSchema(campYearPrices);

export const campSchema = baseCampSchema.merge(campYearSchema).extend({
  prices: z.array(priceSchema),
});

export const registrationStatusSchema = createSelectSchema(registrations).pick({
  status: true,
});
