import type { z } from "zod";
import type { campSchema } from "../zod-schema";

export type Camp = z.infer<typeof campSchema>;
