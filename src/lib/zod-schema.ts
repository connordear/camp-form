import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { campers, camps, registrations, users } from "./schema";

export const campSchema = createSelectSchema(camps);
export const registrationSchema = createSelectSchema(registrations);
export const camperSchema = createSelectSchema(campers).extend({
  registrations: z.array(registrationSchema),
});

export const userSchema = createSelectSchema(users).extend({
  campers: z.array(camperSchema),
});

const insertRegistrationSchema = createInsertSchema(registrations).pick({
  campId: true,
  isPaid: true,
});

// Camper Input: We pick ID and Name, and enforce min length
const insertCamperSchema = createInsertSchema(campers, {
  name: (schema) => schema.min(1, "Name is required"),
}).pick({
  id: true,
  name: true,
});

// The final array schema for the Server Action
export const saveCampersSchema = z.array(
  insertCamperSchema.extend({
    // We explicitly allow id to be null/undefined for new campers
    id: z.number().optional().nullable(),
    // Nest the registrations
    registrations: z.array(insertRegistrationSchema).optional(),
  }),
);
