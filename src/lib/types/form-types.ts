import type { z } from "zod";
import type { formSchema } from "../zod-schema";

export type RegistrationFormValues = z.infer<typeof formSchema>;
