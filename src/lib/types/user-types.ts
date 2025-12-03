import z from "zod";
import { userSchema } from "../zod-schema";

export type CampFormUser = z.infer<typeof userSchema>;
