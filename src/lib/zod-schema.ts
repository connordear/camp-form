import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { campers, camps, campYears, registrations, users } from "./schema";

export const baseCampSchema = createSelectSchema(camps);
export const campYearSchema = createSelectSchema(campYears);

export const campSchema = baseCampSchema.merge(campYearSchema);

export const registrationSchema = createSelectSchema(registrations);

export const camperSchema = createSelectSchema(campers).extend({
  registrations: z.array(registrationSchema),
});

export const userSchema = createSelectSchema(users).extend({
  campers: z.array(camperSchema),
});

const insertRegistrationSchema = createInsertSchema(registrations).omit({
  isPaid: true, // omit isPaid so we cannot update it here
});

// Camper Input: We pick ID and Name, and enforce min length
export const insertCamperSchema = createInsertSchema(campers, {
  name: (schema) => schema.min(1, "Name is required"),
}).extend({
  registrations: z.array(insertRegistrationSchema),
});

// The final array schema for the Server Action
export const saveCampersSchema = z.array(insertCamperSchema);

export const formSchema = z.object({
  campers: saveCampersSchema,
});
