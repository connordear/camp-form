import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { campers, camps, registrations, users } from "./schema";

export const campSchema = createSelectSchema(camps);
export const registrationSchema = createSelectSchema(registrations).extend({
  id: z.optional(z.number()),
});
export const camperSchema = createSelectSchema(campers).extend({
  id: z.optional(z.number()),
  registrations: z.array(registrationSchema),
});

export const formSchema = z.object({
  campers: z.array(camperSchema),
});

export const userSchema = createSelectSchema(users).extend({
  campers: z.array(camperSchema),
});

const insertRegistrationSchema = createInsertSchema(registrations).pick({
  campId: true,
  clientId: true,
});

// Camper Input: We pick ID and Name, and enforce min length
const insertCamperSchema = createInsertSchema(campers, {
  name: (schema) => schema.min(1, "Name is required"),
}).pick({
  name: true,
  clientId: true,
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
