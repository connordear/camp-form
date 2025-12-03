import z from "zod";
import { camperSchema } from "../zod-schema";

export type Camper = z.infer<typeof camperSchema>;
