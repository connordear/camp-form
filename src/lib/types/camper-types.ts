import type z from "zod";
import type { insertCamperSchema } from "../zod-schema";

export type Camper = z.infer<typeof insertCamperSchema>;
