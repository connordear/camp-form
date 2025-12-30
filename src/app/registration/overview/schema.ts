import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { campers, registrations, users } from "@/lib/data/schema";

export const registrationSchema = createSelectSchema(registrations);

export const camperSchema = createSelectSchema(campers).extend({
  registrations: z.array(registrationSchema),
});

export const userSchema = createSelectSchema(users).extend({
  campers: z.array(camperSchema),
});

const insertRegistrationSchema = createInsertSchema(registrations).omit({
  pricePaid: true, // omit checkout fields
  stripePaymentIntentId: true,
  stripeSessionId: true,
  updatedAt: true,
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
