import type { InferSelectModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  camperEmergencyContacts,
  campers,
  emergencyContacts,
} from "@/lib/data/schema";

// Emergency Contact schemas
export const emergencyContactSelectSchema =
  createSelectSchema(emergencyContacts);
export type EmergencyContact = z.infer<typeof emergencyContactSelectSchema>;

export const emergencyContactInsertSchema = createInsertSchema(
  emergencyContacts,
  {
    name: z.string().min(1, "Name is required"),
    phone: z.string().min(1, "Phone number is required"),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    relationship: z.string().min(1, "Relationship is required"),
    relationshipOther: z.string().optional(),
  },
)
  .omit({
    userId: true, // Set from session
  })
  .superRefine((data, ctx) => {
    if (data.relationship === "other" && !data.relationshipOther) {
      ctx.addIssue({
        code: "custom",
        message: "Please specify the relationship",
        path: ["relationshipOther"],
      });
    }
  });

export type EmergencyContactFormValues = z.infer<
  typeof emergencyContactInsertSchema
>;

// Camper Emergency Contact junction schemas
export const camperEmergencyContactSelectSchema = createSelectSchema(
  camperEmergencyContacts,
);
export type CamperEmergencyContact = z.infer<
  typeof camperEmergencyContactSelectSchema
>;

export const camperEmergencyContactInsertSchema = createInsertSchema(
  camperEmergencyContacts,
  {
    camperId: z.string().min(1),
    emergencyContactId: z.string().min(1),
    priority: z.number().int().min(1).max(4),
  },
);

// Camper schema for this page
export const camperSelectSchema = createSelectSchema(campers);
export type CamperRecord = InferSelectModel<typeof campers>;

// Combined types for the page
export type EmergencyContactWithPriority = EmergencyContact & {
  priority: number;
};

export type CamperWithEmergencyContacts = {
  camper: CamperRecord;
  emergencyContacts: EmergencyContactWithPriority[];
};
