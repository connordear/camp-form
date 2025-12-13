import { campSchema } from "../zod-schema";
import { z } from "zod";

export type Camp = z.infer<typeof campSchema>;
