import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { campers, registrations, user } from "@/lib/data/schema";

export const registrationSchema = createSelectSchema(registrations);
export type Registration = z.infer<typeof registrationSchema>;

export const camperSchema = createSelectSchema(campers).extend({
  registrations: z.array(registrationSchema),
});
export type Camper = z.infer<typeof insertCamperSchema>;

export const userSchema = createSelectSchema(user).extend({
  campers: z.array(camperSchema),
});
export type CampFormUser = z.infer<typeof userSchema>;

const insertRegistrationSchema = createInsertSchema(registrations, {
  id: (s) => s.nonoptional(),
}).omit({
  pricePaid: true, // omit checkout fields
  stripePaymentIntentId: true,
  stripeSessionId: true,
  updatedAt: true,
});

// Camper Input: We pick ID and Name, and enforce min length
export const insertCamperSchema = createInsertSchema(campers, {
  id: (schema) => schema.nonoptional(),
  firstName: (schema) => schema.min(1, "First name is required"),
  lastName: (schema) => schema.min(1, "Last name is required"),
  dateOfBirth: (schema) => schema.nonempty("Date of birth is required"),
}).extend({
  registrations: z.array(insertRegistrationSchema),
});

// The final array schema for the Server Action
export const saveCampersSchema = z.array(insertCamperSchema);
export const formSchema = z.object({
  campers: saveCampersSchema,
});
export type RegistrationFormValues = z.infer<typeof formSchema>;
