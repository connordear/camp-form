import type z from "zod";
import type { userSchema } from "../zod-schema";

export type CampFormUser = z.infer<typeof userSchema>;
