import type z from "zod";
import type {
  formSchema,
  insertCamperSchema,
  registrationSchema,
  userSchema,
} from "./schema";

export type Camper = z.infer<typeof insertCamperSchema>;

export type RegistrationFormValues = z.infer<typeof formSchema>;

export type Registration = z.infer<typeof registrationSchema>;

export type CampFormUser = z.infer<typeof userSchema>;
