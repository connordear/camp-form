import type { z } from "zod";
import type { registrationSchema } from "../zod-schema";

export type Registration = z.infer<typeof registrationSchema>;

export const defaultValuesRegistration: Partial<Registration> = {
  isPaid: false,
};
