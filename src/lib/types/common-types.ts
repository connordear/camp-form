import type { z } from "zod";
import type { campSchema, registrationStatusSchema } from "./common-schema";

export type Camp = z.infer<typeof campSchema>;

export type RegistrationStatus = z.infer<
  typeof registrationStatusSchema
>["status"];
