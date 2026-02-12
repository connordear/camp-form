import { createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import {
  campers,
  camps,
  campYearPrices,
  campYears,
  registrations,
} from "@/lib/data/schema";

// Base schemas from drizzle-zod
const baseCamperSchema = createSelectSchema(campers);
const baseCampSchema = createSelectSchema(camps);
const baseCampYearSchema = createSelectSchema(campYears);
const basePriceSchema = createSelectSchema(campYearPrices);
const baseRegistrationSchema = createSelectSchema(registrations);

// Extended schemas with relationships
const camperSelectSchema = baseCamperSchema.pick({
  id: true,
  firstName: true,
  lastName: true,
  userId: true,
});

const campSelectSchema = baseCampSchema.pick({
  id: true,
  name: true,
});

const campYearSelectSchema = baseCampYearSchema.pick({
  year: true,
  campId: true,
});

const priceSelectSchema = basePriceSchema.pick({
  id: true,
  name: true,
  price: true,
});

// AdminRegistration schema built from drizzle/zod
export const adminRegistrationSchema = baseRegistrationSchema.extend({
  camper: camperSelectSchema,
  campYear: campYearSelectSchema.extend({
    camp: campSelectSchema,
  }),
  price: priceSelectSchema.nullable(),
});

export type AdminRegistration = z.infer<typeof adminRegistrationSchema>;
