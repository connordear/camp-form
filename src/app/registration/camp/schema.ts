import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { registrationDetails, registrations } from "@/lib/data/schema";
import {
  baseCamperSchema,
  baseCampSchema,
  campYearSchema,
} from "@/lib/types/common-schema";

const baseRegistrationSchema = createSelectSchema(registrations);
const baseRegistrationDetailSchema = createSelectSchema(registrationDetails);

export const registrationDetailSchema = baseRegistrationSchema.extend({
  details: baseRegistrationDetailSchema,
  camper: baseCamperSchema,
  campYear: campYearSchema.extend({
    camp: baseCampSchema,
  }),
});

export type RegistrationDetail = z.infer<typeof registrationDetailSchema>;

export const insertRegistrationDetailSchema = createInsertSchema(
  registrationDetails,
  {
    registrationId: z.string().min(1),
    cabinRequest: z.string(),
    parentSignature: z.string(),
    additionalInfo: z.string(),
  },
);

export type RegistrationDetailFormValues = z.infer<
  typeof insertRegistrationDetailSchema
>;
