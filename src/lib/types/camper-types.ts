import type z from "zod";
import type { camperSchema } from "../zod-schema";

export type Camper = z.infer<typeof camperSchema>;
